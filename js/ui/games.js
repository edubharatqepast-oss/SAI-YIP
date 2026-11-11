import { getState } from "../store.js";
import { t } from "../i18n.js";
import { getRemainingMinutes, getQuotaPercent, formatMinutes, startSession, endSession, isQuotaExhausted } from "../quota.js";
import { GAMES } from "../games.js";

let modal = null;
let iframeEl = null;
let gameSessionStarted = false;

export function renderGames(root) {
  const s = getState();
  const lang = s.lang;
  const remaining = getRemainingMinutes();
  const pct = getQuotaPercent();
  const exhausted = isQuotaExhausted();

  root.innerHTML = "";

  const section = document.createElement("section");
  section.className = "games";

  section.appendChild(gamesHeader(remaining, pct, exhausted, lang));
  section.appendChild(filters(lang));
  section.appendChild(gameGrid(exhausted, lang));
  section.appendChild(createModalRoot());

  root.appendChild(section);
}

function gamesHeader(remaining, pct, exhausted, lang) {
  const wrap = document.createElement("div");
  wrap.className = "games-header";

  const left = document.createElement("div");
  left.className = "games-header-left";
  const h2 = document.createElement("h2");
  h2.textContent = t("iq_games", lang);
  const p = document.createElement("p");
  p.className = "muted small";
  p.textContent = t("brain_training_desc", lang);
  left.append(h2, p);

  const right = document.createElement("div");
  right.className = "games-header-right";
  const quota = document.createElement("div");
  quota.className = "games-quota";
  const dot = document.createElement("span");
  dot.className = "games-quota-dot";
  dot.style.background = pct > 40 ? "var(--sai-ok)" : "var(--sai-accent)";
  const txt = document.createElement("span");
  txt.className = "games-quota-text";
  txt.textContent = exhausted ? t("quota_exhausted", lang) : formatMinutes(remaining) + " " + t("left", lang);
  quota.append(dot, txt);
  right.append(quota);

  wrap.append(left, right);
  return wrap;
}

function filters(lang) {
  const wrap = document.createElement("div");
  wrap.className = "games-filters";
  const skills = [
    { key: "filter_all", text: "All" },
    { key: "filter_logic", text: "Logic" },
    { key: "filter_observation", text: "Observation" },
    { key: "filter_problem_solving", text: "Problem Solving" },
    { key: "filter_reasoning", text: "Reasoning" }
  ];
  for (const skill of skills) {
    const chip = document.createElement("button");
    chip.className = "games-chip" + (skill.text === "All" ? " active" : "");
    chip.textContent = t(skill.key, lang);
    chip.onclick = () => {
      document.querySelectorAll(".games-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGridFiltered(skill.text === "All" ? null : skill.text, exhausted, lang);
    };
    wrap.appendChild(chip);
  }
  return wrap;
}

function gameGrid(exhausted, lang) {
  const grid = document.createElement("div");
  grid.className = "grid cols-3 games-grid";
  grid.id = "games-grid";
  renderGridFiltered(null, grid, exhausted, lang);
  return grid;
}

function renderGridFiltered(skill, gridEl, exhausted, lang) {
  const grid = gridEl || document.getElementById("games-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const list = skill ? GAMES.filter((g) => g.skill === skill) : GAMES;
  for (const g of list) {
    grid.appendChild(gameCard(g, exhausted, lang));
  }
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("no_games_category", lang);
    grid.appendChild(empty);
  }
}

function gameCard(g, exhausted, lang) {
  const embeddable = Boolean(g.iframeUrl);
  const card = document.createElement("div");
  card.className = "card lift game-card" + (embeddable ? "" : " locked");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", t("play_game", lang) + " " + g.name);

  const top = document.createElement("div");
  top.className = "game-card-top";
  const ic = document.createElement("div");
  ic.className = "game-card-icon";
  ic.textContent = g.icon;
  const lock = document.createElement("span");
  lock.className = "game-card-lock";
  lock.textContent = embeddable ? "" : "\ud83d\udd12";
  lock.title = embeddable ? t("plays_inside", lang) : t("not_available_offline", lang);
  top.append(ic, lock);

  const ttl = document.createElement("h3");
  ttl.textContent = g.name;
  const cat = document.createElement("p");
  cat.className = "muted small";
  cat.textContent = g.category;
  const skill = document.createElement("span");
  skill.className = "badge skill";
  skill.textContent = g.skill;
  const diff = document.createElement("span");
  diff.className = "badge l" + (g.difficulty === "Easy" ? "1" : g.difficulty === "Medium" ? "2" : "3");
  diff.textContent = g.difficulty;

  const body = document.createElement("p");
  body.className = "muted small";
  body.style.fontSize = "13px";
  body.textContent = g.description;

  const foot = document.createElement("div");
  foot.className = "game-card-foot";
  const lic = document.createElement("span");
  lic.className = "muted small";
  lic.textContent = g.license;
  const btn = document.createElement("button");
  btn.className = "secondary";
  btn.disabled = exhausted || !embeddable;
  btn.textContent = exhausted ? t("quota_used_up", lang) : embeddable ? t("play", lang) : t("locked", lang);
  btn.onclick = () => openGame(g);

  card.onclick = (e) => {
    if (e.target === btn) return;
    if (!exhausted && embeddable) openGame(g);
  };
  card.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!exhausted && embeddable) openGame(g);
    }
  };

  foot.append(lic, btn);
  card.append(top, ttl, cat, skill, diff, body, foot);
  return card;
}

