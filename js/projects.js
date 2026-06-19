const projectNameInput = document.getElementById("projectName");
const projectTechInput = document.getElementById("projectTech");
const projectDemoInput = document.getElementById("projectDemo");
const projectGitInput = document.getElementById("projectGit");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");
const projectSearch = document.getElementById("projectSearch");

let editIndex = null;
let searchText = "";

let activeFilter = "all";

// ===== Order helpers =====
function ensureProjectMeta(projects) {
  // add id + order if missing (migration for old data)
  let changed = false;
  const now = Date.now();

  projects.forEach((p, i) => {
    if (!p.id) { p.id = `${now}-${Math.random().toString(16).slice(2)}-${i}`; changed = true; }
    if (typeof p.order !== "number") { p.order = i; changed = true; }
    if (typeof p.featured !== "boolean") { p.featured = false; changed = true; }
  });

  if (changed) saveProjects(projects);
  return projects;
}

function sortProjectsForUI(projects) {
  // Featured first, then saved order
  return [...projects].sort((a, b) => {
    const af = a.featured ? 1 : 0;
    const bf = b.featured ? 1 : 0;
    if (bf !== af) return bf - af;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

// ===== Storage helpers =====
function getProjects() {
  const raw = localStorage.getItem("projects");
  return raw ? JSON.parse(raw) : [];
}

function saveProjects(projects) {
  localStorage.setItem("projects", JSON.stringify(projects));
}

// Dashboard sync (same tab)
function notifyProjectsChanged() {
  window.dispatchEvent(new Event("projectsChanged"));
}

// ===== UI helpers =====
function resetForm() {
  projectNameInput.value = "";
  projectTechInput.value = "";
  projectDemoInput.value = "";
  projectGitInput.value = "";
  editIndex = null;
  addProjectBtn.textContent = "Add Project";
}

function startEdit(index) {
  const projects = getProjects();
  const p = projects[index];

  projectNameInput.value = p.name || "";
  projectTechInput.value = p.tech || "";
  projectDemoInput.value = p.demo || "";
  projectGitInput.value = p.git || "";

  editIndex = index;
  addProjectBtn.textContent = "Update Project";
}

function deleteProject(index) {
  const projects = getProjects();
  projects.splice(index, 1);
  saveProjects(projects);
  notifyProjectsChanged();
  renderProjects();
}

function toggleFeatured(index) {
  const projects = getProjects();
  projects[index].featured = !projects[index].featured;
  saveProjects(projects);
  notifyProjectsChanged();
  renderProjects();
}

function passesFilter(project) {
  if (activeFilter === "all") return true;
  if (activeFilter === "liked") return !!project.featured;
  if (activeFilter === "demo") return !!project.demo;
  if (activeFilter === "git") return !!project.git;
  return true;
}

function matchesSearch(project) {
  if (!searchText) return true;
  const hay = `${project.name} ${project.tech}`.toLowerCase();
  return hay.includes(searchText);
}

// ===== Render =====
function renderProjects() {
  let projects = getProjects();
  projects = ensureProjectMeta(projects);

  const sorted = sortProjectsForUI(projects);
const filtered = sorted.filter(passesFilter).filter(matchesSearch);
  projectList.innerHTML = "";

  if (filtered.length === 0) {
    projectList.innerHTML = `<div class="project-item"><p>No projects found.</p></div>`;
    return;
  }

  filtered.forEach((project) => {
    // map back to original index
    const realIndex = projects.indexOf(project);

const div = document.createElement("div");
div.className = "project-item";
div.setAttribute("draggable", "true");
div.dataset.id = project.id;
div.dataset.featured = project.featured ? "1" : "0";

    div.innerHTML = `
      <div class="project-top">
        <div>
          <h3>${project.name}</h3>
          <p>${project.tech}</p>
        </div>

        <button class="feature-btn ${project.featured ? "on" : ""}" data-index="${realIndex}">
          ${project.featured ? "Featured" : "Feature"}
        </button>
      </div>

      <div class="project-links">
        ${project.demo ? `<a class="pill-link" href="${project.demo}" target="_blank" rel="noopener">Live Demo</a>` : ""}
        ${project.git ? `<a class="pill-link" href="${project.git}" target="_blank" rel="noopener">GitHub</a>` : ""}
      </div>

      <div class="project-actions">
        <button class="edit-btn" data-index="${realIndex}">Edit</button>
        <button class="delete-btn" data-index="${realIndex}">Delete</button>
      </div>
    `;

    projectList.appendChild(div);
  });

  // listeners
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.getAttribute("data-index"));
      deleteProject(idx);
    });
  });

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.getAttribute("data-index"));
      startEdit(idx);
    });
  });

  document.querySelectorAll(".feature-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.getAttribute("data-index"));
      toggleFeatured(idx);
    });
  });
}

// ===== Add / Update =====
addProjectBtn.addEventListener("click", () => {
  const name = projectNameInput.value.trim();
  const tech = projectTechInput.value.trim();
  const demo = projectDemoInput.value.trim();
  const git = projectGitInput.value.trim();

  if (!name || !tech) return;

  const projects = getProjects();

const payload = {
  id: editIndex !== null 
      ? projects[editIndex]?.id 
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,

  order: editIndex !== null 
      ? projects[editIndex]?.order 
      : projects.length,

  name,
  tech,
  demo: demo || "",
  git: git || "",
  featured: editIndex !== null 
      ? !!projects[editIndex]?.featured 
      : false
};

  if (editIndex === null) projects.push(payload);
  else projects[editIndex] = payload;

  saveProjects(projects);
  notifyProjectsChanged();
  resetForm();
  renderProjects();
});

// Search
if (projectSearch) {
  projectSearch.addEventListener("input", function () {
    searchText = this.value.toLowerCase();
    renderProjects();
  });
}

// Filter buttons listener
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    activeFilter = btn.dataset.filter;
    renderProjects();
  });
});

// ===== Drag & Drop Reorder =====
let draggedId = null;

projectList.addEventListener("dragstart", (e) => {
  const card = e.target.closest(".project-item");
  if (!card) return;

  draggedId = card.dataset.id;
  card.classList.add("dragging");
});

projectList.addEventListener("dragend", (e) => {
  const card = e.target.closest(".project-item");
  if (card) card.classList.remove("dragging");
});

projectList.addEventListener("dragover", (e) => {
  e.preventDefault();
  const dragging = projectList.querySelector(".dragging");
  const over = e.target.closest(".project-item");
  if (!dragging || !over || dragging === over) return;

  const rect = over.getBoundingClientRect();
  const before = (e.clientY - rect.top) < rect.height / 2;

  if (before) projectList.insertBefore(dragging, over);
  else projectList.insertBefore(dragging, over.nextSibling);
});

projectList.addEventListener("drop", () => {
  const cards = [...projectList.querySelectorAll(".project-item")];
  const projects = getProjects();

  cards.forEach((card, index) => {
    const id = card.dataset.id;
    const project = projects.find(p => p.id === id);
    if (project) project.order = index;
  });

  saveProjects(projects);
});

// Initial
renderProjects();