/* illogicool portfolio — static, no build tools */

const projects = [
  {
    id: "wall-bounce",
    title: "Wall Bounce Composer",
    summary: "Infinite playfield wall-bounce toy with music notes.",
    tags: ["game", "music", "physics"],
    demo: "projects/wall-bounce/index.html",
    repo: "https://github.com/yourname/wall-bounce",
    stars: 42,
    date: "2025-09-01"
  },
  {
    id: "lagrover",
    title: "LagRover",
    summary: "Grid rover with command lag and objectives.",
    tags: ["game", "puzzle", "grid"],
    demo: "projects/lagrover/index.html",
    repo: "https://github.com/yourname/lagrover",
    stars: 55,
    date: "2025-08-18"
  },
  {
    id: "story-diagrammer",
    title: "Story Diagrammer",
    summary: "Infinite canvas for story nodes with connectors.",
    tags: ["tool", "canvas", "writing"],
    demo: "projects/story-diagrammer/index.html",
    repo: "https://github.com/yourname/story-diagrammer",
    stars: 31,
    date: "2025-07-12"
  }
  // Add more entries as needed
];

const el = {
  grid: document.getElementById("projectsGrid"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  modal: document.getElementById("demoModal"),
  modalTitle: document.getElementById("demoTitle"),
  modalFrame: document.getElementById("demoFrame"),
  themeBtn: document.getElementById("btnTheme"),
  year: document.getElementById("year")
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
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.summary)}</p>
      <div class="tags">${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="row">
        <a class="btn" href="#" data-demo="${encodeURIComponent(p.demo)}" data-title="${escapeHtml(p.title)}">Live demo</a>
        <a class="btn ghost" href="${p.repo}" target="_blank" rel="noopener">Code</a>
      </div>
    `;
    card.querySelector('[data-demo]').addEventListener('click', e => {
      e.preventDefault();
      openDemo(p.title, p.demo);
    });
    el.grid.appendChild(card);
  }
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function openDemo(title, url){
  el.modalTitle.textContent = title;
  el.modalFrame.src = url;
  el.modal.setAttribute("aria-hidden", "false");
}

function closeDemo(){
  el.modal.setAttribute("aria-hidden", "true");
  el.modalFrame.src = "about:blank";
}

// Event wiring
document.addEventListener("click", e => {
  if (e.target.matches("[data-close]")) closeDemo();
});

el.search.addEventListener("input", () => {
  state.query = el.search.value.trim();
  render();
});

el.sort.addEventListener("change", () => {
  state.sort = el.sort.value;
  render();
});

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
- Place each project demo at projects/<id>/index.html so the iframe loads it.
- If a project needs a different path or external URL, set demo to that URL.
- If you want thumbnails, add an <img> before the title or use CSS backgrounds.
*/
