// src/canvas/selection.js
// Floating selection: lift/cancel/commit + overlay rendering with marching ants.
// MOVE-only transform here (scale/rotate added later).

import { cropMask } from './mask.js';
import { setClipboardFromSelection } from './clipboard.js';

const HANDLE_SIZE_PX = 5;
const ROTATE_OFFSET_PX = 20;

// ---- internal overlay render loop state (for marching ants) ----
let _raf = 0;
let _antsPhase = 0;
let _lastTs = 0;
let _overlayCtx = null;
let _currentSel = null;

/** Advance marching-ants and re-render overlay each frame */
function startAntsLoop() {
  if (_raf) return;
  const step = (ts) => {
    _raf = requestAnimationFrame(step);

    // bail if no ctx or no selection
    if (!_overlayCtx || !_currentSel) return;

    if (!_lastTs) _lastTs = ts;
    const dt = Math.min(100, ts - _lastTs);
    _lastTs = ts;
    _antsPhase = (_antsPhase + (dt * 0.008)) % 8; // ~8px/sec

    const g = _overlayCtx;
    g.save();
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);

    // 1) floating bitmap (safe-guard: only draw when it's a real canvas-like object)
    const flo = _currentSel.floating;
    const tx = Math.round(_currentSel.transform?.x ?? _currentSel.bounds?.x ?? 0);
    const ty = Math.round(_currentSel.transform?.y ?? _currentSel.bounds?.y ?? 0);

    const isCanvas =
      flo &&
      (flo instanceof HTMLCanvasElement ||
        (typeof OffscreenCanvas !== 'undefined' && flo instanceof OffscreenCanvas) ||
        (flo.getContext && flo.width && flo.height));

    if (isCanvas) {
      g.drawImage(flo, tx, ty);
    }

    // 2) marching ants rect (always, if we have bounds)
    const { w = 0, h = 0 } = _currentSel.bounds || {};
    const z = Math.max(1, (window.App?.zoom) || 1);
    const lw = Math.max(1 / z, 0.5);

    let handles = [];

    if (w > 0 && h > 0) {
      g.lineWidth = lw;
      g.setLineDash([4 / z, 4 / z]);

      // black pass
      g.strokeStyle = 'rgba(0,0,0,0.9)';
      g.lineDashOffset = -_antsPhase;
      g.strokeRect(tx + 0.5 * lw, ty + 0.5 * lw, Math.max(0, w - lw), Math.max(0, h - lw));

      // white pass (phase-shifted)
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineDashOffset = (8 - _antsPhase) % 8;
      g.strokeRect(tx + 0.5 * lw, ty + 0.5 * lw, Math.max(0, w - lw), Math.max(0, h - lw));
    }

    handles = computeSelectionHandles(tx, ty, w, h, z);
    _currentSel._handles = handles;
    drawHandles(g, handles, z);

    g.restore();
  };
  _raf = requestAnimationFrame(step);
}
function stopAntsLoop() {
  if (_raf) cancelAnimationFrame(_raf);
  _raf = 0;
  _antsPhase = 0;
  _lastTs = 0;
}

// ------------------- internal utils -------------------

function cloneImageData(img) {
  // Create a deep copy (do NOT mutate the source)
  const copy = new ImageData(img.width, img.height);
  copy.data.set(img.data);
  return copy;
}

// ------------------- public API -------------------

/**
 * Lift pixels into a floating selection.
 * - Saves a TRUE pre-erase backup as selection.originalPatch (for cancel or copy-dup)
 * - Writes an erased patch back to the draw canvas (selected pixels cleared)
 * - Builds a floating canvas with only the selected pixels
 */
