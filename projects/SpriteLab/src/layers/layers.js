// Layer system: manages per-layer canvases, UI bindings, and composite rendering.

let AppRef = null;
let displayCtx = null;
let listEl = null;
let addBtn = null;
let dupBtn = null;
let cloneAllBtn = null;
let delBtn = null;
let moveUpBtn = null;
let moveDownBtn = null;
let mergeDownBtn = null;
let compositeScheduled = false;
let layerCounter = 0;

const layers = [];
let activeLayerId = '';

function emitLayerAction(type, extra = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:layerAction', {
    detail: { type, ...extra },
  }));
}

const ICONS = {
  visible: { on: '👁', off: '🚫' },
  lock: { on: '🔒', off: '🔓' },
  moveUp: '▲',
  moveDown: '▼',
  duplicate: '⧉',
  delete: '✖',
};

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

function createLayer({ name, copySource, id, visible = true, locked = false, opacity = 1 } = {}) {
  const { canvas, ctx } = makeCanvas(displayCtx.canvas.width, displayCtx.canvas.height);
  if (copySource) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(copySource, 0, 0);
  }
  return {
    id: id || `layer_${layerCounter++}`,
    name: name || `Layer ${layerCounter}`,
    visible,
    locked,
    opacity: Math.max(0, Math.min(1, opacity)),
    blend: 'normal',
    canvas,
    ctx,
  };
}

export function initLayerSystem(app, ctxDisplay) {
  AppRef = app;
  displayCtx = ctxDisplay;
  listEl = document.getElementById('layerList');
  addBtn = document.getElementById('layerAdd');
  dupBtn = document.getElementById('layerDup');
  cloneAllBtn = document.getElementById('layerCloneAll');
  delBtn = document.getElementById('layerDel');
  moveUpBtn = document.getElementById('layerMoveUp');
  moveDownBtn = document.getElementById('layerMoveDown');
  mergeDownBtn = document.getElementById('layerMergeDown');

  if (!displayCtx || !listEl) return;

  const existing = Array.isArray(app.layers) && app.layers.length
    ? app.layers
    : [{ id: 'layer_0', name: 'Base', visible: true, locked: false, opacity: 1 }];

  existing.forEach((layer, idx) => {
    const copySrc = idx === 0 ? displayCtx.canvas : null;
    const fresh = createLayer({
      name: layer.name,
      id: layer.id,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      copySource: copySrc,
    });
    layers.push(fresh);
    layerCounter = Math.max(layerCounter, Number(String(fresh.id).split('_').pop()) + 1 || layerCounter);
  });

  if (!layers.length) {
    layers.push(createLayer({ name: 'Layer 1' }));
  }

  activeLayerId = app.activeLayerId && layers.some(l => l.id === app.activeLayerId)
    ? app.activeLayerId
    : layers[layers.length - 1].id;
  AppRef.activeLayerId = activeLayerId;
  AppRef.layers = layers;

  bindUI();
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
}

function bindUI() {
  if (addBtn) addBtn.addEventListener('click', () => addLayer());
  if (dupBtn) dupBtn.addEventListener('click', () => duplicateLayer(activeLayerId));
  if (cloneAllBtn) cloneAllBtn.addEventListener('click', cloneActiveLayerToAllFrames);
  if (delBtn) delBtn.addEventListener('click', () => deleteLayer(activeLayerId));
  if (moveUpBtn) moveUpBtn.addEventListener('click', () => moveLayer(activeLayerId, 1));
  if (moveDownBtn) moveDownBtn.addEventListener('click', () => moveLayer(activeLayerId, -1));
  if (mergeDownBtn) mergeDownBtn.addEventListener('click', () => mergeLayerDown(activeLayerId));

  listEl.addEventListener('click', handleListClick);
  listEl.addEventListener('input', handleListInput);
  listEl.addEventListener('change', handleListInput);
}

function handleListClick(e) {
  const actionBtn = e.target.closest('[data-layer-action]');
  const row = e.target.closest('.layer-item');
  if (!row) return;
  const id = row.dataset.id;

  if (actionBtn) {
    const action = actionBtn.dataset.layerAction;
    e.stopPropagation();
    switch (action) {
      case 'toggle-visible': toggleLayerVisibility(id); break;
      case 'toggle-lock': toggleLayerLock(id); break;
    }
    return;
  }

  if (e.target.closest('input')) return;
  setActiveLayer(id);
}

function handleListInput(e) {
  const row = e.target.closest('.layer-item');
  if (!row) return;
  const id = row.dataset.id;
  const layer = layers.find(l => l.id === id);
  if (!layer) return;

  if (e.target.classList.contains('layer-name')) {
    let value = e.target.value;
    if (e.type === 'change') {
      value = value.trim() || layer.name || 'Layer';
      e.target.value = value;
    }
    layer.name = value;
    dispatchLayersChanged();
    return;
  }

  if (e.target.classList.contains('layer-opacity')) {
    let val = Number(e.target.value);
    if (!Number.isFinite(val)) val = layer.opacity * 100;
    val = Math.max(0, Math.min(100, val));
    e.target.value = String(Math.round(val));
    layer.opacity = val / 100;
    requestCompositeRender();
    dispatchLayersChanged();
  }
}

