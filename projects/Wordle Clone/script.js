/* POOR-DLE - inline help; fixes:
   - No modal; Help section below the board
   - Prevent double letters when typing in the input
   - Use your tipsTemplate/wordList even when defined as top-level const (not on window)
   - Validate guesses against a normalized dictionary
   - Proper duplicate-letter scoring + on-screen keyboard
*/

(() => {
  const ROWS = 6;
  const COLS = 5;

  // Pull data from your files (support both global bindings and window.*)
  const WORDS =
    (typeof wordList !== "undefined" && Array.isArray(wordList)) ? wordList :
    (typeof window !== "undefined" && Array.isArray(window.wordList)) ? window.wordList : [];

  const TIPS =
    (typeof tipsTemplate !== "undefined" && tipsTemplate) ? tipsTemplate :
    (typeof window !== "undefined" && window.tipsTemplate) ? window.tipsTemplate : {};

  // Normalized dictionary (lowercase, exactly 5 letters a–z)
  const DICT = new Set(WORDS
    .filter(w => typeof w === "string")
    .map(w => w.trim().toLowerCase())
    .filter(w => /^[a-z]{5}$/.test(w)));

  // DOM
  const boardEl = document.getElementById("board");
  const inputEl = document.getElementById("guessInput");
  const guessBtn = document.getElementById("guessBtn");
  const newGameBtn = document.getElementById("newGameBtn");
  const helpBtn = document.getElementById("helpBtn");
  const helpBox = document.getElementById("helpBox");
  const tipList = document.getElementById("tipList");
  const statusBar = document.getElementById("statusBar");
  const kbRows = [...document.querySelectorAll(".kb-row")];

  // Keyboard layout
  const KB_ROWS = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "⌫"]
  ];

  // State
  let answer = "";
  let rowIndex = 0;
  let colIndex = 0;
  let grid = [];
  let locked = false;

  // Build UI
  createBoard();
  createKeyboard();
  startNewGame();

  // Events
  newGameBtn.onclick = startNewGame;
  helpBtn.onclick = () => {
    const isHidden = helpBox.hasAttribute("hidden");
    if (isHidden) {
      renderHelpTips(answer);
      helpBox.removeAttribute("hidden");
      helpBtn.setAttribute("aria-expanded", "true");
      helpBox.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      helpBox.setAttribute("hidden", "");
      helpBtn.setAttribute("aria-expanded", "false");
    }
  };
  guessBtn.onclick = submitGuess;

  // Handle typing in the input (letters go via input, Enter submits)
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitGuess(); }
  });
  inputEl.addEventListener("input", syncInputToBoard);

  // On-screen keyboard
  kbRows.forEach(row => {
    row.addEventListener("click", (e) => {
      if (locked) return;
      const keyEl = e.target.closest(".key");
      if (!keyEl) return;
      const label = keyEl.dataset.key;
      if (label === "ENTER") { submitGuess(); return; }
      if (label === "⌫") { backspace(); return; }
      if (/^[A-Z]$/.test(label)) typeLetter(label);
    });
  });

  // Global keys (ignore when the input is focused to prevent double-typing)
  window.addEventListener("keydown", (e) => {
    if (locked) return;
    const active = document.activeElement;
    if (active === inputEl) return; // <-- fix double letters

    if (e.key === "Enter") { submitGuess(); return; }
    if (e.key === "Backspace") { backspace(); return; }
    const ch = e.key.toUpperCase();
    if (/^[A-Z]$/.test(ch)) typeLetter(ch);
  });

  /* ---------- Game ---------- */

  function startNewGame() {
    locked = false;
    rowIndex = 0;
    colIndex = 0;
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));

    answer = pickAnswer();
    drawBoard();
    updateStatus("New game. Good luck.");
    inputEl.value = "";
    updateKeyboardHints({});

    if (!helpBox.hasAttribute("hidden")) renderHelpTips(answer);
    focusInputSoon();
  }

  function pickAnswer() {
    // Choose any valid 5-letter word from DICT
    const all = Array.from(DICT);
    if (all.length === 0) return "ERROR";
    return all[Math.floor(Math.random() * all.length)].toUpperCase();
  }

  function createBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement("div");
      row.className = "row";
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.setAttribute("data-r", r);
        cell.setAttribute("data-c", c);
        row.appendChild(cell);
      }
      boardEl.appendChild(row);
    }
  }

  function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = getCell(r, c);
        const ch = grid[r][c];
        cell.textContent = ch;
        cell.classList.toggle("filled", ch !== "");
        cell.classList.remove("reveal", "correct", "present", "absent");
      }
    }
  }

  function createKeyboard() {
    kbRows.forEach((rowEl, i) => {
      rowEl.innerHTML = "";
      KB_ROWS[i].forEach(key => {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.dataset.key = key;
        btn.textContent = key;
        if (key === "ENTER" || key === "⌫") btn.classList.add("wide");
        rowEl.appendChild(btn);
      });
    });
  }

  function focusInputSoon() { setTimeout(() => inputEl.focus(), 50); }
  function getCell(r, c) { return boardEl.children[r].children[c]; }

  function typeLetter(ch) {
    if (colIndex >= COLS || rowIndex >= ROWS) return;
    grid[rowIndex][colIndex] = ch;
    colIndex++;
    updateRowVisual(rowIndex);
    syncBoardToInput();
  }

  function backspace() {
    if (colIndex > 0) {
      colIndex--;
      grid[rowIndex][colIndex] = "";
      updateRowVisual(rowIndex);
      syncBoardToInput();
    }
  }

  function syncInputToBoard() {
    // Only letters, uppercase, max 5
    const raw = inputEl.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, COLS);
    inputEl.value = raw;
    for (let c = 0; c < COLS; c++) grid[rowIndex][c] = raw[c] || "";
    colIndex = raw.length;
    updateRowVisual(rowIndex);
  }

  function syncBoardToInput() {
    inputEl.value = grid[rowIndex].join("");
  }

  function updateRowVisual(r) {
    for (let c = 0; c < COLS; c++) {
      const cell = getCell(r, c);
      const ch = grid[r][c];
      cell.textContent = ch;
      cell.classList.toggle("filled", !!ch);
    }
  }

  function submitGuess() {
    if (locked) return;
    const guess = grid[rowIndex].join("");
    if (guess.length < COLS) { updateStatus("Need 5 letters."); return; }

    const g = guess.toLowerCase();
    if (!DICT.has(g)) {
      updateStatus("Not in list.");
      shakeRow(rowIndex);
      return;
    }

    const result = scoreGuess(guess, answer);
    revealRow(rowIndex, result);

    // keyboard hints
    const best = {};
    for (let i = 0; i < COLS; i++) {
      const ch = guess[i];
      const state = result[i];
      const rank = state === "correct" ? 3 : state === "present" ? 2 : 1;
      best[ch] = Math.max(best[ch] || 0, rank);
    }
    updateKeyboardHints(best);

    if (guess === answer) {
      locked = true;
      updateStatus("You win.");
      return;
    }
    rowIndex++;
    colIndex = 0;
    inputEl.value = "";
    if (rowIndex >= ROWS) {
      locked = true;
      updateStatus(`Out of tries. Word was ${answer}.`);
    } else {
      updateStatus("Keep going.");
    }
  }

  // Two pass scoring for duplicate letters
  function scoreGuess(guess, ans) {
    const res = Array(COLS).fill("absent");
    const counts = {};
    for (let i = 0; i < COLS; i++) {
      const a = ans[i];
      counts[a] = (counts[a] || 0) + 1;
    }
    // First pass: exact matches
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === ans[i]) {
        res[i] = "correct";
        counts[guess[i]]--;
      }
    }
    // Second pass: present letters
    for (let i = 0; i < COLS; i++) {
      if (res[i] !== "correct") {
        const g = guess[i];
        if ((counts[g] || 0) > 0) {
          res[i] = "present";
          counts[g]--;
        }
      }
    }
    return res;
  }

  function revealRow(r, states) {
    for (let c = 0; c < COLS; c++) {
      const cell = getCell(r, c);
      cell.classList.add("reveal");
      cell.classList.remove("correct", "present", "absent");
      cell.classList.add(states[c]);
    }
  }

  function updateKeyboardHints(best) {
    const rankToClass = {1:"absent",2:"present",3:"correct"};
    kbRows.forEach(row => {
      [...row.children].forEach(btn => {
        const k = btn.dataset.key;
        if (!/^[A-Z]$/.test(k)) return;
        btn.classList.remove("correct","present","absent");
        if (best[k]) btn.classList.add(rankToClass[best[k]]);
      });
    });
  }

  function shakeRow(r) {
    const rowEl = boardEl.children[r];
    rowEl.animate(
      [{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],
      {duration:180, iterations:2}
    );
  }

  function updateStatus(msg) { statusBar.textContent = msg; }

  /* ---------- Tips ---------- */

  // Build one tip per letter of the answer
  function renderHelpTips(ans) {
    tipList.innerHTML = "";
    const letters = ans.toUpperCase().split("");
    letters.forEach((L, i) => {
      const bank = Array.isArray(TIPS[L]) ? TIPS[L] : [];
      const tip = bank.length ? bank[ hash(ans + i) % bank.length ] : (L + "...");
      const li = document.createElement("li");
      li.textContent = tip;
      tipList.appendChild(li);
    });
  }

  // Small hash for deterministic picks
  function hash(s){
    let h = 2166136261 >>> 0;
    for (let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }
})();
