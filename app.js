/* illogicool portfolio — static, no build tools */

const projects = [
  {
    id: "wordle-clone",
    title: "Wordle Clone",
    summary: "Re-creation of Wordle in vanilla JS with custom tips and word list.",
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
    tags: ["toy", "physics"],
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

el.year.textContent = new Date().getFullYear().toString();

const state = {
  query: "",
  sort: "newest"
};

function normalize(s){ return s.toLowerCase(); }

function filterAndSort(list){
  let out = list.filter(p => {
    if (!state.query) return true;
    const q = normalize(state.query);
    return normalize(p.title).includes(q)
        || normalize(p.summary).includes(q)
        || p.tags.some(t => normalize(t).includes(q));
  });
  switch(state.sort){
    case "alpha":
      out.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "popular":
      out.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      break;
    case "newest":
    default:
      out.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
  }
  return out;
}

function render(){
  const list = filterAndSort(projects);
  el.grid.innerHTML = "";
  if (!list.length){
    el.grid.innerHTML = `<div class="card"><p>No results. Try another search.</p></div>`;
    return;
  }
  for (const p of list){
    const card = document.createElement("article");
    card.className = "card";
    const encodedDemo = encodeURI(p.demo); // spaces-safe
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.summary)}</p>
      <div class="tags">${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="row">
        <button class="btn" data-preview="${encodedDemo}" data-title="${escapeHtml(p.title)}">Preview</button>
        <a class="btn ghost" href="${encodedDemo}" target="_blank" rel="noopener">Open full</a>
      </div>
    `;
    // wire preview
    const btn = card.querySelector("[data-preview]");
    btn.addEventListener("click", () => openPreview(p.title, encodedDemo));
    el.grid.appendChild(card);
  }
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

/* Preview handling */
function openPreview(title, url){
  el.previewTitle.textContent = title;
  el.previewFrame.src = url;
  el.btnOpenNew.href = url;
  el.previewSection.hidden = false;

  // scroll to preview
  const y = el.previewSection.getBoundingClientRect().top + window.scrollY - 12;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function closePreview(){
  el.previewFrame.src = "about:blank";
  el.previewSection.hidden = true;
}

function fullscreenPreview(){
  const iframe = el.previewFrame;
  if (iframe.requestFullscreen) iframe.requestFullscreen();
  else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
  // if not supported, do nothing silently
}

/* Events */
el.search.addEventListener("input", () => {
  state.query = el.search.value.trim();
  render();
});

el.sort.addEventListener("change", () => {
  state.sort = el.sort.value;
  render();
});

el.btnClosePreview.addEventListener("click", closePreview);
el.btnFullscreen.addEventListener("click", fullscreenPreview);

// Theme
el.themeBtn.addEventListener("click", () => {
  const isLight = document.documentElement.classList.toggle("light");
  localStorage.setItem("illogicool_theme", isLight ? "light" : "dark");
});
(function initTheme(){
  const saved = localStorage.getItem("illogicool_theme");
  if (saved === "light") document.documentElement.classList.add("light");
})();

render();

/* Notes
- Each card now has Preview and Open full.
- Preview opens a large on-page iframe with Fullscreen and Close.
- Open full uses target=_blank so you get the true app in a new tab.
- encodeURI is used for paths that contain spaces.
*/
