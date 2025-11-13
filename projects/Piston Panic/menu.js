// menu.js
const startScreen = document.getElementById("start-screen");
const gameLayer = document.getElementById("game-layer");
const seedInput = document.getElementById("seed-input");
const randomBtn = document.getElementById("btn-random");
const startBtn = document.getElementById("btn-start");
const difficultySel = document.getElementById("opt-difficulty");
const themeSel = document.getElementById("opt-theme");
const sensInput = document.getElementById("opt-sensitivity");
const hudSeed = document.getElementById("hud-seed");

// Random seed
randomBtn.addEventListener("click", () => {
  const s = Math.random().toString(36).substring(2, 10);
  seedInput.value = s;
});

// Start
startBtn.addEventListener("click", e => {
  e.preventDefault();
  const seed = seedInput.value.trim() || Math.random().toString(36).substring(2, 10);
  const diff = difficultySel.value;
  const theme = themeSel.value;
  document.body.dataset.theme = theme;
  if (hudSeed) hudSeed.textContent = seed;

  startScreen.classList.add("hidden");
  startScreen.style.display = "none";
  gameLayer.classList.remove("hidden");

  startGame({ seed, difficulty: diff, sensitivity: parseFloat(sensInput.value) });
});

// Pause / Resume / Exit
const pauseBtn = document.getElementById("btn-pause");
const pauseDialog = document.getElementById("pause-dialog");
const resumeBtn = document.getElementById("btn-resume");
const exitBtn = document.getElementById("btn-exit");

pauseBtn.addEventListener("click", () => { if (window.setPaused) window.setPaused(true); pauseDialog.showModal(); });
resumeBtn.addEventListener("click", () => { if (window.setPaused) window.setPaused(false); pauseDialog.close(); });
exitBtn.addEventListener("click", () => { pauseDialog.close(); location.reload(); });

// End-of-run
const retryBtn = document.getElementById("btn-retry");
const newBtn = document.getElementById("btn-newrun");
retryBtn.addEventListener("click", () => {
  document.getElementById("end-dialog").close();
  startGame({ seed: hudSeed.textContent, difficulty: difficultySel.value });
});
newBtn.addEventListener("click", () => location.reload());
