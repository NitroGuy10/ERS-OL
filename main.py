"""Module for handling server operations"""

from flask import Flask
from socketio import Server as SocketIOServer, WSGIApp as SocketIOWSGIApp

from markupsafe import escape
from re import split as re_split
from random import randrange, shuffle

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


def deal_shuffled_deck(lobby):
    deck = card.deck()
    shuffle(deck)
    while len(deck) != 0:
        for player in lobby["players"].values():
            if len(deck) != 0:
                player["hand"].append(deck.pop())


def slap_results(pile, settings):
    if settings["slapDoubles"] and len(pile) >= 2 and pile[0].rank == pile[1].rank:
        return True, "Double"
    elif settings["slapSandwiches"] and len(pile) >= 3 and pile[0].rank == pile[2].rank:
        return True, "Sandwich"
    elif settings["slapTenSandwiches"] and len(pile) >= 3 and pile[0].rank + pile[2].rank == 10:
        return True, "Ten Sandwich"
    elif settings["slapTopBottom"] and len(pile) >= 4 and pile[0].rank == pile[-1].rank:
        return True, "Top Bottom"
    elif settings["slapAddsToTen"] and len(pile) >= 2 and pile[0].rank + pile[1].rank == 10:
        return True, "Adds to Ten"
    elif settings["slapMarriage"] and len(pile) >= 2 and pile[0].rank + pile[1].rank == 25:
        return True, "Marriage"
    elif settings["slapDivorce"] and len(pile) >= 3 and pile[0].rank + pile[2].rank == 25:
        return True, "Divorce"
    elif settings["slapThreeAscDesc"] and len(pile) >= 3 and pile[0].rank - pile[1].rank == 1 \
            and pile[1].rank - pile[2].rank == 1:
        return True, "Three Ascending"
    elif settings["slapThreeAscDesc"] and len(pile) >= 3 and pile[2].rank - pile[1].rank == 1 \
            and pile[1].rank - pile[0].rank == 1:
        return True, "Three Descending"
    elif settings["slapFourAscDesc"] and len(pile) >= 4 and pile[0].rank - pile[1].rank == 1 \
            and pile[1].rank - pile[2].rank == 1 and pile[2].rank - pile[3].rank == 1:
        return True, "Four Ascending"
    elif settings["slapFourAscDesc"] and len(pile) >= 4 and pile[3].rank - pile[2].rank == 1 \
            and pile[2].rank - pile[1].rank == 1 and pile[1].rank - pile[0].rank == 1:
        return True, "Four Descending"
    elif settings["slapTens"] and len(pile) >= 1 and pile[0].rank == 10:
        return True, "Ten"
    elif settings["slapSevens"] and len(pile) >= 1 and pile[0].rank == 7:
        return True, "Seven"
    else:
        return False, ""


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
                # card.Card(1, "Spades")
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
                "center_pile": [],
                "can_slap": False,
                "already_slapped": False
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
        deal_shuffled_deck(lobby)

        first_player_index = randrange(0, len(lobby["players"]))
        lobby["whose_turn_index"] = first_player_index
        prompt_deal(lobby)


@sio.event
def deal(socket_id):
    lobby = lobbies[players[socket_id]["lobby_name"]]
    if socket_id == lobby["current_dealer_sid"]:
        dealt_card = players[socket_id]["hand"].pop(0)
        lobby["center_pile"].insert(0, dealt_card)
        lobby["can_slap"] = True
        lobby["already_slapped"] = False
        sio.emit("witness_deal",
                 {"cardID": dealt_card.get_id(), "dealerName": players[socket_id]["name"]}, room=lobby["name"])

        if dealt_card.get_attempts_minus_one() > -1:  # A face card round is started
            lobby["face_card_attempts_left"] = dealt_card.get_attempts_minus_one()
            lobby["face_card_initiator_index"] = lobby["whose_turn_index"]
            prompt_next_deal(lobby)
        elif lobby["face_card_attempts_left"] == -1:  # The game continues normally
            prompt_next_deal(lobby)
        elif lobby["settings"]["tenEndsFaceCardRound"] and dealt_card.rank == 10:
            # The face card round is ended by a "10" card (if allowed in settings)
            lobby["face_card_attempts_left"] = -1
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


@sio.event
def slap(socket_id):
    lobby = lobbies[players[socket_id]["lobby_name"]]
    if lobby["can_slap"]:
        if lobby["already_slapped"]:
            sio.emit("witness_futile_slap", lobby["players"][socket_id]["name"], room=lobby["name"])
        else:
            sio.emit("witness_slap", lobby["players"][socket_id]["name"], room=lobby["name"])
            results = slap_results(lobby["center_pile"], lobby["settings"])
            if results[0]:
                lobby["already_slapped"] = True
                lobby["current_dealer_sid"] = ""
                lobby["whose_turn_index"] = lobby["player_order"].index(socket_id)
                sio.emit("explain_slap", results[1], room=lobby["name"])
                prompt_receive(lobby)
            else:
                burnt_card = players[socket_id]["hand"].pop(0)
                lobby["center_pile"].append(burnt_card)
                sio.emit("witness_burn_slap",
                         {"burnerName": lobby["players"][socket_id]["name"],
                          "cardID": burnt_card.get_id()},
                         room=lobby["name"])
                if socket_id == lobby["current_dealer_sid"] and len(players[socket_id]["hand"]):
                    prompt_next_deal(lobby)


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
