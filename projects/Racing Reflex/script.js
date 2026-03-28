const STORAGE_KEY = "racing-reflex-best-time";

// Central config makes timing and round behavior easy to tweak later.
const GAME_CONFIG = {
  lightStepDelay: 460,
  suspenseDelayMin: 700,
  suspenseDelayMax: 1800,
  finishMode: "green", // Change to "lightsOut" to swap the final race signal style.
  timerDecimals: 4,
  readyTimerText: "0.0000",
  statuses: {
    idle: "Press Start",
    arming: "Get Ready",
    waiting: "Wait for Green",
    go: "GO!",
    result: "Reaction Time",
    falseStart: "False Start"
  },
  captions: {
    idle: "Ready on the grid",
    arming: "Start sequence armed",
    waiting: "Lights building...",
    goGreen: "Green flag, react now",
    goLightsOut: "Lights out, react now",
    falseStart: "Jumped the start",
    result: "Round complete"
  }
};

const ui = {
  panel: document.getElementById("gamePanel"),
  statusText: document.getElementById("statusText"),
  signalCaption: document.getElementById("signalCaption"),
  timerDisplay: document.getElementById("timerDisplay"),
  latestScore: document.getElementById("latestScore"),
  bestScore: document.getElementById("bestScore"),
  cleanCount: document.getElementById("cleanCount"),
  inputHint: document.getElementById("inputHint"),
  startButton: document.getElementById("startButton"),
  reactionButton: document.getElementById("reactionButton"),
  restartButton: document.getElementById("restartButton"),
  shareButton: document.getElementById("shareButton"),
  lights: Array.from(document.querySelectorAll("[data-light]"))
};

const game = {
  state: "idle",
  signalTime: null,
  frameId: null,
  timeoutIds: [],
  latestTime: null,
  bestTime: loadBestTime(),
  cleanRounds: 0
};

function init() {
  updateScoreboard();
  setIdleScreen();

  ui.startButton.addEventListener("click", startRound);
  ui.restartButton.addEventListener("click", startRound);
  ui.shareButton.addEventListener("click", shareLastScore);
  ui.reactionButton.addEventListener("click", (event) => {
    handleReactionInput("button", getHighResTimestamp(event.timeStamp));
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space") {
      return;
    }

    if (event.repeat) {
      return;
    }

    event.preventDefault();

    if (game.state === "idle" || game.state === "result" || game.state === "falseStart") {
      startRound();
      return;
    }

    handleReactionInput("spacebar", getHighResTimestamp(event.timeStamp));
  });
}

function startRound() {
  if (game.state === "arming" || game.state === "waiting" || game.state === "go") {
    cancelActiveRound();
  }

  clearScheduledActions();
  stopTimerLoop();

  game.signalTime = null;
  game.state = "arming";

  setPanelState("arming");
  setStatus(GAME_CONFIG.statuses.arming);
  setSignalCaption(GAME_CONFIG.captions.arming);
  setTimerDisplay(GAME_CONFIG.readyTimerText);
  resetLights();
  updateButtons();
  setInputHint("Sequence live. Hold steady until the race signal.");
  playCue("roundStart");

  buildLightSequence();
}

function buildLightSequence() {
  ui.lights.forEach((light, index) => {
    schedule(() => {
      light.classList.add("is-active", "is-live");
      setStatus(index === 0 ? GAME_CONFIG.statuses.arming : GAME_CONFIG.statuses.waiting);
      setSignalCaption(GAME_CONFIG.captions.waiting);
      playCue("lightOn");
    }, GAME_CONFIG.lightStepDelay * index);
  });

  // Wait only a short beat after the final red light comes on before the suspense window.
  const sequenceDuration =
    GAME_CONFIG.lightStepDelay * (ui.lights.length - 1) + 140;
  const suspenseDelay = randomBetween(
    GAME_CONFIG.suspenseDelayMin,
    GAME_CONFIG.suspenseDelayMax
  );

  schedule(() => {
    game.state = "waiting";
    setPanelState("waiting");
    setStatus(GAME_CONFIG.statuses.waiting);
    setSignalCaption("Hold... hold...");
    updateButtons();
  }, sequenceDuration);

  schedule(triggerGoSignal, sequenceDuration + suspenseDelay);
}

function triggerGoSignal() {
  if (game.state !== "arming" && game.state !== "waiting") {
    return;
  }

  game.state = "go";
  game.signalTime = performance.now();

  setPanelState("go");
  setStatus(GAME_CONFIG.statuses.go);
  setSignalCaption(
    GAME_CONFIG.finishMode === "lightsOut"
      ? GAME_CONFIG.captions.goLightsOut
      : GAME_CONFIG.captions.goGreen
  );
  setGoLights();
  updateButtons();
  setInputHint("GO signal is live. React immediately.");
  playCue("go");
  startTimerLoop();
}

