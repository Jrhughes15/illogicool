import {
  snapshotLayersState,
  loadLayersState,
  cloneLayerState,
  getCompositeImageData,
} from '../layers/layers.js';
import { snapshotToImage } from '../utils/snapshotRenderer.js';

let AppRef = null;
let stripEl = null;
let addBtn = null;
let dupBtn = null;
let delBtn = null;
let moveLeftBtn = null;
let moveRightBtn = null;
let prevBtn = null;
let nextBtn = null;
let flipBtn = null;
let rotateBtn = null;
let copyBtn = null;
let pasteBtn = null;
let frameCounter = 0;
let frameClipboard = null;

const defaultFrameDuration = () =>
  Math.max(16, Math.round(1000 / (AppRef?.fps || 12)));

function currentCanvasSize() {
  return {
    w: Math.max(1, AppRef?.size?.w || 1),
    h: Math.max(1, AppRef?.size?.h || 1),
  };
}

function defaultPivot() {
  const { w, h } = currentCanvasSize();
  return {
    x: Math.round(w / 2),
    y: Math.round(h / 2),
  };
}

function clampPivot(pivot) {
  const { w, h } = currentCanvasSize();
  if (!pivot) return defaultPivot();
  return {
    x: Math.max(0, Math.min(w - 1, Math.round(pivot.x))),
    y: Math.max(0, Math.min(h - 1, Math.round(pivot.y))),
  };
}

function clonePivot(pivot) {
  if (!pivot) return null;
  return { x: Math.round(pivot.x), y: Math.round(pivot.y) };
}

function emitFrameAction(type, extra = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:frameAction', {
    detail: { type, ...extra },
  }));
}

const scratch = document.createElement('canvas');
const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
if (scratchCtx) scratchCtx.imageSmoothingEnabled = false;

export function initFramesTimeline(app) {
  AppRef = app;
  stripEl = document.getElementById('frameStrip');
  if (!stripEl) return;

  addBtn = document.getElementById('frameAddBtn');
  dupBtn = document.getElementById('frameDupBtn');
  delBtn = document.getElementById('frameDelBtn');
  moveLeftBtn = document.getElementById('frameMoveLeftBtn');
  moveRightBtn = document.getElementById('frameMoveRightBtn');
  prevBtn = document.getElementById('framePrevBtn');
  nextBtn = document.getElementById('frameNextBtn');
  flipBtn = document.getElementById('frameFlipBtn');
  rotateBtn = document.getElementById('frameRotateBtn');
  copyBtn = document.getElementById('frameCopyBtn');
  pasteBtn = document.getElementById('framePasteBtn');

  if (!Array.isArray(AppRef.frames)) AppRef.frames = [];
  if (AppRef.frames.length === 0) {
    AppRef.frames.push(createFrameObject('frame_000'));
  }
  frameCounter = AppRef.frames.length;

  if (!Number.isInteger(AppRef.activeFrameIndex)) AppRef.activeFrameIndex = 0;
  ensureSnapshots();
  renumberFrames();

  bindFrameUI();
  renderFrameStrip();
  selectFrame(AppRef.activeFrameIndex, { skipSave: true });

  window.addEventListener('app:layersComposite', captureActiveFrameSnapshot);
  window.addEventListener('app:layerClonedAcrossFrames', handleLayerCloneAcrossFrames);
}

function bindFrameUI() {
  addBtn?.addEventListener('click', addFrame);
  dupBtn?.addEventListener('click', duplicateFrame);
  delBtn?.addEventListener('click', deleteFrame);
  moveLeftBtn?.addEventListener('click', () => shiftFrame(-1));
  moveRightBtn?.addEventListener('click', () => shiftFrame(1));
  prevBtn?.addEventListener('click', () => goToFrameRelative(-1));
  nextBtn?.addEventListener('click', () => goToFrameRelative(1));
  flipBtn?.addEventListener('click', (event) => handleFrameFlip(event?.altKey));
  rotateBtn?.addEventListener('click', (event) => handleFrameRotate(event?.altKey));
  copyBtn?.addEventListener('click', copyActiveFrameState);
  pasteBtn?.addEventListener('click', pasteActiveFrameState);
}

