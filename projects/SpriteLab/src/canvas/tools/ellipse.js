// ellipse.js — pixel-accurate ellipse helpers (stroke + fill), no anti-alias.
// All coords are in integer canvas pixels. w/h may be negative (we normalize).

/**
 * Fill a solid ellipse inside the axis-aligned bounding box (x,y,w,h).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color
 * @param {boolean} preview - if true, force full alpha for clarity
 */
export function fillEllipsePixels(ctx, x, y, w, h, color = '#000000', preview = false) {
  if (!ctx) return;
  const box = normalizeBox(x, y, w, h);
  if (box.w <= 0 || box.h <= 0) return;

  const { cx, cy, rx, ry } = ellipseParams(box);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;
  if (preview) ctx.globalAlpha = 1;

  if (rx === 0 && ry === 0) {
    ctx.fillRect(cx, cy, 1, 1);
    ctx.restore();
    return;
  }

  if (rx === 0) {
    // vertical line
    ctx.fillRect(cx, cy - ry, 1, 2 * ry + 1);
    ctx.restore();
    return;
  }
  if (ry === 0) {
    // horizontal line
    ctx.fillRect(cx - rx, cy, 2 * rx + 1, 1);
    ctx.restore();
    return;
  }

  // For each scanline in [-ry..ry], compute horizontal span via ellipse equation
  for (let dy = -ry; dy <= ry; dy++) {
    // Compute x half-width using ellipse equation (x^2/rx^2 + y^2/ry^2 <= 1)
    const yy = dy + 0.5; // center of pixel row for better symmetry
    const t = 1 - (yy * yy) / (ry * ry);
    const span = t <= 0 ? 0 : Math.floor(rx * Math.sqrt(Math.max(0, t)));
    const x1 = cx - span;
    const wspan = 2 * span + 1;
    ctx.fillRect(x1, cy + dy, wspan, 1);
  }

  ctx.restore();
}

/**
 * Stroke an ellipse border with square pixel brush thickness.
 * We plot the midpoint ellipse perimeter and stamp t×t squares.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} size - brush thickness in pixels
 * @param {string} color
 * @param {boolean} preview - if true, force full alpha
 */
export function strokeEllipsePixels(ctx, x, y, w, h, size = 1, color = '#000000', preview = false) {
  if (!ctx) return;
  const t = Math.max(1, size | 0);
  const box = normalizeBox(x, y, w, h);
  if (box.w <= 0 || box.h <= 0) return;

  const { cx, cy, rx, ry } = ellipseParams(box);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;
  if (preview) ctx.globalAlpha = 1;

  if (rx === 0 && ry === 0) {
    ctx.fillRect(cx, cy, t, t);
    ctx.restore();
    return;
  }

  if (rx === 0) {
    // vertical line stroke with thickness t → draw a vertical strip
    ctx.fillRect(cx, cy - ry, t, 2 * ry + 1);
    ctx.restore();
    return;
  }
  if (ry === 0) {
    // horizontal line stroke with thickness t → draw a horizontal strip
    ctx.fillRect(cx - rx, cy, 2 * rx + 1, t);
    ctx.restore();
    return;
  }

  // Midpoint ellipse algorithm (region 1 + region 2)
  // Plot four symmetric points for each step and stamp a t×t square at each.
  let xk = 0;
  let yk = ry;

  // Decision parameters (scaled to avoid floats where possible)
  // Use float math for clarity (still deterministic).
  let ry2 = ry * ry;
  let rx2 = rx * rx;
  let twoRy2 = 2 * ry2;
  let twoRx2 = 2 * rx2;

  // Region 1
  let pk = ry2 - rx2 * ry + 0.25 * rx2;
  let dx = 0;
  let dy = twoRx2 * yk;

  while (dx < dy) {
    stamp4(ctx, cx, cy, xk, yk, t);
    xk++;
    dx += twoRy2;
    if (pk < 0) {
      pk += ry2 + dx;
    } else {
      yk--;
      dy -= twoRx2;
      pk += ry2 + dx - dy;
    }
  }

  // Region 2
  pk = ry2 * (xk + 0.5) * (xk + 0.5) + rx2 * (yk - 1) * (yk - 1) - rx2 * ry2;
  while (yk >= 0) {
    stamp4(ctx, cx, cy, xk, yk, t);
    yk--;
    dy -= twoRx2;
    if (pk > 0) {
      pk += rx2 - dy;
    } else {
      xk++;
      dx += twoRy2;
      pk += rx2 - dy + dx;
    }
  }

  ctx.restore();
}

// ---- helpers ----

function normalizeBox(x, y, w, h) {
  let xx = x, yy = y, ww = w, hh = h;
  if (ww < 0) { xx += ww; ww = -ww; }
  if (hh < 0) { yy += hh; hh = -hh; }
  // Clamp to integers
  xx |= 0; yy |= 0; ww |= 0; hh |= 0;
  return { x: xx, y: yy, w: ww, h: hh };
}

function ellipseParams({ x, y, w, h }) {
  // We want pixel centers; define radii so a 1×1 box draws a single pixel.
  const cx = (x + Math.floor(w / 2)) | 0;
  const cy = (y + Math.floor(h / 2)) | 0;
  const rx = Math.max(0, Math.floor((w - 1) / 2));
  const ry = Math.max(0, Math.floor((h - 1) / 2));
  return { cx, cy, rx, ry };
}

function stamp4(ctx, cx, cy, x, y, t) {
  // Four symmetric points
  ctx.fillRect(cx + x, cy + y, t, t);
  ctx.fillRect(cx - x, cy + y, t, t);
  ctx.fillRect(cx + x, cy - y, t, t);
  ctx.fillRect(cx - x, cy - y, t, t);
}

