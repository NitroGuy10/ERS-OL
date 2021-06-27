var gameArea = {
    components: {},
    drawList: [],  // Components in this array are drawn to the canvas in the order they appear (e.g. last index == drawn on top of everything else)
    keys: {},
    audio: {},
    start: function ()
    {
        socket.emit("join_lobby", window.location.href.split("/")[window.location.href.split("/").length - 1])

        this.canvas = document.getElementById("mainCanvas")
        this.context = this.canvas.getContext("2d")

        window.addEventListener("keydown", function (e)
        {
            if (!gameArea.keys["ArrowRight"] && e.code === "ArrowRight")
            {
                gameArea.components["testImage"].x += 10
            }
            else if (!gameArea.keys["ArrowUp"] && e.code === "ArrowUp")
            {
                gameArea.components["cards/cardSpadesA.png"].deal()
            }
            gameArea.keys[e.code] = true
        })
        window.addEventListener("keyup", function (e)
        {
            gameArea.keys[e.code] = false
        })

        this.audio.burn = document.getElementById("audioBurn")
        this.audio.deal = document.getElementById("audioDeal")
        this.audio.dealMany = document.getElementById("audioDealMany")
        this.audio.slap = document.getElementById("audioSlap")

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
    }
    deal()
    {
        if (!this.animating)
        {
            this.hide()
            gameArea.drawList.push(this)
            this.x = (gameArea.canvas.width / 2)
            this.y = gameArea.canvas.height + this.height
            this.animating = true
            gameArea.audio.deal.currentTime = 0
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
            thisCard.y = (gameArea.canvas.height / 2) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (gameArea.canvas.height)
            thisCard.rotation = (Math.PI / 2) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (Math.PI / 2)
            console.log("deal moving!")
        }
        else
        {
            clearInterval(thisCard.interval)
            thisCard.animating = false
            delete thisCard.currentAnimations.deal
            console.log("done moving!")
        }
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

function init()
{
    gameArea.start()
    for (let rank = 1; rank < 14; rank++)
    {
        new Card(rank, "Spades", 0, 0)
        new Card(rank, "Hearts", 0, 0)
        new Card(rank, "Diamonds", 0, 0)
        new Card(rank, "Clubs", 0, 0)
    }
}