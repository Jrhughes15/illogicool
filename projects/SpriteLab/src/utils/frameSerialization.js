export function serializeFramesForExport(frames = []) {
  return (frames || []).map(frame => ({
    id: frame.id,
    name: frame.name,
    durationMs: frame.durationMs,
    snapshot: serializeSnapshot(frame.snapshot),
    pivot: frame.pivot ? { x: frame.pivot.x, y: frame.pivot.y } : null,
  }));
}

export function serializeAnimations(animations = []) {
  return (animations || []).map(anim => ({
    id: anim.id,
    name: anim.name,
    framesState: serializeFramesForExport(anim.framesState || []),
    activeFrameIndex: anim.activeFrameIndex || 0,
  }));
}

export function serializeSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    activeLayerId: snapshot.activeLayerId,
    layers: (snapshot.layers || []).map(layer => ({
      ...layer,
      pixels: serializePixels(layer.pixels),
    })),
  };
}

export function deserializeAnimations(list = []) {
  return (list || []).map(anim => ({
    id: anim.id,
    name: anim.name,
    framesState: deserializeFrames(anim.framesState || []),
    activeFrameIndex: anim.activeFrameIndex || 0,
  }));
}

export function deserializeFrames(frames = []) {
  return (frames || []).map(frame => ({
    id: frame.id,
    name: frame.name,
    durationMs: frame.durationMs ?? 100,
    snapshot: deserializeSnapshot(frame.snapshot),
    pivot: frame.pivot ? { x: frame.pivot.x, y: frame.pivot.y } : null,
  }));
}

export function deserializeSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    activeLayerId: snapshot.activeLayerId,
    layers: (snapshot.layers || []).map(layer => ({
      ...layer,
      pixels: deserializePixels(layer.pixels, layer.width, layer.height),
    })),
  };
}

function serializePixels(pixels) {
  if (!pixels) return [];
  if (Array.isArray(pixels)) return pixels.slice();
  if (pixels instanceof Uint8ClampedArray) return Array.from(pixels);
  if (typeof pixels.length === 'number') return Array.from(pixels);
  if (typeof pixels === 'object') return Object.values(pixels);
  return [];
}

function deserializePixels(pixels, width = 0, height = 0) {
  if (!pixels) return null;
  if (pixels instanceof Uint8ClampedArray) return new Uint8ClampedArray(pixels);
  if (Array.isArray(pixels)) return Uint8ClampedArray.from(pixels);
  if (typeof pixels.length === 'number') return Uint8ClampedArray.from(pixels);
  if (typeof pixels === 'object') return Uint8ClampedArray.from(Object.values(pixels));
  if (width && height) return new Uint8ClampedArray(width * height * 4);
  return null;
}
