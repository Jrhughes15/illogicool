// game.js — updates:
// - Pills without parentheses
// - Floating power-ups via vertical band scatter (always present, seeded)
// - HUD water shows absolute level (feet) + speed (ft/s) always
// - True pause (freezes simulation + input) and ESC toggle
// - Post-death "press any key to respawn" breath
// - Keeps 20 px = 1 ft scaling, checkpoints, and prior visuals

let canvas, ctx;

// ===== Units =====
const PX_PER_FT = 20; // 20 pixels == 1 foot

// ===== World state =====
let player, platforms = [], mines = [], pickups = [];
let seed = "", difficulty = "normal";
let rngFn;

// Camera
let cameraY = 0;
const PLAYER_ANCHOR_FRAC = 0.60;

// Water (world space)
let waterY = 0;              // smaller y = higher
let waterBaseRate = 0, waterRampPerK = 0;
const WATER_MARGIN = 80;
let lastWaterY = 0;
let waterSpeedPx = 0;
let startRefY = 0;           // reference for 0' (top of start platform)

// Waves
let waveTime = 0;
const WAVE = { amp1: 7, freq1: 2.1, speed1: 1.15, amp2: 3.5, freq2: 5.4, speed2: 1.8, amp3: 1.8, freq3: 9.8, speed3: 2.6, chop: 0.22 };
let impactRipples = [];
const IMPACT_CONFIG = { amp: 14, sigma: 40, k: 0.20, omega: 5.2, decay: 1.1 };

// Edge foam/ripples
const SURFACE_CONTACT_RANGE = 22;
const RIPPLE_LEN = 26;
const RIPPLE_HEIGHT = 5;
const FOAM_ALPHA = 0.95;

// Bubbles
let bubbles = [];
const BUBBLE_COUNT = 28;
const BUBBLE_MIN_R = 1.4, BUBBLE_MAX_R = 3.2;
const BUBBLE_MIN_SPEED = 22, BUBBLE_MAX_SPEED = 46;
const BUBBLE_X_DRIFT = 10, BUBBLE_SPAWN_DEPTH = 420;

// Motion / physics
let pistonCharge = 0, pistonMax = 50, pistonCharging = false;
const G = 1600;

let vx = 0;
const GROUND_ACCEL = 2400, GROUND_MAX_VX = 260, GROUND_FRICTION = 2200;
const AIR_ACCEL = 1600, AIR_MAX_VX = 260, AIR_DRAG = 200;

const INPUT_LEFT  = () => keys.has("ArrowLeft")  || keys.has("KeyA");
const INPUT_RIGHT = () => keys.has("ArrowRight") || keys.has("KeyD");
const INPUT_JUMP  = () => keys.has("Space");

// Cosmetics (gyro/fans/head/eyes)
const GYRO_SPIN_RATE = 10.0;
let gyroAngle = 0, fanPulse = 0;

// Eyes / head
let eyeBlinkTimer = 0, eyeClosedMs = 0;
let eyeTargetX = 0, eyeTargetY = 0;

// Lives & checkpoints
let lives = 3;
const CHECKPOINT_FEET = 300;
let nextCheckpointAtPx = CHECKPOINT_FEET * PX_PER_FT;
let checkpoint = null;         // {platIndex, x, y, waterY}
let lastCheckpointPlatIndex = null;
let startPlatIndex = 0;

// Game flow
let platformSpacing = 120;
let gameRunning = false;
let paused = false;
let awaitingRespawn = false;
let heightPx = 0;
let spawnGraceMs = 900;
let spawnStartTime = 0;

// Timing
let lastTs = 0;

// Idle/camera
const IDLE_GRACE_MS = 1500;
let idleTimer = 0, recentClimbPx = 0;
const CLIMB_EPS = 6;
const CAMERA_LERP_ACTIVE = 0.14, CAMERA_LERP_IDLE = 0.04;

// Input
const keys = new Set();

// Death / zap
let isZapping = false;
let zapTimer = 0;
const ZAP_DURATION = 1200; // ms

// Shock VFX + fragments
let zapBolts = [];
let fragPieces = [];

// Effects
const effects = {
  overcharge: { t: 0, active: false },  // O
  emp:        { t: 0, active: false },  // I
  jetpack:    { t: 0, active: false },  // J
};
const inventory = { I:0, O:0, P:0, J:0 };

// Power-up spawn control (floating bands)
const GLOBAL_PICKUP_CAP = 12;
const BAND_H = 400;                // vertical band height (px)
let bandCache = new Map();         // bandIndex -> {spawned: boolean}

// HUD helper
function hasDomHud() {
  return !!(document.getElementById("hud-seed") || document.getElementById("hud-height"));
}

// RNG
function makeSeedRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
  h = (h << 13) | (h >>> 19);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
function rand() { return rngFn ? rngFn() : Math.random(); }
function randRange(a,b){ return a + (b - a) * rand(); }

