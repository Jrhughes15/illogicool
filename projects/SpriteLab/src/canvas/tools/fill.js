// fill.js — iterative scanline flood fill (contiguous region), no recursion.
// Fills on a target 2D context by reading/writing ImageData on its canvas.

/**
 * Flood fill starting at (x, y) replacing the contiguous region whose color
 * matches the starting pixel with the provided RGBA color.
 * Returns the number of pixels changed.
 *
 * @param {CanvasRenderingContext2D} ctx - target context (draw canvas)
 * @param {number} x - start x (pixel coords)
 * @param {number} y - start y (pixel coords)
 * @param {{r:number,g:number,b:number,a:number}} rgba - fill color (0-255)
 * @param {number} tolerance - 0 means exact match; (kept for future)
 */
export function floodFill(ctx, x, y, rgba, tolerance = 0) {
  const canvas = ctx.canvas;
  const w = canvas.width | 0;
  const h = canvas.height | 0;
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  const idx = (y * w + x) << 2;
  const tr = data[idx + 0];
  const tg = data[idx + 1];
  const tb = data[idx + 2];
  const ta = data[idx + 3];

  // If target color equals fill color (within tolerance), nothing to do
  if (colorsClose(tr, tg, tb, ta, rgba.r, rgba.g, rgba.b, rgba.a, tolerance)) {
    return 0;
  }

  const stack = [];
  pushSpan(stack, x, y, x, 1);
  let changed = 0;

  while (stack.length) {
    const { x1, y1, x2, dy } = stack.pop();
    let sx = x1;
    let ex = x2;

    // Move left to span boundary
    let nx = sx;
    while (nx >= 0 && matchAt(nx, y1, tr, tg, tb, ta, data, w, tolerance)) {
      setAt(nx, y1, rgba, data, w);
      changed++;
      nx--;
    }
    const left = nx + 1;

    // Move right to span boundary
    nx = sx + 1;
    while (nx < w && matchAt(nx, y1, tr, tg, tb, ta, data, w, tolerance)) {
      setAt(nx, y1, rgba, data, w);
      changed++;
      nx++;
    }
    const right = nx - 1;

    // Scan above and below the span for new segments
    scanSpan(stack, left, right, y1 - 1, -1, tr, tg, tb, ta, data, w, h, tolerance);
    scanSpan(stack, left, right, y1 + 1, +1, tr, tg, tb, ta, data, w, h, tolerance);
  }

  if (changed > 0) {
    ctx.putImageData(img, 0, 0);
  }
  return changed;
}

// ---- helpers ----

function colorsClose(r1, g1, b1, a1, r2, g2, b2, a2, tol) {
  if (tol <= 0) return (r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2);
  // simple Manhattan distance with alpha
  const d = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
  return d <= tol;
}

function matchAt(x, y, tr, tg, tb, ta, data, w, tol) {
  const i = (y * w + x) << 2;
  const r = data[i + 0];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  return colorsClose(r, g, b, a, tr, tg, tb, ta, tol);
}

function setAt(x, y, rgba, data, w) {
  const i = (y * w + x) << 2;
  data[i + 0] = rgba.r | 0;
  data[i + 1] = rgba.g | 0;
  data[i + 2] = rgba.b | 0;
  data[i + 3] = rgba.a | 0;
}

function pushSpan(stack, x1, y1, x2, dy) {
  stack.push({ x1, y1, x2, dy });
}

function scanSpan(stack, left, right, y, dy, tr, tg, tb, ta, data, w, h, tol) {
  if (y < 0 || y >= h) return;
  let inSpan = false;
  let start = 0;
  for (let x = left; x <= right; x++) {
    if (matchAt(x, y, tr, tg, tb, ta, data, w, tol)) {
      if (!inSpan) { start = x; inSpan = true; }
      // if we're at the end, push the span
      if (x === right) pushSpan(stack, start, y, x, dy);
    } else if (inSpan) {
      pushSpan(stack, start, y, x - 1, dy);
      inSpan = false;
    }
  }
}

