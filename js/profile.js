// ===== Elements =====
const usernameInput = document.getElementById("ghUsername");
const fetchBtn = document.getElementById("fetchGhBtn");

const statusEl = document.getElementById("ghStatus");
const cardEl = document.getElementById("ghCard");

const avatarEl = document.getElementById("ghAvatar");
const nameEl = document.getElementById("ghName");
const linkEl = document.getElementById("ghLink");
const bioEl = document.getElementById("ghBio");
const reposEl = document.getElementById("ghRepos");
const followersEl = document.getElementById("ghFollowers");
const followingEl = document.getElementById("ghFollowing");
const locationEl = document.getElementById("ghLocation");
const companyEl = document.getElementById("ghCompany");

// Repo + Loader
const repoGrid = document.getElementById("repoGrid");
const repoSearch = document.getElementById("repoSearch"); // exists if you added search input
const loaderEl = document.getElementById("ghLoader");

let allRepos = [];

// ===== UI Helpers =====
function setStatus(text, type = "") {
  statusEl.className = "gh-status" + (type ? ` ${type}` : "");
  statusEl.textContent = text || "";
}

function showCard(show) {
  cardEl.classList.toggle("hidden", !show);
}

function safeText(v, fallback = "—") {
  return v && String(v).trim() ? String(v).trim() : fallback;
}

function showLoader(show) {
  if (!loaderEl) return;
  loaderEl.classList.toggle("hidden", !show);
}

// ===== API Calls =====
async function fetchGitHubProfile(username) {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) throw new Error("User not found.");
    throw new Error("GitHub API error. Try again.");
  }
  return res.json();
}

async function fetchTopRepos(username) {
  const response = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`
  );

  if (!response.ok) throw new Error("Could not fetch repos.");

  const repos = await response.json();

  // sort by stars (desc) and take top 6
  repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
  return repos.slice(0, 6);
}

// ===== Render =====
function renderProfile(data) {
  avatarEl.src = data.avatar_url;
  nameEl.textContent = safeText(data.name, data.login);
  linkEl.href = data.html_url;

  bioEl.textContent = safeText(data.bio, "No bio available.");

  reposEl.textContent = String(data.public_repos ?? 0);
  followersEl.textContent = String(data.followers ?? 0);
  followingEl.textContent = String(data.following ?? 0);

  locationEl.textContent = data.location ? `📍 ${data.location}` : "";
  companyEl.textContent = data.company ? `🏢 ${data.company}` : "";

  showCard(true);
}

function renderRepos(repos) {
  if (!repoGrid) return;
  repoGrid.innerHTML = "";

  if (!repos || repos.length === 0) {
    repoGrid.innerHTML = `<div class="repo-card">No repos found.</div>`;
    return;
  }

  repos.forEach((repo) => {
    const div = document.createElement("div");
    div.className = "repo-card";

    const lang = repo.language || "N/A";
    const forks = repo.forks_count ?? 0;
    const stars = repo.stargazers_count ?? 0;
    const updated = repo.updated_at
      ? new Date(repo.updated_at).toLocaleDateString()
      : "—";

    div.innerHTML = `
      <div class="repo-head">
        <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
        <span class="repo-badge">⭐ ${stars}</span>
      </div>

      <div class="repo-meta">
        <span class="repo-pill">🧠 ${lang}</span>
        <span class="repo-pill">🍴 ${forks}</span>
        <span class="repo-pill">🕒 ${updated}</span>
      </div>
    `;

    repoGrid.appendChild(div);
  });
}

// ===== Main Action =====
async function handleFetch() {
  const username = usernameInput.value.trim();

  if (!username) {
    setStatus("Please enter a GitHub username.", "error");
    showCard(false);
    if (repoGrid) repoGrid.innerHTML = "";
    return;
  }

  setStatus("");
  showCard(false);
  showLoader(true);

  try {
    const data = await fetchGitHubProfile(username);
    localStorage.setItem("devverse_github_username", username);

    // profile
    renderProfile(data);

    // repos
    allRepos = await fetchTopRepos(username);
    renderRepos(allRepos);

    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", "error");
    showCard(false);
    if (repoGrid) repoGrid.innerHTML = "";
  } finally {
    showLoader(false);
  }
}

// ===== Events =====
fetchBtn.addEventListener("click", handleFetch);

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleFetch();
});

// Live repo search (only if input exists in HTML)
if (repoSearch) {
  repoSearch.addEventListener("input", function () {
    const searchText = this.value.toLowerCase();
    const filtered = allRepos.filter((repo) =>
      repo.name.toLowerCase().includes(searchText)
    );
    renderRepos(filtered);
  });
}

// Auto-load last username
const saved = localStorage.getItem("devverse_github_username");
if (saved) {
  usernameInput.value = saved;
  handleFetch();
}