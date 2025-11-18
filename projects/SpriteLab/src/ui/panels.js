/**
 * panels.js — wiring + color history host
 * - Ensures W/H + Apply exist in the topbar (injects if missing)
 * - Wires zoom buttons, grid/checker/pin toggles, FPS input
 * - Wires tool selection buttons
 * - Wires brush size/alpha and FG/BG/hex color inputs
 * - Injects a Color History row under the Colors group and renders it
 *   (History is updated only on actual drawing — handled in main.js)
 */

 // --- Tool help (titles + footer notes) ----------------------------
const TOOL_HELP = {
  pencil:     'Pencil — Left=FG, Right=BG',
  eraser:     'Eraser — Left=Erase, Right=BG paint',
  fill:       'Fill — Left=FG, Right=BG (contiguous region)',
  line:       'Line — Left=FG, Right=BG, Shift=snap 45°',
  rect:       'Rectangle — Left=FG, Right=BG, Alt=Fill, Shift=Square, Ctrl=Center',
  ellipse:    'Ellipse — Left=FG, Right=BG, Alt=Fill, Shift=Circle, Ctrl=Center',
  picker: 'Eyedropper — Click to sample; Left→FG, Right→BG; adds to history',
  mirrorx:    'Mirror X — Pencil mirrored top/bottom; Right-click = BG',
  mirrory:    'Mirror Y — Pencil mirrored left/right; Right-click = BG',
  select:      'Select (Rect) — Drag to marquee. Shift=Square, Ctrl=From center. Move Tool. Enter=Commit, Esc=Cancel.',
  lasso:       'Lasso — Drag freeform. Move Tool. Enter=Commit, Esc=Cancel.',
  move:        'Move — Drag inside selection to move. Enter=Commit, Esc=Cancel.', 
};

export function buildPanels(app) {
  // keep all your existing helpers + other functions in this file as-is
  ensureSizeInputs(app);
  wireTopbar(app);
  wireBrushAndColors(app);
  ensureColorHistoryHost();
  renderColorHistory(); // initial render

  // --- Tool buttons (broadcast tool changes) ---
  {
    const left = document.querySelector('.tool-grid');
    if (left) {
      const buttons = Array.from(left.querySelectorAll('button[data-tool]'));

      function selectTool(id) {
        // visually mark active
        buttons.forEach(b => b.classList.toggle('active', b.dataset.tool === id));
        // set app state
        app.tool = id;
        // notify runtime (eyedropper cursor etc.)
        window.dispatchEvent(new CustomEvent('app:toolChanged', { detail: { tool: id } }));
        // optional: footer/help text (if you listen for it elsewhere)
        const help = (typeof TOOL_HELP !== 'undefined' && TOOL_HELP) ? TOOL_HELP[id] : undefined;
        if (help) window.dispatchEvent(new CustomEvent('app:toolHelp', { detail: { help } }));
      }

      // titles + clicks
      buttons.forEach(btn => {
        const id = btn.dataset.tool;
        if (typeof TOOL_HELP !== 'undefined' && TOOL_HELP && TOOL_HELP[id]) {
          // don’t overwrite an existing custom title if you set one elsewhere
          if (!btn.title || btn.title === id) btn.title = TOOL_HELP[id];
        }
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          selectTool(id);
        });
      });

    }
  }

  // keep the rest of your panel wiring intact
  renderLayers(app);
  renderFrames(app);

  // re-render history on demand (from main.js when the list changes)
  window.addEventListener('app:renderColorHistory', renderColorHistory);

  attachToolChangeHighlightSync(app);

}


/* ---------- helpers ---------- */

// Keep the tool button highlight and footer help synchronized when the tool changes
// programmatically (e.g., after Paste/Cut or after finishing a selection).
function attachToolChangeHighlightSync(app) {
  const grid = document.querySelector('.tool-grid');
  if (!grid) return;

  const buttons = Array.from(grid.querySelectorAll('button[data-tool]'));
  const highlight = (id) => {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.tool === id));
  };

  window.addEventListener('app:toolChanged', (ev) => {
    const id = ev.detail?.tool || app.tool || '';
    highlight(id);
    if (typeof TOOL_HELP !== 'undefined') {
      const help = TOOL_HELP[id] || '';
      if (help) window.dispatchEvent(new CustomEvent('app:toolHelp', { detail: { help } }));
    }
  });

  // On load — no tool selected if app.tool is empty
  highlight(app.tool || '');
}



