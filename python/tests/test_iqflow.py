from board import Board
from movement import GameModel
from pieces import PIECES, connected


EXPECTED = {
    "Y": {(0, 0), (1, 0), (1, 1)},
    "G": {(0, 0), (1, 0), (2, 0), (0, 1)},
    "C": {(0, 0), (1, 0)},
    "B": {(0, 0), (0, 1), (1, 1), (0, 2)},
    "R": {(0, 0), (1, 0)},
    "P": {(0, 0), (0, 1), (0, 2)},
    "S": {(1, 0), (2, 0), (0, 1), (1, 1)},
    "O": {(1, 0), (0, 1), (1, 1)},
}

REFERENCE = {
    "Y": (0, 0), "G": (2, 0), "C": (3, 1), "B": (0, 1),
    "R": (2, 2), "P": (4, 2), "S": (0, 3), "O": (2, 3),
}


def test_exactly_eight_connected_pieces_with_area_25():
    assert len(PIECES) == 8
    assert sum(len(piece.cells) for piece in PIECES) == 25
    assert all(connected(piece.cells) for piece in PIECES)
    assert {piece.key: set(piece.cells) for piece in PIECES} == EXPECTED


def test_reference_configuration_fills_the_board_once():
    occupied = []
    for piece in PIECES:
        ax, ay = REFERENCE[piece.key]
        occupied.extend((ax + x, ay + y) for x, y in piece.cells)
    assert len(occupied) == len(set(occupied)) == 25
    assert set(occupied) == {(x, y) for y in range(5) for x in range(5)}


def test_piece_moves_only_along_its_waves():
    model = GameModel()
    red = model.pieces["R"]
    red.anchor = (1, 2)
    red.ever_inside = True
    assert model.move("R", 0, 1) == 0
    assert model.move("R", 1, 0) == 1


def test_collision_stops_before_other_piece():
    model = GameModel()
    model.pieces["R"].anchor = (0, 2)
    model.pieces["R"].ever_inside = True
    model.pieces["P"].anchor = (2, 1)
    model.pieces["P"].ever_inside = True
    assert model.move("R", 1, 0, 4) == 0
    assert model.pieces["R"].anchor == (0, 2)


def test_top_and_closed_edges_reject_entry():
    model = GameModel()
    assert not model.insert("R", "top", 0)
    assert not model.insert("R", "left", 2)  # linha 2 está fechada à esquerda


def test_entry_starts_outside_instead_of_teleporting():
    model = GameModel()
    assert model.insert("R", "left", 0)
    red = model.pieces["R"]
    assert red.anchor is not None
    assert all(not model.board.inside(cell) for cell in red.world_cells)


def test_rotation_is_allowed_only_outside():
    model = GameModel()
    assert model.rotate("G")
    model.pieces["G"].anchor = (1, 1)
    model.pieces["G"].ever_inside = True
    previous = model.pieces["G"].rotation
    assert not model.rotate("G")
    assert model.pieces["G"].rotation == previous


def test_board_has_no_top_opening():
    board = Board()
    assert board.openings["top"] == set()
    assert board.openings["left"] == {0, 1, 3, 4}
    assert board.openings["right"] == {1, 2, 3}
    assert board.openings["bottom"] == {0, 1, 3, 4}
    assert not board.allows_cell((2, -1), "vertical")
