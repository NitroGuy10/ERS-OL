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
            else if (!gameArea.keys["ArrowDown"] && e.code === "ArrowDown")
            {
                e.preventDefault()
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

class ImgComponent
{
    constructor(name, image, x, y, width, height, rotation)
    {
        this.name = name
        this.image = image
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.rotation = rotation

        this.type = "ImgComponent"
        this.animating = false
        this.currentAnimations = {}

        gameArea.components[this.name] = this
    }
    update()
    {
        for (let animation in this.currentAnimations)
        {
            this.currentAnimations[animation](this)
        }
    }
    draw()
    {
        // x and y are the center of the image
        gameArea.context.save()
        gameArea.context.translate(this.x, this.y)
        gameArea.context.rotate(this.rotation)
        gameArea.context.drawImage(this.image, this.width / -2, this.height / -2)
        gameArea.context.restore()
    }
    hide()
    {
        const INDEX_OF = gameArea.drawList.indexOf(this)
        if (INDEX_OF != -1)
        {
            gameArea.drawList.splice(INDEX_OF, 1)
        }
    }
}

class Card extends ImgComponent
{
    static RANK_NAME = ["NONE", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    static DEAL_ANIMATION_LENGTH = 100 // in milliseconds

    constructor(rank, suit, x, y, rotation)
    {
        const NAME = ["cards/card", suit, Card.RANK_NAME[rank], ".png"].join("")
        super(NAME, document.getElementById(NAME), x, y, 140, 190, rotation, true)

        this.rank = rank // first letter is always capitalized
        this.suit = suit
        this.type = "Card"
        this.targetRotation = 0
        this.targetXOffset = 0
        this.targetYOffset = 0
    }
    deal()
    {
        if (!this.animating)
        {
            this.hide()
            gameArea.components["promptArrow"].hide()
            gameArea.drawList.push(this)
            gameArea.centerStack.push(this)
            this.targetXOffset = gameArea.centerCardXOffsets[gameArea.nextCenterCardOffsetIndex] + (15 * Math.sin((gameArea.centerStack.length * Math.PI) / 11))
            this.targetYOffset = gameArea.centerCardYOffsets[gameArea.nextCenterCardOffsetIndex] + (15 * Math.cos((gameArea.centerStack.length * Math.PI) / 11))
            this.x = (gameArea.canvas.width / 2) + this.targetXOffset
            this.y = gameArea.canvas.height + this.height
            this.targetRotation = gameArea.centerCardRotations[gameArea.nextCenterCardOffsetIndex]
            gameArea.nextCenterCardOffsetIndex = (gameArea.nextCenterCardOffsetIndex + 1) % 3
            gameArea.centerStackHeight++
            this.animating = true
            gameArea.audio.deal.play()
            this.animationStart = gameArea.timestamp
            this.currentAnimations.deal = this.dealMovement
            console.log("dealing!")
        }
    }
    dealMovement(thisCard)
    {
        const ELAPSED = gameArea.timestamp - thisCard.animationStart
        if (ELAPSED <= Card.DEAL_ANIMATION_LENGTH)
        {
            thisCard.y = ((gameArea.canvas.height / 2) + thisCard.targetYOffset) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (gameArea.canvas.height + (thisCard.targetYOffset * 2))
            thisCard.rotation = ((Math.PI / 2) - thisCard.targetRotation) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (Math.PI / 2)
            console.log("deal moving!")
        }
        else
        {
            thisCard.x = (gameArea.canvas.width / 2) + thisCard.targetXOffset
            thisCard.y = (gameArea.canvas.height / 2) + thisCard.targetYOffset
            thisCard.rotation = thisCard.targetRotation
            thisCard.animating = false
            delete thisCard.currentAnimations.deal
            console.log("done moving!")
        }
    }
}

class TextComponent
{
    constructor(name, text, x, y, rotation, font, fillStyle)
    {
        this.name = name
        this.text = text
        this.x = x
        this.y = y
        this.rotation = rotation
        this.font = font
        this.fillStyle = fillStyle

        this.type = "TextComponent"
        this.animating = false
        this.currentAnimations = {}

        gameArea.components[this.name] = this
    }
    set fontSize(size)
    {
        this.font = size + this.font.substring(this.font.indexOf(" "))
    }
    update()
    {
        for (let animation in this.currentAnimations)
        {
            this.currentAnimations[animation](this)
        }
    }
    draw()
    {
        // x and y are the center of the text
        gameArea.context.save()
        gameArea.context.translate(this.x, this.y)
        gameArea.context.rotate(this.rotation)
        gameArea.context.font = this.font
        gameArea.context.fillStyle = this.fillStyle
        gameArea.context.textAlign = "center"
        gameArea.context.fillText(this.text, 0, 0)
        gameArea.context.restore()
    }
    hide()
    {
        const INDEX_OF = gameArea.drawList.indexOf(this)
        if (INDEX_OF != -1)
        {
            gameArea.drawList.splice(INDEX_OF, 1)
        }
    }
}

class Player
{
    constructor(name)
    {
        this.name = name
        this.component = new TextComponent("player_" + name, name, 0, 0, 0, "20px Arial, Helvetica, sans-serif", "#eee")
        this.__isOut = false

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
    set isTurn(isTurn_)
    {
        if (isTurn_)
        {
            this.component.fillStyle = "#81d4fa"
        }
        else
        {
            this.component.fillStyle = this.normalColor
        }
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
