"""Render the game template. Yep, that's it."""

from jinja2 import Environment, FileSystemLoader, select_autoescape
from os import walk

env = Environment(
    loader=FileSystemLoader("templates"),
    autoescape=select_autoescape()
)


def main():
    image_list = []
    for root, dirs, files in walk("static/cards"):
        for file in files:
            image_list.append("cards/" + file)

    with open("static/game.html", "w") as file:
        file.write(env.get_template("game.html.jinja").render(image_list=image_list))
