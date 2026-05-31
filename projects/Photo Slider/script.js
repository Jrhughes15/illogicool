const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const elements = {
  stage: document.querySelector("#compareStage"),
  comparePanel: document.querySelector("#comparePanel"),
  beforeInput: document.querySelector("#beforeInput"),
  afterInput: document.querySelector("#afterInput"),
  beforeUrlInput: document.querySelector("#beforeUrlInput"),
  afterUrlInput: document.querySelector("#afterUrlInput"),
  beforeImage: document.querySelector("#beforeImage"),
  afterImage: document.querySelector("#afterImage"),
  beforeFileName: document.querySelector("#beforeFileName"),
  afterFileName: document.querySelector("#afterFileName"),
  beforeStageLabel: document.querySelector("#beforeStageLabel"),
  afterStageLabel: document.querySelector("#afterStageLabel"),
  sliderRange: document.querySelector("#sliderRange"),
  rangeText: document.querySelector("#rangeText"),
  resetViewButton: document.querySelector("#resetViewButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  exitFullscreenButton: document.querySelector("#exitFullscreenButton"),
  exportButton: document.querySelector("#exportButton"),
  exportFormat: document.querySelector("#exportFormat"),
  exportWidth: document.querySelector("#exportWidth"),
  gifFrames: document.querySelector("#gifFrames"),
  swapButton: document.querySelector("#swapButton"),
  labelsButton: document.querySelector("#labelsButton"),
  themeButton: document.querySelector("#themeButton"),
  panButton: document.querySelector("#panButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomValue: document.querySelector("#zoomValue"),
  clearButton: document.querySelector("#clearButton"),
  statusMessage: document.querySelector("#statusMessage"),
  beforeLabelInput: document.querySelector("#beforeLabelInput"),
  afterLabelInput: document.querySelector("#afterLabelInput")
};

const state = {
  images: {
    before: null,
    after: null
  },
  labels: {
    before: "Before",
    after: "After",
    visible: true
  },
  view: {
    position: 50,
    direction: "horizontal",
    compareMode: "slider",
    zoom: 1,
    panX: 0,
    panY: 0,
    panEnabled: false
  },
  theme: "light",
  dragging: null
};

let activeSlot = "before";
let spaceDown = false;

function setStatus(message) {
  elements.statusMessage.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    elements.statusMessage.textContent = "";
  }, 5000);
}

function setPosition(value) {
  state.view.position = Math.max(0, Math.min(100, Number(value)));
  elements.stage.style.setProperty("--position", `${state.view.position}%`);
  elements.stage.style.setProperty("--position-value", state.view.position);
  elements.sliderRange.value = String(Math.round(state.view.position));
}

