import {
  snapshotLayersState,
  cloneLayerState,
} from '../layers/layers.js';
import { importFramesFromSnapshots } from '../timeline/frames.js';

let AppRef = null;

export function setupImportControls(app) {
  AppRef = app;
  const btnSingle = document.getElementById('importPng');
  const btnStrip = document.getElementById('importStrip');
  const inputSingle = document.getElementById('importPngInput');
  const inputStrip = document.getElementById('importStripInput');
  const paddingInput = document.getElementById('importPadding');
  const fitSelect = document.getElementById('importFit');

  const readOptions = () => ({
    padding: clampInt(paddingInput?.value, 0, 256, 0),
    fit: fitSelect?.value || 'contain',
  });

  btnSingle?.addEventListener('click', () => inputSingle?.click());
  btnStrip?.addEventListener('click', () => inputStrip?.click());

  inputSingle?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files, readOptions());
    e.target.value = '';
  });

  inputStrip?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files, readOptions());
    e.target.value = '';
  });
}

async function handleFiles(files, options) {
  if (!files.length || !AppRef) return;
  const sorted = files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  );

  const template = snapshotLayersState();
  const frames = [];

  for (const file of sorted) {
    try {
      const bitmap = await createImageBitmap(file);
      const frameData = await bitmapToFrame(bitmap, options, template);
      if (frameData) frames.push(frameData);
    } catch {
      // ignore load errors
    }
  }

  if (frames.length) {
    importFramesFromSnapshots(frames);
  }
}

async function bitmapToFrame(bitmap, options, template) {
  if (!bitmap) return null;
  const appW = AppRef.size?.w || bitmap.width;
  const appH = AppRef.size?.h || bitmap.height;
  const padding = clampInt(options.padding, 0, Math.floor(Math.min(appW, appH) / 2), 0);
  const fit = options.fit || 'contain';

  const canvas = document.createElement('canvas');
  canvas.width = appW;
  canvas.height = appH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, appW, appH);
  ctx.imageSmoothingEnabled = false;

  const rect = computePlacement(bitmap.width, bitmap.height, appW, appH, padding, fit);
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, rect.x, rect.y, rect.w, rect.h);
  if (typeof bitmap.close === 'function') {
    bitmap.close();
  }

  const imgData = ctx.getImageData(0, 0, appW, appH);
  const pixelsCopy = new Uint8ClampedArray(imgData.data);

  const snapshot = cloneLayerState(template);
  snapshot.layers.forEach(layer => {
    layer.width = appW;
    layer.height = appH;
    layer.pixels = new Uint8ClampedArray(appW * appH * 4);
  });
  if (snapshot.layers[0]) {
    snapshot.layers[0].pixels = pixelsCopy.slice();
  }

  return {
    snapshot,
    preview: {
      width: appW,
      height: appH,
      pixels: pixelsCopy,
    },
    durationMs: Math.max(16, Math.round(1000 / (AppRef.fps || 12))),
  };
}

function computePlacement(imgW, imgH, canvasW, canvasH, padding, mode) {
  const availW = Math.max(1, canvasW - padding * 2);
  const availH = Math.max(1, canvasH - padding * 2);
  let w = availW;
  let h = availH;
  let x = padding;
  let y = padding;

  if (mode === 'contain') {
    const scale = Math.min(availW / imgW, availH / imgH);
    w = imgW * scale;
    h = imgH * scale;
    x = (canvasW - w) / 2;
    y = (canvasH - h) / 2;
  } else if (mode === 'cover') {
    const scale = Math.max(availW / imgW, availH / imgH);
    w = imgW * scale;
    h = imgH * scale;
    x = (canvasW - w) / 2;
    y = (canvasH - h) / 2;
  } else if (mode === 'center') {
    w = Math.min(imgW, availW);
    h = Math.min(imgH, availH);
    x = (canvasW - w) / 2;
    y = (canvasH - h) / 2;
  } else {
    // stretch
    w = availW;
    h = availH;
    x = padding;
    y = padding;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(Math.max(1, w)),
    h: Math.round(Math.max(1, h)),
  };
}

function clampInt(val, min, max, fallback) {
  const num = Math.round(Number(val));
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}
