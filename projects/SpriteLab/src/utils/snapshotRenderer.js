const layerScratch = document.createElement('canvas');
const layerScratchCtx = layerScratch.getContext('2d', { willReadFrequently: true });
if (layerScratchCtx) layerScratchCtx.imageSmoothingEnabled = false;

/**
 * Composite a snapshot's layers into a canvas. Returns a new canvas element.
 * @param {object} snapshot - Frame snapshot with layers array.
 * @param {object} [options]
 * @param {number} [options.baseWidth] - fallback width if layers missing.
 * @param {number} [options.baseHeight] - fallback height if layers missing.
 * @param {number} [options.scale=1]
 * @returns {HTMLCanvasElement}
 */
export function snapshotToCanvas(snapshot, options = {}) {
  const { scale = 1, baseWidth, baseHeight } = options;
  const layers = snapshot?.layers || [];
  const reference = layers[0];
  const width = Math.max(1, Math.round((baseWidth ?? reference?.width ?? 1)));
  const height = Math.max(1, Math.round((baseHeight ?? reference?.height ?? 1)));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;

  layers.forEach(layer => {
    if (!layer?.visible) return;
    if (!layer.pixels || !layer.width || !layer.height) return;
    ensureLayerScratch(layer.width, layer.height);
    const img = new ImageData(new Uint8ClampedArray(layer.pixels), layer.width, layer.height);
    layerScratchCtx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    if (layer.width === targetW && layer.height === targetH) {
      ctx.drawImage(layerScratch, 0, 0);
    } else {
      ctx.drawImage(layerScratch, 0, 0, targetW, targetH);
    }
    ctx.restore();
  });
  return canvas;
}

export function snapshotToImage(snapshot, options = {}) {
  const canvas = snapshotToCanvas(snapshot, options);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: img.width,
    height: img.height,
    pixels: new Uint8ClampedArray(img.data),
  };
}

function ensureLayerScratch(w, h) {
  if (layerScratch.width === w && layerScratch.height === h) return;
  layerScratch.width = w;
  layerScratch.height = h;
  if (layerScratchCtx) layerScratchCtx.imageSmoothingEnabled = false;
}