function handleReactionInput(source, inputTimestamp = performance.now()) {
  if (game.state === "idle") {
    return;
  }

  if (game.state === "arming" || game.state === "waiting") {
    registerFalseStart(source);
    return;
  }

  if (game.state !== "go") {
    return;
  }

  const reactionTime = inputTimestamp - game.signalTime;
  finishRound(reactionTime, source);
}

function finishRound(reactionTime, source) {
  game.state = "result";
  game.latestTime = reactionTime;
  game.cleanRounds += 1;

  clearScheduledActions();
  stopTimerLoop();

  setPanelState("result");
  setStatus(`${GAME_CONFIG.statuses.result}: ${formatTime(reactionTime)} s`);
  setSignalCaption(`Captured via ${source}`);
  setTimerDisplay(formatTime(reactionTime));
  setInputHint("Clean run recorded. Start another round when ready.");
  updateLightsForResult();
  updateBestTime(reactionTime);
  updateScoreboard();
  updateButtons();
  playCue("finish");
}

function registerFalseStart(source) {
  game.state = "falseStart";

  clearScheduledActions();
  stopTimerLoop();

  setPanelState("falseStart");
  setStatus(`${GAME_CONFIG.statuses.falseStart}`);
  setSignalCaption(`${GAME_CONFIG.captions.falseStart} via ${source}`);
  setTimerDisplay("FALSE");
  setInputHint("Too early. Restart and wait for the signal.");
  showFalseStartLights();
  updateScoreboard();
  updateButtons();
  playCue("falseStart");
}

function cancelActiveRound() {
  clearScheduledActions();
  stopTimerLoop();
  game.signalTime = null;
}

function setIdleScreen() {
  setPanelState("idle");
  setStatus(GAME_CONFIG.statuses.idle);
  setSignalCaption(GAME_CONFIG.captions.idle);
  setTimerDisplay(GAME_CONFIG.readyTimerText);
  setInputHint("Press Start, then wait for green or lights-out before reacting.");
  resetLights();
  updateButtons();
}

function updateButtons() {
  const activeRound = game.state === "arming" || game.state === "waiting" || game.state === "go";
  const roundFinished = game.state === "result" || game.state === "falseStart";

  ui.startButton.disabled = activeRound;
  ui.reactionButton.disabled = game.state === "idle" || roundFinished;
  ui.restartButton.disabled = !activeRound && !roundFinished;
  ui.restartButton.textContent = activeRound ? "Restart Round" : "Play Again";
  ui.shareButton.disabled = activeRound || game.latestTime === null;
}

function updateScoreboard() {
  ui.latestScore.textContent =
    game.latestTime === null ? "--.---- s" : `${formatTime(game.latestTime)} s`;
  ui.bestScore.textContent =
    game.bestTime === null ? "--.---- s" : `${formatTime(game.bestTime)} s`;
  ui.cleanCount.textContent = String(game.cleanRounds);
}

function startTimerLoop() {
  stopTimerLoop();

  // Use the frame timestamp directly for the best display precision the browser exposes.
  const tick = (frameTimestamp) => {
    if (game.state !== "go" || game.signalTime === null) {
      return;
    }

    setTimerDisplay(formatTime(frameTimestamp - game.signalTime));
    game.frameId = requestAnimationFrame(tick);
  };

  game.frameId = requestAnimationFrame(tick);
}

function stopTimerLoop() {
  if (game.frameId !== null) {
    cancelAnimationFrame(game.frameId);
    game.frameId = null;
  }
}

function schedule(callback, delay) {
  const timeoutId = window.setTimeout(() => {
    game.timeoutIds = game.timeoutIds.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  game.timeoutIds.push(timeoutId);
}

function clearScheduledActions() {
  game.timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  game.timeoutIds = [];
}

function resetLights() {
  ui.lights.forEach((light) => {
    light.className = "start-light";
  });
}

function setGoLights() {
  resetLights();

  if (GAME_CONFIG.finishMode === "lightsOut") {
    return;
  }

  ui.lights.forEach((light) => {
    light.classList.add("is-go", "is-live");
  });
}

function updateLightsForResult() {
  ui.lights.forEach((light) => {
    light.classList.remove("is-live");
  });
}

function showFalseStartLights() {
  ui.lights.forEach((light) => {
    light.className = "start-light is-active is-false";
  });
}

function setStatus(text) {
  ui.statusText.textContent = text;
}

function setSignalCaption(text) {
  ui.signalCaption.textContent = text;
}

function setTimerDisplay(text) {
  ui.timerDisplay.textContent = text;
}

function setInputHint(text) {
  ui.inputHint.textContent = text;
}

function setPanelState(state) {
  ui.panel.dataset.state = state;
}

function updateBestTime(reactionTime) {
  if (game.bestTime !== null && reactionTime >= game.bestTime) {
    return;
  }

  game.bestTime = reactionTime;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(reactionTime));
  } catch (error) {
    void error;
  }
}