// ---------- Start ----------
function startGame(config) {
  seed = config.seed;
  difficulty = config.difficulty || "normal";
  rngFn = makeSeedRng(seed);

  if (difficulty === "easy") { waterBaseRate = 55; waterRampPerK = 10; }
  else if (difficulty === "hard") { waterBaseRate = 95; waterRampPerK = 25; }
  else { waterBaseRate = 75; waterRampPerK = 16; }

  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");

  // Platforms
  platforms = [];
  const startPlatY = canvas.height - 160;
  const startPlatW = 180;
  const startPlatX = Math.max(0, Math.min(canvas.width - startPlatW, canvas.width * 0.5 - startPlatW / 2));
  const startPlatform = { x: startPlatX, y: startPlatY, w: startPlatW, h: 12, underwater: false, type: "solid", broken: false, breakTimer: 0, isCheckpoint: false, hasPickup:false };
  platforms.push(startPlatform);
  startPlatIndex = 0;
  startRefY = startPlatY; // 0' reference at the top surface of the start platform

  // Column upward
  let lastY = startPlatY;
  for (let i = 1; i <= 24; i++) {
    const w = 90 + Math.floor(rand() * 80);
    const x = rand() * (canvas.width - w);
    const y = lastY - platformSpacing;
    const type = (rand() < 0.20) ? "fragile" : "solid";
    platforms.push({ x, y, w, h: 10, underwater: false, type, breakTimer: 0, broken: false, isCheckpoint: false, hasPickup:false });
    lastY = y;
  }

  // Mines
  mines = [];
  for (let i = 0; i < 6; i++) {
    const y = startPlatY - 200 - i * 260;
    const x = 40 + rand() * (canvas.width - 80);
    const dir = rand() < 0.5 ? -1 : 1;
    mines.push({ x, y, r: 8, dir, speed: 40 + rand() * 40, phase: rand() * Math.PI * 2, stunnedUntil: 0 });
  }

  // Player
  const playerW = 24, playerH = 34;
  player = { width: playerW, height: playerH, x: startPlatX + Math.floor(startPlatW/2 - playerW/2), y: startPlatY - playerH, vy: 0, grounded: true, anim: { piston: 0, extendTimer: 0 } };
  if (player.y + player.height > startPlatY) player.y = startPlatY - player.height;
  vx = 0;

  // Water
  waterY = startPlatY + startPlatform.h + WATER_MARGIN;
  lastWaterY = waterY; waterSpeedPx = 0;

  // Camera
  cameraY = player.y - Math.floor(canvas.height * PLAYER_ANCHOR_FRAC);

  // Reset state
  heightPx = 0; lives = 3;
  nextCheckpointAtPx = CHECKPOINT_FEET * PX_PER_FT;
  checkpoint = null;
  lastCheckpointPlatIndex = null;

  // Effects + inventory reset
  effects.overcharge.t = 0; effects.overcharge.active = false;
  effects.emp.t = 0; effects.emp.active = false;
  effects.jetpack.t = 0; effects.jetpack.active = false;
  inventory.I = 0; inventory.O = 0; inventory.P = 0; inventory.J = 0;

  // Pickups + band cache
  pickups = [];
  bandCache = new Map();

  impactRipples = [];
  initBubbles();

  gameRunning = true; paused = false; awaitingRespawn = false;
  isZapping = false; zapTimer = 0;
  zapBolts = []; fragPieces = [];

  spawnStartTime = performance.now();
  lastTs = 0; idleTimer = 0; recentClimbPx = 0; waveTime = 0;
  gyroAngle = 0; fanPulse = 0;

  // eyes
  eyeBlinkTimer = randRange(1.8, 4.2); eyeClosedMs = 0;

  const hudSeed = document.getElementById("hud-seed");
  if (hudSeed) hudSeed.textContent = seed;
  updateDomHud();

  requestAnimationFrame(update);
}

// ---------- Main loop ----------
function update(ts) {
  if (!gameRunning) { drawScene(true); requestAnimationFrame(update); return; }
  if (paused || awaitingRespawn) { drawScene(false); requestAnimationFrame(update); return; }

  if (!lastTs) lastTs = ts;
  const dtMs = Math.min(34, ts - lastTs);
  const dt = dtMs / 1000;
  lastTs = ts;
  waveTime += dt;

  if (!isZapping) {
    handleInput(dt);
    applyPhysics(dt);
    updateWater(dt);
    updateMines(dt, ts);
    updateBubbles(dt);
    updateCosmetics(dt);
    updateEffects(dt);
    updatePickups(dt);
    spawnPickupsContinuously(); // dense + floating
  } else {
    updateFragments(dt);
    zapTimer -= dtMs;
    if (zapTimer <= 0) { // freeze, wait for any key to respawn
      isZapping = false;
      awaitingRespawn = true;
      updateDomHud();
      drawScene(false);
      requestAnimationFrame(update);
      return;
    }
  }

  // Camera tracking
  const targetCamY = player.y - canvas.height * PLAYER_ANCHOR_FRAC;
  const prevCamY = cameraY;
  const movingUp = (player.vy < -10) || (prevCamY - targetCamY > 0);
  let lerpRate = CAMERA_LERP_IDLE;
  if (movingUp || recentClimbPx > CLIMB_EPS) { lerpRate = CAMERA_LERP_ACTIVE; idleTimer = Math.max(0, idleTimer - dtMs); } else { idleTimer += dtMs; }
  cameraY = cameraY + (targetCamY - cameraY) * lerpRate;

  const camDelta = Math.max(0, -(cameraY - prevCamY));
  recentClimbPx = Math.max(0, recentClimbPx * 0.9 + camDelta * 0.1);

  // Score (in pixels)
  heightPx = Math.max(heightPx, Math.floor(-cameraY));

  // Underwater state / ripples
  for (let p of platforms) {
    const wasUnder = p.underwater;
    p.underwater = (p.y >= waterY) || p.broken;
    if (!wasUnder && p.underwater) { spawnImpactRipple(p.x); spawnImpactRipple(p.x + p.w); }
  }

  // Death triggers (unless grace)
  const inGrace = (ts - spawnStartTime) < spawnGraceMs;
  if (!inGrace && !isZapping) {
    if (player.y + player.height >= waterY || hitsMine(ts)) triggerZap();
  }

  // Draw & world upkeep
  drawScene(false);
  maybeAddPlatforms();
  cullWorld();

  updateDomHud();
  requestAnimationFrame(update);
}