function ensureSizeInputs(app) {
  const top = document.querySelector('.topbar .center');
  if (!top) return;

  const hasW  = document.getElementById('sizeW');
  const hasH  = document.getElementById('sizeH');
  const hasAp = document.getElementById('applySize');

  if (hasW && hasH && hasAp) {
    // keep the current values synced to app size
    hasW.value = String(app.size?.w ?? 128);
    hasH.value = String(app.size?.h ?? 128);
    on('#applySize','click',(e)=>{
      e.preventDefault();
      const w = clampInt(hasW.value, 1, 4096, app.size.w);
      const h = clampInt(hasH.value, 1, 4096, app.size.h);
      dispatch('app:setCanvasSize', { w, h });
    });
    return;
  }

  // inject minimal W/H + Apply controls (non-destructive)
  const frag = document.createElement('div');
  frag.className = 'variant-row';
  frag.innerHTML = `
    <span class="divider"></span>
    <label title="Canvas width (px)">
      W <input id="sizeW" type="number" min="1" max="4096" value="${app.size?.w ?? 128}">
    </label>
    <label title="Canvas height (px)">
      H <input id="sizeH" type="number" min="1" max="4096" value="${app.size?.h ?? 128}">
    </label>
    <button id="applySize" title="Apply canvas size">Apply</button>
  `;
  top.appendChild(frag);

  on('#applySize','click',(e)=>{
    e.preventDefault();
    const w = clampInt(sel('#sizeW').value, 1, 4096, app.size.w);
    const h = clampInt(sel('#sizeH').value, 1, 4096, app.size.h);
    dispatch('app:setCanvasSize', { w, h });
  });
}

function wireTopbar(app) {
  // Zoom buttons
  on('[data-zoom="+1"]','click',()=>dispatch('app:zoomChange',{dir:+1}));
  on('[data-zoom="-1"]','click',()=>dispatch('app:zoomChange',{dir:-1}));
  on('[data-action="fit"]','click',()=>dispatch('app:fit'));
  on('[data-action="oneX"]','click',()=>dispatch('app:oneX'));

  // Checker / Pin toggles
  const checker = sel('#checkerToggle');
  const pin     = sel('#pinTopLeft');

  if (checker) {
    checker.checked = !!app.checker;
    checker.addEventListener('change', ()=>dispatch('app:setToggle',{key:'checker', value:checker.checked}));
  }
  if (pin) {
    pin.checked = !!app.pinTopLeft;
    pin.addEventListener('change', ()=>dispatch('app:setToggle',{key:'pinTopLeft', value:pin.checked}));
  }

  // FPS passthrough (if present)
  const fps = sel('#fpsInput');
  if (fps) {
    fps.value = String(app.fps ?? 12);
    fps.addEventListener('input', () => {
      const v = clampInt(fps.value, 1, 60, app.fps ?? 12);
      app.fps = v;
      // if you have a preview loop listener, fire a custom event here
      // dispatch('app:fpsChanged', { fps: v });
    });
  }
}

