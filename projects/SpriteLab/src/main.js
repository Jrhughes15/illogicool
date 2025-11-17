// main.js — Pencil, Eraser, Line, Rect, Fill, Ellipse tools with FG/BG + color history (on-use),
// always-on cursor highlight, zoom/pan, centered canvas, checker artboard,
// topbar size apply + fit/1x, grid/checker/pin toggles, FPS passthrough,
// + tool help: richer titles and footer cheatsheet for active tool,
// + Eyedropper tool wiring (additive).

import { buildPanels } from './ui/panels.js';
import { initAnimationsPanel, refreshAnimationsPanel } from './ui/animations.js';
import { eraseRect } from './canvas/tools/eraser.js';
import { drawLine } from './canvas/tools/line.js';
import { fillRectPixels, strokeRectPixels } from './canvas/tools/rect.js';
import { floodFill } from './canvas/tools/fill.js';
import { fillEllipsePixels, strokeEllipsePixels } from './canvas/tools/ellipse.js';
import { samplePixel } from './canvas/tools/eyedropper.js'; // ADDITIVE
import { createRectMask, maskFromPainted, maskFromLasso } from './canvas/mask.js';
import {
  initLayerSystem,
  getActiveLayerCtx,
  getLayerCtxById,
  isActiveLayerLocked,
  requestCompositeRender,
  resizeLayerCanvases,
  getActiveLayer,
} from './layers/layers.js';
import {
  liftSelection,
  renderSelectionOverlay,
  stopSelectionOverlay,
  hitInside,
  moveBy,
  deltaFromClientToCanvasRect,
  commitSelection,
  cancelSelection,
  restoreOriginalUnderSelection,
  hitSelectionHandle,
} from './canvas/selection.js';
import {
  setClipboardFromMaskedRegion,
  hasClipboard,
  getClipboardCanvas,
} from './canvas/clipboard.js';
import {
  copySelectionToClipboard,
  deleteSelectionFromCanvas,
} from './canvas/selection.js';
import { initFramesTimeline, getActiveFramePivot, setActiveFramePivot, applyFramesState, getFrameSnapshots } from './timeline/frames.js';
import { initPreviewPlayer } from './preview/player.js';
import { setupImportControls } from './import/importPng.js';
import { initExportControls } from './export/exportControls.js';
import { initHistory, pushHistory, undo, redo, getHistoryState } from './core/history.js';
import { snapshotToCanvas } from './utils/snapshotRenderer.js';
import { downloadBlob } from './utils/download.js';
import { serializeFramesForExport, serializeAnimations, deserializeAnimations, deserializeFrames } from './utils/frameSerialization.js';

const LOCAL_PROJECT_KEY = 'spritelab.localProject';
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 64;
const ZOOM_STEP = 0.25;
const PIVOT_HIT_RADIUS_SQ = 36; // ~6px radius in canvas space for pivot dragging


export const App = {
  size: { w: 128, h: 128 },     // logical pixels
  zoom: 3.0,
  fps: 12,

  // view + options
  tool: '',
  checker: true,
  pinTopLeft: false,
  onion: {
    enabled: false,
    prev: 1,
    next: 1,
    opacity: 0.35,
    tint: 'duo',
  },

  // brush
  brush: { size: 1, alpha: 1, color: '#000000' }, // FG color

  // recent-first, unique; cap at 18 (2 rows of 9)
  colorHistory: ['#000000', '#ffffff'],

  // minimal frame/layer shape
  frames: [{ id: 'frame_000', name: 'frame_000', durationMs: 100 }],
  activeFrameIndex: 0,
  layers: [{ id: 'layer_0', name: 'Base', visible: true, locked: false, opacity: 1, blend: 'normal' }],
  activeLayerId: 'layer_0',
  showPivot: false,
  pivotMode: 'anchor',
  docTitle: 'sprite_lab',
  animations: [],
  activeAnimationId: '',
};
window.App = App; // handy for console

// --- Tool help (titles + footer cheats) ----------------------------
const TOOL_HELP = {
  pencil:    'Pencil — Left=FG, Right=BG',
  eraser:    'Eraser — Left=Erase, Right=BG paint',
  fill:      'Fill — Left=FG, Right=BG (contiguous region)',
  line:      'Line — Left=FG, Right=BG, Shift=snap 45°',
  rect:      'Rectangle — Left=FG, Right=BG, Alt=Fill, Shift=Square, Ctrl=Center',
  ellipse:   'Ellipse — Left=FG, Right=BG, Alt=Fill, Shift=Circle, Ctrl=Center',
  mirrorx:   'Mirror X — Pencil mirrored top/bottom around canvas center',
  mirrory:   'Mirror Y — Pencil mirrored left/right around canvas center',
  eyedropper: 'Eyedropper — Click to sample; Left→FG, Right→BG; adds to history', // ADD
};

function setFooter(text) {
  const el = document.getElementById('statusLeft');
  if (!el) return;
  el.textContent = text || '';
}

function clampZoom(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, num));
}

function snapZoom(value) {
  const num = clampZoom(value);
  const steps = Math.round(num / ZOOM_STEP);
  return clampZoom(steps * ZOOM_STEP);
}

function formatZoomPercent(value) {
  const pct = clampZoom(value) * 100;
  return Number.isInteger(pct) ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
}

// === Footer coordinate readout ===
function setCoords(x, y) {
  // assumes you have <span id="coordsReadout">…</span> in your footer
  const el = document.getElementById('coordsReadout');
  if (!el) return;
  if (x == null || y == null) {
    el.textContent = ''; // clear
  } else {
    el.textContent = `${x},${y}`;
  }
}


function enhanceToolHelp() {
  // Update titles for existing tool buttons at startup
  const btns = Array.from(document.querySelectorAll('[data-tool]'));
  btns.forEach(btn => {
    const tool = btn.getAttribute('data-tool');
    const help = TOOL_HELP[tool];
    if (help) btn.title = help;
  });

  // Initialize footer text for the current tool
  const active =
    document.querySelector('[data-tool].active') ||
    document.querySelector('[data-tool][aria-pressed="true"]');
  const currentTool = active ? active.getAttribute('data-tool') : App.tool;
  setFooter(TOOL_HELP[currentTool] || '');
}

function updateCursorForTool(toolName = App.tool) {
  // Toggle magnifier cursor class on overlay when using eyedropper
  if (!overlay) return;
  if (toolName === 'eyedropper') overlay.classList.add('cursor-eyedropper');
  else overlay.classList.remove('cursor-eyedropper');
}

// -------------------------------------------------------------------

let wrap, stack, artboardBg, onion, pivotCanvas, draw, overlay;
let ctxDraw, ctxOverlay, ctxOnion, ctxPivot;

function initDomRefs() {
  wrap       = document.getElementById('canvasWrap');
  stack      = document.querySelector('.canvas-stack');
  artboardBg = document.getElementById('artboardBg');
  onion      = document.getElementById('onionCanvas');
  pivotCanvas = document.getElementById('pivotCanvas');
  draw       = document.getElementById('drawCanvas');
  overlay    = document.getElementById('overlayCanvas');

  ctxDraw = draw.getContext('2d', { willReadFrequently: true });
  ctxDraw.imageSmoothingEnabled = false;

  if (onion) {
    ctxOnion = onion.getContext('2d', { willReadFrequently: true });
    ctxOnion.imageSmoothingEnabled = false;
  }

  if (pivotCanvas) {
    ctxPivot = pivotCanvas.getContext('2d', { willReadFrequently: true });
    ctxPivot.imageSmoothingEnabled = false;
  }

  ctxOverlay = overlay.getContext('2d', { willReadFrequently: true });
  ctxOverlay.imageSmoothingEnabled = false;

  overlay.addEventListener('contextmenu', (e) => e.preventDefault());

  initLayerSystem(App, ctxDraw);
}

function sizeBackings() {
  draw.width     = App.size.w;
  draw.height    = App.size.h;
  overlay.width  = App.size.w;
  overlay.height = App.size.h;
  if (onion) {
    onion.width = App.size.w;
    onion.height = App.size.h;
  }
  if (pivotCanvas) {
    pivotCanvas.width = App.size.w;
    pivotCanvas.height = App.size.h;
  }
  if (onion) {
    onion.width = App.size.w;
    onion.height = App.size.h;
  }
}

function setToolHelpFooter(text) {
  const el = document.getElementById('statusRight');
  if (el) el.textContent = text || '';
}


// Zoom + sizing (CSS)
function applyCssSizes() {
  const cssW = App.size.w * App.zoom;
  const cssH = App.size.h * App.zoom;

  if (stack) {
    stack.style.width  = `${cssW}px`;
    stack.style.height = `${cssH}px`;
  }

    [artboardBg, onion, pivotCanvas, draw, overlay].forEach(el => {
        if (!el) return;
        el.style.position = 'absolute';
        el.style.left = '0px';
        el.style.top  = '0px';
        el.style.width  = `${cssW}px`;
        el.style.height = `${cssH}px`;
    });


  if (artboardBg) {
    syncArtboardBackground();
  }

  const zr = document.getElementById('zoomReadout');
  if (zr) zr.textContent = formatZoomPercent(App.zoom);
}

function centerInWrap() {
  if (!wrap) return;
  if (App.pinTopLeft) { wrap.scrollLeft = 0; wrap.scrollTop = 0; return; }
  const cx = Math.max(0, (wrap.scrollWidth  - wrap.clientWidth ) / 2);
  const cy = Math.max(0, (wrap.scrollHeight - wrap.clientHeight) / 2);
  wrap.scrollLeft = cx;
  wrap.scrollTop  = cy;
}

function syncArtboardBackground() {
  if (!artboardBg) return;
  artboardBg.style.display = 'block';
  document.body.classList.toggle('checker-off', !App.checker);
}

function fitZoom() {
  if (!wrap) return;
  const pad = 24;
  const aw = wrap.clientWidth  - pad;
  const ah = wrap.clientHeight - pad;
  const zx = aw / App.size.w;
  const zy = ah / App.size.h;
  const fit = snapZoom(Math.min(zx, zy));
  App.zoom = fit;
  applyCssSizes();
  requestAnimationFrame(centerInWrap);
}

