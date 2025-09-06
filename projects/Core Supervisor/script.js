/* CONTAINMENT: Core Supervisor — JS (full, merged)
   - CONTROL box at top of CRT (side-by-side with chart, no dead space)
   - Prev/Next wrap across all systems, gauge-strip click switching
   - COMMS TTL respects settings; Y/N vs Code controls toggle correctly
   - Progressive cooldowns: Purge, Rods, Aux; reserve trickle while safe
   - Slider badges: JS positions horizontally; CSS centers on knob
   - Power-ups (Stabilize / Reserve / Freeze) with counters and effects
*/

/* ---------- Global ASCII layout ---------- */
const LABEL_W = 14;   // fixed label column so '[' aligns
const BAR_W   = 36;   // characters between '[' and ']'

/* Helpers to build aligned bars */
function asciiBarAligned(label, value, width = BAR_W, labelW = LABEL_W, min = 0, max = 100) {
  const v = clamp(value, min, max);
  const pct = (v - min) / (max - min);               // 0..1
  const fill = Math.round(pct * width);              // 0..width
  const bar = "#".repeat(fill) + ".".repeat(Math.max(0, width - fill));
  const left = String(label).padEnd(labelW, " ");
  const valTxt = String(Math.round(v)).padStart(3, " ");
  return `${left}[${bar}] ${valTxt}`;
}

function asciiWindowAligned(label, minPct, maxPct, width = BAR_W, labelW = LABEL_W) {
  const a = clamp(Math.round((minPct / 100) * width), 0, width - 1);
  const b = clamp(Math.round((maxPct / 100) * width), 0, width - 1);
  const arr = new Array(width).fill("-");
  for (let i = Math.min(a, b) + 1; i < Math.max(a, b); i++) arr[i] = "=";
  arr[a] = "|"; arr[b] = "|";
  const left = String(label).padEnd(labelW, " ");
  return `${left}[${arr.join("")}]`;
}

/* ---------- Utilities ---------- */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rnd(min, max) { return Math.random() * (max - min) + min; }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function cryptoRandomId(){
  try{
    const a = new Uint32Array(2); crypto.getRandomValues(a);
    return (a[0].toString(16)+a[1].toString(16)).slice(0,8);
  }catch{
    return Math.floor(Math.random()*1e8).toString(16);
  }
}

/* ---------- Side-by-side ASCII layout ---------- */
function asciiSideBySide(leftBox, rightBox, gap = 6){
  const L = leftBox.split("\n");
  const R = rightBox.split("\n");
  const h = Math.max(L.length, R.length);
  while(L.length < h) L.push("");
  while(R.length < h) R.push("");
  const pad = " ".repeat(gap);
  const out = [];
  for(let i=0;i<h;i++) out.push((L[i]||"") + pad + (R[i]||""));
  return out.join("\n");
}

/* ---------- Gauges ---------- */
const GAUGES = [
  { key: "CORE",  title: "CORE TRACE" },
  { key: "FLUX",  title: "FLUX TRACE" },
  { key: "THERM", title: "THERMAL TRACE" },
  { key: "PRESS", title: "PRESSURE TRACE" },
];

/* ---------- Levels ---------- */
const LEVELS = [
  { id:0, name:"Lv1 - Gentle Hum", duration:60,  base:{safeMin:42,safeMax:58, meltdown:95, volatility:0.16, spikeChance:0.012, spikeMag:10, sineAmp:4, phaseTarget:50}, extra:0 },
  { id:1, name:"Lv2 - First Spikes", duration:75, base:{safeMin:40,safeMax:60, meltdown:95, volatility:0.22, spikeChance:0.020, spikeMag:16, sineAmp:6, phaseTarget:46}, extra:0 },
  { id:2, name:"Lv3 - Cavitation",   duration:90,  base:{safeMin:40,safeMax:60, meltdown:94, volatility:0.24, spikeChance:0.018, spikeMag:14, sineAmp:7, phaseTarget:52}, extra:1 },
  { id:3, name:"Lv4 - Harmonics",    duration:105, base:{safeMin:41,safeMax:59, meltdown:93, volatility:0.28, spikeChance:0.025, spikeMag:18, sineAmp:10,phaseTarget:48}, extra:1 },
  { id:4, name:"Lv5 - Injector",     duration:120, base:{safeMin:39,safeMax:61, meltdown:92, volatility:0.32, spikeChance:0.030, spikeMag:24, sineAmp:11,phaseTarget:50}, extra:2 },
  { id:5, name:"Lv6 - Brownout",     duration:135, base:{safeMin:38,safeMax:62, meltdown:92, volatility:0.34, spikeChance:0.034, spikeMag:26, sineAmp:12,phaseTarget:53}, extra:2 },
  { id:6, name:"Lv7 - Wild Swing",   duration:150, base:{safeMin:39,safeMax:61, meltdown:90, volatility:0.38, spikeChance:0.048, spikeMag:30, sineAmp:14,phaseTarget:47}, extra:3 },
  { id:7, name:"Lv8 - The Edge",     duration:165, base:{safeMin:40,safeMax:60, meltdown:88, volatility:0.42, spikeChance:0.060, spikeMag:34, sineAmp:16,phaseTarget:50}, extra:3 },
];

/* ---------- Situations (expanded with SOP tags) ---------- */
const SITUATIONS = [
  {card:"Spark Shower", tell:"Rapid micro-spikes", action:"Field 55–70, Phase 48–52, quick Purge", sop:"Purge Use"},
  {card:"Coolant Cavitation", tell:"Sawtooth dips", action:"Coolant -10, Rods, Containment +10", sop:"Coolant Microcycle"},
  {card:"Ring Harmonics", tell:"Slow sine swell", action:"Phase to target, Field +10, trim Coolant", sop:"Magnetic Field"},
  {card:"Power Brownout", tell:"Reserve drains fast", action:"Containment -15, rely on Phase and Coolant", sop:"Containment Power"},
  {card:"Injector Stutter", tell:"Periodic big spike", action:"Purge on rise, Field ~60, Rods ready", sop:"Purge Use"},
];

/* ---------- SOP Quick Answers ---------- */
const SOP_LIST = [
  { name:"Purge Use",
    rule:"Use short pulses only when energy is rising fast and above safe. Never hold purge. Wait for cooldown before next pulse.",
    ex:"Hold purge while flux settles? → NO; Pulse purge now (during spike)? → YES"
  },
  { name:"Magnetic Field",
    rule:"Keep field in mid band (48–62). Avoid 70+. Raise slightly for oscillations; drop if baseline creeps up.",
    ex:"Mag field bump to 70 okay? → NO"
  },
  { name:"Coolant Microcycle",
    rule:"Short microcycles clear cavitation; avoid during brownout (reserve < 15).",
    ex:"Confirm coolant microcycle? → YES (unless reserve < 15)"
  },
  { name:"Containment Power",
    rule:"Higher containment increases stability but drains reserve. If reserve < 10, trim containment.",
    ex:"Increase containment during brownout? → NO"
  },
  { name:"Phase Shifter",
    rule:"Keep within ±3 of the target phase for smooth oscillations.",
    ex:"Phase to target +5? → NO"
  },
  { name:"Venting",
    rule:"Minor vent trim is approved under normal ops; full vent requires alarm or code.",
    ex:"Approve minor vent trim on B? → YES"
  },
  { name:"Emergency",
    rule:"At meltdown threshold: Purge pulse + Rods if available. Log incident and stabilize.",
    ex:"Energy ≥ meltdown → Purge + Rods"
  }
];

