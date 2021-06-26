from flask import Flask
import render
import card
from markupsafe import escape

print("Hello, ERS-OL!")

app = Flask(__name__, static_url_path="", static_folder="static")
lobby = {
    "players": [],
    "center": [  # List of cards in the center stack
        card.Card(10, "Clubs")
    ]
}


# The first player to join the lobby becomes the host
def host():
    lobby["players"].append(0)  # TODO temporary
    return join()


@app.route("/")
def join():
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


def startup():
    render.main()

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=25565)


startup()