function wireWheelZoom() {
  if (!wrap) return;
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();

    const dir  = e.deltaY > 0 ? -1 : 1;
    const prev = App.zoom;
    const next = snapZoom(prev + dir * ZOOM_STEP);
    if (next === prev) return;

    // compute relative anchor before zoom
    const rect = wrap.getBoundingClientRect();
    const preX = (wrap.scrollLeft + e.clientX - rect.left);
    const preY = (wrap.scrollTop  + e.clientY - rect.top);
    const relX = preX / Math.max(1, wrap.scrollWidth);
    const relY = preY / Math.max(1, wrap.scrollHeight);

    App.zoom = next;
    applyCssSizes();

    // restore relative anchor after zoom
    requestAnimationFrame(() => {
      wrap.scrollLeft = relX * Math.max(0, wrap.scrollWidth  - wrap.clientWidth);
      wrap.scrollTop  = relY * Math.max(0, wrap.scrollHeight - wrap.clientHeight);
    });

    setStatus(`Zoom ${formatZoomPercent(App.zoom)}`);
  }, { passive: false });
}

// Global events from UI/panels
function wireGlobalEvents() {
  // Button-driven zoom in/out (panels dispatches app:zoomChange with {dir:+1|-1})
  window.addEventListener('app:zoomChange', (ev) => {
    const dir = ev.detail?.dir || 0;
    const delta = dir > 0 ? ZOOM_STEP : -ZOOM_STEP;
    const next = snapZoom(App.zoom + delta);
    if (next === App.zoom) return;
    App.zoom = next;
    applyCssSizes();
    centerInWrap();
  });

  // Fit-to-view and 1x zoom
  window.addEventListener('app:fit', () => fitZoom());
  window.addEventListener('app:oneX', () => {
    App.zoom = snapZoom(1);
    applyCssSizes();
    centerInWrap();
  });

  // Canvas size changes (W/H + Apply in the top bar)
  window.addEventListener('app:setCanvasSize', (ev) => {
    const { w, h } = ev.detail || {};
    setCanvasSize(w, h);
  });

  // Generic toggles (grid/checker/pinTopLeft/etc.)
  window.addEventListener('app:setToggle', (ev) => {
    const { key, value } = ev.detail || {};
    if (key in App) App[key] = !!value;

    // Reflect checker visibility immediately
    if (key === 'checker' && artboardBg) {
      syncArtboardBackground();
    }

    // Re-center if pinTopLeft changed
    if (key === 'pinTopLeft') {
      centerInWrap();
    }
  });

  // Brush updates (color / size / alpha)
  window.addEventListener('app:brushChanged', (ev) => {
    const { color, size, alpha } = ev.detail || {};

    if (color) App.brush.color = normHex(color);
    if (Number.isFinite(size))  App.brush.size  = Math.max(1, Math.min(64, Math.round(size)));
    if (Number.isFinite(alpha)) App.brush.alpha = Math.max(0, Math.min(1, Number(alpha)));

    setStatus(`Brush ${App.brush.size}px ${App.brush.color} α${App.brush.alpha}`);

    // Refresh hover outline with the new brush size/color if not drawing
    if (!isDown && lastHover) {
      renderHover(lastHover.x, lastHover.y);
    }
  });

  // Tool changes (from panels) — update cursor and refresh hover outline
  window.addEventListener('app:toolChanged', (ev) => {
    const t = ev.detail?.tool || App.tool;
    if (overlay) {
      // Use your chosen class name; you said you're using a crosshair.
      const isDropper = (t === 'eyedropper' || t === 'picker');
      overlay.classList.toggle('cursor-crosshair', isDropper);
      // If you kept the old class too, you can sync both:
      overlay.classList.toggle('cursor-eyedropper', isDropper);
    }
    if (!isDown && lastHover) {
      renderHover(lastHover.x, lastHover.y);
    }
  });

  // Tool help notes → right side of footer
  window.addEventListener('app:toolHelp', (ev) => {
    setToolHelpFooter(ev.detail?.help || '');
  });

  // Lose focus → clear overlays
  window.addEventListener('blur', clearOverlay);

  window.addEventListener('app:activeLayerChanged', (ev) => {
    if (!currentSelection) return;
    const prevId = ev.detail?.previousId;
    const prevCtx = (prevId && getLayerCtxById(prevId)) || getActiveLayerCtx();
    if (!prevCtx) return;
    stopSelectionOverlay && stopSelectionOverlay(currentSelection);
    commitSelection(prevCtx, currentSelection);
    setCurrentSelection(null);
    requestCompositeRender();
  });

  window.addEventListener('app:layersChanged', () => {
    if (!currentSelection) return;
    if (!isActiveLayerLocked()) return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;
    stopSelectionOverlay && stopSelectionOverlay(currentSelection);
    cancelSelection(layerCtx, currentSelection);
    setCurrentSelection(null);
    requestCompositeRender();
    setStatus && setStatus('Selection canceled (layer locked)');
  });
}


// Pointer helpers
function stageToCanvasPixel(clientX, clientY, elem = overlay) {
  // Use the event target's pixel scale instead of App.zoom to avoid drift/offset
  const el = elem || overlay || draw;
  const rect = el.getBoundingClientRect();
  // Compute actual CSS→canvas scale (robust to borders, devicePixelRatio, etc.)
  const scaleX = el.clientWidth  / el.width;
  const scaleY = el.clientHeight / el.height;
  const x = Math.floor((clientX - rect.left) / Math.max(scaleX, 0.0001));
  const y = Math.floor((clientY - rect.top)  / Math.max(scaleY, 0.0001));
  return { x, y };
}


// Drawing primitives
function drawDot(px, py, color) {
  const layerCtx = getActiveLayerCtx();
  if (!layerCtx) return;
  if (px < 0 || py < 0 || px >= App.size.w || py >= App.size.h) return;
  const s = App.brush.size || 1;
  layerCtx.globalAlpha = App.brush.alpha ?? 1;
  layerCtx.fillStyle   = color || App.brush.color || '#000000';
  layerCtx.fillRect(px, py, s, s);
  requestCompositeRender();
}

function drawMirroredDots(px, py, mode) {
  drawDot(px, py, strokeColor);
  if (mode === 'mirrorx') {
    const mirrorY = (App.size.h - 1) - py;
    if (mirrorY !== py) drawDot(px, mirrorY, strokeColor);
  } else if (mode === 'mirrory') {
    const mirrorX = (App.size.w - 1) - px;
    if (mirrorX !== px) drawDot(mirrorX, py, strokeColor);
  }
}

function guardLayerUnlocked() {
  if (!isActiveLayerLocked()) return true;
  setStatus && setStatus('Layer is locked');
  return false;
}

// Cursor highlight (border-only)
let lastHover = null;
let isDown    = false;
// --- Selection state (Rect Select + Move) ---
let currentSelection = null;           // { bounds, floating, originalPatch, transform, ... }
if (typeof window !== 'undefined') {
  window.currentSelection = null;
}
function setCurrentSelection(sel) {
  currentSelection = sel;
  if (typeof window !== 'undefined') {
    window.currentSelection = sel;
  }
}
let selDragPrevClient = null;          // {x,y} in client coords while dragging
let selRubberStart = null;             // {x,y} canvas coords during rect creation
let lassoPoints = null;                // [{x,y}, ...] during freeform selection

function isEditableElement(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}



function clearOverlay() {
  if (!ctxOverlay) return;
  if (currentSelection) return; // preserve floating selection preview
  ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
  setCoords(null, null);
}



function renderHover(mx, my) {
  // If a floating selection exists, preserve it: skip hover overlay.
  if (currentSelection) return;

  // coordinates in center footer always
  const center = document.getElementById('statusCenter');
  if (center) center.textContent = `X:${mx} Y:${my}`;

  if (!ctxOverlay || isDown) return;
  const s = Math.max(1, App.brush.size | 0);
  const x = Math.min(Math.max(0, mx), Math.max(0, App.size.w - s));
  const y = Math.min(Math.max(0, my), Math.max(0, App.size.h - s));
  if (x < 0 || y < 0 || x >= App.size.w || y >= App.size.h) {
    clearOverlay();
    lastHover = null;
    return;
  }

  // Clear only when not showing a floating selection
  clearOverlay();
  drawBorderPixels(x, y, s, '#ffffff');
  if (s >= 3) drawBorderPixels(x + 1, y + 1, s - 2, '#000000');
  lastHover = { x, y };
}




function drawBorderPixels(x, y, s, color) {
  const c = ctxOverlay;
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = color;
  c.fillRect(x, y, s, 1);
  c.fillRect(x, y + s - 1, s, 1);
  c.fillRect(x, y, 1, s);
  c.fillRect(x + s - 1, y, 1, s);
  c.restore();
}

// Color helpers + history on-use
function getBgColor() {
  const el = document.getElementById('bgColor');
  const v  = el?.value || '#ffffff';
  return normHex(v);
}
function normHex(c) {
  let s = String(c).trim();
  if (!s) return '#000000';
  if (s[0] !== '#') s = '#' + s;
  if (/^#([0-9a-fA-F]{3})$/.test(s)) {
    const r = s[1], g = s[2], b = s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#([0-9a-fA-F]{6})$/.test(s)) return s.toLowerCase();
  return '#000000';
}
function addColorToHistory(hex) {
  const h = normHex(hex);
  const list = App.colorHistory || (App.colorHistory = []);
  if (list[0] && list[0].toLowerCase() === h) return;
  const filtered = list.filter(v => String(v).toLowerCase() !== h);
  filtered.unshift(h);
  if (filtered.length > 18) filtered.length = 18;
  App.colorHistory = filtered;
  window.dispatchEvent(new CustomEvent('app:renderColorHistory'));
}

// Pencil
let strokeColor = '#000000';
function wirePencil() {
  let strokeDirty = false;
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'pencil') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture(e.pointerId);
    isDown = true;
    strokeDirty = false;
    strokeColor = (e.button === 2) ? getBgColor() : (App.brush.color || '#000000');
    clearOverlay();
    addColorToHistory(strokeColor);
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    drawDot(x, y, strokeColor);
    strokeDirty = true;
  });
  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    if (!isDown) { renderHover(pos.x, pos.y); return; }
    if (App.tool !== 'pencil') return;
    drawDot(pos.x, pos.y, strokeColor);
    strokeDirty = true;
  });
  const stop = () => {
    if (!isDown) return;
    isDown = false;
    if (strokeDirty) pushHistory('Pencil stroke');
    strokeDirty = false;
    if (lastHover) renderHover(lastHover.x, lastHover.y);
  };
  overlay.addEventListener('pointerup', stop);
  overlay.addEventListener('pointercancel', stop);
  overlay.addEventListener('pointerleave', () => { lastHover = null; clearOverlay(); });
  window.addEventListener('mouseleave', () => { lastHover = null; clearOverlay(); });
}

