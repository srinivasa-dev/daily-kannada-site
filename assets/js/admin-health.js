import { requireAdminSession, logout } from "./auth.js";
import { ApiError, fetchAdminHealth } from "./api.js";

const session = requireAdminSession();

const state = {
  loading: false,
  payload: null,
};

const healthRoot = document.getElementById("health-root");
const healthMessage = document.getElementById("health-message");
const refreshButton = document.getElementById("refresh-health-button");
const lastUpdated = document.getElementById("health-last-updated");
const adminUser = document.getElementById("admin-user");
const logoutButton = document.getElementById("logout-button");

if (session) {
  adminUser.textContent = session.user.name || session.user.email || "Admin";
}

logoutButton.addEventListener("click", () => logout());
refreshButton.addEventListener("click", () => loadHealth());

function setMessage(text, tone) {
  healthMessage.textContent = text;
  healthMessage.className = `status-message${tone ? ` ${tone}` : ""}`;
}

function normalizeStatus(value) {
  return String(value || "unknown").trim().toLowerCase();
}

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusTone(value) {
  const normalized = normalizeStatus(value);
  if (normalized === "ok" || normalized === "healthy") return "success";
  if (normalized === "failed" || normalized === "degraded") return "error";
  return "neutral";
}

function formatMetric(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-IN") : "-";
}

function toneLabel(value) {
  const tone = statusTone(value);
  if (tone === "success") return "Stable";
  if (tone === "error") return "Needs attention";
  return "Monitoring";
}

