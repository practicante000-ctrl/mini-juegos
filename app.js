import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ============================= */
/* 🔢 UTILIDADES GENERALES */
/* ============================= */

function generarCodigoSala() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function elegirTurnoInicial() {
  return Math.random() < 0.5 ? "X" : "O";
}

const combinacionesGanadoras = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

/* ============================= */
/* 🎮 VARIABLES XO */
/* ============================= */

let tableroXO = Array(9).fill("");
let turnoXO = "X";
let juegoXOActivo = false;

let modoXO = "solo"; // solo | online
let salaXO = null;
let jugadorOnline = null;
let unsubSala = null;

/* ============================= */
/* 🎮 BOTÓN MENÚ XO */
/* ============================= */

document.getElementById("btn-xo").addEventListener("click", cargarXO);

function cargarXO() {
  document.getElementById("game-title").innerText = "❌⭕ Tres en Raya";

  document.getElementById("game-screen").innerHTML = `
    <div class="xo-container">
      <div class="stats">
        <button id="xo-solo">🤖 Solo</button>
        <button id="xo-online">🌍 Online</button>
      </div>

      <div id="xo-opciones"></div>

      <div class="xo-turno" id="xo-turno"></div>

      <div class="xo-board-wrapper">
        <div class="xo-board" id="xo-board"></div>
        <div class="xo-win-line" id="xo-win-line">
          <div class="win-line"></div>
        </div>
      </div>

      <div class="xo-mensaje" id="xo-mensaje"></div>
      <button class="xo-reset" id="xo-reset">🔄 Reiniciar</button>
    </div>
  `;

  document.getElementById("xo-solo").onclick = iniciarXOSolo;
  document.getElementById("xo-online").onclick = iniciarXOOnline;
  document.getElementById("xo-reset").onclick = reiniciarXO;

  crearTableroXO();
}

/* ============================= */
/* 🧱 TABLERO */
/* ============================= */

function crearTableroXO() {
  const board = document.getElementById("xo-board");
  board.innerHTML = "";

  tableroXO.forEach((_, i) => {
    const cell = document.createElement("button");
    cell.className = "xo-cell";
    cell.onclick = () => jugarXO(i);
    board.appendChild(cell);
  });
}

function actualizarTablero() {
  document.querySelectorAll(".xo-cell").forEach((c, i) => {
    c.innerText = tableroXO[i];
  });
}

/* ============================= */
/* 🤖 MODO SOLO */
/* ============================= */

function iniciarXOSolo() {
  modoXO = "solo";
  reiniciarXO();
  juegoXOActivo = true;
  turnoXO = "X";
  document.getElementById("xo-turno").innerText = "Turno: X";
}

function jugarXO(i) {
  if (!juegoXOActivo || tableroXO[i]) return;

  tableroXO[i] = turnoXO;
  actualizarTablero();

  if (verificarGanador()) return;

  turnoXO = turnoXO === "X" ? "O" : "X";
  document.getElementById("xo-turno").innerText = `Turno: ${turnoXO}`;

  if (modoXO === "solo" && turnoXO === "O") {
    setTimeout(jugadaMaquina, 400);
  }

  if (modoXO === "online") {
    actualizarSalaOnline();
  }
}

function jugadaMaquina() {
  const libres = tableroXO
    .map((v, i) => v === "" ? i : null)
    .filter(v => v !== null);

  if (libres.length === 0) return;

  const i = libres[Math.floor(Math.random() * libres.length)];
  tableroXO[i] = "O";
  actualizarTablero();

  verificarGanador();
  turnoXO = "X";
  document.getElementById("xo-turno").innerText = "Turno: X";
}

/* ============================= */
/* 🌍 MODO ONLINE */
/* ============================= */

async function iniciarXOOnline() {
  modoXO = "online";
  reiniciarXO();

  const codigo = generarCodigoSala();
  const turnoInicial = elegirTurnoInicial();

  salaXO = doc(window.db, "salas_xo", codigo);

  await setDoc(salaXO, {
    tablero: Array(9).fill(""),
    turno: turnoInicial,
    estado: "jugando",
    jugadores: { X: null, O: null }
  });

  jugadorOnline = turnoInicial;
  await updateDoc(salaXO, {
    [`jugadores.${jugadorOnline}`]: "player1"
  });

  mostrarOpcionesOnline(codigo);
  escucharSala(codigo);
}

function mostrarOpcionesOnline(codigo) {
  document.getElementById("xo-opciones").innerHTML = `
    <p>🔑 Código de sala: <b>${codigo}</b></p>
    <button id="copiar">📋 Copiar código</button>
    <input id="unirse-codigo" placeholder="Código sala">
    <button id="unirse">➡️ Unirse</button>
  `;

  document.getElementById("copiar").onclick = () =>
    navigator.clipboard.writeText(codigo);

  document.getElementById("unirse").onclick = unirseSalaXO;
}

