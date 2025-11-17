// src/canvas/selection/mask.js
// Utilities for selection masks and bounds.
// Mask format: Uint8Array length = width * height, values 0 (off) or 1 (selected).

/**
 * Allocate a zeroed mask
 */
export function createEmptyMask(w, h) {
  return new Uint8Array(w * h); // all zeros
}

/**
 * Create a rectangular mask (inclusive bounds) and return { mask, bounds }.
 * x0,y0 = anchor; x1,y1 = current; order is normalized internally.
 */
export function createRectMask(w, h, x0, y0, x1, y1) {
  const mask = new Uint8Array(w * h);
  const left   = clamp(Math.min(x0, x1), 0, w - 1);
  const right  = clamp(Math.max(x0, x1), 0, w - 1);
  const top    = clamp(Math.min(y0, y1), 0, h - 1);
  const bottom = clamp(Math.max(y0, y1), 0, h - 1);

  const bw = right - left + 1;
  const bh = bottom - top + 1;

  if (bw <= 0 || bh <= 0) {
    return { mask, bounds: null };
  }

  for (let y = top; y <= bottom; y++) {
    const row = y * w;
    for (let x = left; x <= right; x++) {
      mask[row + x] = 1;
    }
  }

  return { mask, bounds: { x: left, y: top, w: bw, h: bh } };
}

/**
 * Given a mask, compute its tight bounding box. Returns {x,y,w,h} or null.
 */
export function boundsFromMask(mask, w, h) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (mask[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Build a mask of all painted pixels (alpha > 0) from a 2D canvas context.
 * Returns { mask, bounds }.
 */
export function maskFromPainted(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data; // RGBA
  const m = new Uint8Array(w * h);

  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      const a = data[i + 3];
      if (a !== 0) {
        const idx = y * w + x;
        m[idx] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bounds = (maxX < minX || maxY < minY)
    ? null
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

  return { mask: m, bounds };
}

/**
 * Build a mask from a freeform polygon path (lasso). Points are in canvas pixel space.
 * Returns { mask, bounds } with the same 0/1 format as other helpers.
 */
export function maskFromLasso(points, w, h) {
  const m = new Uint8Array(w * h);
  if (!Array.isArray(points) || points.length < 3) {
    return { mask: m, bounds: null };
  }

  let surface;
  if (typeof OffscreenCanvas !== 'undefined') {
    surface = new OffscreenCanvas(w, h);
  } else {
    surface = document.createElement('canvas');
    surface.width = w;
    surface.height = h;
  }

  const g = surface.getContext('2d', { willReadFrequently: true });
  if (!g) return { mask: m, bounds: null };

  g.clearRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  g.beginPath();

  const first = points[0];
  g.moveTo(first.x + 0.5, first.y + 0.5);
  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    g.lineTo(pt.x + 0.5, pt.y + 0.5);
  }
  g.closePath();
  g.fill();

  const img = g.getImageData(0, 0, w, h);
  const data = img.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      if (data[i + 3]) {
        const idx = y * w + x;
        m[idx] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bounds = (maxX < minX || maxY < minY)
    ? null
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

  return { mask: m, bounds };
}

/**
 * Crop a sub-mask from a full-size mask (useful for bounds-local operations).
 * Returns a Uint8Array of size bw*bh representing the same 0/1 mask in local coords.
 */
export function cropMask(mask, w, h, bounds) {
  const { x, y, w: bw, h: bh } = bounds;
  const out = new Uint8Array(bw * bh);
  for (let yy = 0; yy < bh; yy++) {
    const srcRow = (y + yy) * w;
    const dstRow = yy * bw;
    for (let xx = 0; xx < bw; xx++) {
      out[dstRow + xx] = mask[srcRow + (x + xx)];
    }
  }
  return out;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