function wireMirrorTool(toolName) {
  let strokeDirty = false;
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== toolName) return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture?.(e.pointerId);
    isDown = true;
    strokeDirty = false;
    strokeColor = (e.button === 2) ? getBgColor() : (App.brush.color || '#000000');
    clearOverlay();
    addColorToHistory(strokeColor);
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    drawMirroredDots(x, y, toolName);
    strokeDirty = true;
  });

  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    if (!isDown) { renderHover(pos.x, pos.y); return; }
    if (App.tool !== toolName) return;
    drawMirroredDots(pos.x, pos.y, toolName);
    strokeDirty = true;
  });

  const stop = () => {
    if (!isDown) return;
    isDown = false;
    if (strokeDirty) pushHistory(`Mirror ${toolName} stroke`);
    strokeDirty = false;
    if (lastHover) renderHover(lastHover.x, lastHover.y);
  };

  overlay.addEventListener('pointerup', stop);
  overlay.addEventListener('pointercancel', stop);
}

// Eraser (left = erase to transparent; right = BG paint)
let usingBgPaint = false;
function wireEraser() {
  let eraserDirty = false;
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'eraser') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture(e.pointerId);
    isDown = true;
    eraserDirty = false;
    usingBgPaint = (e.button === 2);
    clearOverlay();
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    if (usingBgPaint) {
      strokeColor = getBgColor();
      addColorToHistory(strokeColor);
      drawDot(x, y, strokeColor);
      eraserDirty = true;
    } else {
      const s = App.brush.size || 1;
      eraseRect(layerCtx, x, y, s);
      requestCompositeRender();
      eraserDirty = true;
    }
  });
  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    if (!isDown) { renderHover(pos.x, pos.y); return; }
    if (App.tool !== 'eraser') return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;
    if (usingBgPaint) {
      drawDot(pos.x, pos.y, strokeColor);
      eraserDirty = true;
    } else {
      eraseRect(layerCtx, pos.x, pos.y, App.brush.size || 1);
      requestCompositeRender();
      eraserDirty = true;
    }
  });
  const stop = () => {
    if (!isDown) return;
    isDown = false;
    if (eraserDirty) pushHistory('Eraser stroke');
    eraserDirty = false;
    usingBgPaint = false;
    if (lastHover) renderHover(lastHover.x, lastHover.y);
  };
  overlay.addEventListener('pointerup', stop);
  overlay.addEventListener('pointercancel', stop);
}

// Line (preview on overlay; commit on release; Shift to constrain)
let lineStart = null;
function wireLine() {
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'line') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture(e.pointerId);
    isDown = true;
    strokeColor = (e.button === 2) ? getBgColor() : (App.brush.color || '#000000');
    addColorToHistory(strokeColor);
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    lineStart = { x, y };
    clearOverlay();
  });
  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    if (!isDown) { renderHover(pos.x, pos.y); return; }
    if (App.tool !== 'line') return;
    if (!lineStart) return;
    clearOverlay();
    let { x, y } = pos;
    if (e.shiftKey) {
      const dx   = x - lineStart.x;
      const dy   = y - lineStart.y;
      const ang  = Math.atan2(dy, dx);
      const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      const len  = Math.sqrt(dx*dx + dy*dy);
      x = Math.round(lineStart.x + len * Math.cos(snap));
      y = Math.round(lineStart.y + len * Math.sin(snap));
    }
    drawLine(ctxOverlay, lineStart.x, lineStart.y, x, y, App.brush.size, strokeColor, true);
  });
  overlay.addEventListener('pointerup', (e) => {
    if (App.tool !== 'line') return;
    if (!lineStart) return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    let { x, y } = pos;
    if (e.shiftKey) {
      const dx   = x - lineStart.x;
      const dy   = y - lineStart.y;
      const ang  = Math.atan2(dy, dx);
      const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      const len  = Math.sqrt(dx*dx + dy*dy);
      x = Math.round(lineStart.x + len * Math.cos(snap));
      y = Math.round(lineStart.y + len * Math.sin(snap));
    }
    clearOverlay();
    drawLine(layerCtx, lineStart.x, lineStart.y, x, y, App.brush.size, strokeColor, false);
    requestCompositeRender();
    pushHistory('Line');
    lineStart = null;
    isDown = false;
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && App.tool === 'line') {
      lineStart = null;
      clearOverlay();
      isDown = false;
    }
  });
}

// Rectangle (Stroke default; hold Alt for Fill; Shift=Square; Ctrl/Cmd=Center)
let rectStart = null; // {x,y} start anchor
function wireRect() {
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'rect') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture(e.pointerId);
    isDown = true;
    strokeColor = (e.button === 2) ? getBgColor() : (App.brush.color || '#000000');
    // add to history on commit (on-use)
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    rectStart = { x, y };
    clearOverlay();
  });

  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    if (!isDown) { renderHover(pos.x, pos.y); return; }
    if (App.tool !== 'rect') return;
    if (!rectStart) return;

    clearOverlay();

    const mods = {
      square: !!e.shiftKey,
      center: !!(e.ctrlKey || e.metaKey),
      fill:   !!e.altKey
    };
    const r = computeRect(rectStart, pos, mods);
    if (mods.fill) {
      fillRectPixels(ctxOverlay, r.x, r.y, r.w, r.h, strokeColor, true);
    } else {
      strokeRectPixels(ctxOverlay, r.x, r.y, r.w, r.h, App.brush.size, strokeColor, true);
    }
  });

  overlay.addEventListener('pointerup', (e) => {
    if (App.tool !== 'rect') return;
    if (!rectStart) return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;

    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    const mods = {
      square: !!e.shiftKey,
      center: !!(e.ctrlKey || e.metaKey),
      fill:   !!e.altKey
    };
    const r = computeRect(rectStart, pos, mods);

    clearOverlay();

    layerCtx.save();
    layerCtx.globalAlpha = App.brush.alpha ?? 1;

    if (mods.fill) {
      fillRectPixels(layerCtx, r.x, r.y, r.w, r.h, strokeColor, false);
    } else {
      strokeRectPixels(layerCtx, r.x, r.y, r.w, r.h, App.brush.size, strokeColor, false);
    }

    layerCtx.restore();
    requestCompositeRender();

    addColorToHistory(strokeColor);
    pushHistory(mods.fill ? 'Filled rectangle' : 'Rectangle');

    rectStart = null;
    isDown = false;
  });

  // Cancel with Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && App.tool === 'rect') {
      rectStart = null;
      clearOverlay();
      isDown = false;
    }
  });
}

function computeRect(start, end, { square, center }) {
  let x0 = start.x, y0 = start.y;
  let x1 = end.x,   y1 = end.y;

  if (center) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    if (square) {
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx) * m;
      dy = Math.sign(dy) * m;
    }
    const x = x0 - dx;
    const y = y0 - dy;
    const w = 2 * dx;
    const h = 2 * dy;
    return { x, y, w, h };
  } else {
    let w = x1 - x0;
    let h = y1 - y0;
    if (square) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = (w < 0 ? -m : m);
      h = (h < 0 ? -m : m);
    }
    return { x: x0, y: y0, w, h };
  }
}

// Begin a floating selection from a full-size mask + its bounds.
// Lifts pixels, erases source area, and draws the floating content on overlay.
function beginSelectionFromMask(mask, bounds) {
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) return false;
  const layerCtx = getActiveLayerCtx();
  if (!layerCtx) return false;
  const sel = liftSelection(layerCtx, bounds, mask, App.size.w, App.size.h);
  if (!sel) return false;
  setCurrentSelection(sel);

  // Immediately show it on overlay
  renderSelectionOverlay(ctxOverlay, currentSelection);
  requestCompositeRender();
  return true;
}


// Fill (bucket) — contiguous region fill, left=FG / right=BG, history on success
function wireFill() {
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'fill') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture?.(e.pointerId);
    isDown = true;

    // choose color
    const hex = (e.button === 2) ? getBgColor() : (App.brush.color || '#000000');

    // map coords
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);

    // perform fill on draw canvas using current alpha
    const alpha = App.brush.alpha ?? 1;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;
    const changed = floodFill(layerCtx, x, y, hexToRgba(hex, alpha), 0);

    // update history only if something changed (on-use)
    if (changed > 0) {
      addColorToHistory(hex);
      requestCompositeRender();
      pushHistory('Fill');
    }

    isDown = false;

    // restore hover preview if still inside
    if (lastHover) renderHover(lastHover.x, lastHover.y);
  });

  // Hover-only on move
  overlay.addEventListener('pointermove', (e) => {
    if (isDown) return;
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    renderHover(pos.x, pos.y);
  });

  overlay.addEventListener('pointerup', () => { isDown = false; });
  overlay.addEventListener('pointercancel', () => { isDown = false; });
}

