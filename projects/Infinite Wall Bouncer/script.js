/* Wall Bounce Composer — Infinite Playfield
   Full file — adds:
   - Follow Ball (checkbox, default ON) with smart pause after manual pan/zoom
   - Last Run Path (checkbox, default ON) + Clear Path
   - Disable DROP while a run is active (but still records start on DROP)
   - Per-block Note Length (Whole default) + global Tempo (BPM)
   - Instruments (Pure, Bell, Chime, Organ, Pluck, DualSaw) + Wave respected where applicable
   - Wave control grayed out when inactive
   - Smooth recenter to start on Reset
*/

(() => {
  /* ---------- Utilities ---------- */
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function dist(ax,ay,bx,by){ return Math.hypot(ax-bx,ay-by); }
  function nowMs(){ return performance.now(); }
  function easeInOut(u){ return u*u*(3-2*u); } // smoothstep

  /* ---------- Notes & Color (define early) ---------- */
  const LETTERS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  function midiFromName(letter, octave){
    const pc = LETTERS.indexOf(letter);
    return 12 * (octave + 1) + pc; // C4 = 60
  }
  function freqFromMidi(m){ return 440 * Math.pow(2, (m - 69)/12); }
  function colorFromMidi(m){
    const pc = ((m % 12) + 12) % 12;
    const hue = (pc / 12) * 360;
    return `hsl(${hue.toFixed(1)} 72% 56%)`;
  }

  /* ---------- DOM ---------- */
  const stage = document.getElementById('stage');
  const ctx = stage.getContext('2d');
  const mini = document.getElementById('mini');
  const mctx = mini.getContext('2d');
  const preview = document.getElementById('preview');
  const pctx = preview.getContext('2d');

  const spawnBtn = document.getElementById('spawn');
  const delSelBtn = document.getElementById('delSel');
  const cloneSelBtn = document.getElementById('cloneSel');

  const noteLetter = document.getElementById('noteLetter');
  const noteOctave = document.getElementById('noteOctave');
  const noteLengthSel = document.getElementById('noteLength');

  const waveSel = document.getElementById('waveSel');
  const waveNote = document.getElementById('waveNote');
  const instrumentSel = document.getElementById('instrumentSel');

  const volSlider = document.getElementById('vol');
  const bpmSlider = document.getElementById('bpm');
  const bpmOut = document.getElementById('bpmOut');
  const gravitySlider = document.getElementById('gravity');
  const restitutionSlider = document.getElementById('restitution');

  const followBallChk = document.getElementById('followBall');
  const showPathChk = document.getElementById('showPath');
  const clearPathBtn = document.getElementById('clearPath');

  const dropBtn = document.getElementById('drop');
  const resetBtn = document.getElementById('reset');
  const setStartBtn = document.getElementById('setStart');

  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomResetBtn = document.getElementById('zoomReset');

  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');
  const fileInput = document.getElementById('fileInput');

  const dirAngle = document.getElementById('dirAngle');
  const dirSpeed = document.getElementById('dirSpeed');
  const angleOut = document.getElementById('angleOut');
  const speedOut = document.getElementById('speedOut');

  const sRun = document.getElementById('sRun');
  const sBounces = document.getElementById('sBounces');
  const sBlocks = document.getElementById('sBlocks');
  const sStartPos = document.getElementById('sStartPos');
  const sStartDir = document.getElementById('sStartDir');

  /* ---------- Canvas sizing ---------- */
  function fitCanvas(c) {
    const rect = c.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return dpr;
  }
  function resizeAll(){ fitCanvas(stage); fitCanvas(mini); }
  window.addEventListener('resize', ()=>{ resizeAll(); pauseFollow(); });

  /* ---------- Audio ---------- */
  const ACtx = window.AudioContext || window.webkitAudioContext;
  const audio = new ACtx();
  const master = audio.createGain();
  master.gain.value = parseFloat(volSlider.value);
  master.connect(audio.destination);
  volSlider.addEventListener('input', ()=> master.gain.value = parseFloat(volSlider.value));
  function ensureAudio(){ if (audio.state !== 'running') audio.resume?.(); }

  /* ---------- Synths ---------- */
  function envGain(node, t0, a=0.01, d=0.15, s=0.0, r=0.25, peak=0.8){
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    const sLevel = Math.max(0.0001, s);
    g.gain.exponentialRampToValueAtTime(sLevel, t0 + a + d);
    node.connect(g);
    return { out:g, release:(t)=>{ g.gain.exponentialRampToValueAtTime(0.0001, t + r); } };
  }

  function playPure(freq, wave, dur){
    const t0 = audio.currentTime + 0.0005;
    const t1 = t0 + dur;
    const osc = new OscillatorNode(audio, { type: wave, frequency: freq });
    const eg = envGain(osc, t0, 0.005, 0.06, 0.0001, 0.15, 0.9);
    eg.out.connect(master);
    osc.start(t0); osc.stop(t1 + 0.05);
    eg.release(t1);
  }

  function playBell(freq, dur){
    const t0 = audio.currentTime + 0.0005;
    const t1 = t0 + dur;
    const car = new OscillatorNode(audio, { type:'sine', frequency: freq });
    const mod = new OscillatorNode(audio, { type:'sine', frequency: freq*2.0 });
    const modGain = audio.createGain();
    modGain.gain.setValueAtTime(90, t0);
    modGain.gain.exponentialRampToValueAtTime(2, t1);
    mod.connect(modGain).connect(car.frequency);

    const g = audio.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(0.9, t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t1+0.2);

    car.connect(g).connect(master);
    car.start(t0); mod.start(t0);
    car.stop(t1+0.25); mod.stop(t1+0.25);
  }

  function playChime(freq, dur){
    const t0 = audio.currentTime + 0.0005;
    const t1 = t0 + dur;
    const o1 = new OscillatorNode(audio, { type:'sine', frequency: freq * 1.0 });
    const o2 = new OscillatorNode(audio, { type:'sine', frequency: freq * 2.67 });
    const g1 = audio.createGain(), g2 = audio.createGain();
    g1.gain.value = 0.7; g2.gain.value = 0.4;
    const sum = audio.createGain();
    sum.gain.value = 1.0;

    const eg = audio.createGain();
    eg.gain.setValueAtTime(0.001, t0);
    eg.gain.exponentialRampToValueAtTime(0.9, t0+0.005);
    eg.gain.exponentialRampToValueAtTime(0.0001, t1+0.25);

    o1.connect(g1).connect(sum);
    o2.connect(g2).connect(sum);
    sum.connect(eg).connect(master);
    o1.start(t0); o2.start(t0);
    o1.stop(t1+0.3); o2.stop(t1+0.3);
  }

  function playOrgan(freq, dur){
    const t0 = audio.currentTime + 0.0005;
    const t1 = t0 + dur;
    const parts = [1.0, 2.0, 3.0].map((mul, i)=>{
      const o = new OscillatorNode(audio,{type:'sine', frequency: freq*mul});
      const g = audio.createGain(); g.gain.value = [0.7,0.4,0.25][i];
      o.connect(g); return {o,g};
    });
    const mix = audio.createGain();
    parts.forEach(p=> p.g.connect(mix));
    const eg = envGain(mix, t0, 0.02, 0.1, 0.2, 0.2, 0.8);
    eg.out.connect(master);
    parts.forEach(p=> p.o.start(t0));
    parts.forEach(p=> p.o.stop(t1+0.25));
    eg.release(t1);
  }

  function makeNoiseBuffer(){
    const sr = audio.sampleRate, len = Math.floor(sr * 1.5);
    const buf = audio.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i=0;i<len;i++) data[i] = Math.random()*2-1;
    return buf;
  }
  const noiseBuf = makeNoiseBuffer();

  function playPluck(freq, dur){
    const t0 = audio.currentTime + 0.0005;
    const t1 = t0 + dur;
    const src = audio.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.setValueAtTime(freq/220, t0);

    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(8000, freq*4), t0);
    lp.Q.value = 0.6;

    const g = audio.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.1);

    src.connect(lp).connect(g).connect(master);
    src.start(t0); src.stop(t1 + 0.12);
  }

  function playDualSaw(freq, wave, dur){
    const t0 = audio.currentTime + 0.0005;
    const t1 = t0 + dur;
    const o1 = new OscillatorNode(audio, { type: wave, frequency: freq*0.997 });
    const o2 = new OscillatorNode(audio, { type: wave, frequency: freq*1.003 });
    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(8000, freq*3.0), t0);
    lp.Q.value = 0.7;

    const eg = envGain(lp, t0, 0.003, 0.06, 0.0001, 0.18, 0.9);
    eg.out.connect(master);

    o1.connect(lp); o2.connect(lp);
    o1.start(t0); o2.start(t0);
    o1.stop(t1 + 0.2); o2.stop(t1 + 0.2);
    eg.release(t1);
  }

  function playHit(midi, speed){
    const instr = instrumentSel.value;
    const baseFreq = freqFromMidi(midi);
    const noteDiv = currentHitNoteDiv; // set per-collision from the block
    const beats = 4 * noteDiv;           // whole = 4 beats
    const baseDur = beats * (60 / world.bpm);
    const speedFactor = clamp(0.9 + Math.min(1.0, speed/1400)*0.25, 0.9, 1.15);
    const dur = clamp(baseDur * speedFactor, 0.05, 4.0);

    ensureAudio();
    if (instr === 'pure') return playPure(baseFreq, waveSel.value, dur);
    if (instr === 'bell') return playBell(baseFreq, dur);
    if (instr === 'chime') return playChime(baseFreq, dur);
    if (instr === 'organ') return playOrgan(baseFreq, dur);
    if (instr === 'pluck') return playPluck(baseFreq, dur);
    if (instr === 'dualsaw') return playDualSaw(baseFreq, waveSel.value, dur);
  }

  function refreshWaveEnable(){
    const instr = instrumentSel.value;
    const active = (instr === 'pure' || instr === 'dualsaw');
    waveSel.classList.toggle('inactive', !active);
    waveNote.classList.toggle('inactive', !active);
  }
  instrumentSel.addEventListener('change', refreshWaveEnable);

  /* ---------- Camera / world ---------- */
  const camera = { x: 0, y: 0, scale: 1, min: 0.4, max: 3 };
  function screenToWorld(px, py){
    return { x: px / camera.scale + camera.x, y: py / camera.scale + camera.y };
  }
  function worldToScreen(wx, wy){
    return { x: (wx - camera.x) * camera.scale, y: (wy - camera.y) * camera.scale };
  }
  function getViewSize(){
    const dpr = window.devicePixelRatio||1;
    const viewW = stage.width/dpr, viewH = stage.height/dpr;
    return { vw: viewW/camera.scale, vh: viewH/camera.scale, pxW:viewW, pxH:viewH };
  }

  /* Smooth recenter tween (used on Reset) */
  let camTween = null; // {t,dur,sx,sy,tx,ty}
  function startCameraTweenTo(wx, wy, dur=0.35){
    const { vw, vh } = getViewSize();
    const tx = wx - vw/2;
    const ty = wy - (vh*0.35); // same vertical bias we use for follow
    camTween = { t:0, dur, sx:camera.x, sy:camera.y, tx, ty };
    pauseFollow(1000); // give you a moment before follow resumes
  }

  /* ---------- Game State ---------- */
  const world = {
    g: parseFloat(gravitySlider.value),
    restitution: parseFloat(restitutionSlider.value),
    bpm: parseInt(bpmSlider.value, 10),
    running: false,
    runId: 0,
    bouncesThisRun: 0,
    follow: followBallChk.checked,
    showPath: showPathChk.checked
  };
  gravitySlider.addEventListener('input', ()=> world.g = parseFloat(gravitySlider.value));
  restitutionSlider.addEventListener('input', ()=> world.restitution = parseFloat(restitutionSlider.value));
  bpmSlider.addEventListener('input', ()=>{ world.bpm = parseInt(bpmSlider.value,10); bpmOut.textContent = `${world.bpm} BPM`; });

  followBallChk.addEventListener('change', ()=> world.follow = followBallChk.checked);
  showPathChk.addEventListener('change', ()=> {});

  const ball = { x: 520, y: 140, r: 12, vx: 400, vy: 0 };
  const startState = { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
  const blocks = []; // {x,y,w,h,angle,midi,pulse,noteDiv}

  // Path tracking
  let pathCurr = []; // [{x,y}]
  let pathLast = []; // [{x,y}]
  function clearPath(){ pathLast = []; clearPathBtn.disabled = true; }
  clearPathBtn.addEventListener('click', clearPath);

  // Follow-cam pause after manual pan/zoom
  let followPauseUntil = 0;
  function pauseFollow(ms=1500){ followPauseUntil = nowMs() + ms; }

  /* ---------- Direction UI ---------- */
  function updateDirSlidersFromBall(){
    const ang = Math.atan2(ball.vy, ball.vx) * 180/Math.PI;
    const spd = Math.hypot(ball.vx, ball.vy);
    dirAngle.value = Math.round(ang);
    dirSpeed.value = Math.round(spd);
    angleOut.textContent = `${Math.round(ang)}°`;
    speedOut.textContent = `${Math.round(spd)}`;
  }
  function applyDirFromSliders(){
    const ang = parseFloat(dirAngle.value) * Math.PI/180;
    const spd = parseFloat(dirSpeed.value);
    ball.vx = Math.cos(ang) * spd;
    ball.vy = Math.sin(ang) * spd;
    angleOut.textContent = `${dirAngle.value}°`;
    speedOut.textContent = `${dirSpeed.value}`;
  }
  dirAngle.addEventListener('input', applyDirFromSliders);
  dirSpeed.addEventListener('input', applyDirFromSliders);

  function setStartFromCurrent(){
    startState.x = ball.x; startState.y = ball.y;
    startState.vx = ball.vx; startState.vy = ball.vy;
    sStartPos.textContent = `${startState.x.toFixed(0)},${startState.y.toFixed(0)}`;
    const a = Math.atan2(startState.vy, startState.vx) * 180/Math.PI;
    const s = Math.hypot(startState.vx, startState.vy);
    sStartDir.textContent = `${Math.round(a)}° @ ${Math.round(s)}`;
  }
  setStartBtn.addEventListener('click', ()=>{ if (!world.running) setStartFromCurrent(); });

  function resetBallToStart(){
    world.running = false;
    ball.x = startState.x; ball.y = startState.y;
    ball.vx = startState.vx; ball.vy = startState.vy;
    updateDirSlidersFromBall();
    world.bouncesThisRun = 0;
    sBounces.textContent = '0';
    dropBtn.disabled = false;
    setStartBtn.disabled = false;

    // finalize last path
    pathLast = pathCurr;
    clearPathBtn.disabled = (pathLast.length === 0);
    pathCurr = [];

    // smooth recenter on the saved start (keeps current zoom)
    startCameraTweenTo(startState.x, startState.y, 0.35);
  }

  /* ---------- Builder helpers ---------- */
  function buildMidi(){ return midiFromName(noteLetter.value, parseInt(noteOctave.value,10)); }
  function buildColor(){ return colorFromMidi(buildMidi()); }
  function buildNoteDiv(){ return parseFloat(noteLengthSel.value); }

  /* ---------- Blocks ---------- */
  function newBlockAt(x, y){
    const midi = buildMidi();
    const b = { x, y, w: 140, h: 24, angle: 0, midi, pulse: 0, noteDiv: buildNoteDiv() };
    blocks.push(b);
    // move ball start just below last spawned block
    startState.x = b.x;
    startState.y = b.y + 80;
    setStartFromCurrent();
  }

  /* ---------- Input ---------- */
  let mouse = { x:0, y:0, down:false, button:0, world:{x:0,y:0} };
  let sel = { idx:-1, mode:null, ox:0, oy:0, ang0:0 }; // dragBlock | rotate | dragBall | pan | ballAngle
  let previewDragging = false;
  let previewGhost = null;

  function updateMouse(e){
    const r = stage.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.world = screenToWorld(mouse.x, mouse.y);
  }

  stage.addEventListener('contextmenu', e => e.preventDefault());

  stage.addEventListener('mousemove', (e)=>{
    updateMouse(e);

    if (mouse.down){
      if (sel.mode === 'dragBlock' && sel.idx>=0){
        const b = blocks[sel.idx];
        b.x = mouse.world.x + sel.ox;
        b.y = mouse.world.y + sel.oy;
      } else if (sel.mode === 'rotate' && sel.idx>=0){
        const b = blocks[sel.idx];
        const ang = Math.atan2(mouse.world.y - b.y, mouse.world.x - b.x);
        b.angle = ang - sel.ang0;
      } else if (sel.mode === 'dragBall'){
        ball.x = mouse.world.x + sel.ox;
        ball.y = mouse.world.y + sel.oy;
        world.running = false;
        updateDirSlidersFromBall();
      } else if (sel.mode === 'pan'){
        camera.x = sel.ox - (mouse.x / camera.scale);
        camera.y = sel.oy - (mouse.y / camera.scale);
        pauseFollow();
      } else if (sel.mode === 'ballAngle'){
        const dx = mouse.world.x - ball.x;
        const dy = mouse.world.y - ball.y;
        const ang = Math.atan2(dy, dx) * 180/Math.PI;
        dirAngle.value = Math.round(ang);
        applyDirFromSliders();
      }
    }
  });

  let spaceDown = false;

  stage.addEventListener('mousedown', (e)=>{
    ensureAudio();
    updateMouse(e);
    mouse.down = true; mouse.button = e.button;

    if (e.button === 2 || spaceDown){
      sel.mode = 'pan';
      sel.ox = camera.x + (mouse.x / camera.scale);
      sel.oy = camera.y + (mouse.y / camera.scale);
      pauseFollow();
      return;
    }

    if (!world.running){
      const s = worldToScreen(ball.x, ball.y);
      if (Math.hypot(mouse.x - s.x, mouse.y - s.y) > (ball.r+12)*camera.scale &&
          Math.hypot(mouse.x - s.x, mouse.y - s.y) < (ball.r+32)*camera.scale){
        sel.mode = 'ballAngle';
        return;
      }
    }

    const rHit = hitRotateHandle(mouse.world.x, mouse.world.y);
    if (rHit.idx !== -1){
      sel.idx = rHit.idx;
      sel.mode = 'rotate';
      const b = blocks[sel.idx];
      sel.ang0 = Math.atan2(mouse.world.y - b.y, mouse.world.x - b.x) - b.angle;
      return;
    }

    const bHit = hitBlock(mouse.world.x, mouse.world.y);
    if (bHit.idx !== -1){
      sel.idx = bHit.idx;
      sel.mode = 'dragBlock';
      const b = blocks[sel.idx];
      sel.ox = b.x - mouse.world.x;
      sel.oy = b.y - mouse.world.y;
      const pc = ((b.midi % 12)+12)%12;
      noteLetter.value = LETTERS[pc];
      noteOctave.value = Math.floor(b.midi/12) - 1;
      noteLengthSel.value = String(b.noteDiv ?? 1);
      drawPreview();
      return;
    }

    if (!world.running && dist(mouse.world.x, mouse.world.y, ball.x, ball.y) <= ball.r + 2){
      sel.idx = -1; sel.mode = 'dragBall';
      sel.ox = ball.x - mouse.world.x;
      sel.oy = ball.y - mouse.world.y;
      return;
    }

    sel.idx = -1; sel.mode = null;
  });

  window.addEventListener('mouseup', ()=>{
    mouse.down = false; sel.mode = null;
    if (previewDragging){
      previewDragging = false;
      document.getElementById('stageWrap').classList.remove('dragging');
      if (previewGhost){
        newBlockAt(previewGhost.x, previewGhost.y);
        sel.idx = blocks.length - 1;
        previewGhost = null;
      }
    }
  });

  stage.addEventListener('wheel', (e)=>{
    e.preventDefault();
    pauseFollow();
    const prev = camera.scale;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const next = clamp(prev * factor, camera.min, camera.max);
    const mouseWorldBefore = screenToWorld(e.offsetX, e.offsetY);
    camera.scale = next;
    const mouseWorldAfter = screenToWorld(e.offsetX, e.offsetY);
    camera.x += (mouseWorldBefore.x - mouseWorldAfter.x);
    camera.y += (mouseWorldBefore.y - mouseWorldAfter.y);
  }, { passive: false });

  window.addEventListener('keydown', (e)=>{
    if (e.key === ' ') spaceDown = true;
    if (e.key.toLowerCase() === 'q' && sel.idx>=0){ const b=blocks[sel.idx]; b.angle -= 5*Math.PI/180; }
    if (e.key.toLowerCase() === 'e' && sel.idx>=0){ const b=blocks[sel.idx]; b.angle += 5*Math.PI/180; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel.idx>=0){ blocks.splice(sel.idx,1); sel.idx=-1; }
    if (e.key.toLowerCase() === 'c' && sel.idx>=0){ cloneSelected(); }
  });
  window.addEventListener('keyup', (e)=>{ if (e.key === ' ') spaceDown = false; });

  // builder buttons
  spawnBtn.addEventListener('click', ()=>{
    ensureAudio();
    const center = screenToWorld(stage.width/(window.devicePixelRatio||1)/2, stage.height/(window.devicePixelRatio||1)/2);
    newBlockAt(center.x, center.y);
    sel.idx = blocks.length - 1;
  });
  delSelBtn.addEventListener('click', ()=>{ if (sel.idx>=0){ blocks.splice(sel.idx,1); sel.idx=-1; } });
  cloneSelBtn.addEventListener('click', cloneSelected);
  function cloneSelected(){
    if (sel.idx<0) return;
    const b = blocks[sel.idx];
    blocks.push({ x:b.x, y:b.y + b.h + 10, w:b.w, h:b.h, angle:b.angle, midi:b.midi, pulse:0, noteDiv:b.noteDiv ?? 1 });
    sel.idx = blocks.length - 1;
  }

  // Builder: updating note length of selection
  noteLengthSel.addEventListener('change', ()=>{
    if (sel.idx>=0){
      const b = blocks[sel.idx];
      b.noteDiv = parseFloat(noteLengthSel.value);
    }
    drawPreview();
  });

  // drag from preview
  preview.addEventListener('mousedown', ()=>{
    previewDragging = true;
    document.getElementById('stageWrap').classList.add('dragging');
  });
  document.addEventListener('mousemove', (e)=>{
    if (!previewDragging) return;
    const r = stage.getBoundingClientRect();
    const inside = e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom;
    if (inside){
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const wpt = screenToWorld(sx, sy);
      previewGhost = { x:wpt.x, y:wpt.y, w:140, h:24, angle:0, midi:buildMidi(), noteDiv:buildNoteDiv() };
    } else {
      previewGhost = null;
    }
  });

  // zoom controls
  zoomInBtn.addEventListener('click', ()=>{ zoomTo(camera.scale * 1.2); pauseFollow(); });
  zoomOutBtn.addEventListener('click', ()=>{ zoomTo(camera.scale / 1.2); pauseFollow(); });
  zoomResetBtn.addEventListener('click', ()=>{ zoomTo(1); pauseFollow(); });
  function zoomTo(target){
    const centerPx = { x: stage.width/(window.devicePixelRatio||1)/2, y: stage.height/(window.devicePixelRatio||1)/2 };
    const before = screenToWorld(centerPx.x, centerPx.y);
    camera.scale = clamp(target, camera.min, camera.max);
    const after = screenToWorld(centerPx.x, centerPx.y);
    camera.x += (before.x - after.x);
    camera.y += (before.y - after.y);
  }

  /* ---------- Export / Import ---------- */
  exportBtn.addEventListener('click', ()=>{
    const data = {
      camera,
      settings: {
        g: world.g, restitution: world.restitution, wave: waveSel.value, vol: parseFloat(volSlider.value),
        instrument: instrumentSel.value, bpm: world.bpm, followBall: world.follow, showPath: showPathChk.checked
      },
      start: startState,
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, r: ball.r },
      blocks: blocks.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,angle:b.angle,midi:b.midi,noteDiv:b.noteDiv??1}))
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wall-bounce-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  importBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try{
      const obj = JSON.parse(text);
      blocks.length = 0;
      for (const b of obj.blocks || []) blocks.push({ ...b, pulse:0, noteDiv: b.noteDiv ?? 1 });
      if (obj.ball){ Object.assign(ball, obj.ball); }
      if (obj.start){ Object.assign(startState, obj.start); }
      if (obj.camera){ camera.x=obj.camera.x; camera.y=obj.camera.y; camera.scale=obj.camera.scale; }
      if (obj.settings){
        world.g = obj.settings.g ?? world.g;
        world.restitution = obj.settings.restitution ?? world.restitution;
        gravitySlider.value = world.g;
        restitutionSlider.value = world.restitution;
        waveSel.value = obj.settings.wave ?? 'sine';
        volSlider.value = obj.settings.vol ?? volSlider.value;
        instrumentSel.value = obj.settings.instrument ?? 'pure';
        world.bpm = obj.settings.bpm ?? world.bpm;
        bpmSlider.value = String(world.bpm);
        bpmOut.textContent = `${world.bpm} BPM`;
        followBallChk.checked = !!obj.settings.followBall;
        showPathChk.checked = !!obj.settings.showPath;
        world.follow = followBallChk.checked;
        master.gain.value = parseFloat(volSlider.value);
        refreshWaveEnable();
      }
      updateDirSlidersFromBall();
      setStartFromCurrent();
    }catch(err){ alert('Invalid JSON'); }
    fileInput.value = '';
  });

  /* ---------- Physics & Collisions ---------- */
  let currentHitNoteDiv = 0.25;
  function step(dt){
    // Camera tween (e.g., on Reset) takes precedence
    if (camTween){
      camTween.t += dt;
      const u = clamp(camTween.t / camTween.dur, 0, 1);
      const e = easeInOut(u);
      camera.x = camTween.sx + (camTween.tx - camTween.sx) * e;
      camera.y = camTween.sy + (camTween.ty - camTween.sy) * e;
      if (u >= 1) camTween = null;
    } else if (world.follow && world.running && nowMs() >= followPauseUntil){
      // follow camera (smooth) when enabled
      const { vw, vh } = getViewSize();
      const targetX = ball.x - vw/2;
      const targetY = ball.y - (vh*0.35);
      const alpha = 1 - Math.exp(-12 * dt);
      camera.x += (targetX - camera.x) * alpha;
      camera.y += (targetY - camera.y) * alpha;
    }

    if (!world.running){
      for (const b of blocks){ if (b.pulse>0) b.pulse = Math.max(0, b.pulse - dt*2.5); }
      return;
    }

    ball.vy += world.g * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // path recording with light decimation
    if (pathCurr.length === 0 || dist(ball.x, ball.y, pathCurr[pathCurr.length-1].x, pathCurr[pathCurr.length-1].y) > 6){
      pathCurr.push({ x: ball.x, y: ball.y });
      if (pathCurr.length > 6000) pathCurr.shift();
    }

    for (const b of blocks){
      const res = collideBallRotRect(ball, b);
      if (res.hit){
        ball.x += res.nx * res.pen;
        ball.y += res.ny * res.pen;
        const vdotn = ball.vx*res.nx + ball.vy*res.ny;
        ball.vx = (ball.vx - 2*vdotn*res.nx) * world.restitution;
        ball.vy = (ball.vy - 2*vdotn*res.ny) * world.restitution;

        b.pulse = 1;
        currentHitNoteDiv = b.noteDiv ?? 1;
        const spd = Math.hypot(ball.vx, ball.vy);
        playHit(b.midi, spd);

        world.bouncesThisRun++;
        sBounces.textContent = String(world.bouncesThisRun);
      } else {
        if (b.pulse>0) b.pulse = Math.max(0, b.pulse - dt*2.5);
      }
    }
  }

  // Ball vs rotated rect via local-space AABB
  function collideBallRotRect(ball, b){
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
    const lx =  cos*(ball.x - b.x) + sin*(ball.y - b.y);
    const ly = -sin*(ball.x - b.x) + cos*(ball.y - b.y);

    const hx = b.w*0.5, hy = b.h*0.5;

    const cx = clamp(lx, -hx, hx);
    const cy = clamp(ly, -hy, hy);

    const dx = lx - cx, dy = ly - cy;
    const d2 = dx*dx + dy*dy, r = ball.r;

    if (d2 > r*r) return {hit:false};

    let nx, ny, pen;
    if (cx === lx && cy === ly){
      const ox = hx - Math.abs(lx);
      const oy = hy - Math.abs(ly);
      if (ox < oy){ nx = Math.sign(lx); ny = 0; pen = ox + r; }
      else { nx = 0; ny = Math.sign(ly); pen = oy + r; }
    } else {
      const d = Math.sqrt(d2)||1;
      nx = dx/d; ny = dy/d; pen = r - d;
    }

    const wx =  cos*nx - sin*ny;
    const wy =  sin*nx + cos*ny;

    return {hit:true, nx:wx, ny:wy, pen};
  }

  /* ---------- Drawing ---------- */
  function draw(){
    const viewW = stage.width/(window.devicePixelRatio||1);
    const viewH = stage.height/(window.devicePixelRatio||1);

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,viewW,viewH);
    ctx.setTransform(camera.scale, 0, 0, camera.scale, -camera.x*camera.scale, -camera.y*camera.scale);

    drawGrid();

    // last path (behind blocks)
    if (showPathChk.checked && pathLast.length > 1){
      ctx.save();
      ctx.setLineDash([8/camera.scale, 8/camera.scale]);
      ctx.lineWidth = 2 / camera.scale;
      ctx.strokeStyle = 'rgba(80,90,100,0.6)';
      ctx.beginPath();
      ctx.moveTo(pathLast[0].x, pathLast[0].y);
      for (let i=1;i<pathLast.length;i++) ctx.lineTo(pathLast[i].x, pathLast[i].y);
      ctx.stroke();
      ctx.restore();
    }

    // preview ghost block while dragging from builder
    if (previewGhost){
      ctx.save();
      ctx.translate(previewGhost.x, previewGhost.y);
      ctx.rotate(previewGhost.angle||0);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = colorFromMidi(previewGhost.midi);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5 / camera.scale;
      ctx.fillRect(-previewGhost.w/2, -previewGhost.h/2, previewGhost.w, previewGhost.h);
      ctx.strokeRect(-previewGhost.w/2, -previewGhost.h/2, previewGhost.w, previewGhost.h);
      ctx.restore();
    }

    // blocks
    for (let i=0;i<blocks.length;i++){
      const b = blocks[i];
      drawBlock(ctx, b, i===sel.idx);
    }

    // ball
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();

    // ball direction arrow when stopped
    if (!world.running){
      ctx.save();
      ctx.strokeStyle = "#0a84ff";
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      const ang = Math.atan2(ball.vy, ball.vx);
      const len = 60;
      ctx.lineTo(ball.x + Math.cos(ang)*len, ball.y + Math.sin(ang)*len);
      ctx.stroke();
      ctx.setLineDash([6/camera.scale, 6/camera.scale]);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 22/camera.scale, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    drawMini(viewW, viewH);
  }

  function drawGrid(){
    const step = 100;
    const minX = camera.x - 1000/camera.scale;
    const maxX = camera.x + (stage.width/(window.devicePixelRatio||1))/camera.scale + 1000/camera.scale;
    const minY = camera.y - 1000/camera.scale;
    const maxY = camera.y + (stage.height/(window.devicePixelRatio||1))/camera.scale + 1000/camera.scale;

    ctx.strokeStyle = "#eef2f5";
    ctx.lineWidth = 1 / camera.scale;
    ctx.beginPath();
    for (let x = Math.floor(minX/step)*step; x <= maxX; x += step){
      ctx.moveTo(x, minY); ctx.lineTo(x, maxY);
    }
    for (let y = Math.floor(minY/step)*step; y <= maxY; y += step){
      ctx.moveTo(minX, y); ctx.lineTo(maxX, y);
    }
    ctx.stroke();
  }

  function drawBlock(c, b, selected){
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.angle);

    if (b.pulse > 0){
      const a = 0.6 * b.pulse;
      c.lineWidth = 10 / camera.scale;
      c.strokeStyle = rgbaFromHsl(colorFromMidi(b.midi), a);
      c.strokeRect(-b.w/2 - 3/camera.scale, -b.h/2 - 3/camera.scale, b.w + 6/camera.scale, b.h + 6/camera.scale);
    }

    c.fillStyle = colorFromMidi(b.midi);
    c.strokeStyle = selected ? '#000' : '#333';
    c.lineWidth = selected ? 3 / camera.scale : 1.5 / camera.scale;
    c.fillRect(-b.w/2, -b.h/2, b.w, b.h);
    c.strokeRect(-b.w/2, -b.h/2, b.w, b.h);

    c.fillStyle = '#000';
    c.font = `${12 / camera.scale}px ui-sans-serif, Arial`;
    const pc = ((b.midi % 12)+12)%12;
    const oct = Math.floor(b.midi/12) - 1;
    const lenTxt = b.noteDiv===1?'W':b.noteDiv===0.5?'H':b.noteDiv===0.25?'Q':b.noteDiv===0.125?'E':'S';
    c.fillText(`${LETTERS[pc]}${oct} ${lenTxt}`, -b.w/2 + 6/camera.scale, 4/camera.scale);
    c.restore();

    if (selected){
      const hx = Math.cos(b.angle)*(b.w/2);
      const hy = Math.sin(b.angle)*(b.w/2);
      const nx = Math.cos(b.angle+Math.PI/2);
      const ny = Math.sin(b.angle+Math.PI/2);
      const hxpos = { x: b.x + hx, y: b.y + hy };
      const handle = { x: hxpos.x + nx*28/camera.scale, y: hxpos.y + ny*28/camera.scale };

      c.save();
      c.fillStyle = "#fff"; c.strokeStyle = "#000"; c.lineWidth = 2 / camera.scale;
      c.beginPath(); c.arc(handle.x, handle.y, 8/camera.scale, 0, Math.PI*2); c.fill(); c.stroke();
      c.setLineDash([5/camera.scale,4/camera.scale]);
      c.beginPath(); c.moveTo(hxpos.x, hxpos.y); c.lineTo(handle.x, handle.y); c.stroke();
      c.restore();
    }
  }

  function rgbaFromHsl(hsl, alpha){
    const tmp = document.createElement('canvas').getContext('2d');
    tmp.fillStyle = hsl;
    const rgb = tmp.fillStyle;
    const parts = rgb.match(/\d+/g).map(Number);
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha.toFixed(3)})`;
  }

  function drawMini(viewW, viewH){
    // ensure internal pixel size matches CSS
    fitCanvas(mini);

    const pad = 200;
    let minX = Math.min(ball.x, ...blocks.map(b=>b.x - b.w/2), camera.x) - pad;
    let maxX = Math.max(ball.x, ...blocks.map(b=>b.x + b.w/2), camera.x + viewW/camera.scale) + pad;
    let minY = Math.min(ball.y, ...blocks.map(b=>b.y - b.h/2), camera.y) - pad;
    let maxY = Math.max(ball.y, ...blocks.map(b=>b.y + b.h/2), camera.y + viewH/camera.scale) + pad;

    if (!isFinite(minX)) {
      minX = camera.x - pad; maxX = camera.x + viewW/camera.scale + pad;
      minY = camera.y - pad; maxY = camera.y + viewH/camera.scale + pad;
    }

    const w = maxX - minX, h = maxY - minY;
    mctx.setTransform(1,0,0,1,0,0);
    mctx.clearRect(0,0,mini.width,mini.height);
    mctx.strokeStyle = "#900"; mctx.strokeRect(0.5,0.5, mini.width-1, mini.height-1);

    const sx = mini.width / w;
    const sy = mini.height / h;
    mctx.save();
    mctx.translate(-minX*sx, -minY*sy);

    if (showPathChk.checked && pathLast.length > 1){
      mctx.save();
      mctx.setLineDash([6,6]);
      mctx.lineWidth = 1;
      mctx.strokeStyle = 'rgba(80,90,100,0.7)';
      mctx.beginPath();
      mctx.moveTo(pathLast[0].x*sx, pathLast[0].y*sy);
      for (let i=1;i<pathLast.length;i++) mctx.lineTo(pathLast[i].x*sx, pathLast[i].y*sy);
      mctx.stroke();
      mctx.restore();
    }

    for (const b of blocks){
      mctx.save();
      mctx.translate(b.x*sx, b.y*sy);
      mctx.rotate(b.angle);
      mctx.fillStyle = colorFromMidi(b.midi);
      mctx.fillRect(-b.w*sx/2, -b.h*sy/2, b.w*sx, b.h*sy);
      mctx.restore();
    }
    mctx.fillStyle = "#000";
    mctx.beginPath();
    mctx.arc(ball.x*sx, ball.y*sy, Math.max(2, ball.r*sx), 0, Math.PI*2);
    mctx.fill();

    mctx.strokeStyle = "red"; mctx.lineWidth = 1;
    mctx.strokeRect(camera.x*sx, camera.y*sy, (viewW/camera.scale)*sx, (viewH/camera.scale)*sy);
    mctx.restore();

    mini.onmousedown = (e)=>{
      const rect = mini.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wx = mx/sx + minX;
      const wy = my/sy + minY;
      const vw = viewW/camera.scale, vh = viewH/camera.scale;
      camera.x = wx - vw/2;
      camera.y = wy - vh/2;
      pauseFollow();

      const move = (ev)=>{
        const mx2 = ev.clientX - rect.left, my2 = ev.clientY - rect.top;
        const wx2 = mx2/sx + minX, wy2 = my2/sy + minY;
        camera.x = wx2 - vw/2; camera.y = wy2 - vh/2;
      };
      const up = ()=>{ window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    };
  }

  function hitBlock(px, py){
    for (let i=blocks.length-1;i>=0;i--){
      const b = blocks[i];
      const cos = Math.cos(b.angle), sin = Math.sin(b.angle);
      const lx =  cos*(px - b.x) + sin*(py - b.y);
      const ly = -sin*(px - b.x) + cos*(py - b.y);
      if (Math.abs(lx) <= b.w/2 && Math.abs(ly) <= b.h/2) return {idx:i};
    }
    return {idx:-1};
  }
  function hitRotateHandle(px, py){
    for (let i=blocks.length-1;i>=0;i--){
      const b = blocks[i];
      const hx = Math.cos(b.angle)*(b.w/2);
      const hy = Math.sin(b.angle)*(b.w/2);
      const nx = Math.cos(b.angle+Math.PI/2);
      const ny = Math.sin(b.angle+Math.PI/2);
      const hxpos = { x: b.x + hx, y: b.y + hy };
      const handle = { x: hxpos.x + nx*28/camera.scale, y: hxpos.y + ny*28/camera.scale };
      if (dist(px,py, handle.x,handle.y) < 10/camera.scale) return {idx:i};
    }
    return {idx:-1};
  }

  /* ---------- Main loop ---------- */
  let last = performance.now();
  function tick(now){
    const dt = Math.min(0.03, (now-last)/1000);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(tick);
  }

  /* ---------- Controls: Drop / Reset ---------- */
  dropBtn.addEventListener('click', ()=>{
    ensureAudio();
    setStartFromCurrent(); // record start at the moment of drop

    world.bouncesThisRun = 0;
    world.runId += 1;
    sRun.textContent = String(world.runId);
    sBlocks.textContent = String(blocks.length);
    world.running = true;

    dropBtn.disabled = true;
    setStartBtn.disabled = true;

    pathCurr = [{ x: ball.x, y: ball.y }];
    camTween = null; // stop any recenter tween once we start
  });
  resetBtn.addEventListener('click', resetBallToStart);

  /* ---------- Preview drawing ---------- */
  function drawPreview(){
    pctx.clearRect(0,0,preview.width,preview.height);
    pctx.fillStyle = buildColor();
    pctx.fillRect(10, 16, preview.width-20, 22);
    pctx.strokeStyle = '#000'; pctx.strokeRect(10,16,preview.width-20,22);
    pctx.fillStyle = '#000'; pctx.font = '12px ui-sans-serif, Arial';
    const v = parseFloat(noteLengthSel.value);
    const lenTxt = v===1?'W':v===0.5?'H':v===0.25?'Q':v===0.125?'E':'S';
    pctx.fillText(`${noteLetter.value}${noteOctave.value} ${lenTxt}`, 14, 14);
  }
  noteLetter.addEventListener('change', drawPreview);
  noteOctave.addEventListener('change', drawPreview);
  noteLengthSel.addEventListener('change', drawPreview);

  /* ---------- Init ---------- */
  function init(){
    resizeAll();
    bpmOut.textContent = `${world.bpm} BPM`;
    refreshWaveEnable();
    drawPreview();
    updateDirSlidersFromBall();
    setStartFromCurrent();
    // starter blocks
    blocks.push({x:700,y:220,w:140,h:24,angle:-0.6,midi:midiFromName('E',4),pulse:0,noteDiv:1});
    blocks.push({x:900,y:160,w:140,h:24,angle:0.9,midi:midiFromName('A',4),pulse:0,noteDiv:1});
    requestAnimationFrame(tick);
  }
  init();
})();
