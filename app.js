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
        <a class="btn" href="#" data-demo="${escapeHtml(p.demo)}" data-title="${escapeHtml(p.title)}">Live demo</a>
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
  // Encode the path since your folders have spaces
  el.modalFrame.src = encodeURI(url);
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
- encodeURI is used for iframe src so folder names with spaces work.
- If you ever rename to kebab-case folders, you can drop encodeURI.
*/