function openGame(g) {
  const s = getState();
  if (s.sessionStart) endSession();
  startSession();
  gameSessionStarted = true;

  if (g.iframeUrl) {
    showModal(g);
  }
}

function showModal(g) {
  if (modal) modal.remove();

  const overlay = document.createElement("div");
  overlay.className = "game-modal-overlay";
  const modalEl = document.createElement("div");
  modalEl.className = "game-modal";

  const head = document.createElement("div");
  head.className = "game-modal-head";
  const badge = document.createElement("div");
  badge.className = "game-modal-badge";
  badge.textContent = g.icon;
  const ttl = document.createElement("h3");
  ttl.textContent = g.name;
  const close = document.createElement("button");
  close.className = "game-modal-close";
  close.textContent = "✕";
  close.onclick = hideModal;
  head.append(badge, ttl, close);

  const body = document.createElement("div");
  body.className = "game-modal-body";

  const playerWrap = document.createElement("div");
  playerWrap.className = "game-iframe-wrap";
  const loading = document.createElement("div");
  loading.className = "loader";
  const fail = document.createElement("div");
  fail.className = "game-load-fail";
  fail.style.display = "none";
  fail.innerHTML =
    '<div style="text-align:center;padding:20px;">' +
    '<div style="font-size:32px;margin-bottom:8px;">🔒</div>' +
    '<div style="font-weight:800;margin-bottom:6px;">' + t("game_cannot_play", lang) + '</div>' +
    '<div style="font-size:13px;color:var(--sai-muted);margin-bottom:12px;">' + t("game_blocks_embedding", lang) + '</div>' +
    '<div style="font-size:13px;color:var(--sai-muted);margin-bottom:16px;">License: <strong>' + g.license + '</strong></div>' +
    '</div>';
  playerWrap.append(loading, fail);
  iframeEl = document.createElement("iframe");
  iframeEl.className = "game-iframe";
  iframeEl.src = g.iframeUrl;
  iframeEl.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
  iframeEl.setAttribute("referrerpolicy", "no-referrer");
  iframeEl.setAttribute("loading", "lazy");
  playerWrap.appendChild(iframeEl);

  const desc = document.createElement("p");
  desc.className = "modal-desc";
  desc.textContent = g.description;

  const meta = document.createElement("p");
  meta.className = "modal-meta";
  meta.textContent = g.category + " · " + g.skill + " · " + g.difficulty;

  const lic = document.createElement("p");
  lic.className = "modal-license";
  lic.innerHTML = t("license", lang) + ": <strong>" + g.license + "</strong>";

  body.append(playerWrap, desc, meta, lic);
  modalEl.append(head, body);
  overlay.appendChild(modalEl);
  document.body.appendChild(overlay);
  modal = overlay;

  let failed = false;
  const timeout = setTimeout(() => {
    if (!iframeEl.contentWindow && !failed) {
      failed = true;
      loading.style.display = "none";
      fail.style.display = "block";
    }
  }, 8000);

  iframeEl.onload = () => {
    clearTimeout(timeout);
    loading.style.display = "none";
    failed = true;
  };

  iframeEl.onerror = () => {
    clearTimeout(timeout);
    if (!failed) {
      failed = true;
      loading.style.display = "none";
      fail.style.display = "block";
    }
  };
}

function hideModal() {
  if (modal) {
    modal.remove();
    modal = null;
    iframeEl = null;
  }
  if (gameSessionStarted) {
    endSession();
    gameSessionStarted = false;
  }
}

function createModalRoot() {
  const div = document.createElement("div");
  div.id = "game-modal-root";
  div.style.display = "none";
  return div;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal) hideModal();
});