function hexToRgba(hex, alpha = 1) {
  const h = normHex(hex).substring(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return { r, g, b, a };
}

// Ellipse (Stroke default; Alt=Fill; Shift=Circle; Ctrl/Cmd=Center)
let ellipseStart = null; // {x,y}
function wireEllipse() {
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'ellipse') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture(e.pointerId);
    isDown = true;
    strokeColor = (e.button === 2) ? getBgColor() : (App.brush.color || '#000000');
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    ellipseStart = { x, y };
    clearOverlay();
  });

  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    if (!isDown) { renderHover(pos.x, pos.y); return; }
    if (App.tool !== 'ellipse') return;
    if (!ellipseStart) return;

    clearOverlay();

    const mods = {
      circle: !!e.shiftKey,
      center: !!(e.ctrlKey || e.metaKey),
      fill:   !!e.altKey
    };
    const r = computeEllipseRect(ellipseStart, pos, mods);

    if (mods.fill) {
      fillEllipsePixels(ctxOverlay, r.x, r.y, r.w, r.h, strokeColor, true);
    } else {
      strokeEllipsePixels(ctxOverlay, r.x, r.y, r.w, r.h, App.brush.size, strokeColor, true);
    }
  });

  overlay.addEventListener('pointerup', (e) => {
    if (App.tool !== 'ellipse') return;
    if (!ellipseStart) return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;

    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    const mods = {
      circle: !!e.shiftKey,
      center: !!(e.ctrlKey || e.metaKey),
      fill:   !!e.altKey
    };
    const r = computeEllipseRect(ellipseStart, pos, mods);

    clearOverlay();

    layerCtx.save();
    layerCtx.globalAlpha = App.brush.alpha ?? 1;

    if (mods.fill) {
      fillEllipsePixels(layerCtx, r.x, r.y, r.w, r.h, strokeColor, false);
    } else {
      strokeEllipsePixels(layerCtx, r.x, r.y, r.w, r.h, App.brush.size, strokeColor, false);
    }

    layerCtx.restore();
    requestCompositeRender();

    addColorToHistory(strokeColor);
    pushHistory(mods.fill ? 'Filled ellipse' : 'Ellipse');

    ellipseStart = null;
    isDown = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && App.tool === 'ellipse') {
      ellipseStart = null;
      clearOverlay();
      isDown = false;
    }
  });
}

function computeEllipseRect(start, end, { circle, center }) {
  let x0 = start.x, y0 = start.y;
  let x1 = end.x,   y1 = end.y;

  if (center) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    if (circle) {
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx) * m;
      dy = Math.sign(dy) * m;
    }
    const x = x0 - dx;
    const y = y0 - dy;
    const w = 2 * dx;
    const h = 2 * dy;
    return { x, y, w, h };
  } else {
    let w = x1 - x0;
    let h = y1 - y0;
    if (circle) {
      const m = Math.max(Math.abs(w), Math.abs(h));
      w = (w < 0 ? -m : m);
      h = (h < 0 ? -m : m);
    }
    return { x: x0, y: y0, w, h };
  }
}

function wirePicker() {
  // Eyedropper: left-click → FG, right-click → BG, also adds to history
  overlay.addEventListener('pointerdown', (e) => {
    if (!(App.tool === 'eyedropper' || App.tool === 'picker')) return;

    overlay.setPointerCapture(e.pointerId);

    const rect = draw.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / App.zoom);
    const y = Math.floor((e.clientY - rect.top)  / App.zoom);
    if (x < 0 || y < 0 || x >= App.size.w || y >= App.size.h) return;

    // requires: import { samplePixel } from './canvas/eyedropper.js';
    const px = samplePixel(ctxDraw, x, y); // -> { r,g,b,a,hex } | null
    if (!px || !px.hex) return;

    const hex = px.hex.toLowerCase();

    if (e.button === 2) {
      // Right click → BG
      const bg = document.getElementById('bgColor');
      if (bg) bg.value = hex;
      addColorToHistory(hex);
      setStatus(`BG = ${hex}`);
    } else {
      // Left click → FG (+ sync hex input)
      const fg = document.getElementById('fgColor');
      const hexIn = document.getElementById('hexInput');
      if (fg) fg.value = hex;
      if (hexIn) hexIn.value = hex;
      App.brush.color = hex;
      window.dispatchEvent(new CustomEvent('app:brushChanged', { detail: { color: hex } }));
      addColorToHistory(hex);
      setStatus(`FG = ${hex}`);
    }
  });

  // Keep hover outline for non-picker tools only
  overlay.addEventListener('pointermove', (e) => {
    if (App.tool === 'eyedropper' || App.tool === 'picker') {
      clearOverlay();
      return;
    }
    const rect = draw.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / App.zoom);
    const y = Math.floor((e.clientY - rect.top)  / App.zoom);
    if (!isDown) renderHover(x, y);
  });

  const stop = () => { isDown = false; clearOverlay(); };
  overlay.addEventListener('pointerup', stop);
  overlay.addEventListener('pointercancel', stop);
}

// --- Footer helpers (paste above init()) ---
function setStatus(msg) {
  const el = document.getElementById('statusLeft');
  if (el) el.textContent = msg || '';
}

function setToolHelp(text) {
  const right = document.getElementById('statusRight');
  if (right) right.textContent = text || '';
}

function wireClipboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (isEditableElement(document.activeElement)) return;

    const lower = typeof e.key === 'string' ? e.key.toLowerCase() : '';

    if ((e.ctrlKey || e.metaKey) && lower === 'v') {
      e.preventDefault();
      if (!pasteSelectionFromClipboard()) {
        setStatus && setStatus('Clipboard empty');
      }
      return;
    }

    const sel = currentSelection;
    if (!sel) return;

    if ((e.ctrlKey || e.metaKey) && lower === 'c') {
      e.preventDefault();
      copySelectionToClipboard(sel);
      setStatus && setStatus('Copied selection');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && lower === 'x') {
      e.preventDefault();
      if (isActiveLayerLocked()) {
        setStatus && setStatus('Layer is locked');
        return;
      }
      const layerCtx = getActiveLayerCtx();
      if (!layerCtx) return;
      copySelectionToClipboard(sel);
      deleteSelectionFromCanvas(layerCtx, sel);
      stopSelectionOverlay && stopSelectionOverlay(sel);
      setCurrentSelection(null);
      requestCompositeRender();
      setStatus && setStatus('Cut selection');
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (isActiveLayerLocked()) {
        setStatus && setStatus('Layer is locked');
        return;
      }
      const layerCtx = getActiveLayerCtx();
      if (!layerCtx) return;
      deleteSelectionFromCanvas(layerCtx, sel);
      stopSelectionOverlay && stopSelectionOverlay(sel);
      setCurrentSelection(null);
      requestCompositeRender();
      setStatus && setStatus('Deleted selection');
      return;
    }
  });
}

function pasteSelectionFromClipboard() {
  if (isActiveLayerLocked()) {
    setStatus && setStatus('Layer is locked');
    return false;
  }
  if (!hasClipboard()) return false;
  if (!ctxOverlay || !overlay) return false;
  const clip = getClipboardCanvas();
  if (!clip) return false;

  const w = clip.width;
  const h = clip.height;
  const maxX = Math.max(0, App.size.w - w);
  const maxY = Math.max(0, App.size.h - h);
  const centerX = Math.round((App.size.w - w) / 2);
  const centerY = Math.round((App.size.h - h) / 2);
  const x = Math.max(0, Math.min(centerX, maxX));
  const y = Math.max(0, Math.min(centerY, maxY));

  const sel = {
    bounds: { x, y, w, h },
    floating: clip,
    originalPatch: null,
    transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
    _maskLocal: null,
    _state: 'transform',
    _restored: true,
  };

  setCurrentSelection(sel);
  renderSelectionOverlay(ctxOverlay, sel);
  App.tool = 'move';
  window.dispatchEvent(new CustomEvent('app:toolChanged', { detail: { tool: 'move' } }));
  setStatus && setStatus('Pasted selection');
  return true;
}


// highlight Move tool + update tool help/footer (used after Cut/Paste and after finishing a selection)
function switchToMoveTool() {
  App.tool = 'move';
  window.dispatchEvent(new CustomEvent('app:toolChanged', { detail: { tool: 'move' } }));
}



// === Eyedropper (additive) =========================================
function wireEyedropper() {
  // Sample pixel on click; hover outline remains
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'eyedropper') return;
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    const px = samplePixel(ctxDraw, x, y);
    if (!px) return;

    const hex = px.hex;
    if (e.button === 2) {
      // Right-click → BG
      const bgInput = document.getElementById('bgColor');
      if (bgInput) bgInput.value = hex;
      setStatus(`Eyedropper BG = ${hex} α${px.a.toFixed(2)}`);
    } else {
      // Left-click → FG
      const fgInput = document.getElementById('fgColor');
      if (fgInput) fgInput.value = hex;
      App.brush.color = hex;
      setStatus(`Eyedropper FG = ${hex} α${px.a.toFixed(2)}`);
    }

    addColorToHistory(hex);
  });
}


// === Rectangular Selection tool (creates a selection you can then move) ===
function wireSelectTool() {
  // Start rubber-band
  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'select') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture?.(e.pointerId);
    isDown = true;

    // anchor in canvas pixels
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    selRubberStart = { x, y };
    // clear any hover
    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
  });

  // Rubber-band preview on overlay (STATIC dashed box while dragging)
  overlay.addEventListener('pointermove', (e) => {
    // normal hover when not using select or not dragging
    if (App.tool !== 'select') {
      if (!isDown) {
        const pos = stageToCanvasPixel(e.clientX, e.clientY);
        renderHover(pos.x, pos.y);
      }
      return;
    }

    const pos = stageToCanvasPixel(e.clientX, e.clientY);

    if (!isDown || !selRubberStart) {
      renderHover(pos.x, pos.y);
      return;
    }

    // Compute rect from drag (supports Shift=square, Ctrl/Cmd=center)
    const r = computeRect(selRubberStart, pos, {
      square: !!e.shiftKey,
      center: !!(e.ctrlKey || e.metaKey),
    });

    // Normalize to positive width/height
    const rx = r.w >= 0 ? r.x : r.x + r.w;
    const ry = r.h >= 0 ? r.y : r.y + r.h;
    const rw = Math.abs(r.w);
    const rh = Math.abs(r.h);

    // Draw dashed preview rect live (crisp at any zoom)
    ctxOverlay.save();
    ctxOverlay.imageSmoothingEnabled = false;
    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
    ctxOverlay.strokeStyle = 'rgba(255,255,255,0.95)';
    ctxOverlay.setLineDash([4, 4]);                // static dash
    ctxOverlay.lineDashOffset = 0;                 // no animation
    ctxOverlay.lineWidth = 1;                      // crisp single-pixel stroke
    ctxOverlay.strokeRect(rx + 0.5, ry + 0.5, rw, rh); // half-pixel align for sharpness
    ctxOverlay.restore();
  });

  // Finalize mask → lift selection
  overlay.addEventListener('pointerup', (e) => {
    if (App.tool !== 'select') { isDown = false; return; }
    if (!selRubberStart)       { isDown = false; return; }

    const pos = stageToCanvasPixel(e.clientX, e.clientY);
    const r = computeRect(selRubberStart, pos, {
      square: !!e.shiftKey,
      center: !!(e.ctrlKey || e.metaKey),
    });

    // Normalize bounds to positive w/h
    const bx = r.w >= 0 ? r.x : r.x + r.w;
    const by = r.h >= 0 ? r.y : r.y + r.h;
    const bw = Math.abs(r.w);
    const bh = Math.abs(r.h);

    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
    isDown = false;
    selRubberStart = null;

    if (bw <= 0 || bh <= 0) return;

    // Build rectangular mask and lift
    const { mask, bounds } = createRectMask(App.size.w, App.size.h, bx, by, bx + bw - 1, by + bh - 1);
    const lifted = beginSelectionFromMask(mask, bounds);
    if (!lifted) return;

    // Auto-switch to Move ONLY AFTER lift succeeds
    App.tool = 'move';
    window.dispatchEvent(new CustomEvent('app:toolChanged', { detail: { tool: 'move' } }));
  });

  // Cancel with Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && App.tool === 'select') {
      selRubberStart = null;
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      isDown = false;
    }
  });
}