function ensureSnapshots() {
  AppRef.frames.forEach((frame, idx) => {
    if (!frame.id) frame.id = `frame_${String(idx).padStart(3, '0')}`;
    if (!frame.name) frame.name = frame.id;
    if (!frame.durationMs) frame.durationMs = 100;
    if (!frame.snapshot) frame.snapshot = snapshotLayersState();
    frame.snapshot = ensureSnapshotStructure(frame.snapshot);
    if (!frame.preview) {
      frame.preview = generatePreviewFromSnapshot(frame.snapshot) || getCompositeImageData();
    }
    frame.pivot = clampPivot(frame.pivot || defaultPivot());
  });
}

function addFrame() {
  captureActiveFrameSnapshot();
  const template = ensureSnapshotStructure(getActiveFrame()?.snapshot || snapshotLayersState());
  const blank = cloneLayerState(template);
  blank.layers.forEach(layer => {
    if (layer.pixels) layer.pixels.fill(0);
  });
  const id = `frame_${String(frameCounter++).padStart(3, '0')}`;
  const frame = {
    id,
    name: id,
    durationMs: defaultFrameDuration(),
    snapshot: blank,
    preview: null,
    pivot: clampPivot(getActiveFrame()?.pivot || defaultPivot()),
  };
  const insertAt = AppRef.activeFrameIndex + 1;
  AppRef.frames.splice(insertAt, 0, frame);
  renumberFrames();
  renderFrameStrip();
  selectFrame(insertAt, { skipSave: true });
  emitFrameAction('add');
}

function duplicateFrame() {
  captureActiveFrameSnapshot();
  const current = getActiveFrame();
  if (!current) return;
  current.snapshot = ensureSnapshotStructure(current.snapshot);
  const clone = {
    id: `frame_${String(frameCounter++).padStart(3, '0')}`,
    name: current.name,
    durationMs: current.durationMs ?? defaultFrameDuration(),
    snapshot: cloneLayerState(current.snapshot),
    preview: clonePreview(current.preview),
    pivot: clampPivot(current.pivot || defaultPivot()),
  };
  AppRef.frames.splice(AppRef.activeFrameIndex + 1, 0, clone);
  renumberFrames();
  renderFrameStrip();
  selectFrame(AppRef.activeFrameIndex + 1, { skipSave: true });
  emitFrameAction('duplicate');
}

function handleFrameFlip(vertical = false) {
  mutateActiveFrame((frame) => {
    frame.snapshot.layers.forEach(layer => flipLayerPixels(layer, vertical));
  }, vertical ? 'flip_vertical' : 'flip_horizontal', (pivot) => flipPivot(pivot, vertical), vertical ? 'Frame flipped vertically.' : 'Frame flipped horizontally.');
}

function handleFrameRotate(counterClockwise = false) {
  if (!hasSquareCanvas()) {
    setStatusText('Rotation requires a square canvas.');
    return;
  }
  const clockwise = !counterClockwise;
  mutateActiveFrame((frame) => {
    frame.snapshot.layers.forEach(layer => rotateLayerPixels(layer, clockwise));
  }, clockwise ? 'rotate_clockwise' : 'rotate_counterclockwise', (pivot) => rotatePivot(pivot, clockwise), clockwise ? 'Frame rotated clockwise.' : 'Frame rotated counterclockwise.');
}

function copyActiveFrameState() {
  captureActiveFrameSnapshot();
  const frame = getActiveFrame();
  if (!frame?.snapshot) return;
  frameClipboard = {
    snapshot: cloneLayerState(frame.snapshot),
    durationMs: frame.durationMs,
    pivot: clonePivot(frame.pivot || defaultPivot()),
  };
  setStatusText('Frame copied.');
}

function pasteActiveFrameState() {
  if (!frameClipboard?.snapshot) {
    setStatusText('Nothing to paste.');
    return;
  }
  mutateActiveFrame((frame) => {
    frame.snapshot = cloneLayerState(frameClipboard.snapshot);
    frame.durationMs = frameClipboard.durationMs ?? frame.durationMs;
  }, 'paste_frame', () => clonePivot(frameClipboard.pivot || defaultPivot()), 'Frame pasted.');
}

