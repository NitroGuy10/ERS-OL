"""Convenience module for dealing with playing cards"""

RANK_NAME = ["NONE", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]


class Card:
    def __init__(self, rank, suit):
        self.rank = rank
        self.suit = suit

    def __str__(self):
        return RANK_NAME[self.rank] + " of " + self.suit

    def get_id(self):
        return "cards/card" + self.suit + RANK_NAME[self.rank] + ".png"

    def get_attempts_minus_one(self):
        if self.rank == 11:
            return 0
        elif self.rank == 12:
            return 1
        elif self.rank == 13:
            return 2
        elif self.rank == 1:
            return 3
        else:
            return -1
