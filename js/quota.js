import { getState, setState } from "./store.js";

const SAVE_INTERVAL_MS = 30000;

let tickTimer = null;

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function resetQuotaIfNewDay() {
  const s = getState();
  if (s.quota.date !== todayKey()) {
    s.quota.date = todayKey();
    s.quota.minUsed = 0;
  }
}

export function getRemainingMinutes() {
  const s = getState();
  let used = s.quota.minUsed;
  if (s.sessionStart) {
    used += Math.floor((Date.now() - s.sessionStart) / 60000);
  }
  return Math.max(0, s.quota.limit - used);
}

export function getQuotaPercent() {
  const s = getState();
  return Math.round((getRemainingMinutes() / s.quota.limit) * 100);
}

export function isQuotaExhausted() {
  return getRemainingMinutes() <= 0;
}

export function startSession() {
  const s = getState();
  s.sessionStart = Date.now();
  startTick();
}

export function endSession() {
  const s = getState();
  if (s.sessionStart) {
    s.quota.minUsed += Math.floor((Date.now() - s.sessionStart) / 60000);
    s.sessionStart = null;
  }
  stopTick();
}

function tick() {
  const s = getState();
  if (s.sessionStart && getRemainingMinutes() <= 0) {
    endSession();
  }
}

function startTick() {
  stopTick();
  tickTimer = setInterval(tick, SAVE_INTERVAL_MS);
}

function stopTick() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

export function formatMinutes(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

window.addEventListener("beforeunload", () => {
  endSession();
});
