// src/canvas/clipboard.js
// Internal clipboard for selections. Stores a canvas (floating pixels).

/** @type {HTMLCanvasElement|null} */
let _clipCanvas = null;

/** Return a deep-cloned canvas from an input canvas. */
function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0);
  return c;
}

/** Clear clipboard. */
export function clearClipboard() { _clipCanvas = null; }

/** Put a selection's floating canvas into the clipboard. */
export function setClipboardFromSelection(selection) {
  if (!selection || !selection.floating) return;
  _clipCanvas = cloneCanvas(selection.floating);
}

/**
 * Put a region (bounds) from ctxDraw into the clipboard, respecting a 0/1 mask.
 * The mask is maskFull (full-canvas size); we crop it to bounds here.
 */
export function setClipboardFromMaskedRegion(ctxDraw, maskFull, bounds, canvasW, canvasH) {
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) return;

  const patch = ctxDraw.getImageData(bounds.x, bounds.y, bounds.w, bounds.h);
  const data = patch.data;

  // Crop mask to local bounds
  const m = new Uint8Array(bounds.w * bounds.h);
  for (let y = 0; y < bounds.h; y++) {
    const srcRow = (bounds.y + y) * canvasW;
    const dstRow = y * bounds.w;
    for (let x = 0; x < bounds.w; x++) {
      m[dstRow + x] = maskFull[srcRow + (bounds.x + x)];
    }
  }

  // Zero out pixels not in mask
  for (let i = 0, p = 0; i < m.length; i++, p += 4) {
    if (!m[i]) { data[p+0]=0; data[p+1]=0; data[p+2]=0; data[p+3]=0; }
  }

  // Draw into a new canvas
  const c = document.createElement('canvas');
  c.width = bounds.w;
  c.height = bounds.h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.putImageData(patch, 0, 0);

  _clipCanvas = c;
}

/** Is there something on our internal clipboard? */
export function hasClipboard() { return !!_clipCanvas; }

/** Get a cloned canvas copy of the clipboard contents (so callers can mutate safely). */
export function getClipboardCanvas() {
  return _clipCanvas ? cloneCanvas(_clipCanvas) : null;
}
