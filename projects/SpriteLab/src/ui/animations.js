import { getFrameSnapshots, applyFramesState } from '../timeline/frames.js';
import { downloadBlob } from '../utils/download.js';
import { serializeFramesForExport } from '../utils/frameSerialization.js';

let AppRef;
let listEl;
let animationCounter = 2;

export function initAnimationsPanel(app) {
  AppRef = app;
  listEl = document.getElementById('animationList');
  if (!listEl) return;

  const addBtn = document.getElementById('animAddBtn');
  const dupBtn = document.getElementById('animDupBtn');
  const delBtn = document.getElementById('animDelBtn');

  ensureInitialAnimation();
  renderList();

  addBtn?.addEventListener('click', () => {
    saveCurrentAnimationState();
    const anim = createAnimation(getNextAnimationName());
    AppRef.animations.push(anim);
    setActiveAnimation(anim.id);
  });

  dupBtn?.addEventListener('click', () => {
    const current = getActiveAnimation();
    if (!current) return;
    saveCurrentAnimationState();
    const clone = {
      id: generateId(),
      name: `${current.name} Copy`,
      framesState: cloneFramesState(current.framesState),
      activeFrameIndex: current.activeFrameIndex || 0,
    };
    AppRef.animations.push(clone);
    renderList();
  });

  delBtn?.addEventListener('click', () => {
    saveCurrentAnimationState();
    if (AppRef.animations.length <= 1) return;
    const removing = AppRef.activeAnimationId;
    AppRef.animations = AppRef.animations.filter(a => a.id !== removing);
    const fallback = AppRef.animations[0];
    if (removing === AppRef.activeAnimationId) {
      setActiveAnimation(fallback.id);
    } else {
      renderList();
    }
  });

  listEl.addEventListener('click', (event) => {
    const item = event.target.closest('.animation-item');
    if (!item) return;
    if (event.target.tagName === 'INPUT') return;
    setActiveAnimation(item.dataset.id);
  });

  listEl.addEventListener('input', (event) => {
    const input = event.target;
    if (input.tagName !== 'INPUT') return;
    const item = input.closest('.animation-item');
    if (!item) return;
    const anim = AppRef.animations.find(a => a.id === item.dataset.id);
    if (anim) {
      anim.name = input.value.trim() || anim.name;
      window.dispatchEvent(new CustomEvent('app:animationRenamed', { detail: { id: anim.id, name: anim.name } }));
    }
  });

  window.addEventListener('app:exportAnimationRequested', handleAnimationExport);
  window.addEventListener('app:importAnimationData', handleAnimationImport);
}

function ensureInitialAnimation() {
  if (!Array.isArray(AppRef.animations)) AppRef.animations = [];
  if (AppRef.animations.length) {
    animationCounter = Math.max(animationCounter, AppRef.animations.length + 1);
    if (!AppRef.activeAnimationId && AppRef.animations[0]) {
      AppRef.activeAnimationId = AppRef.animations[0].id;
    }
    return;
  }
  const initial = createAnimation('Idle', { cloneCurrent: true });
  AppRef.animations.push(initial);
  AppRef.activeAnimationId = initial.id;
}

function saveCurrentAnimationState() {
  const current = getActiveAnimation();
  if (!current) return;
  current.framesState = getFrameSnapshots();
  current.activeFrameIndex = AppRef.activeFrameIndex || 0;
}

function setActiveAnimation(id) {
  if (!id) return;
  saveCurrentAnimationState();
  let target = AppRef.animations.find(a => a.id === id);
  if (!target) {
    target = AppRef.animations[0];
  }
  if (!target) return;
  AppRef.activeAnimationId = target.id;
  applyFramesState(target.framesState, target.activeFrameIndex || 0);
  renderList();
  window.dispatchEvent(new CustomEvent('app:framesChanged', { detail: { count: AppRef.frames.length } }));
  window.dispatchEvent(new CustomEvent('app:animationChanged', { detail: { id: target.id, name: target.name } }));
}

function createAnimation(name, { cloneCurrent = false } = {}) {
  return {
    id: generateId(),
    name,
    framesState: cloneCurrent ? getFrameSnapshots() : createBlankAnimationState(),
    activeFrameIndex: cloneCurrent ? (AppRef.activeFrameIndex || 0) : 0,
  };
}

