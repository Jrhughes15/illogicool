/* Facility Janitor — game with music/SFX hooks and badge tooltips preserved */
(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");

  const elSeed = document.getElementById("seedInput");
  const btnNew = document.getElementById("newRunBtn");
  const btnRestart = document.getElementById("restartBtn");

  const hudLevel = document.getElementById("hudLevel");
  const hudObjectives = document.getElementById("hudObjectives");
  const hudTools = document.getElementById("hudTools");
  const hudDeaths = document.getElementById("hudDeaths");
  const hudKeys = document.getElementById("hudKeys");
  const hudLight = document.getElementById("hudLight");
  const hudNoise = document.getElementById("hudNoise");
  const noiseFill = document.getElementById("noiseFill");
  const hudPar = document.getElementById("hudPar");

  // Modals
  const startModal = document.getElementById("startModal");
  const startSeedInput = document.getElementById("startSeedInput");
  const startSeedBtn = document.getElementById("startSeedBtn");
  const startRandomBtn = document.getElementById("startRandomBtn");
  const startTutorialBtn = document.getElementById("startTutorialBtn");

  const endModal = document.getElementById("endModal");
  const endRank = document.getElementById("endRank");
  const endScore = document.getElementById("endScore");
  const endSeed = document.getElementById("endSeed");
  const endBreakdown = document.getElementById("endBreakdown");
  const endFeats = document.getElementById("endFeats");
  const btnNextLevel = document.getElementById("btnNextLevel");
  const btnRetry = document.getElementById("btnRetry");
  const btnCopySeed = document.getElementById("btnCopySeed");
  const btnCopyShare = document.getElementById("btnCopyShare");
  const anotherSeedInput = document.getElementById("anotherSeedInput");
  const btnPlaySeed = document.getElementById("btnPlaySeed");
  const btnPlayRandom = document.getElementById("btnPlayRandom");

  // ---------- World constants ----------
  const WORLD_W = 1500;
  const WORLD_H = 800;
  const TILE = 32;
  const COLS = Math.floor(WORLD_W / TILE);
  const ROWS = Math.floor(WORLD_H / TILE);

  const FRICTION = 0.85;
  const PLAYER_SPEED = 2.8;
  const PLAYER_SNEAK_SPEED = 1.8;
  const PLAYER_RADIUS = 12;
  const RAYCOUNT = 115;

  const BASE_TOOLS = { decoy: 2, flash: 1, foam: 1, thrower: 3, shutdown: 1 };

  const DASH_SPEED = 7.0;
  const DASH_TIME = 0.18;
  const DASH_COOLDOWN = 1.6;

  // ---------- UI / Modal management (keeps your ARIA/inert approach) ----------
  const ui = { paused: false, modal: null, lastFocus: null, trapHandler: null };
  function getFocusable(container) {
    return [...container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }
  function trapTab(e) {
    if (ui.modal == null || e.key !== 'Tab') return;
    const focusables = getFocusable(ui.modal);
    if (focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openModal(modEl) {
    ui.paused = true; ui.modal = modEl;
    ui.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    modEl.classList.remove("hide");
    modEl.removeAttribute("aria-hidden");
    modEl.removeAttribute("inert");

    const first = getFocusable(modEl)[0];
    if (first) first.focus();

    ui.trapHandler = trapTab;
    document.addEventListener('keydown', ui.trapHandler, true);
    fitGameToViewport();

    // Music: modal state
    if (window.FJMusic) window.FJMusic.state({ modal: true });
  }
  function closeModal(modEl) {
    if (modEl.contains(document.activeElement)) (document.activeElement).blur();
    modEl.setAttribute("aria-hidden", "true");
    modEl.setAttribute("inert", "");
    modEl.classList.add("hide");

    if (ui.trapHandler) document.removeEventListener('keydown', ui.trapHandler, true);
    ui.trapHandler = null;

    const restore = ui.lastFocus && document.contains(ui.lastFocus) ? ui.lastFocus : btnNew;
    if (restore) restore.focus();

    ui.modal = null;
    ui.paused = false;
    fitGameToViewport();

    // Music: back to gameplay
    if (window.FJMusic) window.FJMusic.state({ modal: false });
  }

  // ---------- Scaling ----------
  let scale = 1;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  function fitGameToViewport() {
    const rect = stage.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) return;
    const availW = Math.max(10, rect.width - 2);
    const availH = Math.max(10, rect.height - 2);
    const newScale = Math.min(availW / WORLD_W, availH / WORLD_H, 1);
    if (!isFinite(newScale)) return;
    scale = newScale;
    const cssW = Math.floor(WORLD_W * scale);
    const cssH = Math.floor(WORLD_H * scale);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    const targetW = Math.floor(cssW * dpr);
    const targetH = Math.floor(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }
  window.addEventListener("resize", fitGameToViewport);
  window.addEventListener("orientationchange", fitGameToViewport);
  const ro = new ResizeObserver(() => fitGameToViewport());
  ro.observe(stage);
  function scheduleInitialFit() {
    const go = () => requestAnimationFrame(() => requestAnimationFrame(fitGameToViewport));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  // ---------- RNG ----------
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return function() {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededRng(seedStr) {
    const seedFn = xmur3(seedStr);
    const a = seedFn();
    return mulberry32(a);
  }

  // ---------- Helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx*dx + dy*dy; };
  const randInt = (rng, a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const choice = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const TWO_PI = Math.PI * 2;
  const angleNorm = a => { while (a <= -Math.PI) a += TWO_PI; while (a > Math.PI) a -= TWO_PI; return a; };
  const angleDiff = (a, b) => angleNorm(b - a);
  function turnToward(a, b, maxDelta) { const d = angleDiff(a, b); if (Math.abs(d) <= maxDelta) return b; return a + Math.sign(d) * maxDelta; }

  // ---------- Input ----------
  const keys = Object.create(null);
  function clearKeys() { for (const k of Object.keys(keys)) delete keys[k]; }
  const isTypingTarget = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

  window.addEventListener("keydown", e => {
    if (ui.paused || isTypingTarget(e.target)) return;
    if (e.code === "Space") { e.preventDefault(); tryDash(); return; }
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup","arrowdown","arrowleft","arrowright"].includes(k)) e.preventDefault();
    if (k === "f") { useThrowAt(mouse.x, mouse.y); e.preventDefault(); }
    if (k === "e") { tryShutdown(); e.preventDefault(); }
    if (k === "1") { e.preventDefault(); useDecoy(); }
    if (k === "2") { e.preventDefault(); useFlash(); }
    if (k === "3") { e.preventDefault(); useFoam(); }
  });
  window.addEventListener("keyup", e => {
    if (ui.paused || isTypingTarget(e.target)) return;
    keys[e.key.toLowerCase()] = false;
  });

  // Mouse for throwing
  const mouse = { x: WORLD_W/2, y: WORLD_H/2 };
  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / scale;
    mouse.y = (e.clientY - r.top) / scale;
  });
  canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); if (!ui.paused) useThrowAt(mouse.x, mouse.y); });

  // ---------- Tutorial state ----------
  const tutorial = { active: false, index: 1, total: 5, overlay: [] };
  const isTutorial = () => tutorial.active === true;

  // ---------- World state ----------
  let rng = seededRng("default");
  let levelIndex = 1;
  let deathsRun = 0;
  let deathsLevel = 0;

  const world = {
    seed: "default",
    grid: null, obstacles: [],
    samples: [],
    exit: {x:0,y:0,w:TILE,h:TILE},
    exitReady: false, exitPinged: false,
    enemies: [],
    initialEnemyCount: 0,
    clampKills: 0,
    beacons: [], foams: [], flashes: [], noises: [], throws: [],
    safeZones: [], keycards: [],
    ambientLight: 1.0,
    player: null,
    tools: null,
    spawn: {x: WORLD_W/2, y: WORLD_H/2},
    metrics: null,
    noiseLevel: 0,
    lastKillerThisTry: null
  };

  function newMetrics() {
    return {
      timeSec: 0, detections: 0, deaths: 0,
      toolUse: { decoy: 0, flash: 0, foam: 0, thrower: 0, shutdown: 0 },
      noiseEmit: 0, noiseMove: 0, safeSeconds: 0, distance: 0, dashCount: 0,
      parTime: 0, pathLen: 0,
      clampBonus: 0,
      lastClampTimeSec: -999,
      lastKillerIdPrevTry: null
    };
  }

  // ---------- Tiles / collisions ----------
  function rectsForGrid(grid) {
    const rects = [];
    if (!grid) return rects;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const t = grid[r][c];
        if (t === 1 || t === 2) rects.push({x: c*TILE, y: r*TILE, w: TILE, h: TILE, solid: true});
      }
    return rects;
  }
  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return (dx*dx + dy*dy) <= cr*cr;
  }
  function isSolidForLOS(r, c) {
    if (!world.grid) return true;
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
    const t = world.grid[r][c];
    return (t === 1 || t === 2);
  }

  // ---------- DDA raycast ----------
  function castRayDDA(x, y, angle, maxDist) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    let ix = Math.floor(x / TILE), iy = Math.floor(y / TILE);
    const nextGridX = dx > 0 ? (ix + 1) * TILE : ix * TILE;
    const nextGridY = dy > 0 ? (iy + 1) * TILE : iy * TILE;
    let tMaxX = dx !== 0 ? (nextGridX - x) / dx : Infinity;
    let tMaxY = dy !== 0 ? (nextGridY - y) / dy : Infinity;
    const tDeltaX = dx !== 0 ? TILE / Math.abs(dx) : Infinity;
    const tDeltaY = dy !== 0 ? TILE / Math.abs(dy) : Infinity;
    let tHit = 0, max = maxDist;
    while (tHit <= max) {
      if (tMaxX < tMaxY) { tHit = tMaxX; tMaxX += tDeltaX; ix += stepX; }
      else { tHit = tMaxY; tMaxY += tDeltaY; iy += stepY; }
      if (isSolidForLOS(iy, ix)) {
        const px = x + dx * Math.min(tHit, max);
        const py = y + dy * Math.min(tHit, max);
        return { x: px, y: py };
      }
      if (tHit > max) break;
    }
    return { x: x + dx * max, y: y + dy * max };
  }
  function visionPolygon(origin, dir, fov, range) {
    const pts = [];
    const start = dir - fov * 0.5;
    const step = fov / (RAYCOUNT - 1);
    for (let i = 0; i < RAYCOUNT; i++) {
      const a = start + i * step;
      pts.push(castRayDDA(origin.x, origin.y, a, range));
    }
    return pts;
  }

  // ---------- Entities ----------
  function makePlayer(spawn) {
    return {
      x: spawn.x, y: spawn.y, vx: 0, vy: 0, r: PLAYER_RADIUS, facing: 0,
      alive: true, sneak: false, invincibleTime: 0,
      dashT: 0, dashCd: 0, dashVX: 0, dashVY: 0,
      hiding: true, inSafe: false, autoUnhide: true
    };
  }
  const makeDecoy = (x,y) => ({ x, y, life: 8.0, pulse: 0, radius: 180 });
  const makeFoam = (x,y) => ({ x, y, r: 80, life: 10.0, slowMul: 0.45 });
  const makeFlash = (x,y) => ({ x, y, r: 120, life: 0.8 });
  const makeThrowObj = (x,y,vx,vy) => ({ x, y, vx, vy, r: 6, life: 3.2, stuck:false, pulse:0 });

  function makeEnemy(type, x, y, extra = {}) {
    const base = {
      type, x, y, r: 14, dir: 0, speed: 1.6, fov: Math.PI/3, view: 260,
      blind: 0, slow: 0, heardAt: null, patrol: [], patrolIndex: 0, wait: 0,
      rotSpeed: 1.2, wobble: 0, seeT: 0, dead: false,
      stuckFor: 0, lastX: x, lastY: y, wanderTarget: null, wanderT: 0,
      turnRate: 4.0, id: -1
    };
    if (type === "Patroller") { base.speed = 1.7; base.fov = Math.PI/2.8; base.view = 300; base.turnRate = 4.0; }
    if (type === "Sentry")    { base.speed = 0;   base.fov = Math.PI/2.2; base.view = 320; base.rotSpeed = 0.8 + Math.random()*0.6; base.dir = Math.random()*Math.PI*2; base.turnRate = 2.0; }
    if (type === "Seeker")    { base.speed = 2.0; base.fov = Math.PI/3;   base.view = 330; base.turnRate = 5.0; }
    if (type === "Slime")     { base.speed = 1.1; base.fov = Math.PI/2.5; base.view = 200; base.wobble = Math.random()*Math.PI*2; base.turnRate = 3.0; }
    if (type === "Camera")    { base.speed = 0;   base.fov = Math.PI/7;   base.view = 420; base.dir = Math.random()*Math.PI*2; base.rotSpeed = 0.9; base.turnRate = 1.2; }
    return Object.assign(base, extra);
  }

  // ---------- Generation helpers ----------
  function ccToPx(c) { return c*TILE + TILE/2; }
  function rrToPx(r) { return r*TILE + TILE/2; }
  function emptyGrid() {
    const g = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    for (let r=0;r<ROWS;r++){ g[r][0]=1; g[r][COLS-1]=1; }
    for (let c=0;c<COLS;c++){ g[0][c]=1; g[ROWS-1][c]=1; }
    return g;
  }
  function addRect(grid, c0, r0, w, h, val=2) {
    for (let r=r0; r<r0+h; r++)
      for (let c=c0; c<c0+w; c++)
        if (r>0 && c>0 && r<ROWS && c<COLS) grid[r][c] = val;
  }
  function randomFreeCell(grid, margin=0){
    let tries=0;
    while (tries++<400){
      const r = 2 + Math.floor(Math.random()*(ROWS-4));
      const c = 2 + Math.floor(Math.random()*(COLS-4));
      let ok = true;
      for (let rr=r-margin; rr<=r+margin; rr++)
        for (let cc=c-margin; cc<=c+margin; cc++)
          if (grid[rr]?.[cc] !== 0) ok = false;
      if (ok) return {r,c};
    }
    return {r:6, c:6};
  }

  // ---------- Procedural Level Gen ----------
  function seededProcLevel(seedStr, levelNum) {
    const rnd = seededRng(seedStr + ":" + levelNum);
    rng = rnd;
    const grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));

    // border
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (r === 0 || c === 0 || r === ROWS-1 || c === COLS-1) grid[r][c] = 1;

    // blocks
    const blocks = 12 + Math.floor(rng() * 7);
    for (let i = 0; i < blocks; i++) {
      const w = 2 + Math.floor(rng()*5), h = 2 + Math.floor(rng()*4);
      const c0 = 2 + Math.floor(rng()*(COLS - w - 2));
      const r0 = 2 + Math.floor(rng()*(ROWS - h - 2));
      for (let rr = 0; rr < h; rr++) for (let cc = 0; cc < w; cc++) grid[r0+rr][c0+cc] = 2;
    }

    // carve corridor start->end
    const startCell = {c:2, r:2};
    const endCell = {c: COLS-3, r: ROWS-3};
    function carveLine(c1, r1, c2, r2) {
      let c = c1, r = r1;
      while (c !== c2 || r !== r2) {
        grid[r][c] = 0;
        if (rng() < 0.5) c += Math.sign(c2 - c); else r += Math.sign(r2 - r);
        grid[r][c] = 0;
      }
    }
    carveLine(startCell.c, startCell.r, endCell.c, startCell.r);
    carveLine(endCell.c, startCell.r, endCell.c, endCell.r);
    grid[endCell.r][endCell.c] = 3;

    const obstacles = rectsForGrid(grid);

    // Safe Zones + Keycards
    const safeZones = [];
    const keycards = [];
    const zoneCount = 1 + (levelNum > 2 ? 1 : 0) + (rng() < 0.35 ? 1 : 0);
    function randomFreeCellProc(margin=0){
      let tries=0;
      while (tries++<500){
        const r = 2 + Math.floor(rng()*(ROWS-4));
        const c = 2 + Math.floor(rng()*(COLS-4));
        let ok = true;
        for (let rr=r-margin; rr<=r+margin; rr++)
          for (let cc=c-margin; cc<=c+margin; cc++)
            if (grid[rr]?.[cc] !== 0) ok = false;
        if (ok) return {r,c};
      }
      return {r:6, c:6};
    }
    const ccToPxP = c => c*TILE + TILE/2;
    const rrToPxP = r => r*TILE + TILE/2;

    for (let i=0;i<zoneCount;i++){
      const {r,c} = randomFreeCellProc(1);
      const hue = Math.floor(rng()*360);
      const zone = { x: c*TILE, y: r*TILE, w: 2*TILE, h: 2*TILE, hue, unlocked: false, visitedInside: false };
      safeZones.push(zone);
      let placed = false, tries = 0;
      while (!placed && tries++ < 500) {
        const kc = randomFreeCellProc(0);
        const x = ccToPxP(kc.c), y = rrToPxP(kc.r);
        if (!(x > zone.x && x < zone.x+zone.w && y > zone.y && y < zone.y+zone.h)) {
          keycards.push({ x, y, phase: rng()*Math.PI*2, taken: false, hue });
          placed = true;
        }
      }
    }

    // research items
    const sampleCount = 3 + Math.min(3, Math.floor(levelNum/2));
    const samples = [];
    function researchItem() {
      let tries = 0;
      while (tries++ < 500) {
        const {r,c} = randomFreeCellProc(0);
        if ((Math.abs(c - startCell.c) + Math.abs(r - startCell.r)) > 4) {
          const N = 16 + Math.floor(rng()*7) + 8;
          const pattern = [];
          for (let k=0;k<N;k++){
            pattern.push({ x: (rng()*12-6), y: (rng()*10-5), len: rng()<0.35 ? 0 : (3 + rng()*7) });
          }
          return {x: ccToPxP(c), y: rrToPxP(r), phase: rng()*Math.PI*2, collected:false, pattern};
        }
      }
      return {x: 6*TILE, y: 6*TILE, phase: 0, collected:false, pattern:[]};
    }
    for (let i = 0; i < sampleCount; i++) samples.push(researchItem());

    // enemies
    const enemies = [];
    const pool = ["Patroller","Sentry","Seeker","Slime","Camera"];
    const enemyCount = 6 + Math.min(7, levelNum);
    for (let i = 0; i < enemyCount; i++) {
      const t = choice(rng, pool);
      const {r,c} = randomFreeCellProc(1);
      const s = {x: ccToPxP(c), y: rrToPxP(r)};
      let patrol = [];
      if (t === "Patroller") patrol = makePatrolLoop(grid);
      else if (t === "Seeker") if (rng() < 0.4) patrol = makePatrolLoop(grid);
      const e = makeEnemy(t, s.x, s.y, {patrol});
      e.id = i;
      enemies.push(e);
    }

    const exit = {x: (COLS-3)*TILE, y: (ROWS-3)*TILE, w: TILE, h: TILE};
    const spawn = {x: ccToPxP(2), y: rrToPxP(2)};
    const ambientLight = 0.65 + rng()*0.35;

    return {grid, obstacles, samples, enemies, keycards, safeZones, exit, spawn, ambientLight};
  }
  function makePatrolLoop(grid){
    const center = randomFreeCell(grid, 2);
    const cx = ccToPx(center.c);
    const cy = rrToPx(center.r);
    const nodes = [];
    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
    for (let i=0;i<4;i++){
      const dist = 90 + Math.random()*120;
      const x = cx + Math.cos(angles[i]) * dist;
      const y = cy + Math.sin(angles[i]) * dist;
      nodes.push(snapToFree(grid, x, y));
    }
    return nodes;
  }
  function snapToFree(grid, x, y){
    let r = Math.round(y/TILE), c = Math.round(x/TILE);
    if (grid[r]?.[c] === 0) return {x:ccToPx(c), y:rrToPx(r)};
    for (let rad=1; rad<=3; rad++){
      for (let rr=r-rad; rr<=r+r+rad; rr++)
        for (let cc=c-rad; cc<=c+c+rad; cc++)
          if (grid[rr]?.[cc] === 0) return {x:ccToPx(cc), y:rrToPx(rr)};
    }
    return {x, y};
  }

  // ---------- Tutorial Levels ----------
  function tutorialLevel(n) {
    const grid = emptyGrid();
    const ambientLight = 0.9;
    const samples = [];
    const enemies = [];
    const safeZones = [];
    const keycards = [];
    let spawn = { x: ccToPx(3), y: rrToPx(3) };
    let exit  = { x: (COLS-4)*TILE, y: (ROWS-4)*TILE, w: TILE, h: TILE };
    function add(c0,r0,w,h){ addRect(grid,c0,r0,w,h,2); }
    function clear(c0,r0,w,h){ addRect(grid,c0,r0,w,h,0); }

    if (n === 1) {
      add(8,2,1,ROWS-4); add(16,6,1,ROWS-12); add(24,4,1,ROWS-8);
      spawn = { x: ccToPx(3), y: rrToPx(4) };
      samples.push({ x: ccToPx(12), y: rrToPx(6), phase: 0, collected:false, pattern: dotsAndDashes(18) });
      exit = { x: (COLS-6)*TILE, y: (ROWS-6)*TILE, w: TILE, h: TILE };
      const s = makeEnemy("Sentry", ccToPx(20), rrToPx(10), { dir: Math.PI * 0.25, rotSpeed: 0.6 });
      s.id = 0; enemies.push(s);
      tutorial.overlay = [
        "T1 — Move & Hide",
        "• Move with WASD / Arrows. Hold T to hide; you start hidden.",
        "• Vision cones are blocked by walls (pillars help you pass).",
        "• Collect the research, then head for the green exit."
      ];
    }
    if (n === 2) {
      add(10,2,1,ROWS-4); add(18,2,1,ROWS-4); clear(14,9,1,2);
      spawn = { x: ccToPx(4), y: rrToPx(10) };
      samples.push({ x: ccToPx(22), y: rrToPx(10), phase: 0, collected:false, pattern: dotsAndDashes(22) });
      exit = { x: (COLS-5)*TILE, y: rrToPx(10)-TILE/2, w: TILE, h: TILE };
      const seeker = makeEnemy("Seeker", ccToPx(16), rrToPx(10), { dir: 0 });
      seeker.id = 0; enemies.push(seeker);
      tutorial.overlay = [
        "T2 — Distractions",
        "• Press F or Right-Click to throw a noise beacon.",
        "• Seekers investigate the noise. Lure it away, then slip by.",
        "• You have limited throws in tutorials—use them smartly."
      ];
    }
    if (n === 3) {
      add(8,6,10,1); add(8,6,1,8); add(17,6,1,8); add(8,13,10,1); clear(12,6,1,1);
      spawn = { x: ccToPx(5), y: rrToPx(10) };
      const hue = 45;
      safeZones.push({ x: ccToPx(9)-TILE/2, y: rrToPx(9)-TILE/2, w: 2*TILE, h: 2*TILE, hue, unlocked: false, visitedInside: false });
      keycards.push({ x: ccToPx(14), y: rrToPx(8), phase: 0, taken:false, hue });
      samples.push({ x: ccToPx(22), y: rrToPx(10), phase: 0, collected:false, pattern: dotsAndDashes(20) });
      exit = { x: (COLS-6)*TILE, y: rrToPx(10)-TILE/2, w: TILE, h: TILE };
      const pat = makeEnemy("Patroller", ccToPx(20), rrToPx(10), { patrol: [
        { x: ccToPx(20), y: rrToPx(8) },
        { x: ccToPx(24), y: rrToPx(8) },
        { x: ccToPx(24), y: rrToPx(12)},
        { x: ccToPx(20), y: rrToPx(12)}
      ]});
      pat.id = 0; enemies.push(pat);
      tutorial.overlay = [
        "T3 — Safe Zones & Cards",
        "• Pick up the keycard; it unlocks the matching Safe Zone border.",
        "• Step inside a Safe Zone to be unseen and refresh tools.",
        "• Exit lights only after research + visiting the unlocked Safe Zone."
      ];
    }
    if (n === 4) {
      add(10,4,14,1); add(10,12,14,1); add(10,4,1,9); add(23,4,1,9); clear(10,8,1,1);
      spawn = { x: ccToPx(6), y: rrToPx(8) };
      samples.push({ x: ccToPx(26), y: rrToPx(8), phase: 0, collected:false, pattern: dotsAndDashes(24) });
      exit = { x: (COLS-5)*TILE, y: rrToPx(8)-TILE/2, w: TILE, h: TILE };
      const pat = makeEnemy("Patroller", ccToPx(17), rrToPx(8), { patrol: [
        { x: ccToPx(13), y: rrToPx(6) },
        { x: ccToPx(21), y: rrToPx(6) },
        { x: ccToPx(21), y: rrToPx(10)},
        { x: ccToPx(13), y: rrToPx(10)}
      ]});
      pat.id = 0; enemies.push(pat);
      tutorial.overlay = [
        "T4 — Tool Trio",
        "• Beacon (1): lure patrols off-path.",
        "• Flash (2): blind nearby.",
        "• Foam (3): slow zones.",
      ];
    }
    if (n === 5) {
      add(10,2,1,ROWS-4); add(20,2,1,ROWS-4); clear(15,8,1,2);
      spawn = { x: ccToPx(5), y: rrToPx(10) };
      samples.push({ x: ccToPx(24), y: rrToPx(10), phase: 0, collected:false, pattern: dotsAndDashes(26) });
      exit = { x: (COLS-4)*TILE, y: rrToPx(10)-TILE/2, w: TILE, h: TILE };
      const cam = makeEnemy("Camera", ccToPx(15), rrToPx(6), { dir: Math.PI/2, rotSpeed: 0.7 });
      cam.id = 0; enemies.push(cam);
      const seeker = makeEnemy("Seeker", ccToPx(17), rrToPx(10), {});
      seeker.id = 1; enemies.push(seeker);
      tutorial.overlay = [
        "T5 — Shutdown Clamp",
        "• Press E while touching a hostile to clamp (disable) it.",
        "• Cameras can be clamped too.",
      ];
    }

    const obstacles = rectsForGrid(grid);
    return { grid, obstacles, samples, enemies, keycards, safeZones, exit, spawn, ambientLight };
  }
  function dotsAndDashes(N){
    const arr=[];
    for (let k=0;k<N;k++){
      arr.push({ x: (Math.random()*12-6), y: (Math.random()*10-5), len: Math.random()<0.35 ? 0 : (3 + Math.random()*7) });
    }
    return arr;
  }

  // ---------- HUD ----------
  const toMMSS = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${s.toString().padStart(2,"0")}`; };
  function updateHUD(){
    hudLevel.textContent = isTutorial() ? `Tutorial ${tutorial.index}/${tutorial.total}` : `Level ${levelIndex}`;
    const got = world.samples.filter(s => s.collected).length;
    const unlocked = world.safeZones.filter(z => z.unlocked).length;
    hudObjectives.textContent = "Research " + got + "/" + world.samples.length;
    hudTools.textContent = `Beacon:${world.tools.decoy}  Pulse:${world.tools.flash}  Foam:${world.tools.foam}  Throws:${world.tools.thrower}  Clamp:${world.tools.shutdown}`;
    hudDeaths.textContent = `Deaths L:${deathsLevel} / Run:${deathsRun}`;
    hudKeys.textContent = "Cards " + unlocked + "/" + world.safeZones.length;
    hudLight.textContent = "Light " + Math.round(world.ambientLight * 100) + "%";
    const totalNoise = Math.round((world.metrics ? (world.metrics.noiseEmit + world.metrics.noiseMove) : 0));
    hudNoise.textContent = "Noise " + totalNoise.toLocaleString();
    const par = world.metrics?.parTime || 0;
    hudPar.textContent = "Par " + toMMSS(par);
  }

  // ---------- Setup / reset ----------
  function resetLevel(seed, index, opts={ startHidden: true, preserveMetrics: false }) {
    let gen;
    if (isTutorial()) gen = tutorialLevel(tutorial.index);
    else gen = seededProcLevel(seed, index);

    world.grid = gen.grid;
    world.obstacles = gen.obstacles;
    world.samples = gen.samples;
    world.enemies = gen.enemies;
    world.initialEnemyCount = gen.enemies.length;
    world.clampKills = 0;
    world.keycards = gen.keycards;
    world.safeZones = gen.safeZones;
    world.exit = gen.exit;
    world.beacons = [];
    world.foams = [];
    world.flashes = [];
    world.noises = [];
    world.throws = [];
    world.ambientLight = gen.ambientLight;
    world.exitReady = false;
    world.exitPinged = false;
    world.spawn = { ...gen.spawn };

    world.noiseLevel = 0;
    noiseFill.style.width = "0%";

    if (!(opts && opts.preserveMetrics && world.metrics)) {
      world.metrics = newMetrics();
    }

    // tools
    if (isTutorial()) {
      const t = tutorial.index;
      if (t === 1) world.tools = { decoy:0, flash:0, foam:0, thrower:0, shutdown:0 };
      if (t === 2) world.tools = { decoy:0, flash:0, foam:0, thrower:2, shutdown:0 };
      if (t === 3) world.tools = { decoy:0, flash:0, foam:0, thrower:1, shutdown:0 };
      if (t === 4) world.tools = { decoy:1, flash:1, foam:1, thrower:0, shutdown:0 };
      if (t === 5) world.tools = { decoy:0, flash:0, foam:0, thrower:0, shutdown:2 };
    } else {
      world.tools = {...BASE_TOOLS};
    }

    world.player = makePlayer(gen.spawn);
    if (!opts.startHidden) { world.player.hiding = false; world.player.autoUnhide = false; }

    computeParTime();
    clearKeys();
    fitGameToViewport();
    updateHUD();

    // Inform music about state
    if (window.FJMusic) window.FJMusic.state({ modal:false, inSafe:false, hiding:true, tension:0 });
  }

  function startNewRun(seedStr){
    tutorial.active = false;
    world.seed = seedStr && seedStr.trim() ? seedStr.trim() : String(Math.random()).slice(2);
    elSeed.value = world.seed;
    levelIndex=1; deathsRun=0; deathsLevel=0;
    world.metrics = newMetrics();
    resetLevel(world.seed, levelIndex, { startHidden: true, preserveMetrics: true });
  }
  function startTutorial(){
    tutorial.active = true;
    tutorial.index = 1;
    levelIndex = 1;
    deathsRun = 0; deathsLevel = 0;
    world.seed = "TUTORIAL";
    world.metrics = newMetrics();
    resetLevel(world.seed, levelIndex, { startHidden: true, preserveMetrics: true });
  }
  function redeploy(){
    deathsRun++; deathsLevel++;
    if (world.metrics) { world.metrics.deaths++; world.metrics.detections++; }
    if (window.FJMusic) window.FJMusic.sfx('death');
    resetLevel(world.seed, levelIndex, { startHidden: true, preserveMetrics: true });
    world.player.invincibleTime = 1.0;
    updateHUD();
  }

  // ---------- Noise & tools ----------
  function emitNoise(x, y, r){
    world.noises.push({x, y, r, life: 0.33});
    if (world.metrics) world.metrics.noiseEmit += r;
    world.noiseLevel = clamp(world.noiseLevel + Math.min(1, r / 220) * 0.75, 0, 1.5);
  }
  function useDecoy(){ if (world.tools.decoy<=0) return; world.tools.decoy--; if (world.metrics) world.metrics.toolUse.decoy++; const p=world.player; world.beacons.push(makeDecoy(p.x,p.y)); emitNoise(p.x,p.y,220); updateHUD(); if (window.FJMusic) window.FJMusic.sfx('beacon'); }
  function useFlash(){ if (world.tools.flash<=0) return; world.tools.flash--; if (world.metrics) world.metrics.toolUse.flash++; const p=world.player; world.flashes.push(makeFlash(p.x,p.y)); emitNoise(p.x,p.y,60); updateHUD(); if (window.FJMusic) window.FJMusic.sfx('flash'); }
  function useFoam(){ if (world.tools.foam<=0) return; world.tools.foam--; if (world.metrics) world.metrics.toolUse.foam++; const p=world.player; world.foams.push(makeFoam(p.x,p.y)); updateHUD(); if (window.FJMusic) window.FJMusic.sfx('foam'); }
  function useThrowAt(tx, ty){
    if (world.tools.thrower <= 0) return;
    world.tools.thrower--; if (world.metrics) world.metrics.toolUse.thrower++;
    const p = world.player;
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const spd = 6.8;
    const vx = (dx / d) * spd, vy = (dy / d) * spd;
    world.throws.push(makeThrowObj(p.x, p.y, vx, vy));
    emitNoise(p.x, p.y, 120);
    updateHUD();
    if (window.FJMusic) window.FJMusic.sfx('throw');
  }
  const CLAMP_BONUS = { Seeker:150, Patroller:110, Sentry:90, Camera:120, Slime:60 };
  function tryShutdown(){
    if (world.tools.shutdown <= 0) return;
    const p = world.player;
    let idx = -1;
    for (let i=0;i<world.enemies.length;i++){
      const e = world.enemies[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) <= e.r + p.r + 4) { idx = i; break; }
    }
    if (idx !== -1){
      const e = world.enemies[idx];
      world.tools.shutdown--;
      if (world.metrics) {
        world.metrics.toolUse.shutdown++;
        let bonus = CLAMP_BONUS[e.type] || 60;
        world.metrics.clampBonus += bonus;
      }
      world.enemies.splice(idx,1);
      world.clampKills++;
      emitNoise(p.x, p.y, 20);
      updateHUD();
      if (window.FJMusic) window.FJMusic.sfx('clamp');
    }
  }

  // ---------- Dash ----------
  function tryDash(){
    const p = world.player;
    if (p.dashCd > 0 || p.dashT > 0) return;
    const ax = (keys["d"]||keys["arrowright"]?1:0) - (keys["a"]||keys["arrowleft"]?1:0);
    const ay = (keys["s"]||keys["arrowdown"]?1:0) - (keys["w"]||keys["arrowup"]?1:0);
    let nx = ax, ny = ay;
    if (nx === 0 && ny === 0) { nx = Math.cos(p.facing); ny = Math.sin(p.facing); }
    const mag = Math.hypot(nx, ny) || 1;
    p.dashVX = (nx / mag) * DASH_SPEED;
    p.dashVY = (ny / mag) * DASH_SPEED;
    p.dashT = DASH_TIME;
    p.dashCd = DASH_COOLDOWN;
    if (world.metrics) world.metrics.dashCount++;
    emitNoise(p.x, p.y, 60);
  }

  // ---------- Player / Sim ----------
  function playerIsHidden(p){
    if (!p) return true;
    if (p.hiding) return true;
    for (const z of world.safeZones){
      if (!z.unlocked) continue;
      if (p.x > z.x && p.x < z.x + z.w && p.y > z.y && p.y < z.y + z.h) return true;
    }
    return false;
  }
  function moveCircleAgainstRects(e, speedMul=1){
    const r = e.r;
    let nx = e.x + e.vx * speedMul;
    let ny = e.y + e.vy * speedMul;
    nx = clamp(nx, r+1, WORLD_W - r - 1);
    ny = clamp(ny, r+1, WORLD_H - r - 1);

    for (const o of world.obstacles) {
      if (circleRectCollide(nx, ny, r, o.x, o.y, o.w, o.h)) {
        const left = Math.abs((o.x) - (nx + r));
        const right = Math.abs((o.x + o.w) - (nx - r));
        const top = Math.abs((o.y) - (ny + r));
        const bottom = Math.abs((o.y + o.h) - (ny - r));
        const m = Math.min(left,right,top,bottom);
        if (m===left) nx = o.x - r; else if (m===right) nx = o.x + o.w + r; else if (m===top) ny = o.y - r; else ny = o.y + o.h + r;
      }
    }
    e.x = nx; e.y = ny;
  }
  function enemyUpdate(dt, e, p){
    const speedMul = e.slow>0 ? 0.45 : 1;
    e.blind = Math.max(0, e.blind - dt);
    e.slow  = Math.max(0, e.slow  - dt);

    for (const f of world.flashes) if (dist2(e.x,e.y,f.x,f.y) <= f.r*f.r) e.blind = Math.max(e.blind, 1.2);
    for (const m of world.foams)   if (dist2(e.x,e.y,m.x,m.y) <= m.r*m.r) e.slow  = Math.max(e.slow, 0.2);

    let heard=null, best=Infinity;
    for (const b of world.beacons){ const d2b=dist2(e.x,e.y,b.x,b.y); if (d2b<b.radius*b.radius && d2b<best){ heard={x:b.x,y:b.y}; best=d2b; } }
    const playerNoise = p && p.sneak ? 50 : 120;
    if (p && !p.sneak && (p.vx!==0 || p.vy!==0)){ const d2p=dist2(e.x,e.y,p.x,p.y); if (d2p<playerNoise*playerNoise && d2p<best){ heard={x:p.x,y:p.y}; best=d2p; } }
    for (const n of world.noises){ const d2n=dist2(e.x,e.y,n.x,n.y); if (d2n<n.r*n.r && d2n<best){ heard={x:n.x,y:n.y}; best=d2n; } }

    const moved = Math.hypot(e.x - e.lastX, e.y - e.lastY);
    e.stuckFor = moved < 0.05 ? e.stuckFor + dt : 0;
    e.lastX = e.x; e.lastY = e.y;

    if (e.type === "Sentry" || e.type === "Camera"){
      e.dir += e.rotSpeed * dt * (e.ping ? -1 : 1);
      if (e.dir > Math.PI*2) e.dir -= Math.PI*2;
      if (e.dir < 0)         e.dir += Math.PI*2;
      e.vx=0; e.vy=0; moveCircleAgainstRects(e, speedMul); return;
    }
    if (e.type === "Slime"){
      e.wobble += dt * 0.8;
      e.dir += Math.sin(e.wobble) * 0.02;
      e.vx = Math.cos(e.dir) * e.speed;
      e.vy = Math.sin(e.dir) * e.speed;
      moveCircleAgainstRects(e, speedMul); return;
    }
    if (e.type === "Seeker"){
      if (heard) e.heardAt = heard;
      if (e.heardAt){
        const tx=e.heardAt.x, ty=e.heardAt.y;
        const ang = Math.atan2(ty-e.y, tx-e.x);
        e.dir = turnToward(e.dir, ang, e.turnRate*dt);
        e.vx = Math.cos(e.dir) * e.speed;
        e.vy = Math.sin(e.dir) * e.speed;
        moveCircleAgainstRects(e, speedMul);
        if (Math.hypot(e.x-tx, e.y-ty) < 14){ e.heardAt=null; e.wait=1.0; }
        return;
      }
      if (e.patrol.length > 0){
        const t = e.patrol[e.patrolIndex];
        if (e.wait > 0){ e.wait -= dt; e.vx=0; e.vy=0; }
        else {
          const ang = Math.atan2(t.y-e.y, t.x-e.x);
          e.dir = turnToward(e.dir, ang, e.turnRate*dt);
          e.vx = Math.cos(e.dir) * e.speed;
          e.vy = Math.sin(e.dir) * e.speed;
          moveCircleAgainstRects(e, speedMul);
          if (Math.hypot(e.x-t.x, e.y-t.y) < 18){ e.patrolIndex = (e.patrolIndex+1)%e.patrol.length; e.wait=0.35; }
        }
        return;
      }
      e.wanderT -= dt;
      if (!e.wanderTarget || e.wanderT <= 0 || Math.hypot(e.x-e.wanderTarget.x, e.y-e.wanderTarget.y) < 18){
        const ang = (Math.random()*Math.PI*2), dist = 160 + Math.random()*240;
        e.wanderTarget = snapToFree(world.grid, e.x + Math.cos(ang)*dist, e.y + Math.sin(ang)*dist);
        e.wanderT = 2 + Math.random()*3;
      }
      const ang = Math.atan2(e.wanderTarget.y-e.y, e.wanderTarget.x-e.x);
      e.dir = turnToward(e.dir, ang, e.turnRate*dt);
      e.vx = Math.cos(e.dir) * e.speed;
      e.vy = Math.sin(e.dir) * e.speed;
      moveCircleAgainstRects(e, speedMul);
      return;
    }
    // Patroller
    if (e.patrol.length > 0){
      const t = e.patrol[e.patrolIndex];
      if (e.wait > 0){ e.wait -= dt; e.vx=0; e.vy=0; }
      else {
        const ang = Math.atan2(t.y-e.y, t.x-e.x);
        e.dir = turnToward(e.dir, ang, e.turnRate*dt);
        e.vx = Math.cos(e.dir) * e.speed;
        e.vy = Math.sin(e.dir) * e.speed;
        moveCircleAgainstRects(e, speedMul);
        const near = Math.hypot(e.x-t.x, e.y-t.y) < 18;
        const stuck = e.stuckFor > 0.9;
        if (near || stuck) { e.patrolIndex = (e.patrolIndex+1)%e.patrol.length; e.wait=0.35; e.stuckFor=0; }
      }
    } else { e.vx=0; e.vy=0; moveCircleAgainstRects(e, speedMul); }
  }

  function playerUpdate(dt, p){
    if (!p) return;
    const moveKeyDown = (keys["w"]||keys["arrowup"]||keys["s"]||keys["arrowdown"]||keys["a"]||keys["arrowleft"]||keys["d"]||keys["arrowright"]);
    if (p.autoUnhide) {
      p.hiding = true;
      if (moveKeyDown) { p.autoUnhide = false; p.hiding = false; }
    } else {
      p.hiding = !!keys["t"];
    }

    p.dashCd = Math.max(0, p.dashCd - dt);
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashVX;
      p.vy = p.dashVY;
    } else if (!p.hiding) {
      const up=keys["w"]||keys["arrowup"], down=keys["s"]||keys["arrowdown"], left=keys["a"]||keys["arrowleft"], right=keys["d"]||keys["arrowright"];
      const sneak = keys["shift"]; p.sneak = !!sneak;
      const ax=(right?1:0)-(left?1:0), ay=(down?1:0)-(up?1:0);
      const mag=Math.hypot(ax,ay);
      const maxSpeed=p.sneak?PLAYER_SNEAK_SPEED:PLAYER_SPEED;
      if (mag>0){ const nx=ax/mag, ny=ay/mag; p.vx=lerp(p.vx, nx*maxSpeed, 0.6); p.vy=lerp(p.vy, ny*maxSpeed, 0.6); p.facing=Math.atan2(p.vy,p.vx); }
      else { p.vx*=FRICTION; p.vy*=FRICTION; if (Math.hypot(p.vx,p.vy)<0.05){ p.vx=0; p.vy=0; } }
    } else {
      p.vx = 0; p.vy = 0;
    }

    const preX = p.x, preY = p.y;
    moveCircleAgainstRects(p,1);
    const dx = p.x - preX, dy = p.y - preY;
    const stepDist = Math.hypot(dx, dy);
    if (world.metrics) {
      world.metrics.distance += stepDist;
      if (!p.sneak && stepDist > 0.01) {
        const add = stepDist * (60/32);
        world.metrics.noiseMove += add;
        world.noiseLevel = clamp(world.noiseLevel + stepDist * 0.012, 0, 1.5);
      }
    }

    // keycards
    for (const k of world.keycards){
      if (!k.taken && Math.hypot(p.x-k.x,p.y-k.y)<16){
        k.taken=true;
        for (const z of world.safeZones){ if (z.hue === k.hue) z.unlocked = true; }
        world.tools = isTutorial() ? world.tools : {...BASE_TOOLS};
        updateHUD();
        if (window.FJMusic) window.FJMusic.sfx('card');
      }
    }

    const wasSafe = p.inSafe;
    p.inSafe = false;
    for (const z of world.safeZones){
      const inside = z.unlocked && p.x > z.x && p.x < z.x+z.w && p.y > z.y && p.y < z.y+z.h;
      if (inside) { p.inSafe = true; z.visitedInside = true; }
    }
    if (!wasSafe && p.inSafe) {
      world.tools = isTutorial() ? world.tools : {...BASE_TOOLS};
      updateHUD();
      if (window.FJMusic) window.FJMusic.sfx('safe');
    }
    if (p.inSafe && world.metrics) world.metrics.safeSeconds += dt;

    // research pickup
    for (const s of world.samples){
      if (!s.collected && Math.hypot(p.x-s.x,p.y-s.y)<18){
        s.collected=true;
        emitNoise(p.x,p.y,40);
        updateHUD();
        if (window.FJMusic) window.FJMusic.sfx('pickup');
      }
    }

    // exit ready
    let ready = world.samples.every(s=>s.collected);
    if (isTutorial() && tutorial.index === 3) {
      const anyVisited = world.safeZones.some(z => z.unlocked && z.visitedInside);
      ready = ready && anyVisited;
    }
    world.exitReady = ready;

    if (world.exitReady && !world.exitPinged){
      world.exitPinged = true;
      const cx = world.exit.x + world.exit.w/2;
      const cy = world.exit.y + world.exit.h/2;
      emitNoise(cx, cy, 240);
      if (window.FJMusic) window.FJMusic.sfx('exit');
    }
    if (world.exitReady && circleRectCollide(p.x,p.y,p.r, world.exit.x,world.exit.y,world.exit.w,world.exit.h)) {
      nextLevel();
      ui.paused = true;
    }
  }

  function throwSolidHit(nx, ny, r){
    for (const o of world.obstacles) if (circleRectCollide(nx, ny, r, o.x, o.y, o.w, o.h)) return true;
    return false;
  }

  function checkDetection(e, p) {
    if (!p || !p.alive) return false;
    if (p.invincibleTime > 0) return false;
    if (playerIsHidden(p)) return false;

    const lightMul = (e.type === "Camera") ? 1.0 : (0.7 + 0.6 * world.ambientLight);
    const maxRange = e.view * lightMul;

    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRange) return false;

    const angToPlayer = Math.atan2(dy, dx);
    const adiff = Math.abs(angleDiff(e.dir, angToPlayer));
    if (adiff > e.fov * 0.5) return false;

    const hit = castRayDDA(e.x, e.y, angToPlayer, dist);
    const d2end = Math.hypot(hit.x - p.x, hit.y - p.y);
    return d2end < 1.5;
  }

  // ---------- Tension for music ----------
  function computeTension() {
    const p = world.player;
    if (!p) return 0;
    let t = 0;
    for (const e of world.enemies) {
      const lightMul = (e.type === "Camera") ? 1.0 : (0.7 + 0.6 * world.ambientLight);
      const range = e.view * lightMul;
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;
      const ang = Math.atan2(dy, dx);
      const ad = Math.abs(angleDiff(e.dir, ang));
      if (ad > e.fov * 0.5) continue;

      const hit = castRayDDA(e.x, e.y, ang, dist);
      const blocked = Math.hypot(hit.x - p.x, hit.y - p.y) > 2.0;
      let u = 1 - (dist / Math.max(1, range));
      if (blocked) u *= 0.25;
      t = Math.max(t, u);
    }
    if (p.inSafe) t *= 0.2;
    if (p.hiding) t *= 0.5;
    return clamp(t, 0, 1);
  }

  // ---------- Scoring ----------
  function bfsShortestPixels(ax, ay, bx, by) {
    if (!world.grid) return Math.hypot(bx-ax, by-ay);
    const sr = Math.floor(ay / TILE), sc = Math.floor(ax / TILE);
    const tr = Math.floor(by / TILE), tc = Math.floor(bx / TILE);
    const key = (r,c) => (r<<12)|c;

    const q = [];
    const seen = new Map();
    q.push([sr, sc]); seen.set(key(sr,sc), null);

    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    while (q.length) {
      const [r,c] = q.shift();
      if (r === tr && c === tc) {
        let steps = 0, cur = key(r,c);
        while (seen.get(cur) !== null) { steps++; cur = seen.get(cur); }
        return steps * TILE;
      }
      for (const [dr,dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr<0||nc<0||nr>=ROWS||nc>=COLS) continue;
        if (world.grid[nr][nc] !== 0) continue;
        const k = key(nr,nc);
        if (seen.has(k)) continue;
        seen.set(k, key(r,c));
        q.push([nr,nc]);
      }
    }
    return Math.hypot(bx-ax, by-ay);
  }
  function approxRouteLenFromSpawn() {
    const start = world.spawn || {x: WORLD_W/2, y: WORLD_H/2};
    const pts = world.samples.map(s => ({x:s.x,y:s.y}));
    const exit = {x: world.exit.x + world.exit.w/2, y: world.exit.y + world.exit.h/2};
    let cur = start, remaining = pts.slice();
    let total = 0;
    while (remaining.length) {
      let bestIdx = 0, bestD = Infinity;
      for (let i=0;i<remaining.length;i++){
        const d = bfsShortestPixels(cur.x, cur.y, remaining[i].x, remaining[i].y);
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      total += bestD;
      cur = remaining[bestIdx];
      remaining.splice(bestIdx,1);
    }
    total += bfsShortestPixels(cur.x, cur.y, exit.x, exit.y);
    return total;
  }
  function computeParTime() {
    const basePath = approxRouteLenFromSpawn();
    const pxPerSec = PLAYER_SPEED * 60 * 0.85;
    let par = basePath / pxPerSec;
    let area = 0;
    for (const e of world.enemies) area += 0.5 * e.fov * (e.view*e.view);
    const arena = WORLD_W * WORLD_H;
    const threatFactor = Math.max(0, Math.min(0.5, (area / arena) * 0.6));
    par *= (1 + threatFactor);
    if (isTutorial()) par *= 1.15;
    if (world.metrics) { world.metrics.pathLen = basePath; world.metrics.parTime = par; }
    return par;
  }
  function computeScoreAndRank() {
    const M = world.metrics || newMetrics();
    const timeSec = M.timeSec;
    const detections = M.detections;
    const deaths = M.deaths;
    const T = M.toolUse;

    let raw = 2000
      - 3 * timeSec
      - 60 * detections
      - 250 * deaths
      - (25 * T.flash + 40 * T.shutdown + 15 * T.decoy + 10 * T.thrower + 10 * T.foam)
      - 0.6 * M.safeSeconds
      + M.clampBonus;
    raw = Math.max(0, Math.round(raw));

    const par = M.parTime || computeParTime();
    const totalTools = T.flash + T.shutdown + T.decoy + T.thrower + T.foam;

    const feats = {
      ghost: detections === 0,
      pacifist: T.shutdown === 0,
      minimalist: totalTools === 0,
      speedrunner: timeSec <= 0.7 * par,
      silent: (M.noiseEmit + M.noiseMove) <= (150 * par),
      efficient: (M.distance <= 1.2 * (M.pathLen || approxRouteLenFromSpawn())),
      allClear: world.safeZones.every(z => !z.unlocked || z.visitedInside),
      oneTake: (M.deaths === 0 && M.detections === 0),
      facilityJanitor: world.samples.every(s=>s.collected) &&
                       world.keycards.every(k=>k.taken) &&
                       totalTools === 0 && M.deaths === 0,
      fullSanitation: (world.clampKills === world.initialEnemyCount && world.initialEnemyCount > 0)
    };

    const mults = [];
    if (feats.ghost) mults.push(1.20);
    if (feats.pacifist) mults.push(1.10);
    if (feats.minimalist) mults.push(1.10);
    if (feats.speedrunner) mults.push(1.10);
    if (feats.silent) mults.push(1.10);
    if (feats.efficient) mults.push(1.05);
    if (feats.allClear) mults.push(1.03);
    if (feats.oneTake) mults.push(1.10);
    if (feats.facilityJanitor) mults.push(1.15);
    if (feats.fullSanitation) mults.push(1.12);

    const totalMult = Math.min(1.6, mults.reduce((a,b)=>a*b, 1));
    const finalScore = Math.round(raw * totalMult);
    const rank =
      finalScore >= 2400 ? "S" :
      finalScore >= 2000 ? "A" :
      finalScore >= 1500 ? "B" :
      finalScore >= 900  ? "C" : "D";

    return { finalScore, rank, raw, parTime: par, feats, noiseTotal: (M.noiseEmit + M.noiseMove) };
  }

  // ---------- End modal & flow ----------
  function num(n) { return n.toLocaleString(); }
  function computeAndShowEndModal(){
    if (!world.metrics) world.metrics = newMetrics();
    if (!world.metrics.parTime) computeParTime();
    const S = computeScoreAndRank();
    const M = world.metrics;
    const T = M.toolUse;

    endRank.textContent = S.rank;
    endScore.textContent = num(S.finalScore);
    endSeed.textContent = world.seed;

    endBreakdown.innerHTML = "";
    function addLine(k, v, good=false, bad=false) {
      const div = document.createElement("div"); div.className = "line";
      const L = document.createElement("div"); L.className = "k"; L.textContent = k;
      const R = document.createElement("div"); R.className = "v" + (good?" good":bad?" bad":""); R.textContent = v;
      div.appendChild(L); div.appendChild(R);
      endBreakdown.appendChild(div);
    }
    addLine("Time", `${toMMSS(M.timeSec)}  (Par ${toMMSS(S.parTime)})`, M.timeSec <= S.parTime, M.timeSec > S.parTime*1.2);
    addLine("Detections", `${M.detections}`, M.detections===0, M.detections>0);
    addLine("Deaths (L/Run)", `${deathsLevel}/${deathsRun}`, deathsLevel===0, deathsLevel>0);
    addLine("Tools", `Flash×${T.flash}  Decoy×${T.decoy}  Throw×${T.thrower}  Foam×${T.foam}  Shutdown×${T.shutdown}`, T.shutdown===0 && (T.flash+T.decoy+T.thrower+T.foam)<=1, T.shutdown>0);
    addLine("Bonuses", `Clamp +${num(M.clampBonus)}`, M.clampBonus>0, false);
    addLine("Noise", `${num(Math.round(S.noiseTotal))}  (≤ ${num(Math.round(150*S.parTime))} for Silent)`, S.feats.silent, !S.feats.silent);
    const effBase = world.metrics.pathLen || approxRouteLenFromSpawn() || 1;
    addLine("Path efficiency", `${Math.round(M.distance/effBase*100)}% of theoretical`, M.distance<=1.1*effBase, M.distance>1.4*effBase);

    // Feat badges with hover tooltips
    endFeats.innerHTML = "";
    const featInfo = {
      ghost: "No detections in the entire run.",
      pacifist: "Never used Shutdown Clamp.",
      minimalist: "No tools used at all.",
      speedrunner: "Finished at or under 70% of par.",
      silent: "Total noise kept under the cap.",
      efficient: "Stayed close to the optimal route.",
      allClear: "Entered each unlocked Safe Zone.",
      oneTake: "No deaths and no detections.",
      facilityJanitor: "All research & keycards, no tools, no deaths.",
      fullSanitation: "Clamped every hostile, cameras included."
    };
    const feats = [
      ["Ghost", S.feats.ghost, featInfo.ghost],
      ["Pacifist", S.feats.pacifist, featInfo.pacifist],
      ["Minimalist", S.feats.minimalist, featInfo.minimalist],
      ["Speedrunner", S.feats.speedrunner, featInfo.speedrunner],
      ["Silent", S.feats.silent, featInfo.silent],
      ["Efficient Path", S.feats.efficient, featInfo.efficient],
      ["All Clear", S.feats.allClear, featInfo.allClear],
      ["One-Take", S.feats.oneTake, featInfo.oneTake],
      ["Facility Janitor", S.feats.facilityJanitor, featInfo.facilityJanitor],
      ["Full Sanitation", S.feats.fullSanitation, featInfo.fullSanitation],
    ];
    for (const [label, on, tip] of feats){
      const b = document.createElement("div");
      b.className = "badge" + (on ? " on" : "");
      b.textContent = label;
      b.title = tip; // native tooltip
      endFeats.appendChild(b);
    }

    btnNextLevel.onclick = () => { advanceToNextLevelNow(); };
    btnRetry.onclick = () => { retryLevelNow(); };
    btnCopySeed.onclick = async () => {
      try { await navigator.clipboard.writeText(world.seed); btnCopySeed.textContent = "Copied!"; setTimeout(()=>btnCopySeed.textContent="Copy Seed", 900); } catch {}
    };
    btnCopyShare.onclick = async () => {
      const payload = {
        v:1, seed: world.seed, L: isTutorial()?`T${tutorial.index}`:levelIndex, S: S.finalScore, R: S.rank,
        d: { t: Math.round(M.timeSec), det: M.detections, die: M.deaths, tools: T, noise: Math.round(S.noiseTotal), safe: Math.round(M.safeSeconds) }
      };
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      try { await navigator.clipboard.writeText(code); btnCopyShare.textContent = "Copied!"; setTimeout(()=>btnCopyShare.textContent="Copy Share", 900); } catch {}
    };
    btnPlaySeed.onclick = () => { const s = anotherSeedInput.value.trim(); if (s) { startNewRun(s); closeModal(endModal); } };
    btnPlayRandom.onclick = () => { startNewRun(""); closeModal(endModal); };

    openModal(endModal);
  }

  function nextLevel(){ computeAndShowEndModal(); }
  function advanceToNextLevelNow(){
    if (isTutorial()) {
      tutorial.index++;
      if (tutorial.index > tutorial.total) {
        tutorial.active = false;
        startNewRun("GRADUATION");
        closeModal(endModal);
        return;
      }
      deathsLevel = 0;
      world.metrics = newMetrics();
      resetLevel(world.seed, levelIndex, { startHidden: true, preserveMetrics: true });
      closeModal(endModal);
    } else {
      levelIndex++;
      deathsLevel = 0;
      world.metrics = newMetrics();
      resetLevel(world.seed, levelIndex, { startHidden: true, preserveMetrics: true });
      closeModal(endModal);
    }
  }
  function retryLevelNow(){
    resetLevel(world.seed, levelIndex, { startHidden: true, preserveMetrics: true });
    closeModal(endModal);
  }

  // ---------- Draw ----------
  function drawCanvasGrid(){
    ctx.fillStyle = "#0f1520";
    ctx.fillRect(0,0,WORLD_W,WORLD_H);

    // clip inner playfield so grid never overflows under the border
    ctx.save();
    ctx.beginPath();
    ctx.rect(TILE, TILE, WORLD_W - TILE*2, WORLD_H - TILE*2);
    ctx.clip();

    ctx.strokeStyle = "#202733";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = TILE; x < WORLD_W - TILE; x += TILE) {
      ctx.moveTo(x + 0.5, TILE); ctx.lineTo(x + 0.5, WORLD_H - TILE);
    }
    for (let y = TILE; y < WORLD_H - TILE; y += TILE) {
      ctx.moveTo(TILE, y + 0.5); ctx.lineTo(WORLD_W - TILE, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
  function zoneColor(h, a) { return `hsla(${h}, 72%, 58%, ${a})`; }
  function zoneEdge(h, a)  { return `hsla(${h}, 80%, 70%, ${a})`; }

  function drawGridAndExit(){
    const p = world.player;
    for (const z of world.safeZones){
      const playerInside = p && (p.x > z.x && p.x < z.x+z.w && p.y > z.y && p.y < z.y+z.h);
      if (!z.unlocked){
        ctx.fillStyle = "rgba(255,209,102,0.10)";
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.setLineDash([6,6]);
        ctx.strokeStyle = zoneEdge(z.hue, 0.55);
        ctx.strokeRect(z.x+0.5, z.y+0.5, z.w-1, z.h-1);
        ctx.setLineDash([]);
        ctx.beginPath();
        const cx = z.x + z.w - 9, cy = z.y + 9;
        ctx.rect(cx-4, cy-2, 8, 6);
        ctx.moveTo(cx-2, cy-2);
        ctx.arc(cx, cy-2, 2, Math.PI, 0);
        ctx.fillStyle = zoneEdge(z.hue, 0.6);
        ctx.fill();
      } else {
        const pulse = 0.15 + Math.sin(performance.now()*0.006)*0.05;
        ctx.fillStyle = zoneColor(z.hue, playerInside ? 0.28 : 0.18 + pulse);
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = zoneEdge(z.hue, 0.85);
        ctx.lineWidth = playerInside ? 2 : 1;
        ctx.strokeRect(z.x+0.5, z.y+0.5, z.w-1, z.h-1);
        if (playerInside){
          ctx.beginPath();
          ctx.arc(z.x+z.w-10, z.y+z.h-10, 4, 0, Math.PI*2);
          ctx.fillStyle = zoneEdge(z.hue, 0.95);
          ctx.fill();
        }
      }
    }

    const ready = world.exitReady;
    const base = ready ? 0.25 + Math.sin(performance.now()*0.006)*0.1 : 0.12;
    ctx.fillStyle = `rgba(33, 138, 74, ${base})`;
    ctx.fillRect(world.exit.x, world.exit.y, world.exit.w, world.exit.h);
    ctx.strokeStyle = ready ? "#2adf77" : "#1d8f50";
    ctx.strokeRect(world.exit.x+0.5, world.exit.y+0.5, world.exit.w-1, world.exit.h-1);

    if (ready){
      const cx = world.exit.x + world.exit.w/2;
      const cy = world.exit.y + world.exit.h/2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "rgba(42,223,119,0.9)";
      ctx.lineWidth = 2;
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.moveTo(-8 + i*6, -6);
        ctx.lineTo(-2 + i*6, 0);
        ctx.lineTo(-8 + i*6, 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = "#1c2433";
    for (const o of world.obstacles) ctx.fillRect(o.x,o.y,o.w,o.h);
  }

  function drawSamples(){
    const t = performance.now()*0.004;
    for (const s of world.samples){ if (s.collected) continue;
      const bob = Math.sin(t + s.phase)*4;
      const angle = Math.sin(t*0.6 + s.phase)*0.12;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(angle);
      const w = 16, h = 20, fold = 5;
      ctx.fillStyle = "#f0efe4";
      ctx.strokeStyle = "#d8d6c6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2);
      ctx.lineTo(w/2 - fold, -h/2);
      ctx.lineTo(w/2, -h/2 + fold);
      ctx.lineTo(w/2,  h/2);
      ctx.lineTo(-w/2,  h/2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w/2 - fold, -h/2);
      ctx.lineTo(w/2, -h/2);
      ctx.lineTo(w/2, -h/2 + fold);
      ctx.closePath();
      ctx.fillStyle = "#e8e6d7";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      for (const p of s.pattern){
        if (p.len === 0){ ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, Math.PI*2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(p.x - p.len/2, p.y); ctx.lineTo(p.x + p.len/2, p.y); ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  function roundRectPath(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }
  function drawKeycards(){
    const t = performance.now()*0.004;
    for (const k of world.keycards){ if (k.taken) continue;
      const bob = Math.sin(t + k.phase) * 4;
      const hue = k.hue;
      ctx.save();
      ctx.translate(k.x, k.y + bob);
      ctx.rotate(Math.sin((t*0.7) + k.phase) * 0.1);
      const w=22, h=14, r=3;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 1)`;
      roundRectPath(-w/2, -h/2, w, h, r);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(-w/2+3, -2, w-6, 4);
      ctx.fillStyle = "#ffffffcc";
      ctx.fillRect(-w/2+4, -h/2+3, 6, 2);
      ctx.restore();
    }
  }

  function drawFoam(){
    for (const m of world.foams){
      ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2);
      ctx.fillStyle="rgba(120,180,255,0.12)"; ctx.fill();
      ctx.strokeStyle="rgba(120,180,255,0.35)"; ctx.setLineDash([6,6]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawBeacons(){
    for (const b of world.beacons){
      const pulse=(Math.sin(performance.now()*0.006)*0.5+0.5);
      const r=lerp(12,16,pulse);
      ctx.beginPath(); ctx.arc(b.x,b.y,r,0,Math.PI*2); ctx.fillStyle="#ffd166"; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x,b.y,28+8*pulse,0,Math.PI*2); ctx.strokeStyle="rgba(255,209,102,0.5)"; ctx.stroke();
    }
  }
  function drawFlashes(){
    for (const f of world.flashes){
      const a=clamp(f.life/0.8,0,1);
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r*(1-a*0.35),0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${0.22*a})`; ctx.fill();
    }
  }
  function drawNoises(){
    for (const n of world.noises){
      const a=clamp(n.life/0.33,0,1);
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r*(1-a*0.5),0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${0.15*a})`; ctx.setLineDash([8,10]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawThrows(){
    for (const th of world.throws){
      ctx.beginPath();
      ctx.arc(th.x, th.y, th.r, 0, Math.PI*2);
      ctx.fillStyle = th.stuck ? "#ffe39a" : "#ffd166";
      ctx.fill();
      ctx.strokeStyle = "#2b2b2b";
      ctx.stroke();
    }
  }

  function drawEnemyPatroller(e){ const s=e.r*2; ctx.save(); ctx.translate(e.x,e.y); ctx.fillStyle="#ffa257"; ctx.strokeStyle="#1a2230"; ctx.fillRect(-e.r,-e.r,s,s); ctx.strokeRect(-e.r+0.5,-e.r+0.5,s-1,s-1); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(e.dir)*16, Math.sin(e.dir)*16); ctx.strokeStyle="#ffffff88"; ctx.stroke(); ctx.restore(); }
  function drawEnemySentry(e){ ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.dir); ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(-10,9); ctx.lineTo(-10,-9); ctx.closePath(); ctx.fillStyle="#ff5ea8"; ctx.fill(); ctx.strokeStyle="#1a2230"; ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fillStyle="#2a2f3e"; ctx.fill(); ctx.restore(); }
  function drawEnemySeeker(e){ ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.dir); ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(14,0); ctx.lineTo(0,14); ctx.lineTo(-14,0); ctx.closePath(); ctx.fillStyle="#ffc857"; ctx.fill(); ctx.strokeStyle="#1a2230"; ctx.stroke(); ctx.restore(); }
  function drawEnemySlime(e){ const pts=14, r=e.r, t=performance.now()*0.002+e.wobble; ctx.beginPath(); for (let i=0;i<pts;i++){ const a=(i/pts)*Math.PI*2; const wob=Math.sin(a*3+t)*2.5+Math.cos(a*2-t*1.3)*1.8; const rr=r+3+wob; const x=e.x+Math.cos(a)*rr; const y=e.y+Math.sin(a)*rr; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.closePath(); ctx.fillStyle="#b1ff7a"; ctx.fill(); ctx.strokeStyle="#1a2230"; ctx.stroke(); ctx.beginPath(); ctx.arc(e.x + Math.cos(e.dir)*6, e.y + Math.sin(e.dir)*6, 2.2, 0, Math.PI*2); ctx.fillStyle="#2a3a2a"; ctx.fill(); }
  function drawEnemyCamera(e){ ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.dir); ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-16,0); ctx.strokeStyle="#8fd3ff"; ctx.lineWidth=2; ctx.stroke(); ctx.lineWidth=1; ctx.fillStyle="#8fd3ff"; ctx.strokeStyle="#1a2230"; ctx.fillRect(-10,-7,20,14); ctx.strokeRect(-10.5,-7.5,21,15); ctx.beginPath(); ctx.arc(6,0,4,0,Math.PI*2); ctx.fillStyle="#d5efff"; ctx.fill(); ctx.restore(); }
  function drawEnemyVision(){
    for (const e of world.enemies){
      const fov = e.blind>0 ? 0.0001 : e.fov;
      const lightMul = (e.type === "Camera") ? 1.0 : (0.7 + 0.6 * world.ambientLight);
      const range = e.view * lightMul;
      const pts = visionPolygon({x:e.x,y:e.y}, e.dir, fov, range);
      ctx.beginPath(); ctx.moveTo(e.x,e.y); for (const pt of pts) ctx.lineTo(pt.x,pt.y); ctx.closePath();
      ctx.fillStyle="rgba(255,243,179,0.14)"; ctx.fill();
      ctx.strokeStyle="rgba(255,243,179,0.35)"; ctx.stroke();
    }
  }
  function drawEnemies() {
    for (const e of world.enemies) {
      switch (e.type) {
        case "Patroller": drawEnemyPatroller(e); break;
        case "Sentry":    drawEnemySentry(e);    break;
        case "Seeker":    drawEnemySeeker(e);    break;
        case "Slime":     drawEnemySlime(e);     break;
        case "Camera":    drawEnemyCamera(e);    break;
      }
    }
  }
  function drawPlayer(){
    const p=world.player;
    if (!p) return;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle="#9ad1ff"; ctx.fill(); ctx.strokeStyle="#cce9ff"; ctx.stroke();
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.facing);
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-4,6); ctx.lineTo(-4,-6); ctx.closePath(); ctx.fillStyle="#e7f3ff"; ctx.fill();
    ctx.restore();
    if (p.hiding){
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r+6, 0, Math.PI*2);
      ctx.fillStyle = "rgba(60,90,110,0.65)"; ctx.fill();
      ctx.strokeStyle = "rgba(180,220,255,0.6)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y-10, 4, 0, Math.PI*2);
      ctx.fillStyle = "rgba(220,240,255,0.9)"; ctx.fill();
    }
    if (p.sneak && !p.hiding){ ctx.beginPath(); ctx.arc(p.x,p.y,26,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.fill(); }
    if (p.dashT>0){
      ctx.beginPath(); ctx.arc(p.x - p.dashVX*2, p.y - p.dashVY*2, 10, 0, Math.PI*2);
      ctx.fillStyle = "rgba(154,209,255,0.15)"; ctx.fill();
    }
  }

  // Tutorial overlay (kept compact)
  function drawTutorialOverlay(){
    if (!isTutorial() || tutorial.overlay.length === 0) return;
    const lines = tutorial.overlay;
    const x = 1040, y = 12, w = 420;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#0e121b";
    ctx.fillRect(x, y, w, 16 + 16 * (lines.length + 1));
    ctx.globalAlpha = .85;
    ctx.strokeStyle = "#26324a";
    ctx.strokeRect(x+0.5, y+0.5, w-1, 16 + 16 * (lines.length + 1) - 1);
    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#e9eef7";
    ctx.fillText(lines[0], x+12, y+22);
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#aab3c2";
    for (let i=1;i<lines.length;i++){
      ctx.fillText(lines[i], x+12, y+22 + i*16);
    }
    ctx.restore();
  }

  // ---------- Loop ----------
  function draw() {
    ctx.setTransform(scale * (window.devicePixelRatio || 1), 0, 0, scale * (window.devicePixelRatio || 1), 0, 0);
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawCanvasGrid();
    drawGridAndExit();
    drawFoam();
    drawBeacons();
    drawFlashes();
    drawEnemyVision();
    drawEnemies();
    drawKeycards();
    drawSamples();
    drawPlayer();
    drawNoises();
    drawThrows();
    drawTutorialOverlay();
  }

  function simulate(dt){
    if (!world.player) return;

    if (world.metrics) world.metrics.timeSec += dt;
    world.player.invincibleTime = Math.max(0, world.player.invincibleTime - dt);

    world.noiseLevel = Math.max(0, world.noiseLevel - dt * 0.6);
    const fillPct = clamp(world.noiseLevel / 1.0, 0, 1) * 100;
    noiseFill.style.width = fillPct.toFixed(0) + "%";

    for (let i=world.beacons.length-1;i>=0;i--){
      const b = world.beacons[i];
      b.life -= dt; b.pulse += dt;
      if (b.pulse > 0.8){ emitNoise(b.x, b.y, 150); b.pulse = 0; }
      if (b.life <= 0) world.beacons.splice(i,1);
    }
    for (let i=world.foams.length-1;i>=0;i--){
      const m = world.foams[i]; m.life -= dt; if (m.life <= 0) world.foams.splice(i,1);
    }
    for (let i=world.flashes.length-1;i>=0;i--){
      const f = world.flashes[i]; f.life -= dt; if (f.life <= 0) world.flashes.splice(i,1);
    }
    for (let i=world.noises.length-1;i>=0;i--){
      const n = world.noises[i]; n.life -= dt; if (n.life <= 0) world.noises.splice(i,1);
    }
    for (let i=world.throws.length-1;i>=0;i--){
      const th = world.throws[i];
      th.life -= dt;
      if (!th.stuck){
        const nx = th.x + th.vx, ny = th.y + th.vy;
        if (throwSolidHit(nx, ny, th.r)){ th.stuck = true; th.vx = 0; th.vy = 0; emitNoise(th.x, th.y, 140); }
        else { th.x = nx; th.y = ny; }
      } else {
        th.pulse += dt;
        if (th.pulse > 0.7){ emitNoise(th.x, th.y, 130); th.pulse = 0; }
      }
      if (th.life <= 0) world.throws.splice(i,1);
    }

    playerUpdate(dt, world.player);

    for (const e of world.enemies) enemyUpdate(dt, e, world.player);
    for (const e of world.enemies){
      if (checkDetection(e, world.player)) {
        redeploy();
        return;
      }
    }

    // Music state update
    if (window.FJMusic) {
      const p = world.player;
      const tens = computeTension();
      window.FJMusic.state({
        modal: !!ui.modal,
        inSafe: !!p?.inSafe,
        hiding: !!p?.hiding,
        tension: tens
      });
    }
  }

  let last=0;
  function step(ts){
    const t=ts/1000, dt=Math.min(0.033, last===0?0.016:t-last); last=t;
    if (!ui.paused) simulate(dt);
    draw();
    requestAnimationFrame(step);
  }

  // ---------- UI wiring ----------
  function startFromUISeed(){ startNewRun(elSeed.value.trim() || ""); }
  btnNew.addEventListener("click", () => startFromUISeed());
  btnRestart.addEventListener("click", () => { if (!ui.paused) redeploy(); });

  if (startSeedBtn) startSeedBtn.addEventListener("click", () => {
    const s = startSeedInput.value.trim();
    startNewRun(s);
    closeModal(startModal);
  });
  if (startRandomBtn) startRandomBtn.addEventListener("click", () => {
    startNewRun("");
    closeModal(startModal);
  });
  if (startTutorialBtn) startTutorialBtn.addEventListener("click", () => {
    startTutorial();
    closeModal(startModal);
  });

  function readSeedFromURL(){ const params=new URLSearchParams(location.search); return params.get("seed") || ""; }

  scheduleInitialFit();
  const seedFromUrl = readSeedFromURL();
  if (seedFromUrl) {
    startNewRun(seedFromUrl);
  } else {
    openModal(startModal);
  }
  requestAnimationFrame(step);
})();
