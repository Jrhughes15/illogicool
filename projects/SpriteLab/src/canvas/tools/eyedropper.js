// eyedropper.js — sample pixel RGBA from ctx at x,y

export function samplePixel(ctx, x, y) {
  if (!ctx || x < 0 || y < 0 || x >= ctx.canvas.width || y >= ctx.canvas.height) return null;
  const data = ctx.getImageData(x, y, 1, 1).data;
  const r = data[0], g = data[1], b = data[2], a = data[3] / 255;
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  return { r, g, b, a, hex };
}

