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

MAX_PLAYERS_PER_LOBBY = 2
players = {}
lobbies = {}


def normalize(original_string):
    return "".join(re_split(r"[^0-9A-Za-z_\-]", original_string))


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/play/<lobby_name>")
def serve_game(lobby_name):
    if lobby_name == normalize(lobby_name[:20]):
        return app.send_static_file("game.html")
    else:
        return "<p>invalid lobby name</p>"


@sio.event
def join_lobby(socket_id, lobby_name):
    if type(lobby_name) != str:
        return

    if lobby_name != normalize(lobby_name[:20]):
        sio.emit("denied_entry", "invalid lobby name", room=socket_id)
    elif lobby_name in lobbies and len(lobbies[lobby_name]["players"]) >= MAX_PLAYERS_PER_LOBBY:
        sio.emit("denied_entry", "lobby is full (" + str(MAX_PLAYERS_PER_LOBBY) + " players)", room=socket_id)
    # TODO deny if lobby's game has started
    else:
        sio.enter_room(socket_id, lobby_name)
        new_player = {
            "socket_id": socket_id,
            "name": socket_id[:6],  # Prompt user to enter a name (?)
            "lobby_name": lobby_name,
            "hand": [
                card.Card(1, "Spades"),
                card.Card(12, "Hearts"),
                card.Card(10, "Clubs")
            ]
        }
        if lobby_name not in lobbies:
            # The first player to join the lobby becomes the host
            new_player["isHost"] = True
            lobbies[lobby_name] = {
                "name": lobby_name,
                "host": new_player,
                "players": {},
                "settings": {}
            }
            print("Lobby " + lobby_name + " created")

        players[socket_id] = new_player
        lobbies[lobby_name]["players"][socket_id] = new_player
        sio.emit("admit_players", new_player["name"], room=lobby_name)
        if len(lobbies[lobby_name]["players"]) == 1:
            sio.emit("become_host", "", room=socket_id)
        else:
            earlier_players = []
            for player_socket_id in lobbies[lobby_name]["players"]:
                if player_socket_id != socket_id:
                    earlier_players.append(players[player_socket_id]["name"])
            sio.emit("admit_players", ",".join(earlier_players), room=socket_id)


@sio.event
def declare_settings(socket_id, settings):
    lobby_name = players[socket_id]["lobby_name"]
    if lobbies[lobby_name]["host"] is players[socket_id]:
        lobbies[lobby_name]["settings"] = settings


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
    # It can be assumed that sockets will only connect from /play/*
    print("Socket connected: ", socket_id)


@sio.event
def ping(socket_id, data):
    sio.emit("pong", data, room=socket_id)


@sio.event
def disconnect(socket_id):
    if socket_id in players:
        lobby_name = players[socket_id]["lobby_name"]
        sio.emit("game_over", players[socket_id]["name"] + " disconnected", room=lobby_name)
        del lobbies[lobby_name]["players"][socket_id]
        if len(lobbies[lobby_name]["players"]) == 0:
            del lobbies[lobby_name]
            print("Lobby " + lobby_name + " deleted; all players disconnected")
        del players[socket_id]
    print("Socket disconnected: ", socket_id)


def startup():
    render.main()

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=25565)


startup()
