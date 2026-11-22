"""Ponto de entrada do IQFlow."""

from __future__ import annotations

import pygame

from input_handler import InputHandler
from movement import GameModel
from renderer import Renderer


def main() -> None:
    pygame.init()
    pygame.display.set_caption("IQFlow")
    screen = pygame.display.set_mode((1400, 900), pygame.RESIZABLE)
    clock = pygame.time.Clock()
    model = GameModel()
    renderer = Renderer(screen, model.board)
    controls = InputHandler(model, renderer)
    running = True
    while running:
        for event in pygame.event.get():
            running = controls.handle(event)
            if not running:
                break
        renderer.draw(
            model.pieces,
            controls.selected,
            controls.drag_offset,
            controls.loose_positions,
        )
        pygame.display.flip()
        clock.tick(60)
    pygame.quit()


if __name__ == "__main__":
    main()
