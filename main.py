"""Module for handling server operations"""

from flask import Flask
from socketio import Server as SocketIOServer, WSGIApp as SocketIOWSGIApp

from markupsafe import escape
from re import split as re_split
from random import randrange

import render
import card


print("Hello, ERS-OL!")

app = Flask(__name__, static_url_path="", static_folder="static")
sio = SocketIOServer()
app.wsgi_app = SocketIOWSGIApp(sio, app.wsgi_app)

MAX_PLAYERS_PER_LOBBY = 8
players = {}
lobbies = {}


def normalize(original_string):
    return "".join(re_split(r"[^0-9A-Za-z_\-]", original_string))


def set_next_turn_index(lobby):
    for i in range(len(lobby["player_order"])):
        lobby["whose_turn_index"] = (lobby["whose_turn_index"] + 1) % len(lobby["player_order"])
        if len(players[lobby["player_order"][lobby["whose_turn_index"]]]["hand"]) > 0:
            return True  # Game continues
    return False  # Game over


def prompt_deal(lobby):
    dealer_socket_id = lobby["player_order"][lobby["whose_turn_index"]]
    lobby["current_dealer_sid"] = dealer_socket_id
    sio.emit("prompt_deal", room=dealer_socket_id)
    sio.emit("players_turn", players[dealer_socket_id]["name"],
             room=lobby["name"], skip_sid=dealer_socket_id)  # This is already implied for the dealing player


def prompt_next_deal(lobby):
    if not set_next_turn_index(lobby):
        sio.emit("game_over", "Did you win? I don't know!", room=lobby["name"])
    else:
        prompt_deal(lobby)


def prompt_receive(lobby):
    recipient_socket_id = lobby["player_order"][lobby["whose_turn_index"]]
    lobby["current_recipient_sid"] = recipient_socket_id
    sio.emit("prompt_receive", room=recipient_socket_id)
    sio.emit("players_turn", players[recipient_socket_id]["name"],
             room=lobby["name"], skip_sid=recipient_socket_id)  # This is already implied for the receiving player


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
    elif lobby_name in lobbies and lobbies[lobby_name]["in_progress"]:
        sio.emit("denied_entry", "game is in progress", room=socket_id)
    else:
        sio.enter_room(socket_id, lobby_name)
        new_player = {
            "socket_id": socket_id,
            "name": socket_id[:6],  # Prompt user to enter a name (?)
            "lobby_name": lobby_name,
            "is_host": False,
            "hand": [
                card.Card(1, "Spades"),
                card.Card(12, "Hearts"),
                card.Card(9, "Clubs"),
                card.Card(2, "Diamonds"),
                card.Card(8, "Diamonds"),
            ]
        }
        if lobby_name not in lobbies:
            # The first player to join the lobby becomes the host
            new_player["is_host"] = True
            lobbies[lobby_name] = {
                "in_progress": False,
                "name": lobby_name,
                "host": new_player,
                "current_dealer_sid": "",
                "current_recipient_sid": "",
                "face_card_initiator_sid": "",
                "face_card_attempts_left": -1,
                "players": {},
                "player_order": [],
                "whose_turn_index": -1,
                "settings": {},
                "center_pile": []
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
    lobby = lobbies[players[socket_id]["lobby_name"]]
    if lobby["host"] is players[socket_id] and not lobby["in_progress"]:
        lobby["settings"] = settings
        sio.emit("update_settings", settings, room=lobby["name"], skip_sid=socket_id)


@sio.event
def start_game(socket_id, settings):
    lobby = lobbies[players[socket_id]["lobby_name"]]
    if lobby["host"] is players[socket_id]:
        declare_settings(socket_id, settings)
        lobby["player_order"] = list(lobby["players"].keys())
        lobby["in_progress"] = True

        first_player_index = randrange(0, len(lobby["players"]))
        lobby["whose_turn_index"] = first_player_index
        prompt_deal(lobby)


@sio.event
def deal(socket_id):
    lobby = lobbies[players[socket_id]["lobby_name"]]
    if socket_id == lobby["current_dealer_sid"]:
        dealt_card = players[socket_id]["hand"].pop(0)
        lobby["center_pile"].insert(0, dealt_card)
        sio.emit("witness_deal",
                 {"cardID": dealt_card.get_id(), "dealerName": players[socket_id]["name"]}, room=lobby["name"])

        if dealt_card.get_attempts_minus_one() > -1:  # A face card round is started
            lobby["face_card_attempts_left"] = dealt_card.get_attempts_minus_one()
            lobby["face_card_initiator_index"] = lobby["whose_turn_index"]
            prompt_next_deal(lobby)
        elif lobby["face_card_attempts_left"] == -1:  # The game continues normally
            prompt_next_deal(lobby)
        elif lobby["face_card_attempts_left"] == 0:  # The face card round initiator receives their cards
            lobby["whose_turn_index"] = lobby["face_card_initiator_index"]
            lobby["current_dealer_sid"] = ""
            lobby["face_card_initiator_index"] = -1
            lobby["face_card_attempts_left"] = -1
            prompt_receive(lobby)
        else:  # The current dealer must deal another card
            lobby["face_card_attempts_left"] -= 1
            prompt_deal(lobby)


@sio.event
def receive(socket_id):
    lobby = lobbies[players[socket_id]["lobby_name"]]
    if socket_id == lobby["current_recipient_sid"]:
        lobby["current_recipient_sid"] = ""
        lobby["face_card_attempts_left"] = -1
        sio.emit("witness_receive", lobby["players"][socket_id]["name"], room=lobby["name"])
        lobby["players"][socket_id]["hand"].extend(lobby["center_pile"])
        lobby["center_pile"] = []
        prompt_deal(lobby)


# TODO called by player's post
def slap(player_id):
    # TODO slap the deck and do all that that implies
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
