"""Renderização do tabuleiro, das peças e das ondulações com Pygame."""

from __future__ import annotations

import math

import pygame

from board import Board
from pieces import Cell, Color, PieceState


class Renderer:
    BG = (20, 22, 28)
    PANEL = (30, 33, 41)
    PLASTIC = (24, 25, 28)
    PLASTIC_LIGHT = (55, 57, 62)
    WELL = (10, 11, 14)

    def __init__(self, screen: pygame.Surface, board: Board) -> None:
        self.screen = screen
        self.board = board
        self.font = pygame.font.SysFont("arial", 18)
        self.small = pygame.font.SysFont("arial", 14)
        self.cell_size = 86
        self.board_origin = (130, 145)
        self.staging_rect = pygame.Rect(0, 90, 470, 620)
        self.test_grid_rect = pygame.Rect(0, 0, 400, 400)
        self.reset_rect = pygame.Rect(0, 0, 130, 42)

    def update_layout(self) -> None:
        width, height = self.screen.get_size()
        self.cell_size = max(
            48,
            min(80, (height - 210) // 5, (height - 280) // 7, (width - 590) // 5),
        )
        board_px = self.cell_size * 5
        staging_width = 470
        board_x = max(55, (width - staging_width - board_px) // 2)
        self.board_origin = (board_x, max(115, (height - board_px) // 2))
        self.staging_rect = pygame.Rect(width - staging_width - 15, 90, staging_width, height - 125)
        self.test_grid_rect = pygame.Rect(
            self.staging_rect.x + 12,
            self.staging_rect.y + 68,
            self.cell_size * 5,
            self.cell_size * 5,
        )
        self.reset_rect = pygame.Rect(width - 176, 25, 140, 42)

    def cell_rect(self, cell: Cell) -> pygame.Rect:
        x, y = cell
        ox, oy = self.board_origin
        return pygame.Rect(ox + x * self.cell_size, oy + y * self.cell_size, self.cell_size, self.cell_size)

    def draw(
        self,
        pieces: dict[str, PieceState],
        selected: str | None,
        drag_offset: Cell = (0, 0),
        loose_positions: dict[str, Cell] | None = None,
    ) -> None:
        self.update_layout()
        self.screen.fill(self.BG)
        self._draw_title()
        self._draw_board()
        self._draw_staging_area()
        self._draw_entries(pieces.get(selected) if selected else None)
        positions = loose_positions or {}
        for piece in pieces.values():
            if piece.anchor is None:
                position = positions.get(piece.definition.key)
                if position is not None:
                    self._draw_loose_piece(piece, position, piece.definition.key == selected)
            else:
                offset = drag_offset if piece.definition.key == selected else (0, 0)
                self._draw_world_piece(piece, piece.definition.key == selected, offset)
        pygame.draw.rect(self.screen, (64, 68, 79), self.reset_rect, border_radius=10)
        label = self.font.render("Reiniciar", True, (245, 245, 248))
        self.screen.blit(label, label.get_rect(center=self.reset_rect.center))
        help_text = self.small.render("Arraste para uma entrada • arraste no eixo • botão direito/R gira", True, (154, 160, 174))
        self.screen.blit(help_text, (30, self.screen.get_height() - 30))

    def _draw_title(self) -> None:
        title = pygame.font.SysFont("arial", 29, bold=True).render("IQFlow", True, (238, 240, 245))
        self.screen.blit(title, (30, 25))
        subtitle = self.small.render("reprodução do mecanismo físico", True, (145, 151, 165))
        self.screen.blit(subtitle, (31, 61))

    def _draw_staging_area(self) -> None:
        pygame.draw.rect(self.screen, self.PANEL, self.staging_rect, border_radius=18)
        pygame.draw.rect(self.screen, (62, 66, 77), self.staging_rect, width=2, border_radius=18)
        title = self.font.render("Zona de montagem 5×5", True, (228, 231, 238))
        self.screen.blit(title, (self.staging_rect.x + 18, self.staging_rect.y + 13))
        hint = self.small.render("Monte o quadrado; as duas linhas inferiores são apoio", True, (137, 143, 156))
        self.screen.blit(hint, (self.staging_rect.x + 18, self.staging_rect.y + 39))

        # O quadrado superior encaixa as peças para formar o objetivo. As duas
        # linhas inferiores continuam sendo uma bancada livre, sem colisões.
        grid = pygame.Rect(
            self.staging_rect.x + 12,
            self.staging_rect.y + 68,
            self.cell_size * 5,
            self.cell_size * 7,
        )
        pygame.draw.rect(self.screen, (25, 28, 35), grid)
        pygame.draw.rect(self.screen, (30, 35, 43), self.test_grid_rect)
        for column in range(6):
            x = grid.x + column * self.cell_size
            pygame.draw.line(self.screen, (51, 55, 65), (x, grid.y), (x, grid.bottom), 1)
        for row in range(8):
            y = grid.y + row * self.cell_size
            pygame.draw.line(self.screen, (51, 55, 65), (grid.x, y), (grid.right, y), 1)
        pygame.draw.rect(self.screen, (75, 80, 92), grid, width=2)
        pygame.draw.rect(self.screen, (113, 173, 160), self.test_grid_rect, width=3)

    def default_loose_positions(self) -> dict[str, Cell]:
        """Distribuição inicial sem sobreposição, usando o mesmo tamanho do tabuleiro."""
        x = self.staging_rect.x + 12
        y = self.staging_rect.y + 68
        s = self.cell_size
        row_two = y + 2 * s + 12
        row_three = row_two + 2 * s + 12
        return {
            "G": (x, y),
            "Y": (x + 3 * s + 10, y),
            "S": (x, row_two),
            "O": (x + 3 * s + 10, row_two),
            "B": (x, row_three),
            "P": (x + 2 * s + 10, row_three),
            "C": (x + 3 * s + 20, row_three),
            "R": (x + 3 * s + 20, row_three + s + 10),
        }

    def clamp_loose_position(self, piece: PieceState, position: Cell) -> Cell:
        width = (max(x for x, _ in piece.cells) + 1) * self.cell_size
        height = (max(y for _, y in piece.cells) + 1) * self.cell_size
        body = pygame.Rect(
            self.staging_rect.x + 8,
            self.staging_rect.y + 62,
            self.staging_rect.width - 16,
            self.staging_rect.height - 70,
        )
        x = max(body.left, min(position[0], body.right - width))
        y = max(body.top, min(position[1], body.bottom - height))
        return x, y

    def snap_to_test_grid(self, piece: PieceState, position: Cell) -> Cell:
        max_x = max(x for x, _ in piece.cells)
        max_y = max(y for _, y in piece.cells)
        column = round((position[0] - self.test_grid_rect.x) / self.cell_size)
        row = round((position[1] - self.test_grid_rect.y) / self.cell_size)
        column = max(0, min(4 - max_x, column))
        row = max(0, min(4 - max_y, row))
        return (
            self.test_grid_rect.x + column * self.cell_size,
            self.test_grid_rect.y + row * self.cell_size,
        )

    def _draw_board(self) -> None:
        ox, oy = self.board_origin
        size = self.cell_size * 5
        frame = pygame.Rect(ox - 26, oy - 26, size + 52, size + 52)
        pygame.draw.rect(self.screen, (8, 9, 11), frame.move(7, 9), border_radius=25)
        pygame.draw.rect(self.screen, self.PLASTIC, frame, border_radius=25)
        pygame.draw.rect(self.screen, self.PLASTIC_LIGHT, frame, width=2, border_radius=25)

        # Dobradiça superior fechada.
        hinge = pygame.Rect(ox + size // 2 - 76, oy - 38, 152, 20)
        pygame.draw.rect(self.screen, (12, 13, 16), hinge, border_radius=8)
        pygame.draw.line(self.screen, (68, 69, 73), hinge.topleft, hinge.topright, 2)

        for y in range(5):
            for x in range(5):
                well = self.cell_rect((x, y)).inflate(-8, -8)
                pygame.draw.rect(self.screen, self.WELL, well, border_radius=12)
                pygame.draw.rect(self.screen, (38, 40, 45), well, width=2, border_radius=12)

        # Trilhos moldados e apoios com entalhes, apenas visuais.
        for i in range(1, 5):
            px = ox + i * self.cell_size
            py = oy + i * self.cell_size
            pygame.draw.line(self.screen, (47, 49, 54), (px, oy + 9), (px, oy + size - 9), 5)
            pygame.draw.line(self.screen, (47, 49, 54), (ox + 9, py), (ox + size - 9, py), 5)
        for y in range(1, 5):
            for x in range(1, 5):
                cx, cy = ox + x * self.cell_size, oy + y * self.cell_size
                support = pygame.Rect(cx - 10, cy - 16, 20, 32)
                if (x + y) % 2:
                    support = pygame.Rect(cx - 16, cy - 10, 32, 20)
                pygame.draw.rect(self.screen, (61, 63, 68), support, border_radius=6)
                notch = pygame.Rect(cx - 4, cy - 4, 8, 8)
                pygame.draw.rect(self.screen, (13, 14, 17), notch, border_radius=3)

        # Cavidades escuras nas bordas, separadas das casas jogáveis.
        for side, lanes in self.board.openings.items():
            for lane in lanes:
                rect = self.entry_rect(side, lane).inflate(-12, -18)
                pygame.draw.rect(self.screen, (7, 8, 10), rect, border_radius=5)

    def entry_rect(self, side: str, lane: int) -> pygame.Rect:
        ox, oy = self.board_origin
        s = self.cell_size
        if side == "left":
            return pygame.Rect(ox - 38, oy + lane * s + 8, 42, s - 16)
        if side == "right":
            return pygame.Rect(ox + 5 * s - 4, oy + lane * s + 8, 42, s - 16)
        return pygame.Rect(ox + lane * s + 8, oy + 5 * s - 4, s - 16, 42)

    def _draw_entries(self, selected: PieceState | None) -> None:
        if selected is None or selected.anchor is not None:
            return
        for side in self.board.compatible_sides(selected):
            for lane in self.board.entry_lanes(selected, side):
                pygame.draw.rect(self.screen, (104, 194, 176), self.entry_rect(side, lane), width=3, border_radius=7)

    def _draw_world_piece(self, piece: PieceState, selected: bool, offset: Cell = (0, 0)) -> None:
        assert piece.anchor is not None
        ox, oy = self.board_origin
        ax, ay = piece.anchor
        self._draw_piece_shape(
            piece,
            (ox + ax * self.cell_size + offset[0], oy + ay * self.cell_size + offset[1]),
            self.cell_size,
            selected,
        )

    def _draw_loose_piece(self, piece: PieceState, position: Cell, selected: bool) -> None:
        self._draw_piece_shape(piece, position, self.cell_size, selected)

    @staticmethod
    def _shade(color: Color, amount: int) -> Color:
        return tuple(max(0, min(255, channel + amount)) for channel in color)  # type: ignore[return-value]

    def _draw_piece_shape(
        self,
        piece: PieceState,
        origin: Cell,
        scale: int,
        selected: bool,
    ) -> None:
        cells = piece.cells
        width = (max(x for x, _ in cells) + 1) * scale
        height = (max(y for _, y in cells) + 1) * scale
        pad = max(3, scale // 16)
        surface = pygame.Surface((width + pad * 2, height + pad * 2), pygame.SRCALPHA)
        base = piece.definition.color
        radius = max(5, scale // 7)
        for x, y in cells:
            rect = pygame.Rect(pad + x * scale - 1, pad + y * scale - 1, scale + 2, scale + 2)
            pygame.draw.rect(surface, base, rect, border_radius=radius)
        mask = pygame.mask.from_surface(surface)

        waves = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        spacing = max(7, scale // 7)
        amplitude = max(2, scale // 18)
        if piece.wave_axis == "horizontal":
            for y0 in range(spacing // 2, height + pad * 2, spacing):
                points = [(x, y0 + int(math.sin(x / max(5, scale / 5)) * amplitude)) for x in range(0, width + pad * 2, 3)]
                pygame.draw.lines(waves, self._shade(base, -38), False, [(x, y + 2) for x, y in points], 2)
                pygame.draw.lines(waves, self._shade(base, 54), False, points, 2)
        else:
            for x0 in range(spacing // 2, width + pad * 2, spacing):
                points = [(x0 + int(math.sin(y / max(5, scale / 5)) * amplitude), y) for y in range(0, height + pad * 2, 3)]
                pygame.draw.lines(waves, self._shade(base, -38), False, [(x + 2, y) for x, y in points], 2)
                pygame.draw.lines(waves, self._shade(base, 54), False, points, 2)
        waves_masked = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        waves_masked.blit(waves, (0, 0))
        clip = mask.to_surface(setcolor=(255, 255, 255, 255), unsetcolor=(255, 255, 255, 0))
        waves_masked.blit(clip, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
        surface.blit(waves_masked, (0, 0))

        outline = mask.outline()
        if len(outline) > 2:
            pygame.draw.lines(surface, self._shade(base, -65), True, outline, max(1, scale // 18))
        highlight = (255, 255, 255, 75 if selected else 38)
        pygame.draw.line(surface, highlight, (pad + 7, pad + 5), (max(pad + 7, width - 8), pad + 5), 2)

        shadow = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        pygame.draw.polygon(shadow, (0, 0, 0, 105), outline) if len(outline) > 2 else None
        self.screen.blit(shadow, (origin[0] - pad + 5, origin[1] - pad + 7))
        self.screen.blit(surface, (origin[0] - pad, origin[1] - pad))

    def piece_at(
        self,
        pos: Cell,
        pieces: dict[str, PieceState],
        loose_positions: dict[str, Cell],
    ) -> str | None:
        for key, piece in reversed(tuple(pieces.items())):
            if piece.anchor is None:
                origin = loose_positions.get(key)
                if origin:
                    for x, y in piece.cells:
                        rect = pygame.Rect(
                            origin[0] + x * self.cell_size,
                            origin[1] + y * self.cell_size,
                            self.cell_size,
                            self.cell_size,
                        )
                        if rect.collidepoint(pos):
                            return key
            else:
                if any(self.cell_rect(cell).collidepoint(pos) for cell in piece.world_cells):
                    return key
        return None

    def entry_at(self, pos: Cell, piece: PieceState) -> tuple[str, int] | None:
        for side in self.board.compatible_sides(piece):
            for lane in self.board.entry_lanes(piece, side):
                if self.entry_rect(side, lane).inflate(22, 22).collidepoint(pos):
                    return side, lane
        return None

    def entry_for_loose_piece(self, piece: PieceState, position: Cell) -> tuple[str, int] | None:
        """Encontra a abertura próxima usando a peça inteira, não só o cursor."""
        width = (max(x for x, _ in piece.cells) + 1) * self.cell_size
        height = (max(y for _, y in piece.cells) + 1) * self.cell_size
        piece_rect = pygame.Rect(position[0], position[1], width, height)
        ox, oy = self.board_origin
        board_right = ox + self.board.width * self.cell_size
        board_bottom = oy + self.board.height * self.cell_size
        tolerance = self.cell_size * 1.25
        candidates: list[tuple[float, str, int]] = []

        if piece.wave_axis == "horizontal":
            lane = round((position[1] - oy) / self.cell_size)
            if lane in self.board.entry_lanes(piece, "left"):
                distance = abs(piece_rect.right - ox)
                if distance <= tolerance:
                    candidates.append((distance, "left", lane))
            if lane in self.board.entry_lanes(piece, "right"):
                distance = abs(piece_rect.left - board_right)
                if distance <= tolerance:
                    candidates.append((distance, "right", lane))
        else:
            lane = round((position[0] - ox) / self.cell_size)
            if lane in self.board.entry_lanes(piece, "bottom"):
                distance = abs(piece_rect.top - board_bottom)
                if distance <= tolerance:
                    candidates.append((distance, "bottom", lane))

        if not candidates:
            return None
        _, side, lane = min(candidates)
        return side, lane

