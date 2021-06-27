"""Module for handling server operations"""

from flask import Flask
from socketio import Server as SocketIOServer, WSGIApp as SocketIOWSGIApp

from markupsafe import escape
from re import split as re_split

import render
import card


print("Hello, ERS-OL!")

app = Flask(__name__, static_url_path="", static_folder="static")
sio = SocketIOServer()
app.wsgi_app = SocketIOWSGIApp(sio, app.wsgi_app)

players = {}
lobbies = {}

lobby = {
    "players": [],
    "center": [  # List of cards in the center stack
        card.Card(10, "Clubs")
    ]
}


def normalize(original_string):
    return "".join(re_split(r"[^0-9A-Za-z_\-]", original_string))


@app.route("/")
def index():
    return app.send_static_file("index.html")


# The first player to join the lobby becomes the host
def host():
    lobby["players"].append(0)  # TODO temporary
    return join()


@app.route("/play/<lobby_name>")
def join(lobby_name):
    lobby_name = normalize(lobby_name[:20])
    print(lobby_name)
    if len(lobby["players"]) == 0:
        return host()
    new_player = {
        "id": "TODO with websockets",
        "name": "player",  # Prompt user to enter a name (?)
        "hand": [
            card.Card(1, "Spades"),
            card.Card(12, "Hearts")
        ]
    }
    lobby["players"].append(new_player)
    return app.send_static_file("game.html")


# TODO called by player's post
def deal(player_id):
    # TODO deal the top card from the player's deck (if it's their turn)
    pass


# TODO called by player's post
def slap(player_id):
    # TODO slap the deck and do all that that implies
    pass


# TODO called by player's post
def take(player_id):
    # TODO make the player that won the center stack receive their cards
    pass


@sio.event
def connect(socket_id, environment):
    print("Socket connected: ", socket_id)


@sio.event
def ping(socket_id, data):
    sio.emit("pong", data, room=socket_id)


@sio.event
def disconnect(socket_id):
    print("Socket disconnected: ", socket_id)


def startup():
    render.main()

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=25565)


startup()