// ---------- Input / Cosmetics ----------
function handleInput(dt) {
  // Piston charge (faster with overcharge)
  const baseRate = 90;
  const ocMul = effects.overcharge.active ? 1.5 : 1.0;
  if (pistonCharging && !effects.jetpack.active) {
    pistonCharge = Math.min(pistonCharge + baseRate * ocMul * dt, pistonMax);
    player.anim.piston = Math.max(player.anim.piston * 0.85, pistonCharge / pistonMax);
  } else {
    player.anim.piston *= 0.85;
  }

  // Horizontal
  const left = INPUT_LEFT(), right = INPUT_RIGHT();
  if (player.grounded) {
    if (left ^ right) vx += (left ? -1 : 1) * GROUND_ACCEL * dt;
    else { if (vx > 0) vx = Math.max(0, vx - GROUND_FRICTION * dt); else if (vx < 0) vx = Math.min(0, vx + GROUND_FRICTION * dt); }
    vx = Math.max(-GROUND_MAX_VX, Math.min(GROUND_MAX_VX, vx));
  } else {
    if (left ^ right) vx += (left ? -1 : 1) * AIR_ACCEL * dt;
    else { if (vx > 0) vx = Math.max(0, vx - AIR_DRAG * dt); else if (vx < 0) vx = Math.min(0, vx + AIR_DRAG * dt); }
    vx = Math.max(-AIR_MAX_VX, Math.min(AIR_MAX_VX, vx));
  }

  // Head/eye target from input + velocity
  const vxNorm = Math.max(-1, Math.min(1, vx / 260));
  eyeTargetX = (INPUT_LEFT() ? -1 : INPUT_RIGHT() ? 1 : vxNorm) * 2.0;
  eyeTargetY = player.vy < -50 ? -1.0 : player.vy > 200 ? 1.0 : 0.0;

  // blink timer
  eyeBlinkTimer -= dt;
  if (eyeBlinkTimer <= 0) { eyeClosedMs = 120; eyeBlinkTimer = randRange(2.2, 4.6); }
  if (eyeClosedMs > 0) eyeClosedMs -= dt * 1000;
}

function updateCosmetics(dt) {
  const movingHoriz = INPUT_LEFT() || INPUT_RIGHT();
  gyroAngle += (GYRO_SPIN_RATE * (movingHoriz ? 1.4 : 1.0)) * dt;
  const pulseTarget = movingHoriz ? 1 : 0;
  fanPulse += (pulseTarget - fanPulse) * Math.min(1, dt * 8);
}

// ---------- Physics / collision ----------
function applyPhysics(dt) {
  const gMul = effects.jetpack.active ? 0.30 : 1.0;
  player.vy += G * gMul * dt;

  if (effects.jetpack.active) {
    const thrust = INPUT_JUMP() ? -780 : -520;
    player.vy += thrust * dt;
  }

  const prevBottom = player.y + player.height;
  player.x += vx * dt;
  player.y += player.vy * dt;

  if (player.x < 0) { player.x = 0; vx = Math.max(0, vx); }
  if (player.x + player.width > canvas.width) { player.x = canvas.width - player.width; vx = Math.min(0, vx); }

  // One-way landing
  player.grounded = false;
  const newBottom = player.y + player.height;
  if (player.vy >= 0) {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.underwater || p.broken) continue;
      const horiz = player.x < p.x + p.w && player.x + player.width > p.x;
      const crossedTop = prevBottom <= p.y && newBottom >= p.y;
      if (horiz && crossedTop) {
        player.y = p.y - player.height;
        player.vy = 0;
        player.grounded = true;

        if (p.type === "fragile" && !p.breakTimer && !p.broken) p.breakTimer = 0.6;

        // Checkpoint capture
        if (heightPx >= nextCheckpointAtPx) {
          setCheckpoint(i, player.x, p.y - player.height, waterY);
          nextCheckpointAtPx += CHECKPOINT_FEET * PX_PER_FT;
        }

        if (effects.jetpack.active) { effects.jetpack.t = 0; effects.jetpack.active = false; }
        break;
      }
    }
  }

  // Fragile breaking
  for (let p of platforms) {
    if (p.type === "fragile" && p.breakTimer && !p.broken) {
      p.breakTimer -= dt;
      if (p.breakTimer <= 0) {
        p.broken = true;
        if (p.y >= waterY) { spawnImpactRipple(p.x); spawnImpactRipple(p.x + p.w); }
      }
    }
  }
}

function jump() {
  if (player.grounded && !isZapping && !paused && !awaitingRespawn) {
    const baseKick = -(pistonCharge * 22) - 180;
    const ocMul = effects.overcharge.active ? 1.6 : 1.0;
    player.vy = baseKick * ocMul;
    player.grounded = false;
    player.anim.extendTimer = 0.18;
    pistonCharge = 0;
  }
}

// ---------- Water / mines ----------
function updateWater(dt) {
  const climbedK = Math.max(0, -cameraY) / 1000;
  let rate = waterBaseRate + waterRampPerK * climbedK;
  if (idleTimer > IDLE_GRACE_MS) rate += Math.min(40, (idleTimer - IDLE_GRACE_MS) / 150);

  const prevY = waterY;
  waterY -= rate * dt;
  lastWaterY = prevY;
  waterSpeedPx = (prevY - waterY) / dt;

  const now = performance.now() / 1000.0;
  impactRipples = impactRipples.filter(r => (now - r.t0) < 4.0);
}

function spawnImpactRipple(x) {
  impactRipples.push({ x, t0: performance.now() / 1000.0, amp: IMPACT_CONFIG.amp, sigma: IMPACT_CONFIG.sigma, k: IMPACT_CONFIG.k, omega: IMPACT_CONFIG.omega, decay: 1.1 });
}

function updateMines(dt, ts) {
  const now = ts / 1000;
  for (let m of mines) {
    const stunned = now < m.stunnedUntil;
    const speedMul = stunned ? 0.3 : 1.0;
    m.phase += dt * 1.4 * speedMul;
    m.x += m.dir * m.speed * dt * speedMul;
    m.y += Math.sin(m.phase) * 6 * dt * speedMul;
    if (m.x < 20) { m.x = 20; m.dir *= -1; }
    if (m.x > canvas.width - 20) { m.x = canvas.width - 20; m.dir *= -1; }
  }
}
function hitsMine(ts) {
  const now = ts / 1000;
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  for (let m of mines) {
    if (now < m.stunnedUntil) continue;
    const dx = px - m.x, dy = py - m.y;
    if (dx*dx + dy*dy < (m.r + Math.max(player.width, player.height) * 0.35)**2) return true;
  }
  return false;
}

