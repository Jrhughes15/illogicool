import { forceActiveFrameSnapshot, getFrameSnapshots } from '../timeline/frames.js';
import { snapshotToCanvas, snapshotToImage } from '../utils/snapshotRenderer.js';
import { encodeGif } from './gifEncoder.js';

let AppRef = null;

const encoder = new TextEncoder();
export function initExportControls(app) {
  AppRef = app;
  const quickBtn = document.getElementById('quickSheetBtn');
  const advancedBtn = document.getElementById('advancedBtn');
  quickBtn?.addEventListener('click', () => handleExport('quick'));
  advancedBtn?.addEventListener('click', () => handleExport('advanced'));
}

async function handleExport(mode) {
  if (!AppRef) return;
  const label = mode === 'advanced' ? 'Advanced export' : 'Quick export';
  try {
    setExportStatus(`${label} in progress...`);
    forceActiveFrameSnapshot();
    syncActiveAnimationState();
    const includeAllAnimations = mode === 'advanced';
    const animations = getAnimationsForExport({ includeAll: includeAllAnimations });
    if (!animations.length) {
      setExportStatus('No animations to export.');
      return;
    }
    const options = collectOptions();
    const variantScales = getVariantScales();
    if (!variantScales.length) variantScales.push(1);
    const scales = mode === 'quick' ? [variantScales[0]] : variantScales;
    const gifFormatOnly = options.format === 'gif';
    const includeFrames = gifFormatOnly ? false : (options.exportFrames || mode === 'advanced');
    const includeCombined = gifFormatOnly ? false : mode === 'advanced';
    const includeGifs = options.includeGif || gifFormatOnly;
    const gifOnly = gifFormatOnly && !includeCombined && !includeFrames;
    await nextTick();
    const files = [];
    for (const anim of animations) {
      const animFiles = await buildFilesForAnimation(anim, options, scales, {
        includeFrames,
        includeGifs,
        gifOnly,
      });
      files.push(...animFiles);
    }
    if (includeCombined) {
      for (const scale of scales) {
        const combined = await buildCombinedSheet(animations, options, scale);
        if (combined) files.push(...combined);
      }
    }
    if (!gifOnly) {
      if (options.includeAnimationSummary) {
        const summaryFile = buildAnimationSummaryFile(animations, options, variantScales);
        if (summaryFile) files.push(summaryFile);
      }
      if (options.includePalette) {
        const paletteFiles = buildPaletteFiles(options);
        if (paletteFiles.length) files.push(...paletteFiles);
      }
    }
    if (!files.length) {
      setExportStatus('Nothing to export.');
      return;
    }
    const gifDirect = gifOnly && files.length === 1;
    if (gifDirect) {
      const gifFile = files[0];
      const gifBlob = new Blob([gifFile.data], { type: gifFile.mime || 'image/gif' });
      const downloadName = (gifFile.downloadName || gifFile.name || `${options.baseName}.gif`).split('/').pop();
      triggerDownload(gifBlob, downloadName);
      setExportStatus(`${label} ready (GIF).`);
      return;
    }
    const zipBlob = createZipArchive(files);
    const suffix = mode === 'quick' ? 'sheet' : 'export';
    triggerDownload(zipBlob, `${options.baseName}-${suffix}.zip`);
    setExportStatus(`${label} ready (${files.length} files).`);
  } catch (error) {
    console.error('[export] failed', error);
    setExportStatus('Export failed - see console.');
  }
}


function collectOptions() {
  const padding = clampInt(document.getElementById('exportPadding')?.value, 0, 64, 0);
  const extrude = clampInt(document.getElementById('exportExtrude')?.value, 0, 32, 0);
  const pot = Boolean(document.getElementById('exportPot')?.checked);
  const format = document.getElementById('exportFormat')?.value || 'png';
  const meta = document.getElementById('exportMeta')?.value || 'aseprite';
  const sheetSize = clampInt(document.getElementById('exportSheetSize')?.value, 0, 4096, 0);
  const includeFramePngs = Boolean(document.getElementById('exportFramePngs')?.checked);
  const includePalette = Boolean(document.getElementById('exportPaletteFile')?.checked);
  const includeAnimationSummary = Boolean(document.getElementById('exportAnimationSummary')?.checked);
  const includeGif = Boolean(document.getElementById('exportIncludeGif')?.checked);
  const docTitleInput = document.getElementById('docTitle');
  const docTitle = docTitleInput?.value?.trim() || docTitleInput?.textContent?.trim() || 'sprite_lab';
  const baseName = sanitizeName(docTitle || 'sprite_lab');
  const defaultDuration = Math.max(16, Math.round(1000 / Math.max(AppRef?.fps || 12, 1)));
  return {
    padding,
    extrude,
    pot,
    format,
    meta,
    sheetSize,
    exportFrames: includeFramePngs,
    includePalette,
    includeAnimationSummary,
    includeGif,
    baseName,
    defaultDuration,
    size: { w: AppRef?.size?.w || 0, h: AppRef?.size?.h || 0 },
  };
}

