"""Geometria lógica configurável do tabuleiro e das canaletas externas."""

from __future__ import annotations

from dataclasses import dataclass, field

from pieces import Cell, PieceState


@dataclass
class Board:
    width: int = 5
    height: int = 5
    rail_depth: int = 4
    # Índices das linhas/colunas com passagem. O topo é sempre fechado.
    openings: dict[str, set[int]] = field(
        default_factory=lambda: {
            "left": {0, 1, 3, 4},
            "right": {1, 2, 3},
            "bottom": {0, 1, 3, 4},
            "top": set(),
        }
    )

    def inside(self, cell: Cell) -> bool:
        x, y = cell
        return 0 <= x < self.width and 0 <= y < self.height

    def allows_cell(self, cell: Cell, axis: str) -> bool:
        """Diz se uma célula pertence à área central ou a uma canaleta válida."""
        x, y = cell
        if self.inside(cell):
            return True
        if axis == "horizontal" and -self.rail_depth <= x < 0:
            return y in self.openings["left"]
        if axis == "horizontal" and self.width <= x < self.width + self.rail_depth:
            return y in self.openings["right"]
        if axis == "vertical" and self.height <= y < self.height + self.rail_depth:
            return x in self.openings["bottom"]
        return False

    def allows_piece(self, piece: PieceState, anchor: Cell) -> bool:
        ax, ay = anchor
        return all(
            self.allows_cell((ax + x, ay + y), piece.wave_axis)
            for x, y in piece.cells
        )

    def spawn_anchor(self, piece: PieceState, side: str, lane: int) -> Cell | None:
        """Cria uma posição totalmente externa, sem teletransportar para a grade."""
        xs = [x for x, _ in piece.cells]
        ys = [y for _, y in piece.cells]
        if side == "left" and piece.wave_axis == "horizontal":
            anchor = (-1 - max(xs), lane)
        elif side == "right" and piece.wave_axis == "horizontal":
            anchor = (self.width - min(xs), lane)
        elif side == "bottom" and piece.wave_axis == "vertical":
            anchor = (lane, self.height - min(ys))
        else:
            return None
        if not self.allows_piece(piece, anchor):
            return None
        world = tuple((anchor[0] + x, anchor[1] + y) for x, y in piece.cells)
        return anchor if all(not self.inside(cell) for cell in world) else None

    def entry_lanes(self, piece: PieceState, side: str) -> tuple[int, ...]:
        limit = self.height if side in {"left", "right"} else self.width
        return tuple(
            lane
            for lane in range(limit)
            if self.spawn_anchor(piece, side, lane) is not None
        )

    def compatible_sides(self, piece: PieceState) -> tuple[str, ...]:
        candidates = ("left", "right") if piece.wave_axis == "horizontal" else ("bottom",)
        return tuple(side for side in candidates if self.entry_lanes(piece, side))