function setDirection(direction) {
  state.view.direction = direction;
  elements.stage.dataset.direction = direction;
  document.querySelectorAll(".direction-button").forEach((button) => {
    const active = button.dataset.direction === direction;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setCompareMode(compareMode) {
  state.view.compareMode = compareMode;
  elements.stage.dataset.compareMode = compareMode;
  elements.rangeText.textContent = compareMode === "blend" ? "Opacity" : "Reveal";
  document.querySelectorAll(".compare-mode-button").forEach((button) => {
    const active = button.dataset.compareMode === compareMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setZoom(value, anchor) {
  const previous = state.view.zoom;
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(value)));
  if (anchor && previous !== next) {
    const rect = elements.stage.getBoundingClientRect();
    const dx = anchor.x - (rect.left + rect.width / 2) - state.view.panX;
    const dy = anchor.y - (rect.top + rect.height / 2) - state.view.panY;
    const ratio = next / previous;
    state.view.panX -= dx * (ratio - 1);
    state.view.panY -= dy * (ratio - 1);
  }
  state.view.zoom = next;
  clampPan();
  applyView();
}

function clampPan() {
  if (state.view.zoom <= 1) {
    state.view.panX = 0;
    state.view.panY = 0;
    return;
  }

  const rect = elements.stage.getBoundingClientRect();
  const limitX = (rect.width * (state.view.zoom - 1)) / 2;
  const limitY = (rect.height * (state.view.zoom - 1)) / 2;
  state.view.panX = Math.max(-limitX, Math.min(limitX, state.view.panX));
  state.view.panY = Math.max(-limitY, Math.min(limitY, state.view.panY));
}

function applyView() {
  elements.stage.style.setProperty("--zoom", state.view.zoom);
  elements.stage.style.setProperty("--pan-x", `${state.view.panX}px`);
  elements.stage.style.setProperty("--pan-y", `${state.view.panY}px`);
  elements.zoomValue.textContent = `${Math.round(state.view.zoom * 100)}%`;
  elements.panButton.classList.toggle("active", state.view.panEnabled);
  elements.panButton.setAttribute("aria-pressed", String(state.view.panEnabled));
  elements.stage.classList.toggle("is-panning", state.view.panEnabled || spaceDown);
}

function updateReadyState() {
  const ready = Boolean(state.images.before?.src && state.images.after?.src);
  elements.stage.classList.toggle("is-ready", ready);
  elements.stage.classList.toggle("is-empty", !ready);
  elements.stage.classList.toggle("show-labels", state.labels.visible);
}

function updateLabels() {
  state.labels.before = elements.beforeLabelInput.value.trim() || "Before";
  state.labels.after = elements.afterLabelInput.value.trim() || "After";
  elements.beforeStageLabel.textContent = state.labels.before;
  elements.afterStageLabel.textContent = state.labels.after;
  elements.labelsButton.classList.toggle("active", state.labels.visible);
  elements.labelsButton.setAttribute("aria-pressed", String(state.labels.visible));
  updateReadyState();
}

function updateTheme() {
  document.body.classList.toggle("dark-theme", state.theme === "dark");
  elements.themeButton.textContent = state.theme === "dark" ? "Light" : "Dark";
}

function setImageElement(slot) {
  const imageData = state.images[slot];
  const image = slot === "before" ? elements.beforeImage : elements.afterImage;
  const fileName = slot === "before" ? elements.beforeFileName : elements.afterFileName;
  const urlInput = slot === "before" ? elements.beforeUrlInput : elements.afterUrlInput;

  image.removeAttribute("src");
  if (imageData?.kind === "url") {
    image.crossOrigin = "anonymous";
  } else {
    image.removeAttribute("crossorigin");
  }
  if (imageData?.src) {
    image.src = imageData.src;
  }
  fileName.textContent = imageData?.name || "Drop, paste, upload, or load URL";
  urlInput.value = imageData?.kind === "url" ? imageData.src : "";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setImageFromFile(slot, file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Choose an image file.");
    return;
  }
  const src = await fileToDataUrl(file);
  state.images[slot] = {
    kind: "file",
    name: file.name || `${slot} image`,
    src
  };
  setImageElement(slot);
  updateReadyState();
  activeSlot = slot === "before" ? "after" : "before";
  updateActiveSlot();
}

function setImageFromUrl(slot, url) {
  const cleanUrl = url.trim();
  if (!cleanUrl) return;
  state.images[slot] = {
    kind: "url",
    name: cleanUrl.split("/").pop() || `${slot} URL image`,
    src: cleanUrl
  };
  setImageElement(slot);
  updateReadyState();
}

function updateActiveSlot() {
  document.querySelectorAll(".upload-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.slot === activeSlot);
  });
}

function swapImages() {
  [state.images.before, state.images.after] = [state.images.after, state.images.before];
  [state.labels.before, state.labels.after] = [state.labels.after, state.labels.before];
  elements.beforeLabelInput.value = state.labels.before;
  elements.afterLabelInput.value = state.labels.after;
  setImageElement("before");
  setImageElement("after");
  updateLabels();
  updateReadyState();
  setStatus("Before and after swapped.");
}

function clearImages() {
  state.images.before = null;
  state.images.after = null;
  elements.beforeInput.value = "";
  elements.afterInput.value = "";
  setImageElement("before");
  setImageElement("after");
  updateReadyState();
  setStatus("Images cleared.");
}

function pointerToPercent(event) {
  const rect = elements.stage.getBoundingClientRect();
  const raw = state.view.direction === "horizontal"
    ? ((event.clientX - rect.left) / rect.width) * 100
    : ((event.clientY - rect.top) / rect.height) * 100;
  return Math.max(0, Math.min(100, raw));
}

function shouldPan(event) {
  return state.view.panEnabled || spaceDown || event.button === 1;
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (elements.comparePanel.requestFullscreen) {
    elements.comparePanel.requestFullscreen();
  }
}

function getExportSize(format) {
  const width = Math.max(480, Math.min(2400, Number(elements.exportWidth.value) || 1200));
  const stageRect = elements.stage.getBoundingClientRect();
  const baseRatio = stageRect.height / Math.max(1, stageRect.width);
  if (format === "side-by-side") {
    return { width, height: Math.round(width * baseRatio / 2) };
  }
  if (format === "top-bottom") {
    return { width, height: Math.round(width * baseRatio * 2) };
  }
  return { width, height: Math.round(width * baseRatio) };
}

function requireImages() {
  if (!state.images.before?.src || !state.images.after?.src) {
    setStatus("Upload both images before exporting.");
    return false;
  }
  return true;
}

async function exportSelected() {
  if (!requireImages()) return;
  updateLabels();
  const format = elements.exportFormat.value;
  const labels = format !== "gif";

  try {
    if (format === "gif") {
      setStatus("Building GIF...");
      await new Promise((resolve) => setTimeout(resolve, 40));
      exportGif(labels);
    } else {
      const canvas = renderExportCanvas(format, labels);
      downloadCanvas(canvas, `${format}-comparison.png`);
      setStatus("Exported PNG.");
    }
  } catch (error) {
    setStatus("Export failed. Remote image URLs may block export unless they allow CORS.");
  }
}

function renderExportCanvas(format, labels, position = state.view.position) {
  const size = getExportSize(format);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101614";
  ctx.fillRect(0, 0, size.width, size.height);

  if (format === "side-by-side") {
    const panelWidth = size.width / 2;
    drawImagePanel(ctx, elements.beforeImage, 0, 0, panelWidth, size.height, labels ? state.labels.before : "");
    drawImagePanel(ctx, elements.afterImage, panelWidth, 0, panelWidth, size.height, labels ? state.labels.after : "");
    return canvas;
  }

  if (format === "top-bottom") {
    const panelHeight = size.height / 2;
    drawImagePanel(ctx, elements.beforeImage, 0, 0, size.width, panelHeight, labels ? state.labels.before : "");
    drawImagePanel(ctx, elements.afterImage, 0, panelHeight, size.width, panelHeight, labels ? state.labels.after : "");
    return canvas;
  }

  drawCurrentView(ctx, size.width, size.height, position);
  if (labels) {
    drawLabel(ctx, state.labels.before, 16, state.view.direction === "vertical" ? size.height - 46 : 16);
    drawLabel(ctx, state.labels.after, size.width - 16, 16, "right");
  }
  return canvas;
}

function drawCurrentView(ctx, width, height, position, compareMode = state.view.compareMode) {
  drawContainImage(ctx, elements.afterImage, 0, 0, width, height, true);

  if (compareMode === "blend") {
    ctx.save();
    ctx.globalAlpha = 1 - (position / 100);
    drawContainImage(ctx, elements.beforeImage, 0, 0, width, height, true);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.beginPath();
  if (state.view.direction === "horizontal") {
    ctx.rect(0, 0, width * (position / 100), height);
  } else {
    ctx.rect(0, 0, width, height * (position / 100));
  }
  ctx.clip();
  drawContainImage(ctx, elements.beforeImage, 0, 0, width, height, true);
  ctx.restore();
  drawDivider(ctx, width, height, position);
}

function drawImagePanel(ctx, image, x, y, width, height, label) {
  ctx.save();
  ctx.fillStyle = "#101614";
  ctx.fillRect(x, y, width, height);
  drawContainImage(ctx, image, x, y, width, height, false);
  if (label) drawLabel(ctx, label, x + 16, y + 16);
  ctx.restore();
}

function drawContainImage(ctx, image, x, y, width, height, useView) {
  const naturalWidth = image.naturalWidth || width;
  const naturalHeight = image.naturalHeight || height;
  const fit = Math.min(width / naturalWidth, height / naturalHeight) * (useView ? state.view.zoom : 1);
  const drawWidth = naturalWidth * fit;
  const drawHeight = naturalHeight * fit;
  const panX = useView ? state.view.panX * (width / Math.max(1, elements.stage.getBoundingClientRect().width)) : 0;
  const panY = useView ? state.view.panY * (height / Math.max(1, elements.stage.getBoundingClientRect().height)) : 0;
  const drawX = x + (width - drawWidth) / 2 + panX;
  const drawY = y + (height - drawHeight) / 2 + panY;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawDivider(ctx, width, height, position) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(0,0,0,.3)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  if (state.view.direction === "horizontal") {
    const x = width * (position / 100);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  } else {
    const y = height * (position / 100);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLabel(ctx, text, x, y, align = "left") {
  const label = String(text || "").toUpperCase();
  ctx.save();
  ctx.font = "800 18px Arial, sans-serif";
  ctx.textBaseline = "top";
  const metrics = ctx.measureText(label);
  const width = metrics.width + 24;
  const height = 34;
  const left = align === "right" ? x - width : x;
  roundedRect(ctx, left, y, width, height, 6);
  ctx.fillStyle = "rgba(16, 20, 18, 0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, left + 12, y + 8);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function exportGif(labels) {
  const frameCount = Math.max(8, Math.min(40, Number(elements.gifFrames.value) || 24));
  const size = getExportSize("current");
  const gifWidth = Math.min(900, size.width);
  const gifHeight = Math.round(size.height * (gifWidth / size.width));
  const encoder = new SimpleGifEncoder(gifWidth, gifHeight, 6);
  const compareMode = state.view.compareMode;

  for (let i = 0; i < frameCount; i += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = gifWidth;
    canvas.height = gifHeight;
    const ctx = canvas.getContext("2d");
    const t = frameCount === 1 ? 0 : i / (frameCount - 1);
    const revealProgress = (t <= 0.5 ? t * 2 : (1 - t) * 2) * 100;
    const position = compareMode === "slider" ? 100 - revealProgress : revealProgress;
    drawCurrentView(ctx, gifWidth, gifHeight, position, compareMode);
    if (labels) {
      drawLabel(ctx, state.labels.before, 16, state.view.direction === "vertical" ? gifHeight - 46 : 16);
      drawLabel(ctx, state.labels.after, gifWidth - 16, 16, "right");
    }
    encoder.addFrame(ctx.getImageData(0, 0, gifWidth, gifHeight).data, 7);
  }

  const blob = encoder.finish();
  const link = document.createElement("a");
  link.download = "animated-reveal.gif";
  link.href = URL.createObjectURL(blob);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  setStatus("Exported ping-pong GIF.");
}

class SimpleGifEncoder {
  constructor(width, height, repeat = 0) {
    this.width = width;
    this.height = height;
    this.bytes = [];
    this.writeString("GIF89a");
    this.writeShort(width);
    this.writeShort(height);
    this.writeByte(0xf7);
    this.writeByte(0);
    this.writeByte(0);
    this.writePalette();
    this.writeString("!\xff\u000bNETSCAPE2.0\u0003\u0001");
    this.writeShort(repeat);
    this.writeByte(0);
  }

  addFrame(rgba, delayCs) {
    const indexed = new Uint8Array(this.width * this.height);
    for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
      indexed[p] = this.quantize(rgba[i], rgba[i + 1], rgba[i + 2]);
    }
    this.writeString("!\xf9\u0004");
    this.writeByte(0);
    this.writeShort(delayCs);
    this.writeByte(0);
    this.writeByte(0);
    this.writeByte(0x2c);
    this.writeShort(0);
    this.writeShort(0);
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.writeByte(0);
    this.writeByte(8);
    this.writeSubBlocks(this.lzwEncode(indexed));
  }

  finish() {
    this.writeByte(0x3b);
    return new Blob([new Uint8Array(this.bytes)], { type: "image/gif" });
  }

  quantize(r, g, b) {
    return this.findNearestPaletteIndex(r, g, b);
  }

  writePalette() {
    this.palette = [];
    const levels = [0, 51, 102, 153, 204, 255];
    for (const r of levels) {
      for (const g of levels) {
        for (const b of levels) {
          this.palette.push([r, g, b]);
        }
      }
    }

    const ramp = [
      8, 18, 28, 38, 48, 58, 68, 78, 88, 98,
      108, 118, 128, 138, 148, 158, 168, 178, 188, 198,
      208, 218, 228, 238, 248
    ];
    for (const value of ramp) {
      this.palette.push([value, value, value]);
    }

    while (this.palette.length < 256) {
      this.palette.push([0, 0, 0]);
    }

    this.paletteCache = new Map();
    for (const [r, g, b] of this.palette) {
      this.writeByte(r);
      this.writeByte(g);
      this.writeByte(b);
    }
  }

  findNearestPaletteIndex(r, g, b) {
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    if (this.paletteCache.has(key)) {
      return this.paletteCache.get(key);
    }

    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < 241; i += 1) {
      const color = this.palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    this.paletteCache.set(key, bestIndex);
    return bestIndex;
  }

  lzwEncode(indices) {
    const clear = 256;
    const end = 257;
    const out = [];
    let bitBuffer = 0;
    let bitCount = 0;
    const codeSize = 9;

    const writeCode = (code) => {
      bitBuffer |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        out.push(bitBuffer & 255);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    };

    // Emit a deliberately simple GIF LZW stream. By clearing before the decoder's
    // table reaches 512 entries, every code remains 9 bits and avoids fragile
    // dictionary growth edge cases across GIF decoders.
    writeCode(clear);
    let codesSinceClear = 0;
    for (let i = 0; i < indices.length; i += 1) {
      writeCode(indices[i]);
      codesSinceClear += 1;
      if (codesSinceClear >= 240 && i < indices.length - 1) {
        writeCode(clear);
        codesSinceClear = 0;
      }
    }
    writeCode(end);
    if (bitCount > 0) out.push(bitBuffer & 255);
    return out;
  }

  writeSubBlocks(data) {
    for (let i = 0; i < data.length; i += 255) {
      const block = data.slice(i, i + 255);
      this.writeByte(block.length);
      this.bytes.push(...block);
    }
    this.writeByte(0);
  }

  writeString(value) {
    for (let i = 0; i < value.length; i += 1) this.writeByte(value.charCodeAt(i));
  }

  writeShort(value) {
    this.writeByte(value & 255);
    this.writeByte((value >> 8) & 255);
  }

  writeByte(value) {
    this.bytes.push(value & 255);
  }
}

elements.beforeInput.addEventListener("change", () => setImageFromFile("before", elements.beforeInput.files?.[0]));
elements.afterInput.addEventListener("change", () => setImageFromFile("after", elements.afterInput.files?.[0]));

document.querySelectorAll("[data-load-url]").forEach((button) => {
  button.addEventListener("click", () => {
    const slot = button.dataset.loadUrl;
    const input = slot === "before" ? elements.beforeUrlInput : elements.afterUrlInput;
    setImageFromUrl(slot, input.value);
  });
});

document.querySelectorAll(".upload-card").forEach((card) => {
  card.addEventListener("click", () => {
    activeSlot = card.dataset.slot;
    updateActiveSlot();
  });
  card.addEventListener("dragover", (event) => {
    event.preventDefault();
    card.classList.add("is-dragover");
  });
  card.addEventListener("dragleave", () => card.classList.remove("is-dragover"));
  card.addEventListener("drop", async (event) => {
    event.preventDefault();
    card.classList.remove("is-dragover");
    activeSlot = card.dataset.slot;
    updateActiveSlot();
    await setImageFromFile(activeSlot, event.dataTransfer.files?.[0]);
  });
});

document.addEventListener("paste", async (event) => {
  const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith("image/"));
  if (file) {
    await setImageFromFile(activeSlot, file);
    setStatus(`Pasted image into ${activeSlot}.`);
  }
});

elements.sliderRange.addEventListener("input", (event) => setPosition(event.target.value));
elements.resetViewButton.addEventListener("click", () => {
  setPosition(50);
  state.view.zoom = 1;
  state.view.panX = 0;
  state.view.panY = 0;
  applyView();
});
elements.fullscreenButton.addEventListener("click", toggleFullscreen);
elements.exitFullscreenButton.addEventListener("click", toggleFullscreen);
elements.exportButton.addEventListener("click", exportSelected);
elements.swapButton.addEventListener("click", swapImages);
elements.labelsButton.addEventListener("click", () => {
  state.labels.visible = !state.labels.visible;
  updateLabels();
});
elements.themeButton.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  updateTheme();
});
elements.panButton.addEventListener("click", () => {
  state.view.panEnabled = !state.view.panEnabled;
  applyView();
});
elements.zoomInButton.addEventListener("click", () => setZoom(state.view.zoom * 1.2));
elements.zoomOutButton.addEventListener("click", () => setZoom(state.view.zoom / 1.2));
elements.clearButton.addEventListener("click", clearImages);

document.querySelectorAll(".direction-button").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});

