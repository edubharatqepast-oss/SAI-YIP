import { getState, setState } from "./store.js";

const KV_KEY = "sai_kvad_id";
const LANG_KEY = "sai_lang";
const SES_KEY = "sai_session";

export function validKvad(v) {
  return /^KVAD-\d{3}$/i.test(String(v || "").trim());
}

export function loadLocal() {
  const s = getState();
  s.kvadId = localStorage.getItem(KV_KEY) || "";
  const lang = localStorage.getItem(LANG_KEY) || "en";
  s.lang = lang === "ml" ? "ml" : "en";
  try {
    const ses = JSON.parse(localStorage.getItem(SES_KEY) || "null");
    if (ses?.provider) {
      s.session = ses;
      s.role = ses.role || "student";
    }
  } catch {
    return;
  }
  if (!s.session) s.session = { provider: "none" };
}

export function saveLocal() {
  const s = getState();
  localStorage.setItem(KV_KEY, s.kvadId);
  localStorage.setItem(LANG_KEY, s.lang);
  if (s.session && s.session.provider !== "none") {
    localStorage.setItem(SES_KEY, JSON.stringify(s.session));
  }
}

export function getSession() {
  return getState().session || { provider: "none" };
}

export function googleConfigured() {
  return Boolean(window.__SAI_ENV__?.GOOGLE_CLIENT_ID);
}

export function googleAvailable() {
  return googleConfigured() && Boolean(window.google?.accounts?.oauth2);
}

function baseSession(provider, extra) {
  return {
    provider,
    kvadId: getState().kvadId,
    at: new Date().toISOString(),
    ...(extra || {})
  };
}

export function loginDemo(kvadId) {
  const id = String(kvadId || "").trim().toUpperCase();
  if (!validKvad(id)) return { ok: false };
  setState({ kvadId: id, session: baseSession("demo", { offline: true }), role: "student" });
  saveLocal();
  return { ok: true, mode: "demo" };
}

export function sessionFromGoogle(kvadId, token, profile) {
  const id = String(kvadId || "").trim().toUpperCase();
  if (!validKvad(id)) return { ok: false };
  const session = baseSession("google", {
    token,
    sub: profile?.sub || "",
    email: profile?.email || "",
    sheetReady: false
  });
  setState({ kvadId: id, session, role: "student" });
  saveLocal();
  return { ok: true, mode: "google" };
}

export function markSheetReady() {
  const s = getState();
  if (s.session) {
    s.session.sheetReady = true;
    saveLocal();
  }
}

export function validTeacher(v) {
  return /^TCH-\d{3}$/i.test(String(v || "").trim());
}

export function lockSession(kvadId) {
  const id = String(kvadId || "").trim().toUpperCase();
  if (!validKvad(id)) return { ok: false };
  setState({
    kvadId: id,
    session: baseSession("scan", { kvadId: id, locked: true }),
    role: "student"
  });
  saveLocal();
  return { ok: true };
}

export function isLocked() {
  const s = getState();
  return Boolean(s.session?.locked && validKvad(s.kvadId));
}

export function enforceLock(nextId) {
  const s = getState();
  const id = String(nextId || "").trim().toUpperCase();
  if (!isLocked()) return { ok: true, id };
  if (s.kvadId === id) return { ok: true, id, same: true };
  return { ok: false, locked: true, current: s.kvadId, next: id };
}

export function switchSession(kvadId, provider) {
  const id = String(kvadId || "").trim().toUpperCase();
  if (!validKvad(id)) return { ok: false };
  setState({
    kvadId: id,
    answers: {},
    points: 0,
    badges: [],
    session: baseSession(provider || "scan", { kvadId: id, locked: true }),
    role: "student"
  });
  saveLocal();
  return { ok: true };
}

export function loginWithCode(kvadId) {
  return lockSession(kvadId);
}

export function loginTeacher(code) {
  const id = String(code || "").trim().toUpperCase();
  if (!validTeacher(id)) return { ok: false };
  setState({
    kvadId: "",
    session: baseSession("teacher", { teacherId: id, locked: false }),
    role: "teacher",
    inspectedId: ""
  });
  saveLocal();
  return { ok: true };
}

export function isTeacher() {
  return getState().role === "teacher";
}

export function isAuthenticated() {
  return Boolean(getState().kvadId);
}

export function requireAuth() {
  return isAuthenticated();
}

export function logout() {
  setState({ kvadId: "", session: { provider: "none" }, role: "student", inspectedId: "" });
  localStorage.removeItem(KV_KEY);
  localStorage.removeItem(SES_KEY);
  try {
    window.google?.accounts?.oauth2?.revoke?.(getState().session?.token || "");
  } catch {
    return;
  }
}
