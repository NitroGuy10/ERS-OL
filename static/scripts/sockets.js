var socket = io()

socket.emit("ping", "13375P34K")

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