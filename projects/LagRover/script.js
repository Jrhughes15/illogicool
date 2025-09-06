/* LagRover v3.8 — multi-level elevations + oriented ramps + hover levels
   - Elevation: height 0..3 (no bars on flat; 1–3 bars on raised tiles)
   - Ramps: a single ramp type that bridges +1 level, oriented toward the higher side
   - Hover: HOVER 0..3 (0=OFF). HOVER ON=1, OFF=0. Extra idle+move drain by level
   - Movement: Uphill +1 via ramp (either tile on the edge) or hover>=1; dz=2/3 needs hover>=dz; drop limited
   - Worldgen: flatter maps, plateau growth with |Δh|<=1, automatic ramp ring, avoid obstacles/items on ramps
   - Rendering: wedge ramp art; legend shows ramp wedge; hover tooltip mentions ramp
   - Keeps v3.7 features: grid labels, strict packet sequencing, inventory/drop, measure (clears on move),
     crew messages, help modal, hover tile info, command box clears after send

   NEW (this update):
   - Elevation bars are bottom-anchored (“low-justified”) so they look like strata.
   - Sand tiles use a dotted pattern instead of a translucent wash.
*/

/* ---------- Constants ---------- */
const TILE = 24;
const COLS = 28, ROWS = 24;
const DIRS = [ [1,0,'E'], [0,1,'S'], [-1,0,'W'], [0,-1,'N'] ];
const H_MAX = 3;                 // max elevation level
const SAFE_DROP = 2;             // maximum safe drop

const T = {
  FLAT:0, RAMP:1, ROCK:2, SAND:3, PIT:4, SOLAR:5, RAD:6, SAMPLE:7,
  BAT:8, DATA:9, GOAL:10
};
const T_LIST = [
  {t:T.FLAT,  name:'Flat terrain'},
  {t:T.RAMP,  name:'Ramp (+1 elevation)'},
  {t:T.ROCK,  name:'Rock (blocked)'},
  {t:T.SAND,  name:'Sand (extra energy)'},
  {t:T.PIT,   name:'Pit (requires HOVER)'},
  {t:T.SOLAR, name:'Solar zone (faster charging)'},
  {t:T.RAD,   name:'Radiation (battery drain)'},
  {t:T.SAMPLE,name:'Research sample (DRILL/PICKUP)'},
  {t:T.BAT,   name:'Battery pack (+25%)'},
  {t:T.DATA,  name:'Data beacon (PICKUP)'},
  {t:T.GOAL,  name:'Mission beacon (goal)'},
];

/* Ramp dir encoding: -1=none, 0:E, 1:S, 2:W, 3:N (apex points to higher side) */
const R_NONE=-1, R_E=0, R_S=1, R_W=2, R_N=3;

/* ---------- DOM ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const queueDiv = document.getElementById('queue');
const logDiv = document.getElementById('log');
const objsUl = document.getElementById('objectives');
const codeEl = document.getElementById('code');
const lagEl = document.getElementById('lag');
const lagLabel = document.getElementById('lagLabel');
const legendBody = document.getElementById('legendBody');
const seedSpan = document.getElementById('seed');
const seedInput = document.getElementById('seedInput');
const levelSelect = document.getElementById('levelSelect');
const invUl = document.getElementById('inventory');
const msgDiv = document.getElementById('messages');
const hoverInfo = document.getElementById('hoverInfo');
// Help modal handles
const helpModal = document.getElementById('helpModal');
const helpBackdrop = document.getElementById('helpBackdrop');
const helpClose = document.getElementById('helpClose');

/* ---------- RNG ---------- */
function makeRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

/* ---------- Utility ---------- */
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function inBounds(x,y){ return x>=0 && y>=0 && x<COLS && y<ROWS; }

/* ---------- Height helpers ---------- */
function enforceAdjacency(height){
  // Ensure |Δh| <= 1 between neighbors (couple of relaxation passes)
  for (let pass=0; pass<3; pass++){
    for (let y=0;y<ROWS;y++){
      for (let x=0;x<COLS;x++){
        const h = height[y][x];
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=x+dx, ny=y+dy;
          if (!inBounds(nx,ny)) continue;
          const nh = height[ny][nx];
          if (nh > h+1) height[ny][nx] = h+1;
          else if (h > nh+1) height[y][x] = nh+1;
        }
      }
    }
  }
}
function buildRampDir(height){
  const rd = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(R_NONE));
  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      const h = height[y][x];
      // NESW deterministic priority so wedges don't fight
      const neigh = [
        [1,0,R_E],[0,1,R_S],[-1,0,R_W],[0,-1,R_N]
      ];
      for (const [dx,dy,dir] of neigh){
        const nx=x+dx, ny=y+dy;
        if (!inBounds(nx,ny)) continue;
        if (height[ny][nx] === h+1){ rd[y][x] = dir; break; }
      }
    }
  }
  return rd;
}

/* ---------- World generation ---------- */
function makeRandomWorld(seed = Date.now()) {
  const rng = makeRNG(seed);
  const height = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(0));
  const grid   = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(T.FLAT));

  const start = {x:1, y:ROWS-2};
  const goal  = {x:COLS-2, y:1};

  // --- Make plateaus: seed hills for h=1/2/3 with nested radii ---
  function raise(cx,cy,r,level){
    for (let yy=-r; yy<=r; yy++) for (let xx=-r; xx<=r; xx++){
      const nx=cx+xx, ny=cy+yy; if (!inBounds(nx,ny)) continue;
      if (xx*xx+yy*yy <= r*r) height[ny][nx] = Math.max(height[ny][nx], level);
    }
  }
  // MUCH FLATTER: fewer/larger soft hills
  const hills1 = 4 + Math.floor(rng()*2); // level-1 blobs
  for (let i=0;i<hills1;i++){
    const cx = 2+Math.floor(rng()*(COLS-4));
    const cy = 2+Math.floor(rng()*(ROWS-4));
    raise(cx,cy, 4, 1);
  }
  const hills2 = 2; // small cores
  for (let i=0;i<hills2;i++){
    const cx = 2+Math.floor(rng()*(COLS-4));
    const cy = 2+Math.floor(rng()*(ROWS-4));
    raise(cx,cy, 3, 2);
  }
  const hills3 = 1; // rare peak
  for (let i=0;i<hills3;i++){
    const cx = 3+Math.floor(rng()*(COLS-6));
    const cy = 3+Math.floor(rng()*(ROWS-6));
    raise(cx,cy, 2, 3);
  }

  // smooth a bit by pulling down tall neighbors
  enforceAdjacency(height);

  // --- Ramps: put wedges on the LOWER side of +1 edges
  let rampDir = buildRampDir(height);

  // --- Scatter obstacles/items (avoid start/goal and ramp cells) ---
  function canPlace(x,y){
    if ((x===start.x && y===start.y) || (x===goal.x && y===goal.y)) return false;
    if (rampDir[y][x] !== R_NONE) return false; // keep ramps clean
    return grid[y][x]===T.FLAT;
  }
  function scatter(type, n) {
    let c=0, tries=0;
    while (c<n && tries< n*50) {
      const x = Math.floor(rng()*COLS), y = Math.floor(rng()*ROWS);
      if (!canPlace(x,y)) { tries++; continue; }
      grid[y][x] = type; c++; tries++;
    }
  }
  function placeItems(type, n) {
    let c=0, tries=0;
    while (c<n && tries< n*80) {
      const x = Math.floor(rng()*COLS), y = Math.floor(rng()*ROWS);
      if ((x===start.x && y===start.y) || (x===goal.x && y===goal.y)) { tries++; continue; }
      if (rampDir[y][x] !== R_NONE) { tries++; continue; }
      if ([T.FLAT,T.SAND].includes(grid[y][x])) { grid[y][x] = type; c++; }
      tries++;
    }
  }

  // MUCH LESS CLUTTER
  scatter(T.ROCK,  27);
  scatter(T.SAND,  42);
  scatter(T.PIT,   12);
  scatter(T.SOLAR, 31);
  scatter(T.RAD,   20);

  placeItems(T.SAMPLE, 6);
  placeItems(T.BAT,    5);
  placeItems(T.DATA,   5);

  grid[goal.y][goal.x] = T.GOAL;

  // fog
  const fog = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(true));
  function revealRadius(x,y,r){
    for (let yy=-r; yy<=r; yy++) for (let xx=-r; xx<=r; xx++) {
      const nx=x+xx, ny=y+yy; if (!inBounds(nx,ny)) continue;
      if (xx*xx+yy*yy <= r*r) fog[ny][nx] = false;
    }
  }
  revealRadius(start.x, start.y, 4); // slightly larger starting reveal

  return {seed, grid, height, rampDir, fog, start, goal,
          inBounds, revealRadius:(x,y,r)=>revealRadius(x,y,r,fog)};
}

