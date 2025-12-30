/* Type Quest - Learn Typing Fast
   Modes: Practice, Arcade, Directions (finger + arrow memory) + Stats/Profiles
   NOTE: All global keyboard shortcuts (like 1/2/3/4 to switch tabs) are removed. */

(() => {
  // -------------------------
  // Small DOM / util helpers
  // -------------------------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];
  const now = () => performance.now();
  const fmtPct = n => `${clamp(Math.round(n), 0, 100)}%`;
  const fmtInt = n => `${Math.round(n)}`;
  const fmtSec = s => `${Math.floor(s)}s`;
  const fmtMin = s => `${Math.round(s/60)}m`;
  const ts = () => Date.now();

  // -------------------------
  // Lessons / text pools
  // -------------------------
  const LESSONS = { home:"asdfjkl;", top:"qwertyuiop", bottom:"zxcvbnm" };

  const COMMON_WORDS_SHORT = [
    "at","it","on","in","to","up","me","we","you","do","go","no","so","as","my","is","be","am",
    "and","the","for","with","this","that","from","your","have","just","like","time","look","good",
    "back","make","well","home","work","know","take","love","cool","best","fast","slow","game","type"
  ];
  const COMMON_WORDS = [
    "about","after","again","around","because","before","better","between","first","found","great","house",
    "little","people","place","right","school","should","small","sound","still","their","there","think",
    "three","through","water","where","which","world","would","write","young","number","during","always",
    "practice","keyboard","letter","around","random","player","target","points","simple","change","learn"
  ];
  const SENTENCES = [
    "add fuel to your focus and keep eyes on the screen",
    "typing gets easier when accuracy comes first",
    "hands rest on f and j then stretch to reach",
    "short sessions help progress without fatigue",
    "pop the targets before they touch the ground"
  ];

  // -------------------------
  // Keyboard / finger mapping
  // -------------------------
  const KEY_LAYOUT = [
    [
      {code:"Backquote", label:"`", chars:"`~"},
      {code:"Digit1", label:"1", chars:"1!"},
      {code:"Digit2", label:"2", chars:"2@"},
      {code:"Digit3", label:"3", chars:"3#"},
      {code:"Digit4", label:"4", chars:"4$"},
      {code:"Digit5", label:"5", chars:"5%"},
      {code:"Digit6", label:"6", chars:"6^"},
      {code:"Digit7", label:"7", chars:"7&"},
      {code:"Digit8", label:"8", chars:"8*"},
      {code:"Digit9", label:"9", chars:"9("},
      {code:"Digit0", label:"0", chars:"0)"},
      {code:"Minus", label:"-", chars:"-_"},
      {code:"Equal", label:"=", chars:"=+"},
      {code:"Backspace", label:"Backspace", w:1.8, small:true}
    ],
    [
      {code:"Tab", label:"Tab", w:1.4, small:true},
      {code:"KeyQ", label:"Q", chars:"q"},
      {code:"KeyW", label:"W", chars:"w"},
      {code:"KeyE", label:"E", chars:"e"},
      {code:"KeyR", label:"R", chars:"r"},
      {code:"KeyT", label:"T", chars:"t"},
      {code:"KeyY", label:"Y", chars:"y"},
      {code:"KeyU", label:"U", chars:"u"},
      {code:"KeyI", label:"I", chars:"i"},
      {code:"KeyO", label:"O", chars:"o"},
      {code:"KeyP", label:"P", chars:"p"},
      {code:"BracketLeft", label:"[", chars:"[{" , small:true},
      {code:"BracketRight", label:"]", chars:"]}", small:true},
      {code:"Backslash", label:"\\", chars:"\\|", w:1.4, small:true}
    ],
    [
      {code:"CapsLock", label:"Caps", w:1.7, small:true},
      {code:"KeyA", label:"A", chars:"a"},
      {code:"KeyS", label:"S", chars:"s"},
      {code:"KeyD", label:"D", chars:"d"},
      {code:"KeyF", label:"F", chars:"f"},
      {code:"KeyG", label:"G", chars:"g"},
      {code:"KeyH", label:"H", chars:"h"},
      {code:"KeyJ", label:"J", chars:"j"},
      {code:"KeyK", label:"K", chars:"k"},
      {code:"KeyL", label:"L", chars:"l"},
      {code:"Semicolon", label:";", chars:";:"},
      {code:"Quote", label:"'", chars:"'\""},
      {code:"Enter", label:"Enter", w:2.1, small:true}
    ],
    [
      {code:"ShiftLeft", label:"Shift", w:2.1, small:true},
      {code:"KeyZ", label:"Z", chars:"z"},
      {code:"KeyX", label:"X", chars:"x"},
      {code:"KeyC", label:"C", chars:"c"},
      {code:"KeyV", label:"V", chars:"v"},
      {code:"KeyB", label:"B", chars:"b"},
      {code:"KeyN", label:"N", chars:"n"},
      {code:"KeyM", label:"M", chars:"m"},
      {code:"Comma", label:",", chars:",<"},
      {code:"Period", label:".", chars:".>"},
      {code:"Slash", label:"/", chars:"/?"},
      {code:"ShiftRight", label:"Shift", w:2.1, small:true}
    ],
    [
      {code:"ControlLeft", label:"Ctrl", w:1.4, small:true},
      {code:"MetaLeft", label:"Win", w:1.2, small:true},
      {code:"AltLeft", label:"Alt", w:1.4, small:true},
      {code:"Space", label:"", chars:" ", w:6.5, space:true},
      {code:"AltRight", label:"Alt", w:1.4, small:true},
      {code:"MetaRight", label:"Win", w:1.2, small:true},
      {code:"ContextMenu", label:"Menu", w:1.4, small:true},
      {code:"ControlRight", label:"Ctrl", w:1.4, small:true}
    ]
  ];

  // IMPORTANT: includes "th" already
  const FINGER_IDS = ["lp","lr","lm","li","ri","rm","rr","rp","th"];
  const FINGER_NAMES = {
    lp:"Left pinky", lr:"Left ring", lm:"Left middle", li:"Left index",
    ri:"Right index", rm:"Right middle", rr:"Right ring", rp:"Right pinky", th:"Thumbs"
  };

  // Set membership for each finger (character-centric, not key codes)
  const FP = {
    lp: new Set(["`","1","q","a","z"]),
    lr: new Set(["2","w","s","x"]),
    lm: new Set(["3","e","d","c"]),
    li: new Set(["4","5","r","t","f","g","v","b"]),
    ri: new Set(["6","7","y","u","h","j","n","m"]),
    rm: new Set(["8","i","k",","]),
    rr: new Set(["9","o","l","."]),
    rp: new Set(["0","-","=","p","[","]","\\",";","'","/"]),
    th: new Set([" "])
  };

  const FP_EXTRA_KEYS = { // for coloring non-character keys
    lp: new Set(["Tab","CapsLock","ShiftLeft"]),
    rp: new Set(["Backspace","Enter","ShiftRight"])
  };

  const DIR_NAMES = { lp:"LP", lr:"LR", lm:"LM", li:"LI", ri:"RI", rm:"RM", rr:"RR", rp:"RP", th:"TH" };
  const DIR_SYMBOL = {
    base:"•", up:"↑", down:"↓", left:"←", right:"→",
    upleft:"↖", upright:"↗", downleft:"↙", downright:"↘",
    up2:"↑2", up2left:"↖2", up2right:"↗2", down2:"↓2"
  };

  function charToFinger(ch) {
    if (ch == null) return null;
    const c = (ch + "").toLowerCase();
    for (const id of FINGER_IDS) if (FP[id].has(c)) return id;
    if (c === "tab" || c === "capslock" || c === "shiftleft") return "lp";
    if (c === "enter" || c === "backspace" || c === "shiftright") return "rp";
    return null;
  }

  // -------------------------
  // Build keyboard + legend
  // -------------------------
  function widthClass(w) {
    const map = { 1.4:"w-1-4", 1.7:"w-1-7", 1.8:"w-1-8", 2.1:"w-2-1", 2.4:"w-2-4", 6.5:"w-6-5" };
    return map[w] || "";
  }

  function fingerForKey(code, label, chars) {
    const primary = (chars || label || "").toLowerCase();
    const byChar = charToFinger(primary);
    if (byChar) return byChar;
    if (code === "Space") return "th";
    if (FP_EXTRA_KEYS.lp.has(code)) return "lp";
    if (FP_EXTRA_KEYS.rp.has(code)) return "rp";
    return "li"; // fallback
  }

  function buildKeyboard(container, legendContainer) {
    container.innerHTML = "";
    legendContainer.innerHTML = "";
    KEY_LAYOUT.forEach((row, idx) => {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row row-" + (idx + 1);
      row.forEach(k => {
        const el = document.createElement("div");
        el.className = "key";
        el.dataset.code = k.code;

        if (k.w) {
          const cls = widthClass(k.w);
          if (cls) el.classList.add(cls); else el.style.flexBasis = `calc(var(--u) * ${k.w})`;
        }
        if (k.small) el.classList.add("smalltxt");
        if (k.space) el.classList.add("space");

        const label = k.label || "";
        el.textContent = label;

        // ONLY map printable characters for hint matching.
        // This fixes accidental matches like 's' highlighting the Backspace key
        // (because "Backspace".toLowerCase() contains an 's').
        const printable = typeof k.chars === "string"
          ? k.chars.toLowerCase()
          : (k.code === "Space" ? " " : "");
        el.dataset.chars = printable ? printable.split("").join("|") : "";

        const finger = fingerForKey(k.code, k.label, k.chars && k.chars[0]);
        if (finger) el.classList.add("f-" + finger);
        if (k.code === "KeyF" || k.code === "KeyJ") {
          const bump = document.createElement("div");
          bump.className = "bump";
          el.appendChild(bump);
        }

        rowEl.appendChild(el);
      });
      container.appendChild(rowEl);
    });

    FINGER_IDS.forEach(id => {
      const name = FINGER_NAMES[id];
      const pill = document.createElement("div");
      pill.className = "legend-pill";
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = getComputedStyle(document.documentElement).getPropertyValue(`--f-${id}`);
      const text = document.createElement("span");
      text.textContent = name;
      pill.appendChild(dot);
      pill.appendChild(text);
      legendContainer.appendChild(pill);
    });
  }

  function getKeyElByChar(container, ch) {
    if (!ch && ch !== " ") return null;
    const target = ch.toLowerCase();
    const keys = container.querySelectorAll(".key");
    for (const k of keys) {
      const list = (k.dataset.chars || "").split("|").filter(Boolean);
      if (list.includes(target)) return k;
    }
    if (target === " ") return container.querySelector('.key[data-code="Space"]');
    return null;
  }
  function clearKeyHints(container) { container.querySelectorAll(".key.hint").forEach(k => k.classList.remove("hint")); }
  function setKeyboardHint(container, char) {
    clearKeyHints(container);
    const el = getKeyElByChar(container, char);
    if (el) el.classList.add("hint");
  }
  function flashKeyPress(container, char) {
    const el = getKeyElByChar(container, char);
    if (!el) return;
    el.classList.add("press");
    setTimeout(() => el.classList.remove("press"), 120);
  }

  // Build keyboards
  buildKeyboard($("#keyboard-practice"), $("#legend-practice"));
  buildKeyboard($("#keyboard-arcade"), $("#legend-arcade"));
  buildKeyboard($("#keyboard-directions"), $("#legend-directions"));

  // -------------------------
  // Tabs (click only)
  // -------------------------
  const tabs = $$(".tab-btn");
  const panels = $$(".tab-panel");
  function goToTab(id) {
    tabs.forEach(b => b.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    const btn = $(`.tab-btn[data-tab="${id}"]`);
    if (btn) btn.classList.add("active");
    const panel = $("#" + id);
    if (panel) panel.classList.add("active");
  }
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      goToTab(btn.dataset.tab);
      if (btn.dataset.tab === "practice") focusHiddenInput();
      if (btn.dataset.tab === "directions") focusHiddenInputDir();
      if (btn.dataset.tab === "stats") renderStats();
    });
  });

  // -------------------------
  // PRACTICE MODE
  // -------------------------
  const practice = {
    lessonSel: $("#practice-lesson"),
    lenRange: $("#practice-length"),
    lenLabel: $("#practice-length-label"),
    showHints: $("#practice-hints"),
    showFingers: $("#practice-fingers"),
    btnNew: $("#practice-new"),
    btnReset: $("#practice-reset"),
    drillText: $("#drill-text"),
    hiddenInput: $("#hidden-input"),
    kb: $("#keyboard-practice"),
    stats: { startTime:0, elapsed:0, typed:0, correct:0, wrong:0, streak:0 },
    fp: null, // per-finger counters for this session
    expected: "",
    index: 0,
    started: false,
    completed: false,
    tickHandle: null
  };

  function emptyFingerCounters(){ const o={}; for(const id of FINGER_IDS) o[id]={typed:0,wrong:0}; return o; }

  function genPracticeText(lesson, length) {
    if (lesson === "words_short") return joinWordsToLength(COMMON_WORDS_SHORT, length);
    if (lesson === "words_common") return joinWordsToLength(COMMON_WORDS, length);
    if (lesson === "sentences") {
      let s = "";
      while (s.length < length) s += choice(SENTENCES) + "  ";
      return s.slice(0, length);
    }
    if (lesson === "mix") {
      const pool = (LESSONS.home + LESSONS.top + LESSONS.bottom);
      return randomChars(pool, length, true);
    }
    const pool = LESSONS[lesson] || LESSONS.home;
    return randomChars(pool, length, true);
  }

  function randomChars(pool, length, insertSpaces) {
    let out = "";
    const letters = pool.replace(/\s/g,"");
    for (let i = 0; i < length; i++) {
      if (insertSpaces && i % 5 === 4) out += " ";
      else out += letters[Math.floor(Math.random() * letters.length)];
    }
    return out;
  }
  function joinWordsToLength(list, length) {
    let out = "";
    while (out.length < length) { const w = choice(list); out += (out ? " " : "") + w; }
    return out.slice(0, length);
  }
  function renderDrillText(str, index, wrongIndex = -1) {
    const parts = [];
    for (let i = 0; i < str.length; i++) {
      const ch = str[i] === " " ? "·" : str[i];
      if (i < index) parts.push(`<span class="done">${escapeHTML(ch)}</span>`);
      else if (i === index) parts.push(`<span class="next">${escapeHTML(ch)}</span>`);
      else parts.push(`<span>${escapeHTML(ch)}</span>`);
    }
    if (wrongIndex >= 0 && wrongIndex < str.length) {
      parts[wrongIndex] = `<span class="wrong">${escapeHTML(str[wrongIndex] === " " ? "·" : str[wrongIndex])}</span>`;
    }
    practice.drillText.innerHTML = parts.join("");
  }
  function escapeHTML(s) { return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;","<":">&gt;",'"':"&quot;","'":"&#39;" }[c])); } // NOTE: keep one copy only
  function resetPracticeStats() { practice.stats = { startTime:0, elapsed:0, typed:0, correct:0, wrong:0, streak:0 }; updatePracticeStatsUI(); }
  function startPracticeTick() {
    if (practice.tickHandle) cancelAnimationFrame(practice.tickHandle);
    const start = now();
    function tick() { practice.stats.elapsed = (now() - (practice.stats.startTime || start)) / 1000; updatePracticeStatsUI(); practice.tickHandle = requestAnimationFrame(tick); }
    practice.stats.startTime = start; practice.tickHandle = requestAnimationFrame(tick);
  }
  function stopPracticeTick() { if (practice.tickHandle) cancelAnimationFrame(practice.tickHandle); practice.tickHandle = null; }
  function updatePracticeStatsUI() {
    const elapsedMin = Math.max(1/60, practice.stats.elapsed / 60);
    const wpm = Math.round((practice.stats.correct / 5) / elapsedMin);
    $("#practice-wpm").textContent = isFinite(wpm) ? wpm : 0;
    const total = Math.max(1, practice.stats.typed);
    const acc = Math.round((practice.stats.correct / total) * 100);
    $("#practice-acc").textContent = `${clamp(acc,0,100)}%`;
    $("#practice-streak").textContent = practice.stats.streak;
    $("#practice-time").textContent = `${Math.floor(practice.stats.elapsed)}s`;
  }
  function focusHiddenInput() { practice.hiddenInput.focus(); }

  practice.lenRange.addEventListener("input", () => { practice.lenLabel.textContent = practice.lenRange.value; });
  practice.btnNew.addEventListener("click", () => {
    if (!practice.completed && practice.stats.typed > 0) savePracticeSession("abandon"); // save partials too
    const len = parseInt(practice.lenRange.value, 10);
    practice.expected = genPracticeText(practice.lessonSel.value, len);
    practice.index = 0;
    practice.completed = false;
    practice.fp = emptyFingerCounters();
    renderDrillText(practice.expected, 0);
    resetPracticeStats();
    practice.started = false; // wait for first key
    focusHiddenInput();
    if (practice.showHints.checked) setKeyboardHint(practice.kb, practice.expected[0] || " ");
    else clearKeyHints(practice.kb);
  });
  practice.btnReset.addEventListener("click", () => { resetPracticeStats(); renderDrillText(practice.expected || "", practice.index || 0); });
  practice.drillText.addEventListener("click", focusHiddenInput);
  document.addEventListener("keydown", e => {
    if (!$("#practice").classList.contains("active")) return;
    if (e.key === "Enter" && document.activeElement !== practice.hiddenInput) { e.preventDefault(); focusHiddenInput(); }
  });
  practice.hiddenInput.addEventListener("keydown", e => {
    if (!practice.expected) return;
    const key = normalizeKey(e.key); if (!key) return;

    // Start timer on first typed key of this drill
    if (!practice.started) {
      practice.started = true;
      startPracticeTick();
    }
    const expected = practice.expected[practice.index];
    const finger = charToFinger(expected) || "li";
    practice.fp[finger].typed++;

    practice.stats.typed++;
    const good = compareKey(expected, key);
    flashKeyPress(practice.kb, key);
    if (good) {
      practice.stats.correct++; practice.stats.streak++; practice.index++;
      renderDrillText(practice.expected, practice.index);
      if (practice.showHints.checked) setKeyboardHint(practice.kb, practice.expected[practice.index] || " ");
      if (practice.index >= practice.expected.length) {
        practice.completed = true; stopPracticeTick(); savePracticeSession("complete");
      }
    } else {
      practice.fp[finger].wrong++;
      practice.stats.wrong++; practice.stats.streak = 0;
      renderDrillText(practice.expected, practice.index, practice.index);
      setTimeout(() => renderDrillText(practice.expected, practice.index), 120);
    }
    updatePracticeStatsUI(); e.preventDefault();
  });

  function normalizeKey(k) {
    if (k === "Shift" || k === "Alt" || k === "Control" || k === "Meta") return "";
    if (k === "Spacebar" || k === " " || k === "Space") return " ";
    if (k.length === 1) return k;
    return "";
  }
  function compareKey(expected, typed) { if (!expected) return false; if (expected === " ") return typed === " "; return expected.toLowerCase() === typed.toLowerCase(); }

  // -------------------------
  // ARCADE MODE
  // -------------------------
  const arcade = {
    playfield: $("#playfield"),
    kb: $("#keyboard-arcade"),
    overlay: $("#arcade-overlay"),
    overlayTitle: $("#overlay-title"),
    overlaySub: $("#overlay-sub"),
    overlayClose: $("#overlay-close"),
    btnStart: $("#arcade-start"),
    btnPause: $("#arcade-pause"),
    btnReset: $("#arcade-reset"),
    difficulty: $("#arcade-difficulty"),
    targetType: $("#arcade-target-type"),
    lessonFilter: $("#arcade-lesson-filter"),
    showHints: $("#arcade-hints"),
    showFingers: $("#arcade-fingers"),
    stats: { startTime:0, elapsed:0, typed:0, correct:0, wrong:0, score:0, lives:3 },
    fp: null,
    state: "idle",         // "idle" | "ready" | "running" | "paused" | "life_pause" | "gameover"
    pauseSince: 0,         // for overlay pauses; we freeze UI while paused
    running:false, raf:null, lastTick:0, spawnTimer:0, targets:[], idSeq:1,
    hadActivity:false
  };

  function arcadeParams() {
    const diff = arcade.difficulty.value;
    const p = { baseSpeed:50, spawnEvery:1200, speedRand:30, maxOnScreen:10 };
    if (diff === "easy") { p.baseSpeed=42; p.spawnEvery=1300; p.speedRand=22; p.maxOnScreen=8; }
    else if (diff === "normal") { p.baseSpeed=58; p.spawnEvery=1100; p.speedRand=34; p.maxOnScreen=10; }
    else if (diff === "hard") { p.baseSpeed=80; p.spawnEvery=900; p.speedRand=40; p.maxOnScreen=12; }
    else if (diff === "insane") { p.baseSpeed=108; p.spawnEvery=750; p.speedRand=48; p.maxOnScreen=14; }
    return p;
  }
  function resetArcadeStats() {
    arcade.stats = { startTime:0, elapsed:0, typed:0, correct:0, wrong:0, score:0, lives:3 };
    arcade.fp = emptyFingerCounters();
    $("#arcade-score").textContent = "0"; $("#arcade-lives").textContent = "3";
    $("#arcade-wpm").textContent = "0"; $("#arcade-acc").textContent = "100%"; $("#arcade-time").textContent = "0s";
  }
  function updateArcadeStatsUI() {
    $("#arcade-score").textContent = arcade.stats.score; $("#arcade-lives").textContent = arcade.stats.lives;
    const m = Math.max(1/60, arcade.stats.elapsed / 60);
    $("#arcade-wpm").textContent = Math.round((arcade.stats.correct / 5) / m) || 0;
    const total = Math.max(1, arcade.stats.typed);
    $("#arcade-acc").textContent = `${clamp(Math.round((arcade.stats.correct / total) * 100),0,100)}%`;
    $("#arcade-time").textContent = `${Math.floor(arcade.stats.elapsed)}s`;
  }
  function arcadeStart(){
    if (arcade.running) return;
    arcade.running = true;
    arcade.overlay.classList.add("hidden");
    arcade.stats.startTime = now() - arcade.stats.elapsed * 1000;
    arcade.lastTick = now();
    arcade.raf = requestAnimationFrame(arcadeTick);
    arcade.state = "running";
  }
  function arcadePause(show=true){
    if (!arcade.running) return;
    arcade.running = false;
    if (arcade.raf) cancelAnimationFrame(arcade.raf);
    arcade.state = "paused";
    if (show){
      arcade.overlayTitle.textContent = "Paused";
      arcade.overlaySub.textContent = "Press any key or click Resume";
      arcade.overlay.classList.remove("hidden");
    }
  }
  function finalizeArcadeSession(reason) {
    if (arcade.stats.typed > 0) saveArcadeSession(reason);
  }
  function arcadeReset(){
    finalizeArcadeSession("reset");
    arcadePause(false);
    arcade.targets.forEach(t => t.el.remove());
    arcade.targets = [];
    arcade.spawnTimer = 0;
    resetArcadeStats();
    updateArcadeStatsUI();
    arcade.hadActivity = false;
    arcade.state = "idle";
  }
  function arcadeGameOver(){
    arcadePause(false);
    arcade.overlayTitle.textContent = "Game Over";
    arcade.overlaySub.textContent = `Score ${arcade.stats.score} - press Start to try again`;
    arcade.overlay.classList.remove("hidden");
    finalizeArcadeSession("gameover");
  }

  function makeTargetText(){
    const type = arcade.targetType.value, filter = arcade.lessonFilter.value;
    let pool = ""; if (filter === "home" || filter === "top" || filter === "bottom") pool = LESSONS[filter];
    if (type === "letters"){
      const letters = (pool || (LESSONS.home + LESSONS.top + LESSONS.bottom));
      const biased = pool ? letters : (LESSONS.home + LESSONS.home + LESSONS.top + LESSONS.bottom);
      return choice(biased.split(""));
    } else {
      let list = Math.random() < 0.65 ? COMMON_WORDS_SHORT : COMMON_WORDS;
      if (filter !== "none"){
        const allowed = new Set(pool.split(""));
        const f = list.filter(w => [...w].every(ch => ch === " " || allowed.has(ch)));
        if (f.length) list = f;
      }
      return choice(list);
    }
  }
  function spawnTarget(){
    const p = arcadeParams(), text = makeTargetText();
    const el = document.createElement("div"); el.className="target"; el.innerHTML = renderTargetText(text, text);
    arcade.playfield.appendChild(el);
    const pf = arcade.playfield.getBoundingClientRect(), pad = 28;
    const t = { id:arcade.idSeq++, el, x: clamp(Math.random()*pf.width, pad, pf.width - pad), y:18,
                speed: p.baseSpeed + Math.random()*p.speedRand, textFull:text, pending:text };
    positionTarget(t); arcade.targets.push(t);
    if (arcade.showHints.checked){
      const next = nextArcadeHintChar();
      if (next) setKeyboardHint(arcade.kb, next);
    }
  }
  function renderTargetText(pending, full){
    const doneLen = full.length - pending.length;
    const done = full.slice(0, doneLen);
    return `<span class="done">${escapeHTML(done)}</span><span class="pending">${escapeHTML(pending)}</span>`;
  }
  function positionTarget(t){ t.el.style.left = `${t.x}px`; t.el.style.top = `${t.y}px`; }

  function enterLifePause(){
    // Stop the loop and show overlay
    arcadePause(false); // stop RAF without changing overlay text
    arcade.state = "life_pause";
    arcade.overlayTitle.textContent = "Life lost";
    arcade.overlaySub.textContent = "Field cleared. Press any key to continue";
    // Clear bottom half of the playfield and lift remaining targets
    clearBottomHalf();
    arcade.overlay.classList.remove("hidden");
  }

  function arcadeTick(){
    if (!arcade.running) return;

    const tNow = now();
    const dt = (tNow - arcade.lastTick) / 1000;
    arcade.lastTick = tNow;

    // advance timer UI
    arcade.stats.elapsed = (tNow - arcade.stats.startTime) / 1000;
    updateArcadeStatsUI();

    // spawn
    const p = arcadeParams();
    arcade.spawnTimer += dt * 1000;
    if (arcade.spawnTimer >= p.spawnEvery && arcade.targets.length < p.maxOnScreen){
      arcade.spawnTimer = 0;
      spawnTarget();
    }

    // move targets
    const pf = arcade.playfield.getBoundingClientRect();
    for (let i = arcade.targets.length - 1; i >= 0; i--){
      const t = arcade.targets[i];
      t.y += t.speed * dt;
      positionTarget(t);

      if (t.y > pf.height - 8){
        t.el.remove();
        arcade.targets.splice(i, 1);
        arcade.stats.lives--;
        updateArcadeStatsUI();

        if (arcade.stats.lives <= 0){
          arcadeGameOver();
          return;
        }

        // Life lost pause (clear bottom half and wait for key)
        enterLifePause();
        return; // stop ticking until resume
      }
    }

    // keep ticking
    arcade.raf = requestAnimationFrame(arcadeTick);
  }

  function clearBottomHalf(){
    const pf = arcade.playfield.getBoundingClientRect();
    const half = pf.height * 0.5;
    for (let i = arcade.targets.length - 1; i >= 0; i--){
      const t = arcade.targets[i];
      if (t.y >= half){
        t.el.remove();
        arcade.targets.splice(i,1);
      } else {
        // bring survivors back up a bit to avoid edge crowding
        t.y = Math.min(t.y, pf.height * 0.2);
        positionTarget(t);
      }
    }
  }

  function nextArcadeHintChar(){
    const c = arcade.targets.filter(t => t.pending.length > 0);
    if (!c.length) return "";
    c.sort((a,b)=>b.y-a.y);
    return c[0].pending[0] || "";
  }
  function handleArcadeKey(key){
    if (!arcade.running || !key) return;
    arcade.hadActivity = true;
    arcade.stats.typed++;
    const matches = arcade.targets.filter(t => t.pending.length && t.pending[0].toLowerCase() === key.toLowerCase());
    if (!matches.length){
      arcade.stats.wrong++;
      const exp = nextArcadeHintChar();
      const f = charToFinger(exp) || charToFinger(key) || "li";
      arcade.fp[f].typed++; arcade.fp[f].wrong++;
      flashKeyPress(arcade.kb, key); updateArcadeStatsUI(); return;
    }
    matches.sort((a,b)=>b.y-a.y);
    const t = matches[0];
    const expectedChar = t.pending[0];
    const f = charToFinger(expectedChar) || "li";
    arcade.fp[f].typed++;
    t.pending = t.pending.slice(1);
    flashKeyPress(arcade.kb, key);
    arcade.stats.correct++;
    t.el.innerHTML = renderTargetText(t.pending, t.textFull);
    if (!t.pending.length){
      const pts = Math.max(1, t.textFull.length);
      arcade.stats.score += pts;
      t.el.remove();
      const idx = arcade.targets.findIndex(x => x.id === t.id);
      if (idx>=0) arcade.targets.splice(idx,1);
    }
    if (arcade.showHints.checked){
      const next = nextArcadeHintChar();
      if (next) setKeyboardHint(arcade.kb, next); else clearKeyHints(arcade.kb);
    }
    updateArcadeStatsUI();
  }

  arcade.btnStart.addEventListener("click", () => {
    // Ready gate: show overlay and wait for any key to begin
    arcade.state = "ready";
    arcade.overlayTitle.textContent = "Get ready";
    arcade.overlaySub.textContent = "Press any key to begin";
    arcade.overlay.classList.remove("hidden");
  });
  arcade.btnPause.addEventListener("click", () => arcadePause(true));
  arcade.btnReset.addEventListener("click", () => arcadeReset());

  // Close button should behave like resume/begin
  arcade.overlayClose.addEventListener("click", () => {
    if (arcade.state === "ready") {
      arcade.overlay.classList.add("hidden");
      if (arcade.targets.length === 0 && arcade.stats.elapsed === 0) spawnTarget();
      arcadeStart();
      arcade.state = "running";
    } else if (arcade.state === "life_pause" || arcade.state === "paused") {
      arcade.overlay.classList.add("hidden");
      arcadeStart();
      arcade.state = "running";
    }
  });

  document.addEventListener("keydown", e => {
    if (!$("#arcade").classList.contains("active")) return;

    // If an overlay is up, use any key to either begin or resume
    if (!arcade.overlay.classList.contains("hidden")) {
      if (arcade.state === "ready") {
        // First real start
        arcade.overlay.classList.add("hidden");
        if (arcade.targets.length === 0 && arcade.stats.elapsed === 0) spawnTarget();
        arcadeStart();
        arcade.state = "running";
      } else if (arcade.state === "life_pause" || arcade.state === "paused") {
        // Resume after life loss or pause
        arcade.overlay.classList.add("hidden");
        arcadeStart();
        arcade.state = "running";
      }
      e.preventDefault();
      return;
    }

    // Normal running input
    const key = normalizeKey(e.key); if (!key) return;
    handleArcadeKey(key);
    e.preventDefault();
  });

  $("#arcade-hints").addEventListener("change", () => {
    if (!arcade.showHints.checked) clearKeyHints(arcade.kb);
    else { const next = nextArcadeHintChar(); if (next) setKeyboardHint(arcade.kb, next); }
  });
  $("#arcade-fingers").addEventListener("change", () => {
    $("#keyboard-arcade").classList.toggle("show-fingers", arcade.showFingers.checked);
  });
  resetArcadeStats();

  // -------------------------
  // DIRECTIONS MODE
  // -------------------------
  const DIR_MAP = {
    lp: [
      {dir:"base", ch:"a"},
      {dir:"up", ch:"q"},
      {dir:"down", ch:"z"},
      {dir:"up2", ch:"1"},
      {dir:"up2left", ch:"`"}
    ],
    lr: [
      {dir:"base", ch:"s"},
      {dir:"up", ch:"w"},
      {dir:"down", ch:"x"},
      {dir:"up2", ch:"2"}
    ],
    lm: [
      {dir:"base", ch:"d"},
      {dir:"up", ch:"e"},
      {dir:"down", ch:"c"},
      {dir:"up2", ch:"3"}
    ],
    li: [
      {dir:"base", ch:"f"},
      {dir:"right", ch:"g"},
      {dir:"upleft", ch:"r"},
      {dir:"upright", ch:"t"},
      {dir:"downleft", ch:"v"},
      {dir:"downright", ch:"b"},
      {dir:"up2left", ch:"4"},
      {dir:"up2right", ch:"5"}
    ],
    ri: [
      {dir:"base", ch:"j"},
      {dir:"left", ch:"h"},
      {dir:"upleft", ch:"y"},
      {dir:"upright", ch:"u"},
      {dir:"downleft", ch:"n"},
      {dir:"downright", ch:"m"},
      {dir:"up2left", ch:"6"},
      {dir:"up2right", ch:"7"}
    ],
    rm: [
      {dir:"base", ch:"k"},
      {dir:"up", ch:"i"},
      {dir:"down", ch:","},
      {dir:"up2", ch:"8"}
    ],
    rr: [
      {dir:"base", ch:"l"},
      {dir:"up", ch:"o"},
      {dir:"down", ch:"."},
      {dir:"up2", ch:"9"}
    ],
    rp: [
      {dir:"base", ch:";"},
      {dir:"right", ch:"'"},
      {dir:"up", ch:"p"},
      {dir:"upright", ch:"["},
      {dir:"up2", ch:"0"},
      {dir:"up2right", ch:"-"},
      {dir:"upright", ch:"]"},
      {dir:"downright", ch:"/"}
    ],
    th: [
      {dir:"base", ch:" "}
    ]
  };

  const directions = {
    fingerSel: $("#dir-finger"),
    includeSymbols: $("#dir-include-symbols"),
    showLetter: $("#dir-show-letter"),
    showFingers: $("#dir-fingers"),
    lenRange: $("#dir-length"),
    lenLabel: $("#dir-length-label"),
    btnNew: $("#dir-new"),
    btnReset: $("#dir-reset"),
    tokensEl: $("#dir-tokens"),
    hiddenInput: $("#hidden-input-dir"),
    kb: $("#keyboard-directions"),

    stats: { startTime:0, elapsed:0, typed:0, correct:0, wrong:0, streak:0 },
    fp: null,
    queue: [],
    index: 0,
    completed:false,
    started: false,
    tickHandle: null
  };

  function makeDirPool(finger, includeSymbols) {
    const pool = DIR_MAP[finger] || [];
    if (includeSymbols) return pool.slice();
    return pool.filter(item => /[a-z ]/.test(item.ch));
  }
  function genDirectionsSequence(finger, count, includeSymbols) {
    const pool = makeDirPool(finger, includeSymbols);
    const seq = [];
    for (let i = 0; i < count; i++) seq.push(choice(pool));
    return seq;
  }
  function dirTokenHTML(item, idx, currentIdx, showLetter, fingerCode) {
    const code = DIR_SYMBOL[item.dir] || "?";
    const tag = DIR_NAMES[fingerCode] || "FG";
    const letter = showLetter ? `<span class="letter">${escapeHTML(item.ch === " " ? "space" : item.ch)}</span>` : "";
    const cls = idx < currentIdx ? "dir-token done" : (idx === currentIdx ? "dir-token next" : "dir-token");
    return `<span class="${cls}"><span class="chip">${tag}</span>${code}${letter}</span>`;
  }
  function renderDirTokens() {
    const finger = directions.fingerSel.value;
    const showL = directions.showLetter.checked;
    const html = directions.queue.map((it, i) => dirTokenHTML(it, i, directions.index, showL, finger)).join(" ");
    directions.tokensEl.innerHTML = html;
  }
  function setDirHintToCurrent() {
    const cur = directions.queue[directions.index];
    if (cur) setKeyboardHint(directions.kb, cur.ch);
    else clearKeyHints(directions.kb);
  }
  function resetDirStats() {
    directions.stats = { startTime:0, elapsed:0, typed:0, correct:0, wrong:0, streak:0 };
    updateDirStatsUI();
  }
  function startDirTick() {
    if (directions.tickHandle) cancelAnimationFrame(directions.tickHandle);
    const start = now();
    function tick() {
      directions.stats.elapsed = (now() - (directions.stats.startTime || start)) / 1000;
      updateDirStatsUI();
      directions.tickHandle = requestAnimationFrame(tick);
    }
    directions.stats.startTime = start;
    directions.tickHandle = requestAnimationFrame(tick);
  }
  function stopDirTick() {
    if (directions.tickHandle) cancelAnimationFrame(directions.tickHandle);
    directions.tickHandle = null;
  }
  function updateDirStatsUI() {
    const m = Math.max(1/60, directions.stats.elapsed / 60);
    const wpm = Math.round((directions.stats.correct / 5) / m);
    $("#dir-wpm").textContent = isFinite(wpm) ? wpm : 0;
    const total = Math.max(1, directions.stats.typed);
    const acc = Math.round((directions.stats.correct / total) * 100);
    $("#dir-acc").textContent = `${clamp(acc,0,100)}%`;
    $("#dir-streak").textContent = directions.stats.streak;
    $("#dir-time").textContent = `${Math.floor(directions.stats.elapsed)}s`;
  }
  function focusHiddenInputDir(){ directions.hiddenInput.focus(); }

  directions.lenRange.addEventListener("input", () => { $("#dir-length-label").textContent = directions.lenRange.value; });
  directions.btnNew.addEventListener("click", () => {
    if (!directions.completed && directions.stats.typed > 0) saveDirectionsSession("abandon");
    const count = parseInt(directions.lenRange.value, 10);
    const finger = directions.fingerSel.value;
    directions.queue = genDirectionsSequence(finger, count, directions.includeSymbols.checked);
    directions.index = 0;
    directions.completed = false;
    directions.fp = emptyFingerCounters();
    resetDirStats();
    directions.started = false; // wait for first key
    renderDirTokens();
    focusHiddenInputDir();
    setDirHintToCurrent();
  });
  directions.btnReset.addEventListener("click", () => { resetDirStats(); renderDirTokens(); });
  $("#dir-show-letter").addEventListener("change", renderDirTokens);
  $("#dir-fingers").addEventListener("change", () => { $("#keyboard-directions").classList.toggle("show-fingers", directions.showFingers.checked); });
  directions.tokensEl.addEventListener("click", focusHiddenInputDir);
  document.addEventListener("keydown", e => {
    if (!$("#directions").classList.contains("active")) return;
    if (e.key === "Enter" && document.activeElement !== directions.hiddenInput) { e.preventDefault(); focusHiddenInputDir(); }
  });

  directions.hiddenInput.addEventListener("keydown", e => {
    if (!directions.queue.length) return;
    const key = normalizeKey(e.key); if (!key) return;

    // Start timer on first typed key of this set
    if (!directions.started) {
      directions.started = true;
      startDirTick();
    }

    const cur = directions.queue[directions.index];
    const expectedFinger = directions.fingerSel.value;
    directions.fp[expectedFinger].typed++;
    directions.stats.typed++;

    const good = compareKey(cur.ch, key);
    flashKeyPress(directions.kb, key);
    if (good) {
      directions.stats.correct++; directions.stats.streak++; directions.index++;
      renderDirTokens();
      if (directions.index >= directions.queue.length) { directions.completed = true; stopDirTick(); saveDirectionsSession("complete"); }
      setDirHintToCurrent();
    } else {
      directions.fp[expectedFinger].wrong++;
      directions.stats.wrong++; directions.stats.streak = 0;
      renderDirTokens();
    }
    updateDirStatsUI();
    e.preventDefault();
  });

  // Initialize defaults for practice/directions
  $("#dir-length-label").textContent = directions.lenRange.value;
  $("#keyboard-practice").classList.add("show-fingers");
  $("#keyboard-arcade").classList.add("show-fingers");
  $("#keyboard-directions").classList.add("show-fingers");
  practice.btnNew.click(); // bootstrap first drill

  // -------------------------
  // DATA STORE (profiles & stats)
  // -------------------------
  const STORE_KEY = "typequest.v1.profiles";

  function loadStore(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { profile:"Default", profiles: { "Default": { sessions:[], created: ts() } } };
      const parsed = JSON.parse(raw);
      if (!parsed.profile || !parsed.profiles) throw new Error("bad");
      return parsed;
    } catch {
      return { profile:"Default", profiles: { "Default": { sessions:[], created: ts() } } };
    }
  }
  function saveStore(){ localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); }
  function currentProfile(){ const p = STORE.profile; if (!STORE.profiles[p]) STORE.profiles[p] = { sessions:[], created: ts() }; return STORE.profiles[p]; }
  function setProfile(name){
    const n = (name || "Default").trim() || "Default";
    STORE.profile = n;
    if (!STORE.profiles[n]) STORE.profiles[n] = { sessions:[], created: ts() };
    saveStore(); syncProfileUI();
    renderStats();
  }

  let STORE = loadStore();

  // Session builders
  function baseSession(mode, extra, metrics, fpCounters){
    const totalTyped = metrics.typed || 0;
    const totalCorrect = metrics.correct || 0;
    const totalWrong = metrics.wrong || 0;
    const duration = metrics.elapsed || 0;
    const wpm = duration > 0 ? Math.round((totalCorrect/5) / (duration/60)) : 0;
    const acc = totalTyped > 0 ? Math.round((totalCorrect/totalTyped)*100) : 0;
    return {
      id: `s_${ts()}_${Math.random().toString(36).slice(2,7)}`,
      at: ts(),
      mode,
      info: extra,              // lesson/filter/finger etc
      typed: totalTyped,
      correct: totalCorrect,
      wrong: totalWrong,
      acc,
      wpm,
      seconds: Math.round(duration),
      fingers: fpCounters || emptyFingerCounters()
    };
  }

  function savePracticeSession(reason){
    const s = baseSession("practice", { lesson: practice.lessonSel.value, reason }, practice.stats, practice.fp);
    currentProfile().sessions.push(s); saveStore(); renderStats();
  }
  function saveDirectionsSession(reason){
    const s = baseSession("directions", { finger: directions.fingerSel.value, includeSymbols: directions.includeSymbols.checked, reason }, directions.stats, directions.fp);
    currentProfile().sessions.push(s); saveStore(); renderStats();
  }
  function saveArcadeSession(reason){
    const s = baseSession("arcade", { difficulty: arcade.difficulty.value, type: arcade.targetType.value, filter: arcade.lessonFilter.value, score: arcade.stats.score, reason }, arcade.stats, arcade.fp);
    currentProfile().sessions.push(s); saveStore(); renderStats();
  }

  // -------------------------
  // STATS TAB (analytics)
  // -------------------------
  const elProfileName = $("#profile-name");
  const btnProfileSave = $("#profile-save");
  const btnExport = $("#export-data");
  const btnImport = $("#import-data");
  const fileImport = $("#import-file");
  const btnResetData = $("#reset-data");
  const elKpiTime = $("#kpi-time");
  const elKpiChars = $("#kpi-chars");
  const elKpiBestWpm = $("#kpi-best-wpm");
  const elKpiAvgAcc = $("#kpi-avg-acc");
  const elFingerStats = $("#finger-stats");
  const elRecent = $("#recent-sessions");
  const elRecoText = $("#recommendation-text");
  const btnStartReco = $("#start-recommended");

  // Make recent table use same styling as finger table
  if (elRecent) elRecent.classList.add("finger-table");

  function syncProfileUI(){ if (elProfileName) elProfileName.value = STORE.profile; }
  syncProfileUI();

  btnProfileSave?.addEventListener("click", () => setProfile(elProfileName.value));

  btnExport?.addEventListener("click", () => {
    const data = JSON.stringify(STORE, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0,10);
    a.href = URL.createObjectURL(blob);
    a.download = `typequest_export_${date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  btnImport?.addEventListener("click", () => fileImport.click());
  fileImport?.addEventListener("change", ev => {
    const file = ev.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (json.profile && json.profiles) {
          STORE = json; saveStore(); syncProfileUI(); renderStats();
        } else if (Array.isArray(json.sessions)) {
          // Merge into current profile
          const prof = currentProfile();
          prof.sessions = prof.sessions.concat(json.sessions);
          saveStore(); renderStats();
        } else {
          alert("Unrecognized JSON structure.");
        }
      } catch(e){ alert("Failed to import: " + e.message); }
      fileImport.value = "";
    };
    reader.readAsText(file);
  });

  btnResetData?.addEventListener("click", () => {
    if (!confirm("Reset ALL data for this profile? This cannot be undone.")) return;
    currentProfile().sessions = [];
    saveStore(); renderStats();
  });

  let recommendedAction = null;
  btnStartReco?.addEventListener("click", () => { if (recommendedAction) recommendedAction(); });

  function aggregateStats() {
    const sessions = currentProfile().sessions.slice().sort((a,b)=>a.at-b.at);
    const totalSeconds = sessions.reduce((s,x)=>s + (x.seconds||0),0);
    const totalTyped = sessions.reduce((s,x)=>s + (x.typed||0),0);
    const bestWpm = sessions.reduce((m,x)=>Math.max(m, x.wpm||0), 0);
    // Weighted average accuracy by typed count
    const accNum = sessions.reduce((s,x)=>s + (x.correct||0),0);
    const accDen = sessions.reduce((s,x)=>s + (x.typed||0),0);
    const avgAcc = accDen>0 ? (accNum/accDen)*100 : 0;

    // Finger aggregates
    const fAgg = emptyFingerCounters();
    for (const s of sessions) {
      if (!s.fingers) continue;
      for (const id of Object.keys(s.fingers)) {
        fAgg[id].typed += s.fingers[id].typed||0;
        fAgg[id].wrong += s.fingers[id].wrong||0;
      }
    }
    return { sessions, totalSeconds, totalTyped, bestWpm, avgAcc, fAgg };
  }

  function renderStats() {
    const { sessions, totalSeconds, totalTyped, bestWpm, avgAcc, fAgg } = aggregateStats();
    // KPIs
    elKpiTime.textContent = fmtMin(totalSeconds);
    elKpiChars.textContent = fmtInt(totalTyped);
    elKpiBestWpm.textContent = fmtInt(bestWpm);
    elKpiAvgAcc.textContent = fmtPct(avgAcc);

    // Finger table
    let fRows = `<table><thead>
      <tr><th>Finger</th><th>Typed</th><th>Errors</th><th>Accuracy</th></tr>
    </thead><tbody>`;
    let weakest = null; // {id, acc, typed}
    for (const id of FINGER_IDS) {
      const t = fAgg[id].typed || 0;
      const w = fAgg[id].wrong || 0;
      const acc = t>0 ? 100*(1 - (w/t)) : 100;
      if (t >= 30) {
        if (!weakest || acc < weakest.acc) weakest = { id, acc, typed:t };
      }
      fRows += `<tr>
        <td><span class="finger-chip"><span class="finger-dot dot-${id}"></span>${FINGER_NAMES[id]||id.toUpperCase()}</span></td>
        <td>${fmtInt(t)}</td>
        <td>${fmtInt(w)}</td>
        <td style="min-width:180px">
          <div class="progress"><span class="bar-acc" style="width:${clamp(Math.round(acc),0,100)}%"></span></div>
          <span class="badge">${fmtPct(acc)}</span>
        </td>
      </tr>`;
    }
    fRows += "</tbody></table>";
    elFingerStats.innerHTML = fRows;

    // Recent sessions
    const recent = sessions.slice(-12).reverse();
    let rRows = `<table><thead>
      <tr><th>Date</th><th>Mode</th><th>Details</th><th>WPM</th><th>Acc</th><th>Time</th><th>Chars</th></tr>
    </thead><tbody>`;
    for (const s of recent) {
      const date = new Date(s.at).toLocaleString();
      let details = "";
      if (s.mode === "practice") details = `Lesson: ${s.info?.lesson}`;
      else if (s.mode === "directions") details = `Finger: ${s.info?.finger?.toUpperCase()}${s.info?.includeSymbols ? " (+symbols)" : ""}`;
      else if (s.mode === "arcade") details = `Diff: ${s.info?.difficulty}, ${s.info?.type}${s.info?.filter && s.info.filter!=="none" ? ", filter:"+s.info.filter : ""}, Score: ${s.info?.score}`;
      rRows += `<tr>
        <td>${escapeHTML(date)}</td>
        <td>${escapeHTML(s.mode)}</td>
        <td>${escapeHTML(details)}</td>
        <td>${fmtInt(s.wpm)}</td>
        <td>${fmtPct(s.acc)}</td>
        <td>${fmtSec(s.seconds)}</td>
        <td>${fmtInt(s.typed)}</td>
      </tr>`;
    }
    rRows += "</tbody></table>";
    elRecent.innerHTML = rRows;

    // Recommendation
    if (!sessions.length) {
      elRecoText.textContent = "Run a few drills and games so I can analyze your strengths and weaknesses.";
      recommendedAction = () => {
        goToTab("practice");
        $("#practice-lesson").value = "home";
        practice.btnNew.click();
      };
    } else if (weakest) {
      const name = FINGER_NAMES[weakest.id] || weakest.id.toUpperCase();
      elRecoText.textContent = `Weakest: ${name} • accuracy ${fmtPct(weakest.acc)} over ${weakest.typed} chars. Recommended: Directions (${DIR_NAMES[weakest.id]}) for focused muscle memory.`;
      recommendedAction = () => {
        goToTab("directions");
        $("#dir-finger").value = weakest.id;
        $("#dir-include-symbols").checked = true;
        directions.btnNew.click();
      };
    } else {
      elRecoText.textContent = "Great balance across fingers. Try Arcade (Normal, Letters) to build speed, or a Top/Bottom row practice to refine accuracy.";
      recommendedAction = () => { goToTab("arcade"); };
    }
  }

  // Render stats on initial load (after building UI)
  renderStats();

  // No duplicate helpers block; keep escapeHTML defined once above.

})();