export function liftSelection(ctxDraw, bounds, maskFull, canvasW, canvasH) {
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) return null;

  // 1) TRUE backup BEFORE any mutation
  const preErasePatch = ctxDraw.getImageData(bounds.x, bounds.y, bounds.w, bounds.h);

  // 2) Local mask within bounds
  const maskLocal = cropMask(maskFull, canvasW, canvasH, bounds);

  // 3) Floating canvas (selected pixels only) from the TRUE backup
  const floating = document.createElement('canvas');
  floating.width = bounds.w;
  floating.height = bounds.h;
  const fctx = floating.getContext('2d', { willReadFrequently: true });
  fctx.imageSmoothingEnabled = false;

  const outData = fctx.createImageData(bounds.w, bounds.h);
  const dst = outData.data;
  const src = preErasePatch.data; // RGBA from true backup

  for (let i = 0, p = 0; i < maskLocal.length; i++, p += 4) {
    if (maskLocal[i]) {
      dst[p+0] = src[p+0];
      dst[p+1] = src[p+1];
      dst[p+2] = src[p+2];
      dst[p+3] = src[p+3];
    } else {
      dst[p+3] = 0; // keep transparent
    }
  }
  fctx.putImageData(outData, 0, 0);

  // 4) Create an ERASED patch (copy of true backup, with selected pixels zeroed) and write it back
  const erasedPatch = cloneImageData(preErasePatch);
  const ed = erasedPatch.data;
  for (let i = 0, p = 0; i < maskLocal.length; i++, p += 4) {
    if (maskLocal[i]) {
      ed[p+0] = 0; ed[p+1] = 0; ed[p+2] = 0; ed[p+3] = 0;
    }
  }
  ctxDraw.putImageData(erasedPatch, bounds.x, bounds.y);

  // 5) Build selection object
  return {
    bounds: { ...bounds },
    floating,
    originalPatch: preErasePatch, // TRUE original backup for cancel/duplicate-on-copy
    transform: { x: bounds.x, y: bounds.y, scaleX: 1, scaleY: 1, rotation: 0 },
    _maskLocal: maskLocal,
    _state: 'transform',
    _restored: false, // becomes true if we restore original under selection (for copy)
  };
}

function computeSelectionHandles(tx, ty, w, h, zoom) {
  if (w <= 0 || h <= 0) return [];
  const zoomSafe = Math.max(zoom || 1, 0.5);
  const rawSize = HANDLE_SIZE_PX / Math.max(0.75, zoomSafe);
  const size = Math.min(8, Math.max(2.5, rawSize));
  const half = size / 2;
  const cx = tx + w / 2;
  const cy = ty + h / 2;
  const bottom = ty + h;
  const right = tx + w;
  const rotateOffset = ROTATE_OFFSET_PX / zoom;

  const handles = [];
  const push = (type, id, x, y, cursor, anchor, opts = {}) => {
    handles.push({
      type,
      id,
      x,
      y,
      size,
      cursor,
      anchor,
      radius: size,
      isCorner: opts.isCorner || false,
    });
  };

  push('scale', 'nw', tx, ty, 'nwse-resize', { x: right, y: bottom }, { isCorner: true });
  push('scale', 'n', cx, ty, 'ns-resize', { x: cx, y: bottom });
  push('scale', 'ne', right, ty, 'nesw-resize', { x: tx, y: bottom }, { isCorner: true });
  push('scale', 'e', right, cy, 'ew-resize', { x: tx, y: cy });
  push('scale', 'se', right, bottom, 'nwse-resize', { x: tx, y: ty }, { isCorner: true });
  push('scale', 's', cx, bottom, 'ns-resize', { x: cx, y: ty });
  push('scale', 'sw', tx, bottom, 'nesw-resize', { x: right, y: ty }, { isCorner: true });
  push('scale', 'w', tx, cy, 'ew-resize', { x: right, y: cy });

  push('rotate', 'rotate', cx, ty - rotateOffset, 'alias', { x: cx, y: cy });

  return handles;
}

