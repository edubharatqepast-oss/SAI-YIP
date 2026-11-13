import { getState, setState } from "./store.js";
import { t } from "./i18n.js";
import { loadLocal, saveLocal, isAuthenticated, isLocked, logout } from "./auth.js";
import { batchUpdate4 } from "./sheets.js";
import { initA11y, cycleFontSize, announce } from "./a11y.js";
import { initBuddy, toggleBuddy } from "./buddy.js";
import { track } from "./analytics.js";
import { renderScan } from "./ui/scan.js";
import { renderDetail } from "./ui/detail.js";
import { renderProgress } from "./ui/progress.js";
import { renderIntro } from "./ui/intro.js";
import { renderVlearn } from "./ui/vlearn.js";
import { resetQuotaIfNewDay } from "./quota.js";

const PUBLIC_ROUTES = ["intro", "scan"];
const PROTECTED_ROUTES = ["games", "vlearn", "lessons", "detail", "progress", "coding", "teacher"];
const APP_ROUTES = ["games", "vlearn", "lessons", "progress", "coding", "teacher"];
const routes = ["intro", "games", "vlearn", "scan", "lessons", "detail", "progress", "coding", "teacher"];
let route = "intro";

function root() {
  return document.getElementById("page");
}

function isAuthed() {
  return isAuthenticated();
}

function paintNav() {
  const nav = document.querySelector("nav.nav");
  if (!nav) return;
  if (!isAuthed() && !isLocked()) {
    nav.classList.add("nav-hidden");
    nav.classList.remove("nav-visible");
    return;
  }
  nav.classList.remove("nav-hidden");
  nav.classList.add("nav-visible");
  for (const r of APP_ROUTES) {
    const b = document.querySelector(`[data-nav="${r}"]`);
    if (b) {
      const on = b.dataset.nav === route;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
  }
}

function render() {
  const el = root();
  document.body.dataset.route = route;
  paintNav();
  document.getElementById("kvadBadge").textContent = getState().kvadId || "SAI";
  if (route === "login") route = "scan";
  resetQuotaIfNewDay();

  if (PROTECTED_ROUTES.includes(route) && !isAuthed() && !isLocked()) {
    route = "scan";
    renderScan(el);
    return;
  }

  if (route === "intro" && isAuthed()) {
    route = "games";
    el.innerHTML = '<div class="loader">Loading…</div>';
    import("./ui/games.js").then((m) => {
      if (route === "games") m.renderGames(el);
    });
    return;
  }

  if (route === "intro") renderIntro(el);
  if (route === "games") {
    el.innerHTML = '<div class="loader">Loading games…</div>';
    import("./ui/games.js").then((m) => {
      if (route === "games") m.renderGames(el);
    });
  }
  if (route === "vlearn") {
    el.innerHTML = '<div class="loader">Loading videos…</div>';
    renderVlearn(el);
  }
  if (route === "scan") renderScan(el);
  if (route === "lessons") {
    el.innerHTML = '<div class="loader">Loading…</div>';
    import("./ui/lessons.js").then((m) => {
      if (route === "lessons") m.renderLessons(el);
    });
  }
  if (route === "detail") renderDetail(el);
  if (route === "progress") renderProgress(el);
  if (route === "coding") {
    el.innerHTML = '<div class="loader">Loading…</div>';
    import("./ui/coding.js").then((m) => {
      if (route === "coding") m.renderCoding(el);
    });
  }
  if (route === "teacher") {
    el.innerHTML = '<div class="loader">Loading…</div>';
    import("./teacher.js").then((m) => {
      if (route === "teacher") m.renderTeacher(el);
    });
  }
}

function go(next) {
  if (!routes.includes(next)) return;
  if (PROTECTED_ROUTES.includes(next) && !isAuthed() && !isLocked()) {
    route = "scan";
    track("nav", { route, blocked: next });
    render();
    return;
  }
  if (next === "intro" && isAuthed()) {
    route = "games";
    track("nav", { route, redirected: "intro" });
    render();
    return;
  }
  route = next;
  track("nav", { route });
  render();
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.onclick = () => go(b.dataset.nav);
  });
  document.getElementById("langBtn").onclick = () => {
    const s = getState();
    s.lang = s.lang === "en" ? "ml" : "en";
    saveLocal();
    document.getElementById("langBtn").textContent = s.lang === "en" ? "മലയാളം" : "English";
    announce(s.lang === "ml" ? "മലയാളം തിരഞ്ഞെടുത്തു" : "English selected");
    render();
  };
  document.getElementById("sizeBtn").onclick = () => {
    cycleFontSize();
    announce("text size changed");
  };
  document.getElementById("buddyBtn").onclick = () => {
    const live = toggleBuddy();
    announce(live ? "Buddy on" : "Buddy off");
  };
  document.getElementById("saveBtn").onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const res = await batchUpdate4();
    track("save", { ok: res.ok });
    btn.disabled = false;
    btn.textContent = res.ok ? "✅ " + t("save_exit", getState().lang) : "❌ " + t("retry", getState().lang);
    setTimeout(() => { btn.textContent = t("save_exit", getState().lang); }, 1500);
  };
  window.addEventListener("sai:navigate", (e) => go(e.detail));
  const s = getState();
  document.getElementById("langBtn").textContent = s.lang === "en" ? "മലയാളം" : "English";
  if (isAuthed()) {
    document.getElementById("saveBtn").textContent = t("logout", s.lang) || "Logout";
    document.getElementById("saveBtn").onclick = (e) => {
      e.preventDefault();
      logout();
      route = "intro";
      render();
    };
  } else {
    document.getElementById("saveBtn").textContent = t("save_exit", s.lang);
    document.getElementById("saveBtn").onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const res = await batchUpdate4();
      track("save", { ok: res.ok });
      btn.disabled = false;
      btn.textContent = res.ok ? "✅ " + t("save_exit", getState().lang) : "❌ " + t("retry", getState().lang);
      setTimeout(() => { btn.textContent = t("save_exit", getState().lang); }, 1500);
    };
  }
}

function dismissSplash() {
  const el = document.getElementById("splash");
  if (el) el.classList.add("hide");
  if (document.body.dataset.route === "splash") {
    document.body.dataset.route = route;
  }
}

function boot() {
  loadLocal();
  initA11y();
  bind();
  route = "intro";
  render();
  initBuddy();
  document.body.dataset.route = "splash";
  setTimeout(dismissSplash, 2000);
  setState({});
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.min.js").catch(() => {});
    });
  }
}

boot();