document.querySelectorAll(".compare-mode-button").forEach((button) => {
  button.addEventListener("click", () => setCompareMode(button.dataset.compareMode));
});

[elements.beforeLabelInput, elements.afterLabelInput].forEach((input) => {
  input.addEventListener("input", updateLabels);
});

elements.stage.addEventListener("wheel", (event) => {
  if (!elements.stage.classList.contains("is-ready")) return;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  setZoom(state.view.zoom * factor, { x: event.clientX, y: event.clientY });
}, { passive: false });

elements.stage.addEventListener("pointerdown", (event) => {
  if (!elements.stage.classList.contains("is-ready")) return;
  elements.stage.setPointerCapture(event.pointerId);
  elements.stage.classList.add("is-dragging");
  state.dragging = {
    mode: shouldPan(event) ? "pan" : "slider",
    x: event.clientX,
    y: event.clientY,
    panX: state.view.panX,
    panY: state.view.panY
  };
  if (state.dragging.mode === "slider") {
    setPosition(pointerToPercent(event));
  }
});

elements.stage.addEventListener("pointermove", (event) => {
  if (!state.dragging) return;
  if (state.dragging.mode === "pan") {
    state.view.panX = state.dragging.panX + event.clientX - state.dragging.x;
    state.view.panY = state.dragging.panY + event.clientY - state.dragging.y;
    clampPan();
    applyView();
  } else {
    setPosition(pointerToPercent(event));
  }
});

