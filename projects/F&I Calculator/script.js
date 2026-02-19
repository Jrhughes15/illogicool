// script.js
// Feet & Inches Calculator with:
// - keypad + typing
// - auto-commit Entry on operator / Evaluate
// - implied feet for bare integers (e.g., "4" => 4')
// - implied inches quote after feet (e.g., "4'10" => 4'10")
// - force-number suffix "#" (e.g., "8#" => number 8)
// - parentheses, + - * /
// - controls: Clear Entry, Back Entry, Back Token, Clear Equation, Negate Next
// - Help modal (opens from Help button, closes via Close, outside click, Esc)

(() => {
  const tokens = [];
  let negateNext = false;

  const eqEl = document.getElementById("equationText");
  const resEl = document.getElementById("resultText");
  const lastEl = document.getElementById("lastToken");
  const errEl = document.getElementById("errorText");
  const entryEl = document.getElementById("entryInput");

  const insertLengthBtn = document.getElementById("insertLengthBtn");
  const insertNumberBtn = document.getElementById("insertNumberBtn");
  const clearEntryBtn = document.getElementById("clearEntryBtn");
  const entryBackBtn = document.getElementById("entryBackBtn");

  const negateNextBtn = document.getElementById("negateNextBtn");
  const eqBackBtn = document.getElementById("eqBackBtn");
  const eqClearBtn = document.getElementById("eqClearBtn");
  const equalsBtn = document.getElementById("equalsBtn");

  const keypad = document.getElementById("keypad");

  // Modal
  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const helpCloseBtn = document.getElementById("helpCloseBtn");

  function setLast(msg) {
    if (lastEl) lastEl.textContent = msg;
  }
  function clearError() {
    if (errEl) errEl.textContent = "";
  }
  function setError(msg) {
    if (errEl) errEl.textContent = msg;
  }

  function fmtLengthFromInches(totalInches) {
    const rounded = Math.round(totalInches);
    const sign = rounded < 0 ? "-" : "";
    const abs = Math.abs(rounded);
    const ft = Math.floor(abs / 12);
    const inch = abs % 12;
    return inch === 0 ? `${sign}${ft}'` : `${sign}${ft}'${inch}"`;
  }

  function tokenToString(tok) {
    if (typeof tok === "string") {
      if (tok === "*") return "×";
      if (tok === "/") return "÷";
      if (tok === "-") return "−";
      return tok;
    }
    if (tok.t === "len") return fmtLengthFromInches(tok.inches);
    return String(tok.value);
  }

  function updateEquationDisplay() {
    if (!eqEl) return;
    if (tokens.length === 0) {
      eqEl.textContent = "0'";
      return;
    }
    eqEl.textContent = tokens.map(tokenToString).join(" ");
  }

  function setResultDisplay(val) {
    if (!resEl) return;
    if (!val) {
      resEl.textContent = "0'";
      return;
    }
    if (val.t === "len") resEl.textContent = fmtLengthFromInches(val.inches);
    else resEl.textContent = String(val.value);
  }

  function isOp(x) {
    return typeof x === "string" && ["+", "-", "*", "/"].includes(x);
  }
  function isLParen(x) {
    return x === "(";
  }

  function parseLengthStringLoose(s) {
    const raw0 = (s || "").trim();
    if (!raw0) throw new Error("Entry is empty.");

    let sign = 1;
    let raw = raw0;

    if (raw[0] === "+") raw = raw.slice(1).trim();
    if (raw[0] === "-") {
      sign = -1;
      raw = raw.slice(1).trim();
    }

    const hasFeet = raw.includes("'");
    const hasInch = raw.includes('"');

    if (!hasFeet && !hasInch) {
      const feetOnly = Number(raw);
      if (!Number.isFinite(feetOnly) || !Number.isInteger(feetOnly)) {
        throw new Error("Feet must be an integer for implied-feet input (example: 4).");
      }
      return sign * (feetOnly * 12);
    }

    let feet = 0;
    let inches = 0;

    if (hasFeet) {
      const parts = raw.split("'");
      const feetPart = parts[0].trim();
      feet = feetPart === "" ? 0 : Number(feetPart);
      if (!Number.isFinite(feet) || !Number.isInteger(feet)) {
        throw new Error("Feet must be an integer.");
      }

      const rest = (parts[1] ?? "").trim();
      if (rest === "") {
        inches = 0;
      } else {
        const restNoQuote = rest.replace(/"/g, "").trim();
        inches = restNoQuote === "" ? 0 : Number(restNoQuote);
        if (!Number.isFinite(inches) || !Number.isInteger(inches)) {
          throw new Error("Inches must be a whole number.");
        }
      }
    } else {
      const inchPart = raw.replace(/"/g, "").trim();
      inches = inchPart === "" ? 0 : Number(inchPart);
      if (!Number.isFinite(inches) || !Number.isInteger(inches)) {
        throw new Error("Inches must be a whole number.");
      }
      feet = 0;
    }

    return sign * (feet * 12 + inches);
  }

  function parseNumberString(s) {
    const raw = (s || "").trim();
    if (!raw) throw new Error("Entry is empty.");
    const v = Number(raw);
    if (!Number.isFinite(v)) throw new Error("That is not a valid number.");
    return v;
  }

  function tryAutoCommitEntry() {
    clearError();

    const v0 = (entryEl?.value || "").trim();
    if (!v0) return true;

    const forcedNumber = v0.endsWith("#");
    const v = forcedNumber ? v0.slice(0, -1).trim() : v0;

    try {
      if (forcedNumber) {
        let n = parseNumberString(v);
        if (negateNext) {
          n = -n;
          negateNext = false;
        }
        tokens.push({ t: "num", value: n });
        setLast(`auto num ${n}`);
      } else {
        let inchesTotal = parseLengthStringLoose(v);
        if (negateNext) {
          inchesTotal = -inchesTotal;
          negateNext = false;
        }
        tokens.push({ t: "len", inches: inchesTotal });
        setLast(`auto len ${fmtLengthFromInches(inchesTotal)}`);
      }

      entryEl.value = "";
      updateEquationDisplay();
      return true;
    } catch (e) {
      setError(String(e?.message || e));
      return false;
    }
  }

  function insertOperator(op) {
    clearError();

    if (op !== "(") {
      const ok = tryAutoCommitEntry();
      if (!ok) return;
    }

    const last = tokens[tokens.length - 1];

    if (tokens.length === 0) {
      if (op === "(") {
        tokens.push("(");
        setLast("(");
        updateEquationDisplay();
        return;
      }
      if (op === "-") {
        negateNext = true;
        setLast("negate-next");
        return;
      }
      setError('Start with a length, a number (#), or "(".');
      return;
    }

    if (op === "(") {
      if (isOp(last) || isLParen(last)) {
        tokens.push("(");
        setLast("(");
        updateEquationDisplay();
        return;
      }
      setError('Insert an operator before "(".');
      return;
    }

    if (op === ")") {
      tokens.push(")");
      setLast(")");
      updateEquationDisplay();
      return;
    }

    if (isOp(last) || isLParen(last)) {
      setError("Two operators in a row is not valid. Insert a value first.");
      return;
    }

    tokens.push(op);
    setLast(op);
    updateEquationDisplay();
  }

  function insertLengthFromEntry() {
    clearError();
    const raw = (entryEl?.value || "").trim();
    if (!raw) {
      setError("Entry is empty.");
      return;
    }
    try {
      let inchesTotal = parseLengthStringLoose(raw.replace(/#\s*$/, ""));
      if (negateNext) {
        inchesTotal = -inchesTotal;
        negateNext = false;
      }
      tokens.push({ t: "len", inches: inchesTotal });
      setLast(`len ${fmtLengthFromInches(inchesTotal)}`);
      entryEl.value = "";
      updateEquationDisplay();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  function insertNumberFromEntry() {
    clearError();
    const raw0 = (entryEl?.value || "").trim();
    if (!raw0) {
      setError("Entry is empty.");
      return;
    }
    const raw = raw0.endsWith("#") ? raw0.slice(0, -1).trim() : raw0;
    try {
      let n = parseNumberString(raw);
      if (negateNext) {
        n = -n;
        negateNext = false;
      }
      tokens.push({ t: "num", value: n });
      setLast(`num ${n}`);
      entryEl.value = "";
      updateEquationDisplay();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  function clearEntry() {
    clearError();
    entryEl.value = "";
    entryEl.focus();
    setLast("entry cleared");
  }

  function backEntry() {
    clearError();
    const s = entryEl.value || "";
    if (!s) return;
    entryEl.value = s.slice(0, -1);
    entryEl.focus();
    setLast("entry back");
  }

  function backToken() {
    clearError();
    if (tokens.length === 0) return;
    tokens.pop();
    setLast("removed token");
    updateEquationDisplay();
    setResultDisplay(null);
  }

  function clearEquation() {
    clearError();
    tokens.length = 0;
    negateNext = false;
    setLast("cleared equation");
    updateEquationDisplay();
    setResultDisplay(null);
  }

  function toggleNegateNext() {
    clearError();
    negateNext = !negateNext;
    setLast(negateNext ? "negate-next ON" : "negate-next OFF");
  }

  function countParensBalance(ts) {
    let b = 0;
    for (const t of ts) {
      if (t === "(") b++;
      if (t === ")") b--;
    }
    return b;
  }

  function precedence(op) {
    if (op === "*" || op === "/") return 2;
    if (op === "+" || op === "-") return 1;
    return 0;
  }

  function toRPN(ts) {
    const out = [];
    const ops = [];
    for (const tok of ts) {
      if (typeof tok === "object") {
        out.push(tok);
        continue;
      }
      if (tok === "(") {
        ops.push(tok);
        continue;
      }
      if (tok === ")") {
        while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop());
        if (!ops.length) throw new Error("Mismatched parentheses.");
        ops.pop();
        continue;
      }
      if (isOp(tok)) {
        while (
          ops.length &&
          isOp(ops[ops.length - 1]) &&
          precedence(ops[ops.length - 1]) >= precedence(tok)
        ) {
          out.push(ops.pop());
        }
        ops.push(tok);
        continue;
      }
      throw new Error("Unknown token in expression.");
    }

    while (ops.length) {
      const op = ops.pop();
      if (op === "(" || op === ")") throw new Error("Mismatched parentheses.");
      out.push(op);
    }

    return out;
  }

  function evalRPN(rpn) {
    const st = [];

    for (const tok of rpn) {
      if (typeof tok === "object") {
        st.push(tok);
        continue;
      }

      if (!isOp(tok)) throw new Error("Unexpected token during evaluation.");
      if (st.length < 2) throw new Error("Incomplete expression.");

      const b = st.pop();
      const a = st.pop();

      if (tok === "+" || tok === "-") {
        if (a.t === "len" && b.t === "len") {
          st.push({ t: "len", inches: tok === "+" ? a.inches + b.inches : a.inches - b.inches });
          continue;
        }
        if (a.t === "num" && b.t === "num") {
          st.push({ t: "num", value: tok === "+" ? a.value + b.value : a.value - b.value });
          continue;
        }
        throw new Error("Type mismatch: + and − require both values to be both lengths or both numbers.");
      }

      if (tok === "*") {
        if (a.t === "num" && b.t === "len") {
          st.push({ t: "len", inches: a.value * b.inches });
          continue;
        }
        if (a.t === "len" && b.t === "num") {
          st.push({ t: "len", inches: a.inches * b.value });
          continue;
        }
        if (a.t === "num" && b.t === "num") {
          st.push({ t: "num", value: a.value * b.value });
          continue;
        }
        throw new Error("Not allowed: length × length becomes area, not a length.");
      }

      if (tok === "/") {
        if (b.t === "num" && b.value === 0) throw new Error("Division by zero.");

        if (a.t === "len" && b.t === "num") {
          st.push({ t: "len", inches: a.inches / b.value });
          continue;
        }
        if (a.t === "num" && b.t === "num") {
          st.push({ t: "num", value: a.value / b.value });
          continue;
        }
        throw new Error("Type mismatch: ÷ supports length ÷ number, or number ÷ number.");
      }
    }

    if (st.length !== 1) throw new Error("Incomplete expression.");
    return st[0];
  }

  function calculate() {
    clearError();

    const ok = tryAutoCommitEntry();
    if (!ok) return;

    if (tokens.length === 0) {
      setResultDisplay(null);
      return;
    }

    const bal = countParensBalance(tokens);
    if (bal !== 0) {
      setError("Parentheses are not balanced.");
      return;
    }

    try {
      const rpn = toRPN(tokens);
      const out = evalRPN(rpn);

      if (out.t === "len") out.inches = Math.round(out.inches);

      setResultDisplay(out);
      setLast("evaluated");
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  function appendToEntry(txt) {
    clearError();
    entryEl.value += txt;
    entryEl.focus();
    setLast(`entry + ${txt}`);
  }

  keypad?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const ins = btn.getAttribute("data-insert");
    const op = btn.getAttribute("data-op");

    if (ins !== null) {
      appendToEntry(ins);
      return;
    }

    if (op !== null) {
      insertOperator(op);
      return;
    }
  });

  insertLengthBtn?.addEventListener("click", insertLengthFromEntry);
  insertNumberBtn?.addEventListener("click", insertNumberFromEntry);
  clearEntryBtn?.addEventListener("click", clearEntry);
  entryBackBtn?.addEventListener("click", backEntry);

  negateNextBtn?.addEventListener("click", toggleNegateNext);
  eqBackBtn?.addEventListener("click", backToken);
  eqClearBtn?.addEventListener("click", clearEquation);
  equalsBtn?.addEventListener("click", calculate);

  // Modal open/close
  function openHelp() {
    if (!helpModal) return;
    helpModal.classList.add("open");
    helpModal.setAttribute("aria-hidden", "false");
    setLast("help open");
  }

  function closeHelp() {
    if (!helpModal) return;
    helpModal.classList.remove("open");
    helpModal.setAttribute("aria-hidden", "true");
    setLast("help closed");
  }

  helpBtn?.addEventListener("click", openHelp);
  helpCloseBtn?.addEventListener("click", closeHelp);

  helpModal?.addEventListener("click", (e) => {
    // clicking the dark overlay closes; clicking modal card does not
    if (e.target === helpModal) closeHelp();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (helpModal?.classList.contains("open")) closeHelp();
      return;
    }

    // When typing in Entry, allow operators to commit-insert quickly
    if (document.activeElement === entryEl) {
      const k = e.key;
      if (k === "Enter") {
        e.preventDefault();
        const ok = tryAutoCommitEntry();
        if (ok) setLast("auto commit (Enter)");
        return;
      }
      if (k === "=") {
        e.preventDefault();
        calculate();
        return;
      }
      if (k === "+") { e.preventDefault(); insertOperator("+"); return; }
      if (k === "-") { e.preventDefault(); insertOperator("-"); return; }
      if (k === "*") { e.preventDefault(); insertOperator("*"); return; }
      if (k === "/") { e.preventDefault(); insertOperator("/"); return; }
      if (k === "(") { e.preventDefault(); insertOperator("("); return; }
      if (k === ")") { e.preventDefault(); insertOperator(")"); return; }
    }
  });

  updateEquationDisplay();
  setResultDisplay(null);
  setLast("ready");
})();