function drawHandles(g, handles, zoom) {
  if (!handles || !handles.length) return;
  const lineWidth = Math.max(1 / zoom, 0.5);
  handles.forEach(handle => {
    if (handle.type === 'rotate') {
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = lineWidth;
      g.beginPath();
      g.moveTo(handle.anchor.x, handle.anchor.y - (handle.anchor.y - handle.y) / 2);
      g.lineTo(handle.x, handle.y);
      g.stroke();
      g.beginPath();
      g.fillStyle = '#111';
      g.arc(handle.x, handle.y, handle.size / 1.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = lineWidth;
      g.stroke();
      return;
    }
    g.fillStyle = '#111';
    g.fillRect(handle.x - handle.size / 2, handle.y - handle.size / 2, handle.size, handle.size);
    g.strokeStyle = '#fff';
    g.lineWidth = lineWidth;
    g.strokeRect(handle.x - handle.size / 2, handle.y - handle.size / 2, handle.size, handle.size);
  });
}

/**
 * Render/refresh overlay preview and start marching ants.
 */
export function renderSelectionOverlay(ctxOverlay, selection) {
  _overlayCtx = ctxOverlay || _overlayCtx;
  _currentSel = selection || _currentSel;

  if (!_overlayCtx || !_currentSel) {
    stopAntsLoop();
    if (_overlayCtx) {
      _overlayCtx.clearRect(0, 0, _overlayCtx.canvas.width, _overlayCtx.canvas.height);
    }
    return;
  }
  startAntsLoop();
}

/** Public: stop overlay ants + clear overlay safely. */
export function stopSelectionOverlay(selection) {
  // ignore param; we keep one overlay & current selection globally
  stopAntsLoop();
  if (_overlayCtx) {
    _overlayCtx.clearRect(0, 0, _overlayCtx.canvas.width, _overlayCtx.canvas.height);
  }
}

// Commit the floating selection to ctxDraw at the current transform.
// Safely no-op if floating is missing or not a canvas.
export function commitSelection(ctxDraw, selection) {
  if (!ctxDraw || !selection || !selection.bounds) return;

  // Stop ants loop before mutating
  stopAntsLoop();

  const { bounds, transform, floating } = selection;
  const x = Math.round(transform?.x ?? bounds.x);
  const y = Math.round(transform?.y ?? bounds.y);

  // Only draw if we truly have a canvas-like bitmap
  const isCanvas =
    floating &&
    (floating instanceof HTMLCanvasElement ||
     (typeof OffscreenCanvas !== 'undefined' && floating instanceof OffscreenCanvas) ||
     (floating.getContext && floating.width && floating.height));

  if (isCanvas) {
    ctxDraw.save();
    ctxDraw.imageSmoothingEnabled = false;
    ctxDraw.drawImage(floating, x, y);
    ctxDraw.restore();
  }

  // Clear selection internals
  selection.floating   = null;
  selection._maskLocal = null;
  selection.originalPatch = null;
}

// Cancel the selection:
//  - If it was from a lift (destructive), restore originalPatch under its current transform.
//  - If it was a paste (non-destructive), just drop it.
export function cancelSelection(ctxDraw, selection) {
  if (!selection) return;

  // Stop ants loop before mutating
  stopAntsLoop();

  const { bounds, originalPatch, _restored } = selection;
  const x = Math.round(bounds?.x ?? 0);
  const y = Math.round(bounds?.y ?? 0);

  // Only restore if we actually have original pixels and this selection was destructive (lift)
  if (ctxDraw && originalPatch && _restored === false) {
    try {
      ctxDraw.putImageData(originalPatch, x, y);
    } catch {
      // ignore putImageData errors if coords are off-canvas
    }
  }

  selection.floating = null;
  selection._maskLocal = null;
  selection.originalPatch = null;
}

/** Hit test for MOVE (inside rect). */
export function hitInside(selection, px, py) {
  if (!selection) return false;
  const { x, y } = selection.transform;
  const { w, h } = selection.bounds;
  return px >= x && py >= y && px < x + w && py < y + h;
}

/** Update transform for dragging move. */
export function moveBy(selection, dx, dy) {
  if (!selection) return;
  selection.transform.x += dx;
  selection.transform.y += dy;
}

function recalcTransformAfterResize(selection, oldW, oldH) {
  const centerX = selection.transform.x + oldW / 2;
  const centerY = selection.transform.y + oldH / 2;
  selection.transform.x = Math.round(centerX - selection.bounds.w / 2);
  selection.transform.y = Math.round(centerY - selection.bounds.h / 2);
}

function assignNewFloating(selection, canvas) {
  selection.floating = canvas;
  selection.transform.rotation = selection.transform.rotation || 0;
  selection.transform.scaleX = selection.transform.scaleX || 1;
  selection.transform.scaleY = selection.transform.scaleY || 1;
}

export function rotateSelectionCanvas(selection, degrees) {
  if (!selection || !selection.floating) return false;
  const src = selection.floating;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const newW = Math.max(1, Math.round(src.width * cos + src.height * sin));
  const newH = Math.max(1, Math.round(src.width * sin + src.height * cos));
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(radians);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  const oldW = selection.bounds.w;
  const oldH = selection.bounds.h;
  selection.bounds.w = newW;
  selection.bounds.h = newH;
  assignNewFloating(selection, canvas);
  selection.transform.rotation = ((selection.transform.rotation || 0) + degrees) % 360;
  recalcTransformAfterResize(selection, oldW, oldH);
  return true;
}

export function scaleSelectionCanvas(selection, factor) {
  if (!selection || !selection.floating) return false;
  const normalized = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const src = selection.floating;
  const newW = Math.max(1, Math.round(src.width * normalized));
  const newH = Math.max(1, Math.round(src.height * normalized));
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, newW, newH);
  const oldW = selection.bounds.w;
  const oldH = selection.bounds.h;
  selection.bounds.w = newW;
  selection.bounds.h = newH;
  assignNewFloating(selection, canvas);
  selection.transform.scaleX = (selection.transform.scaleX || 1) * normalized;
  selection.transform.scaleY = (selection.transform.scaleY || 1) * normalized;
  recalcTransformAfterResize(selection, oldW, oldH);
  return true;
}

