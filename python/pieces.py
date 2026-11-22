"""Definições geométricas das oito peças do IQFlow."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

Cell = tuple[int, int]
Color = tuple[int, int, int]


def _hex(value: str) -> Color:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


@dataclass(frozen=True)
class PieceDefinition:
    key: str
    name: str
    color: Color
    cells: tuple[Cell, ...]
    wave_axis: str  # "horizontal" ou "vertical"


@dataclass
class PieceState:
    definition: PieceDefinition
    rotation: int = 0
    anchor: Cell | None = None
    ever_inside: bool = False

    @property
    def cells(self) -> tuple[Cell, ...]:
        return rotated_cells(self.definition.cells, self.rotation)

    @property
    def wave_axis(self) -> str:
        if self.rotation % 2 == 0:
            return self.definition.wave_axis
        return "vertical" if self.definition.wave_axis == "horizontal" else "horizontal"

    @property
    def world_cells(self) -> tuple[Cell, ...]:
        if self.anchor is None:
            return ()
        ax, ay = self.anchor
        return tuple((ax + x, ay + y) for x, y in self.cells)


def rotated_cells(cells: Iterable[Cell], quarter_turns: int) -> tuple[Cell, ...]:
    """Gira sem espelhar e normaliza a forma para começar em (0, 0)."""
    result = list(cells)
    for _ in range(quarter_turns % 4):
        result = [(-y, x) for x, y in result]
        min_x = min(x for x, _ in result)
        min_y = min(y for _, y in result)
        result = [(x - min_x, y - min_y) for x, y in result]
    return tuple(sorted(result, key=lambda cell: (cell[1], cell[0])))


PIECES: tuple[PieceDefinition, ...] = (
    PieceDefinition("Y", "Amarela", _hex("#F4DA28"), ((0, 0), (1, 0), (1, 1)), "horizontal"),
    PieceDefinition("G", "Verde-turquesa", _hex("#12C6B2"), ((0, 0), (1, 0), (2, 0), (0, 1)), "horizontal"),
    PieceDefinition("C", "Coral", _hex("#F66C58"), ((0, 0), (1, 0)), "vertical"),
    PieceDefinition("B", "Azul-escura", _hex("#3155BE"), ((0, 0), (0, 1), (1, 1), (0, 2)), "vertical"),
    PieceDefinition("R", "Vermelha", _hex("#E83260"), ((0, 0), (1, 0)), "horizontal"),
    PieceDefinition("P", "Roxa", _hex("#B64BAF"), ((0, 0), (0, 1), (0, 2)), "vertical"),
    PieceDefinition("S", "Azul-ciano", _hex("#00B9EB"), ((1, 0), (2, 0), (0, 1), (1, 1)), "horizontal"),
    PieceDefinition("O", "Laranja", _hex("#F58D2B"), ((1, 0), (0, 1), (1, 1)), "horizontal"),
)

PIECE_BY_KEY = {piece.key: piece for piece in PIECES}


def connected(cells: Iterable[Cell]) -> bool:
    pending = set(cells)
    if not pending:
        return False
    visited = {pending.pop()}
    while pending:
        neighbours = {
            (x + dx, y + dy)
            for x, y in visited
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
        }
        found = pending & neighbours
        if not found:
            return False
        visited.update(found)
        pending.difference_update(found)
    return True


def validate_definitions() -> None:
    if len(PIECES) != 8 or len(PIECE_BY_KEY) != 8:
        raise ValueError("Devem existir exatamente oito peças distintas.")
    if sum(len(piece.cells) for piece in PIECES) != 25:
        raise ValueError("As áreas das peças devem somar 25.")
    for piece in PIECES:
        if len(set(piece.cells)) != len(piece.cells) or not connected(piece.cells):
            raise ValueError(f"Forma inválida: {piece.name}")


validate_definitions()
