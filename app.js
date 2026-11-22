(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const resetButton = document.getElementById("reset-button");
  const rotateButton = document.getElementById("rotate-button");
  const mobileRotateButton = document.getElementById("mobile-rotate-button");
  const nudgeButtons = document.querySelectorAll("[data-nudge]");
  const statusElement = document.getElementById("status");

  const BOARD_SIZE = 5;
  const RAIL_DEPTH = 4;
  const OPENINGS = {
    left: new Set([0, 1, 3, 4]),
    right: new Set([1, 2, 3]),
    bottom: new Set([0, 1, 3, 4]),
    top: new Set(),
  };

  const DEFINITIONS = [
    { id: "Y", name: "Amarela", color: "#F4DA28", cells: [[0, 0], [1, 0], [1, 1]], axis: "horizontal" },
    { id: "G", name: "Verde-turquesa", color: "#12C6B2", cells: [[0, 0], [1, 0], [2, 0], [0, 1]], axis: "horizontal" },
    { id: "C", name: "Coral", color: "#F66C58", cells: [[0, 0], [1, 0]], axis: "vertical" },
    { id: "B", name: "Azul-escura", color: "#3155BE", cells: [[0, 0], [0, 1], [1, 1], [0, 2]], axis: "vertical" },
    { id: "R", name: "Vermelha", color: "#E83260", cells: [[0, 0], [1, 0]], axis: "horizontal" },
    { id: "P", name: "Roxa", color: "#B64BAF", cells: [[0, 0], [0, 1], [0, 2]], axis: "vertical" },
    { id: "S", name: "Azul-ciano", color: "#00B9EB", cells: [[1, 0], [2, 0], [0, 1], [1, 1]], axis: "horizontal" },
    { id: "O", name: "Laranja", color: "#F58D2B", cells: [[1, 0], [0, 1], [1, 1]], axis: "horizontal" },
  ];

  const INITIAL_LOOSE_POSITIONS = {
    G: [0, 0], Y: [3, 0], S: [0, 2], O: [3, 2],
    B: [0, 4], P: [2, 4], C: [3, 4], R: [3, 5],
  };

  let pieces = [];
  let selectedId = null;
  let drag = null;
  let touchTap = null;
  let animation = null;
  let wonShown = false;
  let statusTimer = null;
  let layout = {};

  function makePieces() {
    return DEFINITIONS.map((definition) => {
      const [column, row] = INITIAL_LOOSE_POSITIONS[definition.id];
      return {
        ...definition,
        baseCells: definition.cells.map(([x, y]) => [x, y]),
        rotation: 0,
        mode: "loose",
        anchor: null,
        everInside: false,
        loose: { column, row },
        lastLoose: { column, row },
        preview: { x: 0, y: 0 },
      };
    });
  }

  function rotatedCells(piece) {
    let result = piece.baseCells.map(([x, y]) => [x, y]);
    for (let turn = 0; turn < piece.rotation % 4; turn += 1) {
      result = result.map(([x, y]) => [-y, x]);
      const minX = Math.min(...result.map(([x]) => x));
      const minY = Math.min(...result.map(([, y]) => y));
      result = result.map(([x, y]) => [x - minX, y - minY]);
    }
    return result.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }

  function waveAxis(piece) {
    if (piece.rotation % 2 === 0) return piece.axis;
    return piece.axis === "horizontal" ? "vertical" : "horizontal";
  }

  function pieceBounds(piece) {
    const cells = rotatedCells(piece);
    return {
      width: Math.max(...cells.map(([x]) => x)) + 1,
      height: Math.max(...cells.map(([, y]) => y)) + 1,
    };
  }

  function pieceById(id) {
    return pieces.find((piece) => piece.id === id) || null;
  }

  function insideBoard([x, y]) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
  }

  function worldCells(piece, anchor = piece.anchor) {
    if (!anchor) return [];
    return rotatedCells(piece).map(([x, y]) => [anchor.x + x, anchor.y + y]);
  }

  function allowedCell([x, y], axis) {
    if (insideBoard([x, y])) return true;
    if (axis === "horizontal" && x >= -RAIL_DEPTH && x < 0) return OPENINGS.left.has(y);
    if (axis === "horizontal" && x >= BOARD_SIZE && x < BOARD_SIZE + RAIL_DEPTH) return OPENINGS.right.has(y);
    if (axis === "vertical" && y >= BOARD_SIZE && y < BOARD_SIZE + RAIL_DEPTH) return OPENINGS.bottom.has(x);
    return false;
  }

  function allowedPiece(piece, anchor) {
    return worldCells(piece, anchor).every((cell) => allowedCell(cell, waveAxis(piece)));
  }

  function occupiedCells(exceptId = null) {
    const occupied = new Set();
    for (const piece of pieces) {
      if (piece.id === exceptId || piece.mode !== "board") continue;
      for (const [x, y] of worldCells(piece)) occupied.add(`${x},${y}`);
    }
    return occupied;
  }

  function spawnAnchor(piece, side, lane) {
    const cells = rotatedCells(piece);
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    let anchor = null;
    if (side === "left" && waveAxis(piece) === "horizontal") {
      anchor = { x: -1 - Math.max(...xs), y: lane };
    } else if (side === "right" && waveAxis(piece) === "horizontal") {
      anchor = { x: BOARD_SIZE - Math.min(...xs), y: lane };
    } else if (side === "bottom" && waveAxis(piece) === "vertical") {
      anchor = { x: lane, y: BOARD_SIZE - Math.min(...ys) };
    }
    if (!anchor || !allowedPiece(piece, anchor)) return null;
    if (worldCells(piece, anchor).some(insideBoard)) return null;
    return anchor;
  }

  function entryLanes(piece, side) {
    const limit = side === "bottom" ? BOARD_SIZE : BOARD_SIZE;
    const lanes = [];
    for (let lane = 0; lane < limit; lane += 1) {
      if (spawnAnchor(piece, side, lane)) lanes.push(lane);
    }
    return lanes;
  }

  function compatibleSides(piece) {
    const candidates = waveAxis(piece) === "horizontal" ? ["left", "right"] : ["bottom"];
    return candidates.filter((side) => entryLanes(piece, side).length > 0);
  }

  function canMoveOne(piece, dx, dy) {
    if (piece.mode !== "board" || !piece.anchor || animation) return false;
    const axis = waveAxis(piece);
    if (axis === "horizontal" && dy !== 0) return false;
    if (axis === "vertical" && dx !== 0) return false;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const target = { x: piece.anchor.x + dx, y: piece.anchor.y + dy };
    if (!allowedPiece(piece, target)) return false;
    const occupied = occupiedCells(piece.id);
    return worldCells(piece, target).every(([x, y]) => !occupied.has(`${x},${y}`));
  }

  function applyAnchor(piece, target) {
    piece.anchor = target;
    const cells = worldCells(piece);
    if (cells.some(insideBoard)) {
      piece.everInside = true;
    } else if (piece.everInside) {
      piece.mode = "loose";
      piece.anchor = null;
      piece.everInside = false;
      piece.preview = { x: 0, y: 0 };
      piece.loose = { ...piece.lastLoose };
      showStatus(`${piece.name} voltou para a zona de montagem.`);
    }
  }

  function moveOne(piece, dx, dy) {
    if (!canMoveOne(piece, dx, dy)) return false;
    applyAnchor(piece, { x: piece.anchor.x + dx, y: piece.anchor.y + dy });
    checkCompletion();
    return true;
  }

  function shade(hex, amount) {
    const value = Number.parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (value >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (value & 255) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function resizeCanvas() {
    const width = Math.max(320, window.innerWidth);
    const desktop = width >= 980;
    let cell;
    let height;
    let boardX;
    let boardY;
    let stagingX;
    let stagingY;

    if (desktop) {
      height = Math.max(680, window.innerHeight - document.querySelector(".topbar").offsetHeight - 44);
      cell = Math.max(52, Math.min(80, (width - 160) / 10, (height - 118) / 7));
      stagingX = width - cell * 5 - 42;
      stagingY = 20;
      boardX = Math.max(38, (stagingX - cell * 5) / 2);
      boardY = Math.max(92, (height - cell * 5) / 2);
    } else {
      cell = Math.max(44, Math.min(64, (width - 84) / 5));
      boardX = (width - cell * 5) / 2;
      boardY = 54;
      stagingX = (width - cell * 5 - 28) / 2;
      stagingY = boardY + cell * 5 + 78;
      height = stagingY + cell * 7 + 94;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    layout = {
      width,
      height,
      desktop,
      cell,
      board: { x: boardX, y: boardY, width: cell * 5, height: cell * 5 },
      staging: { x: stagingX, y: stagingY, width: cell * 5 + 28, height: cell * 7 + 82 },
      stagingGrid: { x: stagingX + 14, y: stagingY + 58, width: cell * 5, height: cell * 7 },
      testGrid: { x: stagingX + 14, y: stagingY + 58, width: cell * 5, height: cell * 5 },
    };
  }

  function entryRect(side, lane) {
    const { board, cell } = layout;
    if (side === "left") return { x: board.x - 38, y: board.y + lane * cell + 7, width: 42, height: cell - 14 };
    if (side === "right") return { x: board.x + 5 * cell - 4, y: board.y + lane * cell + 7, width: 42, height: cell - 14 };
    return { x: board.x + lane * cell + 7, y: board.y + 5 * cell - 4, width: cell - 14, height: 42 };
  }

  function drawBackground() {
    const gradient = ctx.createRadialGradient(layout.width * 0.25, 0, 20, layout.width * 0.25, 0, layout.width * 0.75);
    gradient.addColorStop(0, "#242936");
    gradient.addColorStop(1, "#15171d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  function drawBoard() {
    const { board, cell } = layout;
    const frame = { x: board.x - 26, y: board.y - 26, width: board.width + 52, height: board.height + 52 };

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.52)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    roundedRect(frame.x, frame.y, frame.width, frame.height, 24);
    ctx.fillStyle = "#181a1e";
    ctx.fill();
    ctx.restore();

    roundedRect(frame.x, frame.y, frame.width, frame.height, 24);
    ctx.fillStyle = "#202228";
    ctx.fill();
    ctx.strokeStyle = "#42454d";
    ctx.lineWidth = 2;
    ctx.stroke();

    roundedRect(board.x + board.width / 2 - 72, board.y - 39, 144, 21, 8);
    ctx.fillStyle = "#0c0d10";
    ctx.fill();
    ctx.strokeStyle = "#45484e";
    ctx.stroke();

    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        roundedRect(board.x + x * cell + 5, board.y + y * cell + 5, cell - 10, cell - 10, 12);
        ctx.fillStyle = "#0a0b0e";
        ctx.fill();
        ctx.strokeStyle = "#292c32";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "#34373e";
    ctx.lineWidth = 5;
    for (let index = 1; index < 5; index += 1) {
      const x = board.x + index * cell;
      const y = board.y + index * cell;
      ctx.beginPath();
      ctx.moveTo(x, board.y + 9);
      ctx.lineTo(x, board.y + board.height - 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(board.x + 9, y);
      ctx.lineTo(board.x + board.width - 9, y);
      ctx.stroke();
    }

    for (let y = 1; y < 5; y += 1) {
      for (let x = 1; x < 5; x += 1) {
        const centerX = board.x + x * cell;
        const centerY = board.y + y * cell;
        const horizontal = (x + y) % 2 === 1;
        const support = horizontal
          ? { x: centerX - 16, y: centerY - 10, width: 32, height: 20 }
          : { x: centerX - 10, y: centerY - 16, width: 20, height: 32 };
        roundedRect(support.x, support.y, support.width, support.height, 6);
        ctx.fillStyle = "#4a4d55";
        ctx.fill();
        roundedRect(centerX - 4, centerY - 4, 8, 8, 3);
        ctx.fillStyle = "#0d0e11";
        ctx.fill();
      }
    }

    for (const [side, lanes] of Object.entries(OPENINGS)) {
      if (side === "top") continue;
      for (const lane of lanes) {
        const rect = entryRect(side, lane);
        roundedRect(rect.x + 7, rect.y + 8, rect.width - 14, rect.height - 16, 5);
        ctx.fillStyle = "#07080a";
        ctx.fill();
      }
    }
  }

  function drawStaging() {
    const { staging, stagingGrid, testGrid, cell } = layout;
    roundedRect(staging.x, staging.y, staging.width, staging.height, 18);
    ctx.fillStyle = "#20242c";
    ctx.fill();
    ctx.strokeStyle = "#414650";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#edf0f5";
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillText("Zona de montagem 5×5", staging.x + 16, staging.y + 25);
    ctx.fillStyle = "#a4abb9";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("As duas linhas inferiores servem de apoio", staging.x + 16, staging.y + 46);

    ctx.fillStyle = "#181b21";
    ctx.fillRect(stagingGrid.x, stagingGrid.y, stagingGrid.width, stagingGrid.height);
    ctx.fillStyle = "#20262d";
    ctx.fillRect(testGrid.x, testGrid.y, testGrid.width, testGrid.height);

    ctx.strokeStyle = "#3b414b";
    ctx.lineWidth = 1;
    for (let column = 0; column <= 5; column += 1) {
      const x = stagingGrid.x + column * cell;
      ctx.beginPath();
      ctx.moveTo(x, stagingGrid.y);
      ctx.lineTo(x, stagingGrid.y + stagingGrid.height);
      ctx.stroke();
    }
    for (let row = 0; row <= 7; row += 1) {
      const y = stagingGrid.y + row * cell;
      ctx.beginPath();
      ctx.moveTo(stagingGrid.x, y);
      ctx.lineTo(stagingGrid.x + stagingGrid.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#66bba8";
    ctx.lineWidth = 3;
    ctx.strokeRect(testGrid.x, testGrid.y, testGrid.width, testGrid.height);
  }

  function drawEntryHighlights() {
    const selected = pieceById(selectedId);
    if (!selected || selected.mode !== "loose") return;
    ctx.save();
    ctx.strokeStyle = "#76d8c2";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(118, 216, 194, 0.55)";
    ctx.shadowBlur = 12;
    for (const side of compatibleSides(selected)) {
      for (const lane of entryLanes(selected, side)) {
        const rect = entryRect(side, lane);
        roundedRect(rect.x, rect.y, rect.width, rect.height, 7);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function looseOrigin(piece) {
    if (drag && drag.pieceId === piece.id && piece.mode === "loose") return drag.current;
    return {
      x: layout.stagingGrid.x + piece.loose.column * layout.cell,
      y: layout.stagingGrid.y + piece.loose.row * layout.cell,
    };
  }

  function boardOrigin(piece, timestamp) {
    let anchor = piece.anchor;
    if (animation && animation.pieceId === piece.id) {
      const progress = Math.min(1, Math.max(0, (timestamp - animation.start) / animation.duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      anchor = {
        x: animation.from.x + (animation.to.x - animation.from.x) * eased,
        y: animation.from.y + (animation.to.y - animation.from.y) * eased,
      };
    }
    return {
      x: layout.board.x + anchor.x * layout.cell + piece.preview.x,
      y: layout.board.y + anchor.y * layout.cell + piece.preview.y,
    };
  }

  function drawWaves(piece, origin, timestamp) {
    const cells = rotatedCells(piece);
    const bounds = pieceBounds(piece);
    const size = layout.cell;
    const spacing = Math.max(7, size / 7);
    const amplitude = Math.max(2, size / 18);
    const width = bounds.width * size;
    const height = bounds.height * size;
    const axis = waveAxis(piece);

    for (const [cellX, cellY] of cells) {
      ctx.save();
      roundedRect(origin.x + cellX * size - 1, origin.y + cellY * size - 1, size + 2, size + 2, size / 7);
      ctx.clip();
      ctx.lineWidth = Math.max(1.4, size / 38);
      if (axis === "horizontal") {
        for (let line = spacing / 2; line < height; line += spacing) {
          ctx.beginPath();
          for (let x = 0; x <= width; x += 3) {
            const y = line + Math.sin(x / Math.max(5, size / 5)) * amplitude;
            if (x === 0) ctx.moveTo(origin.x + x, origin.y + y + 2);
            else ctx.lineTo(origin.x + x, origin.y + y + 2);
          }
          ctx.strokeStyle = shade(piece.color, -42);
          ctx.stroke();
          ctx.beginPath();
          for (let x = 0; x <= width; x += 3) {
            const y = line + Math.sin(x / Math.max(5, size / 5)) * amplitude;
            if (x === 0) ctx.moveTo(origin.x + x, origin.y + y);
            else ctx.lineTo(origin.x + x, origin.y + y);
          }
          ctx.strokeStyle = shade(piece.color, 52);
          ctx.stroke();
        }
      } else {
        for (let line = spacing / 2; line < width; line += spacing) {
          ctx.beginPath();
          for (let y = 0; y <= height; y += 3) {
            const x = line + Math.sin(y / Math.max(5, size / 5)) * amplitude;
            if (y === 0) ctx.moveTo(origin.x + x + 2, origin.y + y);
            else ctx.lineTo(origin.x + x + 2, origin.y + y);
          }
          ctx.strokeStyle = shade(piece.color, -42);
          ctx.stroke();
          ctx.beginPath();
          for (let y = 0; y <= height; y += 3) {
            const x = line + Math.sin(y / Math.max(5, size / 5)) * amplitude;
            if (y === 0) ctx.moveTo(origin.x + x, origin.y + y);
            else ctx.lineTo(origin.x + x, origin.y + y);
          }
          ctx.strokeStyle = shade(piece.color, 52);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function drawPiece(piece, origin, timestamp) {
    const size = layout.cell;
    const selected = piece.id === selectedId;
    const cells = rotatedCells(piece);

    ctx.save();
    if (selected) {
      ctx.shadowColor = "rgba(238, 242, 250, 0.65)";
      ctx.shadowBlur = 17;
    } else {
      ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;
    }
    for (const [x, y] of cells) {
      roundedRect(origin.x + x * size - 1, origin.y + y * size - 1, size + 2, size + 2, size / 7);
      ctx.fillStyle = piece.color;
      ctx.fill();
    }
    ctx.restore();

    drawWaves(piece, origin, timestamp);

    const bounds = pieceBounds(piece);
    const sheen = ctx.createLinearGradient(origin.x, origin.y, origin.x, origin.y + bounds.height * size);
    sheen.addColorStop(0, "rgba(255,255,255,0.18)");
    sheen.addColorStop(0.4, "rgba(255,255,255,0.02)");
    sheen.addColorStop(1, "rgba(0,0,0,0.12)");
    for (const [x, y] of cells) {
      roundedRect(origin.x + x * size, origin.y + y * size, size, size, size / 7);
      ctx.fillStyle = sheen;
      ctx.fill();
    }
  }

  function drawPieces(timestamp) {
    const ordered = pieces.filter((piece) => piece.id !== selectedId);
    const selected = pieceById(selectedId);
    if (selected) ordered.push(selected);
    for (const piece of ordered) {
      const origin = piece.mode === "loose" ? looseOrigin(piece) : boardOrigin(piece, timestamp);
      drawPiece(piece, origin, timestamp);
    }
  }

  function draw(timestamp) {
    drawBackground();
    drawBoard();
    drawStaging();
    drawEntryHighlights();
    drawPieces(timestamp);
  }

  function pointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function pointerPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (layout.width / rect.width),
      y: (event.clientY - rect.top) * (layout.height / rect.height),
    };
  }

  function renderOrigin(piece, timestamp = performance.now()) {
    return piece.mode === "loose" ? looseOrigin(piece) : boardOrigin(piece, timestamp);
  }

  function pieceAt(point) {
    const ordered = [...pieces];
    if (selectedId) {
      const selected = pieceById(selectedId);
      if (selected) ordered.push(...ordered.splice(ordered.indexOf(selected), 1));
    }
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      const piece = ordered[index];
      const origin = renderOrigin(piece);
      for (const [x, y] of rotatedCells(piece)) {
        const rect = {
          x: origin.x + x * layout.cell,
          y: origin.y + y * layout.cell,
          width: layout.cell,
          height: layout.cell,
        };
        if (pointInRect(point, rect)) return piece;
      }
    }
    return null;
  }

  function entryForLoosePiece(piece, origin) {
    const bounds = pieceBounds(piece);
    const pieceRect = {
      x: origin.x,
      y: origin.y,
      width: bounds.width * layout.cell,
      height: bounds.height * layout.cell,
    };
    const candidates = [];
    const tolerance = layout.cell * 1.25;
    if (waveAxis(piece) === "horizontal") {
      const lane = Math.round((origin.y - layout.board.y) / layout.cell);
      if (entryLanes(piece, "left").includes(lane)) {
        const distance = Math.abs(pieceRect.x + pieceRect.width - layout.board.x);
        if (distance <= tolerance) candidates.push({ distance, side: "left", lane });
      }
      if (entryLanes(piece, "right").includes(lane)) {
        const distance = Math.abs(pieceRect.x - (layout.board.x + layout.board.width));
        if (distance <= tolerance) candidates.push({ distance, side: "right", lane });
      }
    } else {
      const lane = Math.round((origin.x - layout.board.x) / layout.cell);
      if (entryLanes(piece, "bottom").includes(lane)) {
        const distance = Math.abs(pieceRect.y - (layout.board.y + layout.board.height));
        if (distance <= tolerance) candidates.push({ distance, side: "bottom", lane });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0] || null;
  }

  function entryAtPoint(piece, point) {
    const padding = Math.max(10, layout.cell * 0.18);
    const candidates = [];
    for (const side of compatibleSides(piece)) {
      for (const lane of entryLanes(piece, side)) {
        const rect = entryRect(side, lane);
        const target = {
          x: rect.x - padding,
          y: rect.y - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        };
        if (pointInRect(point, target)) candidates.push({ side, lane });
      }
    }
    return candidates[0] || null;
  }

  function placeSelectedInStaging(piece, point) {
    if (!pointInRect(point, layout.stagingGrid)) return false;
    const bounds = pieceBounds(piece);
    let column = (point.x - layout.stagingGrid.x) / layout.cell - bounds.width / 2;
    let row = (point.y - layout.stagingGrid.y) / layout.cell - bounds.height / 2;
    if (pointInRect(point, layout.testGrid)) {
      column = Math.round(column);
      row = Math.round(row);
      piece.loose = clampLoose(piece, column, row, 5);
    } else {
      piece.loose = clampLoose(piece, column, row, 7);
    }
    piece.lastLoose = { ...piece.loose };
    showStatus(`${piece.name} posicionada na zona de montagem.`);
    return true;
  }

  function clampLoose(piece, column, row, rows = 7) {
    const bounds = pieceBounds(piece);
    return {
      column: Math.max(0, Math.min(5 - bounds.width, column)),
      row: Math.max(0, Math.min(rows - bounds.height, row)),
    };
  }

  function dropInStaging(piece, point, origin) {
    if (!pointInRect(point, layout.staging)) return false;
    let column = (origin.x - layout.stagingGrid.x) / layout.cell;
    let row = (origin.y - layout.stagingGrid.y) / layout.cell;
    if (pointInRect(point, layout.testGrid)) {
      column = Math.round(column);
      row = Math.round(row);
      piece.loose = clampLoose(piece, column, row, 5);
    } else {
      piece.loose = clampLoose(piece, column, row, 7);
    }
    piece.lastLoose = { ...piece.loose };
    return true;
  }

  function rotateSelected() {
    const piece = pieceById(selectedId);
    if (!piece) {
      showStatus("Selecione uma peça primeiro.");
      return;
    }
    if (piece.mode !== "loose") {
      showStatus("A peça só pode girar fora do tabuleiro.");
      return;
    }
    if (drag || animation) {
      showStatus("Solte a peça antes de girar.");
      return;
    }
    piece.rotation = (piece.rotation + 1) % 4;
    const rows = piece.loose.row < 5 ? 5 : 7;
    piece.loose = clampLoose(piece, piece.loose.column, piece.loose.row, rows);
    piece.lastLoose = { ...piece.loose };
  }

  function beginInsertion(piece, entry) {
    const anchor = spawnAnchor(piece, entry.side, entry.lane);
    if (!anchor) {
      showStatus("Essa entrada não aceita a peça nessa orientação.");
      return;
    }
    const occupied = occupiedCells(piece.id);
    if (worldCells(piece, anchor).some(([x, y]) => occupied.has(`${x},${y}`))) {
      showStatus("A entrada está bloqueada.");
      return;
    }
    piece.mode = "board";
    piece.anchor = anchor;
    piece.everInside = false;
    piece.preview = { x: 0, y: 0 };
    drag = null;
    const direction = entry.side === "left"
      ? { x: 1, y: 0 }
      : entry.side === "right"
        ? { x: -1, y: 0 }
        : { x: 0, y: -1 };
    animateInsertionStep(piece, direction);
  }

  function animateInsertionStep(piece, direction) {
    if (piece.mode !== "board") return;
    if (worldCells(piece).every(insideBoard)) {
      checkCompletion();
      return;
    }
    if (!canMoveOneWithoutAnimation(piece, direction.x, direction.y)) {
      if (!worldCells(piece).some(insideBoard)) {
        piece.mode = "loose";
        piece.anchor = null;
        piece.everInside = false;
        piece.loose = { ...piece.lastLoose };
        showStatus("A peça não conseguiu atravessar essa entrada.");
      }
      return;
    }
    animation = {
      pieceId: piece.id,
      from: { ...piece.anchor },
      to: { x: piece.anchor.x + direction.x, y: piece.anchor.y + direction.y },
      direction,
      start: performance.now(),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 95,
    };
  }

  function canMoveOneWithoutAnimation(piece, dx, dy) {
    const currentAnimation = animation;
    animation = null;
    const result = canMoveOne(piece, dx, dy);
    animation = currentAnimation;
    return result;
  }

  function updateAnimation(timestamp) {
    if (!animation) return;
    const progress = (timestamp - animation.start) / animation.duration;
    if (progress < 1) return;
    const finished = animation;
    const piece = pieceById(finished.pieceId);
    animation = null;
    if (!piece) return;
    applyAnchor(piece, finished.to);
    animateInsertionStep(piece, finished.direction);
  }

  function updateBoardDrag(piece, point) {
    if (!drag || !piece.anchor) return;
    const horizontal = waveAxis(piece) === "horizontal";
    const axis = horizontal ? "x" : "y";
    let delta = point[axis] - drag.reference[axis];
    while (Math.abs(delta) >= layout.cell && piece.mode === "board") {
      const direction = delta > 0 ? 1 : -1;
      const moved = horizontal ? moveOne(piece, direction, 0) : moveOne(piece, 0, direction);
      if (!moved) break;
      drag.reference[axis] += direction * layout.cell;
      delta = point[axis] - drag.reference[axis];
    }
    if (piece.mode !== "board" || delta === 0) {
      piece.preview = { x: 0, y: 0 };
      return;
    }
    const direction = delta > 0 ? 1 : -1;
    const valid = horizontal
      ? canMoveOne(piece, direction, 0)
      : canMoveOne(piece, 0, direction);
    const limited = Math.max(-layout.cell + 1, Math.min(layout.cell - 1, delta));
    piece.preview = valid
      ? horizontal ? { x: limited, y: 0 } : { x: 0, y: limited }
      : { x: 0, y: 0 };
  }

  function finishBoardDrag(piece) {
    const { x, y } = piece.preview;
    if (waveAxis(piece) === "horizontal" && Math.abs(x) >= layout.cell / 2) {
      moveOne(piece, x > 0 ? 1 : -1, 0);
    } else if (waveAxis(piece) === "vertical" && Math.abs(y) >= layout.cell / 2) {
      moveOne(piece, 0, y > 0 ? 1 : -1);
    }
    piece.preview = { x: 0, y: 0 };
  }

  function checkCompletion() {
    const boardPieces = pieces.filter((piece) => piece.mode === "board");
    const cells = boardPieces.flatMap((piece) => worldCells(piece));
    const keys = new Set(cells.filter(insideBoard).map(([x, y]) => `${x},${y}`));
    const complete = boardPieces.length === pieces.length
      && cells.every(insideBoard)
      && keys.size === 25;
    if (complete && !wonShown) {
      wonShown = true;
      showStatus("Quadrado completo! Todas as 25 posições foram preenchidas.", 4200);
    } else if (!complete) {
      wonShown = false;
    }
  }

  function showStatus(message, duration = 2400) {
    statusElement.textContent = message;
    statusElement.classList.add("visible");
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => statusElement.classList.remove("visible"), duration);
  }

  function resetGame() {
    pieces = makePieces();
    selectedId = null;
    drag = null;
    touchTap = null;
    animation = null;
    wonShown = false;
    showStatus("As peças voltaram para a zona de montagem.");
  }

  function moveSelectedByControl(dx, dy) {
    const piece = pieceById(selectedId);
    if (!piece) {
      showStatus("Selecione uma peça primeiro.");
      return;
    }
    if (animation) return;

    if (piece.mode === "loose") {
      const target = clampLoose(piece, piece.loose.column + dx, piece.loose.row + dy, 7);
      const changed = target.column !== piece.loose.column || target.row !== piece.loose.row;
      piece.loose = target;
      piece.lastLoose = { ...target };
      if (!changed) showStatus("A peça chegou ao limite da zona de montagem.");
      return;
    }

    if (!moveOne(piece, dx, dy)) showStatus("A peça não pode se mover nessa direção.");
  }

  function handleTouchTap(point) {
    const piece = pieceAt(point);
    if (piece) {
      selectedId = piece.id;
      const instruction = piece.mode === "loose"
        ? "Use os controles fixos para mover ou role até uma entrada destacada."
        : "Use os controles fixos para deslizar a peça.";
      showStatus(`${piece.name} selecionada. ${instruction}`);
      return;
    }

    const selected = pieceById(selectedId);
    if (!selected) return;
    if (selected.mode === "loose") {
      const entry = entryAtPoint(selected, point);
      if (entry) beginInsertion(selected, entry);
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (animation) return;
    const point = pointerPoint(event);
    if (event.pointerType === "touch") {
      touchTap = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      return;
    }
    const piece = pieceAt(point);
    if (!piece) {
      const selected = pieceById(selectedId);
      if (selected && selected.mode === "loose") {
        const entry = entryAtPoint(selected, point);
        if (entry) {
          beginInsertion(selected, entry);
          return;
        }
        if (placeSelectedInStaging(selected, point)) return;
      }
      if (layout.desktop) selectedId = null;
      return;
    }
    selectedId = piece.id;
    canvas.focus({ preventScroll: true });
    if (event.button === 2) {
      rotateSelected();
      return;
    }
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const origin = renderOrigin(piece);
    drag = {
      pieceId: piece.id,
      pointerId: event.pointerId,
      mode: piece.mode,
      current: { ...origin },
      originalLoose: { ...piece.loose },
      grab: { x: point.x - origin.x, y: point.y - origin.y },
      reference: { ...point },
    };
  });

  canvas.addEventListener("pointermove", (event) => {
    if (touchTap && touchTap.pointerId === event.pointerId) {
      const distance = Math.hypot(event.clientX - touchTap.x, event.clientY - touchTap.y);
      if (distance > 10) touchTap.moved = true;
      return;
    }
    if (!drag || drag.pointerId !== event.pointerId || animation) return;
    const piece = pieceById(drag.pieceId);
    if (!piece) return;
    const point = pointerPoint(event);
    if (drag.mode === "loose" && piece.mode === "loose") {
      drag.current = { x: point.x - drag.grab.x, y: point.y - drag.grab.y };
    } else if (piece.mode === "board") {
      updateBoardDrag(piece, point);
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    if (touchTap && touchTap.pointerId === event.pointerId) {
      const tap = touchTap;
      touchTap = null;
      if (!tap.moved && !animation) handleTouchTap(pointerPoint(event));
      return;
    }
    if (!drag || drag.pointerId !== event.pointerId) return;
    const piece = pieceById(drag.pieceId);
    const point = pointerPoint(event);
    if (piece && drag.mode === "loose" && piece.mode === "loose") {
      const entry = entryForLoosePiece(piece, drag.current);
      if (entry) {
        beginInsertion(piece, entry);
      } else if (!dropInStaging(piece, point, drag.current)) {
        piece.loose = { ...drag.originalLoose };
        piece.lastLoose = { ...piece.loose };
        drag = null;
      } else {
        drag = null;
      }
    } else if (piece && piece.mode === "board") {
      finishBoardDrag(piece);
      drag = null;
    } else {
      drag = null;
    }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointercancel", (event) => {
    if (touchTap && touchTap.pointerId === event.pointerId) touchTap = null;
    const piece = drag ? pieceById(drag.pieceId) : null;
    if (piece && drag.mode === "loose") piece.loose = { ...drag.originalLoose };
    if (piece) piece.preview = { x: 0, y: 0 };
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("keydown", (event) => {
    const piece = pieceById(selectedId);
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      rotateSelected();
      return;
    }
    if (!piece) return;
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (directions[event.key]) {
      event.preventDefault();
      moveSelectedByControl(...directions[event.key]);
    }
  });

  resetButton.addEventListener("click", resetGame);
  rotateButton.addEventListener("click", rotateSelected);
  mobileRotateButton.addEventListener("click", rotateSelected);
  nudgeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const directions = {
        left: [-1, 0],
        right: [1, 0],
        up: [0, -1],
        down: [0, 1],
      };
      moveSelectedByControl(...directions[button.dataset.nudge]);
    });
  });
  window.addEventListener("resize", resizeCanvas);

  function frame(timestamp) {
    updateAnimation(timestamp);
    draw(timestamp);
    window.requestAnimationFrame(frame);
  }

  pieces = makePieces();
  resizeCanvas();
  window.requestAnimationFrame(frame);
})();