/* ---------- Manual Codes (10 per category) ---------- */
const MANUAL_CODES = [
  // Vents (10)
  { topic:"Core Vent B — Red Factor-7", code:"4312", notes:"Vent staging sequence (red)", category:"vents" },
  { topic:"Core Vent A — Amber Bypass", code:"A-92", notes:"Limited stack bypass", category:"vents" },
  { topic:"Manifold Equalize — West Ring", code:"WEQ-17", notes:"Balance 30s", category:"vents" },
  { topic:"Vent Lockout Clear — Service", code:"V-CLR6", notes:"Clear after inspection", category:"vents" },
  { topic:"Scrubber Regen — Cycle Short", code:"REG-9", notes:"20s regen", category:"vents" },
  { topic:"Plenum Purge — Step Pulse", code:"PP-14", notes:"2× short pulse", category:"vents" },
  { topic:"Aux Vent — Cold Start", code:"AV-0C", notes:"Preheat off", category:"vents" },
  { topic:"Stack Pressure — Damp Low", code:"SPD-3", notes:"Dampen surge", category:"vents" },
  { topic:"Thermal Vent — Night Mode", code:"TV-N1", notes:"Quiet profile", category:"vents" },
  { topic:"Core Vent C — Green Maint", code:"CV-G3", notes:"Maintenance pass", category:"vents" },

  // Injectors (10)
  { topic:"Injector Sync — Phase Align", code:"9B-52", notes:"Set phase near 50", category:"injectors" },
  { topic:"Injector Trim — Pair A/B", code:"IT-AB2", notes:"Match within ±2", category:"injectors" },
  { topic:"Injector Prime — Cold", code:"PRM-C0", notes:"Pre-flow 15s", category:"injectors" },
  { topic:"Pulse Width — Tighten", code:"PW-T8", notes:"Narrow duty", category:"injectors" },
  { topic:"Injector Lock — Safety", code:"IL-S1", notes:"Lock until clear", category:"injectors" },
  { topic:"Injector Cal — Drift", code:"IC-D4", notes:"Recal drift", category:"injectors" },
  { topic:"Flux Gate — Half Open", code:"FG-50", notes:"50% set", category:"injectors" },
  { topic:"Flux Bias — Reduce", code:"FB-R3", notes:"Bias -3", category:"injectors" },
  { topic:"Injector Restart — Warm", code:"IR-W2", notes:"Skip cold prime", category:"injectors" },
  { topic:"Injector Burst — Test", code:"IB-T1", notes:"1s test burst", category:"injectors" },

  // Coolant (10)
  { topic:"Coolant Lattice — Cavitation Clear", code:"CAV-210", notes:"Drop 10, then apply", category:"coolant" },
  { topic:"Microcycle — Short", code:"MC-5", notes:"5s microcycle", category:"coolant" },
  { topic:"Flow Boost — Spike Catch", code:"FB-7", notes:"7% boost", category:"coolant" },
  { topic:"Coolant Trim — South Loop", code:"CT-SL2", notes:"Balance south", category:"coolant" },
  { topic:"Heat Exchanger — Bypass", code:"HX-B1", notes:"Bypass 30s", category:"coolant" },
  { topic:"Chiller Pair — Sync", code:"CH-S2", notes:"Sync both", category:"coolant" },
  { topic:"Coolant Lockout — Safety", code:"CL-S3", notes:"Lock high flow", category:"coolant" },
  { topic:"Radiator Sweep — Dust", code:"RS-D1", notes:"Sweep fans", category:"coolant" },
  { topic:"Reserve Top-off — Manual", code:"RT-M", notes:"Add reserve", category:"coolant" },
  { topic:"Anti-freeze — Cold Start", code:"AF-C0", notes:"Cold profile", category:"coolant" },

  // Field (10)
  { topic:"Mag Field Flux — Trim High", code:"FLX-88", notes:"Reduce to mid band", category:"field" },
  { topic:"Field Lock — Midline", code:"FL-55", notes:"Lock near 55", category:"field" },
  { topic:"Field Ramp — Gentle", code:"FR-G1", notes:"Slow ramp", category:"field" },
  { topic:"Harmonic Damp — Engage", code:"HD-3", notes:"Harmonic damper", category:"field" },
  { topic:"Field Sweep — Diagnostic", code:"FS-D", notes:"45→60 test", category:"field" },
  { topic:"Coil Temp — Guard", code:"CT-G2", notes:"Protect coils", category:"field" },
  { topic:"Baseline Nudge — Down", code:"BN-D1", notes:"Lower baseline", category:"field" },
  { topic:"Baseline Nudge — Up", code:"BN-U1", notes:"Raise baseline", category:"field" },
  { topic:"Field Bias — Neutral", code:"FB-N0", notes:"Zero bias", category:"field" },
  { topic:"Field Sync — Phase", code:"FS-P", notes:"Sync with phase", category:"field" },

  // Emergency (10)
  { topic:"Emergency Purge — Short Pulse", code:"P-14", notes:"One pulse", category:"emergency" },
  { topic:"Buffer Rods — Insert", code:"BR-1", notes:"Short dampening", category:"emergency" },
  { topic:"Meltdown Halt — Protocol", code:"MD-H", notes:"Full stop", category:"emergency" },
  { topic:"Reserve Protect — Cut Contain", code:"RP-", notes:"Reduce containment", category:"emergency" },
  { topic:"Alarm Silence — After Clear", code:"AS-C", notes:"Silence post-clear", category:"emergency" },
  { topic:"Black Start — Cold", code:"BS-C", notes:"Reboot sequence", category:"emergency" },
  { topic:"Brownout Guard — Engage", code:"BG-3", notes:"Low-reserve guard", category:"emergency" },
  { topic:"Quench Avoid — Cancel", code:"QA-0", notes:"Stop over-cool", category:"emergency" },
  { topic:"Safe Mode — Minimal", code:"SM-1", notes:"Minimal ops", category:"emergency" },
  { topic:"Incident Log — File", code:"ILOG", notes:"Log event", category:"emergency" },
];

/* ---------- Build per gauge params per level ---------- */
function buildGaugeParams(levelIdx){
  const L = LEVELS[levelIdx];
  const activeCount = 1 + L.extra;
  const params = [];
  for(let i=0;i<activeCount;i++){
    const gdef = GAUGES[i];
    const b = L.base;
    params.push({
      key: gdef.key, title: gdef.title,
      safeMin: clamp(b.safeMin - (i?1:0), 35, 45),
      safeMax: clamp(b.safeMax + (i?1:0), 55, 65),
      meltdown: b.meltdown - (i?1:0),
      volatility: b.volatility * (1 + 0.05*i),
      spikeChance: b.spikeChance * (1 + 0.08*i),
      spikeMag: b.spikeMag + 2*i,
      sineAmp: b.sineAmp + i,
      phaseTarget: clamp(b.phaseTarget + (i*2 - 1), 44, 56),
      duration: L.duration
    });
  }
  return params;
}

