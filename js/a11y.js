const SIZE_KEY = "sai_font_size";

export function initA11y() {
  const saved = localStorage.getItem(SIZE_KEY) || "m";
  document.documentElement.dataset.saiSize = saved;
  applySize(saved);
}

export function cycleFontSize() {
  const cur = document.documentElement.dataset.saiSize || "m";
  const next = cur === "m" ? "l" : cur === "l" ? "xl" : "m";
  document.documentElement.dataset.saiSize = next;
  localStorage.setItem(SIZE_KEY, next);
  applySize(next);
  return next;
}

function applySize(s) {
  const map = { m: "100%", l: "112.5%", xl: "125%" };
  document.documentElement.style.fontSize = map[s] || "100%";
}

export function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
}

export function announce(msg) {
  const el = document.getElementById("sai-live");
  if (el) el.textContent = msg;
}