// === Lasso (freeform) Selection tool ===
function wireLassoTool() {
  if (!overlay || !ctxOverlay) return;

  const drawPreview = (tempPoint) => {
    if (!lassoPoints || lassoPoints.length === 0) return;
    ctxOverlay.save();
    ctxOverlay.imageSmoothingEnabled = false;
    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
    ctxOverlay.strokeStyle = 'rgba(255,255,255,0.95)';
    ctxOverlay.setLineDash([6, 3]);
    ctxOverlay.lineWidth = 1;
    ctxOverlay.beginPath();
    const first = lassoPoints[0];
    ctxOverlay.moveTo(first.x + 0.5, first.y + 0.5);
    for (let i = 1; i < lassoPoints.length; i++) {
      const pt = lassoPoints[i];
      ctxOverlay.lineTo(pt.x + 0.5, pt.y + 0.5);
    }
    if (tempPoint) {
      ctxOverlay.lineTo(tempPoint.x + 0.5, tempPoint.y + 0.5);
    }
    ctxOverlay.stroke();
    ctxOverlay.restore();
  };

  const finalizeLasso = () => {
    if (App.tool !== 'lasso') { isDown = false; return; }
    const points = lassoPoints;
    lassoPoints = null;
    isDown = false;

    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
    if (!points || points.length < 3) return;

    const { mask, bounds } = maskFromLasso(points, App.size.w, App.size.h);
    if (!bounds) return;

    const lifted = beginSelectionFromMask(mask, bounds);
    if (!lifted) return;

    App.tool = 'move';
    window.dispatchEvent(new CustomEvent('app:toolChanged', { detail: { tool: 'move' } }));
  };

  overlay.addEventListener('pointerdown', (e) => {
    if (App.tool !== 'lasso') return;
    if (!guardLayerUnlocked()) return;
    overlay.setPointerCapture?.(e.pointerId);
    isDown = true;
    const { x, y } = stageToCanvasPixel(e.clientX, e.clientY);
    lassoPoints = [{ x, y }];
    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
  });

  overlay.addEventListener('pointermove', (e) => {
    const pos = stageToCanvasPixel(e.clientX, e.clientY);

    if (App.tool !== 'lasso') {
      if (!isDown) renderHover(pos.x, pos.y);
      return;
    }

    if (!isDown || !lassoPoints) {
      renderHover(pos.x, pos.y);
      return;
    }

    const last = lassoPoints[lassoPoints.length - 1];
    if (!last || last.x !== pos.x || last.y !== pos.y) {
      lassoPoints.push({ x: pos.x, y: pos.y });
    }
    drawPreview(pos);
  });

  const upHandler = (e) => {
    if (App.tool !== 'lasso') { isDown = false; return; }
    overlay.releasePointerCapture?.(e.pointerId);
    finalizeLasso();
  };

  overlay.addEventListener('pointerup', upHandler);
  overlay.addEventListener('pointercancel', upHandler);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && App.tool === 'lasso' && lassoPoints) {
      e.preventDefault();
      lassoPoints = null;
      isDown = false;
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
    }
  });
}