function getVariantScales() {
  const nodes = document.querySelectorAll('.export-variant');
  const values = [];
  nodes.forEach(node => {
    if (node.checked) {
      const scale = Number(node.dataset.scale) || 1;
      if (!values.includes(scale)) values.push(scale);
    }
  });
  values.sort((a, b) => a - b);
  return values;
}

async function buildFilesForAnimation(animation, options, scales, { includeFrames, includeGifs, gifOnly } = {}) {
  const frames = animation.frames || [];
  if (!frames.length) return [];
  const folder = `${options.baseName}/${animation.safeName || 'animation'}`;
  const files = [];
  const generateSheets = !gifOnly;
  if (generateSheets) {
    for (const scale of scales) {
      const sheet = buildSpriteSheet(frames, options, scale);
      const sheetData = await canvasToUint8(sheet.canvas, options.format);
      files.push({
        name: `${folder}/sheet@${scale}x.${options.format}`,
        data: sheetData,
      });
      const metaBytes = buildMetadataBytes(sheet, scale, options, animation.name);
      if (metaBytes) {
        files.push({
          name: `${folder}/sheet@${scale}x.json`,
          data: metaBytes,
        });
      }
      if (includeFrames) {
        for (let i = 0; i < sheet.renderings.length; i++) {
          const render = sheet.renderings[i];
          const frameData = await canvasToUint8(render.canvas, options.format);
          const safeName = sanitizeName(frames[i]?.name || `frame_${i + 1}`);
          files.push({
            name: `${folder}/frames/${safeName}@${scale}x.${options.format}`,
            data: frameData,
          });
        }
      }
    }
  }
  if (includeGifs) {
    const scale = scales[0] || 1;
    const gifFiles = await buildGifFiles(animation, options, scale, folder);
    files.push(...gifFiles);
  }
  return files;
}

async function buildGifFiles(animation, options, scale, folder) {
  const frames = animation.frames || [];
  if (!frames.length) return [];
  const baseW = Math.max(1, Math.round(options.size.w || frames[0]?.snapshot?.layers?.[0]?.width || 1));
  const baseH = Math.max(1, Math.round(options.size.h || frames[0]?.snapshot?.layers?.[0]?.height || 1));
  const renderings = frames.map(frame => {
    const image = snapshotToImage(frame.snapshot, {
      scale,
      baseWidth: baseW,
      baseHeight: baseH,
    });
    if (!image) return null;
    return {
      width: image.width,
      height: image.height,
      data: image.pixels,
      delayCs: Math.max(1, Math.round((frame.durationMs ?? options.defaultDuration) / 10)),
    };
  });
  const filtered = renderings.filter(Boolean);
  if (!filtered.length) return [];
  const gifData = encodeGif({
    width: filtered[0].width,
    height: filtered[0].height,
    frames: filtered,
    loop: true,
  });
  const safeName = animation.safeName || 'animation';
  const filename = `${folder}/${safeName}@${scale}x.gif`;
  return [{
    name: filename,
    downloadName: filename.split('/').pop(),
    mime: 'image/gif',
    data: gifData,
  }];
}

