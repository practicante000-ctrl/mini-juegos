// ==========================
// 🎮 Referencias base
// ==========================
const btnXO = document.getElementById("btn-xo");
const btnSnake = document.getElementById("btn-snake");
const btnProx = document.getElementById("btn-prox");

// nuevos juegos
const btnRPS = document.getElementById("btn-rps");
const btnNum = document.getElementById("btn-num");
const btnMemo = document.getElementById("btn-memo");

const gameTitle = document.getElementById("game-title");
const gameScreen = document.getElementById("game-screen");

// ==========================
// ✅ Menú PRO (activo)
// ==========================
const menuButtons = [btnXO, btnSnake, btnRPS, btnNum, btnMemo, btnProx];

function setActiveButton(activeBtn) {
  menuButtons.forEach((b) => b.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

// ==========================
// 🔊 Sonidos (sin archivos)
// ==========================
let audioCtx = null;

function beep(frequency = 440, duration = 0.08, type = "sine") {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = 0.08;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ==========================
// 💾 Storage helpers
// ==========================
function loadNumber(key, fallback = 0) {
  const v = localStorage.getItem(key);
  return v === null ? fallback : Number(v);
}

function saveNumber(key, value) {
  localStorage.setItem(key, String(value));
}

// ==========================
// ✅ XO (Tres en raya) + STATS
// ==========================
let tablero = Array(9).fill("");
let turno = "X";
let juegoTerminado = false;
let mensaje = "";

// stats XO
let xoWinsX = loadNumber("xoWinsX", 0);
let xoWinsO = loadNumber("xoWinsO", 0);
let xoDraws = loadNumber("xoDraws", 0);

function renderXO() {
  gameTitle.textContent = "❌⭕ XO (Tres en raya)";

  gameScreen.innerHTML = `
    <div class="xo-container">
      <div class="stats">
        <span>❌ X: <b id="xo-wx">${xoWinsX}</b></span>
        <span>⭕ O: <b id="xo-wo">${xoWinsO}</b></span>
        <span>🤝 Empates: <b id="xo-d">${xoDraws}</b></span>
      </div>

      <p class="xo-turno">Turno: <b>${turno}</b></p>

      <div class="xo-board">
        ${tablero
          .map(
            (celda, i) =>
              `<button class="xo-cell" data-index="${i}">${celda}</button>`
          )
          .join("")}
      </div>

      <p class="xo-mensaje">${mensaje}</p>

      <div style="display:flex; gap:10px;">
        <button class="xo-reset" id="xo-reset">🔄 Reiniciar</button>
        <button class="xo-reset" id="xo-reset-stats">🧹 Reset Stats</button>
      </div>
    </div>
  `;

  document.querySelectorAll(".xo-cell").forEach((btn) => {
    btn.addEventListener("click", manejarClickXO);
  });

  document.getElementById("xo-reset").addEventListener("click", resetXO);

  document.getElementById("xo-reset-stats").addEventListener("click", () => {
    xoWinsX = 0;
    xoWinsO = 0;
    xoDraws = 0;
    saveNumber("xoWinsX", xoWinsX);
    saveNumber("xoWinsO", xoWinsO);
    saveNumber("xoDraws", xoDraws);
    renderXO();
  });
}

function manejarClickXO(e) {
  const index = e.target.dataset.index;

  if (juegoTerminado) return;
  if (tablero[index] !== "") return;

  tablero[index] = turno;

  verificarGanador();

  if (!juegoTerminado) {
    turno = turno === "X" ? "O" : "X";
    mensaje = "";
  }

  renderXO();
}

function verificarGanador() {
  const combos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let [a, b, c] of combos) {
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
      juegoTerminado = true;

      if (tablero[a] === "X") {
        xoWinsX++;
        saveNumber("xoWinsX", xoWinsX);
      } else {
        xoWinsO++;
        saveNumber("xoWinsO", xoWinsO);
      }

      mensaje = `🏆 ¡Ganó ${tablero[a]}!`;
      return;
    }
  }

  if (!tablero.includes("")) {
    juegoTerminado = true;
    xoDraws++;
    saveNumber("xoDraws", xoDraws);
    mensaje = "🤝 ¡Empate!";
  }
}

function resetXO() {
  tablero = Array(9).fill("");
  turno = "X";
  juegoTerminado = false;
  mensaje = "";
  renderXO();
}

// ==========================
// 🐍 SNAKE (Culebrita) + STATS
// ==========================
let snakeInterval = null;
let direccion = "RIGHT";
let direccionPendiente = "RIGHT";

let snake = [];
let comida = { x: 5, y: 5 };
let score = 0;
let highScore = loadNumber("snakeHighScore", 0);
let gameOver = false;

let velocidad = 200;
let pausado = false;

const gridSize = 20;
const tileCount = 20;

let snakeGamesPlayed = loadNumber("snakeGamesPlayed", 0);
let snakeTotalApples = loadNumber("snakeTotalApples", 0);

function guardarHighScore() {
  saveNumber("snakeHighScore", highScore);
}

function mostrarSnake() {
  gameTitle.textContent = "🐍 Culebrita";

  gameScreen.innerHTML = `
    <div class="snake-container">
      <div class="stats">
        <span>🎮 Partidas: <b id="snake-g">${snakeGamesPlayed}</b></span>
        <span>🍎 Total: <b id="snake-a">${snakeTotalApples}</b></span>
        <span>🏆 Récord: <b id="snake-high">${highScore}</b></span>
      </div>

      <p class="placeholder">Flechas / WASD | Pausa: SPACE</p>
      <p class="placeholder">Puntos: <b id="snake-score">0</b></p>

      <canvas id="snake-canvas" width="400" height="400"></canvas>

      <p id="snake-msg" class="xo-mensaje"></p>

      <div style="display:flex; gap:10px;">
        <button class="xo-reset" id="snake-reset">🔄 Reiniciar</button>
        <button class="xo-reset" id="snake-reset-stats">🧹 Reset Stats</button>
      </div>
    </div>
  `;

  document.getElementById("snake-reset").addEventListener("click", iniciarSnake);

  document.getElementById("snake-reset-stats").addEventListener("click", () => {
    snakeGamesPlayed = 0;
    snakeTotalApples = 0;
    highScore = 0;
    saveNumber("snakeGamesPlayed", snakeGamesPlayed);
    saveNumber("snakeTotalApples", snakeTotalApples);
    saveNumber("snakeHighScore", highScore);
    mostrarSnake();
  });

  iniciarSnake();
}

function iniciarSnake() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];

  direccion = "RIGHT";
  direccionPendiente = "RIGHT";

  score = 0;
  gameOver = false;
  pausado = false;
  velocidad = 200;

  snakeGamesPlayed++;
  saveNumber("snakeGamesPlayed", snakeGamesPlayed);

  actualizarScoreSnake();
  actualizarMensajeSnake("");

  generarComida();

  const canvas = document.getElementById("snake-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    dibujarSnake(ctx);
  }

  if (snakeInterval) clearInterval(snakeInterval);
  snakeInterval = setInterval(actualizarSnake, velocidad);
}

