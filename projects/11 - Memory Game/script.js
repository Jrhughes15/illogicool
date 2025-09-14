/* 11 - Memory Game (layout + spacing + submit fix)
   - Scores right up to settings box
   - Display is truly one-line tall by default
   - Progress snug under display
   - Start/Ready centered & not too tall
   - Input stack closer to progress; Submit/Stop match keypad width
   - Submit works reliably
   - After losing, Start button label changes to "New Game"
*/

(() => {
  const $ = (sel) => document.querySelector(sel);

  // Display & progress
  const display = $("#display");
  const currentStreakEl = $("#currentStreak");
  const bestStreakEl = $("#bestStreak");
  const goalTargetEl = $("#goalTarget");
  const goalProgress = $("#goalProgress");
  const goalBar = $("#goalBar");
  const stepHint = $("#stepHint");

  // Interaction containers
  const controls = $("#controls");
  const answerForm = $("#answerForm");

  // Controls
  const btnStart = $("#btnStart");
  const readyBadge = $("#readyBadge");

  // Answer elements
  const input = $("#answerInput");
  const btnSubmit = $("#btnSubmit");
  const btnStop = $("#btnStop");
  const pad = document.querySelectorAll(".pad-key");

  // Settings
  const modeSelect = $("#modeSelect");
  const beatSelect = $("#beatSelect");
  const goalInput = $("#goalInput");
  const btnApply = $("#btnApply");

  // Persistent store
  const store = {
    get best(){ return Number(localStorage.getItem("eleven_best") || "0"); },
    set best(v){ localStorage.setItem("eleven_best", String(v)); },

    get mode(){ return localStorage.getItem("eleven_mode") || "normal"; },
    set mode(v){ localStorage.setItem("eleven_mode", v); },

    get beat(){ return Number(localStorage.getItem("eleven_beat") || "700"); },
    set beat(v){ localStorage.setItem("eleven_beat", String(v)); },

    get goal(){ return Number(localStorage.getItem("eleven_goal") || "11"); },
    set goal(v){ localStorage.setItem("eleven_goal", String(v)); },
  };

  // Game state
  let sequence = [];
  let showing = false;
  let accepting = false;
  let streak = 0;

  // Settings live
  let mode = store.mode; // "normal" | "speed"
  let beat = store.beat; // ms per digit
  let goal = store.goal;

  // OK resolver
  let okResolver = null;
  function armOK(){ return new Promise((resolve)=>{ okResolver = resolve; }); }
  function triggerOK(){ if (okResolver){ okResolver({ok:true}); okResolver = null; } }

  // Init UI
  bestStreakEl.textContent = store.best;
  modeSelect.value = mode;
  beatSelect.value = String(beat);
  goalInput.value = String(goal);
  goalTargetEl.textContent = String(goal);
  updateProgress();
  toIdleLayout();

  // ---- Layout states ----
  function toIdleLayout(){
    controls.classList.remove("hidden");
    answerForm.classList.add("hidden");
    btnStart.classList.remove("hidden");
    readyBadge.classList.add("hidden");
    input.disabled = true;
    btnSubmit.disabled = true;
    accepting = false;
  }

  function toShowingLayout(){
    controls.classList.remove("hidden");
    answerForm.classList.add("hidden");
    btnStart.classList.add("hidden");
    readyBadge.classList.remove("hidden");
    input.disabled = true;
    btnSubmit.disabled = true;
    accepting = false;
  }

  function toAnswerLayout(){
    controls.classList.add("hidden");
    answerForm.classList.remove("hidden");
    input.disabled = false;
    btnSubmit.disabled = input.value.length === 0;
    input.focus();
    accepting = true; // enables submit
  }

  function updateProgress(){
    const val = Math.min(streak, goal);
    const pct = goal > 0 ? (val / goal) * 100 : 0;
    goalBar.style.width = `${pct}%`;
    goalProgress.setAttribute("aria-valuenow", String(val));
    if (stepHint) stepHint.textContent = `${val} of ${goal}`;
    currentStreakEl.textContent = String(streak);
  }

  function randDigit(){ return Math.floor(Math.random() * 10); }
  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  // ---- Core flow ----
  async function showSequenceTyped(){
    showing = true;
    toShowingLayout();
    input.value = "";
    display.classList.remove("flash");

    const okPromise = armOK();

    let buffer = "";
    display.textContent = "";

    for (let i = 0; i < sequence.length; i++){
      buffer += String(sequence[i]);
      display.textContent = buffer;
      display.classList.add("flash");
      await wait(110);
      display.classList.remove("flash");

      const result = await Promise.race([wait(beat), okPromise]);
      if (result && result.ok){
        display.textContent = " ";
        showing = false;
        toAnswerLayout();
        return;
      }
    }

    // Full sequence typed
    if (mode === "speed"){
      await Promise.race([wait(Math.max(180, Math.round(beat * 0.6))), okPromise]);
      display.textContent = " ";
      showing = false;
      toAnswerLayout();
    } else {
      await okPromise;
      display.textContent = " ";
      showing = false;
      toAnswerLayout();
    }
  }

  function startGame(){
    // Reset the label back to "Start" on a fresh run (optional)
    btnStart.textContent = "Start";
    sequence = [randDigit()];
    streak = 0;
    updateProgress();
    display.textContent = "Watch";
    showSequenceTyped();
  }

  function stopGame(reason = "Stopped"){
    showing = false;
    accepting = false;
    toIdleLayout();
    // If the user stopped manually, keep the label as "Start"
    btnStart.textContent = "Start";
    display.textContent = reason;
  }

  function nextRound(){
    streak++;
    if (streak > store.best){
      store.best = streak;
      bestStreakEl.textContent = String(store.best);
    }
    updateProgress();
    sequence.push(randDigit());
    display.textContent = "Watch";
    showSequenceTyped();
  }

  function checkAnswer(){
    const guess = input.value.trim();
    if (guess.length === 0) return;
    const correct = sequence.join("");
    if (guess === correct){
      display.textContent = "Correct";
      toShowingLayout(); accepting = false;
      setTimeout(nextRound, 320);
    } else {
      // Show both correct and entered values
      display.textContent = `Wrong. It was ${correct}. You entered ${guess}.`;
      toIdleLayout(); accepting = false;
      // After losing, show "New Game" on the main button
      btnStart.textContent = "New Game";
    }
  }

  // ---- Events ----
  btnStart.addEventListener("click", startGame);
  readyBadge.addEventListener("click", triggerOK);
  display.addEventListener("click", () => { if (showing) triggerOK(); });

  // Keypad (on-screen) input remains the same
  pad.forEach(btn => {
    btn.addEventListener("click", () => {
      if (answerForm.classList.contains("hidden")) return;
      const key = btn.dataset.key;
      const action = btn.dataset.action;
      if (key){
        input.value += key;
      } else if (action === "backspace"){
        input.value = input.value.slice(0, -1);
      } else if (action === "clear"){
        input.value = "";
      }
      btnSubmit.disabled = input.value.length === 0;
    });
  });

  // Native typing: keep only the sanitizer; don't duplicate digits
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D+/g, "");
    btnSubmit.disabled = input.value.length === 0;
  });

  // Submit / Stop
  answerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!accepting) return;
    checkAnswer();
  });
  btnStop.addEventListener("click", () => stopGame("Stopped"));

  // Keyboard helpers: handle only Enter/Escape/Ready; DO NOT append digits here
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      if (!answerForm.classList.contains("hidden")){
        checkAnswer();
      } else if (!showing && !btnStart.classList.contains("hidden")){
        startGame();
      } else if (showing){
        triggerOK();
      }
    }
    if (e.key === "Escape"){
      stopGame("Stopped");
    }
    // Removed numeric key handling to prevent double-entry
  });

  // Settings apply
  btnApply.addEventListener("click", () => {
    const newMode = modeSelect.value === "speed" ? "speed" : "normal";
    const newBeat = clamp(Number(beatSelect.value), 200, 3000);
    const newGoal = clamp(Number(goalInput.value), 3, 99);

    mode = newMode; beat = newBeat; goal = newGoal;
    store.mode = mode; store.beat = beat; store.goal = goal;

    goalTargetEl.textContent = String(goal);
    updateProgress();
    display.textContent = "Settings updated";
  });
})();
