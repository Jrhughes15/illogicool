export function initShortcuts(App){
  window.addEventListener('keydown', (e) => {
    const key = e.key;

    // --- Tool shortcuts ---
    switch (key.toLowerCase()) {
      case 'b': selectTool('pencil'); break;
      case 'e': selectTool('eraser'); break;
      case 'l': selectTool('line'); break;
      case 'r': selectTool('rect'); break;
      case 'o': selectTool('ellipse'); break;
      case 'g': selectTool('fill'); break;
      case 'i': selectTool('eyedropper'); break;
      case 's': selectTool('select'); break;
      case 'v': selectTool('move'); break;
      case 'm': toggleMirror(); break;
      default: break;
    }

    // --- Zoom (integer-only path via topbar buttons we already wired) ---
    if ((e.ctrlKey || e.metaKey) && (key === '=' || key === '+')) {
      e.preventDefault();
      click('btnZoomIn');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === '-') {
      e.preventDefault();
      click('btnZoomOut');
      return;
    }
    if (key === '0') { // Fit
      e.preventDefault();
      click('btnFit');
      return;
    }
    if (key === '1') { // 1x
      e.preventDefault();
      click('btnOneX');
      return;
    }
  });
}

function selectTool(id){
  // Visually toggle
  document.querySelectorAll('.tool-grid button').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === id);
  });
  // Fire the button's click to let panels.js update App + status
  document.querySelector(`.tool-grid button[data-tool="${id}"]`)?.click();
}

function toggleMirror(){
  const btn = document.querySelector('.tool-grid button[data-tool="mirrorx"]');
  if (!btn) return;
  btn.classList.toggle('active');
  // no-op beyond visual for now; the draw tool will read the flag later
}

function click(id){
  const el = document.getElementById(id);
  if (el) el.click();
}