function buildSpriteSheet(frames, options, scale) {
  const renderings = createRenderings(frames, options, scale);
  if (!renderings.length) {
    return { canvas: document.createElement('canvas'), frames: [], renderings: [] };
  }
  const baseW = renderings[0].sourceW;
  const baseH = renderings[0].sourceH;

  const frameWidth = renderings[0]?.canvas.width || Math.max(1, Math.round(baseW * scale));
  const frameHeight = renderings[0]?.canvas.height || Math.max(1, Math.round(baseH * scale));
  const footprintW = frameWidth + options.extrude * 2;
  const footprintH = frameHeight + options.extrude * 2;

  const sizeTarget = options.sheetSize ? Math.max(options.sheetSize, footprintW + options.padding * 2) : 0;
  const wrapLimit = sizeTarget ? Math.max(sizeTarget - options.padding, footprintW + options.padding) : Infinity;
  let cursorX = options.padding;
  let cursorY = options.padding;
  let maxX = 0;
  let maxY = 0;
  const placements = renderings.map(render => {
    if (cursorX + footprintW > wrapLimit) {
      cursorX = options.padding;
      cursorY += footprintH + options.padding;
    }
    const placement = { render, x: cursorX, y: cursorY };
    maxX = Math.max(maxX, cursorX + footprintW);
    maxY = Math.max(maxY, cursorY + footprintH);
    cursorX += footprintW + options.padding;
    return placement;
  });

  let sheetWidth = sizeTarget ? Math.max(sizeTarget, maxX + options.padding) : maxX + options.padding;
  let sheetHeight = maxY + options.padding;
  if (options.pot) {
    sheetWidth = nextPowerOfTwo(sheetWidth);
    sheetHeight = nextPowerOfTwo(sheetHeight);
  }

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetWidth;
  sheetCanvas.height = sheetHeight;
  const ctx = sheetCanvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;

  const metaFrames = [];
  placements.forEach(({ render, x, y }) => {
    const drawX = x + options.extrude;
    const drawY = y + options.extrude;
    ctx.drawImage(render.canvas, drawX, drawY);
    if (options.extrude > 0) {
      drawExtrude(ctx, render.canvas, drawX, drawY, options.extrude);
    }
    const pivotSource = render.pivot || { x: Math.round(render.sourceW / 2), y: Math.round(render.sourceH / 2) };
    metaFrames.push({
      name: render.name,
      duration: render.duration,
      frame: { x: drawX, y: drawY, w: render.canvas.width, h: render.canvas.height },
      source: { w: render.sourceW, h: render.sourceH },
      scale,
      pivot: pivotSource,
    });
  });

  return { canvas: sheetCanvas, frames: metaFrames, renderings };
}

async function buildCombinedSheet(animations, options, scale) {
  if (!animations.length) return null;
  const renderGroups = animations.map(anim => ({
    name: anim.name,
    safeName: anim.safeName,
    renderings: createRenderings(anim.frames, options, scale),
  })).filter(group => group.renderings.length);
  if (!renderGroups.length) return null;
  const frameWidth = renderGroups[0].renderings[0].canvas.width;
  const frameHeight = renderGroups[0].renderings[0].canvas.height;
  const rowHeight = frameHeight + options.extrude * 2 + options.padding * 2;
  const maxFrames = Math.max(...renderGroups.map(g => g.renderings.length));
  const labelFont = '18px "Press Start 2P", monospace';
  const measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = labelFont;
  const labelWidth = Math.max(...renderGroups.map(g => measureCtx.measureText(g.name).width)) + options.padding * 2;
  const sheetWidth = labelWidth + maxFrames * (frameWidth + options.extrude * 2 + options.padding) + options.padding;
  const sheetHeight = renderGroups.length * rowHeight + options.padding * 2;
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = Math.ceil(sheetWidth);
  sheetCanvas.height = Math.ceil(sheetHeight);
  const ctx = sheetCanvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1b1f29';
  ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
  ctx.font = labelFont;
  ctx.fillStyle = '#d7dbf5';
  ctx.textBaseline = 'top';
  ctx.fillText(options.baseName.toUpperCase(), sheetCanvas.width - 240, options.padding * 0.5);
  ctx.textBaseline = 'middle';
  const meta = [];
  renderGroups.forEach((group, rowIndex) => {
    const baseY = options.padding + rowIndex * rowHeight;
    ctx.fillText(group.name, options.padding, baseY + rowHeight / 2);
    let cursorX = labelWidth;
    group.renderings.forEach((render, frameIndex) => {
      const drawX = cursorX + options.extrude;
      const drawY = baseY + options.extrude;
      ctx.drawImage(render.canvas, drawX, drawY);
      if (options.extrude) {
        drawExtrude(ctx, render.canvas, drawX, drawY, options.extrude);
      }
      meta.push({
        animation: group.name,
        frameIndex,
        frame: { x: drawX, y: drawY, w: render.canvas.width, h: render.canvas.height },
        duration: render.duration,
      });
      cursorX += render.canvas.width + options.extrude * 2 + options.padding;
    });
  });
  const sheetData = await canvasToUint8(sheetCanvas, options.format);
  const metaBytes = encoder.encode(JSON.stringify({ animations: meta }, null, 2));
  return [
    {
      name: `${options.baseName}/combined@${scale}x.${options.format}`,
      data: sheetData,
    },
    {
      name: `${options.baseName}/combined@${scale}x.json`,
      data: metaBytes,
    },
  ];
}

