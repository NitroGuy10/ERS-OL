var socket = io()

socket.on("pong", function (data)
{
    console.log("Pong! ...with a side of: " + data)
})

socket.on("denied_entry", function (reason)
{
    gameArea.components["statusText"].text = "Denied Entry: " + reason
    gameArea.components["statusText"].fontSize = "25px"
})

socket.on("admit_players", function (playerNames)
{
    if (gameArea.numPlayers == 0)
    {
        gameArea.components["statusText"].hide()
    }
    else
    {
        document.getElementById("startGameButton").disabled = ""
    }
    for (let playerName of playerNames.split(","))
    {
        gameArea.drawList.push((new Player(playerName, gameArea.numPlayers)).component)

        let players = Object.values(gameArea.players)
        for (let i = 0; i < gameArea.numPlayers; i++)
        {
            let theta = (i * 2 * Math.PI / gameArea.numPlayers) + (Math.PI / 2)
            players[i].component.x = (.4 * gameArea.canvas.width) * Math.cos(theta) + gameArea.canvas.width / 2
            players[i].component.y = (.4 * gameArea.canvas.height) * Math.sin(theta) + gameArea.canvas.height / 2
        }
    }
})

socket.on("become_host", function (isHost)
{
    becomeHost(isHost)
})

function becomeHost(isHost)
{
    for (let setting of document.getElementsByClassName("hostSetting"))
    {
        // isHost will either be "" for yes or "n" for no
        setting.disabled = isHost
    }
    if (isHost === "")
    {
        document.getElementById("youAreTheHost").style.display = ""
    }
    else
    {
        document.getElementById("youAreTheHost").style.display = "none"
    }
}

function declareSettings()
{
    socket.emit("declare_settings", getSettings())
}

socket.on("update_settings", function (settings)
{
    for (let setting in settings)
    {
        document.getElementById(setting).checked = settings[setting]
    }
})

function startGame()
{
    becomeHost("n")
    socket.emit("start_game", getSettings())
}

socket.on("players_turn", function (playerName)
{
    makeTurn(playerName)
})

function makeTurn(playerName)
{
    for (let player in gameArea.players)
    {
        gameArea.players[player].isTurn = false
    }
    gameArea.players[playerName].isTurn = true
}

socket.on("prompt_deal", function ()
{
    makeTurn(gameArea.user.name)
    if (gameArea.centerStack.length > 0)
    {
        gameArea.userCanSlap = true
    }
    if (gameArea.receiveAnimationStart == -1)
    {
        gameArea.components["promptArrow"].rotation = Math.PI
        gameArea.drawList.push(gameArea.components["promptArrow"])
        gameArea.userIsDealing = true
    }
})

socket.on("witness_deal", function (info)
{
    gameArea.components["statusText"].hide()
    gameArea.components[info.cardID].deal(gameArea.players[info.dealerName].index, false)
    gameArea.userCanSlap = true
})

socket.on("game_over", function (reason)
{
    console.log("Game Over! - " + reason)
})

socket.on("prompt_receive", function ()
{
    // This signaling is kind of overpowered but eh whatever
    makeTurn(gameArea.user.name)
    gameArea.components["promptArrow"].rotation = 0
    gameArea.drawList.push(gameArea.components["promptArrow"])
    gameArea.userIsReceiving = true
    gameArea.userCanSlap = false
})

socket.on("witness_receive", function (recipientName)
{
    gameArea.components["promptArrow"].hide()
    gameArea.userCanSlap = false
    gameArea.recipientIndex = gameArea.players[recipientName].index
    gameArea.receiveAnimationStart = gameArea.timestamp
    gameArea.audio.dealMany.play()
})

socket.on("witness_futile_slap", function (slapperName)
{
    gameArea.players[slapperName].slapper.slap()
})

socket.on("witness_slap", function (slapperName)
{
    gameArea.components["promptArrow"].hide()
    gameArea.players[slapperName].slapper.slap()
})

socket.on("explain_slap", function (explanation)
{
    gameArea.components["statusText"].text = explanation
    gameArea.components["statusText"].fontSize = "50px"
    gameArea.components["statusText"].fillStyle = "#81d4fa"
    gameArea.drawList.push(gameArea.components["statusText"])
})