/** Real-element client→canvas delta (kept for compatibility). */
export function deltaFromClientToCanvasRect(prevClient, nextClient, drawCanvas, zoom, elem) {
  const el = elem || drawCanvas;
  const scaleX = el.clientWidth  / el.width;
  const scaleY = el.clientHeight / el.height;
  const dx = Math.round((nextClient.x - prevClient.x) / Math.max(scaleX, 0.0001));
  const dy = Math.round((nextClient.y - prevClient.y) / Math.max(scaleY, 0.0001));
  return { dx, dy };
}

/**
 * NEW: Restore the original pixels UNDER the selection's original bounds.
 * Use this right after a Copy to make "Copy" non-destructive (original stays).
 */
export function restoreOriginalUnderSelection(ctxDraw, selection) {
  if (!selection || selection._restored) return;
  if (!selection.originalPatch) return;
  const { bounds, originalPatch } = selection;
  ctxDraw.putImageData(originalPatch, bounds.x, bounds.y);
  selection._restored = true;
}

// Copy the current floating selection to the internal clipboard (non-destructive).
// Safe to call regardless of whether the selection came from a lift (masked)
// or from a paste (unmasked).
export function copySelectionToClipboard(selection) {
  if (!selection || !selection.floating) return;
  setClipboardFromSelection(selection);
}

/**
 * Destructively erase the pixels under the selection at its CURRENT transform.
 * - If the selection has a local mask (_maskLocal from a lift), we erase only masked pixels.
 * - If there is no mask (e.g., pasted selection), we erase the entire floating rect.
 * After erasing, the selection remains active (use cancelSelection/commitSelection outside).
 */
export function deleteSelectionFromCanvas(ctxDraw, selection) {
  if (!selection || !ctxDraw) return;

  const { bounds, transform, _maskLocal } = selection;
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) return;

  const tx = Math.round(transform?.x ?? bounds.x);
  const ty = Math.round(transform?.y ?? bounds.y);
  const w  = bounds.w;
  const h  = bounds.h;

  const cw = ctxDraw.canvas.width;
  const ch = ctxDraw.canvas.height;
  const rx = Math.max(0, Math.min(cw, tx));
  const ry = Math.max(0, Math.min(ch, ty));
  const rw = Math.max(0, Math.min(cw - rx, w));
  const rh = Math.max(0, Math.min(ch - ry, h));
  if (rw <= 0 || rh <= 0) return;

  const patch = ctxDraw.getImageData(rx, ry, rw, rh);
  const d = patch.data;

  if (_maskLocal && _maskLocal.length === w * h) {
    // Masked (lifted) selection — erase only masked pixels at transformed position
    for (let yy = 0; yy < rh; yy++) {
      const sy = yy + (ry - ty);
      if (sy < 0 || sy >= h) continue;
      for (let xx = 0; xx < rw; xx++) {
        const sx = xx + (rx - tx);
        if (sx < 0 || sx >= w) continue;
        const mi = sy * w + sx;
        if (_maskLocal[mi]) {
          const p = (yy * rw + xx) * 4;
          d[p + 0] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
        }
      }
    }
  } else {
    // Unmasked (pasted) selection — erase whole overlapped rect
    for (let p = 0; p < d.length; p += 4) {
      d[p + 0] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
    }
  }

  ctxDraw.putImageData(patch, rx, ry);
  selection._restored = false;
}

export function hitSelectionHandle(selection, px, py) {
  if (!selection || !selection._handles) return null;
  for (const handle of selection._handles) {
    if (handle.type === 'rotate') {
      const dist = Math.hypot(px - handle.x, py - handle.y);
      if (dist <= handle.size) return handle;
    } else {
      const half = handle.size / 2 + 3;
      if (
        px >= handle.x - half &&
        px <= handle.x + half &&
        py >= handle.y - half &&
        py <= handle.y + half
      ) {
        return handle;
      }
    }
  }
  return null;
}
