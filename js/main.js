function getProjects() {
  const projects = localStorage.getItem("projects");
  return projects ? JSON.parse(projects) : [];
}

document.addEventListener("DOMContentLoaded", () => {
  // Snapshot elements
  const snapFeatured = document.getElementById("snapFeatured");
  const snapDemo = document.getElementById("snapDemo");
  const snapGit = document.getElementById("snapGit");
  const snapLcTotal = document.getElementById("snapLcTotal");
  const snapGhRepos = document.getElementById("snapGhRepos");
  const snapGhFollowers = document.getElementById("snapGhFollowers");
  const totalProjectsElement = document.getElementById("totalProjects");

  if (totalProjectsElement) {
    const projects = getProjects();
    totalProjectsElement.textContent = projects.length;
  }
});

function getProjects() {
  const projects = localStorage.getItem("projects");
  return projects ? JSON.parse(projects) : [];
}

function updateTotalProjects() {
  const total = getProjects().length;
  const el = document.getElementById("totalProjects");
  if (el) el.textContent = total;
}

// Run on page load
updateTotalProjects();

// Update if localStorage changes (works in another tab/window)
window.addEventListener("storage", updateTotalProjects);

// ================= LeetCode =================

const lcInput = document.getElementById("lcUsername");
const lcBtn = document.getElementById("fetchLcBtn");
const lcStatus = document.getElementById("lcStatus");
const lcCards = document.getElementById("lcCards");

const lcTotal = document.getElementById("lcTotal");
const lcEasy = document.getElementById("lcEasy");
const lcMedium = document.getElementById("lcMedium");
const lcHard = document.getElementById("lcHard");

async function fetchLeetCode(username) {
  try {
    lcStatus.textContent = "Fetching...";
    lcCards.classList.add("hidden");

    const endpoints = [
      `https://leetcode-api-faisalshohag.vercel.app/${encodeURIComponent(username)}`,
      `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}`,
      `https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`,
    ];

    let data = null;
    let lastErr = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // normalize for different APIs
        const totalSolved = json.totalSolved ?? json.totalSolved?.toString();
        const easySolved = json.easySolved ?? json.easySolved?.toString();
        const mediumSolved = json.mediumSolved ?? json.mediumSolved?.toString();
        const hardSolved = json.hardSolved ?? json.hardSolved?.toString();

        // some APIs return different keys
        const submitStats = json.submitStatsGlobal?.acSubmissionNum;
        const total2 = submitStats?.find((x) => x.difficulty === "All")?.count;
        const easy2 = submitStats?.find((x) => x.difficulty === "Easy")?.count;
        const med2 = submitStats?.find((x) => x.difficulty === "Medium")?.count;
        const hard2 = submitStats?.find((x) => x.difficulty === "Hard")?.count;

        const finalTotal = totalSolved ?? total2;
        const finalEasy = easySolved ?? easy2;
        const finalMed = mediumSolved ?? med2;
        const finalHard = hardSolved ?? hard2;

        if (finalTotal == null) throw new Error("Bad response format");

        data = {
          total: finalTotal,
          easy: finalEasy ?? 0,
          medium: finalMed ?? 0,
          hard: finalHard ?? 0,
        };

        break; // ✅ got data, stop trying others
      } catch (e) {
        lastErr = e;
      }
    }

    if (!data) throw lastErr || new Error("All endpoints failed");

    lcTotal.textContent = data.total;
    lcEasy.textContent = data.easy;
    lcMedium.textContent = data.medium;
    lcHard.textContent = data.hard;

    // ✅ Snapshot update
    const snapLc = document.getElementById("snapLcTotal");
    if (snapLc) snapLc.textContent = data.total;

    lcCards.classList.remove("hidden");
    lcStatus.textContent = "";

    localStorage.setItem("devverse_lc_username", username);
    buildInsightsAndCharts(); // 👈 YE ADD KARNA HAI
  } catch (err) {
    lcStatus.textContent = "Could not fetch stats. (Check username / API down)";
    lcCards.classList.add("hidden");
    console.error("LeetCode fetch failed:", err);
  }
}

if (lcBtn) {
  lcBtn.addEventListener("click", () => {
    const username = lcInput.value.trim();
    if (!username) return;
    fetchLeetCode(username);
  });
}

const savedLc = localStorage.getItem("devverse_lc_username");
if (savedLc) {
  lcInput.value = savedLc;
  fetchLeetCode(savedLc);
}

function updateSnapshotFromProjects() {
  const raw = localStorage.getItem("projects");
  const projects = raw ? JSON.parse(raw) : [];

  const featuredCount = projects.filter((p) => !!p.featured).length;
  const demoCount = projects.filter((p) => (p.demo || "").trim()).length;
  const gitCount = projects.filter((p) => (p.git || "").trim()).length;

  if (snapFeatured) snapFeatured.textContent = featuredCount;
  if (snapDemo) snapDemo.textContent = demoCount;
  if (snapGit) snapGit.textContent = gitCount;
}