function createRenderings(frames, options, scale) {
  const baseW = Math.max(1, Math.round(options.size.w || frames[0]?.snapshot?.layers?.[0]?.width || 1));
  const baseH = Math.max(1, Math.round(options.size.h || frames[0]?.snapshot?.layers?.[0]?.height || 1));
  return frames.map(frame => {
    const canvas = renderFrameCanvas(frame.snapshot, scale, baseW, baseH);
    const pivotSource = frame.pivot
      ? {
          x: Math.max(0, Math.min(baseW - 1, Math.round(frame.pivot.x))),
          y: Math.max(0, Math.min(baseH - 1, Math.round(frame.pivot.y))),
        }
      : {
          x: Math.round(baseW / 2),
          y: Math.round(baseH / 2),
        };
    return {
      canvas,
      name: frame.name,
      duration: frame.durationMs ?? options.defaultDuration,
      sourceW: baseW,
      sourceH: baseH,
      pivot: pivotSource,
    };
  });
}

function renderFrameCanvas(snapshot, scale, baseW, baseH) {
  return snapshotToCanvas(snapshot, {
    scale,
    baseWidth: baseW,
    baseHeight: baseH,
  });
}

function drawExtrude(ctx, source, x, y, extrude) {
  const w = source.width;
  const h = source.height;
  for (let i = 1; i <= extrude; i++) {
    ctx.drawImage(source, 0, 0, w, 1, x, y - i, w, 1);
    ctx.drawImage(source, 0, h - 1, w, 1, x, y + h - 1 + i, w, 1);
    ctx.drawImage(source, 0, 0, 1, h, x - i, y, 1, h);
    ctx.drawImage(source, w - 1, 0, 1, h, x + w - 1 + i, y, 1, h);
  }
  ctx.drawImage(source, 0, 0, 1, 1, x - extrude, y - extrude, extrude, extrude);
  ctx.drawImage(source, w - 1, 0, 1, 1, x + w, y - extrude, extrude, extrude);
  ctx.drawImage(source, 0, h - 1, 1, 1, x - extrude, y + h, extrude, extrude);
  ctx.drawImage(source, w - 1, h - 1, 1, 1, x + w, y + h, extrude, extrude);
}

function buildMetadataBytes(sheet, scale, options, animationName) {
  if (options.meta !== 'aseprite') return null;
  const framesPayload = {};
  sheet.frames.forEach(entry => {
    const pivotSource = entry.pivot || { x: entry.source.w / 2, y: entry.source.h / 2 };
    const pivot = {
      x: Number((pivotSource.x / Math.max(1, entry.source.w)).toFixed(4)),
      y: Number((pivotSource.y / Math.max(1, entry.source.h)).toFixed(4)),
    };
    framesPayload[entry.name] = {
      frame: entry.frame,
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: entry.source.w, h: entry.source.h },
      sourceSize: { w: entry.source.w, h: entry.source.h },
      duration: entry.duration,
      pivot,
    };
  });
  const json = {
    frames: framesPayload,
    meta: {
      app: 'SpriteLab',
      version: '1.0',
      image: `sheet@${scale}x.${options.format}`,
      format: 'RGBA8888',
      size: { w: sheet.canvas.width, h: sheet.canvas.height },
      scale: scale.toFixed(2),
      animation: animationName || '',
    },
  };
  return encoder.encode(JSON.stringify(json, null, 2));
}

function buildAnimationSummaryFile(animations, options, scales) {
  if (!animations?.length) return null;
  const summary = {
    project: options.baseName,
    variants: scales,
    canvasSize: options.size,
    sheetSizeTarget: options.sheetSize || 0,
    animations: animations.map(anim => ({
      id: anim.id,
      name: anim.name,
      frames: (anim.frames || []).map((frame, index) => ({
        index,
        name: frame.name || `frame_${index + 1}`,
        durationMs: frame.durationMs ?? options.defaultDuration,
        pivot: frame.pivot ? { x: frame.pivot.x, y: frame.pivot.y } : null,
      })),
    })),
  };
  return {
    name: `${options.baseName}/meta/animations.json`,
    data: encoder.encode(JSON.stringify(summary, null, 2)),
  };
}