function wireBrushAndColors(app) {
  // ---- Brush size / alpha (range inputs + readouts) ----
  const size       = sel('#brushSize');
  const sizeRead   = document.getElementById('brushSizeReadout');
  const alpha      = sel('#brushAlpha');
  const alphaRead  = document.getElementById('brushAlphaReadout');

  // Initialize from current app state (safe fallbacks)
  if (size) {
    const initSize = clampInt(size.value || (app.brush?.size ?? 1), 1, 64, 1);
    size.value = String(initSize);
    if (sizeRead) sizeRead.textContent = `${initSize} px`;

    size.addEventListener('input', () => {
      const v = clampInt(size.value, 1, 64, app.brush?.size ?? 1);
      if (sizeRead) sizeRead.textContent = `${v} px`;
      // Notify runtime
      dispatch('app:brushChanged', { size: v });
    });
  }

  if (alpha) {
    let initA = Number(alpha.value);
    if (!Number.isFinite(initA)) initA = app.brush?.alpha ?? 1;
    initA = Math.max(0, Math.min(1, initA));
    alpha.value = String(initA);
    if (alphaRead) alphaRead.textContent = `${Math.round(initA * 100)}%`;

    alpha.addEventListener('input', () => {
      let v = Number(alpha.value);
      if (!Number.isFinite(v)) v = app.brush?.alpha ?? 1;
      v = Math.max(0, Math.min(1, v));
      if (alphaRead) alphaRead.textContent = `${Math.round(v * 100)}%`;
      // Notify runtime
      dispatch('app:brushChanged', { alpha: v });
    });
  }

  // ---- Colors ----
  const fg = sel('#fgColor');
  const bg = sel('#bgColor');
  const hx = sel('#hexInput');

  if (fg) {
    // mirror app brush color into FG on init if needed
    if (app.brush?.color) fg.value = app.brush.color;
    fg.addEventListener('input', () => {
      const color = normalizeHex(fg.value);
      fg.value = color;
      dispatch('app:brushChanged', { color });
    });
  }

  if (bg) {
    bg.addEventListener('input', () => {
      bg.value = normalizeHex(bg.value);
      // BG is read directly by tools on right-click usage; no event needed
    });
  }

  if (hx) {
    hx.addEventListener('change', () => {
      const color = normalizeHex(hx.value);
      hx.value = color;
      if (fg) fg.value = color; // mirror into FG
      dispatch('app:brushChanged', { color });
    });
  }
}


function ensureColorHistoryHost() {
  const colors = document.querySelector('.colors');
  if (!colors) return;
  if (document.getElementById('colorHistory')) return;

  const block = document.createElement('div');
  block.id = 'colorHistory';
  block.innerHTML = `
    <h3 style="margin:10px 0 6px; font-size:12px; text-transform:uppercase; color:#9aa1b2; letter-spacing:.08em">History</h3>
    <div class="palette" id="colorHistoryStrip" style="grid-template-columns: repeat(9, 1fr);"></div>
  `;
  colors.appendChild(block);
}

function renderColorHistory() {
  const host = document.getElementById('colorHistoryStrip');
  if (!host) return;
  host.innerHTML = '';
  const arr = Array.isArray(window.App?.colorHistory) ? window.App.colorHistory : [];
  arr.forEach(hex => {
    const sw = document.createElement('button');
    sw.className = 'sw';
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', (e)=>{
      // Left click -> set FG (and hex field)
      const h = normalizeHex(hex);
      const fg = document.getElementById('fgColor');
      const hx = document.getElementById('hexInput');
      if (fg) fg.value = h;
      if (hx) hx.value = h;
      dispatch('app:brushChanged', { color: h });
    });
    sw.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      // Right click -> set BG
      const h = normalizeHex(hex);
      const bg = document.getElementById('bgColor');
      if (bg) bg.value = h;
    });
    host.appendChild(sw);
  });
}

/* ---------- layers (stub renderers kept intact) ---------- */
function renderLayers(app) {
  // If you have a full layer UI elsewhere, this is a noop placeholder to avoid regressions.
  // Keeping in place because earlier versions called renderLayers from buildPanels.
}
function renderFrames(app) {
  // Same as above; hook for timeline/frames panel if present.
}

/* ---------- utils ---------- */
function sel(s){ return document.querySelector(s); }
function on(selector, evt, handler){ const el = sel(selector); if (el) el.addEventListener(evt, handler); }
function dispatch(name, detail){ window.dispatchEvent(new CustomEvent(name, { detail })); }
function clampInt(val, min, max, fallback){
  const n = Math.round(Number(val));
  if (Number.isFinite(n)) return Math.max(min, Math.min(max, n));
  return fallback;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function normalizeHex(c){
  let s = String(c||'').trim();
  if (!s) return '#000000';
  if (s[0] !== '#') s = '#'+s;
  if (/^#([0-9a-fA-F]{3})$/.test(s)){
    const r=s[1], g=s[2], b=s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#([0-9a-fA-F]{6})$/.test(s)) return s.toLowerCase();
  return '#000000';
}