function actualizarScoreSnake() {
  const scoreEl = document.getElementById("snake-score");
  if (scoreEl) scoreEl.textContent = score;

  const highEl = document.getElementById("snake-high");
  if (highEl) highEl.textContent = highScore;

  const gEl = document.getElementById("snake-g");
  if (gEl) gEl.textContent = snakeGamesPlayed;

  const aEl = document.getElementById("snake-a");
  if (aEl) aEl.textContent = snakeTotalApples;
}

function actualizarMensajeSnake(texto) {
  const msgEl = document.getElementById("snake-msg");
  if (msgEl) msgEl.textContent = texto;
}

function generarComida() {
  comida = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
  };

  for (let parte of snake) {
    if (parte.x === comida.x && parte.y === comida.y) {
      generarComida();
      return;
    }
  }
}

function actualizarSnake() {
  if (gameOver || pausado) return;

  const canvas = document.getElementById("snake-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  direccion = direccionPendiente;

  const cabeza = { ...snake[0] };

  if (direccion === "RIGHT") cabeza.x++;
  if (direccion === "LEFT") cabeza.x--;
  if (direccion === "UP") cabeza.y--;
  if (direccion === "DOWN") cabeza.y++;

  if (
    cabeza.x < 0 ||
    cabeza.x >= tileCount ||
    cabeza.y < 0 ||
    cabeza.y >= tileCount
  ) {
    perderSnake();
    return;
  }

  snake.unshift(cabeza);

  const comio = cabeza.x === comida.x && cabeza.y === comida.y;

  if (comio) {
    score++;
    snakeTotalApples++;
    saveNumber("snakeTotalApples", snakeTotalApples);

    beep(700, 0.06, "square");
    generarComida();

    if (score > highScore) {
      highScore = score;
      guardarHighScore();
    }

    if (score % 3 === 0 && velocidad > 60) {
      velocidad -= 15;
      clearInterval(snakeInterval);
      snakeInterval = setInterval(actualizarSnake, velocidad);
    }
  } else {
    snake.pop();
  }

  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === cabeza.x && snake[i].y === cabeza.y) {
      perderSnake();
      return;
    }
  }

  actualizarScoreSnake();
  dibujarSnake(ctx);
}

