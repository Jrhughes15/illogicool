// eraser.js — simple pixel-accurate eraser utilities

/**
 * Clear a size×size block at (x, y) in pixel coordinates on the draw context.
 * Assumes the target context is the base "draw" canvas (not the overlay).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x pixel x
 * @param {number} y pixel y
 * @param {number} size brush size in pixels (logical pixels)
 */
export function eraseRect(ctx, x, y, size) {
  const s = Math.max(1, size | 0);
  ctx.save();
  // Ensure we erase fully regardless of current composite/alpha
  const old = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'destination-out';
  // Using destination-out with a solid rect is equivalent to clearing
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, s, s);
  ctx.globalCompositeOperation = old;
  ctx.restore();
}