async function unirseSalaXO() {
  const codigo = document.getElementById("unirse-codigo").value;
  const ref = doc(window.db, "salas_xo", codigo);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Sala no existe");

  const data = snap.data();
  if (data.jugadores.X && data.jugadores.O)
    return alert("Sala llena");

  jugadorOnline = data.jugadores.X ? "O" : "X";
  await updateDoc(ref, {
    [`jugadores.${jugadorOnline}`]: "player2"
  });

  salaXO = ref;
  escucharSala(codigo);
}

function escucharSala(codigo) {
  unsubSala = onSnapshot(doc(window.db, "salas_xo", codigo), snap => {
    if (!snap.exists()) return;
    const d = snap.data();

    tableroXO = d.tablero;
    turnoXO = d.turno;
    juegoXOActivo = d.estado === "jugando";

    actualizarTablero();
    document.getElementById("xo-turno").innerText =
      juegoXOActivo ? `Turno: ${turnoXO}` : "";

    if (d.ganador) mostrarLineaGanadora(d.linea);
  });
}

async function actualizarSalaOnline() {
  if (!salaXO) return;

  await updateDoc(salaXO, {
    tablero: tableroXO,
    turno: turnoXO
  });
}

/* ============================= */
/* 🏆 GANADOR + LÍNEA */
/* ============================= */

function verificarGanador() {
  for (let combo of combinacionesGanadoras) {
    const [a, b, c] = combo;
    if (
      tableroXO[a] &&
      tableroXO[a] === tableroXO[b] &&
      tableroXO[a] === tableroXO[c]
    ) {
      juegoXOActivo = false;
      document.getElementById("xo-mensaje").innerText =
        `🎉 Ganó ${tableroXO[a]}`;
      mostrarLineaGanadora(combo);

      if (modoXO === "online") {
        updateDoc(salaXO, {
          estado: "finalizado",
          ganador: tableroXO[a],
          linea: combo
        });
      }
      return true;
    }
  }

  if (!tableroXO.includes("")) {
    document.getElementById("xo-mensaje").innerText = "🤝 Empate";
    juegoXOActivo = false;
  }
  return false;
}

function mostrarLineaGanadora(combo) {
  const line = document.getElementById("xo-win-line");
  const l = line.querySelector(".win-line");
  line.style.display = "block";

  const posiciones = {
    "0,1,2": "top",
    "3,4,5": "middle",
    "6,7,8": "bottom",
    "0,3,6": "left",
    "1,4,7": "center",
    "2,5,8": "right",
    "0,4,8": "diag1",
    "2,4,6": "diag2"
  };

  const tipo = posiciones[combo.join(",")];

  l.style = "";

  if (tipo === "top") l.style = "top:15%;left:5%;width:90%;height:6px";
  if (tipo === "middle") l.style = "top:50%;left:5%;width:90%;height:6px";
  if (tipo === "bottom") l.style = "top:85%;left:5%;width:90%;height:6px";
  if (tipo === "left") l.style = "left:15%;top:5%;height:90%;width:6px";
  if (tipo === "center") l.style = "left:50%;top:5%;height:90%;width:6px";
  if (tipo === "right") l.style = "left:85%;top:5%;height:90%;width:6px";
  if (tipo === "diag1")
    l.style = "top:50%;left:50%;width:120%;height:6px;transform:translate(-50%,-50%) rotate(45deg)";
  if (tipo === "diag2")
    l.style = "top:50%;left:50%;width:120%;height:6px;transform:translate(-50%,-50%) rotate(-45deg)";
}

/* ============================= */
/* 🔄 RESET */
/* ============================= */

function reiniciarXO() {
  tableroXO = Array(9).fill("");
  juegoXOActivo = true;
  turnoXO = elegirTurnoInicial();

  document.getElementById("xo-mensaje").innerText = "";
  document.getElementById("xo-turno").innerText = `Turno: ${turnoXO}`;
  document.getElementById("xo-win-line").style.display = "none";
  actualizarTablero();
}

/* ================================================= */
/* 🐍 SNAKE */
/* ================================================= */

document.getElementById("btn-snake").addEventListener("click", cargarSnake);

function cargarSnake() {
  document.getElementById("game-title").innerText = "🐍 Culebrita";

  document.getElementById("game-screen").innerHTML = `
    <div class="snake-container">
      <canvas id="snake-canvas" width="360" height="360"></canvas>
      <button class="xo-reset" id="snake-reset">🔄 Reiniciar</button>
    </div>
  `;

  iniciarSnake();
}