function perderSnake() {
  gameOver = true;
  pausado = false;

  beep(200, 0.12, "sawtooth");
  actualizarMensajeSnake("💥 ¡Perdiste! Presiona Reiniciar 🔄");

  if (snakeInterval) {
    clearInterval(snakeInterval);
    snakeInterval = null;
  }
}

function dibujarSnake(ctx) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "red";
  ctx.fillRect(
    comida.x * gridSize,
    comida.y * gridSize,
    gridSize - 2,
    gridSize - 2
  );

  for (let i = 1; i < snake.length; i++) {
    const parte = snake[i];
    ctx.fillStyle = "lime";
    ctx.fillRect(
      parte.x * gridSize,
      parte.y * gridSize,
      gridSize - 2,
      gridSize - 2
    );
  }

  dibujarCabezaTriangular(ctx);
}

function dibujarCabezaTriangular(ctx) {
  const cabeza = snake[0];
  if (!cabeza) return;

  const x = cabeza.x * gridSize;
  const y = cabeza.y * gridSize;

  ctx.fillStyle = "#00ff88";
  ctx.beginPath();

  if (direccion === "RIGHT") {
    ctx.moveTo(x + gridSize - 2, y + gridSize / 2);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + 1, y + gridSize - 1);
  } else if (direccion === "LEFT") {
    ctx.moveTo(x + 1, y + gridSize / 2);
    ctx.lineTo(x + gridSize - 1, y + 1);
    ctx.lineTo(x + gridSize - 1, y + gridSize - 1);
  } else if (direccion === "UP") {
    ctx.moveTo(x + gridSize / 2, y + 1);
    ctx.lineTo(x + 1, y + gridSize - 1);
    ctx.lineTo(x + gridSize - 1, y + gridSize - 1);
  } else if (direccion === "DOWN") {
    ctx.moveTo(x + gridSize / 2, y + gridSize - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + gridSize - 1, y + 1);
  }

  ctx.closePath();
  ctx.fill();
}

// ==========================
// ✊✋✌️ PIEDRA PAPEL TIJERA (COMPLETO)
// ==========================
let rpsWins = loadNumber("rpsWins", 0);
let rpsLosses = loadNumber("rpsLosses", 0);
let rpsDraws = loadNumber("rpsDraws", 0);