function getActiveAnimation() {
  return AppRef.animations.find(a => a.id === AppRef.activeAnimationId);
}

function renderList() {
  if (!listEl) return;
  listEl.innerHTML = '';
  AppRef.animations.forEach(anim => {
    const li = document.createElement('li');
    li.className = `animation-item${anim.id === AppRef.activeAnimationId ? ' is-active' : ''}`;
    li.dataset.id = anim.id;
    const input = document.createElement('input');
    input.value = anim.name;
    li.appendChild(input);
    listEl.appendChild(li);
  });
}

function generateId() {
  return `anim_${Math.random().toString(36).slice(2, 9)}`;
}

function handleAnimationExport() {
  const anim = getActiveAnimation();
  if (!anim) return;
  saveCurrentAnimationState();
  const payload = {
    id: anim.id,
    name: anim.name,
    framesState: serializeFramesForExport(cloneFramesState(anim.framesState)),
    activeFrameIndex: anim.activeFrameIndex || 0,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const project = toSafeFileName(AppRef?.docTitle || 'sprite_lab');
  const animName = toSafeFileName(anim.name || 'animation');
  const fileName = `${project}-${animName}.anim.json`;
  downloadBlob(blob, fileName);
  setStatus && setStatus('Animation exported.');
}

function handleAnimationImport(event) {
  const data = event.detail;
  if (!data || !Array.isArray(data.framesState)) return;
  saveCurrentAnimationState();
  const framesState = cloneFramesState(data.framesState);
  if (!framesState.length) return;
  const imported = {
    id: data.id || generateId(),
    name: data.name || `Imported ${AppRef.animations.length + 1}`,
    framesState,
    activeFrameIndex: data.activeFrameIndex || 0,
  };
  AppRef.animations.push(imported);
  setActiveAnimation(imported.id);
  renderList();
}

function getNextAnimationName() {
  const name = `Anim ${animationCounter}`;
  animationCounter += 1;
  return name;
}

function cloneFramesState(frames = []) {
  return (frames || []).map(frame => cloneFrameState(frame));
}

function cloneFrameState(frame = {}) {
  return {
    id: frame.id,
    name: frame.name,
    durationMs: frame.durationMs ?? 100,
    snapshot: cloneSnapshot(frame.snapshot),
    pivot: frame.pivot ? { x: frame.pivot.x, y: frame.pivot.y } : null,
  };
}

function cloneSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    activeLayerId: snapshot.activeLayerId,
    layers: (snapshot.layers || []).map(layer => ({
      ...layer,
      pixels: clonePixels(layer.pixels, layer.width, layer.height),
    })),
  };
}

function clonePixels(pixels, width = 0, height = 0) {
  if (!pixels) return null;
  if (pixels instanceof Uint8ClampedArray) return new Uint8ClampedArray(pixels);
  if (Array.isArray(pixels)) return Uint8ClampedArray.from(pixels);
  if (typeof pixels.length === 'number') return new Uint8ClampedArray(pixels);
  if (typeof pixels === 'object') return Uint8ClampedArray.from(Object.values(pixels));
  if (width && height) return new Uint8ClampedArray(width * height * 4);
  return null;
}

function createBlankAnimationState() {
  const frames = getFrameSnapshots();
  const template = frames.length ? cloneFrameState(frames[0]) : null;
  if (!template) {
    return [{
      id: 'frame_000',
      name: 'frame_000',
      durationMs: 100,
      snapshot: null,
      pivot: { x: 0, y: 0 },
    }];
  }
  template.id = 'frame_000';
  template.name = 'frame_000';
  if (template.snapshot?.layers) {
    template.snapshot.layers.forEach(layer => {
      if (!layer) return;
      const total = (layer.width || 0) * (layer.height || 0) * 4;
      if (layer.pixels instanceof Uint8ClampedArray) {
        layer.pixels.fill(0);
      } else if (Array.isArray(layer.pixels)) {
        layer.pixels = new Uint8ClampedArray(total || layer.pixels.length);
      } else {
        layer.pixels = new Uint8ClampedArray(total);
      }
    });
  }
  return [template];
}

export function refreshAnimationsPanel() {
  if (!listEl) return;
  renderList();
}

function toSafeFileName(name = '', fallback = 'item') {
  const clean = (name || fallback || '').toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  return clean || fallback;
}
