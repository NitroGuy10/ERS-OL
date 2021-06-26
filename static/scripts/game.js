const RANK_NAME = ["NONE", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

var gameArea = {
    components: {},
    keys: {},
    framerate: 60,
    audio: {},
    start: function ()
    {
        this.canvas = document.getElementById("mainCanvas")
        this.context = this.canvas.getContext("2d")

        window.addEventListener('keydown', function (e)
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
        window.addEventListener('keyup', function (e)
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
    }

}

function imgComponent(name, image, x, y)
{
    this.type = "imgComponent"
    this.name = name
    this.image = image
    this.x = x
    this.y = y
    this.update = function ()
    {
        gameArea.context.drawImage(this.image, this.x, this.y)
    }

    gameArea.components[this.name] = this
}

function card(rank, suit, x, y)
{
    this.type = "card"
    this.rank = rank  // first letter is always capitalized
    this.suit = suit
    this.name = ["cards/card", this.suit, RANK_NAME[rank], ".png"].join("")
    this.image = document.getElementById(this.name)
    this.x = x
    this.y = y
    this.rotation = 0
    this.width = 140
    this.height = 190
    this.hidden = true
    this.moving = false
    this.currentAnimations = {}
    this.update = function ()
    {
        if (!this.hidden)
        {
            // x and y are the center of the card
            context = gameArea.context
            context.save()
            context.translate(this.x, this.y)
            context.rotate(this.rotation)
            context.drawImage(this.image, this.width / -2, this.height / -2)
            context.restore()
        }
        for (animation in this.currentAnimations)
        {
            this.currentAnimations[animation](this)
        }
    }
    this.deal = function ()
    {
        if (!this.moving)
        {
            this.hidden = false
            this.x = (gameArea.canvas.width / 2)
            this.y = gameArea.canvas.height + this.height
            this.moving = true
            gameArea.audio.deal.currentTime = 0
            gameArea.audio.deal.play()
            this.animationStart = gameArea.timestamp
            this.currentAnimations.deal = this.dealMovement
            console.log("dealing!")
        }
    }
    this.dealMovement = function (thisCard)
    {
        const ELAPSED = gameArea.timestamp - thisCard.animationStart
        const ANIMATION_LENGTH = 100  // in milliseconds
        if (ELAPSED <= ANIMATION_LENGTH)
        {
            canvasHeight = gameArea.canvas.height
            thisCard.y = (canvasHeight / 2) * Math.sin(ELAPSED / (ANIMATION_LENGTH / (-0.5 * Math.PI))) + (canvasHeight)
            thisCard.rotation = (Math.PI / 2) * Math.sin(ELAPSED / (ANIMATION_LENGTH / (-0.5 * Math.PI))) + (Math.PI / 2)
            console.log("deal moving!")
        }
        else
        {
            clearInterval(thisCard.interval)
            thisCard.moving = false
            delete thisCard.currentAnimations.deal
            console.log("done moving!")
        }
    }
    gameArea.components[this.name] = this
}

function updateGameArea()
{
    gameArea.clear()

    gameArea.update()
}

function step(timestamp)
{
    gameArea.timestamp = timestamp
    updateGameArea();

    window.requestAnimationFrame(step)
}

function init()
{
    gameArea.start()
    new imgComponent("testImage", document.getElementById("cards/cardHearts8.png"), 50, 50)
    for (let rank = 1; rank < 14; rank++)
    {
        new card(rank, "Spades", 0, 0)
        new card(rank, "Hearts", 0, 0)
        new card(rank, "Diamonds", 0, 0)
        new card(rank, "Clubs", 0, 0)
    }
}