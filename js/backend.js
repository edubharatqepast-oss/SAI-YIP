export function apiBase() {
  return window.__SAI_ENV__?.API_URL || "";
}

export function apiConfigured() {
  return Boolean(apiBase());
}

export function authHeaders() {
  try {
    const ses = JSON.parse(localStorage.getItem("sai_session") || "null");
    if (ses?.token) return { Authorization: "Bearer " + ses.token };
  } catch {
    return {};
  }
  return {};
}

async function post(path, body) {
  const res = await fetch(apiBase() + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("api_failed");
  return res.json();
}

export async function sheetsAppendViaApi(range, values) {
  if (!apiConfigured()) return { ok: false, skipped: true };
  return post("/api/sheets/append", { range, values });
}

export async function sheetsReadViaApi(range) {
  const res = await fetch(apiBase() + "/api/sheets/read?range=" + encodeURIComponent(range), {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error("api_failed");
  return res.json();
}

export async function generateQuestionsViaApi(template, skill, level, count, dryRun) {
  return post("/api/questions/generate", { template, skill, level, count, dryRun: dryRun !== false });
}

export async function approveQuestionViaApi(question, approvedBy) {
  return post("/api/review/approve", { question, approvedBy });
}

export async function apiHealth() {
  const res = await fetch(apiBase() + "/api/health");
  if (!res.ok) throw new Error("api_down");
  return res.json();
}