async function fetchGitHubSnapshot(username) {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
    );
    if (!res.ok) throw new Error("GitHub error");

    const data = await res.json();

    if (snapGhRepos) snapGhRepos.textContent = data.public_repos ?? "--";
    if (snapGhFollowers) snapGhFollowers.textContent = data.followers ?? "--";
  } catch (e) {
    if (snapGhRepos) snapGhRepos.textContent = "--";
    if (snapGhFollowers) snapGhFollowers.textContent = "--";
  }
}

function initDashboardSnapshot() {
  updateTotalProjects();
  updateSnapshotFromProjects();

  // LeetCode
  const lcSaved = localStorage.getItem("devverse_lc_username");
  if (lcSaved) {
    lcUsername.value = lcSaved;
    // optional auto-fetch
    // fetchLeetCode(lcSaved);
  }

  // GitHub
  const ghSaved = localStorage.getItem("devverse_github_username");
  if (ghSaved) fetchGitHubSnapshot(ghSaved);
}

initDashboardSnapshot();

// ================== GRAPHS ==================

const lcCanvas = document.getElementById("lcChart");
const projCanvas = document.getElementById("projChart");

function renderGraphs() {
  // ---------- PROJECTS DATA ----------
  const raw = localStorage.getItem("projects");
  const projects = raw ? JSON.parse(raw) : [];

  const total = projects.length;
  const featured = projects.filter((p) => p.featured).length;
  const withDemo = projects.filter((p) => p.demo).length;
  const withGit = projects.filter((p) => p.git).length;

  // ---------- PROJECT BAR CHART ----------
  if (projCanvas && window.Chart) {
    new Chart(projCanvas, {
      type: "bar",
      data: {
        labels: ["Total", "Featured", "With Demo", "With GitHub"],
        datasets: [
          {
            data: [total, featured, withDemo, withGit],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  // ---------- LEETCODE DATA ----------
  const totalEl = document.getElementById("lcTotal");
  const easyEl = document.getElementById("lcEasy");
  const mediumEl = document.getElementById("lcMedium");
  const hardEl = document.getElementById("lcHard");

  const easy = Number(easyEl?.textContent) || 0;
  const medium = Number(mediumEl?.textContent) || 0;
  const hard = Number(hardEl?.textContent) || 0;

  // ---------- LEETCODE DONUT ----------
  if (lcCanvas && window.Chart) {
    new Chart(lcCanvas, {
      type: "doughnut",
      data: {
        labels: ["Easy", "Medium", "Hard"],
        datasets: [
          {
            data: [easy, medium, hard],
          },
        ],
      },
      options: {
        responsive: true,
        cutout: "70%",
      },
    });
  }
}

//renderGraphs();

let lcChartInstance = null;
let projChartInstance = null;

function buildInsightsAndCharts() {
  // ------- Projects data -------
  const projects = JSON.parse(localStorage.getItem("projects") || "[]");
  const total = projects.length;
  const featured = projects.filter((p) => !!p.featured).length;
  const withDemo = projects.filter((p) => (p.demo || "").trim()).length;
  const withGit = projects.filter((p) => (p.git || "").trim()).length;

  // ------- LeetCode data from cards -------
  const easy = Number(document.getElementById("lcEasy")?.textContent) || 0;
  const medium = Number(document.getElementById("lcMedium")?.textContent) || 0;
  const hard = Number(document.getElementById("lcHard")?.textContent) || 0;

  // ================= INSIGHTS =================
  const insightFocus = document.getElementById("insightFocus");
  const insightFocusSub = document.getElementById("insightFocusSub");
  const insightPortfolio = document.getElementById("insightPortfolio");
  const insightPortfolioSub = document.getElementById("insightPortfolioSub");

  // Focus
  const maxVal = Math.max(easy, medium, hard);
  let focus = "--";
  if (maxVal > 0) {
    focus =
      maxVal === easy
        ? "Easy-heavy"
        : maxVal === medium
          ? "Medium-heavy"
          : "Hard-heavy";
  }
  if (insightFocus) insightFocus.textContent = focus;
  if (insightFocusSub) {
    insightFocusSub.textContent =
      maxVal === 0
        ? "Fetch LeetCode stats to see focus."
        : "Try to balance with more Mediums.";
  }

  // Portfolio Strength
  const demoPct = total ? Math.round((withDemo / total) * 100) : 0;
  const gitPct = total ? Math.round((withGit / total) * 100) : 0;

  if (insightPortfolio)
    insightPortfolio.textContent = `${demoPct}% Demo • ${gitPct}% GitHub`;
  if (insightPortfolioSub) {
    insightPortfolioSub.textContent =
      total === 0
        ? "Add projects to see portfolio strength."
        : "Aim: 70% projects with GitHub + Demo.";
  }

  // ================= CHARTS =================
  const lcCanvas = document.getElementById("lcChart");
  const projCanvas = document.getElementById("projChart");

  // destroy old charts (fix weird overlay)
  if (lcChartInstance) lcChartInstance.destroy();
  if (projChartInstance) projChartInstance.destroy();

  // LeetCode Doughnut
  lcChartInstance = new Chart(lcCanvas, {
    type: "doughnut",
    data: {
      labels: ["Easy", "Medium", "Hard"],
      datasets: [{ data: [easy, medium, hard] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // 👈 YE ADD KARNA HAI
      cutout: "72%",
      plugins: { legend: { position: "bottom" } },
    },
  });

  // Projects Bar
  projChartInstance = new Chart(projCanvas, {
    type: "bar",
    data: {
      labels: ["Total", "Featured", "With Demo", "With GitHub"],
      datasets: [{ data: [total, featured, withDemo, withGit] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // 👈 YE ADD KARNA HAI
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// call once on load
document.addEventListener("DOMContentLoaded", buildInsightsAndCharts);

// call again whenever you fetch leetcode or change projects
window.addEventListener("projectsChanged", buildInsightsAndCharts);

function showDashboardOrOnboarding() {
  const onboarding = document.getElementById("onboarding");
  const dashboardArea = document.getElementById("dashboardArea");

  const lc = localStorage.getItem("devverse_lc_username");
  const gh = localStorage.getItem("devverse_github_username");

  const hasBoth = lc && lc.trim() && gh && gh.trim();

  if (onboarding) onboarding.classList.toggle("hidden", hasBoth);
  if (dashboardArea) dashboardArea.classList.toggle("hidden", !hasBoth);

  // Optional: preload inputs + auto-fetch
  if (hasBoth) {
    const lcInput = document.getElementById("lcUsername");
    if (lcInput) lcInput.value = lc;

    // auto fetch leetcode on load
    if (typeof fetchLeetCode === "function") fetchLeetCode(lc);

    // github snapshot
    if (typeof fetchGitHubSnapshot === "function") fetchGitHubSnapshot(gh);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const onSubmit = document.getElementById("onSubmit");
  const onMsg = document.getElementById("onMsg");

  if (onSubmit) {
    onSubmit.addEventListener("click", () => {
      const lc = document.getElementById("onLc")?.value.trim();
      const gh = document.getElementById("onGh")?.value.trim();

      if (!lc || !gh) {
        if (onMsg) onMsg.textContent = "Please enter both usernames.";
        return;
      }

      localStorage.setItem("devverse_lc_username", lc);
      localStorage.setItem("devverse_github_username", gh);

      if (onMsg) onMsg.textContent = "";
      showDashboardOrOnboarding();

      // trigger charts/insights refresh if you have it
      window.dispatchEvent(new Event("projectsChanged"));
    });
  }

  showDashboardOrOnboarding();
});

// ================= LOGOUT =================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {

    // Clear stored usernames
    localStorage.removeItem("devverse_lc_username");
    localStorage.removeItem("devverse_github_username");

    // Optional: clear charts/projects if needed
    localStorage.removeItem("projects");

    // Reload page (will show onboarding screen)
    location.reload();
  });
}

function showDashboardOrOnboarding() {
  const onboarding = document.getElementById("onboarding");
  const dashboardArea = document.getElementById("dashboardArea");
  const logoutBtn = document.getElementById("logoutBtn");

  const lc = localStorage.getItem("devverse_lc_username");
  const gh = localStorage.getItem("devverse_github_username");

  const loggedIn = !!(lc && gh);

  if (loggedIn) {
    onboarding.classList.add("hidden");
    dashboardArea.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
  } else {
    onboarding.classList.remove("hidden");
    dashboardArea.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const onLc = document.getElementById("onLc");
  const onGh = document.getElementById("onGh");
  const onSubmit = document.getElementById("onSubmit");
  const onMsg = document.getElementById("onMsg");
  const logoutBtn = document.getElementById("logoutBtn");

  showDashboardOrOnboarding();

  if (onSubmit) {
    onSubmit.addEventListener("click", () => {
      const lc = onLc.value.trim();
      const gh = onGh.value.trim();

      if (!lc || !gh) {
        if (onMsg) onMsg.textContent = "Please enter both LeetCode and GitHub usernames.";
        return;
      }

      localStorage.setItem("devverse_lc_username", lc);
      localStorage.setItem("devverse_github_username", gh);

      if (onMsg) onMsg.textContent = "";

      // Optional: auto fill leetcode input
      const lcUsername = document.getElementById("lcUsername");
      if (lcUsername) lcUsername.value = lc;

      showDashboardOrOnboarding();

      // Optional: if you have these functions, call them
      if (typeof fetchLeetCode === "function") fetchLeetCode(lc);
      if (typeof fetchGitHubSnapshot === "function") fetchGitHubSnapshot(gh);

      // Optional: charts refresh
      if (typeof buildInsightsAndCharts === "function") buildInsightsAndCharts();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("devverse_lc_username");
      localStorage.removeItem("devverse_github_username");

      // keep projects saved
      // localStorage.removeItem("projects"); // ❌ dont do this

      location.reload();
    });
  }
});