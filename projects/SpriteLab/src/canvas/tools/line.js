// line.js — pixel-accurate line drawing (Bresenham) with brush stamping.
// Works for preview (overlay context) and commit (draw context).

/**
 * Draw a line by stamping solid squares of size `size` along a Bresenham path.
 * @param {CanvasRenderingContext2D} ctx  target context (overlay or draw)
 * @param {number} x0  start x (px)
 * @param {number} y0  start y (px)
 * @param {number} x1  end x (px)
 * @param {number} y1  end y (px)
 * @param {number} size brush size in pixels
 * @param {string} color hex color (ignored for overlay if you want; we still use it)
 * @param {boolean} preview if true, draw at full alpha on overlay; if false, respect main alpha
 */
export function drawLine(ctx, x0, y0, x1, y1, size = 1, color = '#000000', preview = false) {
  const s = Math.max(1, size | 0);

  ctx.save();
  // For preview we force alpha = 1 so the path is clearly visible;
  // the parent code clears overlay each frame anyway.
  ctx.globalAlpha = preview ? 1 : (ctx.globalAlpha ?? 1);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;

  // Standard Bresenham integer algorithm
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Stamp a solid square footprint
    ctx.fillRect(x0, y0, s, s);

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 <  dx) { err += dx; y0 += sy; }
  }

  ctx.restore();
}
