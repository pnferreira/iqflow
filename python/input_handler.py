"""Interação por mouse e atalhos mínimos."""

from __future__ import annotations

import pygame

from movement import GameModel
from renderer import Renderer


class InputHandler:
    def __init__(self, model: GameModel, renderer: Renderer) -> None:
        self.model = model
        self.renderer = renderer
        self.renderer.update_layout()
        self.loose_positions = self.renderer.default_loose_positions()
        self.selected: str | None = None
        self.drag_start: tuple[int, int] | None = None
        self.drag_reference: tuple[int, int] | None = None
        self.drag_offset = (0, 0)
        self.drag_from_loose_area = False
        self.loose_grab_offset = (0, 0)
        self.loose_original_position = (0, 0)

    def _clear_drag(self) -> None:
        self.drag_start = None
        self.drag_reference = None
        self.drag_offset = (0, 0)
        self.drag_from_loose_area = False
        self.loose_grab_offset = (0, 0)

    def _reset(self) -> None:
        self.model.reset()
        self.renderer.update_layout()
        self.loose_positions = self.renderer.default_loose_positions()
        self.selected = None
        self._clear_drag()

    def _rotate_selected(self) -> None:
        if not self.selected:
            return
        piece = self.model.pieces[self.selected]
        if self.model.rotate(self.selected) and piece.anchor is None:
            current = self.loose_positions[self.selected]
            if self.renderer.test_grid_rect.collidepoint(current):
                self.loose_positions[self.selected] = self.renderer.snap_to_test_grid(piece, current)
            else:
                self.loose_positions[self.selected] = self.renderer.clamp_loose_position(piece, current)

    def _update_inserted_drag(self, mouse_pos: tuple[int, int]) -> None:
        if not self.selected or self.drag_reference is None:
            return
        piece = self.model.pieces[self.selected]
        if piece.anchor is None:
            self.drag_offset = (0, 0)
            return

        horizontal = piece.wave_axis == "horizontal"
        axis = 0 if horizontal else 1
        reference = list(self.drag_reference)
        delta = mouse_pos[axis] - reference[axis]
        cell_size = self.renderer.cell_size

        while abs(delta) >= cell_size and piece.anchor is not None:
            direction = 1 if delta > 0 else -1
            dx, dy = (direction, 0) if horizontal else (0, direction)
            if self.model.move(self.selected, dx, dy) != 1:
                break
            reference[axis] += direction * cell_size
            delta = mouse_pos[axis] - reference[axis]

        self.drag_reference = (reference[0], reference[1])
        if piece.anchor is None or delta == 0:
            self.drag_offset = (0, 0)
            return

        direction = 1 if delta > 0 else -1
        dx, dy = (direction, 0) if horizontal else (0, direction)
        if self.model.can_move_one(self.selected, dx, dy):
            limited = max(-cell_size + 1, min(cell_size - 1, delta))
            self.drag_offset = (limited, 0) if horizontal else (0, limited)
        else:
            self.drag_offset = (0, 0)

    def handle(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.VIDEORESIZE:
            self.renderer.update_layout()
            defaults = self.renderer.default_loose_positions()
            for key, piece in self.model.pieces.items():
                if piece.anchor is None:
                    self.loose_positions[key] = defaults[key]

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return False
            if event.key == pygame.K_r:
                self._rotate_selected()
            if self.selected:
                directions = {
                    pygame.K_LEFT: (-1, 0),
                    pygame.K_RIGHT: (1, 0),
                    pygame.K_UP: (0, -1),
                    pygame.K_DOWN: (0, 1),
                }
                if event.key in directions:
                    self.model.move(self.selected, *directions[event.key])

        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.renderer.reset_rect.collidepoint(event.pos):
                self._reset()
                return True
            key = self.renderer.piece_at(event.pos, self.model.pieces, self.loose_positions)
            if key:
                self.selected = key
                piece = self.model.pieces[key]
                if event.button == 3:
                    self._rotate_selected()
                elif event.button == 1:
                    self.drag_start = event.pos
                    self.drag_reference = event.pos
                    self.drag_from_loose_area = piece.anchor is None
                    if piece.anchor is None:
                        origin = self.loose_positions[key]
                        self.loose_original_position = origin
                        self.loose_grab_offset = (
                            event.pos[0] - origin[0],
                            event.pos[1] - origin[1],
                        )

        if event.type == pygame.MOUSEMOTION and self.drag_start and self.selected:
            if self.drag_from_loose_area:
                self.loose_positions[self.selected] = (
                    event.pos[0] - self.loose_grab_offset[0],
                    event.pos[1] - self.loose_grab_offset[1],
                )
            else:
                self._update_inserted_drag(event.pos)

        if event.type == pygame.MOUSEBUTTONUP and event.button == 1 and self.selected:
            piece = self.model.pieces[self.selected]
            if self.drag_from_loose_area and piece.anchor is None:
                entry = self.renderer.entry_for_loose_piece(
                    piece, self.loose_positions[self.selected]
                )
                if entry:
                    side, lane = entry
                    if self.model.insert(self.selected, side, lane):
                        direction = {
                            "left": (1, 0),
                            "right": (-1, 0),
                            "bottom": (0, -1),
                        }[side]
                        # Percorre a entrada passo a passo. A colisão continua
                        # sendo validada em cada posição intermediária.
                        while piece.anchor is not None and not all(
                            self.model.board.inside(cell) for cell in piece.world_cells
                        ):
                            if self.model.move(self.selected, *direction) != 1:
                                break
                        if piece.anchor is not None and not any(
                            self.model.board.inside(cell) for cell in piece.world_cells
                        ):
                            # Se nem a primeira parte conseguiu entrar, devolve
                            # a peça à bancada em vez de deixá-la presa no trilho.
                            piece.anchor = None
                            piece.ever_inside = False
                            self.loose_positions[self.selected] = self.loose_original_position
                    else:
                        self.loose_positions[self.selected] = self.loose_original_position
                elif self.renderer.staging_rect.collidepoint(event.pos):
                    if self.renderer.test_grid_rect.collidepoint(event.pos):
                        self.loose_positions[self.selected] = self.renderer.snap_to_test_grid(
                            piece, self.loose_positions[self.selected]
                        )
                    else:
                        self.loose_positions[self.selected] = self.renderer.clamp_loose_position(
                            piece, self.loose_positions[self.selected]
                        )
                else:
                    self.loose_positions[self.selected] = self.loose_original_position
            elif piece.anchor is not None:
                dx, dy = self.drag_offset
                if piece.wave_axis == "horizontal" and abs(dx) >= self.renderer.cell_size / 2:
                    self.model.move(self.selected, 1 if dx > 0 else -1, 0)
                elif piece.wave_axis == "vertical" and abs(dy) >= self.renderer.cell_size / 2:
                    self.model.move(self.selected, 0, 1 if dy > 0 else -1)
            self._clear_drag()
        return True
