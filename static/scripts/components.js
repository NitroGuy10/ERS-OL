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
    static DEAL_ANIMATION_LENGTH = 100  // in milliseconds
    static RECEIVE_ANIMATION_LENGTH = 300  // in milliseconds

    constructor(rank, suit, x, y, rotation)
    {
        const NAME = ["cards/card", suit, Card.RANK_NAME[rank], ".png"].join("")
        super(NAME, document.getElementById(NAME), x, y, 140, 190, rotation)

        this.rank = rank  // first letter is always capitalized
        this.suit = suit
        this.type = "Card"
        this.targetRotation = 0
        this.targetXOffset = 0
        this.targetYOffset = 0

        // For origin values, (0, 0) refers to the center of the canvas
        this.originX = 0
        this.originY = 0

        this.burnerIndex = -1
    }
    deal(dealerIndex_)
    {
        
        if (!this.animating)
        {
            if (gameArea.receiveAnimationStart != -1 || gameArea.centerStack.length == 0)
            {
                gameArea.receiveAnimationStart = -1
                for (let componentName in gameArea.components)
                {
                    if (gameArea.components[componentName].type === "Card")
                    {
                        gameArea.components[componentName].hide()
                    }
                }
                gameArea.centerStack = []
            }

            this.hide()
            
            let dealerIndex

            if (this.burnerIndex === -1)
            {
                dealerIndex = dealerIndex_
                gameArea.audio.deal.play()
                gameArea.drawList.push(this)
                gameArea.centerStack.push(this)
                gameArea.nextCenterCardOffsetIndex = (gameArea.nextCenterCardOffsetIndex + 1) % 3
                gameArea.components["promptArrow"].hide()
            }
            else
            {
                dealerIndex = this.burnerIndex
                gameArea.audio.burn.play()    

                gameArea.drawBottomQueue.push(this)

                gameArea.centerStack.unshift(this)
            }

            let theta = (dealerIndex * 2 * Math.PI / gameArea.numPlayers) + (Math.PI / 2)
            this.originX = (gameArea.canvas.width / 2) * Math.cos(theta)
            this.originY = (gameArea.canvas.height / 2) * Math.sin(theta)
            
            this.targetXOffset = gameArea.centerCardXOffsets[gameArea.nextCenterCardOffsetIndex] + (15 * Math.sin((gameArea.centerStack.length * Math.PI) / 11))
            this.targetYOffset = gameArea.centerCardYOffsets[gameArea.nextCenterCardOffsetIndex] + (15 * Math.cos((gameArea.centerStack.length * Math.PI) / 11))
            this.x = this.originX
            this.y = this.originY
            this.rotation = Math.PI / 2
            this.targetRotation = gameArea.centerCardRotations[gameArea.nextCenterCardOffsetIndex]
            gameArea.centerStackHeight++
            this.animating = true

            this.animationStart = gameArea.timestamp
            this.currentAnimations.deal = this.dealMovement
        }
    }
    dealMovement(thisCard)
    {
        const ELAPSED = gameArea.timestamp - thisCard.animationStart
        if (ELAPSED <= Card.DEAL_ANIMATION_LENGTH)
        {
            thisCard.x = ((gameArea.canvas.width / 2) + thisCard.targetXOffset) + (thisCard.originX * Math.sin(ELAPSED * -0.5 * Math.PI / Card.DEAL_ANIMATION_LENGTH) + thisCard.originX)
            thisCard.y = ((gameArea.canvas.height / 2) + thisCard.targetYOffset) + (thisCard.originY * Math.sin(ELAPSED * -0.5 * Math.PI / Card.DEAL_ANIMATION_LENGTH) + thisCard.originY)
            thisCard.rotation = ((Math.PI / 2) - thisCard.targetRotation) * Math.sin(ELAPSED / (Card.DEAL_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (Math.PI / 2)
        }
        else
        {
            thisCard.x = (gameArea.canvas.width / 2) + thisCard.targetXOffset
            thisCard.y = (gameArea.canvas.height / 2) + thisCard.targetYOffset
            thisCard.rotation = thisCard.targetRotation
            thisCard.animating = false
            delete thisCard.currentAnimations.deal

            if (thisCard.burnerIndex != -1)
            {
                /*
                gameArea.userIsDealing = gameArea.temp.userIsDealing
                gameArea.userIsReceiving = gameArea.temp.userIsReceiving
                if (gameArea.temp.userIsDealing)
                {
                    gameArea.components["promptArrow"].rotation = Math.PI
                    gameArea.drawList.push(gameArea.components["promptArrow"])
                }
                else if (gameArea.temp.userIsReceiving)
                {
                    gameArea.components["promptArrow"].rotation = 0
                    gameArea.drawList.push(gameArea.components["promptArrow"])
                }
                */
                console.log(gameArea.centerStack)
                console.log(gameArea.receiveAnimationStart)
                if ((gameArea.centerStack.length == 1 && gameArea.centerStack[0] === thisCard) || gameArea.receiveAnimationStart != -1)
                {
                    thisCard.hide()
                }
                thisCard.burnerIndex = -1
            }
        }
    }
    receive(recipientIndex)
    {
        if (!this.animating)
        {
            let theta = (recipientIndex * 2 * Math.PI / gameArea.numPlayers) + (Math.PI / 2)
            this.originX = (gameArea.canvas.width / 2) * Math.cos(theta)
            this.originY = (gameArea.canvas.height / 2) * Math.sin(theta)

            this.animating = true
            this.animationStart = gameArea.timestamp
            this.currentAnimations.receive = this.receiveMovement
        }
    }
    receiveMovement(thisCard)
    {
        const TIME_LEFT = Card.RECEIVE_ANIMATION_LENGTH + (thisCard.animationStart - gameArea.timestamp)
        if (TIME_LEFT >= -Card.RECEIVE_ANIMATION_LENGTH)
        {
            thisCard.x = ((gameArea.canvas.width / 2) + thisCard.targetXOffset) + (thisCard.originX * Math.sin(TIME_LEFT * -0.5 * Math.PI / Card.RECEIVE_ANIMATION_LENGTH) + thisCard.originX)
            thisCard.y = ((gameArea.canvas.height / 2) + thisCard.targetYOffset) + (thisCard.originY * Math.sin(TIME_LEFT * -0.5 * Math.PI / Card.RECEIVE_ANIMATION_LENGTH) + thisCard.originY)
            thisCard.rotation = ((Math.PI / 2) - thisCard.targetRotation) * Math.sin(TIME_LEFT / (Card.RECEIVE_ANIMATION_LENGTH / (-0.5 * Math.PI))) + (Math.PI / 2)
        }
        else
        {
            thisCard.hide()
            thisCard.animating = false
            delete thisCard.currentAnimations.receive
        }
    }
    setBurn(burnerIndex, userIsDealing, userIsReceiving)
    {
        this.burnerIndex = burnerIndex
        gameArea.temp.userIsDealing = userIsDealing
        gameArea.temp.userisReceiving = userIsReceiving
    }

}

class Slapper extends ImgComponent
{
    static SLAP_ANIMATION_LENGTH = 120  // in milliseconds
    static VANISH_ANIMATION_LENGTH = 500  // in milliseconds

    constructor(name, slapperIndex)
    {
        super(name, document.getElementById("slapper"), gameArea.canvas.width / 2, gameArea.canvas.height / 2, 72, 80, 0)
        this.slapperIndex = slapperIndex
        this.cardToBurn = null

        this.type = "Slapper"
        this.scale = 1.0
        this.alpha = 1.0
    }
    slap()
    {
        if (!this.animating)
        {
            this.hide()

            this.rotation = (this.slapperIndex * 2 * Math.PI / gameArea.numPlayers)

            gameArea.drawList.push(this)
            this.x = gameArea.canvas.width / 2
            this.y = gameArea.canvas.height / 2
            this.scale = 2.5
            this.animating = true
            gameArea.audio.slap.play()
            this.animationStart = gameArea.timestamp
            this.currentAnimations.slap = this.slapMovement
        }
    }
    burnSlap (cardToBurn)
    {
        this.cardToBurn = cardToBurn
        this.slap()
    }
    slapMovement(thisSlapper)
    {
        const ELAPSED = gameArea.timestamp - thisSlapper.animationStart
        if (ELAPSED <= Slapper.SLAP_ANIMATION_LENGTH)
        {
            thisSlapper.scale = 4 - (1.4 * Math.sin(ELAPSED * 0.5 * Math.PI / Slapper.SLAP_ANIMATION_LENGTH) + 1.4)
        }
        else
        {
            thisSlapper.scale = 1
            delete thisSlapper.currentAnimations.slap

            thisSlapper.animationStart = gameArea.timestamp
            thisSlapper.currentAnimations.vanish = thisSlapper.vanishMovement  
        }
    }
    vanishMovement(thisSlapper)
    {
        const ELAPSED = gameArea.timestamp - thisSlapper.animationStart
        if (ELAPSED <= Slapper.VANISH_ANIMATION_LENGTH)
        {
            thisSlapper.alpha = 1 - (ELAPSED / Slapper.VANISH_ANIMATION_LENGTH)
        }
        else
        {
            thisSlapper.hide()
            thisSlapper.alpha = 1.0
            thisSlapper.animating = false
            delete thisSlapper.currentAnimations.vanish

            if (thisSlapper.cardToBurn != null)
            {
                thisSlapper.cardToBurn.deal()
                thisSlapper.cardToBurn = null
            }
        }
    }
    draw()
    {
        // x and y are the center of the image
        gameArea.context.save()
        gameArea.context.translate(this.x, this.y)
        gameArea.context.rotate(this.rotation)
        gameArea.context.scale(this.scale, this.scale)
        gameArea.context.globalAlpha = this.alpha
        gameArea.context.drawImage(this.image, this.width / -2, this.height / -2)
        gameArea.context.restore()
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