/* ---------- Save Data ---------- */
const SAVE_KEY = "containment_save_v6";
function defaultSave(){ return { storyUnlocked:1, bestScores:{}, options:{ muted:false, msgTimeMode:"scale", pauseOnManual:false } }; }
function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
  }catch{ return defaultSave(); }
}
function saveNow(){
  localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE));
  if (manualProg) manualProg.textContent = SAVE.storyUnlocked;
  if (manualAutosave) manualAutosave.textContent = "On";
  updateBestUI();
}
function exportSave(){
  const blob = new Blob([JSON.stringify(SAVE,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "containment_save.json";
  a.click(); URL.revokeObjectURL(a.href);
}
function importSaveText(text){
  try{
    const data = JSON.parse(text);
    Object.assign(SAVE, defaultSave(), data);
    saveNow(); syncUIToSave(); alert("Import complete.");
  }catch{ alert("Import failed. Bad JSON."); }
}

/* ---------- Audio ---------- */
let audioCtx = null;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
function beep(freq=660, dur=0.08, vol=0.05){
  if(SAVE.options.muted) return;
  ensureAudio();
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
  o.frequency.value = freq; o.type = "square"; g.gain.value = vol;
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t+dur);
}
function alarmBeep(){ beep(440,0.12,0.07); }
function okBeep(){ beep(720,0.12,0.06); }
function badBeep(){ beep(220,0.12,0.08); }

/* ---------- COMMS System (settings-aware) ---------- */
class Comms {
  constructor(){
    this.queue = [];
    this.active = null;
    this.timer = 0;
    this.cooldown = 0;
  }
  reset(){ this.queue.length=0; this.active=null; this.timer=0; this.cooldown=rnd(8,14); }

  ttlFor(type, system){
    const mode = SAVE.options.msgTimeMode || "scale";
    const base = (type==="code") ? 20 : 12; // code tougher
    if(mode === "unlimited") return Infinity;
    if(mode === "scale"){
      const scale = 1 + 0.18*GAME.levelIndex + 0.12*(system?.gauges?.length||1 - 1);
      return clamp(base * scale, 15, 75);
    }
    const fixed = parseInt(mode,10);
    return isFinite(fixed) ? fixed : base;
  }

  makeYN(text, correctYes, from, system){
    return {
      id: cryptoRandomId(),
      type:"yn",
      from: from || choice(["Ops","Maintenance","Thermals","FluxBay","Chief"]),
      text,
      correct: correctYes ? "Y" : "N",
      ttl: this.ttlFor("yn", system)
    };
  }

  makeYNContext(text, from, computeFn, sopTag, system){
    return {
      id: cryptoRandomId(),
      type:"yn",
      from: from || "Chief",
      text: sopTag ? `${text} (SOP: ${sopTag})` : text,
      correct: computeFn,  // function(sys) -> "Y" or "N"
      ttl: this.ttlFor("yn", system),
      sop: sopTag || null
    };
  }

  makeCode(topicObj, system){
    return {
      id: cryptoRandomId(),
      type:"code",
      from: choice(["Ops","Diagnostics","Injector","VentCtrl","Chief"]),
      text:`Does anyone have the code for “${topicObj.topic}”? (Manual → Codes)`,
      code: topicObj.code,
      ttl: this.ttlFor("code", system)
    };
  }

  makeBanter(system){
    const templates = [
      { from: "Ops", text:"Lunch run—noodles or rations? (Y = noodles)",
        y:{reply:"Copy. Extra chili for Control.", buff:true},
        n:{reply:"Rations it is… again.", buff:false} },
      { from: "Maintenance", text:"Bar after shift?",
        y:{reply:"Meet at Dock 3—first round on Maint.", buff:true},
        n:{reply:"Responsible. Boring, but responsible.", buff:false} },
      { from: "Thermals", text:"Did you take my stapler?",
        y:{reply:"Returning it now. It’s… greener.", buff:false},
        n:{reply:"Copy. Filing a form about the form.", buff:false} },
      { from: "FluxBay", text:"Heard about Jack?",
        y:{reply:"He finally beat Lv6. Claims it was ‘all Phase’.", buff:false},
        n:{reply:"Oh. Then never mind. Not about the coolant incident.", buff:false} },
      { from: "Diagnostics", text:"Swap the 02:00–04:00 meter check?",
        y:{reply:"Legend. You’ve won a donut in spirit.", buff:true},
        n:{reply:"Fair. I’ll drink an espresso and glare at the gauges.", buff:false} },
    ];
    const t = choice(templates);
    return {
      id: cryptoRandomId(),
      type:"banter",
      from: t.from, text: t.text, ttl: this.ttlFor("yn", system),
      y: t.y, n: t.n
    };
  }

  tickGenerate(dt, levelIdx, system){
    if(this.active){ return; }
    if(this.cooldown>0){ this.cooldown -= dt; return; }

    const r = Math.random();
    if(r < 0.35){
      this.queue.push(this.makeCode(choice(MANUAL_CODES), system));
    } else if (r < 0.75){
      const sopPick = Math.random();
      if(sopPick < 0.25){
        this.queue.push(this.makeYN("Approve minor vent trim on B?", true, "Thermals", system));
      } else if (sopPick < 0.50){
        const compute = (sys)=> (sys.reserve >= 15) ? "Y" : "N";
        this.queue.push(this.makeYNContext("Confirm coolant microcycle?", "Thermals", compute, "Coolant Microcycle", system));
      } else if (sopPick < 0.75){
        this.queue.push(this.makeYN("Mag field bump to 70 okay?", false, "FluxBay", system));
      } else {
        this.queue.push(this.makeYN("Hold purge while flux settles?", false, "Chief", system));
      }
    } else {
      this.queue.push(this.makeBanter(system));
    }

    this.cooldown = rnd(9 - Math.min(levelIdx,5), 14 - Math.min(levelIdx,5));
  }

  promote(){
    this.active = this.queue.shift() || null;
    this.timer = this.active ? this.active.ttl : 0;
  }

  tickActive(dt){
    if(!this.active) return false;
    if(isFinite(this.timer)) this.timer -= dt;
    return isFinite(this.timer) ? (this.timer <= 0) : false;
  }
}

/* ---------- Gauge (with progressive cooldowns) ---------- */
class Gauge {
  constructor(def){
    this.def = def;
    this.energy = 50;
    this.baseline = 50;
    this.history = new Array(90).fill(50);
    this._sinePhase = Math.random()*Math.PI*2;
    this._spikeHold = 0;

    this.contain = 58;
    this.coolant = 52;
    this.field = 58;
    this.phase = def.phaseTarget;

    this.purgeCooldown = 0;
    this.purgeUses = 0;
    this.rodsTime = 0;
    this.rodsCooldown = 0;
    this.rodsUses = 0;

    this.winTime = 0;
    this.stabilityAccumulator = 0;
    this.stabilitySamples = 0;
    this.alarm = "Clear";
    this.meltdownTimer = 0;

    this.stabilityBuff = 0;
    this.stabilityBuffTime = 0;

    this.freezeTime = 0; // seconds remaining of freeze power-up
  }

  setControls({contain,coolant,field,phase}){
    if(contain!=null) this.contain = contain;
    if(coolant!=null) this.coolant = coolant;
    if(field!=null) this.field = field;
    if(phase!=null) this.phase = phase;
  }

  purge(){
    if(this.purgeCooldown<=0){
      const base = 3.2;
      this.energy = Math.max(0, this.energy-14);
      this.purgeCooldown = base * (1 + 0.12 * this.purgeUses);
      this.purgeUses++;
      alarmBeep();
    }
  }

  rods(){
    if(this.rodsCooldown<=0){
      const base = 6.0;
      this.rodsTime = 4.0;
      this.rodsCooldown = base * (1 + 0.08 * this.rodsUses);
      this.rodsUses++;
      beep(320,0.12,0.06);
    }
  }

  applyStabilityBuff(strength=0.25, seconds=6){
    this.stabilityBuff = Math.max(this.stabilityBuff, strength);
    this.stabilityBuffTime = Math.max(this.stabilityBuffTime, seconds);
  }

  freeze(seconds=5){
    this.freezeTime = Math.max(this.freezeTime, seconds);
  }

  update(dt, reserve){
    const D = this.def;

    // cooldowns always tick
    if(this.purgeCooldown>0) this.purgeCooldown -= dt;
    if(this.rodsCooldown>0)  this.rodsCooldown  -= dt;
    if(this.rodsTime>0) this.rodsTime -= dt;
    if(this.stabilityBuffTime>0){
      this.stabilityBuffTime -= dt;
      if(this.stabilityBuffTime<=0) { this.stabilityBuff=0; this.stabilityBuffTime=0; }
    }

    // Freeze: hold energy dynamics still, but still count win/alarms/meltdown
    if(this.freezeTime>0){
      this.freezeTime -= dt;

      // keep history flowing so chart scrolls
      this.history.push(this.energy); if(this.history.length>90) this.history.shift();

      const inSafe = (this.energy>=D.safeMin && this.energy<=D.safeMax);
      if(inSafe){
        this.alarm = "Clear";
        this.winTime += dt;
      } else {
        this.alarm = (this.energy > D.safeMax ? "Danger" : "Warning");
      }

      if(this.energy >= D.meltdown){
        this.meltdownTimer += dt;
        if(this.meltdownTimer > 2.4){
          return { ended:true, success:false, reason: `${this.def.title} meltdown` };
        }
      } else {
        this.meltdownTimer = Math.max(0, this.meltdownTimer - dt*0.5);
      }

      return { ended:false };
    }

    // --- Normal dynamics ---
    const fieldEffect = (this.field - 50) / 50;
    const baselineDrift = fieldEffect > 0.3 ? fieldEffect*0.65 : 0;
    this.baseline = clamp(50 + baselineDrift*6, 30, 70);

    const phaseDelta = ((this.phase - D.phaseTarget) / 50);
    this._sinePhase += dt * (0.9 + Math.abs(phaseDelta));
    const sineAmp = D.sineAmp * (1 + Math.abs(phaseDelta)*0.7);
    const sine = Math.sin(this._sinePhase) * sineAmp;

    const fieldMid = Math.exp(-Math.pow((this.field - 55)/18,2));
    let volatility = D.volatility * (1.2 - 0.6 * fieldMid);
    if(this.stabilityBuff>0) volatility *= (1 - this.stabilityBuff);
    const noise = (Math.random()-0.5) * 16 * volatility;

    if(this._spikeHold<=0 && Math.random() < D.spikeChance * (1.3 - 0.5*fieldMid)){
      this._spikeHold = rnd(0.05,0.2);
    }
    let spike = 0;
    if(this._spikeHold>0){ this._spikeHold -= dt; spike = D.spikeMag * (0.6 + Math.random()*0.6); }

    const containK = this.contain/100;
    const coolantK = this.coolant/100;
    const rodsK = this.rodsTime>0 ? 0.35 : 0;
    const reservePenalty = reserve < 10 ? (1 - reserve/10) : 0;
    const dampening = 0.35*containK + 0.25*coolantK + rodsK;

    let delta = sine + noise + spike;
    delta -= (this.energy - this.baseline) * (dampening * (1 - reservePenalty)) * dt * 1.8;

    if(this.coolant > 80) delta -= Math.abs(this.energy - this.baseline) * 0.02;
    if(this.coolant < 20) delta += 0.8;

    this.energy = clamp(this.energy + delta*dt, 0, 100);

    this.history.push(this.energy); if(this.history.length>90) this.history.shift();

    const inSafe = (this.energy>=D.safeMin && this.energy<=D.safeMax);
    if(inSafe){
      this.alarm = "Clear";
      this.winTime += dt;
      this.stabilityAccumulator += Math.abs(delta);
      this.stabilitySamples++;
    } else {
      this.alarm = (this.energy > D.safeMax ? "Danger" : "Warning");
    }

    if(this.energy >= D.meltdown){
      this.meltdownTimer += dt;
      if(this.meltdownTimer > 2.4){
        return { ended:true, success:false, reason: `${this.def.title} meltdown` };
      }
    } else {
      this.meltdownTimer = Math.max(0, this.meltdownTimer - dt*0.5);
    }

    return { ended:false };
  }
}

/* ---------- Reactor System (multi gauge + Aux Banks) ---------- */
class ReactorSystem {
  constructor(levelIdx){
    this.levelIdx = levelIdx;
    this.params = buildGaugeParams(levelIdx);
    this.gauges = this.params.map(p => new Gauge(p));
    this.activeIndex = 0;

    this.time = 0;
    this.reserve = 100;
    this.score = 0;

    this.auxCooldown = 0;
    this.auxUses = 0;

    this.trickleRate = 0.40; // per second, when no Danger alarms
  }

  setActiveIndex(i){
    // wrap rather than clamp
    const n = this.gauges.length;
    this.activeIndex = ((i % n) + n) % n;
  }
  activeGauge(){ return this.gauges[this.activeIndex]; }
  setControlsForActive(c){ this.activeGauge().setControls(c); }
  purge(){ this.activeGauge().purge(); }
  rods(){ this.activeGauge().rods(); }

  auxBanks(){
    if(this.auxCooldown<=0){
      const base = 10.0;
      this.reserve = clamp(this.reserve + 18, 0, 100);
      this.auxCooldown = base * (1 + 0.08 * this.auxUses);
      this.auxUses++;
      // brief instability bump across gauges
      this.gauges.forEach(g => { g._spikeHold = Math.max(g._spikeHold, 0.15); });
      okBeep();
    }
  }

  boostReserve(amount){ this.reserve = clamp(this.reserve + amount, 0, 100); }
  nudgeAllBuff(){ this.gauges.forEach(g=> g.applyStabilityBuff(0.25, 6)); }
  addVolatilityShock(){ this.gauges.forEach(g=> { g._spikeHold = Math.max(g._spikeHold, 0.12); }); }
  freezeActive(seconds=5){ this.activeGauge().freeze(seconds); }

  update(dt){
    this.time += dt;
    const containSum = this.gauges.reduce((a,g)=> a + g.contain/100, 0);
    const drain = containSum * 1.2 * dt;
    this.reserve = clamp(this.reserve - drain, 0, 100);

    if(this.auxCooldown>0) this.auxCooldown -= dt;

    for(const g of this.gauges){
      const res = g.update(dt, this.reserve);
      if(res.ended) return res;
    }

    const hasDanger = this.gauges.some(g => g.alarm === "Danger");
    if(!hasDanger && this.reserve < 100){
      this.reserve = clamp(this.reserve + this.trickleRate * dt, 0, 100);
    }

    for(const g of this.gauges){
      const inSafe = (g.energy>=g.def.safeMin && g.energy<=g.def.safeMax);
      if(inSafe) this.score += dt * 1;
    }

    const targetDur = this.params[0].duration;
    const allDone = this.gauges.every(g => g.winTime >= targetDur);
    if(allDone){
      let bonus = 0;
      for(const g of this.gauges){
        const avgDelta = g.stabilitySamples>0 ? g.stabilityAccumulator/g.stabilitySamples : 0;
        bonus += Math.max(0, 60 - avgDelta*14);
      }
      this.score += bonus;
      return { ended:true, success:true, reason:"All gauges stable" };
    }

    return { ended:false };
  }
}

/* ---------- ASCII chart (history box) ---------- */
function asciiHistory(history, height=10, width=60){
  const hist = [];
  for(let i=0;i<width;i++){
    const idx = Math.round((i/(width-1))*(history.length-1));
    hist.push(history[idx]);
  }
  const rows = [];
  for(let r=0;r<height;r++) rows.push(new Array(width).fill(" "));
  for(let x=0;x<width;x++){
    const val = clamp(hist[x],0,100);
    const row = height-1 - Math.round((val/100)*(height-1));
    rows[row][x] = "*";
  }
  let out = "";
  for(let r=0;r<height;r++) out += rows[r].join("") + "\n";
  return out;
}
function asciiBox(lines, title="CORE"){
  const width = Math.max(...lines.map(l => l.length));
  const top = "+" + "-".repeat(width+2) + "+";
  const hdr = "|" + " " + title.padEnd(width," ") + " " + "|";
  const out = [top, hdr];
  for(const l of lines){ out.push("| " + l.padEnd(width," ") + " |"); }
  out.push(top); return out.join("\n");
}

/* ---------- DOM refs ---------- */
const crt = document.getElementById("crt");

/* topbar */
const btnMainMenu = document.getElementById("btnMainMenu");
const btnStory = document.getElementById("btnStory");
const btnArcade = document.getElementById("btnArcade");
const arcadeTopControls = document.getElementById("arcadeTopControls");
const arcadeSelectTop = document.getElementById("arcadeSelectTop");
const topArcadeStart = document.getElementById("topArcadeStart");

const btnManual = document.getElementById("btnManual");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");
const btnMute = document.getElementById("btnMute");
const btnExport = document.getElementById("btnExport");
const fileImport = document.getElementById("fileImport");

/* sliders */
const sContain = document.getElementById("sContain");
const sCoolant = document.getElementById("sCoolant");
const sField = document.getElementById("sField");
const sPhase = document.getElementById("sPhase");
const bContain = document.getElementById("bContain");
const bCoolant = document.getElementById("bCoolant");
const bField = document.getElementById("bField");
const bPhase = document.getElementById("bPhase");
const btnPurge = document.getElementById("btnPurge");
const btnRods = document.getElementById("btnRods");
const btnAux = document.getElementById("btnAux");

/* overlays */
const overlayMenu = document.getElementById("overlayMenu");
const menuStartStory = document.getElementById("menuStartStory");
const menuOpenArcade = document.getElementById("menuOpenArcade");
const menuOpenManual = document.getElementById("menuOpenManual");

const overlayEnd = document.getElementById("overlayEnd");
const endTitle = document.getElementById("endTitle");
const endBody = document.getElementById("endBody");
const btnNextLevel = document.getElementById("btnNextLevel");
const btnRetry = document.getElementById("btnRetry");
const btnEndSave = document.getElementById("btnEndSave");
const btnEndExport = document.getElementById("btnEndExport");
const btnToMenu = document.getElementById("btnToMenu");

/* manual */
const dlgManual = document.getElementById("dlgManual");
const btnCloseManual = document.getElementById("btnCloseManual");
const manualProg = document.getElementById("manualProg");
const manualAutosave = document.getElementById("manualAutosave");
const bestScoresBody = document.getElementById("bestScoresBody");
const btnManualExport = document.getElementById("btnManualExport");
const fileImportManual = document.getElementById("fileImportManual");
const btnManualWipe = document.getElementById("btnManualWipe");
const settingsMsgTime = document.getElementById("settingsMsgTime");
const settingsPauseOnManual = document.getElementById("settingsPauseOnManual");

const manualSituations = document.getElementById("manualSituations");
const manualSOPs = document.getElementById("manualSOPs");
const sectionsCodes = {
  vents:     document.getElementById("manualCodesVents"),
  injectors: document.getElementById("manualCodesInjectors"),
  coolant:   document.getElementById("manualCodesCoolant"),
  field:     document.getElementById("manualCodesField"),
  emergency: document.getElementById("manualCodesEmergency"),
};

/* gauge cards and subbar */
const gPrev = document.getElementById("gPrev");
const gNext = document.getElementById("gNext");
const gaugeTitle = document.getElementById("gaugeTitle");
const gaugeAlarm = document.getElementById("gaugeAlarm");
const gaugeSafe = document.getElementById("gaugeSafe");
const gaugeStrip = document.getElementById("gaugeStrip");

/* COMMS DOM */
const commsLog = document.getElementById("commsLog");
const commsActive = document.getElementById("commsActive");
const commsQuestion = document.getElementById("commsQuestion");
const commsCtlYN = document.getElementById("commsCtlYN");
const commsCtlCode = document.getElementById("commsCtlCode");
const commTimer = document.getElementById("commTimer");
const btnCommYes = document.getElementById("btnCommYes");
const btnCommNo = document.getElementById("btnCommNo");
const commCodeInput = document.getElementById("commCodeInput");
const btnCommSubmit = document.getElementById("btnCommSubmit");

/* Power-up DOM */
const btnPUStabilize = document.getElementById("btnPUStabilize");
const btnPUSurge     = document.getElementById("btnPUSurge");
const btnPUFreeze    = document.getElementById("btnPUFreeze");
const puStabilizeCount = document.getElementById("puStabilizeCount");
const puSurgeCount     = document.getElementById("puSurgeCount");
const puFreezeCount    = document.getElementById("puFreezeCount");

/* ---------- Game state ---------- */
let SAVE = loadSave();
let GAME = {
  running:false, paused:false, mode:"Menu",
  levelIndex:0, system:null, lastTime:0,
  comms:new Comms(),
  // power-ups and banter counter
  powerups: { stabilize:0, reserve:0, freeze:0 },
  banterAnswers: 0
};
let manualPausedByUs = false;

/* ---------- UI helpers ---------- */
function buildArcadeSelectEl(selectEl){
  if(!selectEl) return;
  selectEl.innerHTML = "";
  LEVELS.forEach((L,i)=>{
    const opt = document.createElement("option");
    const unlocked = i < SAVE.storyUnlocked;
    opt.value = i;
    opt.textContent = unlocked ? L.name : `${L.name} (locked)`;
    opt.disabled = !unlocked;
    selectEl.appendChild(opt);
  });
  selectEl.value = Math.min(SAVE.storyUnlocked-1, LEVELS.length-1);
}

function syncUIToSave(){
  if (btnMute) btnMute.textContent = SAVE.options.muted ? "Unmute" : "Mute";
  if (manualProg) manualProg.textContent = SAVE.storyUnlocked;
  if (manualAutosave) manualAutosave.textContent = "On";
  if (settingsMsgTime) settingsMsgTime.value = SAVE.options.msgTimeMode || "scale";
  if (settingsPauseOnManual) settingsPauseOnManual.checked = !!SAVE.options.pauseOnManual;
  buildArcadeSelectEl(arcadeSelectTop);
  updateBestUI();
  updatePUUI();
}

function updateBestUI(){
  if(bestScoresBody){
    bestScoresBody.innerHTML = "";
    LEVELS.forEach((L,i)=>{
      const tr = document.createElement("tr");
      const best = Math.round(SAVE.bestScores[i]||0);
      tr.innerHTML = `<td>${L.name}</td><td>${best}</td>`;
      bestScoresBody.appendChild(tr);
    });
  }
}

function updatePUUI(){
  const s = GAME.powerups.stabilize|0, r = GAME.powerups.reserve|0, f = GAME.powerups.freeze|0;
  btnPUStabilize.disabled = s<=0; btnPUSurge.disabled = r<=0; btnPUFreeze.disabled = f<=0;

  puStabilizeCount.textContent = s; puSurgeCount.textContent = r; puFreezeCount.textContent = f;
  puStabilizeCount.hidden = s<=0; puSurgeCount.hidden = r<=0; puFreezeCount.hidden = f<=0;
}

function awardRandomPowerup(){
  const type = choice(["stabilize","reserve","freeze"]);
  GAME.powerups[type] = (GAME.powerups[type]||0) + 1;
  updatePUUI();
  logLine("ok", "System", `Power-up acquired: ${type[0].toUpperCase()+type.slice(1)}`);
  okBeep();
}

function showArcadeTop(show){
  if(arcadeTopControls) arcadeTopControls.hidden = !show;
}

function openMenu(){
  GAME.mode = "Menu";
  GAME.paused = false;
  showArcadeTop(false);
  overlayMenu.classList.add("open");
}
function closeMenu(){ overlayMenu.classList.remove("open"); }

function fillManual(){
  if (manualSituations){
    manualSituations.innerHTML = "";
    SITUATIONS.forEach(s=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s.card}</td><td>${s.tell}</td><td>${s.action}</td><td>${s.sop||""}</td>`;
      manualSituations.appendChild(tr);
    });
  }
  if(manualSOPs){
    manualSOPs.innerHTML = "";
    SOP_LIST.forEach(s=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${s.name}</strong></td><td>${s.rule}</td><td><em>${s.ex}</em></td>`;
      manualSOPs.appendChild(tr);
    });
  }
  Object.values(sectionsCodes).forEach(tbody => { if (tbody) tbody.innerHTML = ""; });
  MANUAL_CODES.forEach(c=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.topic}</td><td>${c.code}</td><td>${c.notes}</td>`;
    (sectionsCodes[c.category] || sectionsCodes.vents)?.appendChild(tr);
  });
}

function openManual(){
  fillManual();
  syncUIToSave();

  document.querySelectorAll(".tab-btn").forEach(b=> b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p=> p.classList.remove("active"));
  document.querySelector('[data-tab="tab-systems"]')?.classList.add("active");
  document.getElementById("tab-systems")?.classList.add("active");

  document.querySelectorAll(".codes-btn").forEach(b=> b.classList.remove("active"));
  document.querySelector('[data-codes="codes-vents"]')?.classList.add("active");
  document.querySelectorAll(".codes-panel").forEach(p=> p.classList.remove("active"));
  document.getElementById("codes-vents")?.classList.add("active");

  if(typeof dlgManual.showModal === "function"){
    dlgManual.showModal();
    if (SAVE.options.pauseOnManual && GAME.running && !GAME.paused){
      manualPausedByUs = true;
      GAME.paused = true;
      if(btnPause) btnPause.textContent = "Resume";
    }
  } else {
    alert("Your browser does not support the manual dialog.");
  }
}
function closeManual(){
  if(dlgManual?.open) dlgManual.close();
  if (manualPausedByUs){
    manualPausedByUs = false;
    if (GAME.running){
      GAME.paused = false;
      if(btnPause) btnPause.textContent = "Pause";
    }
  }
}

/* Tabs interactions (manual) */
document.addEventListener("click", (e)=>{
  const t = e.target;
  if(t.classList.contains("tab-btn")){
    document.querySelectorAll(".tab-btn").forEach(b=> b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=> p.classList.remove("active"));
    t.classList.add("active");
    const id = t.dataset.tab;
    document.getElementById(id)?.classList.add("active");
  }
  if(t.classList.contains("codes-btn")){
    document.querySelectorAll(".codes-btn").forEach(b=> b.classList.remove("active"));
    document.querySelectorAll(".codes-panel").forEach(p=> p.classList.remove("active"));
    t.classList.add("active");
    const id = t.dataset.codes;
    document.getElementById(id)?.classList.add("active");
  }
});

/* Slider badges (horizontal positioning only; CSS centers on knob) */
function updateSliderBadge(slider, badge){
  if(!slider || !badge) return;
  const min = +slider.min, max = +slider.max, val = +slider.value;
  const pct = (val - min) / (max - min);
  badge.textContent = val;

  // Use rAF-time rects for stability at load
  const rect = slider.getBoundingClientRect();
  const parentLeft = slider.parentElement.getBoundingClientRect().left;
  const px = rect.left + pct * rect.width;
  badge.style.left = (px - parentLeft) + "px";
}
function refreshAllBadges(){
  updateSliderBadge(sContain, bContain);
  updateSliderBadge(sCoolant, bCoolant);
  updateSliderBadge(sField, bField);
  updateSliderBadge(sPhase, bPhase);
}

function setSlidersFromActive(){
  const g = GAME.system.activeGauge();
  sContain.value = g.contain;
  sCoolant.value = g.coolant;
  sField.value = g.field;
  sPhase.value = g.phase;
  document.getElementById("ctrlGaugeName").textContent = g.def.key;
  // position after values set & layout is stable
  requestAnimationFrame(refreshAllBadges);
}

function renderGaugeStrip(){
  const sys = GAME.system;
  gaugeStrip.innerHTML = "";
  sys.gauges.forEach((g, idx)=>{
    const meta = `Energy ${Math.round(g.energy)} • Safe ${g.def.safeMin}–${g.def.safeMax}`;
    const lines = [
      asciiBarAligned("Current Energy", g.energy),
      asciiWindowAligned("Safe Window", g.def.safeMin, g.def.safeMax),
    ].join("\n");
    const card = document.createElement("div");
    card.className = "gcard" + (idx===sys.activeIndex ? " active" : "");
    card.dataset.index = String(idx);
    card.innerHTML = `
      <div class="hdr"><span class="name">${g.def.key} TRACE</span><span class="status">${g.alarm}</span></div>
      <div class="meta">${meta}</div>
      <pre>${lines}</pre>
    `;
    gaugeStrip.appendChild(card);
  });
}

function updateGaugeHeader(){
  const g = GAME.system.activeGauge();
  gaugeTitle.textContent = g.def.title;
  gaugeAlarm.textContent = g.alarm;
  gaugeSafe.textContent = `${g.def.safeMin}–${g.def.safeMax}`;
}

/* ---------- Modes ---------- */
function updateModeUI(){
  showArcadeTop(GAME.mode === "Arcade" || GAME.mode === "ArcadeRun");
}

function openArcadeHub(){
  closeMenu();
  GAME.running = false;
  GAME.paused = false;
  GAME.mode = "Arcade";
  updateModeUI();
  buildArcadeSelectEl(arcadeSelectTop);
  crt.textContent = `Arcade Mode

Select a level in the top bar and press Start.`;
}

/* ---------- Start, End, Level control ---------- */
function startStory(){ closeMenu(); GAME.mode="Story"; GAME.levelIndex=0; startLevel(0); }
function startArcade(idx){ GAME.mode="ArcadeRun"; startLevel(idx); }

function startLevel(levelIndex){
  GAME.levelIndex = levelIndex;
  GAME.system = new ReactorSystem(levelIndex);
  GAME.comms.reset();
  GAME.running = true; GAME.paused=false; GAME.lastTime = performance.now();
  GAME.powerups = {stabilize:0, reserve:0, freeze:0};
  GAME.banterAnswers = 0;
  updateModeUI();
  commsLog.innerHTML = "";
  if (commsActive) commsActive.hidden = true;
  if (commsCtlYN) commsCtlYN.hidden = true;
  if (commsCtlCode) commsCtlCode.hidden = true;
  if (commCodeInput) commCodeInput.value = "";
  updatePUUI();

  logLine("sys", "System", `Run started: ${LEVELS[levelIndex].name}`);
  setSlidersFromActive();
  updateGaugeHeader();
  renderGaugeStrip();
  if(btnPause) btnPause.textContent = "Pause";

  // ensure badges align once more after first paint
  requestAnimationFrame(refreshAllBadges);
}

function endRun(success, reason){
  GAME.running = false; GAME.paused=false;

  const score = Math.round(GAME.system.score);
  const best = SAVE.bestScores[GAME.levelIndex] || 0;
  if(score > best){ SAVE.bestScores[GAME.levelIndex] = score; saveNow(); }

  if(success && GAME.mode==="Story" && GAME.levelIndex+1 < LEVELS.length){
    SAVE.storyUnlocked = Math.max(SAVE.storyUnlocked, GAME.levelIndex+2);
    saveNow();
  }

  endTitle.textContent = success ? "Containment Achieved" : "Containment Failure";
  endBody.textContent = `Level: ${LEVELS[GAME.levelIndex].name}
Score: ${score}
Best: ${Math.max(best, score)}
Reason: ${reason}`;

  btnNextLevel.hidden = !(success && GAME.mode==="Story" && GAME.levelIndex+1 < LEVELS.length);

  overlayEnd.classList.add("open");
}
function retryLevel(){ startLevel(GAME.levelIndex); }
function toMenu(){ overlayEnd.classList.remove("open"); openMenu(); }
function nextLevel(){
  overlayEnd.classList.remove("open");
  const next = GAME.levelIndex + 1;
  if(next < LEVELS.length){ startLevel(next); }
  else { openMenu(); }
}

function afterGaugeChange(){
  setSlidersFromActive();
  updateGaugeHeader();
  renderGaugeStrip();
}

/* ---------- COMMS UI ---------- */
function logLine(kind, from, text){
  const div = document.createElement("div");
  div.className = "log-line";
  if(kind==="ok") div.classList.add("log-ok");
  if(kind==="bad") div.classList.add("log-bad");
  if(kind==="sys") div.classList.add("sys");
  div.innerHTML = `<span class="from">${from}:</span> ${text}`;
  commsLog.appendChild(div);
  commsLog.scrollTop = commsLog.scrollHeight;
}
function showActiveMessage(msg){
  if(!msg){ commsActive.hidden = true; return; }
  commsActive.hidden = false;
  commsQuestion.textContent = `${msg.from}: ${msg.text}`;
  commsCtlYN.hidden = !(msg.type==="yn" || msg.type==="banter");
  commsCtlCode.hidden = (msg.type!=="code");
  commTimer.textContent = isFinite(GAME.comms.timer) ? Math.ceil(GAME.comms.timer) : "∞";
}

function answerYN(ans){
  const msg = GAME.comms.active;
  if(!msg) return;

  if(msg.type==="banter"){
    const picked = (ans==="Y") ? msg.y : msg.n;
    logLine("msg", msg.from, picked.reply);
    if(picked.buff){
      okBeep();
      GAME.system.nudgeAllBuff();
      GAME.system.boostReserve(3);
    }
    GAME.banterAnswers++;
    if(GAME.banterAnswers % 2 === 0){
      awardRandomPowerup();
    }
    GAME.comms.active = null; commsActive.hidden = true;
    return;
  }

  if(msg.type!=="yn") return;
  let correct = msg.correct;
  if(typeof correct === "function"){
    correct = correct(GAME.system);
  }
  const ok = (ans === correct);
  if(ok){
    okBeep();
    logLine("ok", "You", `${ans==="Y"?"Yes":"No"} — acknowledged`);
    GAME.system.boostReserve(10);
    GAME.system.nudgeAllBuff();
    // award for correct SOP
    awardRandomPowerup();
  }else{
    badBeep();
    logLine("bad", "You", `${ans==="Y"?"Yes":"No"} — incorrect`);
    GAME.system.boostReserve(-8);
    GAME.system.addVolatilityShock();
  }
  GAME.comms.active = null;
  commsActive.hidden = true;
}

function answerCode(){
  const msg = GAME.comms.active;
  if(!msg || msg.type!=="code") return;
  const val = commCodeInput.value.trim();
  if(!val) return;
  if(val.toUpperCase() === msg.code.toUpperCase()){
    okBeep();
    logLine("ok", "You", `Code ${val} — confirmed`);
    GAME.system.boostReserve(12);
    GAME.system.nudgeAllBuff();
    // award for correct code lookup
    awardRandomPowerup();
  }else{
    badBeep();
    logLine("bad", "You", `Code ${val} — rejected`);
    GAME.system.boostReserve(-10);
    GAME.system.addVolatilityShock();
  }
  commCodeInput.value = "";
  GAME.comms.active = null;
  commsActive.hidden = true;
}

/* ---------- Events ---------- */
[sContain,sCoolant,sField,sPhase].forEach((s)=>{
  if(!s) return;
  s.addEventListener("input", ()=>{
    if(!GAME.system) return;
    if(s===sContain) GAME.system.setControlsForActive({contain:+s.value});
    if(s===sCoolant) GAME.system.setControlsForActive({coolant:+s.value});
    if(s===sField)   GAME.system.setControlsForActive({field:+s.value});
    if(s===sPhase)   GAME.system.setControlsForActive({phase:+s.value});
    refreshAllBadges();
  });
});

btnPurge?.addEventListener("click", ()=> GAME.system && GAME.system.purge());
btnRods?.addEventListener("click",  ()=> GAME.system && GAME.system.rods());
btnAux?.addEventListener("click",   ()=> GAME.system && GAME.system.auxBanks());

/* COMMS button hookups */
btnCommYes?.addEventListener("click", ()=> answerYN("Y"));
btnCommNo?.addEventListener("click",  ()=> answerYN("N"));
btnCommSubmit?.addEventListener("click", ()=> answerCode());
commCodeInput?.addEventListener("keydown", (e)=>{ if(e.key==="Enter") answerCode(); });

/* Power-up button hookups */
btnPUStabilize?.addEventListener("click", ()=>{
  if(GAME.powerups.stabilize>0){
    GAME.powerups.stabilize--;
    updatePUUI();
    GAME.system.nudgeAllBuff();
    logLine("ok","You","Power-up: Stabilize — oscillations dampened");
    okBeep();
  }
});
btnPUSurge?.addEventListener("click", ()=>{
  if(GAME.powerups.reserve>0){
    GAME.powerups.reserve--;
    updatePUUI();
    GAME.system.boostReserve(22);
    logLine("ok","You","Power-up: Reserve — reserve boosted");
    okBeep();
  }
});
btnPUFreeze?.addEventListener("click", ()=>{
  if(GAME.powerups.freeze>0){
    GAME.powerups.freeze--;
    updatePUUI();
    GAME.system.freezeActive(5);
    logLine("ok","You","Power-up: Freeze — active gauge frozen");
    okBeep();
  }
});

btnMainMenu?.addEventListener("click", openMenu);
btnStory?.addEventListener("click", startStory);
btnArcade?.addEventListener("click", openArcadeHub);
btnManual?.addEventListener("click", openManual);
btnCloseManual?.addEventListener("click", closeManual);

topArcadeStart?.addEventListener("click", ()=>{
  const idx = +arcadeSelectTop.value || 0;
  if(idx >= SAVE.storyUnlocked){ alert("That level is locked. Play Story to unlock."); return; }
  startArcade(idx);
});

btnPause?.addEventListener("click", ()=>{
  if(!GAME.running) return;
  GAME.paused = !GAME.paused;
  btnPause.textContent = GAME.paused ? "Resume" : "Pause";
});
btnReset?.addEventListener("click", ()=> { if(GAME.running) retryLevel(); });
btnMute?.addEventListener("click", ()=> { SAVE.options.muted = !SAVE.options.muted; btnMute.textContent = SAVE.options.muted ? "Unmute" : "Mute"; saveNow(); });
btnExport?.addEventListener("click", exportSave);
fileImport?.addEventListener("change", async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  importSaveText(await f.text()); e.target.value = "";
});

menuStartStory?.addEventListener("click", startStory);
menuOpenArcade?.addEventListener("click", openArcadeHub);
menuOpenManual?.addEventListener("click", openManual);

btnNextLevel?.addEventListener("click", nextLevel);
btnRetry?.addEventListener("click", ()=>{ overlayEnd.classList.remove("open"); retryLevel(); });
btnEndSave?.addEventListener("click", ()=>{ saveNow(); endBody.textContent += `\nSaved.`; okBeep(); });
btnEndExport?.addEventListener("click", exportSave);
btnToMenu?.addEventListener("click", toMenu);

/* Manual save actions + settings */
btnManualExport?.addEventListener("click", exportSave);
fileImportManual?.addEventListener("change", async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  importSaveText(await f.text()); e.target.value = "";
});
btnManualWipe?.addEventListener("click", ()=>{
  if(confirm("Wipe local save data? This cannot be undone.")){
    SAVE = defaultSave(); saveNow(); syncUIToSave();
  }
});
settingsMsgTime?.addEventListener("change", (e)=>{
  const v = e.target.value;
  SAVE.options.msgTimeMode = v;
  saveNow();
});
settingsPauseOnManual?.addEventListener("change", (e)=>{
  SAVE.options.pauseOnManual = !!e.target.checked;
  saveNow();
});

/* Subbar actions (wrap-around) */
gPrev?.addEventListener("click", ()=>{
  if(!GAME.system) return;
  const n = GAME.system.gauges.length;
  GAME.system.setActiveIndex((GAME.system.activeIndex - 1 + n) % n);
  afterGaugeChange();
});
gNext?.addEventListener("click", ()=>{
  if(!GAME.system) return;
  const n = GAME.system.gauges.length;
  GAME.system.setActiveIndex((GAME.system.activeIndex + 1) % n);
  afterGaugeChange();
});

/* Gauge strip click via delegation */
gaugeStrip?.addEventListener("click", (e)=>{
  const card = e.target.closest(".gcard");
  if(!card || !gaugeStrip.contains(card)) return;
  const idx = parseInt(card.dataset.index, 10);
  if(isFinite(idx) && GAME.system){
    GAME.system.setActiveIndex(idx);
    afterGaugeChange();
  }
});

/* keyboard */
window.addEventListener("keydown", (e)=>{
  if(dlgManual?.open){ if(e.key==="Escape") closeManual(); return; }
  if(GAME.mode==="Menu") return;
  if(e.key===" "){ e.preventDefault(); btnPause?.click(); }
  if(e.key==="p"||e.key==="P") btnPurge?.click();
  if(e.key==="r"||e.key==="R") btnRods?.click();
  if(e.key==="a"||e.key==="A") btnAux?.click();
  if(e.key==="[" ){
    if(GAME.system){
      const n = GAME.system.gauges.length;
      GAME.system.setActiveIndex((GAME.system.activeIndex - 1 + n) % n);
      afterGaugeChange();
    }
  }
  if(e.key==="]" ){
    if(GAME.system){
      const n = GAME.system.gauges.length;
      GAME.system.setActiveIndex((GAME.system.activeIndex + 1) % n);
      afterGaugeChange();
    }
  }
});

/* ---------- Rendering ---------- */
function renderCRT(){
  if(!GAME.system){
    crt.textContent = `Helios Station Ops Console

Press Start Story or open Arcade to select a level.
Open Manual for procedures and codes.`;
    return;
  }
  const sys = GAME.system;
  const g = sys.activeGauge();

  const linesTop = [
    asciiBarAligned("Energy", g.energy)+ "        ",
    asciiBarAligned("Reserve", sys.reserve)+ "        ",
    asciiWindowAligned("Safe Window", g.def.safeMin, g.def.safeMax)+ "            ",
    `Meltdown at >= ${g.def.meltdown}`+ "                                               ",
    "                                                                "
  ];

  // Chart box
  const chart = asciiHistory(g.history, 10, 60).split("\n");
  const chartBox = asciiBox(chart, g.def.title);

  // CONTROL + info
  const perGaugeProgress = sys.gauges
    .map(gg => `${gg.def.key.padEnd(5," ")} ${gg.winTime.toFixed(1).padStart(5," ")}s / ${gg.def.duration}s`)
    .join("\n");

  const purgeCD = g.purgeCooldown<=0 ? "READY" : `${g.purgeCooldown.toFixed(1)}s`;
  const rodsCD  = g.rodsCooldown<=0  ? "READY" : `${g.rodsCooldown.toFixed(1)}s`;
  const auxCD   = sys.auxCooldown<=0 ? "READY" : `${sys.auxCooldown.toFixed(1)}s`;
  const trickleStr = (!sys.gauges.some(x=>x.alarm==="Danger")) ? `+${sys.trickleRate.toFixed(2)}/s` : "—";

  const ctrlMirror = [
    asciiBarAligned("Containment", g.contain),
    asciiBarAligned("Coolant", g.coolant),
    asciiBarAligned("Field", g.field),
    asciiBarAligned("Phase", g.phase),
    "",
    `Purge CD: ${purgeCD} (${g.purgeUses}x)`,
    `Rods  CD: ${rodsCD} (${g.rodsUses}x)`,
    `Aux   CD: ${auxCD} (${sys.auxUses}x)`,
    `Reserve trickle: ${trickleStr}`
  ];
  const infoLines = [
    "",
    `Mode:  ${GAME.mode === "ArcadeRun" ? "Arcade" : GAME.mode}`,
    `Level: ${LEVELS[GAME.levelIndex].name}`,
    `Progress per gauge:\n${perGaugeProgress}`,
    `Score: ${Math.round(sys.score)} (best ${Math.round(SAVE.bestScores[GAME.levelIndex]||0)})`,
    `Active Alarm: ${g.alarm}`,
    `Status: ${GAME.paused ? "PAUSED" : "RUNNING"}`
  ];
  const rightBox = asciiBox(ctrlMirror.concat(infoLines), "CONTROL");

  // Put the top metrics on the LEFT column so CONTROL sits at the very top on the RIGHT
  const leftColumn = linesTop.join("\n") + asciiSideBySide("", "", 0) + "\n" + chartBox;

  // Side-by-side render (left: metrics + chart | right: CONTROL)
  const grid = asciiSideBySide(leftColumn, rightBox, 6);
  crt.textContent = grid;

  updateGaugeHeader();
  renderGaugeStrip();

  if(!GAME.comms.active && GAME.comms.queue.length===0){
    GAME.comms.tickGenerate(0, GAME.levelIndex, sys);
  }
}

/* ---------- Main loop ---------- */
function loop(now){
  if(!GAME.running){ renderCRT(); requestAnimationFrame(loop); return; }
  const dt = Math.min(0.05, (now - GAME.lastTime) / 1000);
  GAME.lastTime = now;

  if(!GAME.paused){
    const res = GAME.system.update(dt);
    if(GAME.system.gauges.some(x => x.alarm!=="Clear") && Math.random()<0.08) alarmBeep();
    if(res.ended){ endRun(res.success, res.reason); }

    GAME.comms.tickGenerate(dt, GAME.levelIndex, GAME.system);

    if(!GAME.comms.active && GAME.comms.queue.length>0){
      GAME.comms.promote();
      const m = GAME.comms.active;
      logLine("msg", m.from, m.text);
      showActiveMessage(m);
    }

    if(GAME.comms.active){
      const expired = GAME.comms.tickActive(dt);
      commTimer.textContent = isFinite(GAME.comms.timer) ? Math.ceil(GAME.comms.timer) : "∞";
      if(expired){
        badBeep();
        logLine("bad", "System", "COMMS request timed out");
        GAME.system.boostReserve(-6);
        GAME.system.addVolatilityShock();
        GAME.comms.active = null;
        commsActive.hidden = true;
      }
    }
  }

  renderCRT();
  requestAnimationFrame(loop);
}

/* ---------- Boot ---------- */
function boot(){
  syncUIToSave();
  openMenu();
  crt.textContent = `Helios Station - Core Supervisor

Press Start Story or open Arcade (top bar).
Open Manual for procedures, SOPs, situations, and codes.`;
  requestAnimationFrame(t=>{ GAME.lastTime=t; requestAnimationFrame(loop); });
}

window.addEventListener("load", ()=>{
  boot();
  // double-rAF to ensure stable first paint for badges
  requestAnimationFrame(()=> requestAnimationFrame(refreshAllBadges));
});
window.addEventListener("resize", ()=> requestAnimationFrame(refreshAllBadges));
