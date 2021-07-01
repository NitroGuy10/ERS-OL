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
        }
    }
    dealMovement(thisCard)
    {
        const ELAPSED = gameArea.timestamp - thisCard.animationStart
        if (ELAPSED <= Card.DEAL_ANIMATION_LENGTH)
        {
            thisCard.y = ((gameArea.canvas.height / 2) + thisCard.targetYOffset) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (gameArea.canvas.height + (thisCard.targetYOffset * 2))
            thisCard.rotation = ((Math.PI / 2) - thisCard.targetRotation) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (Math.PI / 2)
        }
        else
        {
            thisCard.x = (gameArea.canvas.width / 2) + thisCard.targetXOffset
            thisCard.y = (gameArea.canvas.height / 2) + thisCard.targetYOffset
            thisCard.rotation = thisCard.targetRotation
            thisCard.animating = false
            delete thisCard.currentAnimations.deal
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