// ---------- Zap & lives / respawn ----------
function triggerZap() {
  if (isZapping || paused) return;
  isZapping = true;
  zapTimer = ZAP_DURATION;

  spawnFragments();
  spawnZapBolts();

  // Cancel timed effects on death
  effects.overcharge.t = 0; effects.overcharge.active = false;
  effects.emp.t = 0; effects.emp.active = false;
  effects.jetpack.t = 0; effects.jetpack.active = false;
}

function performRespawn() {
  awaitingRespawn = false;
  lives -= 1;
  updateDomHud();

  if (lives <= 0) { gameRunning = false; showGameOver(); return; }

  let targetIndex = checkpoint ? checkpoint.platIndex : startPlatIndex;

  if (!platforms[targetIndex] || platforms[targetIndex].broken) {
    targetIndex = Math.max(0, Math.min(platforms.length - 1, targetIndex));
    for (let i = targetIndex; i >= 0; i--) {
      const p = platforms[i];
      if (p && !p.broken && p.type !== "fragile") { targetIndex = i; break; }
    }
  }
  const tp = platforms[targetIndex];
  if (tp) {
    const px = checkpoint ? Math.max(0, Math.min(canvas.width - player.width, checkpoint.x)) : (tp.x + tp.w/2 - player.width/2);
    player.x = px;
    player.y = tp.y - player.height;
    player.vy = 0; vx = 0; player.grounded = true;

    // Water restore (a bit lower for safety)
    if (checkpoint && typeof checkpoint.waterY === "number") {
      const SAFETY = 60;
      waterY = Math.max(checkpoint.waterY + SAFETY, tp.y + tp.h + WATER_MARGIN);
    } else {
      waterY = tp.y + tp.h + WATER_MARGIN + 60;
    }

    spawnStartTime = performance.now();
    impactRipples = [];
    zapBolts = []; fragPieces = [];
    isZapping = false;
    requestAnimationFrame(update);
  } else {
    gameRunning = false;
    showGameOver();
  }
}

// ---------- Effects & Activations ----------
function updateEffects(dt) {
  if (effects.overcharge.active) { effects.overcharge.t -= dt; if (effects.overcharge.t <= 0) effects.overcharge.active = false; }
  if (effects.emp.active)        { effects.emp.t        -= dt; if (effects.emp.t <= 0)        effects.emp.active = false; }
  if (effects.jetpack.active)    { effects.jetpack.t    -= dt; if (effects.jetpack.t <= 0)    effects.jetpack.active = false; }
}

function tryActivate(type) {
  if (paused || awaitingRespawn) return;
  if (type === "O" && inventory.O > 0) {
    effects.overcharge.active = true; effects.overcharge.t = 10.0; inventory.O--;
  } else if (type === "I" && inventory.I > 0) {
    const now = performance.now() / 1000;
    for (let m of mines) m.stunnedUntil = Math.max(m.stunnedUntil || 0, now + 8.0);
    effects.emp.active = true; effects.emp.t = 8.0; inventory.I--;
  } else if (type === "P" && inventory.P > 0) {
    waterY += 120; for (let x = 0; x <= canvas.width; x += 40) spawnImpactRipple(x); inventory.P--;
  } else if (type === "J" && inventory.J > 0) {
    if (!effects.jetpack.active) {
      effects.jetpack.active = true; effects.jetpack.t = 3.5;
      if (player.vy > -260) player.vy = -260; inventory.J--;
    }
  }
  updateDomHud();
}

// ---------- HUD / pills / checkpoints ----------
function buildPill(text, count, active, cls) {
  const el = document.createElement("span");
  el.className = `pill ${cls}` + (count>0 ? "" : " dim") + (active ? " active" : "");
  el.textContent = `${text}${count>0? " "+count : ""}`; // NO parentheses
  return el;
}
function renderPillsRow() {
  const cont = document.getElementById("hud-pills");
  if (!cont) return;
  cont.innerHTML = "";

  cont.appendChild(buildPill("I", inventory.I, effects.emp.active, "pill-I"));
  cont.appendChild(buildPill("O", inventory.O, effects.overcharge.active, "pill-O"));
  cont.appendChild(buildPill("P", inventory.P, false, "pill-P"));
  cont.appendChild(buildPill("J", inventory.J, effects.jetpack.active, "pill-J"));

  // lives
  const livesWrap = document.createElement("span");
  livesWrap.className = "lives";
  for (let i = 0; i < lives; i++) {
    const heart = document.createElement("span");
    heart.className = "life";
    livesWrap.appendChild(heart);
  }
  cont.appendChild(livesWrap);
}

function updateDomHud() {
  const heightEl = document.getElementById("hud-height");
  if (heightEl) heightEl.textContent = Math.floor(heightPx / PX_PER_FT);

  const waterEl = document.getElementById("hud-water");
  if (waterEl) {
    const waterFeet = (startRefY - waterY) / PX_PER_FT;  // absolute level, 0' at start platform
    const speedFt = waterSpeedPx / PX_PER_FT;
    waterEl.textContent = `Water: ${Math.round(waterFeet)}' | ${speedFt.toFixed(1)} ft/s`;
  }
  renderPillsRow();
}

function setCheckpoint(platIndex, px, py, waterAtSet) {
  if (lastCheckpointPlatIndex != null && platforms[lastCheckpointPlatIndex]) {
    platforms[lastCheckpointPlatIndex].isCheckpoint = false;
  }
  platforms[platIndex].isCheckpoint = true;
  lastCheckpointPlatIndex = platIndex;
  checkpoint = { platIndex, x: px, y: py, waterY: waterAtSet };
}

// ---------- Pickups (floating bands + render) ----------
const PICKUP_INFO = {
  "I": { color: "#9b5de5", name: "Impulse" },
  "O": { color: "#4ec9f0", name: "Overcharge" },
  "P": { color: "#2bd1c0", name: "Pulse" },
  "J": { color: "#ff6b6b", name: "Jetpack" },
  "L": { color: "#ffd166", name: "Life" }
};