function mostrarRPS() {
  gameTitle.textContent = "✊✋✌️ Piedra, Papel o Tijera";

  gameScreen.innerHTML = `
    <div class="xo-container">
      <div class="stats">
        <span>✅ Ganadas: <b id="rps-w">${rpsWins}</b></span>
        <span>❌ Perdidas: <b id="rps-l">${rpsLosses}</b></span>
        <span>🤝 Empates: <b id="rps-d">${rpsDraws}</b></span>
      </div>

      <p class="placeholder">Elige una opción:</p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
        <button class="xo-reset" id="rps-rock">✊ Piedra</button>
        <button class="xo-reset" id="rps-paper">✋ Papel</button>
        <button class="xo-reset" id="rps-scissors">✌️ Tijera</button>
      </div>

      <p id="rps-result" class="xo-mensaje"></p>

      <button class="xo-reset" id="rps-reset">🧹 Reset Marcador</button>
    </div>
  `;

  document.getElementById("rps-rock").addEventListener("click", () => jugarRPS("piedra"));
  document.getElementById("rps-paper").addEventListener("click", () => jugarRPS("papel"));
  document.getElementById("rps-scissors").addEventListener("click", () => jugarRPS("tijera"));

  document.getElementById("rps-reset").addEventListener("click", () => {
    rpsWins = 0;
    rpsLosses = 0;
    rpsDraws = 0;
    saveNumber("rpsWins", rpsWins);
    saveNumber("rpsLosses", rpsLosses);
    saveNumber("rpsDraws", rpsDraws);
    mostrarRPS();
  });
}

function jugarRPS(jugador) {
  const opciones = ["piedra", "papel", "tijera"];
  const cpu = opciones[Math.floor(Math.random() * 3)];

  let resultado = "🤝 Empate";
  if (
    (jugador === "piedra" && cpu === "tijera") ||
    (jugador === "papel" && cpu === "piedra") ||
    (jugador === "tijera" && cpu === "papel")
  ) {
    resultado = "✅ Ganaste";
    rpsWins++;
    beep(700, 0.06, "square");
  } else if (jugador !== cpu) {
    resultado = "❌ Perdiste";
    rpsLosses++;
    beep(200, 0.12, "sawtooth");
  } else {
    rpsDraws++;
    beep(500, 0.06, "triangle");
  }

  saveNumber("rpsWins", rpsWins);
  saveNumber("rpsLosses", rpsLosses);
  saveNumber("rpsDraws", rpsDraws);

  document.getElementById("rps-result").textContent = `Tú: ${jugador} | CPU: ${cpu} → ${resultado}`;
  mostrarRPSStats();
}

function mostrarRPSStats() {
  const w = document.getElementById("rps-w");
  const l = document.getElementById("rps-l");
  const d = document.getElementById("rps-d");
  if (w) w.textContent = rpsWins;
  if (l) l.textContent = rpsLosses;
  if (d) d.textContent = rpsDraws;
}

// ==========================
// 🔢 ADIVINA EL NÚMERO (COMPLETO)
// ==========================
function getBestKey(range) {
  return `guessBest_${range}`;
}

function mostrarAdivinaNumero() {
  gameTitle.textContent = "🔢 Adivina el número";

  gameScreen.innerHTML = `
    <div class="xo-container" style="max-width:500px;">
      <div class="stats">
        <span>Mejor (1-10): <b id="best10">${mostrarBest(10)}</b></span>
        <span>Mejor (1-50): <b id="best50">${mostrarBest(50)}</b></span>
        <span>Mejor (1-100): <b id="best100">${mostrarBest(100)}</b></span>
      </div>

      <p class="placeholder">Elige dificultad:</p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
        <button class="xo-reset" id="diff10">1 - 10</button>
        <button class="xo-reset" id="diff50">1 - 50</button>
        <button class="xo-reset" id="diff100">1 - 100</button>
      </div>

      <div id="guess-area"></div>
    </div>
  `;

  document.getElementById("diff10").addEventListener("click", () => iniciarAdivina(10));
  document.getElementById("diff50").addEventListener("click", () => iniciarAdivina(50));
  document.getElementById("diff100").addEventListener("click", () => iniciarAdivina(100));
}

function mostrarBest(range) {
  const best = loadNumber(getBestKey(range), 0);
  return best === 0 ? "-" : best;
}

let guessTarget = null;
let guessRange = 10;
let guessTries = 0;