// === Move tool (moves an existing selection) ===
// If a selection exists: drag to move; Enter commits; Esc cancels.
// (Auto-"select all painted" will come next step—this is the basic move.)
// === MOVE TOOL ===
// Behavior:
//  - If a selection is active: drag the floating selection (you likely already had this).
//  - If NO selection is active: drag the entire bitmap (all drawn pixels) as a group.
//     Preview during drag happens on the overlay; commit the translation on pointerup.
function wireMoveTool() {
  if (!overlay || !draw) return;

  let dragging = false;
  let startClient = null;
  let startTransform = null;
  let layerCtx = null;
  let activeHandle = null;
  let handleSession = null;
  let draggingPivot = false;

  // For "move-all" mode
  let movingAll = false;
  let snapshot = null;     // ImageData of the whole canvas at drag start
  let commitDx = 0, commitDy = 0;

  const onDown = (e) => {
    if (App.tool !== 'move') return;
    const pointer = stageToCanvasPixel(e.clientX, e.clientY, overlay);

    if (!currentSelection && App.pivotMode === 'custom' && pivotHitTest(pointer)) {
      overlay.setPointerCapture?.(e.pointerId);
      dragging = true;
      draggingPivot = true;
      movingAll = false;
      snapshot = null;
      startClient = null;
      commitDx = 0;
      commitDy = 0;
      activeHandle = null;
      handleSession = null;
      movePivotToPointer(pointer);
      return;
    }

    if (!guardLayerUnlocked()) return;
    layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;

    if (currentSelection) {
      const handle = hitSelectionHandle(currentSelection, pointer.x, pointer.y);
      if (handle) {
        overlay.setPointerCapture?.(e.pointerId);
        dragging = true;
        movingAll = false;
        snapshot = null;
        startClient = null;
        commitDx = 0;
        commitDy = 0;
        activeHandle = handle;
        handleSession = createHandleSession(currentSelection, handle, pointer);
        return;
      }
    }

    overlay.setPointerCapture?.(e.pointerId);
    dragging = true;
    startClient = { x: e.clientX, y: e.clientY };
    commitDx = 0; commitDy = 0;

    if (currentSelection) {
      movingAll = false;
      startTransform = { x: currentSelection.transform.x, y: currentSelection.transform.y };
      clearOverlay();
    } else {
      movingAll = true;
      startTransform = null;
      snapshot = layerCtx.getImageData(0, 0, draw.width, draw.height);
      clearOverlay();
    }
  };

  const onMove = (e) => {
    if (!dragging || App.tool !== 'move') return;

    if (draggingPivot) {
      const pointer = stageToCanvasPixel(e.clientX, e.clientY, overlay);
      movePivotToPointer(pointer);
      return;
    }

    if (activeHandle && handleSession && currentSelection) {
      const pointer = stageToCanvasPixel(e.clientX, e.clientY, overlay);
      if (activeHandle.type === 'rotate') {
        applyHandleRotation(currentSelection, handleSession, pointer);
      } else {
        applyHandleScale(currentSelection, handleSession, pointer, e.shiftKey);
      }
      renderSelectionOverlay(ctxOverlay, currentSelection);
      return;
    }

    if (!startClient) return;

    const dxClient = e.clientX - startClient.x;
    const dyClient = e.clientY - startClient.y;

    const scaleX = draw.clientWidth  / draw.width;
    const scaleY = draw.clientHeight / draw.height;
    // round to exact pixel steps in canvas space
    const dx = Math.round(dxClient / Math.max(scaleX, 0.0001));
    const dy = Math.round(dyClient / Math.max(scaleY, 0.0001));
    commitDx = dx; commitDy = dy;

    if (movingAll) {
      // Preview the whole-canvas translation on overlay
      ctxOverlay.save();
      ctxOverlay.imageSmoothingEnabled = false;
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      // draw snapshot at dx,dy; pixels shifted out-of-bounds vanish
      ctxOverlay.putImageData(snapshot, dx, dy);
      ctxOverlay.restore();
    } else if (currentSelection) {
      // Update selection transform and let the marching-ants RAF render it
      currentSelection.transform.x = startTransform.x + dx;
      currentSelection.transform.y = startTransform.y + dy;
    }
  };

  const onUp = (e) => {
    if (!dragging) return;
    overlay.releasePointerCapture?.(e.pointerId);
    dragging = false;

     if (draggingPivot) {
       draggingPivot = false;
       pushHistory('Move pivot');
       activeHandle = null;
       handleSession = null;
       layerCtx = null;
       return;
     }

    if (movingAll) {
      if (layerCtx) {
        layerCtx.clearRect(0, 0, draw.width, draw.height);
        layerCtx.putImageData(snapshot, commitDx, commitDy);
        requestCompositeRender();
        pushHistory('Move pixels');
      }
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      snapshot = null;
      commitDx = 0; commitDy = 0;
    } else if (activeHandle) {
      activeHandle = null;
      handleSession = null;
      pushHistory('Selection transform');
      if (currentSelection) renderSelectionOverlay(ctxOverlay, currentSelection);
    } else if (currentSelection) {
      // For selection move, we keep it as floating until user presses Enter
      // (your existing Enter handler should call commitSelection)
      // No extra action here; ants loop continues to show updated position
    }
    activeHandle = null;
    handleSession = null;
    layerCtx = null;
  };

  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointermove', onMove);
  overlay.addEventListener('pointerup', onUp);
  overlay.addEventListener('pointercancel', onUp);

  function createHandleSession(selection, handle, pointer) {
    const baseCanvas = cloneCanvas(selection.floating);
    const baseBounds = {
      left: Math.round(selection.transform?.x ?? selection.bounds.x),
      top: Math.round(selection.transform?.y ?? selection.bounds.y),
      width: selection.bounds.w,
      height: selection.bounds.h,
    };
    const center = {
      x: baseBounds.left + baseBounds.width / 2,
      y: baseBounds.top + baseBounds.height / 2,
    };
    return {
      handle,
      type: handle.type,
      baseCanvas,
      baseBounds,
      center,
      startAngle: Math.atan2(pointer.y - center.y, pointer.x - center.x),
    };
  }

  function applyHandleScale(selection, session, pointer, constrain) {
    if (!session || !session.baseCanvas) return;
    const base = session.baseBounds;
    const handle = session.handle;
    const anchor = handle.anchor || { x: base.left + base.width, y: base.top + base.height };

    let left = base.left;
    let top = base.top;
    let width = base.width;
    let height = base.height;

    switch (handle.id) {
      case 'nw':
        width = Math.max(1, anchor.x - pointer.x);
        height = Math.max(1, anchor.y - pointer.y);
        left = anchor.x - width;
        top = anchor.y - height;
        break;
      case 'ne':
        width = Math.max(1, pointer.x - anchor.x);
        height = Math.max(1, anchor.y - pointer.y);
        left = anchor.x;
        top = anchor.y - height;
        break;
      case 'se':
        width = Math.max(1, pointer.x - anchor.x);
        height = Math.max(1, pointer.y - anchor.y);
        left = anchor.x;
        top = anchor.y;
        break;
      case 'sw':
        width = Math.max(1, anchor.x - pointer.x);
        height = Math.max(1, pointer.y - anchor.y);
        left = anchor.x - width;
        top = anchor.y;
        break;
      case 'n':
        height = Math.max(1, anchor.y - pointer.y);
        top = anchor.y - height;
        left = base.left;
        width = base.width;
        break;
      case 's':
        height = Math.max(1, pointer.y - anchor.y);
        top = anchor.y;
        left = base.left;
        width = base.width;
        break;
      case 'e':
        width = Math.max(1, pointer.x - anchor.x);
        left = anchor.x;
        top = base.top;
        height = base.height;
        break;
      case 'w':
        width = Math.max(1, anchor.x - pointer.x);
        left = anchor.x - width;
        top = base.top;
        height = base.height;
        break;
      default:
        break;
    }

    if (constrain && handle.isCorner) {
      const ratio = base.width / base.height || 1;
      if (width / height > ratio) {
        width = height * ratio;
      } else {
        height = width / ratio;
      }
      if (handle.id.includes('n')) {
        top = anchor.y - height;
      } else if (handle.id.includes('s')) {
        top = anchor.y;
      }
      if (handle.id.includes('w')) {
        left = anchor.x - width;
      } else if (handle.id.includes('e')) {
        left = anchor.x;
      }
    }

    applyScaledSnapshot(selection, session, { left, top, width, height });
  }

  function applyHandleRotation(selection, session, pointer) {
    if (!session || !session.baseCanvas) return;
    const angle = Math.atan2(pointer.y - session.center.y, pointer.x - session.center.x);
    const delta = angle - session.startAngle;
    applyRotatedSnapshot(selection, session, delta);
  }

  function applyScaledSnapshot(selection, session, bounds) {
    if (!selection || !session.baseCanvas) return;
    const newW = Math.max(1, Math.round(bounds.width));
    const newH = Math.max(1, Math.round(bounds.height));
    if (newW <= 0 || newH <= 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(session.baseCanvas, 0, 0, canvas.width, canvas.height);
    selection.floating = canvas;
    selection.bounds.w = newW;
    selection.bounds.h = newH;
    selection.transform.x = Math.round(bounds.left);
    selection.transform.y = Math.round(bounds.top);
    selection.transform.scaleX = newW / session.baseBounds.width;
    selection.transform.scaleY = newH / session.baseBounds.height;
    selection.transform.rotation = 0;
  }

  function applyRotatedSnapshot(selection, session, radians) {
    if (!selection || !session.baseCanvas) return;
    const base = session.baseCanvas;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const newW = Math.max(1, Math.round(base.width * cos + base.height * sin));
    const newH = Math.max(1, Math.round(base.width * sin + base.height * cos));
    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(radians);
    ctx.drawImage(base, -base.width / 2, -base.height / 2);
    selection.floating = canvas;
    selection.bounds.w = newW;
    selection.bounds.h = newH;
    selection.transform.x = Math.round(session.center.x - newW / 2);
    selection.transform.y = Math.round(session.center.y - newH / 2);
    selection.transform.rotation = (radians * 180) / Math.PI;
  }

  function cloneCanvas(source) {
    if (!source) return null;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  function pivotHitTest(point) {
    if (!point || App.pivotMode !== 'custom') return false;
    const pivot = getActiveFramePivot();
    if (!pivot) return false;
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    return (dx * dx + dy * dy) <= PIVOT_HIT_RADIUS_SQ;
  }

  function movePivotToPointer(point) {
    if (!point) return;
    const maxX = Math.max(0, (App.size?.w || 1) - 1);
    const maxY = Math.max(0, (App.size?.h || 1) - 1);
    const next = {
      x: Math.max(0, Math.min(maxX, point.x)),
      y: Math.max(0, Math.min(maxY, point.y)),
    };
    App.pivotMode = 'custom';
    setActiveFramePivot(next);
  }
}

// === Enter to commit, Esc to cancel (for an active floating selection) ===
// Uses global currentSelection. Never touches app/App.selection.
// Stops ants and overlay cleanly to avoid stale RAF errors afterward.
function wireSelectionConfirmKeys() {
  if (window.__sl_commitKeysBound) return;
  window.__sl_commitKeysBound = true;

  const onKey = (e) => {
    if (isEditableElement(document.activeElement)) return;
    const activeSelection = currentSelection;
    if (!activeSelection) return;
    const layerCtx = getActiveLayerCtx();
    if (!layerCtx) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      try {
        stopSelectionOverlay && stopSelectionOverlay(activeSelection);
        commitSelection(layerCtx, activeSelection);
        requestCompositeRender();
      } finally {
        setCurrentSelection(null);
        if (ctxOverlay && overlay) ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
        if (lastHover) renderHover(lastHover.x, lastHover.y);
        setStatus && setStatus('Committed selection');
        pushHistory('Commit selection');
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      try {
        stopSelectionOverlay && stopSelectionOverlay(activeSelection);
        cancelSelection(layerCtx, activeSelection);
        requestCompositeRender();
      } finally {
        setCurrentSelection(null);
        if (ctxOverlay && overlay) ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
        if (lastHover) renderHover(lastHover.x, lastHover.y);
        setStatus && setStatus('Canceled selection');
      }
      return;
    }
  };

  window.addEventListener('keydown', onKey, true);
}

function wireSelectionClipboardControls() {
  const btnCut = document.getElementById('selCutBtn');
  const btnCopy = document.getElementById('selCopyBtn');
  const btnPaste = document.getElementById('selPasteBtn');
  const btnDelete = document.getElementById('selDeleteBtn');

  const requireSelection = () => {
    if (!currentSelection) {
      setStatus && setStatus('No active selection.');
      return null;
    }
    return currentSelection;
  };

  btnCopy?.addEventListener('click', () => {
    const sel = requireSelection();
    if (!sel) return;
    copySelectionToClipboard(sel);
    setStatus && setStatus('Selection copied.');
  });

  btnCut?.addEventListener('click', () => {
    const sel = requireSelection();
    if (!sel) return;
    const activeCtx = getActiveLayerCtx();
    if (!activeCtx) return;
    copySelectionToClipboard(sel);
    deleteSelectionFromCanvas(activeCtx, sel);
    cancelSelection(activeCtx, sel);
    setCurrentSelection(null);
    requestCompositeRender();
    setStatus && setStatus('Selection cut.');
    pushHistory('Cut selection');
  });

  btnPaste?.addEventListener('click', () => {
    if (pasteSelectionFromClipboard()) {
      renderSelectionOverlay(ctxOverlay, currentSelection);
      setStatus && setStatus('Selection pasted.');
      pushHistory('Paste selection');
    } else {
      setStatus && setStatus('Nothing to paste.');
    }
  });

  btnDelete?.addEventListener('click', () => {
    const sel = requireSelection();
    if (!sel) return;
    const activeCtx = getActiveLayerCtx();
    if (!activeCtx) return;
    deleteSelectionFromCanvas(activeCtx, sel);
    cancelSelection(activeCtx, sel);
    setCurrentSelection(null);
    requestCompositeRender();
    setStatus && setStatus('Selection deleted.');
    pushHistory('Delete selection');
  });
}

function wireProjectHeaderControls() {
  const btnNew = document.getElementById('btnNew');
  const btnOpen = document.getElementById('btnOpen');
  const btnSave = document.getElementById('btnSave');
  const btnImportProject = document.getElementById('btnImportProject');
  const btnExportProject = document.getElementById('btnExportProject');
  const btnImportAnimation = document.getElementById('btnImportAnimation');
  const btnExportAnimation = document.getElementById('btnExportAnimation');
  const fileInput = document.getElementById('projectOpenInput');

  btnNew?.addEventListener('click', () => {
    if (confirm('Start a new sprite? Unsaved changes will be lost.')) {
      window.location.reload();
    }
  });

  btnOpen?.addEventListener('click', () => {
    if (typeof localStorage === 'undefined') {
      setStatus && setStatus('Browser storage unavailable.');
      return;
    }
    try {
      const raw = localStorage.getItem(LOCAL_PROJECT_KEY);
      if (!raw) {
        setStatus && setStatus('No saved project in browser.');
        return;
      }
      const data = JSON.parse(raw);
      loadProjectData(data);
      setStatus && setStatus('Project loaded from browser.');
    } catch (err) {
      console.error('Failed to load browser project', err);
      setStatus && setStatus('Failed to load browser project.');
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        loadProjectData(data);
      } catch (err) {
        console.error('Failed to open project', err);
        setStatus && setStatus('Failed to open project.');
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      console.error('Failed to read project file');
      setStatus && setStatus('Failed to open project.');
      input.value = '';
    };
    reader.readAsText(file);
  });

  btnSave?.addEventListener('click', () => {
    if (typeof localStorage === 'undefined') {
      setStatus && setStatus('Browser storage unavailable.');
      return;
    }
    try {
      const payload = serializeProject();
      localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(payload));
      setStatus && setStatus('Project saved in browser.');
    } catch (err) {
      console.error('Failed to save project locally', err);
      setStatus && setStatus('Failed to save in browser.');
    }
  });

  btnImportProject?.addEventListener('click', () => fileInput?.click());
  btnExportProject?.addEventListener('click', () => downloadProjectFile());
  btnImportAnimation?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.spritelab,.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          window.dispatchEvent(new CustomEvent('app:importAnimationData', { detail: data }));
          setStatus && setStatus('Animation imported.');
        } catch (err) {
          console.error('Failed to import animation', err);
          setStatus && setStatus('Failed to import animation.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });

  btnExportAnimation?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('app:exportAnimationRequested'));
  });

  const docTitleInput = document.getElementById('docTitle');
  if (docTitleInput) {
    docTitleInput.value = App.docTitle || 'sprite_lab';
    docTitleInput.addEventListener('input', () => {
      App.docTitle = docTitleInput.value.trim();
    });
  }

  function downloadProjectFile() {
    try {
      const payload = serializeProject();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const safeName = `${(payload.docTitle || 'sprite_lab').replace(/[^a-z0-9_-]+/gi, '_')}.spritelab`;
      downloadBlob(blob, safeName);
      setStatus && setStatus('Project exported.');
    } catch (err) {
      console.error('Failed to export project', err);
      setStatus && setStatus('Failed to export project.');
    }
  }
}

