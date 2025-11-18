import { getCompositeImageData } from '../layers/layers.js';

let AppRef = null;
let canvas = null;
let ctx = null;
let stage = null;
let playBtn = null;
let modeLoopBtn = null;
let modePingBtn = null;
let speedInput = null;

let playing = false;
let raf = 0;
let lastTs = 0;
let accum = 0;
let playbackIndex = 0;
let direction = 1;
let previewScale = 1;
let customFps = null;
let playbackMode = 'loop';

const scratch = document.createElement('canvas');
const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });

export function initPreviewPlayer(app) {
  AppRef = app;
  canvas = document.getElementById('previewCanvas');
  stage = document.getElementById('previewStage');
  playBtn = document.getElementById('playBtn');
  modeLoopBtn = document.querySelector('[data-preview-mode="loop"]');
  modePingBtn = document.querySelector('[data-preview-mode="pingpong"]');
  speedInput = document.getElementById('previewFps');

  if (!canvas) return;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  if (!canvas.dataset.baseWidth) {
    canvas.dataset.baseWidth = String(canvas.width || 165);
    canvas.dataset.baseHeight = String(canvas.height || 165);
  }

  setScale(1);
  updateBackground();

  if (speedInput) {
    const init = Number(speedInput.value);
    if (Number.isFinite(init) && init > 0) {
      customFps = clampFps(init);
      speedInput.value = String(customFps);
    } else {
      customFps = null;
      speedInput.value = '';
    }
    speedInput.placeholder = String(AppRef?.fps || 12);
    speedInput.addEventListener('change', handleSpeedChange);
    speedInput.addEventListener('input', handleSpeedChange);
  }

  playBtn?.addEventListener('click', togglePlayback);
  window.addEventListener('app:setToggle', (ev) => {
    if (ev.detail?.key === 'checker') updateBackground();
  });

  modeLoopBtn?.addEventListener('click', () => setPlaybackMode('loop'));
  modePingBtn?.addEventListener('click', () => {
    direction = 1;
    setPlaybackMode('pingpong');
  });

  window.addEventListener('app:frameSelected', (ev) => {
    const idx = Math.max(0, Math.min(AppRef.frames.length - 1, ev.detail?.index ?? 0));
    playbackIndex = idx;
    if (!playing) renderFrame();
  });

  window.addEventListener('app:framePreviewUpdated', (ev) => {
    if (!playing && ev.detail?.index === playbackIndex) {
      renderFrame(ev.detail.frame);
    }
  });

  window.addEventListener('app:framesChanged', (ev) => {
    const count = ev.detail?.count ?? AppRef.frames.length;
    playbackIndex = Math.min(playbackIndex, Math.max(0, count - 1));
    if (!playing) renderFrame();
  });

  renderFrame();
}

function togglePlayback() {
  if (playing) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (!AppRef.frames.length) return;
  playing = true;
  playBtn?.classList.add('is-playing');
  lastTs = 0;
  accum = 0;
  renderFrame();
  raf = requestAnimationFrame(stepPlayback);
}

function stopPlayback() {
  playing = false;
  playBtn?.classList.remove('is-playing');
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastTs = 0;
}

function stepPlayback(ts) {
  if (!playing) return;
  if (!lastTs) lastTs = ts;
  const delta = ts - lastTs;
  lastTs = ts;
  accum += delta;
  const frame = AppRef.frames[playbackIndex];
  const duration = customFps && customFps > 0
    ? (1000 / customFps)
    : (frame?.durationMs ?? 100);
  if (accum >= duration) {
    accum -= duration;
    if (!advancePlaybackIndex()) {
      stopPlayback();
      renderFrame();
      return;
    }
  }
  renderFrame();
  raf = requestAnimationFrame(stepPlayback);
}

function advancePlaybackIndex() {
  const total = AppRef.frames.length;
  if (total <= 1) return playbackMode === 'loop';
  let next = playbackIndex + direction;
  const ping = playbackMode === 'pingpong';
  const looping = playbackMode === 'loop';

  if (ping) {
    if (next >= total || next < 0) {
      direction *= -1;
      next = playbackIndex + direction;
    }
  }

  if (next >= total) {
    if (looping) next = ping ? playbackIndex + direction : 0;
    else return false;
  }
  if (next < 0) {
    if (looping) next = ping ? playbackIndex + direction : total - 1;
    else return false;
  }
  if (next >= total || next < 0) return false;
  playbackIndex = next;
  return true;
}

function renderFrame(frameOverride) {
  if (!ctx) return;
  const frame = frameOverride || AppRef.frames[playbackIndex];
  const preview = frame?.preview || getCompositeImageData();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!preview || !preview.pixels) return;
  scratch.width = preview.width;
  scratch.height = preview.height;
  const img = new ImageData(new Uint8ClampedArray(preview.pixels), preview.width, preview.height);
  scratchCtx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}

function setScale(scale = 1) {
  previewScale = Math.max(1, Math.min(8, Math.round(scale)));
  const width = AppRef.size?.w || canvas.width;
  const height = AppRef.size?.h || canvas.height;
  canvas.width = width;
  canvas.height = height;
  const baseW = Number(canvas.dataset.baseWidth || 165);
  const baseH = Number(canvas.dataset.baseHeight || 165);
  canvas.style.width = `${baseW}px`;
  canvas.style.height = `${baseH}px`;
  ctx.imageSmoothingEnabled = false;
  if (!playing) renderFrame();
}

function updateBackground() {
  if (!stage) return;
  stage.classList.remove('bg-none');
  stage.style.backgroundImage = '';
  stage.style.backgroundColor = '';
}

function setPlaybackMode(mode) {
  playbackMode = mode === 'pingpong' ? 'pingpong' : 'loop';
  direction = 1;
  modeLoopBtn?.classList.toggle('active', playbackMode === 'loop');
  modePingBtn?.classList.toggle('active', playbackMode === 'pingpong');
}

function handleSpeedChange() {
  if (!speedInput) return;
  let val = Number(speedInput.value);
  if (!Number.isFinite(val) || val <= 0) {
    customFps = null;
    speedInput.value = '';
  } else {
    customFps = clampFps(val);
    speedInput.value = String(customFps);
  }
  accum = 0;
}

function clampFps(val) {
  return Math.max(1, Math.min(120, Math.round(val)));
}