function iniciarAdivina(range) {
  guessRange = range;
  guessTarget = Math.floor(Math.random() * range) + 1;
  guessTries = 0;

  const area = document.getElementById("guess-area");
  area.innerHTML = `
    <p class="placeholder">Adivina un número entre <b>1</b> y <b>${range}</b></p>

    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
      <input id="guess-input" type="number" min="1" max="${range}"
        style="padding:12px; border-radius:10px; border:2px solid #333; background:#111; color:white; width:160px;" />
      <button class="xo-reset" id="guess-btn">Probar</button>
    </div>

    <p id="guess-msg" class="xo-mensaje"></p>
    <p class="placeholder">Intentos: <b id="guess-tries">0</b></p>
  `;

  document.getElementById("guess-btn").addEventListener("click", intentarAdivina);
}

function intentarAdivina() {
  const input = document.getElementById("guess-input");
  const msg = document.getElementById("guess-msg");
  const triesEl = document.getElementById("guess-tries");

  const val = Number(input.value);

  if (!val || val < 1 || val > guessRange) {
    msg.textContent = `❗ Pon un número válido (1 - ${guessRange})`;
    beep(250, 0.06, "sawtooth");
    return;
  }

  guessTries++;
  triesEl.textContent = guessTries;

  if (val === guessTarget) {
    msg.textContent = `🎉 ¡Correcto! Era ${guessTarget}. Lo lograste en ${guessTries} intentos`;
    beep(800, 0.08, "square");

    const key = getBestKey(guessRange);
    const best = loadNumber(key, 0);

    if (best === 0 || guessTries < best) {
      saveNumber(key, guessTries);
      msg.textContent += " 🏆 ¡Nuevo récord!";
    }

    // refrescar los récords arriba
    const b10 = document.getElementById("best10");
    const b50 = document.getElementById("best50");
    const b100 = document.getElementById("best100");
    if (b10) b10.textContent = mostrarBest(10);
    if (b50) b50.textContent = mostrarBest(50);
    if (b100) b100.textContent = mostrarBest(100);

    return;
  }

  if (val < guessTarget) {
    msg.textContent = "📈 Más alto";
    beep(500, 0.05, "triangle");
  } else {
    msg.textContent = "📉 Más bajo";
    beep(500, 0.05, "triangle");
  }
}

// ==========================
// 🧠 MEMORIA (COMPLETO)
// ==========================
let memCards = [];
let memFlipped = [];
let memLocked = false;
let memMoves = 0;
let memBest = loadNumber("memBestMoves", 0);

function mostrarMemoria() {
  gameTitle.textContent = "🧠 Memoria";

  iniciarMemoria();
  renderMemoria();
}

function iniciarMemoria() {
  // 8 pares (16 cartas)
  const icons = ["🍎", "🍌", "🍇", "🍉", "🍒", "🍓", "🍍", "🥝"];
  memCards = [...icons, ...icons]
    .sort(() => Math.random() - 0.5)
    .map((v, i) => ({ id: i, value: v, matched: false }));

  memFlipped = [];
  memLocked = false;
  memMoves = 0;
}

function renderMemoria() {
  const bestText = memBest === 0 ? "-" : memBest;

  gameScreen.innerHTML = `
    <div class="xo-container" style="max-width:520px;">
      <div class="stats">
        <span>Movimientos: <b id="mem-moves">${memMoves}</b></span>
        <span>Mejor: <b id="mem-best">${bestText}</b></span>
      </div>

      <div id="mem-grid"
        style="
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap:10px;
          width:100%;
          max-width:420px;
        ">
      </div>

      <p id="mem-msg" class="xo-mensaje"></p>

      <button class="xo-reset" id="mem-reset">🔄 Reiniciar</button>
    </div>
  `;

  const grid = document.getElementById("mem-grid");

  memCards.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = "xo-cell";
    btn.style.width = "90px";
    btn.style.height = "90px";
    btn.style.fontSize = "28px";

    const isFlipped = memFlipped.includes(card.id) || card.matched;
    btn.textContent = isFlipped ? card.value : "❓";

    btn.addEventListener("click", () => flipCard(card.id));

    grid.appendChild(btn);
  });

  document.getElementById("mem-reset").addEventListener("click", () => {
    iniciarMemoria();
    renderMemoria();
  });
}

