import { GifWriter } from './gifWriter.js';

const TRANSPARENT_THRESHOLD = 16;

export function encodeGif({ width, height, frames, loop = true }) {
  if (!frames || !frames.length) throw new Error('GIF export requires at least one frame.');
  const paletteInfo = buildPalette(frames);
  const paletteColors = paletteInfo.entries.map(rgb => (rgb.r << 16) | (rgb.g << 8) | rgb.b);

  const estimatedSize = Math.max(1024, width * height * frames.length * 5);
  const buffer = new Uint8Array(estimatedSize);
  const writer = new GifWriter(buffer, width, height, {
    loop: loop ? 0 : null,
    palette: paletteColors,
  });

  frames.forEach(frame => {
    const indices = mapFrameToIndices(frame, paletteInfo);
    const delay = Math.max(1, Math.min(65535, frame.delayCs || 6));
    writer.addFrame(0, 0, width, height, indices, {
      delay,
      disposal: 2,
      transparent: paletteInfo.transparentIndex >= 0 ? paletteInfo.transparentIndex : null,
    });
  });

  const end = writer.end();
  return buffer.slice(0, end);
}
function mapFrameToIndices(frame, paletteInfo) {
  const { data, width, height } = frame;
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const alpha = data[i + 3];
    if (alpha < TRANSPARENT_THRESHOLD && paletteInfo.transparentIndex >= 0) {
      out[p] = paletteInfo.transparentIndex;
      continue;
    }
    const key = makeColorKey(data[i], data[i + 1], data[i + 2], paletteInfo.shift);
    let index = paletteInfo.colorToIndex.get(key);
    if (index == null) {
      index = findNearestColor(data[i], data[i + 1], data[i + 2], paletteInfo, paletteInfo.transparentIndex);
      paletteInfo.colorToIndex.set(key, index);
    }
    out[p] = index;
  }
  return out;
}

function buildPalette(frames) {
  let shift = 2;
  let hasTransparency = false;
  let colorMap = new Map();

  for (shift = 1; shift <= 4; shift++) {
    colorMap = new Map();
    hasTransparency = false;
    const limit = 256;
    outer: for (const frame of frames) {
      const data = frame.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < TRANSPARENT_THRESHOLD) {
          hasTransparency = true;
          continue;
        }
        const key = makeColorKey(data[i], data[i + 1], data[i + 2], shift);
        if (!colorMap.has(key)) {
          colorMap.set(key, approximateColor(key, shift));
          if (colorMap.size >= (hasTransparency ? 255 : 256)) break outer;
        }
      }
    }
    if (colorMap.size < (hasTransparency ? 255 : 256)) break;
  }

  if (colorMap.size === 0) {
    colorMap.set('0|0|0', { r: 0, g: 0, b: 0 });
    hasTransparency = true;
  }

  const limit = hasTransparency ? 255 : 256;
  if (colorMap.size > limit) {
    const trimmed = new Map();
    let count = 0;
    for (const [key, value] of colorMap) {
      trimmed.set(key, value);
      count++;
      if (count >= limit) break;
    }
    colorMap = trimmed;
  }

  const entries = [];
  const colorToIndex = new Map();
  let transparentIndex = -1;
  if (hasTransparency) {
    transparentIndex = 0;
    entries.push({ r: 0, g: 0, b: 0 });
  }
  let idx = hasTransparency ? 1 : 0;
  colorMap.forEach((rgb, key) => {
    colorToIndex.set(key, idx);
    entries.push(rgb);
    idx++;
  });

  if (entries.length < 2) entries.push({ r: 0, g: 0, b: 0 });
  let paletteSize = 1;
  while (paletteSize < entries.length) paletteSize <<= 1;
  while (entries.length < paletteSize) entries.push({ r: 0, g: 0, b: 0 });

  const palette = new Uint8Array(entries.length * 3);
  entries.forEach((rgb, i) => {
    palette[i * 3 + 0] = rgb.r;
    palette[i * 3 + 1] = rgb.g;
    palette[i * 3 + 2] = rgb.b;
  });

  const minCodeSize = Math.max(2, Math.ceil(Math.log2(Math.max(2, entries.length))));

  return {
    palette,
    colorToIndex,
    transparentIndex,
    shift,
    minCodeSize,
    entries,
  };
}

function makeColorKey(r, g, b, shift) {
  return `${r >> shift}|${g >> shift}|${b >> shift}`;
}

function approximateColor(key, shift) {
  const parts = key.split('|').map(Number);
  const scale = 1 << shift;
  const half = Math.max(1, scale >> 1);
  return {
    r: clampByte(parts[0] * scale + half),
    g: clampByte(parts[1] * scale + half),
    b: clampByte(parts[2] * scale + half),
  };
}

function findNearestColor(r, g, b, paletteInfo, transparentIndex) {
  let best = transparentIndex >= 0 ? transparentIndex : 0;
  let bestDist = Infinity;
  paletteInfo.entries.forEach((rgb, idx) => {
    if (idx === transparentIndex) return;
    const dr = r - rgb.r;
    const dg = g - rgb.g;
    const db = b - rgb.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  });
  return best;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, value | 0));
}