function deleteFrame() {
  if (AppRef.frames.length <= 1) return;
  AppRef.frames.splice(AppRef.activeFrameIndex, 1);
  const nextIndex = Math.min(AppRef.frames.length - 1, AppRef.activeFrameIndex);
  renumberFrames();
  renderFrameStrip();
  selectFrame(nextIndex, { skipSave: true });
  emitFrameAction('delete');
}

function shiftFrame(delta) {
  captureActiveFrameSnapshot();
  const idx = AppRef.activeFrameIndex;
  const target = idx + delta;
  if (target < 0 || target >= AppRef.frames.length) return;
  const [frame] = AppRef.frames.splice(idx, 1);
  AppRef.frames.splice(target, 0, frame);
  AppRef.activeFrameIndex = target;
  renumberFrames();
  renderFrameStrip();
  emitFrameAction('reorder');
}

function captureActiveFrameSnapshot() {
  const frame = getActiveFrame();
  if (!frame) return;
  frame.snapshot = snapshotLayersState();
  frame.preview = clonePreview(getCompositeImageData());
  updateFramePreview(AppRef.activeFrameIndex);
  window.dispatchEvent(
    new CustomEvent('app:framePreviewUpdated', {
      detail: { index: AppRef.activeFrameIndex, frame },
    }),
  );
}

export function selectFrame(index, { skipSave = false } = {}) {
  if (index < 0 || index >= AppRef.frames.length) return;
  if (!skipSave) captureActiveFrameSnapshot();
  AppRef.activeFrameIndex = index;
  const frame = getActiveFrame();
  if (!frame) return;
  if (!frame.snapshot) {
    frame.snapshot = cloneLayerState(snapshotLayersState());
  }
  frame.snapshot = ensureSnapshotStructure(frame.snapshot);
  loadLayersState(cloneLayerState(frame.snapshot));
  renderFrameStrip();
  window.dispatchEvent(new CustomEvent('app:frameSelected', { detail: { index } }));
}

function getActiveFrame() {
  return AppRef.frames[AppRef.activeFrameIndex];
}

function renderFrameStrip() {
  stripEl.innerHTML = '';
  AppRef.frames.forEach((frame, idx) => {
    const el = document.createElement('div');
    el.className = `frame${idx === AppRef.activeFrameIndex ? ' active' : ''}`;
    el.dataset.index = String(idx);
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    el.appendChild(canvas);
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = frame.name || String(idx + 1);
    el.appendChild(name);
    el.addEventListener('click', () => {
      if (idx === AppRef.activeFrameIndex) return;
      selectFrame(idx);
    });
    stripEl.appendChild(el);
    drawPreview(canvas, frame.preview);
  });
  window.dispatchEvent(new CustomEvent('app:framesChanged', { detail: { count: AppRef.frames.length } }));
}

function updateFramePreview(index) {
  const frameEl = stripEl?.querySelector(`.frame[data-index="${index}"]`);
  if (!frameEl) return;
  const canvas = frameEl.querySelector('canvas');
  if (!canvas) return;
  drawPreview(canvas, AppRef.frames[index]?.preview);
}

function drawPreview(canvas, preview) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!preview || !preview.pixels || !scratchCtx) return;
  scratch.width = preview.width;
  scratch.height = preview.height;
  const img = new ImageData(new Uint8ClampedArray(preview.pixels), preview.width, preview.height);
  scratchCtx.putImageData(img, 0, 0);
  ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}

function mutateActiveFrame(applyFn, actionLabel, pivotTransform = null, statusMessage = '') {
  captureActiveFrameSnapshot();
  const frame = getActiveFrame();
  if (!frame) return false;
  frame.snapshot = ensureSnapshotStructure(frame.snapshot);
  applyFn?.(frame);
  frame.snapshot = ensureSnapshotStructure(frame.snapshot);
  const pivotSource = pivotTransform ? pivotTransform(frame.pivot || defaultPivot()) : (frame.pivot || defaultPivot());
  frame.pivot = clampPivot(pivotSource);
  frame.preview = generatePreviewFromSnapshot(frame.snapshot);
  loadLayersState(cloneLayerState(frame.snapshot));
  updateFramePreview(AppRef.activeFrameIndex);
  emitFrameAction(actionLabel);
  if (statusMessage) setStatusText(statusMessage);
  return true;
}