function flipCard(id) {
  if (memLocked) return;

  const card = memCards.find((c) => c.id === id);
  if (!card || card.matched) return;

  if (memFlipped.includes(id)) return;

  memFlipped.push(id);
  beep(550, 0.05, "triangle");
  renderMemoria();

  if (memFlipped.length === 2) {
    memMoves++;
    document.getElementById("mem-moves").textContent = memMoves;

    const [a, b] = memFlipped;
    const c1 = memCards.find((c) => c.id === a);
    const c2 = memCards.find((c) => c.id === b);

    if (c1.value === c2.value) {
      c1.matched = true;
      c2.matched = true;
      memFlipped = [];
      beep(800, 0.08, "square");

      if (memCards.every((c) => c.matched)) {
        const msg = document.getElementById("mem-msg");
        msg.textContent = `🏆 ¡Ganaste! Movimientos: ${memMoves}`;

        if (memBest === 0 || memMoves < memBest) {
          memBest = memMoves;
          saveNumber("memBestMoves", memBest);
          document.getElementById("mem-best").textContent = memBest;
          msg.textContent += " ✅ ¡Nuevo récord!";
        }
      }

      renderMemoria();
    } else {
      // falló
      memLocked = true;
      beep(200, 0.08, "sawtooth");

      setTimeout(() => {
        memFlipped = [];
        memLocked = false;
        renderMemoria();
      }, 700);
    }
  }
}

// ==========================
// ⭐ Próximamente
// ==========================
function mostrarProx() {
  gameTitle.textContent = "⭐ Próximamente";
  gameScreen.innerHTML = `<p class="placeholder">🚧 Este juego lo agregaremos después.</p>`;
}

// ==========================
// 🎮 Controles globales (Snake)
// ==========================
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === " " && gameTitle.textContent === "🐍 Culebrita") {
    e.preventDefault();
  }
  if (e.repeat) return;

  if (key === " ") {
    if (gameTitle.textContent !== "🐍 Culebrita") return;
    if (gameOver) return;

    pausado = !pausado;

    if (pausado) {
      beep(500, 0.05, "triangle");
      actualizarMensajeSnake("⏸️ Pausado (presiona SPACE para continuar)");
    } else {
      beep(650, 0.05, "triangle");
      actualizarMensajeSnake("");
    }
    return;
  }

  if (gameTitle.textContent !== "🐍 Culebrita") return;
  if (pausado) return;

  if ((key === "arrowup" || key === "w") && direccion !== "DOWN")
    direccionPendiente = "UP";

  if ((key === "arrowdown" || key === "s") && direccion !== "UP")
    direccionPendiente = "DOWN";

  if ((key === "arrowleft" || key === "a") && direccion !== "RIGHT")
    direccionPendiente = "LEFT";

  if ((key === "arrowright" || key === "d") && direccion !== "LEFT")
    direccionPendiente = "RIGHT";
});

// ==========================
// ✅ Eventos del menú + Activo
// ==========================
btnXO.addEventListener("click", () => {
  setActiveButton(btnXO);
  renderXO();
});

btnSnake.addEventListener("click", () => {
  setActiveButton(btnSnake);
  mostrarSnake();
});

btnRPS.addEventListener("click", () => {
  setActiveButton(btnRPS);
  mostrarRPS();
});

btnNum.addEventListener("click", () => {
  setActiveButton(btnNum);
  mostrarAdivinaNumero();
});

btnMemo.addEventListener("click", () => {
  setActiveButton(btnMemo);
  mostrarMemoria();
});

btnProx.addEventListener("click", () => {
  setActiveButton(btnProx);
  mostrarProx();
});

// ✅ al cargar, deja todo sin selección
setActiveButton(null);