/* ---------- Tutorials ---------- */
function makeTutorial(levelId) {
  const grid = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(T.FLAT));
  const height = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(0));
  const start = {x:2, y:ROWS-3};
  const goal  = {x:COLS-3, y:2};

  // walls
  for (let y=4; y<ROWS-4; y++) { grid[y][6] = T.ROCK; grid[y][COLS-7] = T.ROCK; }

  if (levelId==='tutorial1') {
    grid[start.y][start.x+4] = T.DATA;
    height[start.y-1][start.x+8] = 1;
    grid[start.y-1][start.x+8] = T.SAMPLE;
    grid[start.y-1][start.x+9] = T.BAT;
  }
  if (levelId==='tutorial2') {
    for (let x=10; x<16; x++) grid[start.y][x] = T.PIT;
    height[start.y-1][18] = 1;
    height[start.y-1][19] = 1;
    grid[start.y-1][20] = T.SAMPLE;
  }
  if (levelId==='tutorial3') {
    for (let x=10; x<20; x++) grid[start.y][x] = (x%2?T.RAD:T.FLAT);
    grid[start.y][22] = T.SOLAR; grid[start.y-1][22] = T.SOLAR; grid[start.y-2][22] = T.SOLAR;
    height[start.y-3][22] = 1; height[start.y-4][22] = 2;
    grid[start.y-3][22] = T.SAMPLE; grid[start.y-4][22] = T.DATA;
  }

  enforceAdjacency(height);
  const rampDir = buildRampDir(height);

  const fog = new Array(ROWS).fill(0).map(()=> new Array(COLS).fill(true));
  function inBounds2(x,y){ return inBounds(x,y); }
  function revealRadius2(x,y,r){
    for (let yy=-r; yy<=r; yy++) for (let xx=-r; xx<=r; xx++){
      const nx=x+xx, ny=y+yy; if (!inBounds(nx,ny)) continue;
      if (xx*xx+yy*yy <= r*r) fog[ny][nx] = false;
    }
  }
  revealRadius2(start.x, start.y, 4);

  grid[goal.y][goal.x] = T.GOAL;
  const seed = `${levelId}-${Date.now()}`;
  return {seed, grid, height, rampDir, fog, start, goal, inBounds:inBounds2, revealRadius:revealRadius2};
}

/* ---------- Rover ---------- */
function makeRover(world) {
  return {
    x: world.start.x, y: world.start.y, dir: 0, z: world.height[world.start.y][world.start.x],
    battery: 100,
    hoverLevel: 0, hover: false,            // hover is derived (hoverLevel>0)
    tipped: false,
    samples: 0, data: 0, animQueue: [],
    inventory: [] // {kind:'SAMPLE'|'DATA'|'BAT', note?:string}
  };
}

/* ---------- Missions ---------- */
const missionsBase = [
  { id: 1, text: "Collect 2 research samples (DRILL on S, then PICKUP).", done: (w,r) => r.samples >= 2 },
  { id: 2, text: "Upload 2 data points (PICKUP on ★).", done: (w,r) => r.data >= 2 },
  { id: 3, text: "Reach the beacon *.", done: (w,r) => w.grid[r.y][r.x] === T.GOAL }
];
function missionsForLevel(levelId){
  if (levelId==='tutorial1') {
    return [
      { id: 't1a', text: "Move to the ★ and PICKUP it.", done: (w,r)=> r.data>=1 },
      { id: 't1b', text: "DRILL a sample S and PICKUP it.", done: (w,r)=> r.samples>=1 },
      { id: 't1c', text: "Reach the beacon *.", done: (w,r)=> w.grid[r.y][r.x]===T.GOAL },
    ];
  }
  if (levelId==='tutorial2') {
    return [
      { id: 't2a', text: "Use ramps or HOVER to climb and cross pits.", done: (w,r)=> r.x>15 },
      { id: 't2b', text: "Reach S (+1) via ramp, DRILL & PICKUP.", done: (w,r)=> r.samples>=1 },
      { id: 't2c', text: "Head to the beacon *.", done: (w,r)=> w.grid[r.y][r.x]===T.GOAL },
    ];
  }
  if (levelId==='tutorial3') {
    return [
      { id: 't3a', text: "Navigate a radiation stretch (battery drains).", done: (w,r)=> r.x>=20 },
      { id: 't3b', text: "Charge on ☼ using SOLAR 5 (or more) until ≥90%.", done: (w,r)=> r.battery>=90 },
      { id: 't3c', text: "Collect S & ★, then reach the beacon *.", done: (w,r)=> r.samples>=1 && r.data>=1 && w.grid[r.y][r.x]===T.GOAL },
    ];
  }
  return missionsBase;
}

/* ---------- State ---------- */
let world = makeRandomWorld();
let rover = makeRover(world);
let missionList = missionsForLevel('random');
let queue = [];
let simTime = 0;
let transmitLag = 3;
let running = false;
let currentTween = null;
let fogOn = false;
let lastTs = performance.now();
let daytime = 0;
let daylight = 1;

// Overlays
// Overlays
// --- MEASURE overlay state ---
let measureMarks = [];
let measureTTL = 0;        // seconds remaining before fade/clear (0 = off)
let measureAuto = false;   // toggle button state
let drops = []; // dropped items overlay: [{x,y,kind,label}]


// Crew objectives
let dynamicObjectives = []; // {id, text, done:(w,r)=>bool}



// Should stepping into ramp tile (nx,ny) from direction (dx,dy) count as "up"?
// Rule: dot(move, gradient) >= 0  (cardinals give 3 ups, diagonals give 2 ups)
function rampAllowsDirection(nx, ny, dx, dy) {
  if (world.grid[ny][nx] !== T.RAMP) return false;

  // Prefer an actual slope angle if available (diagonals supported).
  let a = slopeAngleAt(nx, ny);

  // Fallback to stored rampDir if your world has it
  if (a == null && world.rampDir) {
    const rd = world.rampDir[ny]?.[nx];
    if (typeof rd === 'number') {
      a =
        rd === R_E ? 0 :
        rd === R_S ? Math.PI/2 :
        rd === R_W ? Math.PI   :
        rd === R_N ? -Math.PI/2 : 0;
    }
  }

  // If still unknown, treat it like a cardinal "3-ups" ramp.
  if (a == null) {
    // moving along y (N/S): allow E/W too, i.e., dx!==0 or dy<0
    // That’s equivalent to: any direction except directly opposite the visual "up".
    // With no angle, allow ↑ and both sides by default:
    return (dy === -1) || (dx !== 0);
  }

  // Compare movement vector to low->high gradient
  const gx = Math.cos(a), gy = Math.sin(a);   // gradient
  const dot = gx * dx + gy * dy;

  // Allow when aligned or perpendicular (dot >= 0):
  // - Diagonal gradient: ↑ or → (for ↗) both give dot > 0
  // - Cardinal gradient (↑): ↑ gives dot > 0, →/← give dot = 0 -> allowed
  return dot >= 0;   // <— this is the key: gives 2 ups on diagonals, 3 on cardinals
}


/* ---------- Drawing ---------- */
function fillRect(x,y,w,h,color){ ctx.fillStyle=color; ctx.fillRect(0|x,0|y,0|w,0|h); }

