"""Estado e regras de rotação, entrada, deslizamento e colisão."""

from __future__ import annotations

from board import Board
from pieces import PIECES, Cell, PieceState


class GameModel:
    def __init__(self, board: Board | None = None) -> None:
        self.board = board or Board()
        self.pieces = {definition.key: PieceState(definition) for definition in PIECES}

    def reset(self) -> None:
        for state in self.pieces.values():
            state.rotation = 0
            state.anchor = None
            state.ever_inside = False

    def occupied(self, except_key: str | None = None) -> set[Cell]:
        return {
            cell
            for key, state in self.pieces.items()
            if key != except_key
            for cell in state.world_cells
        }

    def rotate(self, key: str, clockwise: bool = True) -> bool:
        piece = self.pieces[key]
        # Ao sair totalmente, a peça volta para a bandeja; logo só a bandeja gira.
        if piece.anchor is not None:
            return False
        piece.rotation = (piece.rotation + (1 if clockwise else -1)) % 4
        return True

    def insert(self, key: str, side: str, lane: int) -> bool:
        piece = self.pieces[key]
        if piece.anchor is not None or side == "top":
            return False
        anchor = self.board.spawn_anchor(piece, side, lane)
        if anchor is None:
            return False
        cells = {(anchor[0] + x, anchor[1] + y) for x, y in piece.cells}
        if cells & self.occupied(key):
            return False
        piece.anchor = anchor
        piece.ever_inside = False
        return True

    def can_move_one(self, key: str, dx: int, dy: int) -> bool:
        piece = self.pieces[key]
        if piece.anchor is None or (dx, dy) == (0, 0):
            return False
        if piece.wave_axis == "horizontal" and dy != 0:
            return False
        if piece.wave_axis == "vertical" and dx != 0:
            return False
        if abs(dx) + abs(dy) != 1:
            return False
        target = (piece.anchor[0] + dx, piece.anchor[1] + dy)
        if not self.board.allows_piece(piece, target):
            return False
        target_cells = {(target[0] + x, target[1] + y) for x, y in piece.cells}
        return not bool(target_cells & self.occupied(key))

    def move(self, key: str, dx: int, dy: int, steps: int = 1) -> int:
        """Move passo a passo e para antes da primeira colisão."""
        piece = self.pieces[key]
        moved = 0
        for _ in range(max(0, steps)):
            if not self.can_move_one(key, dx, dy):
                break
            assert piece.anchor is not None
            piece.anchor = (piece.anchor[0] + dx, piece.anchor[1] + dy)
            moved += 1
            if any(self.board.inside(cell) for cell in piece.world_cells):
                piece.ever_inside = True
            elif piece.ever_inside:
                # Uma peça que saiu por completo volta para sua área de espera.
                piece.anchor = None
                piece.ever_inside = False
                break
        return moved