function wireExportModal() {
  wireModalToggle('openExportModal', 'exportModal');
}

function wireHelpModal() {
  wireModalToggle('openHelpModal', 'helpModal');
}

function wireModalToggle(triggerId, modalId) {
  if (!window.__sl_modalBound) window.__sl_modalBound = new Set();
  if (window.__sl_modalBound.has(modalId)) return;

  const trigger = document.getElementById(triggerId);
  const modal = document.getElementById(modalId);
  if (!trigger || !modal) return;
  window.__sl_modalBound.add(modalId);

  const dialog = modal.querySelector('.modal-dialog');
  const closeTargets = modal.querySelectorAll('[data-modal-close]');
  let lastFocused = null;

  const updateBodyState = () => {
    if (!document.querySelector('.modal.is-open')) {
      document.body?.classList.remove('is-modal-open');
    } else {
      document.body?.classList.add('is-modal-open');
    }
  };

  const setOpen = (isOpen) => {
    modal.classList.toggle('is-open', isOpen);
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (isOpen) {
      lastFocused = document.activeElement;
      if (dialog && typeof dialog.focus === 'function') {
        dialog.focus({ preventScroll: true });
      }
    } else {
      const fallback = lastFocused || trigger;
      if (fallback && typeof fallback.focus === 'function') fallback.focus();
      lastFocused = null;
    }
    updateBodyState();
  };

  const open = () => setOpen(true);
  const close = () => setOpen(false);

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    open();
  });

  closeTargets.forEach(target => {
    target.addEventListener('click', (event) => {
      event.preventDefault();
      close();
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      event.preventDefault();
      close();
    }
  });
}

function wirePanelMetaLabels() {
  const animLabel = document.getElementById('activeAnimationLabel');
  const layerLabel = document.getElementById('activeLayerLabel');

  const setAnimLabel = (name) => {
    if (animLabel) animLabel.textContent = name || '--';
  };
  const setLayerLabel = (name) => {
    if (layerLabel) layerLabel.textContent = name || '--';
  };

  window.addEventListener('app:animationChanged', (event) => {
    setAnimLabel(event?.detail?.name || '--');
  });

  window.addEventListener('app:animationRenamed', (event) => {
    if (!event?.detail) return;
    if (event.detail.id === App.activeAnimationId) {
      setAnimLabel(event.detail.name || '--');
    }
  });

  window.addEventListener('app:activeLayerChanged', (event) => {
    const name = event?.detail?.layer?.name;
    if (name) setLayerLabel(name);
    else setLayerLabel(getActiveLayer()?.name || '--');
  });

  window.addEventListener('app:layersChanged', () => {
    const active = getActiveLayer();
    setLayerLabel(active?.name || '--');
  });

  const initialAnim = (App.animations || []).find(a => a.id === App.activeAnimationId) || App.animations?.[0];
  if (initialAnim && !App.activeAnimationId) App.activeAnimationId = initialAnim.id;
  setAnimLabel(initialAnim?.name || '--');
  const initialLayer = getActiveLayer();
  setLayerLabel(initialLayer?.name || '--');
}

const PIVOT_ANCHORS = {
  tl: { x: 0, y: 0 },
  tc: { x: 0.5, y: 0 },
  tr: { x: 1, y: 0 },
  cl: { x: 0, y: 0.5 },
  c:  { x: 0.5, y: 0.5 },
  cr: { x: 1, y: 0.5 },
  bl: { x: 0, y: 1 },
  bc: { x: 0.5, y: 1 },
  br: { x: 1, y: 1 },
};

function wirePivotControls() {
  if (window.__sl_pivotBound) return;
  window.__sl_pivotBound = true;
  const select = document.getElementById('pivotSelect');
  if (!select) return;
  const toggle = document.getElementById('pivotShowToggle');
  const pivotXReadout = document.getElementById('pivotXReadout');
  const pivotYReadout = document.getElementById('pivotYReadout');
  if (toggle) {
    toggle.checked = !!App.showPivot;
    toggle.addEventListener('change', () => {
      App.showPivot = !!toggle.checked;
      renderPivotIndicator();
    });
  }

  const updatePivotReadout = (pivot) => {
    const format = (value) => (Number.isFinite(value) ? value : '--');
    if (pivotXReadout) pivotXReadout.textContent = `X: ${format(pivot?.x)}`;
    if (pivotYReadout) pivotYReadout.textContent = `Y: ${format(pivot?.y)}`;
  };

  const refresh = () => {
    const pivot = getActiveFramePivot();
    updatePivotReadout(pivot);
    const key = getNearestPivotKey(pivot);
    const anchorPivot = computePivotFromKey(key);
    const matchesAnchor = pivot && anchorPivot && pivot.x === anchorPivot.x && pivot.y === anchorPivot.y;
    if (App.pivotMode !== 'custom') {
      App.pivotMode = matchesAnchor ? 'anchor' : 'custom';
    }
    const desired = App.pivotMode === 'custom' ? 'custom' : key;
    if (select.value !== desired) select.value = desired;
    renderPivotIndicator();
  };

  select.addEventListener('change', () => {
    const key = select.value || 'c';
    if (key === 'custom') {
      App.pivotMode = 'custom';
      refresh();
      return;
    }
    App.pivotMode = 'anchor';
    const current = getActiveFramePivot();
    const target = computePivotFromKey(key);
    if (current && current.x === target.x && current.y === target.y) {
      refresh();
      return;
    }
    setActiveFramePivot(target);
    refresh();
    pushHistory('Pivot change');
  });

  window.addEventListener('app:pivotChanged', refresh);
  window.addEventListener('app:frameSelected', refresh);
  window.addEventListener('app:framesChanged', refresh);
  refresh();
}

function computePivotFromKey(key) {
  const anchor = PIVOT_ANCHORS[key] || PIVOT_ANCHORS.c;
  const w = Math.max(0, (App.size?.w || 1) - 1);
  const h = Math.max(0, (App.size?.h || 1) - 1);
  return {
    x: Math.round(anchor.x * w),
    y: Math.round(anchor.y * h),
  };
}

function getNearestPivotKey(pivot) {
  if (!pivot) return 'c';
  const w = Math.max(1, (App.size?.w || 1) - 1);
  const h = Math.max(1, (App.size?.h || 1) - 1);
  const rx = w ? pivot.x / w : 0;
  const ry = h ? pivot.y / h : 0;
  let bestKey = 'c';
  let bestDist = Infinity;
  Object.entries(PIVOT_ANCHORS).forEach(([key, anchor]) => {
    const dx = rx - anchor.x;
    const dy = ry - anchor.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  });
  return bestKey;
}

function wireOnionControls() {
  const toggle = document.getElementById('onionToggle');
  const prevInput = document.getElementById('onionPrev');
  const nextInput = document.getElementById('onionNext');
  const opacityInput = document.getElementById('onionOpacity');
  const opacityReadout = document.getElementById('onionOpacityValue');
  if (toggle) {
    toggle.checked = !!App.onion.enabled;
    toggle.addEventListener('change', () => {
      App.onion.enabled = toggle.checked;
      updateOnionInputsState(toggle.checked, { prevInput, nextInput, opacityInput });
      renderOnionSkins();
    });
  }

  if (prevInput) {
    prevInput.value = String(App.onion.prev ?? 1);
    prevInput.addEventListener('change', () => {
      App.onion.prev = clampInt(prevInput.value, 0, 5, App.onion.prev);
      prevInput.value = String(App.onion.prev);
      renderOnionSkins();
    });
  }

  if (nextInput) {
    nextInput.value = String(App.onion.next ?? 1);
    nextInput.addEventListener('change', () => {
      App.onion.next = clampInt(nextInput.value, 0, 5, App.onion.next);
      nextInput.value = String(App.onion.next);
      renderOnionSkins();
    });
  }

  if (opacityInput) {
    opacityInput.value = String(Math.round((App.onion.opacity ?? 0.35) * 100));
    opacityReadout && (opacityReadout.textContent = `${opacityInput.value}%`);
    opacityInput.addEventListener('input', () => {
      const pct = clampInt(opacityInput.value, 5, 100, 35);
      opacityInput.value = String(pct);
      App.onion.opacity = pct / 100;
      if (opacityReadout) opacityReadout.textContent = `${pct}%`;
      renderOnionSkins();
    });
  }

  updateOnionInputsState(App.onion.enabled, { prevInput, nextInput, opacityInput });
  window.addEventListener('app:frameSelected', renderOnionSkins);
  window.addEventListener('app:framesChanged', renderOnionSkins);
}

function updateOnionInputsState(enabled, inputs) {
  const els = Object.values(inputs).filter(Boolean);
  els.forEach(el => { el.disabled = !enabled; });
}


function wireHistoryControls() {
  if (window.__sl_historyWired) return;
  window.__sl_historyWired = true;
  const undoBtn = document.getElementById('btnUndo');
  const redoBtn = document.getElementById('btnRedo');
  undoBtn?.addEventListener('click', () => undo());
  redoBtn?.addEventListener('click', () => redo());

  window.addEventListener('keydown', (e) => {
    if (isEditableElement(document.activeElement)) return;
    const key = e.key?.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  });

  window.addEventListener('app:historyChanged', (evt) => updateHistoryButtons(evt.detail));
  window.addEventListener('app:layerAction', (evt) => {
    const type = evt.detail?.type || 'change';
    pushHistory(`Layer ${type}`, { skipIfUnchanged: true });
  });
  window.addEventListener('app:frameAction', (evt) => {
    const type = evt.detail?.type || 'change';
    pushHistory(`Frame ${type}`, { skipIfUnchanged: true });
  });
  updateHistoryButtons(getHistoryState());
}