function ensureBandsForView() {
  const minY = Math.floor((cameraY - 1200) / BAND_H);
  const maxY = Math.floor((cameraY + canvas.height * 3) / BAND_H);

  for (let k = minY; k <= maxY; k++) {
    if (bandCache.has(k)) continue;
    bandCache.set(k, { spawned: true });

    // seeded rng per band
    const rband = makeSeedRng(`${seed}|PU|${k}`);
    const count = 1 + Math.floor(rband() * 3); // 1..3 tokens
    for (let i = 0; i < count; i++) {
      const x = 30 + rband() * (canvas.width - 60);
      const y = k * BAND_H + 60 + rband() * (BAND_H - 120);
      const tPick = ["I","O","P","J","L"][Math.floor(rband() * 5)];
      pickups.push({ x, y, type: tPick, alive: true, glow: 0, platIndex: null });
    }
  }

  // cull far-below bands & pickups
  const cutoff = cameraY - 1800;
  pickups = pickups.filter(p => p.alive && p.y > cutoff && (p.y - cameraY) < canvas.height + 1000);
}

function spawnPickupsContinuously() {
  ensureBandsForView(); // floating scatter always
  // keep older platform-tied trickle as tiny supplement (rare)
  if (pickups.filter(p => p.alive).length >= GLOBAL_PICKUP_CAP) return;

  const bandTop = cameraY - 600;
  const bandBot = cameraY + canvas.height + 200;

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (p.broken || p.hasPickup) continue;
    if (p.y < bandTop || p.y > bandBot) continue;

    const r = makeSeedRng(`${seed}|PLAT|${i}|${Math.floor(-cameraY)}`)();
    if (r < 0.10) {
      const choose = makeSeedRng(`${seed}|TYPE|${i}`)();
      const types = ["I","O","P","J","L"];
      const t = types[Math.floor(choose * types.length)];
      const x = p.x + 10 + (p.w - 20) * makeSeedRng(`${seed}|X|${i}`)();
      pickups.push({ x, y: p.y - 22, type: t, alive: true, glow: 0, platIndex: i });
      p.hasPickup = true;
      if (pickups.filter(pp => pp.alive).length >= GLOBAL_PICKUP_CAP) break;
    }
  }
}

function updatePickups(dt) {
  for (let pk of pickups) {
    if (!pk.alive) continue;
    pk.glow += dt;

    // Collect
    if (aabb(player.x, player.y, player.width, player.height, pk.x - 10, pk.y - 10, 20, 20)) {
      if (pk.type === "L") {
        lives = Math.min(5, lives + 1); pk.alive = false; updateDomHud();
      } else {
        const cap = 3;
        if (inventory[pk.type] < cap) { inventory[pk.type] += 1; pk.alive = false; updateDomHud(); }
      }
    }
  }
}

function drawPickups() {
  for (let pk of pickups) {
    if (!pk.alive) continue;
    const sy = pk.y - cameraY;
    if (sy < -20 || sy > canvas.height + 40) continue;

    ctx.save();
    ctx.translate(pk.x, sy);
    // glow
    const a = 0.25 + 0.25 * Math.sin(waveTime * 4 + pk.glow);
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();

    // pill circle
    ctx.fillStyle = PICKUP_INFO[pk.type]?.color || "#fff";
    ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();

    // letter
    ctx.fillStyle = "#0b0f15";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(pk.type, 0, 0);
    ctx.restore();
  }
}

function aabb(ax,ay,aw,ah, bx,by,bw,bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------- World maintenance ----------
function maybeAddPlatforms() {
  const last = platforms[platforms.length - 1];
  if (!last) return;
  if (last.y > cameraY - 240) {
    const w = 90 + Math.floor(rand() * 80);
    const x = rand() * (canvas.width - w);
    const y = last.y - platformSpacing;
    const type = (rand() < 0.20) ? "fragile" : "solid";
    platforms.push({ x, y, w, h: 10, underwater: (y >= waterY), type, breakTimer: 0, broken: false, isCheckpoint: false, hasPickup:false });

    if (rand() < 0.15) {
      const my = y - 100 - rand() * 80;
      const mx = 40 + rand() * (canvas.width - 80);
      const dir = rand() < 0.5 ? -1 : 1;
      mines.push({ x: mx, y: my, r: 8, dir, speed: 40 + rand() * 40, phase: Math.random() * Math.PI * 2, stunnedUntil: 0 });
    }
  }
}
function cullWorld() {
  const belowCut = cameraY + canvas.height + 1000;
  platforms = platforms.filter(p => p.y < belowCut);
  mines = mines.filter(m => (m.y - cameraY) < canvas.height + 900);
  pickups = pickups.filter(pk => pk.alive && (pk.y - cameraY) < canvas.height + 1200);
}

// ---------- Bubbles ----------
function initBubbles() {
  bubbles = [];
  for (let i = 0; i < BUBBLE_COUNT; i++) bubbles.push(spawnBubble());
}
function spawnBubble() {
  const r = randRange(BUBBLE_MIN_R, BUBBLE_MAX_R);
  const y = waterY + rand() * BUBBLE_SPAWN_DEPTH;
  const x = rand() * canvas.width;
  const vy = -randRange(BUBBLE_MIN_SPEED, BUBBLE_MAX_SPEED);
  const vx = randRange(-BUBBLE_X_DRIFT, BUBBLE_X_DRIFT);
  const wobble = randRange(0.6, 1.4);
  return { x, y, r, vy, vx, wobble };
}
function updateBubbles(dt) {
  for (let b of bubbles) {
    b.y += b.vy * dt;
    b.x += (b.vx + Math.sin((b.y + waveTime * 60) * 0.02) * 10 * b.wobble) * dt;
    if (b.x < -10) b.x += canvas.width + 20;
    if (b.x > canvas.width + 10) b.x -= canvas.width + 20;
    if (b.y <= waterY - 2) {
      const nb = spawnBubble();
      nb.y = waterY + 60 + rand() * (BUBBLE_SPAWN_DEPTH - 60);
      nb.x = b.x;
      Object.assign(b, nb);
    }
  }
}

// ---------- Death FX (bolts + fragments) ----------
function spawnZapBolts() {
  zapBolts = [];
  const cx = player.x + player.width/2;
  const cy = player.y + player.height/2;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + randRange(-0.2, 0.2);
    const len = randRange(20, 40);
    zapBolts.push({ x1: cx, y1: cy, x2: cx + Math.cos(ang)*len, y2: cy + Math.sin(ang)*len, life: 1.0 });
  }
  zapTimer = ZAP_DURATION;
}

