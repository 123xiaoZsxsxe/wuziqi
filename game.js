(() => {
  'use strict';

  const SIZE = 15;
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const HUMAN = BLACK, AI = WHITE;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const statusText = document.getElementById('statusText');
  const turnDot = document.getElementById('turnDot');
  const moveCountEl = document.getElementById('moveCount');
  const undoBtn = document.getElementById('undo');
  const restartBtn = document.getElementById('restart');
  const modeBtns = document.querySelectorAll('.segmented button');

  let board, current, history, gameOver, winner, winLine, hover;
  let mode = 'pvp';
  let thinking = false;
  let gen = 0;
  let metrics = { size: 0, pad: 0, cell: 0 };

  /* ---------------- 棋局状态 ---------------- */

  function newGame() {
    gen++;
    board = Array.from({ length: SIZE }, () => new Uint8Array(SIZE));
    current = BLACK;
    history = [];
    gameOver = false;
    winner = 0;
    winLine = null;
    hover = null;
    thinking = false;
    updateStatus();
    draw();
  }

  function place(x, y) {
    if (board[y][x] !== EMPTY) return false;
    board[y][x] = current;
    history.push({ x, y, player: current });
    hover = null;

    const line = findWin(x, y, current);
    if (line) {
      gameOver = true;
      winner = current;
      winLine = line;
    } else if (history.length === SIZE * SIZE) {
      gameOver = true;
      winner = 0;
    } else {
      current = 3 - current;
    }
    updateStatus();
    draw();
    return true;
  }

  function findWin(x, y, player) {
    for (const [dx, dy] of DIRS) {
      const cells = [[x, y]];
      for (const sign of [1, -1]) {
        let i = 1;
        while (true) {
          const nx = x + dx * i * sign;
          const ny = y + dy * i * sign;
          if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) break;
          if (board[ny][nx] !== player) break;
          cells.push([nx, ny]);
          i++;
        }
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  function undo() {
    if (thinking || !history.length) return;
    gameOver = false;
    winner = 0;
    winLine = null;

    const last = history[history.length - 1];
    const steps = mode === 'pve' && last.player === AI ? Math.min(2, history.length) : 1;
    for (let i = 0; i < steps; i++) {
      const m = history.pop();
      board[m.y][m.x] = EMPTY;
    }
    current = history.length ? 3 - history[history.length - 1].player : BLACK;
    updateStatus();
    draw();
  }

  function updateStatus() {
    moveCountEl.textContent = `第 ${history.length} 手`;
    undoBtn.disabled = thinking || history.length === 0;

    const label = (p) => (p === BLACK ? '黑棋' : '白棋');
    if (gameOver) {
      statusText.textContent = winner ? `${label(winner)}获胜` : '平局';
      turnDot.className = 'dot ' + (winner === WHITE ? 'white' : 'black');
      return;
    }
    if (mode === 'pve' && current === AI) {
      statusText.textContent = '电脑思考中…';
    } else {
      statusText.textContent = `${label(current)}落子`;
    }
    turnDot.className = 'dot ' + (current === BLACK ? 'black' : 'white');
  }

  /* ---------------- AI ---------------- */

  function chooseMove() {
    if (history.length === 0) return [7, 7];

    const me = current;
    const opp = 3 - me;
    const candidates = getCandidates();
    let bestScore = -Infinity;
    let best = [];

    for (const [x, y] of candidates) {
      const attack = scorePoint(x, y, me);
      const defend = scorePoint(x, y, opp);
      const center = 7 - (Math.abs(x - 7) + Math.abs(y - 7)) * 0.5;
      const score = attack + defend * 0.9 + center;

      if (score > bestScore + 1e-6) {
        bestScore = score;
        best = [[x, y]];
      } else if (Math.abs(score - bestScore) <= 1e-6) {
        best.push([x, y]);
      }
    }

    if (!best.length) return [7, 7];
    return best[Math.floor(Math.random() * best.length)];
  }

  function getCandidates() {
    const seen = new Set();
    const list = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] === EMPTY) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
            if (board[ny][nx] !== EMPTY) continue;
            const key = ny * SIZE + nx;
            if (seen.has(key)) continue;
            seen.add(key);
            list.push([nx, ny]);
          }
        }
      }
    }
    return list;
  }

  // 假设在该点落子后，四个方向上的威胁总分
  function scorePoint(x, y, player) {
    board[y][x] = player;
    let total = 0;
    for (const [dx, dy] of DIRS) {
      total += evalLine(extractLine(x, y, dx, dy, player));
    }
    board[y][x] = EMPTY;
    return total;
  }

  function extractLine(x, y, dx, dy, player) {
    let s = '';
    for (let i = -4; i <= 4; i++) {
      if (i === 0) { s += '1'; continue; }
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) s += '4';
      else if (board[ny][nx] === player) s += '1';
      else if (board[ny][nx] === EMPTY) s += '0';
      else s += '4';
    }
    return s;
  }

  // 线型评分：1=己方 0=空 4=阻挡
  function evalLine(line) {
    if (line.includes('11111')) return 10000000;

    let score = 0;
    if (line.includes('011110')) score += 1000000;      // 活四

    let fours = 0, threes = 0, twos = 0, ones = 0;
    for (let i = 0; i <= 4; i++) {
      const w = line.slice(i, i + 5);
      let own = 0, empty = 0;
      for (const ch of w) {
        if (ch === '1') own++;
        else if (ch === '0') empty++;
      }
      if (own === 4 && empty === 1) fours++;
      else if (own === 3 && empty === 2) threes++;
      else if (own === 2 && empty === 3) twos++;
      else if (own === 1 && empty === 4) ones++;
    }

    if (fours) score += 100000 * fours;                  // 冲四 / 跳四

    if (threes) {
      const open = ['001110', '011100', '011010', '010110'].some((p) => line.includes(p));
      score += open ? 50000 : 5000 * threes;             // 活三 / 眠三
    }

    score += 500 * twos + 10 * ones;
    return score;
  }

  function scheduleAI() {
    if (gameOver || mode !== 'pve' || current !== AI) return;
    const token = gen;
    thinking = true;
    updateStatus();
    setTimeout(() => {
      if (token !== gen) return;
      thinking = false;
      const move = chooseMove();
      if (move) place(move[0], move[1]);
      else updateStatus();
    }, 320);
  }

  /* ---------------- 绘制 ---------------- */

  function layout() {
    const cssSize = canvas.clientWidth;
    if (!cssSize) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = cssSize * 0.055;
    metrics = { size: cssSize, pad, cell: (cssSize - pad * 2) / (SIZE - 1) };
  }

  const cx = (x) => metrics.pad + x * metrics.cell;
  const cy = (y) => metrics.pad + y * metrics.cell;

  function draw() {
    if (!metrics.size) return;
    const { size, pad, cell } = metrics;

    ctx.clearRect(0, 0, size, size);

    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#f3d9ab');
    bg.addColorStop(0.5, '#e9c288');
    bg.addColorStop(1, '#dcae72');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // 网格
    ctx.strokeStyle = 'rgba(122, 84, 42, 0.72)';
    ctx.lineWidth = Math.max(1, cell * 0.028);
    const end = pad + cell * (SIZE - 1);
    ctx.beginPath();
    for (let i = 0; i < SIZE; i++) {
      const p = pad + i * cell;
      ctx.moveTo(pad, p);
      ctx.lineTo(end, p);
      ctx.moveTo(p, pad);
      ctx.lineTo(p, end);
    }
    ctx.stroke();

    // 外框
    ctx.strokeStyle = 'rgba(96, 62, 26, 0.9)';
    ctx.lineWidth = Math.max(1.5, cell * 0.055);
    ctx.strokeRect(pad, pad, cell * (SIZE - 1), cell * (SIZE - 1));

    // 星位
    ctx.fillStyle = 'rgba(96, 62, 26, 0.85)';
    for (const [sx, sy] of [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]]) {
      ctx.beginPath();
      ctx.arc(cx(sx), cy(sy), Math.max(2, cell * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }

    // 预览落子
    if (hover && !gameOver && board[hover.y][hover.x] === EMPTY) {
      ctx.globalAlpha = 0.38;
      drawStone(cx(hover.x), cy(hover.y), current, cell * 0.42);
      ctx.globalAlpha = 1;
    }

    // 棋子
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] !== EMPTY) {
          drawStone(cx(x), cy(y), board[y][x], cell * 0.42);
        }
      }
    }

    // 最后一手标记
    const last = history[history.length - 1];
    if (last) {
      ctx.beginPath();
      ctx.arc(cx(last.x), cy(last.y), cell * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = last.player === BLACK ? 'rgba(255,255,255,.8)' : 'rgba(30,30,30,.75)';
      ctx.fill();
    }

    // 胜利连线
    if (winLine && winLine.length >= 5) {
      const a = winLine[0];
      const b = winLine[winLine.length - 1];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(232, 62, 62, 0.85)';
      ctx.lineWidth = cell * 0.13;
      ctx.shadowColor = 'rgba(232, 62, 62, 0.8)';
      ctx.shadowBlur = cell * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx(a[0]), cy(a[1]));
      ctx.lineTo(cx(b[0]), cy(b[1]));
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStone(px, py, player, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.12, px, py, r * 1.05);
    if (player === BLACK) {
      g.addColorStop(0, '#7a7f87');
      g.addColorStop(0.45, '#22262c');
      g.addColorStop(1, '#05070b');
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    } else {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, '#f2f3f5');
      g.addColorStop(1, '#c4c8ce');
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    }
    ctx.shadowBlur = r * 0.5;
    ctx.shadowOffsetY = r * 0.16;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.strokeStyle = player === BLACK ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.16)';
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.stroke();
  }

  /* ---------------- 交互 ---------------- */

  function toCell(evt) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const scale = metrics.size / rect.width;
    const px = (evt.clientX - rect.left) * scale;
    const py = (evt.clientY - rect.top) * scale;
    const x = Math.round((px - metrics.pad) / metrics.cell);
    const y = Math.round((py - metrics.pad) / metrics.cell);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    const dx = px - cx(x);
    const dy = py - cy(y);
    if (Math.hypot(dx, dy) > metrics.cell * 0.62) return null;
    return { x, y };
  }

  canvas.addEventListener('click', (evt) => {
    if (gameOver || thinking) return;
    if (mode === 'pve' && current !== HUMAN) return;
    const cellPos = toCell(evt);
    if (!cellPos) return;
    if (!place(cellPos.x, cellPos.y)) return;
    scheduleAI();
  });

  canvas.addEventListener('pointermove', (evt) => {
    if (gameOver || thinking || (mode === 'pve' && current !== HUMAN)) {
      if (hover) { hover = null; draw(); }
      return;
    }
    const p = toCell(evt);
    if (!p) {
      if (hover) { hover = null; draw(); }
      return;
    }
    if (!hover || hover.x !== p.x || hover.y !== p.y) {
      hover = p;
      draw();
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (hover) { hover = null; draw(); }
  });

  undoBtn.addEventListener('click', undo);
  restartBtn.addEventListener('click', newGame);

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === mode) return;
      mode = btn.dataset.mode;
      modeBtns.forEach((b) => b.classList.toggle('active', b === btn));
      newGame();
    });
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      layout();
      draw();
    }).observe(canvas);
  } else {
    window.addEventListener('resize', () => {
      layout();
      draw();
    });
  }

  layout();
  newGame();
})();
