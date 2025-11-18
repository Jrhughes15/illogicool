// rect.js — pixel-accurate rectangle helpers (stroke + fill), no anti-alias.

/**
 * Fill a solid axis-aligned rectangle in pixel units.
 * x, y, w, h are in canvas pixel coordinates (integers).
 */
export function fillRectPixels(ctx, x, y, w, h, color = '#000000', preview = false) {
  if (!ctx) return;
  if (w === 0 || h === 0) return;

  // Normalize negative sizes
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;
  if (preview) ctx.globalAlpha = 1; // make preview crisp
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Stroke an axis-aligned rectangle border with a square pixel brush.
 * Brush size is "thickness" in pixels.
 */
export function strokeRectPixels(ctx, x, y, w, h, size = 1, color = '#000000', preview = false) {
  if (!ctx) return;
  if (w === 0 || h === 0) return;

  // Normalize negative sizes
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }

  const t = Math.max(1, size | 0);
  // Clamp so we don't invert for very thin rects
  const iw = Math.max(0, w);
  const ih = Math.max(0, h);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;
  if (preview) ctx.globalAlpha = 1;

  // Top edge
  ctx.fillRect(x, y, iw, t);
  // Bottom edge
  if (ih >= t) ctx.fillRect(x, y + ih - t, iw, t);
  // Left edge
  ctx.fillRect(x, y, t, ih);
  // Right edge
  if (iw >= t) ctx.fillRect(x + iw - t, y, t, ih);

  ctx.restore();
}

