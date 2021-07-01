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
    if (gameArea.players.length == 0)
    {
        gameArea.components["statusText"].hide()
    }
    else
    {
        document.getElementById("startGameButton").disabled = ""
    }
    for (let playerName of playerNames.split(","))
    {
        gameArea.players.push(playerName)

        gameArea.drawList.push(new TextComponent(playerName, playerName, 0, 0, 0, "20px Arial, Comic Sans MS, sans-serif", "#eee"))

        for (let i = 0; i < gameArea.players.length; i++)
        {
            let theta = (i * 2 * Math.PI / gameArea.players.length) + (Math.PI / 2)
            gameArea.components[gameArea.players[i]].x = 200 * Math.cos(theta) + gameArea.canvas.width / 2
            gameArea.components[gameArea.players[i]].y = 200 * Math.sin(theta) + gameArea.canvas.height / 2
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

function startGame ()
{
    becomeHost("n")
    socket.emit("start_game", getSettings())
}

socket.on("players_turn", function (playerName)
{
    gameArea.components[playerName].fillStyle = "#81d4fa"
})

socket.on("prompt_deal", function ()
{
    gameArea.components[gameArea.players[0]].fillStyle = "#81d4fa"
    userIsDealing = true
})

socket.on("witness_deal", function (cardID)
{
    gameArea.components[cardID].deal()
})
