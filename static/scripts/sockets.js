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
    for (let playerName of playerNames.split(","))
    {
        if (gameArea.players.length == 0)
        {
            gameArea.components["statusText"].hide()
        }
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
    let settings = {}
    for (let settingElement of document.getElementsByClassName("hostSetting"))
    {
        settings[settingElement.id] = settingElement.checked
    }
    socket.emit("declare_settings", settings)
}