function spawnFragments() {
  fragPieces = [];
  const cx = player.x + player.width/2;
  const cy = player.y + player.height/2;

  const pushPiece = (type, w, h, color) => {
    const ang = randRange(0, Math.PI*2);
    const spd = randRange(80, 160);
    fragPieces.push({
      type, x: cx, y: cy, w, h, color,
      vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 40,
      life: 1.0, rot: randRange(0, Math.PI*2), vr: randRange(-5,5)
    });
  };

  pushPiece("head", 18, 10, "#c8ced8");
  pushPiece("eyes", 16, 6, "#aab2bd");
  pushPiece("torso", 22, 18, "#c8ced8");
  pushPiece("piston", 6, 16, "#0f1218");
  pushPiece("fanL", 6, 6, "#d3e2ec");
  pushPiece("fanR", 6, 6, "#d3e2ec");
}

function updateFragments(dt) {
  for (let b of zapBolts) b.life -= dt * 2.2;
  zapBolts = zapBolts.filter(b => b.life > 0);

  for (let f of fragPieces) {
    f.vy += 300 * dt;
    f.vx *= 0.985; f.vy *= 0.985;
    f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
    f.life -= dt * 0.7;

    if (f.y >= waterY) {
      f.vy += 50 * dt;
      if (rand() < 0.05) spawnImpactRipple(f.x);
    }
  }
  fragPieces = fragPieces.filter(f => f.life > 0);
}

// ---------- Rendering ----------
function choppyWaveY(x, baseY) {
  const t = waveTime, w = canvas.width;
  const p1 = (x / w) * (Math.PI * 2 * WAVE.freq1);
  const p2 = (x / w) * (Math.PI * 2 * WAVE.freq2);
  const p3 = (x / w) * (Math.PI * 2 * WAVE.freq3);

  let amp1 = WAVE.amp1, amp2 = WAVE.amp2, amp3 = WAVE.amp3, chop = WAVE.chop;

  const near = platformSurfaceProximity(x, baseY);
  if (near > 0) {
    const atten = 1 - 0.6 * near;
    amp1 *= atten; amp2 *= atten; amp3 *= atten; chop *= atten;
  }

  let yOff =
    Math.sin(p1 + t * WAVE.speed1) * amp1 +
    Math.sin(p2 + t * WAVE.speed2) * amp2 +
    Math.sin(p3 + t * WAVE.speed3) * amp3;

  yOff += Math.sign(Math.sin(p2 + t * WAVE.speed2)) * chop * amp2;

  const now = performance.now() / 1000.0;
  for (let r of impactRipples) {
    const age = now - r.t0;
    const gauss = Math.exp(-((x - r.x) ** 2) / (2 * r.sigma * r.sigma));
    const phase = r.k * (x - r.x) - r.omega * age;
    const amp = r.amp * Math.exp(-r.decay * age);
    yOff += gauss * Math.sin(phase) * amp;
  }

  return baseY + yOff;
}

function platformSurfaceProximity(x, baseY) {
  let closeness = 0;
  for (let p of platforms) {
    if (p.broken) continue;
    if (x < p.x - 8 || x > p.x + p.w + 8) continue;
    const dyTop = Math.abs(baseY - p.y);
    const dyBot = Math.abs(baseY - (p.y + p.h));
    const d = Math.min(dyTop, dyBot);
    if (d < 28) closeness = Math.max(closeness, (28 - d) / 28);
  }
  return closeness;
}