let snake, food, dir, snakeLoop;

function iniciarSnake() {
  const canvas = document.getElementById("snake-canvas");
  const ctx = canvas.getContext("2d");

  snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  dir = { x: 1, y: 0 };
  food = generarComida();

  document.onkeydown = e => {
    if (e.key === "ArrowUp" && dir.y === 0) dir = { x: 0, y: -1 };
    if (e.key === "ArrowDown" && dir.y === 0) dir = { x: 0, y: 1 };
    if (e.key === "ArrowLeft" && dir.x === 0) dir = { x: -1, y: 0 };
    if (e.key === "ArrowRight" && dir.x === 0) dir = { x: 1, y: 0 };
  };

  clearInterval(snakeLoop);
  snakeLoop = setInterval(() => {
    ctx.clearRect(0, 0, 360, 360);

    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y
    };

    if (
      head.x < 0 || head.y < 0 ||
      head.x >= 18 || head.y >= 18 ||
      snake.some(s => s.x === head.x && s.y === head.y)
    ) {
      clearInterval(snakeLoop);
      alert("💀 Perdiste");
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      food = generarComida();
    } else {
      snake.pop();
    }

    ctx.fillStyle = "red";
    ctx.fillRect(food.x * 20, food.y * 20, 20, 20);

    ctx.fillStyle = "#00ff88";
    snake.forEach((s, i) => {
      ctx.fillRect(s.x * 20, s.y * 20, 20, 20);
    });
  }, 140);

  document.getElementById("snake-reset").onclick = iniciarSnake;
}

function generarComida() {
  return {
    x: Math.floor(Math.random() * 18),
    y: Math.floor(Math.random() * 18)
  };
}

/* ================================================= */
/* ✊✋✌️ PIEDRA PAPEL TIJERA */
/* ================================================= */

document.getElementById("btn-rps").addEventListener("click", cargarRPS);

function cargarRPS() {
  document.getElementById("game-title").innerText = "✊✋✌️ Piedra Papel Tijera";

  document.getElementById("game-screen").innerHTML = `
    <div class="xo-container">
      <div class="stats">
        <button onclick="jugarRPS('piedra')">✊ Piedra</button>
        <button onclick="jugarRPS('papel')">✋ Papel</button>
        <button onclick="jugarRPS('tijera')">✌️ Tijera</button>
      </div>
      <div class="xo-mensaje" id="rps-res"></div>
    </div>
  `;
}

function jugarRPS(jugador) {
  const opciones = ["piedra", "papel", "tijera"];
  const cpu = opciones[Math.floor(Math.random() * 3)];

  let res = "";

  if (jugador === cpu) res = "🤝 Empate";
  else if (
    (jugador === "piedra" && cpu === "tijera") ||
    (jugador === "papel" && cpu === "piedra") ||
    (jugador === "tijera" && cpu === "papel")
  ) res = "🎉 Ganaste";
  else res = "😢 Perdiste";

  document.getElementById("rps-res").innerText =
    `Tú: ${jugador} | CPU: ${cpu} → ${res}`;
}

/* ================================================= */
/* 🧠 MEMORIA */
/* ================================================= */

document.getElementById("btn-memo").addEventListener("click", cargarMemoria);

function cargarMemoria() {
  document.getElementById("game-title").innerText = "🧠 Memoria";

  document.getElementById("game-screen").innerHTML = `
    <div class="xo-container">
      <div class="xo-board" id="memo-board"></div>
      <div class="xo-mensaje" id="memo-msg"></div>
    </div>
  `;

  iniciarMemoria();
}

let cartas, seleccionadas;

function iniciarMemoria() {
  const icons = ["🍎","🍌","🍇","🍉","🍒","🍍"];
  cartas = [...icons, ...icons].sort(() => Math.random() - 0.5);
  seleccionadas = [];

  const board = document.getElementById("memo-board");
  board.innerHTML = "";

  cartas.forEach((icon, i) => {
    const c = document.createElement("button");
    c.className = "xo-cell";
    c.innerText = "?";
    c.onclick = () => voltearCarta(c, icon);
    board.appendChild(c);
  });
}

function voltearCarta(btn, icon) {
  if (seleccionadas.length === 2 || btn.innerText !== "?") return;

  btn.innerText = icon;
  seleccionadas.push(btn);

  if (seleccionadas.length === 2) {
    setTimeout(() => {
      if (seleccionadas[0].innerText !== seleccionadas[1].innerText) {
        seleccionadas.forEach(b => b.innerText = "?");
      }
      seleccionadas = [];
    }, 600);
  }
}