function flipLayerPixels(layer, vertical = false) {
  if (!layer?.pixels || !layer.width || !layer.height) return;
  const { width, height, pixels } = layer;
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const targetX = vertical ? x : (width - 1 - x);
      const targetY = vertical ? (height - 1 - y) : y;
      const destIndex = (targetY * width + targetX) * 4;
      out[destIndex] = pixels[srcIndex];
      out[destIndex + 1] = pixels[srcIndex + 1];
      out[destIndex + 2] = pixels[srcIndex + 2];
      out[destIndex + 3] = pixels[srcIndex + 3];
    }
  }
  layer.pixels = out;
}

function rotateLayerPixels(layer, clockwise = true) {
  if (!layer?.pixels || !layer.width || !layer.height) return;
  const { width, height, pixels } = layer;
  if (width !== height) return;
  const size = width;
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcIndex = (y * size + x) * 4;
      const destX = clockwise ? (size - 1 - y) : y;
      const destY = clockwise ? x : (size - 1 - x);
      const destIndex = (destY * size + destX) * 4;
      out[destIndex] = pixels[srcIndex];
      out[destIndex + 1] = pixels[srcIndex + 1];
      out[destIndex + 2] = pixels[srcIndex + 2];
      out[destIndex + 3] = pixels[srcIndex + 3];
    }
  }
  layer.pixels = out;
}

function flipPivot(pivot, vertical) {
  const { w, h } = currentCanvasSize();
  return vertical
    ? { x: pivot.x, y: h - 1 - pivot.y }
    : { x: w - 1 - pivot.x, y: pivot.y };
}

function rotatePivot(pivot, clockwise) {
  const { w } = currentCanvasSize();
  if (clockwise) {
    return { x: w - 1 - pivot.y, y: pivot.x };
  }
  return { x: pivot.y, y: w - 1 - pivot.x };
}

function hasSquareCanvas() {
  const { w, h } = currentCanvasSize();
  return w === h;
}

function setStatusText(text) {
  if (!text) return;
  const el = document.getElementById('statusLeft');
  if (el) el.textContent = text;
}

function createFrameObject(id) {
  return {
    id,
    name: id,
    durationMs: defaultFrameDuration(),
    snapshot: snapshotLayersState(),
    preview: getCompositeImageData(),
    pivot: clampPivot(defaultPivot()),
  };
}

function clonePreview(preview) {
  if (!preview || !preview.pixels) return null;
  return {
    width: preview.width,
    height: preview.height,
    pixels: new Uint8ClampedArray(preview.pixels),
  };
}

function goToFrameRelative(delta) {
  if (!AppRef.frames.length) return;
  const target = Math.max(0, Math.min(AppRef.frames.length - 1, AppRef.activeFrameIndex + delta));
  if (target === AppRef.activeFrameIndex) return;
  selectFrame(target);
}

function renumberFrames() {
  AppRef.frames.forEach((frame, idx) => {
    frame.name = String(idx + 1);
  });
}

export function importFramesFromSnapshots(framesToAdd = []) {
  if (!framesToAdd.length) return;
  captureActiveFrameSnapshot();
  framesToAdd.forEach((entry) => {
    const id = `frame_${String(frameCounter++).padStart(3, '0')}`;
    const importedSnapshot = cloneLayerState(entry.snapshot);
    AppRef.frames.push({
      id,
      name: id,
      durationMs: entry.durationMs ?? defaultFrameDuration(),
      snapshot: ensureSnapshotStructure(importedSnapshot),
      preview: clonePreview(entry.preview),
      pivot: clampPivot(entry.pivot || defaultPivot()),
    });
  });
  renumberFrames();
  renderFrameStrip();
  selectFrame(AppRef.frames.length - 1, { skipSave: true });
  emitFrameAction('import', { count: framesToAdd.length });
}

export function forceActiveFrameSnapshot() {
  captureActiveFrameSnapshot();
}

export function getFrameSnapshots() {
  ensureSnapshots();
  return (AppRef?.frames || []).map(frame => ({
    id: frame.id,
    name: frame.name,
    durationMs: frame.durationMs ?? defaultFrameDuration(),
    snapshot: cloneLayerState(frame.snapshot),
    pivot: clonePivot(frame.pivot || defaultPivot()),
  }));
}

