var gameArea = {
    components: {},
    drawList: [],  // Components in this array are drawn to the canvas in the order they appear (e.g. last index == drawn on top of everything else)
    keys: {},
    audio: {},
    players: {},  // User is always at first index
    user: null,
    numPlayers: 0,
    userIsDealing: false,
    userIsReceiving: false,
    userCanSlap: false,
    receiveAnimationStart: -1,
    recipientIndex: -1,
    centerCardRotations: [Math.PI / -13, 0, Math.PI / 13],
    centerCardXOffsets: [-20, 0, 20],
    centerCardYOffsets: [10, -10, 10],
    nextCenterCardOffsetIndex: 0,
    centerStack: [],
    start: function ()
    {
        socket.emit("join_lobby", window.location.href.split("/")[window.location.href.split("/").length - 1])

        this.canvas = document.getElementById("mainCanvas")
        this.context = this.canvas.getContext("2d")

        window.addEventListener("keydown", function (e)
        {
            if (!gameArea.keys["ArrowUp"] && e.code === "ArrowUp")
            {
                e.preventDefault()
                if (gameArea.userIsDealing)
                {
                    socket.emit("deal")
                    gameArea.userIsDealing = false
                }
            }
            else if ((!gameArea.keys["ArrowDown"] && e.code === "ArrowDown") || (!gameArea.keys["Space"] && e.code === "Space"))
            {
                e.preventDefault()
                if (gameArea.userIsReceiving)
                {
                    socket.emit("receive")
                    gameArea.userIsReceiving = false
                }
                else if (gameArea.userCanSlap)
                {
                    socket.emit("slap")
                    gameArea.userCanSlap = false
                }
            }
            gameArea.keys[e.code] = true
        })
        window.addEventListener("keyup", function (e)
        {
            gameArea.keys[e.code] = false
        })

        document.getElementById("hostSettingsTable").addEventListener("change", function (e)
        {
            declareSettings()
        })

        this.audio.burn = new Howl({
            src: ["../sfx/burn.wav"],
            volume: 0.5
        })
        this.audio.deal = new Howl({
            src: ["../sfx/deal.wav"],
            volume: 0.5
        })
        this.audio.dealMany = new Howl({
            src: ["../sfx/deal_many.wav"],
            volume: 0.5
        })
        this.audio.slap = new Howl({
            src: ["../sfx/slap.wav"],
            volume: 0.5
        })

        window.requestAnimationFrame(step)
    },
    clear: function ()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    },
    update: function ()
    {
        if (this.receiveAnimationStart > -1)
        {
            if (this.timestamp - this.receiveAnimationStart > 40)  // in milliseconds
            {
                this.centerStack.pop().receive(this.recipientIndex)
                if (this.centerStack.length == 0)
                {
                    this.receiveAnimationStart = -1
                    this.recipientIndex = -1

                    if (gameArea.user.isTurn)
                    {
                        gameArea.components["promptArrow"].rotation = Math.PI
                        gameArea.drawList.push(gameArea.components["promptArrow"])
                        gameArea.userIsDealing = true
                    }
                }
                else
                {
                    this.receiveAnimationStart = gameArea.timestamp
                }
            }
        }
        for (componentName in this.components)
        {
            component = this.components[componentName]
            component.update()
        }
        for (component of this.drawList)
        {
            component.draw()
        }
    }

}

class Player
{
    constructor(name, index)
    {
        this.name = name
        this.index = index
        this.component = new TextComponent("player_" + name, name, 0, 0, 0, "20px Arial, Helvetica, sans-serif", "#eee")
        this.__isTurn = false
        this.__isOut = false

        this.slapper = new Slapper("slapper_" + name, index)

        gameArea.players[name] = this
        if (gameArea.user === null)
        {
            gameArea.user = this
        }
        gameArea.numPlayers++
    }
    get componentName()
    {
        return "player_" + this.name
    }
    get normalColor()
    {
        if (this.__isOut)
        {
            return "#999"
        }
        else
        {
            return "#eee"
        }
    }
    get isTurn()
    {
        return this.__isTurn
    }
    set isTurn(isTurn_)
    {
        this.__isTurn = isTurn_
        if (isTurn_)
        {
            this.component.fillStyle = "#81d4fa"
        }
        else
        {
            this.component.fillStyle = this.normalColor
        }
    }
    get isOut()
    {
        return this.__isOut
    }
    set isOut(isOut_)
    {
        this.__isOut = isOut_
        this.component.fillStyle = this.normalColor
    }
}

function updateGameArea()
{
    gameArea.clear()

    gameArea.update()
}

function step(timestamp)
{
    gameArea.timestamp = timestamp
    updateGameArea()

    window.requestAnimationFrame(step)
}

function getSettings()
{
    let settings = {}
    for (let settingElement of document.getElementsByClassName("hostSetting"))
    {
        settings[settingElement.id] = settingElement.checked
    }
    return settings
}

function init()
{
    becomeHost("n")
    gameArea.start()
    for (let rank = 1; rank < 14; rank++)
    {
        new Card(rank, "Spades", 0, 0)
        new Card(rank, "Hearts", 0, 0)
        new Card(rank, "Diamonds", 0, 0)
        new Card(rank, "Clubs", 0, 0)
    }
    new ImgComponent("promptArrow", document.getElementById("promptArrow"), gameArea.canvas.width * (5 / 6), gameArea.canvas.height * (5 / 6), 100, 100, 0)
    gameArea.drawList.push(new TextComponent("statusText", "Connecting...", gameArea.canvas.width / 2, gameArea.canvas.height / 2, 0, "40px Arial, Comic Sans MS, sans-serif", "#eee"))
}
