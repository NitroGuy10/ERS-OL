from flask import Flask
import render
from markupsafe import escape

print("Hello, ERS-OL!")

app = Flask(__name__, static_url_path="", static_folder="static")
lobby = {
    "players": []
}


# The first player to join the lobby becomes the host
def host():
    lobby["players"].append(0)  # TODO temporary
    return app.send_static_file("game.html")


@app.route("/")
def join():
    if len(lobby["players"]) == 0:
        return host()
    lobby["players"].append(0)  # TODO temporary
    return app.send_static_file("game.html")


def startup():
    render.main()

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=25565)


startup()