function formatTimestamp(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function createCard(title, content) {
  const card = document.createElement("section");
  card.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = title;
  card.appendChild(heading);
  card.appendChild(content);

  return card;
}

function createOverview(payload) {
  const wrapper = document.createElement("div");
  wrapper.className = "health-overview";

  const statusPanel = document.createElement("div");
  statusPanel.className = "health-status-panel";

  const pulse = document.createElement("div");
  pulse.className = `health-status-pulse ${statusTone(payload.status)}`;
  pulse.setAttribute("aria-hidden", "true");
  statusPanel.appendChild(pulse);

  const badge = document.createElement("span");
  badge.className = `health-badge ${statusTone(payload.status)}`;
  badge.textContent = formatLabel(payload.status);
  statusPanel.appendChild(badge);

  const title = document.createElement("p");
  title.className = "health-service-title";
  title.textContent = payload.service || "Unknown service";
  statusPanel.appendChild(title);

  const version = document.createElement("p");
  version.className = "meta health-service-meta";
  version.textContent = `Version ${payload.version || "unknown"}`;
  statusPanel.appendChild(version);

  const summary = document.createElement("p");
  summary.className = "health-status-copy";
  summary.textContent =
    statusTone(payload.status) === "success"
      ? "Core services are responding normally."
      : "At least one backend dependency needs operator attention.";
  statusPanel.appendChild(summary);

  wrapper.appendChild(statusPanel);

  const facts = document.createElement("dl");
  facts.className = "health-facts";

  [
    ["Latency", `${formatMetric(payload.performance?.latency_ms)} ms`],
    ["Last check", formatTimestamp(payload.timestamp)],
  ].forEach(([termText, detailText]) => {
    const group = document.createElement("div");
    group.className = "health-fact";
    const term = document.createElement("dt");
    term.textContent = termText;
    const detail = document.createElement("dd");
    detail.textContent = detailText;
    group.appendChild(term);
    group.appendChild(detail);
    facts.appendChild(group);
  });

  wrapper.appendChild(facts);

  return createCard("Overview", wrapper);
}

function createChecks(payload) {
  const list = document.createElement("div");
  list.className = "health-list";

  Object.entries(payload.checks || {}).forEach(([key, value]) => {
    const item = document.createElement("article");
    item.className = "health-list-item";
    item.dataset.tone = statusTone(value);

    const textWrap = document.createElement("div");
    textWrap.className = "health-check-copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "health-check-kicker";
    eyebrow.textContent = toneLabel(value);
    textWrap.appendChild(eyebrow);

    const name = document.createElement("h3");
    name.textContent = formatLabel(key);
    textWrap.appendChild(name);

    const detail = document.createElement("p");
    detail.className = "meta health-check-detail";
    if (normalizeStatus(key) === "kv_rate_limit" && normalizeStatus(value) === "failed") {
      detail.textContent = "Rate-limit KV is not persisting the health probe value.";
    } else {
      detail.textContent = `Current result: ${formatLabel(value)}`;
    }
    textWrap.appendChild(detail);

    const badge = document.createElement("span");
    badge.className = `health-badge ${statusTone(value)}`;
    badge.textContent = formatLabel(value);

    const rail = document.createElement("div");
    rail.className = "health-check-rail";

    const fill = document.createElement("span");
    fill.className = `health-check-fill ${statusTone(value)}`;
    rail.appendChild(fill);

    const side = document.createElement("div");
    side.className = "health-check-side";
    side.appendChild(badge);
    side.appendChild(rail);

    item.appendChild(textWrap);
    item.appendChild(side);
    list.appendChild(item);
  });

  return createCard("Checks", list);
}

function createMetrics(payload) {
  const grid = document.createElement("div");
  grid.className = "health-stat-grid";

  [
    ["Phrases", payload.metrics?.phrases],
    ["Users", payload.metrics?.users],
    ["Favorites", payload.metrics?.favorites],
    ["Open reports", payload.metrics?.open_reports],
  ].forEach(([label, value], index) => {
    const tile = document.createElement("article");
    tile.className = "health-stat";
    tile.dataset.index = String(index + 1);

    const metricLabel = document.createElement("p");
    metricLabel.className = "health-stat-label";
    metricLabel.textContent = label;

    const metricValue = document.createElement("strong");
    metricValue.className = "health-stat-value";
    metricValue.textContent = formatMetric(value);

    const accent = document.createElement("span");
    accent.className = "health-stat-mark";
    accent.setAttribute("aria-hidden", "true");

    tile.appendChild(metricLabel);
    tile.appendChild(metricValue);
    tile.appendChild(accent);
    grid.appendChild(tile);
  });

  return createCard("Platform Metrics", grid);
}

function createIncidentSummary(payload) {
  const wrapper = document.createElement("div");
  wrapper.className = "health-summary";

  const degradedChecks = Object.entries(payload.checks || {}).filter(([, value]) => {
    const normalized = normalizeStatus(value);
    return normalized !== "ok" && normalized !== "healthy";
  });

  const paragraph = document.createElement("p");
  paragraph.className = "health-summary-copy";

  if (!degradedChecks.length) {
    paragraph.textContent = "All dependency checks are passing. The API is healthy and responding normally.";
  } else {
    const names = degradedChecks.map(([key]) => formatLabel(key)).join(", ");
    paragraph.textContent = `Attention required for ${names}. The API is serving traffic, but at least one dependency check is failing.`;
  }

  wrapper.appendChild(paragraph);

  const checkline = document.createElement("div");
  checkline.className = "health-summary-line";
  Object.values(payload.checks || {}).forEach((value) => {
    const marker = document.createElement("span");
    marker.className = `health-summary-marker ${statusTone(value)}`;
    checkline.appendChild(marker);
  });
  wrapper.appendChild(checkline);

  return createCard("Operator Note", wrapper);
}

function render() {
  healthRoot.innerHTML = "";
  refreshButton.disabled = state.loading;

  if (state.loading && !state.payload) {
    const loading = document.createElement("section");
    loading.className = "card";
    loading.innerHTML = "<p>Loading health status...</p>";
    healthRoot.appendChild(loading);
    return;
  }

  if (!state.payload) {
    const empty = document.createElement("section");
    empty.className = "card";
    empty.innerHTML = "<p>Health data is not available.</p>";
    healthRoot.appendChild(empty);
    return;
  }

  healthRoot.appendChild(createOverview(state.payload));

  const lowerGrid = document.createElement("div");
  lowerGrid.className = "health-grid";
  lowerGrid.appendChild(createChecks(state.payload));
  lowerGrid.appendChild(createMetrics(state.payload));
  healthRoot.appendChild(lowerGrid);

  healthRoot.appendChild(createIncidentSummary(state.payload));
}

async function loadHealth() {
  state.loading = true;
  setMessage("", "");
  render();

  try {
    state.payload = await fetchAdminHealth();
    lastUpdated.textContent = `Updated ${formatTimestamp(state.payload.timestamp)}`;
    const overallTone = statusTone(state.payload.status);
    setMessage(
      overallTone === "success"
        ? "API dependencies are healthy."
        : "API is degraded. Review failed checks below.",
      overallTone === "neutral" ? "" : overallTone
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "AUTH_EXPIRED") {
      window.location.href = "login.html";
      return;
    }

    lastUpdated.textContent = "Last update failed.";
    setMessage(
      error instanceof Error ? error.message : "Unable to load health data.",
      "error"
    );
  } finally {
    state.loading = false;
    render();
  }
}

loadHealth();
