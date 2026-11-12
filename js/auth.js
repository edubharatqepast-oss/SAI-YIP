import { getState, setState } from "./store.js";
import { env } from "./config.js";

const KV_KEY = "sai_kvad_id";
const LANG_KEY = "sai_lang";
const SES_KEY = "sai_session";
const TOKEN_KEY = "sai_token";

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

export async function loginWithKvad(kvadId, password = "") {
  const id = String(kvadId || "").trim().toUpperCase();
  if (!validKvad(id)) return { ok: false };

  const apiUrl = env().apiUrl;
  if (!apiUrl) return { ok: false, error: "API not configured" };

  try {
    const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kvadId: id, password })
    });

    if (!res.ok) return { ok: false, error: "Invalid KVAD ID or password" };

    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.error || "Login failed" };

    const token = data.token;
    if (!token) return { ok: false, error: "No token received" };

    // Store token and session
    localStorage.setItem(TOKEN_KEY, token);
    const user = {
      id: data.user.id,
      kvadId: data.user.kvadId,
      role: data.user.role,
      class: data.user.class,
      name: data.user.name
    };

    setState({
      kvadId: id,
      session: baseSession("google", { token, sheetReady: false }),
      role: user.role
    });
    saveLocal();

    return { ok: true, mode: "google", user };
  } catch (e) {
    console.error("Login failed:", e);
    return { ok: false, error: "Network error" };
  }
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
  if (!validKvad(id)) return { ok: false };
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

export function logout() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      fetch(`${env().apiUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer " + token
        }
      });
    } catch { /* ignore network errors */ }
  }
  localStorage.removeItem(TOKEN_KEY);
  setState({ kvadId: "", session: { provider: "none" }, role: "student", inspectedId: "" });
  localStorage.removeItem(KV_KEY);
  localStorage.removeItem(SES_KEY);
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}