function endPointer(event) {
  state.dragging = null;
  elements.stage.classList.remove("is-dragging");
  if (elements.stage.hasPointerCapture(event.pointerId)) {
    elements.stage.releasePointerCapture(event.pointerId);
  }
}

elements.stage.addEventListener("pointerup", endPointer);
elements.stage.addEventListener("pointercancel", endPointer);

document.addEventListener("keydown", (event) => {
  if (["INPUT", "SELECT"].includes(document.activeElement.tagName)) return;

  if (event.code === "Space") {
    event.preventDefault();
    spaceDown = true;
    applyView();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    setPosition(state.view.position - (event.shiftKey ? 10 : 2));
  } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    setPosition(state.view.position + (event.shiftKey ? 10 : 2));
  } else if (event.key.toLowerCase() === "h") {
    setDirection("horizontal");
  } else if (event.key.toLowerCase() === "v") {
    setDirection("vertical");
  } else if (event.key.toLowerCase() === "f") {
    toggleFullscreen();
  } else if (event.key === "+" || event.key === "=") {
    setZoom(state.view.zoom * 1.2);
  } else if (event.key === "-") {
    setZoom(state.view.zoom / 1.2);
  } else if (event.key === "0") {
    state.view.zoom = 1;
    state.view.panX = 0;
    state.view.panY = 0;
    applyView();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    spaceDown = false;
    applyView();
  }
});

window.addEventListener("resize", () => {
  clampPan();
  applyView();
});

setPosition(50);
setDirection("horizontal");
setCompareMode("slider");
updateLabels();
updateTheme();
applyView();
updateActiveSlot();