export function applyFramesState(frameStates = [], activeIndex = 0) {
  if (!AppRef) return;
  const clones = frameStates.map(frame => ({
    id: frame.id,
    name: frame.name,
    durationMs: frame.durationMs ?? defaultFrameDuration(),
    snapshot: cloneLayerState(frame.snapshot),
    preview: frame.preview ? clonePreview(frame.preview) : generatePreviewFromSnapshot(frame.snapshot),
    pivot: clampPivot(frame.pivot || defaultPivot()),
  }));
  if (!clones.length) return;
  AppRef.frames = clones;
  frameCounter = Math.max(clones.length, frameCounter);
  const targetIndex = Math.max(0, Math.min(clones.length - 1, activeIndex));
  renderFrameStrip();
  selectFrame(targetIndex, { skipSave: true });
  rebuildFramePreviews();
  window.dispatchEvent(new CustomEvent('app:pivotChanged', {
    detail: { pivot: getActiveFramePivot(), frameIndex: AppRef.activeFrameIndex },
  }));
}

export function getActiveFramePivot() {
  const frame = getActiveFrame();
  return clonePivot(frame?.pivot || defaultPivot());
}

export function setActiveFramePivot(pivot) {
  const frame = getActiveFrame();
  if (!frame) return;
  frame.pivot = clampPivot(pivot);
  window.dispatchEvent(new CustomEvent('app:pivotChanged', {
    detail: { pivot: clonePivot(frame.pivot), frameIndex: AppRef.activeFrameIndex },
  }));
}

function handleLayerCloneAcrossFrames() {
  ensureSnapshots();
  rebuildFramePreviews();
}

function ensureSnapshotStructure(snapshot = { layers: [] }) {
  if (!Array.isArray(snapshot.layers)) snapshot.layers = [];
  const currentLayers = Array.isArray(AppRef?.layers) ? AppRef.layers : [];
  if (!currentLayers.length) return snapshot;
  const byId = new Map(snapshot.layers.map(layer => [layer.id, layer]));
  const normalized = currentLayers.map(layer => {
    const existing = byId.get(layer.id);
    const width = layer.canvas?.width ?? AppRef?.size?.w ?? existing?.width ?? 0;
    const height = layer.canvas?.height ?? AppRef?.size?.h ?? existing?.height ?? 0;
    let pixels;
    if (existing?.pixels && existing.width && existing.height) {
      if (existing.width === width && existing.height === height) {
        pixels = existing.pixels;
      } else {
        pixels = resizePixels(existing.pixels, existing.width, existing.height, width, height);
      }
    } else {
      pixels = new Uint8ClampedArray(Math.max(0, width * height * 4));
    }
    return {
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blend: layer.blend,
      width,
      height,
      pixels,
    };
  });
  snapshot.layers = normalized;
  snapshot.activeLayerId = AppRef?.activeLayerId ?? snapshot.activeLayerId;
  return snapshot;
}

function resizePixels(source, srcW = 0, srcH = 0, dstW = 0, dstH = 0) {
  if (dstW <= 0 || dstH <= 0) return new Uint8ClampedArray(0);
  if (!source || !source.length || srcW <= 0 || srcH <= 0) {
    return new Uint8ClampedArray(dstW * dstH * 4);
  }
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  const copyW = Math.min(srcW, dstW);
  const copyH = Math.min(srcH, dstH);
  for (let y = 0; y < copyH; y++) {
    const srcStart = (y * srcW) * 4;
    const dstStart = (y * dstW) * 4;
    const srcEnd = srcStart + copyW * 4;
    out.set(source.subarray(srcStart, srcEnd), dstStart);
  }
  return out;
}

function rebuildFramePreviews(indices = null) {
  if (!Array.isArray(AppRef?.frames)) return;
  AppRef.frames.forEach((frame, idx) => {
    if (indices && !indices.includes(idx)) return;
    if (!frame.snapshot) return;
    const preview = generatePreviewFromSnapshot(frame.snapshot);
    if (preview) {
      frame.preview = preview;
      updateFramePreview(idx);
    }
  });
}

function generatePreviewFromSnapshot(snapshot) {
  if (!snapshot) return null;
  return snapshotToImage(snapshot, {
    baseWidth: AppRef?.size?.w,
    baseHeight: AppRef?.size?.h,
  });
}
