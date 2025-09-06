/* illogicool portfolio — static site logic with GitHub buttons + preview */

const projects = [
  {
    id: "wordle-clone",
    title: "Wordle Clone",
    summary: "Re-creation of Wordle in vanilla JS with custom tips and word list. Hint: Use the tips found in the Help section.",
    tags: ["game", "puzzle"],
    demo: "projects/Wordle Clone/index.html",
    repo: "https://github.com/jrhughes15/illogicool/tree/main/projects/Wordle%20Clone",
    stars: 0,
    date: "2025-09-06"
  },
  {
    id: "type-quest",
    title: "Type Quest",
    summary: "Typing adventure with progress tracking.",
    tags: ["game", "typing"],
    demo: "projects/Type Quest/index.html",
    repo: "https://github.com/jrhughes15/illogicool/tree/main/projects/Type%20Quest",
    stars: 0,
    date: "2025-09-06"
  },
  {
    id: "lagrover",
    title: "LagRover",
    summary: "Rover puzzle with delayed command queue.",
    tags: ["game", "puzzle"],
    demo: "projects/LagRover/index.html",
    repo: "https://github.com/jrhughes15/illogicool/tree/main/projects/LagRover",
    stars: 0,
    date: "2025-09-06"
  },
  {
    id: "infinite-wall-bouncer",
    title: "Infinite Wall Bouncer",
    summary: "Ball physics toy with placeable deflectors.",
    tags: ["Game", "Music", "Physics"],
    demo: "projects/Infinite Wall Bouncer/index.html",
    repo: "https://github.com/jrhughes15/illogicool/tree/main/projects/Infinite%20Wall%20Bouncer",
    stars: 0,
    date: "2025-09-06"
  },
  {
    id: "core-supervisor",
    title: "Core Supervisor",
    summary: "CRT style containment sim.",
    tags: ["sim", "management"],
    demo: "projects/Core Supervisor/index.html",
    repo: "https://github.com/jrhughes15/illogicool/tree/main/projects/Core%20Supervisor",
    stars: 0,
    date: "2025-09-06"
  },
  {
    id: "timer-program",
    title: "Timer Program",
    summary: "Small tool made for my job - for flooring newscasts.",
    tags: ["tool", "timer", "utility"],
    demo: "projects/Timer Program/index.html",
    repo: "https://github.com/jrhughes15/illogicool/tree/main/projects/Timer%20Program",
    stars: 0,
    date: "2025-09-06"
  }
];

const el = {
  grid: document.getElementById("projectsGrid"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  year: document.getElementById("year"),
  // preview bits
  previewSection: document.getElementById("livePreview"),
  previewTitle: document.getElementById("previewTitle"),
  previewFrame: document.getElementById("previewFrame"),
  btnOpenNew: document.getElementById("btnOpenNew"),
  btnClosePreview: document.getElementById("btnClosePreview"),
  btnFullscreen: document.getElementById("btnFullscreen"),
  themeBtn: document.getElementById("btnTheme")
};

if (el.year) el.year.textContent = new Date().getFullYear().toString();

const state = {
  query: "",
  sort: "newest"
};

function normalize(s){ return (s||"").toLowerCase(); }

function filterAndSort(list){
  let out = list.filter(p => {
    if (!state.query) return true;
    const q = normalize(state.query);
    return normalize(p.title).includes(q)
        || normalize(p.summary).includes(q)
        || (Array.isArray(p.tags) && p.tags.some(t => normalize(t).includes(q)));
  });
  switch(state.sort){
    case "alpha": out.sort((a, b) => (a.title||"").localeCompare(b.title||"")); break;
    case "popular": out.sort((a, b) => (b.stars || 0) - (a.stars || 0)); break;
    case "newest": default: out.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
  }
  return out;
}

function render(){
  if (!el.grid) return;
  const list = filterAndSort(projects || []);
  el.grid.innerHTML = "";
  if (!list.length){
    el.grid.innerHTML = `<div class="card"><p>No results. Try another search.</p></div>`;
    return;
  }
  for (const p of list){
    const card = document.createElement("article");
    card.className = "card";
    const encodedDemo = encodeURI(p.demo || "");
    const githubBtn = p.repo
      ? `<a class="btn ghost" href="${p.repo}" target="_blank" rel="noopener">GitHub</a>`
      : "";

    card.innerHTML = `
      <h3>${escapeHtml(p.title||"Untitled")}</h3>
      <p>${escapeHtml(p.summary||"")}</p>
      <div class="tags">${(p.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="row">
        <button class="btn" data-preview="${encodedDemo}" data-title="${escapeHtml(p.title||"Preview")}">Preview</button>
        <a class="btn ghost" href="${encodedDemo}" target="_blank" rel="noopener">Open full</a>
        ${githubBtn}
      </div>
    `;
    const btn = card.querySelector("[data-preview]");
    btn.addEventListener("click", () => openPreview(p.title||"Preview", encodedDemo));
    el.grid.appendChild(card);
  }
}

function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

/* Preview handling */
function openPreview(title, url){
  if (!el.previewSection) return;
  el.previewTitle.textContent = title;
  el.previewFrame.src = url;
  el.btnOpenNew.href = url;
  el.previewSection.hidden = false;

  const y = el.previewSection.getBoundingClientRect().top + window.scrollY - 12;
  window.scrollTo({ top: y, behavior: "smooth" });
}
function closePreview(){
  if (!el.previewSection) return;
  el.previewFrame.src = "about:blank";
  el.previewSection.hidden = true;
}
function fullscreenPreview(){
  const iframe = el.previewFrame;
  if (!iframe) return;
  if (iframe.requestFullscreen) iframe.requestFullscreen();
  else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
}

/* Events */
if (el.search) el.search.addEventListener("input", () => {
  state.query = el.search.value.trim();
  render();
});
if (el.sort) el.sort.addEventListener("change", () => {
  state.sort = el.sort.value;
  render();
});
if (el.btnClosePreview) el.btnClosePreview.addEventListener("click", closePreview);
if (el.btnFullscreen) el.btnFullscreen.addEventListener("click", fullscreenPreview);

// Theme
if (el.themeBtn) {
  el.themeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem("illogicool_theme", isLight ? "light" : "dark");
  });
  (function initTheme(){
    const saved = localStorage.getItem("illogicool_theme");
    if (saved === "light") document.documentElement.classList.add("light");
  })();
}

render();