/* NEW: dotted sand pattern */
function drawSandDots(px,py){
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#c9d6ee';
  // small offset so pattern looks organic
  for (let yy=py+2; yy<py+TILE-1; yy+=4){
    for (let xx=px+2; xx<px+TILE-1; xx+=4){
      ctx.fillRect(xx, yy, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function draw(world, rover, t){
  // Make the canvas transparent so the panel starfield shows through
  // (reset transform first just in case a previous frame left one active)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Optional twinkle layer drawn on the canvas (keeps your animated stars).
  // If you want only the CSS starfield, just comment this out.


  // tiles
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE + 48, py = y * TILE + 24;
      if (fogOn && world.fog[y][x]) { fillRect(px, py, TILE, TILE, '#050a16'); continue; }
      drawTile(px, py, world.grid[y][x], world.height[y][x], world.rampDir[y][x], x, y);
    }
  }

  // dropped items overlay
  for (const d of drops) {
    const px = d.x * TILE + 48, py = d.y * TILE + 24;
    drawDrop(px, py, d);
  }

  // measure overlay
  if (measureTTL > 0) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#9fb9e6';
    ctx.font = '12px ui-monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const m of measureMarks) {
      const px = m.x * TILE + 48 + TILE / 2, py = m.y * TILE + 24 + TILE / 2;
      ctx.fillText(String(m.n), px, py);
    }
    ctx.globalAlpha = 1;
  }

  // rover
  const rv = roverScreenPosition(rover);
  ctx.save();
  ctx.translate(rv.x, rv.y);

  // support tween rotation/scale
  let extraRot = 0, scale = 1;
  if (currentTween) {
    if (typeof currentTween.rot === 'number') extraRot += currentTween.rot;
    if (typeof currentTween.scale === 'number') scale *= currentTween.scale;
  }
  ctx.rotate(rover.dir * Math.PI / 2 + extraRot);
  ctx.scale(scale, scale);

  if (rover.hover) { ctx.globalAlpha = 0.35; fillRect(-16, -12, 32, 24, '#8fd3ff'); ctx.globalAlpha = 1; }
  fillRect(-8, -6, 16, 12, rover.tipped ? '#ff8b8b' : '#bfe0ff');
  fillRect(2, -4, 6, 8, '#0b0f1a');
  fillRect(-10, -10, 4, 20, '#d9e6ff'); fillRect(6, -10, 4, 20, '#d9e6ff');
  ctx.restore();

  // grid labels around board
  drawGridLabels();

  // telemetry
  document.getElementById('bat').textContent = Math.round(rover.battery);
  document.getElementById('mode').textContent = rover.hoverLevel > 0 ? `HOVER${rover.hoverLevel}` : 'GROUND';
  document.getElementById('pos').textContent = `${rover.x},${rover.y}`;
  document.getElementById('dir').textContent = DIRS[rover.dir][2];
  document.getElementById('height').textContent = rover.z;
  document.getElementById('time').textContent = Math.floor(simTime);
  document.getElementById('lagTxt').textContent = transmitLag;
  document.getElementById('daylight').textContent = daylight > 0.15 ? 'Day' : 'Night';
}

function roverScreenPosition(r){
  let x=r.x*TILE+TILE/2+48, y=r.y*TILE+TILE/2+24;
  if (currentTween){ x+=currentTween.offx||0; y+=currentTween.offy||0; }
  if (r.hover) y -= 2;
  return {x,y};
}


/* UPDATED: bottom-anchored height bars (low-justified) */
// Thin, low-justified elevation bars (no highlight line)
function drawHeightBars(px, py, h) {
  if (h <= 0) return;

  const bars = Math.min(3, h);
  const BAR_H   = 3;  // bar thickness (px) — was large before
  const BAR_GAP = 3;  // vertical gap between bars
  const W       = TILE - 12;              // a bit inset from sides
  const X       = px + (TILE - W) / 2;
  let   y       = py + TILE - 4 - BAR_H;  // stack from bottom up

  ctx.save();
  ctx.fillStyle = '#5a77a8';              // single solid color, no highlight
  for (let i = 0; i < bars; i++) {
    ctx.fillRect(X, y, W, BAR_H);
    y -= (BAR_H + BAR_GAP);
  }
  ctx.restore();
}