function drawScene(showFallbackGameOver) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b0f15";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Platforms
  for (let p of platforms) {
    if (p.broken) continue;
    const sy = p.y - cameraY;
    if (sy < -20 || sy > canvas.height + 20) continue;

    let fill = p.underwater ? "#4b6874" : "#7f848b";
    if (p.type === "fragile") fill = p.underwater ? "#6c5a60" : "#b86c6c";
    if (p.isCheckpoint) fill = "#2ecc71";

    ctx.fillStyle = "#1b1f27";
    ctx.fillRect(p.x-1, sy-1, p.w+2, p.h+2);
    ctx.fillStyle = fill;
    ctx.fillRect(p.x, sy, p.w, p.h);

    if (p.type === "fragile" && !p.broken) {
      ctx.strokeStyle = "rgba(20,0,0,0.65)";
      ctx.beginPath();
      ctx.moveTo(p.x + 6, sy + 2); ctx.lineTo(p.x + p.w/2, sy + p.h - 2);
      ctx.moveTo(p.x + p.w - 6, sy + 2); ctx.lineTo(p.x + p.w/2, sy + p.h - 2);
      ctx.stroke();
      if (p.breakTimer && p.breakTimer > 0) {
        const flash = ((Math.sin(waveTime * 20) + 1) * 0.5) * 0.4;
        ctx.fillStyle = `rgba(255,255,255,${flash.toFixed(2)})`;
        ctx.fillRect(p.x, sy, p.w, p.h);
      }
    }
  }

  // Mines
  const nowSec = performance.now()/1000;
  for (let m of mines) {
    const sy = m.y - cameraY;
    if (sy < -20 || sy > canvas.height + 20) continue;
    const stunned = nowSec < m.stunnedUntil;
    ctx.fillStyle = stunned ? "rgba(120,180,200,0.25)" : "rgba(90,220,255,0.25)";
    ctx.beginPath(); ctx.arc(m.x, sy, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = stunned ? "#9bc7de" : "#7ce3ff";
    ctx.beginPath(); ctx.arc(m.x, sy, 7, 0, Math.PI*2); ctx.fill();
    if (!stunned) {
      for (let i = 0; i < 6; i++) {
        const ang = (i/6) * Math.PI*2 + waveTime*3;
        ctx.strokeStyle = "rgba(190,255,255,0.8)";
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(ang)*4, sy + Math.sin(ang)*4);
        ctx.lineTo(m.x + Math.cos(ang)*9, sy + Math.sin(ang)*9);
        ctx.stroke();
      }
    }
  }

  // Player body (if not in zap freeze)
  if (!isZapping) {
    const psY = player.y - cameraY;
    const w = player.width, h = player.height;
    ctx.fillStyle = "#10131a";
    ctx.fillRect(player.x-1, psY-1, w+2, h+2);
    ctx.fillStyle = "#c8ced8";
    ctx.fillRect(player.x, psY, w, h);
    ctx.fillStyle = "#aab2bd";
    ctx.fillRect(player.x + 4, psY - 8, w - 8, 8);

    drawHeadAndEyes(player.x, psY, w, h);

    if (player.anim.extendTimer > 0) player.anim.extendTimer -= 1/60;
    const charge = Math.max(0, Math.min(1, player.anim.piston));
    const retract = Math.floor(charge * 10);
    const shoot = Math.max(0, player.anim.extendTimer) * 24;
    const baseLen = 12;
    const pistonDownLen = Math.max(2, baseLen - retract) + shoot;
    ctx.fillStyle = "#0f1218";
    ctx.fillRect(player.x + w/2 - 5, psY + h, 10, pistonDownLen);

    // fans
    const leftOn = INPUT_LEFT(), rightOn = INPUT_RIGHT();
    const puff = 6 + fanPulse * 12;
    if (leftOn) {
      ctx.fillStyle = "rgba(200,230,255,0.82)";
      const ox = player.x + w + 3, oy = psY + h * 0.45;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox - puff, oy - 3); ctx.lineTo(ox - puff, oy + 3); ctx.closePath(); ctx.fill();
    }
    if (rightOn) {
      ctx.fillStyle = "rgba(200,230,255,0.82)";
      const ox = player.x - 3, oy = psY + h * 0.45;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + puff, oy - 3); ctx.lineTo(ox + puff, oy + 3); ctx.closePath(); ctx.fill();
    }

    // Jetpack flame
    if (effects.jetpack.active) {
      ctx.fillStyle = "rgba(255,180,80,0.9)";
      ctx.beginPath();
      ctx.moveTo(player.x + w/2, psY + h + 2);
      ctx.lineTo(player.x + w/2 - 7, psY + h + 22 + Math.sin(waveTime*40)*2);
      ctx.lineTo(player.x + w/2 + 7, psY + h + 22 + Math.cos(waveTime*40)*2);
      ctx.closePath(); ctx.fill();
    }
  }

  // WATER overlay
  const baseWaterScreenY = waterY - cameraY;
  if (baseWaterScreenY < canvas.height) {
    const samples = Math.max(64, Math.floor(canvas.width / 12));
    const dx = canvas.width / samples;
    const wavePts = [];
    for (let i = 0; i <= samples; i++) {
      const x = i * dx;
      const y = choppyWaveY(x, baseWaterScreenY);
      wavePts.push({ x, y: Math.max(-20, y) });
    }
    for (let i = 1; i < wavePts.length-1; i++) {
      wavePts[i].y = (wavePts[i-1].y + wavePts[i].y + wavePts[i+1].y) / 3;
    }

    ctx.beginPath();
    ctx.moveTo(wavePts[0].x, wavePts[0].y);
    for (let i = 1; i < wavePts.length; i++) ctx.lineTo(wavePts[i].x, wavePts[i].y);
    ctx.lineTo(canvas.width, canvas.height + 20);
    ctx.lineTo(0, canvas.height + 20);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, baseWaterScreenY, 0, canvas.height);
    grad.addColorStop(0.00, "rgba(31,95,120,0.80)");
    grad.addColorStop(0.45, "rgba(18,51,67,0.88)");
    grad.addColorStop(1.00, "rgba(2,4,6,0.97)");
    ctx.fillStyle = grad; ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(60,155,185,0.9)";
    ctx.stroke();

    // bubbles clipped
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wavePts[0].x, wavePts[0].y);
    for (let i = 1; i < wavePts.length; i++) ctx.lineTo(wavePts[i].x, wavePts[i].y);
    ctx.lineTo(canvas.width, canvas.height + 20);
    ctx.lineTo(0, canvas.height + 20);
    ctx.closePath();
    ctx.clip();
    for (let b of bubbles) {
      const sx = b.x, sy = b.y - cameraY;
      if (sy > -10 && sy < canvas.height + 10) {
        const depth = Math.max(0, Math.min(1, (b.y - waterY) / BUBBLE_SPAWN_DEPTH));
        const alpha = 0.7 * (1 - depth) + 0.15;
        ctx.fillStyle = `rgba(185,231,255,${alpha.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(sx, sy, b.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    drawPlatformRipples(baseWaterScreenY);
  }

  // Pickups render (after water so they appear above it)
  drawPickups();

  // Shock VFX + fragments
  if (isZapping) {
    for (let b of zapBolts) {
      ctx.strokeStyle = `rgba(255,255,200,${(0.6 * b.life).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const segments = 4;
      ctx.moveTo(b.x1, b.y1 - cameraY);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const ix = b.x1 + (b.x2 - b.x1) * t + randRange(-3, 3);
        const iy = b.y1 + (b.y2 - b.y1) * t + randRange(-3, 3) - cameraY;
        ctx.lineTo(ix, iy);
      }
      ctx.stroke();
    }
    for (let f of fragPieces) {
      ctx.save();
      ctx.translate(f.x, f.y - cameraY);
      ctx.rotate(f.rot);
      ctx.fillStyle = f.color;
      ctx.fillRect(-f.w/2, -f.h/2, f.w, f.h);
      ctx.restore();
    }
  }

  // Respawn overlay
  if (awaitingRespawn) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("You shorted out!", canvas.width/2, canvas.height/2 - 14);
    ctx.font = "16px ui-monospace, monospace";
    ctx.fillText("Press any key to respawn", canvas.width/2, canvas.height/2 + 14);
  }

  // Fallback Game Over banner
  if (showFallbackGameOver && !document.getElementById("end-dialog")) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(canvas.width/2 - 140, canvas.height/2 - 60, 280, 120);
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px sans-serif";
    ctx.fillText("GAME OVER", canvas.width/2 - 60, canvas.height/2 - 20);
    ctx.font = "14px sans-serif";
    ctx.fillText("Press R to restart", canvas.width/2 - 70, canvas.height/2 + 10);
  }

  // Canvas HUD fallback if DOM missing
  if (!hasDomHud()) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";
    ctx.fillText(`Height: ${Math.floor(heightPx / PX_PER_FT)}'`, 10, 20);
    const wf = (startRefY - waterY) / PX_PER_FT;
    ctx.fillText(`Water: ${Math.round(wf)}' | ${(waterSpeedPx/PX_PER_FT).toFixed(1)} ft/s`, 10, 38);
    ctx.fillText(`I ${inventory.I}  O ${inventory.O}  P ${inventory.P}  J ${inventory.J}`, 10, 56);
  }
}

