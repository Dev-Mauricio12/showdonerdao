// ELEMENTOS
const menu = document.getElementById("menu");
const jogo = document.getElementById("jogo");
const overlay = document.getElementById("overlay");

const btnComecar = document.getElementById("btnComecar");
const btnReiniciar = document.getElementById("btnReiniciar");
const btnSair = document.getElementById("btnSair");

const textoPergunta = document.getElementById("textoPergunta");
const caixaPergunta = document.getElementById("caixaPergunta");
const alternativasDiv = document.getElementById("alternativas");

const botoes = [
  document.getElementById("alt1"),
  document.getElementById("alt2"),
  document.getElementById("alt3"),
  document.getElementById("alt4")
];

const timerText = document.getElementById("timerText");
const timerFg = document.querySelector(".timer-fg");

const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("finalScore");
const bestScoreEl = document.getElementById("bestScore");

const curIndexEl = document.getElementById("curIndex");
const totalQEl = document.getElementById("totalQ");

// TIMER
let TIMER_TOTAL = 60;
let timerLeft = TIMER_TOTAL;
let interval = null;
const RADIUS = 45;
const CIRC = 2 * Math.PI * RADIUS;

// JOGO
let pontuacao = 0;
let ordem = [];
let perguntaAtual = 0;

// ÁUDIO
const audioMenu = document.getElementById("audioMenu");
const audioInicio = document.getElementById("audioInicio");
const audioJogo = document.getElementById("audioJogo");
const audioAcerto = document.getElementById("audioAcerto");
const audioErro = document.getElementById("audioErro");

// initial timer stroke setup
if (timerFg) {
  timerFg.style.strokeDasharray = String(CIRC);
  timerFg.style.strokeDashoffset = '0';
}

// EVENTOS
btnComecar.addEventListener("click", iniciar);
if (btnReiniciar) btnReiniciar.addEventListener("click", iniciar);
if (btnSair) btnSair.addEventListener("click", voltarMenu);

// tentativa de autoplay do áudio do menu ao carregar
function tryStartMenuAudio(){
  try {
    audioMenu.volume = 0.7;
    audioMenu.currentTime = 0;
    const playPromise = audioMenu.play();
    if (playPromise !== undefined) {
      playPromise.catch(()=> {
        // se for bloqueado, deixamos um listener para iniciar no primeiro toque do usuário
        const startOnInteraction = () => {
          try {
            audioMenu.currentTime = 0;
            audioMenu.play().catch(()=>{});
          } catch(e){}
          window.removeEventListener('pointerdown', startOnInteraction);
        };
        window.addEventListener('pointerdown', startOnInteraction, { once: true });
      });
    }
  } catch(e){}
}

// start menu audio ASAP
window.addEventListener("load", ()=> {
  tryStartMenuAudio();
  try { totalQEl.textContent = perguntas.length; } catch(e){}
});

// -------------------
// START / RESET
// -------------------
function iniciar(){
  menu.classList.add("escondido");
  overlay.classList.add("escondido");
  jogo.classList.remove("escondido");

  // audio: stop menu, play start then loop game music
  try {
    audioMenu.pause();
    audioInicio.currentTime = 0;
    const p = audioInicio.play();
    if (p && p.catch) p.catch(()=>{}); // ignore blocked
    audioInicio.onended = () => {
      try { audioJogo.currentTime = 0; audioJogo.play().catch(()=>{}); } catch(e){}
    };
  } catch(e){}

  // reset game state
  pontuacao = 0;
  scoreEl.textContent = pontuacao;

  ordem = shuffle([...Array(perguntas.length).keys()]);
  perguntaAtual = 0;

  timerLeft = TIMER_TOTAL;
  timerText.textContent = timerLeft;
  updateTimerVisual(timerLeft);

  totalQEl.textContent = perguntas.length;

  carregarPergunta(true);
  iniciarTimer();
}

// -------------------
function voltarMenu(){
  jogo.classList.add("escondido");
  overlay.classList.add("escondido");
  menu.classList.remove("escondido");

  try {
    audioJogo.pause();
    audioInicio.pause();
    audioMenu.currentTime = 0;
    audioMenu.play().catch(()=>{});
  } catch(e){}
}

// -------------------
// TIMER (reinicia corretamente sempre que chamado)
 // We'll use an "endTime" computed fresh each time iniciarTimer() is called.
