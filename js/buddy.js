import { getState } from "./store.js";

const KEY = "sai_buddy";
const NAME = "サイちゃん";
const LINES = {
  en: ["Think first. Answer second. 🚀", "Stuck? Peek at the hint 💡", "Slow eyes win 👀", "Mistakes = XP. Keep going! ✨", "Scan. Learn. Shine. 🌟"],
  ml: ["ആദ്യം ചിന്തിക്കൂ. പിന്നെ ഉത്തരം. 🚀", "മുട്ടിയോ? സൂചന നോക്കൂ 💡", "സാവധാന കണ്ണുകൾ ജയിക്കും 👀", "തെറ്റുകൾ = XP. തുടരൂ! ✨", "സ്കാൻ. പഠിക്കൂ. തിളങ്ങൂ. 🌟"]
};

let on = true;
let el = null;
let bubble = null;
let timer = 0;
let cx = 12;
let cy = 0;
let busy = false;

export function buddyOn() {
  return on;
}

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
}

function lines() {
  return LINES[getState().lang === "ml" ? "ml" : "en"];
}

function say(text, ms) {
  if (!el || !bubble) return;
  bubble.textContent = text;
  bubble.style.display = "block";
  clearTimeout(say._t);
  say._t = setTimeout(() => {
    if (bubble) bubble.style.display = "none";
  }, ms || 3500);
}

function place(x, y) {
  cx = Math.max(8, Math.min(window.innerWidth - 56, x));
  cy = Math.max(0, y);
}

function moveTo(x, y, ms) {
  place(x, y);
  if (!el) return Promise.resolve();
  const anim = el.animate(
    [{ transform: `translate(${cx}px, ${-cy}px)` }],
    { duration: ms, easing: "ease-in-out", fill: "forwards" }
  );
  return anim.finished.catch(() => {});
}

function faceLeft(left) {
  if (el) el.classList.toggle("flip", left);
}

async function actWalk() {
  const target = 8 + Math.random() * Math.max(8, window.innerWidth - 64);
  faceLeft(target < cx);
  if (el) el.classList.add("waddling");
  await moveTo(target, 0, 2200 + Math.random() * 2000);
  if (el) el.classList.remove("waddling");
}

async function actJump() {
  if (!el) return;
  await el.animate(
    [{ transform: `translate(${cx}px, 0)` }, { transform: `translate(${cx}px, -70px)` }, { transform: `translate(${cx}px, 0)` }],
    { duration: 700, easing: "ease-out" }
  ).finished.catch(() => {});
  say(lines()[Math.floor(Math.random() * lines().length)]);
}

async function actClimb() {
  faceLeft(false);
  await moveTo(window.innerWidth - 60, 0, 1500);
  if (el) el.classList.add("climbing");
  await moveTo(window.innerWidth - 60, Math.min(window.innerHeight * 0.45, 320), 2800);
  say(NAME + " 🧗");
  await new Promise((r) => setTimeout(r, 1200));
  await moveTo(window.innerWidth - 60, 0, 2200);
  if (el) el.classList.remove("climbing");
}

async function actSleep() {
  say("Zzz… 💤", 4000);
  if (el) el.classList.add("sleepy");
  await new Promise((r) => setTimeout(r, 4000));
  if (el) el.classList.remove("sleepy");
}

async function tick() {
  clearTimeout(timer);
  if (!on || reducedMotion() || document.hidden || !el) {
    timer = setTimeout(tick, 3000);
    return;
  }
  if (busy) {
    timer = setTimeout(tick, 3000);
    return;
  }
  busy = true;
  const roll = Math.random();
  try {
    if (roll < 0.4) await actWalk();
    else if (roll < 0.6) await actJump();
    else if (roll < 0.75) await actClimb();
    else if (roll < 0.88) {
      say(lines()[Math.floor(Math.random() * lines().length)]);
      await new Promise((r) => setTimeout(r, 1500));
    } else await actSleep();
  } catch {
    // next tick
  }
  busy = false;
  timer = setTimeout(tick, 3500 + Math.random() * 4000);
}

export function initBuddy() {
  try {
    on = localStorage.getItem(KEY) !== "off";
  } catch {
    on = true;
  }
  if (reducedMotion()) on = false;
  el = document.createElement("div");
  el.className = "buddy";
  el.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.src = "./mascot-sai.svg";
  img.alt = "";
  img.width = 48;
  img.height = 48;
  img.draggable = false;
  bubble = document.createElement("div");
  bubble.className = "buddy-bubble";
  bubble.style.display = "none";
  el.append(img, bubble);
  document.body.append(el);
  el.style.transform = `translate(${cx}px, 0)`;
  el.style.display = on ? "block" : "none";
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && on) {
      clearTimeout(timer);
      timer = setTimeout(tick, 1500);
    }
  });
  window.addEventListener("resize", () => place(cx, cy));
  timer = setTimeout(tick, 5000);
  paintBuddyBtn();
}

export function toggleBuddy() {
  on = !on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
  if (el) el.style.display = on ? "block" : "none";
  if (on) {
    clearTimeout(timer);
    timer = setTimeout(tick, 800);
    say(NAME + "! ✨");
  } else {
    clearTimeout(timer);
  }
  paintBuddyBtn();
  return on;
}

export function paintBuddyBtn() {
  const b = document.getElementById("buddyBtn");
  if (!b) return;
  b.textContent = "🤖";
  b.style.opacity = on ? "1" : ".4";
  b.setAttribute("aria-pressed", String(on));
  b.title = NAME + " (page buddy)";
}
