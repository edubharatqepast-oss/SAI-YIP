import { getState } from "./store.js";
import { googleConfigured } from "./auth.js";
import { env } from "./config.js";

const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.appdata";

function gsi() {
  return window.google?.accounts?.oauth2 || null;
}

let gsiPromise = null;

export function ensureGsi() {
  if (gsi()) return Promise.resolve(true);
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://accounts.google.com/gsi/client";
    tag.async = true;
    tag.onload = () => resolve(Boolean(gsi()));
    tag.onerror = () => resolve(false);
    document.head.append(tag);
    setTimeout(() => resolve(Boolean(gsi())), 10000);
  });
  return gsiPromise;
}

export function canUseGoogle() {
  return googleConfigured();
}

export function requestGoogleToken() {
  return ensureGsi().then(
    (loaded) =>
      new Promise((resolve) => {
        if (!loaded) {
          resolve({ ok: false, reason: "no-gsi" });
          return;
        }
        const oauth = gsi();
        if (!oauth) {
          resolve({ ok: false, reason: "no-gsi" });
          return;
        }
        try {
          const client = oauth.initTokenClient({
            client_id: env().googleClientId,
            scope: SCOPES,
            callback: (resp) => {
              if (resp?.access_token) resolve({ ok: true, token: resp.access_token });
              else resolve({ ok: false, reason: "denied" });
            },
            error_callback: () => resolve({ ok: false, reason: "error" })
          });
          client.requestAccessToken({ prompt: "consent" });
        } catch {
          resolve({ ok: false, reason: "exception" });
        }
      })
  );
}

export async function fetchGoogleProfile(token) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) return {};
    const j = await res.json();
    return { sub: j.sub || "", email: j.email || "" };
  } catch {
    return {};
  }
}

export async function ensureUserRow() {
  const s = getState();
  const { sheetId } = env();
  const token = s.session?.token || "";
  if (!sheetId || !token) return { ok: false, skipped: true };
  try {
    const range = encodeURIComponent("Users!A:E");
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!getRes.ok) throw new Error("sheet_read_failed");
    const data = await getRes.json();
    const rows = data.values || [];
    const exists = rows.some((r) => String(r[0] || "").toUpperCase() === s.kvadId);
    if (exists) return { ok: true, created: false };
    const appendRange = encodeURIComponent("Users!A:E");
    const body = { values: [[s.kvadId, s.session?.sub || "", s.session?.email || "", s.lang, new Date().toISOString()]] };
    const postRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${appendRange}:append?valueInputOption=RAW`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!postRes.ok) throw new Error("sheet_write_failed");
    return { ok: true, created: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