function iniciarTimer(){
  clearInterval(interval);
  const start = Date.now();
  const end = start + TIMER_TOTAL * 1000;

  // ensure UI shows full
  timerLeft = TIMER_TOTAL;
  timerText.textContent = timerLeft;
  updateTimerVisual(timerLeft);

  interval = setInterval(()=>{
    const leftMs = Math.max(0, end - Date.now());
    const left = Math.ceil(leftMs / 1000);
    timerLeft = left;
    timerText.textContent = timerLeft;
    updateTimerVisual(left);

    if (left <= 0) {
      clearInterval(interval);
      // play error sound and stop game music
      try { audioJogo.pause(); } catch(e){}
      try { audioErro.currentTime = 0; audioErro.play().catch(()=>{}); } catch(e){}
      abrirGameOver();
    }
  }, 150);
}

// update circular stroke based on remaining seconds
function updateTimerVisual(left){
  const pct = left / TIMER_TOTAL;
  const dash = CIRC * (1 - pct);
  if (timerFg) timerFg.style.strokeDashoffset = String(dash);
  // visual glow
  if (left <= 10) timerFg.style.filter = "drop-shadow(0 0 10px #ff6a6a)";
  else timerFg.style.filter = "drop-shadow(0 0 8px rgba(106,92,255,0.6))";
}

// -------------------
// PERGUNTAS & TRANSIÇÃO
// -------------------
function carregarPergunta(first=false){
  const idx = ordem[perguntaAtual];
  const p = perguntas[idx];

  curIndexEl.textContent = perguntaAtual + 1;

  if (!first) {
    aplicarSaida(()=> {
      atualizarPergunta(p);
      aplicarEntrada();
    });
  } else {
    atualizarPergunta(p);
  }
}

function atualizarPergunta(p){
  // pergunta
  textoPergunta.textContent = p.pergunta;

  // alternativas — colocamos texto em spans para evitar sobrescrita do botão
  botoes.forEach((btn, i) => {
    btn.classList.remove("correct", "wrong");
    btn.disabled = false;
    const span = btn.querySelector('.alt-text');
    if (span) span.textContent = p.alternativas[i] || "";
    btn.onclick = ()=> verificar(i);
  });
}

function aplicarSaida(cb){
  caixaPergunta.classList.add("fade-out");
  alternativasDiv.classList.add("fade-out");
  setTimeout(()=>{
    caixaPergunta.classList.remove("fade-out");
    alternativasDiv.classList.remove("fade-out");
    cb();
  }, 850); // corresponde ao CSS
}
function aplicarEntrada(){
  caixaPergunta.classList.add("fade-in");
  alternativasDiv.classList.add("fade-in");
  setTimeout(()=>{
    caixaPergunta.classList.remove("fade-in");
    alternativasDiv.classList.remove("fade-in");
  }, 850);
}

// -------------------
// VERIFICAR
// -------------------
function verificar(i){
  const p = perguntas[ordem[perguntaAtual]];

  // bloqueia cliques até decidir
  botoes.forEach(b => b.disabled = true);

  if (i === p.correta){
    // acerto
    try { audioAcerto.currentTime = 0; audioAcerto.play().catch(()=>{}); } catch(e){}
    // pontuação por faixa
    if (timerLeft >= 41) pontuacao += 30;
    else if (timerLeft >= 21) pontuacao += 20;
    else pontuacao += 10;

    scoreEl.textContent = pontuacao;
    botoes[i].classList.add("correct");

    // avançar pergunta e reiniciar timer (reinicia intervalo chamando iniciarTimer)
    perguntaAtual++;
    // se acabou ciclo, reembaralhar e reiniciar índice
    if (perguntaAtual >= perguntas.length){
      ordem = shuffle([...Array(perguntas.length).keys()]);
      perguntaAtual = 0;
    }

    // reinicia timer e mantém audioJogo tocando
    iniciarTimer();

    // esperar um pouquinho para o jogador ver o feedback e então carregar próxima
    setTimeout(()=> carregarPergunta(), 450);

  } else {
    // erro
    botoes[i].classList.add("wrong");
    try {
      audioJogo.pause();
      audioErro.currentTime = 0;
      audioErro.play().catch(()=>{});
    } catch(e){}
    abrirGameOver();
  }
}

// -------------------
// GAME OVER
// -------------------
function abrirGameOver(){
  clearInterval(interval);
  finalScoreEl.textContent = pontuacao;

  let best = Number(localStorage.getItem("bestScore") || 0);
  if (pontuacao > best){
    best = pontuacao;
    localStorage.setItem("bestScore", best);
  }
  bestScoreEl.textContent = best;

  overlay.classList.remove("escondido");
  overlay.setAttribute('aria-hidden','false');
}

// -------------------
// UTIL
// -------------------
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