function drawRampWedge(px,py,dir){
  // Triangle wedge pointing toward higher side (dir)
  ctx.save();
  ctx.fillStyle = '#3a66b7';
  ctx.beginPath();
  if (dir===R_N){
    ctx.moveTo(px+TILE/2, py+4);           // apex up
    ctx.lineTo(px+4,          py+TILE-4);  // base left
    ctx.lineTo(px+TILE-4,     py+TILE-4);  // base right
  } else if (dir===R_S){
    ctx.moveTo(px+TILE/2, py+TILE-4);      // apex down
    ctx.lineTo(px+4,          py+4);
    ctx.lineTo(px+TILE-4,     py+4);
  } else if (dir===R_E){
    ctx.moveTo(px+TILE-4, py+TILE/2);      // apex right
    ctx.lineTo(px+4,       py+4);
    ctx.lineTo(px+4,       py+TILE-4);
  } else if (dir===R_W){
    ctx.moveTo(px+4,    py+TILE/2);        // apex left
    ctx.lineTo(px+TILE-4, py+4);
    ctx.lineTo(px+TILE-4, py+TILE-4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Topographic ramp: 6 lines, clipped to the tile, denser toward the HIGH side.
// dir is cardinal high-side (R_N/R_S/R_E/R_W). If `angle` is provided (radians,
// low->high), contours will be angled toward the plateau center.
function drawRampTopo(px, py, dir, h, angle) {
  ctx.save();

  // Clip to tile so lines never spill outside
  ctx.beginPath();
  ctx.rect(px, py, TILE, TILE);
  ctx.clip();

  ctx.strokeStyle = '#3a66b7';
  ctx.globalAlpha = 0.9;
  ctx.lineWidth   = 1;
  ctx.lineCap     = 'butt';

  const bands = 6;                 // number of contour lines
  // Bias spacing so lines are closer near the HIGH side:
  // b(t) = 1 - (1-t)^2  (small spacing near t=1 -> high end)
  const bias = t => 1 - (1 - t) * (1 - t);

  // gradient direction (low -> high)
  let a;
  if (typeof angle === 'number') {
    a = angle; // diagonal/angled mode (from slopeAngleAt)
  } else {
    a =
      dir === R_E ? 0 :
      dir === R_S ? Math.PI/2 :
      dir === R_W ? Math.PI   :
      dir === R_N ? -Math.PI/2 : 0;
  }

  // v = gradient (low->high); u = perpendicular (contour direction)
  const vx = Math.cos(a),  vy = Math.sin(a);
  const ux = Math.cos(a + Math.PI/2), uy = Math.sin(a + Math.PI/2);

  // Center and spans (draw long; tile clip trims ends)
  const cx = px + TILE/2, cy = py + TILE/2;
  const R  = TILE/2;   // half-span along gradient
  const L  = TILE;     // half-length along contour direction

  for (let i = 0; i < bands; i++) {
    const t  = (bands === 1) ? 0 : i / (bands - 1);
    const b  = bias(t);           // 0..1, denser near high side
    const s  = -R + 2 * R * b;    // position along gradient
    const mx = cx + vx * s;
    const my = cy + vy * s;

    const x1 = mx - ux * L, y1 = my - uy * L;
    const x2 = mx + ux * L, y2 = my + uy * L;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

// Estimate local slope (low->high) in radians using the height field
function slopeAngleAt(x, y) {
  const H = world.height; // uses your global world
  const hC = H[y][x];
  const hL = x > 0        ? H[y][x-1] : hC;
  const hR = x < COLS-1   ? H[y][x+1] : hC;
  const hU = y > 0        ? H[y-1][x] : hC;
  const hD = y < ROWS-1   ? H[y+1][x] : hC;

  const gx = (hR - hL);   // +x slope
  const gy = (hD - hU);   // +y slope
  if (gx === 0 && gy === 0) return null;  // flat

  return Math.atan2(gy, gx); // radians, low->high
}

// Allow ramp climbs aligned with, or perpendicular to, the low->high slope.
// Returns true if movement from (sx,sy)->(nx,ny) is permitted by the ramp.
// Gives 2 ups on diagonal ramps, 3 ups on cardinal ramps.
function rampAllowsMove(sx, sy, nx, ny, facingDir){
  const dx = nx - sx, dy = ny - sy;           // movement vector (unit step)
  // Find the slope angle at the *destination* tile (low->high). Prefer height field,
  // fall back to world.rampDir if needed.
  let a = slopeAngleAt(nx, ny);                // may be null on flats
  if (a == null && world.rampDir) {
    const rd = world.rampDir[ny]?.[nx];
    if (typeof rd === 'number') {
      a = (rd===R_E)?0 : (rd===R_S)?Math.PI/2 : (rd===R_W)?Math.PI : (rd===R_N)?-Math.PI/2 : 0;
    }
  }
  // If still unknown, treat as a cardinal “3-ups” ramp that allows forward and both sides.
  if (a == null) return (dy === -1) || (dx !== 0);  // same heuristic described earlier

  // Compare movement vector to slope gradient (low->high).
  const gx = Math.cos(a), gy = Math.sin(a);
  const dot = gx*dx + gy*dy;

  // Accept moves that are aligned (dot > 0) OR perpendicular (dot ≈ 0).
  // This yields 2 ups for diagonals and 3 for cardinals.
  return dot >= 0;
}


function drawTile(px, py, tile, h, rd, x, y) {
  // base
  const shade = 20 + h * 20;
  fillRect(px, py, TILE, TILE, `rgb(${16 + shade},${34 + shade},${56 + shade})`);
  ctx.strokeStyle = '#0c152b';
  ctx.strokeRect(px, py, TILE, TILE);

  const isRock = (tile === T.ROCK);

  // Elevation rendering:
  // - For ramps: draw contour (topographic) lines pointing to higher side.
  // - Otherwise: draw low-justified height bars.
  // - Skip bars under ROCK tiles to reduce clutter.
  if (!isRock) {
    const hasRamp = (typeof rd !== 'undefined' && rd !== R_NONE);
    if (hasRamp && typeof drawRampTopo === 'function') {
      // Optional angled contours: if x,y provided, bias lines toward local slope
      let ang;
      if (typeof slopeAngleAt === 'function' &&
          typeof x === 'number' && typeof y === 'number') {
        ang = slopeAngleAt(x, y); // may return null for flats
      }
      drawRampTopo(px, py, rd, h, ang ?? undefined);
    } else if (typeof drawHeightBars === 'function') {
      // keep your tuned BAR_H/BAR_GAP (e.g., 3/3) inside drawHeightBars
      drawHeightBars(px, py, h);
    }
  }

  // Terrain overlays / hazards / items
  if (tile === T.ROCK) {
    // simple block on top (no bars underneath)
    fillRect(px + 7, py + 7, 10, 10, '#6f8bb6');
  }
  if (tile === T.SAND) {
    if (typeof drawSandDots === 'function') {
      drawSandDots(px, py); // dotted sand
    } else {
      ctx.globalAlpha = 0.15; fillRect(px, py, TILE, TILE, '#c9d6ee'); ctx.globalAlpha = 1;
    }
  }
  if (tile === T.PIT) {
    fillRect(px, py, TILE, TILE, '#061020');
    drawPit(px, py);
  }
  if (tile === T.SOLAR) {
    ctx.globalAlpha = 0.20; fillRect(px, py, TILE, TILE, '#ffe28a'); ctx.globalAlpha = 1;
  }
  if (tile === T.RAD) {
    ctx.globalAlpha = 0.20; fillRect(px, py, TILE, TILE, '#ff8b8b'); ctx.globalAlpha = 1;
  }

  if (tile === T.SAMPLE) drawGlyph(px, py, 'S', '#9fe7ff');
  if (tile === T.BAT)    drawGlyph(px, py, 'B', '#79ffb0');
  if (tile === T.DATA)   drawStar(px + 12, py + 12, 5, 8, 3, '#8fd3ff');
  if (tile === T.GOAL) { ctx.globalAlpha = 0.25; fillRect(px, py, TILE, TILE, '#63ff9c'); ctx.globalAlpha = 1; }
}


function drawDrop(px,py,d){
  ctx.save();
  ctx.translate(px,py);
  ctx.strokeStyle='#8fd3ff'; ctx.strokeRect(4,4,TILE-8,TILE-8);
  ctx.fillStyle='#8fd3ff'; ctx.font='12px ui-monospace';
  ctx.fillText(d.label||'□', TILE/2-4, TILE/2+4);
  ctx.restore();
}
function drawPit(px,py){
  ctx.strokeStyle = '#08182f';
  for (let i=1;i<5;i++){ ctx.strokeRect(px+i*2, py+i*2, TILE-i*4, TILE-i*4); }
}

function drawGlyph(px, py, ch, color){
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '14px ui-monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, px + TILE/2, py + TILE/2);
  ctx.restore();
}

function drawStar(cx,cy,spikes,outerRadius,innerRadius,color) {
  ctx.save();
  let rot = Math.PI/2 * 3; 
  let x = cx; 
  let y = cy; 
  const step = Math.PI / spikes;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i=0;i<spikes;i++){
    x = cx + Math.cos(rot)*outerRadius; y = cy + Math.sin(rot)*outerRadius; ctx.lineTo(x,y); rot += step;
    x = cx + Math.cos(rot)*innerRadius; y = cy + Math.sin(rot)*innerRadius; ctx.lineTo(x,y); rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.stroke();
  ctx.restore();
}


/* New: grid labels drawn around the board */
function drawGridLabels(){
  ctx.save();
  ctx.fillStyle = '#93a7cc';
  ctx.font = '12px ui-monospace';
  ctx.textBaseline = 'middle';

  // top & bottom column indices
  ctx.textAlign = 'center';
  const topY = 12; // 12px from top
  const bottomY = 24 + ROWS*TILE + 12; // just below grid
  for (let x=0; x<COLS; x++){
    const cx = x*TILE + 48 + TILE/2;
    ctx.fillText(String(x), cx, topY);
    ctx.fillText(String(x), cx, bottomY);
  }

  // left & right row indices
  const leftX = 40;                   // just left of grid
  const rightX = 48 + COLS*TILE + 8;  // just right of grid
  for (let y=0; y<ROWS; y++){
    const cy = y*TILE + 24 + TILE/2;
    ctx.textAlign = 'right'; ctx.fillText(String(y), leftX, cy);
    ctx.textAlign = 'left';  ctx.fillText(String(y), rightX, cy);
  }
  ctx.restore();
}

/* ---------- Notifications ---------- */
function notify(msg, cls='ok', detailsText=null) {
  const row = document.createElement('div');
  row.className = `log-line ${cls}`;
  const head = document.createElement('div');
  head.className = 'log-head';
  head.textContent = `• ${msg}`;
  row.appendChild(head);

  if (detailsText && detailsText.length) {
    const ul = document.createElement('ul');
    ul.className = 'log-details hidden';
    const li = document.createElement('li');
    li.textContent = detailsText;
    ul.appendChild(li);
    row.appendChild(ul);

    // toggle the bullet on click
    head.style.cursor = 'pointer';
    head.addEventListener('click', () => {
      ul.classList.toggle('hidden');
    });
  }

  // Newest at the TOP
  if (logDiv.firstChild) {
    logDiv.insertBefore(row, logDiv.firstChild);
  } else {
    logDiv.appendChild(row);
  }
}

function formatCmd(c) {
  return (c.arg !== undefined && c.arg !== null) ? `${c.op} ${c.arg}` : c.op;
}


/* ---------- Legend (in modal) ---------- */

// Mini: low-justified height bars (for legend preview, uses same BAR look)
function drawHeightBarsMini(mctx, px, py, h){
  if (!h) return;
  const bars = Math.min(3, h);
  const BAR_H   = Math.max(3, Math.floor(TILE * 0.33));
  const BAR_GAP = Math.max(2, Math.floor(TILE * 0.10));
  const W = TILE - 8;
  const X = px + (TILE - W) / 2;
  let   y = py + TILE - 4 - BAR_H;

  for (let i = 0; i < bars; i++) {
    mctx.fillStyle = '#3f66a3';
    mctx.fillRect(X, y, W, BAR_H);

    // subtle bevel
    mctx.globalAlpha = 0.28; mctx.fillStyle = '#ffffff';
    mctx.fillRect(X, y, W, 1);
    mctx.globalAlpha = 0.22; mctx.fillStyle = '#000000';
    mctx.fillRect(X, y + BAR_H - 1, W, 1);
    mctx.globalAlpha = 1;

    y -= (BAR_H + BAR_GAP);
  }
}

// Mini: topo-line ramp (clipped to tile). Angle shows low→high direction.
function legendRampTopo(mctx, px, py, angleRad){
  mctx.save();

  // Clip to the mini tile so lines never spill over
  mctx.beginPath();
  mctx.rect(px, py, TILE, TILE);
  mctx.clip();

  mctx.strokeStyle = '#3a66b7';
  mctx.globalAlpha = 0.9;
  mctx.lineWidth   = 1;
  mctx.lineCap     = 'butt';

  const bands = 6;                      // number of contour lines
  const bias  = t => 1 - (1 - t) * (1 - t); // denser near HIGH side

  // gradient (low→high). Pick a pleasant diagonal for the legend preview.
  const a  = (typeof angleRad === 'number') ? angleRad : (-Math.PI/6); // ~-30°
  const vx = Math.cos(a),  vy = Math.sin(a);
  const ux = Math.cos(a + Math.PI/2), uy = Math.sin(a + Math.PI/2);

  const cx = px + TILE/2, cy = py + TILE/2;
  const R  = TILE/2;    // span along gradient
  const L  = TILE;      // length along contour (overdraw; clip trims)

  for (let i = 0; i < bands; i++) {
    const t  = (bands === 1) ? 0 : i / (bands - 1);
    const b  = bias(t);               // closer on high side
    const s  = -R + 2 * R * b;        // position along gradient
    const mx = cx + vx * s;
    const my = cy + vy * s;

    const x1 = mx - ux * L, y1 = my - uy * L;
    const x2 = mx + ux * L, y2 = my + uy * L;

    mctx.beginPath();
    mctx.moveTo(x1, y1);
    mctx.lineTo(x2, y2);
    mctx.stroke();
  }

  mctx.restore();
}


/* ---------- Legend (in modal) ---------- */
function buildLegend() {
  legendBody.innerHTML = '';

  // Existing catalog (from T_LIST), but render ramp with topo lines
  for (const {t,name} of T_LIST) {
    const tr = document.createElement('tr');
    const tdIcon = document.createElement('td');
    const tdName = document.createElement('td');
    const mini = document.createElement('canvas');
    mini.width = TILE; mini.height = TILE; mini.className = 'gridtile';
    const mctx = mini.getContext('2d');

    const px=0, py=0;
    const h = 0; // default height for most entries in this pass

    // base tile
    const shade = 20 + h*20;
    mctx.fillStyle = `rgb(${16+shade},${34+shade},${56+shade})`;
    mctx.fillRect(px,py,TILE,TILE);
    mctx.strokeStyle = '#0c152b';
    mctx.strokeRect(px,py,TILE,TILE);

    // RENDER BY TYPE
    if (t===T.RAMP) {
      // topo ramp preview (diagonal high side)
      legendRampTopo(mctx, px, py, -Math.PI/6);
    }

    // dotted sand
    if (t===T.SAND){
      mctx.globalAlpha = 0.28;
      mctx.fillStyle = '#c9d6ee';
      for (let yy=py+2; yy<py+TILE-1; yy+=4){
        for (let xx=px+2; xx<px+TILE-1; xx+=4){
          mctx.fillRect(xx, yy, 1, 1);
        }
      }
      mctx.globalAlpha = 1;
    }

    if (t===T.ROCK) { mctx.fillStyle = '#6f8bb6'; mctx.fillRect(px+7,py+7,10,10); }
    if (t===T.PIT) { mctx.fillStyle='#061020'; mctx.fillRect(px,py,TILE,TILE);
      mctx.strokeStyle = '#08182f'; for (let i=1;i<5;i++){ mctx.strokeRect(px+i*2, py+i*2, TILE-i*4, TILE-i*4); } }
    if (t===T.SOLAR){ mctx.globalAlpha=.20; mctx.fillStyle='#ffe28a'; mctx.fillRect(px,py,TILE,TILE); mctx.globalAlpha=1; }
    if (t===T.RAD){   mctx.globalAlpha=.20; mctx.fillStyle='#ff8b8b'; mctx.fillRect(px,py,TILE,TILE); mctx.globalAlpha=1; }
    if (t===T.SAMPLE){ mctx.fillStyle='#9fe7ff'; mctx.font='14px ui-monospace'; mctx.fillText('S', px+7, py+16); }
    if (t===T.BAT){    mctx.fillStyle='#79ffb0'; mctx.font='14px ui-monospace'; mctx.fillText('B', px+7, py+16); }
    if (t===T.DATA){
      let cx=12,cy=12,sp=5,or=8,ir=3,rot=Math.PI/2*3,step=Math.PI/sp;
      mctx.strokeStyle='#8fd3ff'; mctx.beginPath(); mctx.moveTo(cx, cy-or);
      for (let i=0;i<sp;i++){ let x=cx+Math.cos(rot)*or, y=cy+Math.sin(rot)*or; mctx.lineTo(x,y); rot+=step;
        x=cx+Math.cos(rot)*ir; y=cy+Math.sin(rot)*ir; mctx.lineTo(x,y); rot+=step; }
      mctx.lineTo(cx, cy-or); mctx.stroke();
    }
    if (t===T.GOAL){  mctx.globalAlpha=.25; mctx.fillStyle='#63ff9c'; mctx.fillRect(px,py,TILE,TILE); mctx.globalAlpha=1; }

    tdIcon.appendChild(mini);
    tdName.textContent = name;
    tr.appendChild(tdIcon); tr.appendChild(tdName);
    legendBody.appendChild(tr);
  }

  // EXTRA: explicit elevation examples (+1, +2, +3)
  const elevRows = [
    {lvl:1, label:'Elevation +1 (raised)'},
    {lvl:2, label:'Elevation +2'},
    {lvl:3, label:'Elevation +3 (highest)'},
  ];
  for (const {lvl,label} of elevRows) {
    const tr = document.createElement('tr');
    const tdIcon = document.createElement('td');
    const tdName = document.createElement('td');
    const mini = document.createElement('canvas');
    mini.width = TILE; mini.height = TILE; mini.className = 'gridtile';
    const mctx = mini.getContext('2d');

    const px=0, py=0;
    const shade = 20 + lvl*20;
    mctx.fillStyle = `rgb(${16+shade},${34+shade},${56+shade})`;
    mctx.fillRect(px,py,TILE,TILE);
    mctx.strokeStyle = '#0c152b';
    mctx.strokeRect(px,py,TILE,TILE);

    drawHeightBarsMini(mctx, px, py, lvl);

    tdIcon.appendChild(mini);
    tdName.textContent = label;
    tr.appendChild(tdIcon); tr.appendChild(tdName);
    legendBody.appendChild(tr);
  }
}

/* ---------- Inventory UI ---------- */
function renderInventory(){
  invUl.innerHTML = '';
  rover.inventory.forEach((it, idx)=>{
    const li = document.createElement('li');
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = `#${idx+1}`;
    const label = document.createElement('span');
    label.textContent = it.kind + (it.note?` — ${it.note}`:'');
    li.appendChild(label); li.appendChild(tag);
    invUl.appendChild(li);
  });
}

/* ---------- Objectives UI ---------- */
function updateObjectives(){
  objsUl.innerHTML='';
  let allDone=true;
  const list = [...missionList, ...dynamicObjectives];
  for(const m of list){
    const done = m.done(world, rover);
    const li = document.createElement('li');
    li.className = done ? 'done' : '';
    li.innerHTML = `<span>${m.text}</span><span class="badge">${done?'done':'open'}</span>`;
    objsUl.appendChild(li);
    if (!done) allDone=false;
  }
  if (allDone){
    document.getElementById('missionStory').textContent =
      'Mission complete. The relay uplink hums with good news.';
  }
}

/* ---------- Queue UI ---------- */
function renderQueue(){
  queueDiv.innerHTML = '';
  queue.sort((a,b)=> a.at-b.at);
  for (const q of queue){
    const chip = document.createElement('span'); chip.className='chip mono';
    const secs = Math.max(0, Math.ceil(q.at - simTime));
    const label = q.label || q.cmds.map(c => c.arg!=null ? `${c.op} ${c.arg}` : c.op).join('; ');
    chip.innerHTML = `${label} <span class="sub">• ${secs}s</span>`;
    queueDiv.appendChild(chip);
  }
}

/* ---------- Parser ---------- */
function parseCode(text){
  // Normalize: strip comments, uppercase, and treat ; or , as separators
  const rawLines = text
    .replace(/\/\/.*$/gm, '')            // remove // comments
    .replace(/[;,]/g, ' ')               // allow ; or , between cmds
    .split(/\r?\n/);

  // Tokenizer for simple commands (not REPEAT blocks)
  // Matches: F3, F 3, B10, DROP1, HOVER2, HOVER ON, HOVER OFF, WAIT5, SOLAR 3, etc.
  const SIMPLE = /\b(F|B|L|R|JUMP|SCAN|DRILL|PICKUP|SOLAR|WAIT|HOVER|DROP|MEASURE)\s*(?:([+-]?\d+)|\s+(ON|OFF))?\b/gi;

  // Build an array of uppercased, trimmed lines (skip empties)
  const lines = rawLines
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toUpperCase());

  let i = 0;

  function parseBlock() {
    const out = [];
    while (i < lines.length) {
      let s = lines[i++];

      // Close of a REPEAT block
      if (s === '}') break;

      // REPEAT k { ... }
      let m = s.match(/^REPEAT\s+(\d+)\s*\{\s*$/);
      if (m) {
        const times = parseInt(m[1], 10);
        const inner = parseBlock();               // parse until matching '}'
        for (let k = 0; k < times; k++) {
          // clone inner cmds so later edits don’t alias
          out.push(...inner.map(c => ({...c})));
        }
        continue;
      }

      // Otherwise: parse one or more simple commands on this line
      let any = false;
      let match;
      while ((match = SIMPLE.exec(s)) !== null) {
        any = true;
        const op = match[1];
        const num = match[2];
        const onoff = match[3];

        if (op === 'HOVER') {
          if (onoff === 'ON')      out.push({ op:'HOVER', arg:1 });
          else if (onoff === 'OFF')out.push({ op:'HOVER', arg:0 });
          else if (num != null)    out.push({ op:'HOVER', arg:parseInt(num,10) });
          else                     out.push({ op:'HOVER' }); // toggle if your game supports it
        } else if (op in {F:1,B:1,WAIT:1,SOLAR:1,DROP:1}) {
          out.push({ op, arg: num != null ? parseInt(num,10) : 1 });
        } else if (op in {L:1,R:1,JUMP:1,SCAN:1,DRILL:1,PICKUP:1,MEASURE:1}) {
          out.push({ op });
        }
      }

      if (!any) {
        // Unknown line (not REPEAT, didn’t match SIMPLE) — keep current behavior
        notify(`Unknown command: ${s}`, 'bad');
      }
    }
    return out;
  }

  i = 0;
  return parseBlock();
}

/* ---------- Transmission ---------- */
function summarizePacket(cmds){
  const s = cmds.map(c => c.arg!=null ? `${c.op} ${c.arg}` : c.op).join('; ');
  return s.length <= 60 ? s : s.slice(0,57)+'…';
}
function transmitPacket(cmds){
  const now = simTime;
  const label = summarizePacket(cmds);
  queue.push({cmds, at: now + transmitLag, label});

  // Log as a clickable row that reveals the exact commands
  const cmdList = cmds.map(formatCmd).join(', ');
  notify(`Transmitted packet (${cmds.length} cmd) with ${transmitLag}s lag`, 'warn', cmdList);

  renderQueue();
}


/* ---------- Helpers for MEASURE ---------- */
function clearMeasure(){
  measureMarks = [];
  measureTTL = 0; // hide now
}

// persistent=true keeps overlay until explicitly cleared
function computeMeasureMarksAt(sx, sy, persistent = false){
  measureMarks = [];
  measureTTL = persistent ? Infinity : 6; // seconds if non-persistent

  const blockers = (x,y)=>{
    const t = world.grid[y][x];
    return t===T.ROCK || t===T.PIT;
  };

  // → right
  for (let x = sx+1, n=1; x < COLS; x++, n++){
    if (blockers(x,sy)) break;
    measureMarks.push({ x, y:sy, n });
  }
  // ← left
  for (let x = sx-1, n=1; x >= 0; x--, n++){
    if (blockers(x,sy)) break;
    measureMarks.push({ x, y:sy, n });
  }
  // ↓ down
  for (let y = sy+1, n=1; y < ROWS; y++, n++){
    if (blockers(sx,y)) break;
    measureMarks.push({ x:sx, y, n });
  }
  // ↑ up
  for (let y = sy-1, n=1; y >= 0; y--, n++){
    if (blockers(sx,y)) break;
    measureMarks.push({ x:sx, y, n });
  }
}


/* ---------- Apply Packet (strict ordering) ---------- */
function applyPacket(cmds){
  // Simulated state across packet:
  let sx = rover.x, sy = rover.y, sz = rover.z;
  let sdir = rover.dir;
  let sHoverLevel = rover.hoverLevel;

  const TURN_DUR = 0.20;
  const MOVE_DUR = 0.18;
  const DRILL_DUR = 0.35;
  const PICKUP_DUR = 0.18;
  const HOVER_DUR = 0.18;

  function enqueueTurnTween(dirDelta, seconds){
    const sign = dirDelta > 0 ? +1 : -1;
    rover.animQueue.push({
      kind: sign>0 ? 'turnR' : 'turnL',
      dur: seconds, t:0, offx:0, offy:0, rot:0, scale:1,
      onStep(p){ this.rot = sign * (Math.PI/2) * p; },
      onDone(){ rover.dir = (rover.dir + (sign>0?1:3)) % 4; this.rot = 0; }
    });
  }
  function enqueueShake(seconds){
    rover.animQueue.push({ kind:'drill', dur: seconds, t:0, offx:0, offy:0, rot:0, scale:1,
      onStep(p){ this.offx = Math.sin(p * Math.PI * 16) * 2; },
      onDone(){ this.offx = 0; } });
  }
  function enqueueScale(seconds, from=1, to=0.88){
    rover.animQueue.push({ kind:'squash', dur: seconds, t:0, offx:0, offy:0, rot:0, scale:1,
      onStep(p){ this.scale = from + (to - from) * p; },
      onDone(){ this.scale = 1; } });
  }
  function enqueueHoverChange(seconds, toLevel){
    const turningOn = toLevel>0, fromLevel = rover.hoverLevel;
    rover.animQueue.push({ kind:'hover', dur: seconds, t:0, offx:0, offy:0, rot:0, scale:1,
      onStep(p){ this.scale = turningOn ? (1 + 0.08*p) : (1 + 0.08*(1-p)); },
      onDone(){ rover.hoverLevel = toLevel; rover.hover = rover.hoverLevel>0; this.scale=1; } });
  }
  function enqueueMoveStep(fromX, fromY, toX, toY){
    const dx = toX - fromX, dy = toY - fromY;
    const totalOffx = dx*TILE, totalOffy = dy*TILE;
    rover.animQueue.push({
      kind:'move', dur: MOVE_DUR, t:0, offx:0, offy:0, rot:0, scale:1,
      onStep(p){ this.offx = totalOffx * p; this.offy = totalOffy * p; },
      onDone(){ rover.x = toX; rover.y = toY; rover.z = world.height[toY][toX]; this.offx=this.offy=0; }
    });
  }
  function passable(nx, ny){
    if (!world.inBounds(nx,ny)) return false;
    const t = world.grid[ny][nx];
    if (t===T.ROCK) return false;
    if (t===T.PIT && sHoverLevel===0) return false;
    return true;
  }
  function rampConnects(cx,cy,nx,ny,dir){
    // either current has ramp pointing to next, or next has ramp pointing back
    const rdC = world.rampDir[cy][cx];
    const rdN = world.rampDir[ny][nx];
    if (rdC===dir) return true;
    const back = (dir+2)%4;
    if (rdN===back) return true;
    return false;
  }

  // Build timeline
  for (const cmd of cmds){
    const op = cmd.op;
    const arg = cmd.arg;

    if (op==='L'){ sdir = (sdir+3)%4; enqueueTurnTween(-1, TURN_DUR); continue; }
    if (op==='R'){ sdir = (sdir+1)%4; enqueueTurnTween(+1, TURN_DUR); continue; }

    if (op==='F' || op==='B'){
      clearMeasure(); // kill measure overlay as soon as we start moving
      const steps = Math.max(1, arg|0);
      const sign = (op==='F') ? 1 : -1;
      for (let n=0; n<steps; n++){
        const nx = sx + DIRS[sdir][0]*sign;
        const ny = sy + DIRS[sdir][1]*sign;
        if (!passable(nx,ny)){ notify('Blocked', 'warn'); break; }

        const dz = world.height[ny][nx] - sz; // next - current
        if (dz <= 0){
          if (dz < -SAFE_DROP){ notify('Drop too high.', 'warn'); break; }
        } else if (dz === 1){
  // Use new, more flexible ramp test (diagonals => 2 ups, cardinals => 3 ups)
  if (!(rampAllowsMove(sx, sy, nx, ny, sdir) || sHoverLevel >= 1)){
            notify('Too steep. Use ramp or HOVER 1.', 'warn'); break;
          }
        } else if (dz === 2 || dz === 3){
          if (sHoverLevel < dz){ notify(`Climb needs HOVER ${dz}.`, 'warn'); break; }
        } else {
          notify('Slope too extreme.', 'warn'); break;
        }

        const tile = world.grid[ny][nx];
        const stepCost = 1 + (tile===T.SAND ? 1 : 0) + sHoverLevel;
        rover.battery = Math.max(0, rover.battery - stepCost);

        enqueueMoveStep(sx, sy, nx, ny);
        if (tile===T.RAD){
          rover.animQueue.push({ kind:'rad', dur:0.10, t:0, offx:0, offy:0, rot:0, scale:1,
            onStep:()=>{}, onDone:()=>{} });
          rover.battery = Math.max(0, rover.battery-1);
        }
        world.revealRadius(nx, ny, 2);
        sx=nx; sy=ny; sz=world.height[ny][nx];
      }
      continue;
    }

    if (op==='JUMP'){
      clearMeasure();
      const nx = sx + DIRS[sdir][0]*2;
      const ny = sy + DIRS[sdir][1]*2;
      if (!world.inBounds(nx,ny)) { rover.tipped = true; notify('Jumped off map', 'bad'); break; }
      if (world.grid[ny][nx]===T.ROCK) { notify('Cannot land on rock', 'warn'); break; }
      if (world.height[ny][nx]-sz > 1) { notify('Jump too high', 'warn'); break; }
      rover.battery = Math.max(0, rover.battery-3);
      const totalOffx = DIRS[sdir][0]*TILE*2;
      const totalOffy = DIRS[sdir][1]*TILE*2;
      rover.animQueue.push({
        kind:'jump', dur:0.24, t:0, offx:0, offy:0, rot:0, scale:1,
        onStep(p){ this.offx = totalOffx * p; this.offy = totalOffy * p; },
        onDone(){ rover.x=nx; rover.y=ny; rover.z=world.height[ny][nx]; this.offx=this.offy=0; }
      });
      world.revealRadius(nx, ny, 2);
      sx=nx; sy=ny; sz=world.height[ny][nx];
      continue;
    }

    if (op==='SCAN'){
      world.revealRadius(sx, sy, 3);
      rover.animQueue.push({ kind:'scan', dur:0.20, t:0, offx:0, offy:0, rot:0, scale:1,
        onStep:()=>{}, onDone:()=>{} });
      continue;
    }

    if (op==='HOVER'){
      // arg undefined => toggle 0<->1, else clamp 0..3
      let to = (typeof arg==='number' && !isNaN(arg)) ? clamp(arg|0,0,H_MAX) : (sHoverLevel ? 0 : 1);
      sHoverLevel = to;
      enqueueHoverChange(HOVER_DUR, to);
      continue;
    }

    if (op==='DRILL'){
      if (world.grid[sy][sx] === T.SAMPLE) {
        enqueueShake(DRILL_DUR);
        notify('Core sample extracted. Use PICKUP.', 'ok');
      } else { notify('No sample here', 'warn'); }
      continue;
    }

    if (op==='PICKUP'){
      enqueueScale(PICKUP_DUR, 1, 0.88);
      const t = world.grid[sy][sx];
      rover.animQueue.push({ kind:'pickupApply', dur:0.001, t:0, offx:0, offy:0, rot:0, scale:1,
        onStep:()=>{}, onDone:()=>{
          // pick up item from grid or from drops overlay
          let picked=false;
          if (t===T.BAT){ rover.battery = Math.min(100, rover.battery+25); world.grid[sy][sx] = T.FLAT; notify('Battery +25%', 'ok'); picked=true; }
          else if (t===T.DATA){ rover.data++; rover.inventory.push({kind:'DATA'}); world.grid[sy][sx] = T.FLAT; notify(`Data collected (${rover.data})`, 'ok'); picked=true; }
          else if (t===T.SAMPLE){ rover.samples++; rover.inventory.push({kind:'SAMPLE'}); world.grid[sy][sx] = T.FLAT; notify(`Sample secured (${rover.samples})`, 'ok'); picked=true; }
          if (!picked){
            // check drops overlay
            const idx = drops.findIndex(d=>d.x===sx && d.y===sy);
            if (idx>=0){
              const d = drops.splice(idx,1)[0];
              rover.inventory.push({kind:d.kind, note:d.label});
              notify(`Picked up dropped ${d.kind}`, 'ok');
            } else {
              notify('Nothing to pick up', 'warn');
            }
          }
          draw(world, rover, simTime); // force immediate visual clear
          renderInventory();
          updateObjectives();
        }});
      continue;
    }

    if (op==='DROP'){
      const n = (Number(cmd.arg)|0) - 1;
      rover.animQueue.push({ kind:'drop', dur:PICKUP_DUR, t:0, offx:0, offy:0, rot:0, scale:1,
        onStep(p){ this.scale = 1 - 0.08*p; }, onDone(){
          this.scale = 1;
          if (n>=0 && n<rover.inventory.length){
            const item = rover.inventory.splice(n,1)[0];
            drops = drops.filter(d=>!(d.x===sx && d.y===sy)); // one per tile
            const label = item.kind==='SAMPLE'?'S': item.kind==='DATA'?'★':'B';
            drops.push({x:sx,y:sy,kind:item.kind,label});
            notify(`Dropped ${item.kind} at (${sx},${sy})`, 'ok');
            renderInventory(); updateObjectives();
          } else {
            notify('Invalid inventory index', 'bad');
          }
          draw(world, rover, simTime);
        }});
      continue;
    }

    if (op==='MEASURE'){
      // compute fresh marks; stop at rocks
      measureMarks = [];
      measureTTL = 6.0;
      const blockers = (x,y)=> world.grid[y][x]===T.ROCK;
      // right
      let n=1;
      for (let x=sx+1; x<COLS; x++, n++){
        if (blockers(x,sy)) break;
        measureMarks.push({x, y:sy, n});
      }
      // left
      n=1;
      for (let x=sx-1; x>=0; x--, n++){
        if (blockers(x,sy)) break;
        measureMarks.push({x, y:sy, n});
      }
      // down
      n=1;
      for (let y=sy+1; y<ROWS; y++, n++){
        if (blockers(sx,y)) break;
        measureMarks.push({x:sx, y, n});
      }
      // up
      n=1;
      for (let y=sy-1; y>=0; y--, n++){
        if (blockers(sx,y)) break;
        measureMarks.push({x:sx, y, n});
      }
      rover.animQueue.push({kind:'measure', dur:0.10, t:0, onStep:()=>{}, onDone:()=>{}});
      continue;
    }

    if (op==='SOLAR'){
      const sec = Math.max(1, (arg|0)||1);
      rover.animQueue.push({ kind:'solar', dur: sec, t:0, offx:0, offy:0, rot:0, scale:1,
        onStep: ()=>{}, onDone: ()=>{
          const rate = (world.grid[sy][sx]===T.SOLAR) && daylight>0.15 ? 3 : (daylight>0.15 ? 1 : 0);
          rover.battery = Math.min(100, rover.battery + sec*rate);
          notify(`Solar charge +${sec*rate}%`, rate>0?'ok':'warn');
        }});
      continue;
    }

    if (op==='WAIT'){
      rover.animQueue.push({ kind:'wait', dur: Math.max(0.1, (arg||0)), t:0, offx:0, offy:0, rot:0, scale:1,
        onStep:()=>{}, onDone:()=>{} });
      continue;
    }

    notify(`Unhandled command ${op}`, 'bad');
  }
}

/* --- Tile helpers: hazards & solar --- */
function inHazardTile(w, x, y) {
  // radiation drains battery while standing on it
  return w.grid[y]?.[x] === T.RAD;
}
function inSolarTile(w, x, y) {
  // used by SOLAR charge logic
  return w.grid[y]?.[x] === T.SOLAR;
}


/* ---------- Simulation ---------- */
function shouldAutoRun() {
  return running || queue.length > 0 || rover.animQueue.length > 0 || !!currentTween;
}

function step(dt){
  // Only advance simulation time/state when active
  if (shouldAutoRun()) {
    simTime += dt;

    // day/night cycle
    daytime = (simTime % 60) / 60;
    daylight = Math.max(0, Math.sin(daytime * Math.PI));

// deliver packets when their at-time arrives
queue.sort((a,b)=> a.at-b.at);
while (queue.length && queue[0].at <= simTime) {
  const pkt = queue.shift();
  applyPacket(pkt.cmds);                 // <-- one call per packet (keeps lag + animations correct)
}

    renderQueue();

    // drains
    if (rover.hover && !rover.tipped) rover.battery = Math.max(0, rover.battery - dt*0.5);
    if (inHazardTile(world, rover.x, rover.y)) rover.battery = Math.max(0, rover.battery - dt*0.7);

    // tween
    if (!currentTween && rover.animQueue.length) currentTween = rover.animQueue[0];
    if (currentTween) {
      currentTween.t += dt;
      const p = Math.min(1, currentTween.t / currentTween.dur);
      currentTween.onStep && currentTween.onStep(p);
      if (p >= 1) {
        currentTween.onDone && currentTween.onDone();
        rover.animQueue.shift();
        currentTween = null;
      }
    }

    // reveal and objectives while idle between tweens
    if (!rover.animQueue.length) world.revealRadius(rover.x, rover.y, 2);
    updateObjectives();

    // decay measure overlay unless persistent (Infinity)
    if (measureTTL !== Infinity && measureTTL > 0) {
      measureTTL -= dt;
      if (measureTTL <= 0) { measureMarks = []; }
    }
  }

  // HUD always updates
  document.getElementById('bat').textContent = Math.round(rover.battery);
  document.getElementById('mode').textContent = rover.hover ? 'HOVER' : 'GROUND';
  document.getElementById('pos').textContent = `${rover.x},${rover.y}`;
  document.getElementById('dir').textContent = DIRS[rover.dir][2];
  document.getElementById('height').textContent = rover.z;
  document.getElementById('time').textContent = Math.floor(simTime);
  document.getElementById('lagTxt').textContent = transmitLag;
  document.getElementById('daylight').textContent = daylight > 0.15 ? 'Day' : 'Night';

  // ALWAYS draw, even when idle (this fixes Measure toggle not appearing immediately)
  draw(world, rover, simTime);
}


function loop(ts){
  const dt = Math.min(0.05, (ts - lastTs)/1000);
  lastTs = ts;
  step(dt);
  requestAnimationFrame(loop);
}

/* ---------- Controls ---------- */
const btnSend = document.getElementById('btnTransmit');
btnSend.textContent = 'Send'; // label only says "Send" now
btnSend.onclick = ()=>{
  const cmds = parseCode(codeEl.value);
  if (cmds.length) transmitPacket(cmds);
  codeEl.value = ''; // clear command box after sending
};

document.getElementById('btnRun').onclick = ()=> running = true;
document.getElementById('btnStop').onclick = ()=> running = false;
document.getElementById('btnStep').onclick = ()=> { simTime += 1; };
document.getElementById('btnReset').onclick = ()=> reset(world.seed, currentLevelId);
document.getElementById('btnReseed').onclick = ()=> { currentLevelId='random'; levelSelect.value='random'; reset(); };
document.getElementById('btnHelp').onclick = ()=> openHelp();
document.getElementById('btnCrew').onclick = ()=> demoCrewPing();

lagEl.oninput = ()=>{ transmitLag = parseInt(lagEl.value); lagLabel.textContent = transmitLag + 's'; };

// Send hotkey still works (note now lives in Help modal)
window.addEventListener('keydown', (e)=>{
  if ((e.key === 'Enter') && (e.ctrlKey || e.metaKey)) {
    const cmds = parseCode(codeEl.value);
    if (cmds.length) transmitPacket(cmds);
    codeEl.value='';
    e.preventDefault();
  }
});

// Measure toggle button (instant on/off)
(function addMeasureToggle(){
  const stepBtn = document.getElementById('btnStep');
  if (!stepBtn) return;
  const toggle = document.createElement('button');
  toggle.id = 'btnMeasureAuto';
 toggle.classList.add('btn'); 
  toggle.textContent = 'Measure: OFF';
  toggle.onclick = ()=>{
    measureAuto = !measureAuto;
    toggle.textContent = 'Measure: ' + (measureAuto ? 'ON' : 'OFF');
    if (measureAuto) {
      // show immediately (persistent)
      computeMeasureMarksAt(rover.x, rover.y, /*persistent=*/true);
    } else {
      // hide immediately
      clearMeasure();
    }
  };
  stepBtn.insertAdjacentElement('afterend', toggle);
})();


/* Level + seed controls */
let currentLevelId = 'random';
levelSelect.onchange = ()=>{
  currentLevelId = levelSelect.value;
  if (currentLevelId==='random') reset(); else reset(undefined, currentLevelId);
};
document.getElementById('btnLoadSeed').onclick = ()=>{
  currentLevelId = 'random'; levelSelect.value='random';
  const val = seedInput.value.trim();
  if (val) reset(Number(val) || hashSeed(val));
};
document.getElementById('btnCopySeed').onclick = ()=>{
  navigator.clipboard?.writeText(String(world.seed));
  notify(`Seed copied: ${world.seed}`, 'ok');
};
function hashSeed(str){
  let h=2166136261>>>0;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h>>>0;
}

/* ---------- Help modal ---------- */
function openHelp(){
  helpModal.classList.remove('hidden');

  // One-time hotkey note inside the modal
  if (!document.getElementById('helpHotkeyNote')){
    const note = document.createElement('div');
    note.id = 'helpHotkeyNote';
    note.style.marginTop = '12px';
    note.style.opacity = '0.8';
    note.style.fontSize = '12px';
    note.textContent = 'Tip: You can also press Ctrl/Cmd+Enter to Send.';
    helpModal.appendChild(note);
  }
}

function closeHelp(){ helpModal.classList.add('hidden'); }
helpBackdrop?.addEventListener('click', closeHelp);
helpClose?.addEventListener('click', closeHelp);

/* ---------- Hover tile info ---------- */
canvas.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const x = Math.floor((cx - 48)/TILE);
  const y = Math.floor((cy - 24)/TILE);
  if (x>=0 && y>=0 && x<COLS && y<ROWS){
    const t = world.grid[y][x];
    let name = (T_LIST.find(o=>o.t===t)||{name:'Unknown'}).name;
    if (world.rampDir[y][x] !== R_NONE) name += ' — Ramp(+1)';
    const h = world.height[y][x];
    hoverInfo.textContent = ` ⟂ ${x},${y} — h${h} — ${name}`;
  } else {
    hoverInfo.textContent = '';
  }
});

/* ---------- Reset ---------- */
function reset(seed, levelId='random'){
  if (levelId==='random') {
    world = makeRandomWorld(seed ?? Date.now());
    missionList = missionsForLevel('random');
    document.getElementById('missionStory').textContent =
      'Random sector. Collect samples and data, then reach the beacon.';
  } else {
    world = makeTutorial(levelId);
    missionList = missionsForLevel(levelId);
    document.getElementById('missionStory').textContent =
      levelId==='tutorial1' ? 'Tutorial 1: Movement, scanning, pickups.'
      : levelId==='tutorial2' ? 'Tutorial 2: Use ramps or HOVER to climb.'
      : 'Tutorial 3: Manage energy, radiation, and solar charging.';
  }

  rover = makeRover(world);
  queue = []; simTime = 0; running = false; currentTween = null;
  drops = []; measureMarks=[]; measureTTL=0; dynamicObjectives=[];
  seedSpan.textContent = world.seed;
  seedInput.placeholder = String(world.seed);
  codeEl.value = ''; logDiv.innerHTML = '';
  renderInventory(); updateObjectives(); buildLegend(); draw(world, rover, simTime);
}

/* ---------- Crew messaging (demo + system) ---------- */
function addCrewMessage(text, onAccept){
  const box = document.createElement('div');
  box.className = 'msg';
  box.innerHTML = `<div class="from">Crew</div>
    <div class="meta mono">${new Date().toLocaleTimeString()}</div>
    <div class="body">${text}</div>
    <div class="btns">
      <button class="yes">Y</button>
      <button class="no">N</button>
    </div>`;
  const yes = box.querySelector('.yes');
  const no = box.querySelector('.no');
  yes.onclick = ()=>{
    msgDiv.removeChild(box);
    notify('Affirmative. Added to objectives.', 'ok');
    onAccept && onAccept();
    updateObjectives();
  };
  no.onclick = ()=>{
    msgDiv.removeChild(box);
    notify(`Negative. Tell them to file a ticket.`, 'warn');
  };
  msgDiv.appendChild(box);
  msgDiv.scrollTop = msgDiv.scrollHeight;
}
function demoCrewPing(){
  const tx = 3 + Math.floor(Math.random()*(COLS-6));
  const ty = 3 + Math.floor(Math.random()*(ROWS-6));
  addCrewMessage(`Hey pilot, I left my toolbox at (${tx},${ty}). Can you grab it?`, ()=>{
    const objId = 'crew_'+tx+'_'+ty;
    dynamicObjectives.push({
      id: objId,
      text: `Retrieve toolbox at (${tx},${ty}) and DROP it at start (${world.start.x},${world.start.y}).`,
      done: (w,r)=> drops.some(d=>d.x===w.start.x && d.y===w.start.y && d.kind==='TOOLBOX')
    });
    drops.push({x:tx,y:ty,kind:'TOOLBOX',label:'🧰'});
    draw(world, rover, simTime);
  });
}

/* ---------- Boot ---------- */
transmitLag = parseInt(lagEl.value); lagLabel.textContent = transmitLag + 's';
reset(); buildLegend();
requestAnimationFrame(loop);
