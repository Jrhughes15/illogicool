import { getFrameSnapshots, applyFramesState } from '../timeline/frames.js';

const MAX_HISTORY = 50;
const undoStack = [];
const redoStack = [];
let AppRef = null;

export function initHistory(app) {
  AppRef = app;
  undoStack.length = 0;
  redoStack.length = 0;
  pushHistory('Initial state', { skipIfUnchanged: false });
}

export function pushHistory(label = 'Change', { skipIfUnchanged = true } = {}) {
  if (!AppRef) return;
  const entry = {
    label,
    frames: getFrameSnapshots(),
    activeFrameIndex: AppRef.activeFrameIndex || 0,
    timestamp: Date.now(),
  };
  if (skipIfUnchanged) {
    const last = undoStack[undoStack.length - 1];
    if (last && shallowCompareFrames(last, entry)) {
      return;
    }
  }
  undoStack.push(entry);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  emitHistoryEvent();
}

export function undo() {
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  if (!current) return;
  redoStack.push(current);
  const target = undoStack[undoStack.length - 1];
  if (target) applyFramesState(target.frames, target.activeFrameIndex);
  emitHistoryEvent();
}

export function redo() {
  if (!redoStack.length) return;
  const entry = redoStack.pop();
  if (!entry) return;
  undoStack.push(entry);
  applyFramesState(entry.frames, entry.activeFrameIndex);
  emitHistoryEvent();
}

export function canUndo() {
  return undoStack.length > 1;
}

export function canRedo() {
  return redoStack.length > 0;
}

export function getHistoryState() {
  return {
    undo: {
      available: canUndo(),
      label: undoStack[undoStack.length - 1]?.label || '',
    },
    redo: {
      available: canRedo(),
      label: redoStack[redoStack.length - 1]?.label || '',
    },
    length: undoStack.length,
  };
}

function emitHistoryEvent() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:historyChanged', {
    detail: getHistoryState(),
  }));
}

function shallowCompareFrames(a, b) {
  if (!a || !b) return false;
  if (a.frames.length !== b.frames.length) return false;
  if (a.activeFrameIndex !== b.activeFrameIndex) return false;
  for (let i = 0; i < a.frames.length; i++) {
    const fa = a.frames[i];
    const fb = b.frames[i];
    if (!fa || !fb) return false;
    if (fa.id !== fb.id) return false;
    if (fa.durationMs !== fb.durationMs) return false;
    if (!fa.snapshot || !fb.snapshot) return false;
    if (!fa.snapshot.layers || !fb.snapshot.layers) return false;
    if (fa.snapshot.layers.length !== fb.snapshot.layers.length) return false;
    for (let j = 0; j < fa.snapshot.layers.length; j++) {
      const la = fa.snapshot.layers[j];
      const lb = fb.snapshot.layers[j];
      if (!la || !lb) return false;
      if (la.id !== lb.id) return false;
      if (la.opacity !== lb.opacity) return false;
      if (la.visible !== lb.visible) return false;
      if (la.width !== lb.width || la.height !== lb.height) return false;
      if (la.pixels?.length !== lb.pixels?.length) return false;
    }
  }
  return true;
}
