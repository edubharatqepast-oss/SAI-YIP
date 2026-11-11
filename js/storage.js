import { APP, env } from "./config.js";
import { getState } from "./store.js";

function localGet(kvadId) {
  try {
    const raw = localStorage.getItem("sai_backup_" + (kvadId || "anon"));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function localSet(kvadId, payload) {
  localStorage.setItem("sai_backup_" + (kvadId || "anon"), JSON.stringify(payload));
}

async function sheetsGet() {
  const res = await fetch("./data/challenges.json", { cache: "no-store" });
  if (!res.ok) throw new Error("challenges_fetch_failed");
  return res.json();
}

async function sheetsSet(payload) {
  const { sheetId } = env();
  const token = getState().session?.token || "";
  if (!sheetId) return { skipped: true, reason: "no_sheet_id" };
  if (!token) return { skipped: true, reason: "no_token_queue_local", provider: "sheets" };
  try {
    const body = {
      valueInputOption: "RAW",
      data: [
        { range: `Progress_${payload.kvadId}!A:E`, values: [[payload.kvadId, JSON.stringify(payload.answers), String(payload.points || 0), payload.lang, payload.updatedAt]] },
        { range: `Skills_${payload.kvadId}!A:F`, values: [[payload.kvadId, JSON.stringify(payload.skills), String(payload.points || 0), (payload.badges || []).join(","), payload.lang, payload.updatedAt]] },
        { range: `Users!A:E`, values: [[payload.kvadId, payload.lang, payload.updatedAt, getState().session?.email || "", "active"]] },
        { range: `Sync!A:D`, values: [[payload.kvadId, payload.updatedAt, "4set", "ok"]] }
      ]
    };
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("sheets_batch_failed");
    return { skipped: false, provider: "sheets", batched: 4 };
  } catch (e) {
    return { skipped: true, reason: String(e?.message || e), queued: true, provider: "sheets" };
  }
}

async function d1Get() {
  const { d1Url } = env();
  if (!d1Url) return null;
  const res = await fetch(d1Url + "/challenges", { headers: { "x-sai-sync": "10get" } });
  if (!res.ok) throw new Error("d1_fetch_failed");
  return res.json();
}

async function d1Set(payload) {
  const { d1Url } = env();
  if (!d1Url) return { skipped: true };
  const res = await fetch(d1Url + "/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("d1_save_failed");
  return { skipped: false, provider: "d1" };
}

export async function storageGet(kvadId) {
  const d1 = await d1Get().catch(() => null);
  if (d1?.length) return { challenges: d1, provider: APP.db.future };
  const challenges = await sheetsGet();
  const saved = localGet(kvadId);
  return { challenges, saved, provider: APP.db.primary };
}

export async function storageSet(payload) {
  localSet(payload.kvadId, payload);
  const d1 = await d1Set(payload).catch(() => ({ skipped: true }));
  if (!d1.skipped) return d1;
  return sheetsSet(payload);
}
