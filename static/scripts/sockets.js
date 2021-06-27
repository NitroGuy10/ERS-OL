var socket = io()

socket.emit("ping", "13375P34K")

socket.on("pong", function (data)
{
    console.log("Pong! ...with a side of: " + data)
})