function updateHistoryButtons(state = getHistoryState()) {
  const undoBtn = document.getElementById('btnUndo');
  const redoBtn = document.getElementById('btnRedo');
  if (undoBtn) {
    undoBtn.disabled = !state.undo.available;
    undoBtn.title = state.undo.available ? `Undo (${state.undo.label || 'Change'})` : 'Undo';
  }
  if (redoBtn) {
    redoBtn.disabled = !state.redo.available;
    redoBtn.title = state.redo.available ? `Redo (${state.redo.label || 'Change'})` : 'Redo';
  }
}

function renderOnionSkins() {
  if (!ctxOnion || !onion) return;
  ctxOnion.save();
  ctxOnion.setTransform(1, 0, 0, 1, 0, 0);
  ctxOnion.clearRect(0, 0, onion.width, onion.height);
  ctxOnion.restore();
  if (!App.onion.enabled) return;
  const frames = App.frames || [];
  if (!frames.length) return;
  const baseIndex = App.activeFrameIndex ?? 0;
  const settings = App.onion;
  const baseOpacity = Math.max(0.05, Math.min(1, settings.opacity ?? 0.35));
  const prevTint = getOnionTint('prev');
  const nextTint = getOnionTint('next');

  for (let offset = settings.prev; offset >= 1; offset--) {
    const idx = baseIndex - offset;
    if (idx < 0) continue;
    const alpha = baseOpacity * (1 - (offset - 1) / Math.max(1, settings.prev));
    drawOnionFrame(frames[idx], alpha, prevTint);
  }
  for (let offset = 1; offset <= settings.next; offset++) {
    const idx = baseIndex + offset;
    if (idx >= frames.length) break;
    const alpha = baseOpacity * (1 - (offset - 1) / Math.max(1, settings.next));
    drawOnionFrame(frames[idx], alpha, nextTint);
  }
}

function drawOnionFrame(frame, alpha, tint) {
  if (!frame?.snapshot) return;
  const canvas = snapshotToCanvas(frame.snapshot, {
    baseWidth: App.size.w,
    baseHeight: App.size.h,
  });
  ctxOnion.save();
  ctxOnion.globalAlpha = alpha;
  ctxOnion.drawImage(canvas, 0, 0);
  if (tint) {
    ctxOnion.globalCompositeOperation = 'source-atop';
    ctxOnion.fillStyle = tint;
    ctxOnion.fillRect(0, 0, onion.width, onion.height);
  }
  ctxOnion.restore();
}

function getOnionTint(type) {
  const mode = App.onion.tint || 'duo';
  if (mode === 'none') return null;
  if (mode === 'mono') return 'rgba(255,255,255,0.4)';
  return type === 'prev' ? 'rgba(0,255,255,0.45)' : 'rgba(255,0,128,0.45)';
}

function renderPivotIndicator() {
  if (!ctxPivot || !pivotCanvas) return;
  ctxPivot.save();
  ctxPivot.setTransform(1, 0, 0, 1, 0, 0);
  ctxPivot.clearRect(0, 0, pivotCanvas.width, pivotCanvas.height);
  ctxPivot.restore();
  if (!App.showPivot || !App.frames || !App.frames.length) return;
  const pivot = getActiveFramePivot();
  if (!pivot) return;
  ctxPivot.save();
  ctxPivot.translate(0.5, 0.5);
  const len = 6;
  const stroke = Math.max(1 / Math.max(App.zoom || 1, 1), 0.75);
  ctxPivot.strokeStyle = 'rgba(0,0,0,0.65)';
  ctxPivot.lineWidth = stroke * 2;
  ctxPivot.beginPath();
  ctxPivot.moveTo(pivot.x - len, pivot.y);
  ctxPivot.lineTo(pivot.x + len, pivot.y);
  ctxPivot.moveTo(pivot.x, pivot.y - len);
  ctxPivot.lineTo(pivot.x, pivot.y + len);
  ctxPivot.stroke();
  ctxPivot.strokeStyle = 'rgba(255,255,255,0.9)';
  ctxPivot.lineWidth = stroke;
  ctxPivot.beginPath();
  ctxPivot.moveTo(pivot.x - len, pivot.y);
  ctxPivot.lineTo(pivot.x + len, pivot.y);
  ctxPivot.moveTo(pivot.x, pivot.y - len);
  ctxPivot.lineTo(pivot.x, pivot.y + len);
  ctxPivot.stroke();
  ctxPivot.restore();
}


function syncActiveAnimationStateForSave() {
  if (!Array.isArray(App.animations) || !App.activeAnimationId) return;
  const active = App.animations.find(anim => anim.id === App.activeAnimationId);
  if (!active) return;
  active.framesState = getFrameSnapshots();
  active.activeFrameIndex = App.activeFrameIndex ?? 0;
}

function serializeProject() {
  syncActiveAnimationStateForSave();
  const currentFrames = getFrameSnapshots();
  return {
    version: 1,
    size: { w: App.size.w, h: App.size.h },
    fps: App.fps,
    docTitle: App.docTitle || 'sprite_lab',
    frames: serializeFramesForExport(currentFrames),
    activeFrameIndex: App.activeFrameIndex ?? 0,
    showPivot: App.showPivot !== false,
    animations: serializeAnimations(App.animations || []),
    activeAnimationId: App.activeAnimationId || '',
  };
}

function loadProjectData(data) {
  if (!data || !Array.isArray(data.frames)) throw new Error('Invalid project file');
  const size = data.size || { w: App.size.w, h: App.size.h };
  setCanvasSize(size.w, size.h);
  App.fps = data.fps ?? App.fps;
  App.showPivot = data.showPivot ?? App.showPivot;
  if (data.docTitle) {
    App.docTitle = data.docTitle;
    const titleInput = document.getElementById('docTitle');
    if (titleInput) titleInput.value = data.docTitle;
  }
  const decodedFrames = deserializeFrames(data.frames);
  applyFramesState(decodedFrames, data.activeFrameIndex ?? 0);
  if (Array.isArray(data.animations)) {
    App.animations = deserializeAnimations(data.animations);
  } else {
    App.animations = [];
  }
  if (!App.animations.length) {
    const fallbackId = `anim_${Math.random().toString(36).slice(2, 9)}`;
    App.animations = [{
      id: fallbackId,
      name: 'Animation',
      framesState: deserializeFrames(data.frames),
      activeFrameIndex: data.activeFrameIndex ?? 0,
    }];
  }
  if (Array.isArray(App.animations) && App.animations.length) {
    const idSet = new Set(App.animations.map(anim => anim.id));
    const desiredId = (data.activeAnimationId && idSet.has(data.activeAnimationId))
      ? data.activeAnimationId
      : App.animations[0].id;
    App.activeAnimationId = desiredId;
    const activeAnim = App.animations.find(anim => anim.id === desiredId);
    if (activeAnim) {
      window.dispatchEvent(new CustomEvent('app:animationChanged', { detail: { id: activeAnim.id, name: activeAnim.name } }));
    }
  }
  refreshAnimationsPanel();
  renderPivotIndicator();
  renderOnionSkins();
  pushHistory('Open project', { skipIfUnchanged: false });
  setStatus && setStatus('Project loaded.');
}

// ===================================================================

// Canvas size change (from top bar)
export function setCanvasSize(w, h) {
  const newW = clampInt(w, 1, 4096, App.size.w);
  const newH = clampInt(h, 1, 4096, App.size.h);
  if (newW === App.size.w && newH === App.size.h) return;

  App.size.w = newW;
  App.size.h = newH;

  if (Array.isArray(App.frames)) {
    App.frames.forEach(frame => {
      if (!frame.pivot) return;
      frame.pivot.x = Math.max(0, Math.min(newW - 1, Math.round(frame.pivot.x)));
      frame.pivot.y = Math.max(0, Math.min(newH - 1, Math.round(frame.pivot.y)));
    });
  }

  sizeBackings();
  resizeLayerCanvases(newW, newH);
  requestCompositeRender();

  const sizeW = document.getElementById('sizeW'); if (sizeW) sizeW.value = String(newW);
  const sizeH = document.getElementById('sizeH'); if (sizeH) sizeH.value = String(newH);
  applyCssSizes();
  requestAnimationFrame(centerInWrap);

  setStatus(`Canvas ${newW}×${newH}`);
  renderPivotIndicator();
  window.dispatchEvent(new CustomEvent('app:pivotChanged', {
    detail: { pivot: getActiveFramePivot(), frameIndex: App.activeFrameIndex },
  }));
}

// Init
function init() {
  App.tool = ''
  buildPanels(App);           // creates UI, wires generic handlers
  initDomRefs();
  sizeBackings();
  applyCssSizes();
  requestAnimationFrame(centerInWrap);
  wireWheelZoom();
  wireGlobalEvents();

  // Tools
  wirePencil();
  wireMirrorTool('mirrorx');
  wireMirrorTool('mirrory');
  wireEraser();
  wireLine();
  wireRect();
  wireFill();
  wireEllipse();
  wireEyedropper(); // ADD
  wirePicker();
  wireSelectTool();
  wireLassoTool();
  wireMoveTool();
  wireClipboardShortcuts();
  initFramesTimeline(App);
  initAnimationsPanel(App);
  initPreviewPlayer(App);
  setupImportControls(App);
  wireExportModal();
  wireHelpModal();
  wireProjectHeaderControls();
  initExportControls(App);
  wireSelectionConfirmKeys();
  wireSelectionClipboardControls();
  wirePivotControls();
  wireOnionControls();
  wirePanelMetaLabels();
  wireHistoryControls();
  initHistory(App);

  // Enrich titles + footer cheatsheet
  enhanceToolHelp();
  updateCursorForTool(App.tool);

  renderPivotIndicator();
  renderOnionSkins();

  setStatus('Ready.');
}
window.addEventListener('DOMContentLoaded', init);

// Utils
function clampInt(val, min, max, fallback) {
  const n = Math.round(Number(val));
  if (Number.isFinite(n)) return Math.max(min, Math.min(max, n));
  return fallback;
}