function renderLayerList() {
  if (!listEl) return;
  listEl.innerHTML = '';

  const ordered = [...layers].map(l => l).reverse();
  ordered.forEach(layer => {
    const li = document.createElement('li');
    li.className = [
      'layer-item',
      layer.id === activeLayerId ? 'is-active' : '',
      layer.locked ? 'is-locked' : '',
      layer.visible ? '' : 'is-hidden',
    ].filter(Boolean).join(' ');
    li.dataset.id = layer.id;
    const percent = Math.round((layer.opacity ?? 1) * 100);
    li.innerHTML = `
      <div class="layer-top">
        <div class="layer-flags">
          <button type="button" data-layer-action="toggle-visible" title="${layer.visible ? 'Hide layer' : 'Show layer'}">
            ${layer.visible ? ICONS.visible.on : ICONS.visible.off}
          </button>
          <button type="button" data-layer-action="toggle-lock" title="${layer.locked ? 'Unlock layer' : 'Lock layer'}">
            ${layer.locked ? ICONS.lock.on : ICONS.lock.off}
          </button>
        </div>
        <input class="layer-name" value="${escapeHtml(layer.name)}" />
        <label class="layer-opacity-wrap">
          <input class="layer-opacity" type="number" min="0" max="100" value="${percent}">
          <span>%</span>
        </label>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function dispatchLayersChanged() {
  if (AppRef) AppRef.layers = layers;
  window.dispatchEvent(new CustomEvent('app:layersChanged', { detail: { layers } }));
}

export function getActiveLayer() {
  return layers.find(layer => layer.id === activeLayerId) || null;
}

export function getActiveLayerCtx() {
  return getActiveLayer()?.ctx || null;
}

export function getLayerCtxById(id) {
  return layers.find(layer => layer.id === id)?.ctx || null;
}

export function isActiveLayerLocked() {
  const layer = getActiveLayer();
  return layer?.locked ?? false;
}

export function setActiveLayer(id) {
  if (!id || id === activeLayerId) return;
  if (!layers.some(l => l.id === id)) return;
  const prevId = activeLayerId;
  activeLayerId = id;
  if (AppRef) AppRef.activeLayerId = id;
  renderLayerList();
  window.dispatchEvent(new CustomEvent('app:activeLayerChanged', {
    detail: { layer: getActiveLayer(), previousId: prevId },
  }));
}

export function addLayer() {
  const idx = layers.length;
  const layer = createLayer({ name: `Layer ${idx + 1}` });
  layers.push(layer);
  setActiveLayer(layer.id);
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
  emitLayerAction('add');
}

export function duplicateLayer(id) {
  const src = layers.find(l => l.id === id) || getActiveLayer();
  if (!src) return;
  const dup = createLayer({
    name: `${src.name} Copy`,
    copySource: src.canvas,
  });
  const idx = layers.indexOf(src);
  layers.splice(idx + 1, 0, dup);
  setActiveLayer(dup.id);
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
  emitLayerAction('duplicate');
}

export function cloneActiveLayerToAllFrames() {
  const layer = getActiveLayer();
  if (!layer || !layer.ctx || !layer.canvas) return;
  const { canvas, ctx } = layer;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const payload = new Uint8ClampedArray(pixels.data);
  const frames = Array.isArray(AppRef?.frames) ? AppRef.frames : [];
  frames.forEach(frame => {
    if (!frame?.snapshot) return;
    const entry = ensureSnapshotLayerEntry(frame.snapshot, layer);
    entry.width = canvas.width;
    entry.height = canvas.height;
    entry.pixels = new Uint8ClampedArray(payload);
  });
  window.dispatchEvent(new CustomEvent('app:layerClonedAcrossFrames', {
    detail: { layerId: layer.id },
  }));
  emitLayerAction('cloneAll');
}

export function deleteLayer(id) {
  if (layers.length <= 1) return;
  const idx = layers.findIndex(l => l.id === id);
  if (idx === -1) return;
  layers.splice(idx, 1);
  const fallback = layers[Math.min(idx, layers.length - 1)];
  setActiveLayer(fallback.id);
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
  emitLayerAction('delete');
}

export function toggleLayerVisibility(id) {
  const layer = layers.find(l => l.id === id);
  if (!layer) return;
  layer.visible = !layer.visible;
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
  emitLayerAction('visibility', { layerId: id, visible: layer.visible });
}

export function toggleLayerLock(id) {
  const layer = layers.find(l => l.id === id);
  if (!layer) return;
  layer.locked = !layer.locked;
  renderLayerList();
  dispatchLayersChanged();
  emitLayerAction('lock', { layerId: id, locked: layer.locked });
}

export function moveLayer(id, delta) {
  const idx = layers.findIndex(l => l.id === id);
  if (idx === -1) return;
  const newIdx = Math.min(layers.length - 1, Math.max(0, idx + delta));
  if (newIdx === idx) return;
  const [layer] = layers.splice(idx, 1);
  layers.splice(newIdx, 0, layer);
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
  emitLayerAction('reorder');
}

export function mergeLayerDown(id) {
  const idx = layers.findIndex(l => l.id === id);
  if (idx <= 0) return;
  const source = layers[idx];
  const target = layers[idx - 1];
  if (!source || !target) return;
  const ctx = target.ctx;
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = source.opacity ?? 1;
  ctx.drawImage(source.canvas, 0, 0);
  ctx.restore();
  layers.splice(idx, 1);
  setActiveLayer(target.id);
  dispatchLayersChanged();
  requestCompositeRender();
  emitLayerAction('merge');
}

function ensureSnapshotLayerEntry(snapshot, layer) {
  if (!snapshot) return null;
  if (!Array.isArray(snapshot.layers)) snapshot.layers = [];
  let entry = snapshot.layers.find(s => s.id === layer.id);
  if (!entry) {
    entry = {
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blend: layer.blend,
      width: layer.canvas?.width ?? 0,
      height: layer.canvas?.height ?? 0,
      pixels: new Uint8ClampedArray(Math.max(0, (layer.canvas?.width || 0) * (layer.canvas?.height || 0) * 4)),
    };
    snapshot.layers.push(entry);
  } else {
    entry.name = layer.name;
    entry.visible = layer.visible;
    entry.locked = layer.locked;
    entry.opacity = layer.opacity;
    entry.blend = layer.blend;
  }
  return entry;
}

export function requestCompositeRender() {
  if (!displayCtx || compositeScheduled) return;
  compositeScheduled = true;
  requestAnimationFrame(() => {
    compositeScheduled = false;
    compositeLayersNow();
  });
}

export function compositeLayersNow() {
  if (!displayCtx) return;
  displayCtx.save();
  displayCtx.setTransform(1, 0, 0, 1, 0, 0);
  displayCtx.clearRect(0, 0, displayCtx.canvas.width, displayCtx.canvas.height);
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!layer.visible) continue;
    displayCtx.globalAlpha = layer.opacity ?? 1;
    displayCtx.drawImage(layer.canvas, 0, 0);
  }
  displayCtx.restore();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:layersComposite'));
  }
}

export function resizeLayerCanvases(w, h) {
  layers.forEach(layer => {
    const { canvas, ctx } = layer;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(canvas, 0, 0, w, h);
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tmp, 0, 0);
  });
  requestCompositeRender();
}

export function snapshotLayersState() {
  return {
    activeLayerId,
    layers: layers.map(layer => {
      const { canvas, ctx } = layer;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        blend: layer.blend,
        width: canvas.width,
        height: canvas.height,
        pixels: new Uint8ClampedArray(img.data),
      };
    }),
  };
}

export function cloneLayerState(state) {
  if (!state) return null;
  return {
    activeLayerId: state.activeLayerId,
    layers: (state.layers || []).map(layer => ({
      ...layer,
      pixels: copyPixels(layer.pixels),
    })),
  };
}

export function loadLayersState(state) {
  if (!state || !Array.isArray(state.layers) || !state.layers.length) return;
  layers.length = 0;
  state.layers.forEach(snap => {
    const layer = createLayer({
      name: snap.name,
      id: snap.id,
      visible: snap.visible,
      locked: snap.locked,
      opacity: snap.opacity,
    });
    if (snap.pixels) {
      const dataCopy = new Uint8ClampedArray(snap.pixels);
      const img = new ImageData(dataCopy, snap.width, snap.height);
      layer.ctx.putImageData(img, 0, 0);
    }
    layers.push(layer);
    const num = Number(String(layer.id).split('_').pop());
    if (Number.isFinite(num)) layerCounter = Math.max(layerCounter, num + 1);
  });
  activeLayerId = state.activeLayerId && layers.some(l => l.id === state.activeLayerId)
    ? state.activeLayerId
    : layers[layers.length - 1].id;
  if (AppRef) AppRef.activeLayerId = activeLayerId;
  renderLayerList();
  dispatchLayersChanged();
  requestCompositeRender();
}

export function getCompositeImageData() {
  if (!displayCtx) return null;
  const img = displayCtx.getImageData(0, 0, displayCtx.canvas.width, displayCtx.canvas.height);
  return {
    width: img.width,
    height: img.height,
    pixels: new Uint8ClampedArray(img.data),
  };
}

function copyPixels(source) {
  if (!source) return null;
  if (source instanceof Uint8ClampedArray) return new Uint8ClampedArray(source);
  if (Array.isArray(source)) return Uint8ClampedArray.from(source);
  if (typeof source.length === 'number') return new Uint8ClampedArray(source);
  if (typeof source === 'object') {
    return Uint8ClampedArray.from(Object.values(source));
  }
  return null;
}