function drawHeadAndEyes(px, psY, w, h) {
  const headW = 20, headH = 10;
  const cx = px + w/2, top = psY - 6;
  ctx.fillStyle = "#cfd6de";
  ctx.beginPath();
  ctx.moveTo(cx - headW/2, top);
  ctx.quadraticCurveTo(cx, top - headH, cx + headW/2, top);
  ctx.lineTo(cx - headW/2, top);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();

  ctx.fillStyle = "#aab2bd";
  ctx.fillRect(cx - headW/2, top, headW, 3);

  const blink = eyeClosedMs > 0;
  const eyeSep = 8;
  const eyeY = top + 4;
  const pupilOffsetX = Math.max(-2, Math.min(2, eyeTargetX));
  const pupilOffsetY = Math.max(-1.5, Math.min(1.5, eyeTargetY));
  const waterNear = (player.y - waterY) < (player.height + 10);

  for (let s of [-1,1]) {
    const ex = cx + s * eyeSep/2;
    ctx.fillStyle = "#e9f0f6";
    ctx.beginPath();
    ctx.arc(ex, eyeY, 3, 0, Math.PI*2);
    ctx.fill();

    if (!blink) {
      ctx.fillStyle = waterNear ? "#2b4a72" : "#1b2a40";
      ctx.beginPath();
      ctx.arc(ex + pupilOffsetX*0.8, eyeY + pupilOffsetY*0.6, 1.5, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#1b2a40";
      ctx.beginPath();
      ctx.moveTo(ex-2, eyeY); ctx.lineTo(ex+2, eyeY); ctx.stroke();
    }
  }
}

function drawPlatformRipples(surfaceY) {
  const t = waveTime;
  for (let p of platforms) {
    if (p.broken) continue;
    const top = p.y - cameraY;
    const bottom = top + p.h;
    if (surfaceY < top - SURFACE_CONTACT_RANGE || surfaceY > bottom + SURFACE_CONTACT_RANGE) continue;

    const yAt = surfaceY;
    const drawEdge = (edgeX, dir) => {
      ctx.strokeStyle = `rgba(220,245,255,${FOAM_ALPHA})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const foamWiggle = Math.sin(t * 6 + edgeX * 0.06) * 2;
      ctx.moveTo(edgeX, yAt + foamWiggle);
      ctx.lineTo(edgeX + dir * 12, yAt + foamWiggle * 0.5);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const off = i * 7;
        const yy = yAt + i * 2 + Math.sin(t * 4 + off * 0.2) * 1;
        ctx.beginPath();
        ctx.moveTo(edgeX + dir * 2, yy);
        ctx.quadraticCurveTo(edgeX + dir * (RIPPLE_LEN * 0.7), yy - RIPPLE_HEIGHT, edgeX + dir * (RIPPLE_LEN + 6), yy);
        ctx.strokeStyle = `rgba(200,230,250,${(0.7 - i * 0.18).toFixed(2)})`;
        ctx.stroke();
      }
    };
    drawEdge(p.x, -1);
    drawEdge(p.x + p.w, +1);
  }
}

// ---------- Game Over ----------
function showGameOver() {
  const dlg = document.getElementById("end-dialog");
  const heightEl = document.getElementById("end-height");
  if (heightEl) heightEl.textContent = Math.floor(heightPx / PX_PER_FT);
  if (dlg && typeof dlg.showModal === "function") dlg.showModal();
  else showFallbackGameOver = true;
}
function endGame() { gameRunning = false; showGameOver(); }

// ---------- Pause controls exposed to menu.js ----------
window.setPaused = (p) => { paused = !!p; };

// ---------- Keyboard ----------
window.addEventListener("keydown", e => {
  // ESC toggles pause
  if (e.code === "Escape") { paused = !paused; return; }

  // game over restart
  if (e.code === "KeyR" && !gameRunning) { startGame({ seed, difficulty }); return; }

  // breath screen: any key to respawn
  if (awaitingRespawn) { performRespawn(); return; }

  if (!gameRunning || paused) return;

  keys.add(e.code);
  if (e.code === "Space") pistonCharging = true;

  // Activations
  if (e.code === "KeyI") tryActivate("I");
  else if (e.code === "KeyO") tryActivate("O");
  else if (e.code === "KeyP") tryActivate("P");
  else if (e.code === "KeyJ") tryActivate("J");
});
window.addEventListener("keyup", e => {
  if (!gameRunning || paused || awaitingRespawn) return;
  keys.delete(e.code);
  if (e.code === "Space") { pistonCharging = false; if (!effects.jetpack.active) jump(); }
});