function buildPaletteFiles(options) {
  const colors = Array.isArray(AppRef?.colorHistory) ? AppRef.colorHistory : [];
  const normalized = Array.from(new Set(colors.map(normalizeHexColor).filter(Boolean)));
  if (!normalized.length) return [];
  const header = [
    'GIMP Palette',
    `Name: ${options.baseName}`,
    'Columns: 0',
    '#',
  ];
  const gpl = header.concat(normalized.map(hex => {
    const { r, g, b } = hexToRgb(hex);
    return `${r}\t${g}\t${b}\t${hex}`;
  })).join('\n');
  const json = JSON.stringify({ palette: normalized }, null, 2);
  return [
    { name: `${options.baseName}/meta/palette.gpl`, data: encoder.encode(gpl) },
    { name: `${options.baseName}/meta/palette.json`, data: encoder.encode(json) },
  ];
}

function createZipArchive(files) {
  const chunks = [];
  const fileRecords = [];
  let offset = 0;
  const now = new Date();
  const dosTime = toDosTime(now);
  const dosDate = toDosDate(now);

  files.forEach(file => {
    const nameBytes = encoder.encode(file.name.replace(/\\/g, '/'));
    const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data || []);
    const crc = crc32(data);
    const size = data.length;
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    chunks.push(localHeader, data);
    fileRecords.push({ nameBytes, crc, size, offset, dosTime, dosDate });
    offset += localHeader.length + size;
  });

  const centralChunks = [];
  let centralSize = 0;
  fileRecords.forEach(record => {
    const central = new Uint8Array(46 + record.nameBytes.length);
    const view = new DataView(central.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 0x031E, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, record.dosTime, true);
    view.setUint16(14, record.dosDate, true);
    view.setUint32(16, record.crc, true);
    view.setUint32(20, record.size, true);
    view.setUint32(24, record.size, true);
    view.setUint16(28, record.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, record.offset, true);
    central.set(record.nameBytes, 46);
    centralChunks.push(central);
    centralSize += central.length;
  });

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, fileRecords.length, true);
  endView.setUint16(10, fileRecords.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...chunks, ...centralChunks, end], { type: 'application/zip' });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToUint8(canvas, format = 'png') {
  const mime = format.toLowerCase() === 'png' ? 'image/png' : `image/${format}`;
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to encode canvas'));
        return;
      }
      blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer))).catch(reject);
    }, mime);
  });
}

function clampInt(value, min, max, fallback) {
  const num = Math.round(Number(value));
  if (Number.isFinite(num)) return Math.min(max, Math.max(min, num));
  return fallback;
}

function normalizeHexColor(color) {
  if (typeof color !== 'string') return null;
  let hex = color.trim().toLowerCase();
  if (!hex) return null;
  if (hex[0] !== '#') hex = `#${hex}`;
  if (/^#([0-9a-f]{3})$/.test(hex)) {
    const [, r, g, b] = hex;
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#([0-9a-f]{6})$/.test(hex)) return hex;
  return null;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'sprite_lab';
}

function syncActiveAnimationState() {
  if (!AppRef?.animations || !AppRef.activeAnimationId) return;
  const active = AppRef.animations.find(a => a.id === AppRef.activeAnimationId);
  if (!active) return;
  active.framesState = getFrameSnapshots();
  active.activeFrameIndex = AppRef.activeFrameIndex || 0;
}

function getAnimationsForExport({ includeAll } = {}) {
  const list = Array.isArray(AppRef?.animations) ? AppRef.animations : [];
  const result = [];
  list.forEach(anim => {
    const frames = Array.isArray(anim.framesState) ? anim.framesState : [];
    if (!frames.length) return;
    result.push({
      id: anim.id,
      name: anim.name || anim.id,
      safeName: sanitizeName(anim.name || anim.id || 'animation'),
      frames,
    });
  });
  if (!includeAll && result.length) {
    const active = result.find(anim => anim.id === AppRef.activeAnimationId);
    return active ? [active] : [result[0]];
  }
  if (!result.length) {
    const frames = getFrameSnapshots();
    if (frames.length) {
      result.push({
        id: 'anim_current',
        name: 'animation',
        safeName: 'animation',
        frames,
      });
    }
  }
  return result;
}

function nextPowerOfTwo(value) {
  let v = Math.max(1, Math.ceil(value));
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return v;
}

function toDosTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return (hours << 11) | (minutes << 5) | seconds;
}

function toDosDate(date) {
  const year = date.getFullYear() - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return (year << 9) | (month << 5) | day;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function setExportStatus(text) {
  const el = document.getElementById('statusLeft');
  if (el) el.textContent = text;
}

function nextTick() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