function loadBestTime() {
  let saved = null;

  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    void error;
  }

  const parsed = saved ? Number(saved) : null;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function formatTime(timeMs) {
  return (timeMs / 1000).toFixed(GAME_CONFIG.timerDecimals);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getHighResTimestamp(eventTimestamp) {
  if (!Number.isFinite(eventTimestamp)) {
    return performance.now();
  }

  // Some browsers expose event timestamps relative to the page, others as epoch time.
  if (eventTimestamp > 1e12) {
    return eventTimestamp - performance.timeOrigin;
  }

  return eventTimestamp;
}

async function shareLastScore() {
  if (game.latestTime === null) {
    return;
  }

  ui.shareButton.disabled = true;
  setInputHint("Rendering score image...");

  try {
    const blob = await createShareImage();
    const filename = `racing-reflex-${formatTime(game.latestTime).replace(".", "-")}s.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: "Racing Reflex",
        text: `My Racing Reflex reaction time: ${formatTime(game.latestTime)} s`,
        files: [file]
      });
      setInputHint("Score image shared.");
    } else {
      downloadBlob(blob, filename);
      setInputHint("Score image downloaded.");
    }
  } catch (error) {
    setInputHint("Could not export the score image.");
    console.error(error);
  } finally {
    updateButtons();
  }
}

async function createShareImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;

  const ctx = canvas.getContext("2d");
  const latestScore = `${formatTime(game.latestTime)} s`;

  ctx.fillStyle = "#06090f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const topGlow = ctx.createRadialGradient(600, 240, 80, 600, 240, 560);
  topGlow.addColorStop(0, "rgba(60, 232, 164, 0.16)");
  topGlow.addColorStop(1, "rgba(60, 232, 164, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bottomGlow = ctx.createRadialGradient(600, 1080, 140, 600, 1080, 760);
  bottomGlow.addColorStop(0, "rgba(255, 48, 76, 0.12)");
  bottomGlow.addColorStop(1, "rgba(255, 48, 76, 0)");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  drawRoundedRect(ctx, 120, 120, 960, 960, 36, "rgba(8, 15, 23, 0.9)", "rgba(196, 213, 255, 0.12)");

  ctx.fillStyle = "#3ce8a4";
  ctx.font = "700 24px 'Trebuchet MS', sans-serif";
  ctx.fillText("REACTION TIME CHALLENGE", 324, 248);

  ctx.fillStyle = "#eef3ff";
  ctx.font = "700 88px 'Trebuchet MS', sans-serif";
  ctx.fillText("Racing Reflex", 240, 340);

  ctx.fillStyle = "#3ce8a4";
  drawLightBar(ctx, 240, 450);

  ctx.font = "700 116px Consolas, 'Lucida Console', monospace";
  ctx.fillText(formatTime(game.latestTime), 300, 820);

  ctx.fillStyle = "#95a2bb";
  ctx.font = "700 28px 'Trebuchet MS', sans-serif";
  ctx.fillText("SECONDS", 495, 870);

  const blob = await canvasToBlob(canvas);
  return blob;
}

function drawLightBar(ctx, x, y) {
  drawRoundedRect(ctx, x, y, 720, 116, 58, "rgba(17, 24, 36, 0.92)", "rgba(255, 255, 255, 0.06)");

  for (let index = 0; index < 5; index += 1) {
    const centerX = x + 104 + (index * 128);
    const centerY = y + 58;

    const glow = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, 86);
    glow.addColorStop(0, "rgba(198, 255, 215, 0.95)");
    glow.addColorStop(0.34, "rgba(77, 255, 154, 0.78)");
    glow.addColorStop(1, "rgba(77, 255, 154, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 86, 0, Math.PI * 2);
    ctx.fill();

    const lamp = ctx.createRadialGradient(centerX - 12, centerY - 12, 4, centerX, centerY, 42);
    lamp.addColorStop(0, "#f0fff5");
    lamp.addColorStop(0.45, "#4dff9a");
    lamp.addColorStop(1, "#08763d");
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 42, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Share image export failed."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Hook point for future sound effects without changing game logic flow.
function playCue(name) {
  void name;
}

init();
