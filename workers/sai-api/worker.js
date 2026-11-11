const SHEET_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SKILLS = ["Reasoning", "Observation", "Logic", "Coding", "Problem Solving"];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

function needToken(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token;
}

function cleanRows(values) {
  return (values || []).filter((r) => r.some((c) => String(c || "").trim() !== "")).slice(0, 500);
}

function buildPrompt(template, skill, level, count) {
  const sample = JSON.stringify(template.sample, null, 1).slice(0, 1200);
  return [
    "You generate bilingual quiz questions for Kerala Class 6-10 students.",
    "Skill: " + skill + ". Level: " + level + " of 3.",
    "Each question needs: id, skill, level, type(mcq|input), prompt_en, prompt_ml, options(array, empty for input), answer, hint_en, hint_ml, explanation_en, explanation_ml.",
    "Rules from template: " + (template.rules || "short, simple English; correct Malayalam; one clear answer."),
    "Sample shape: " + sample,
    "Generate exactly " + count + " questions as a JSON array only. No markdown. No extra text."
  ].join("\n");
}

function validQuestion(q) {
  return q && typeof q.prompt_en === "string" && typeof q.prompt_ml === "string"
    && typeof q.answer === "string" && (q.type === "mcq" || q.type === "input")
    && typeof q.hint_en === "string" && typeof q.explanation_en === "string";
}

function extractArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function tabOf(range) {
  const i = String(range || "").indexOf("!");
  return i > 0 ? String(range).slice(0, i).replace(/^'/, "") : "";
}

async function ensureTab(token, sheetId, title) {
  if (!title) return;
  await fetch(SHEET_BASE + "/" + sheetId + ":batchUpdate", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
  }).catch(() => null);
}

async function appendValues(token, sheetId, range, values) {
  const url = SHEET_BASE + "/" + sheetId + "/values/" + encodeURIComponent(range) + ":append?valueInputOption=RAW";
  const send = () => fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ values })
  });
  let res = await send();
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    if (/Unable to parse range|Requested entity was not found/i.test(err)) {
      await ensureTab(token, sheetId, tabOf(range));
      res = await send();
    }
  }
  return res;
}

async function handleSheetsAppend(request, env) {
  const token = needToken(request);
  if (!token) return json({ ok: false, error: "missing_token" }, 401);
  if (!env.SHEET_ID) return json({ ok: false, error: "no_sheet_configured" }, 500);
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const range = String(body.range || "").slice(0, 80);
  const values = cleanRows(body.values);
  if (!range || !values.length) return json({ ok: false, error: "bad_payload" }, 400);
  const res = await appendValues(token, env.SHEET_ID, range, values);
  if (!res.ok) return json({ ok: false, error: "sheets_write_failed" }, 502);
  return json({ ok: true, appended: values.length });
}

async function handleSheetsRead(request, env) {
  const token = needToken(request);
  if (!token) return json({ ok: false, error: "missing_token" }, 401);
  if (!env.SHEET_ID) return json({ ok: false, error: "no_sheet_configured" }, 500);
  const url = new URL(request.url);
  const range = String(url.searchParams.get("range") || "").slice(0, 80);
  if (!range) return json({ ok: false, error: "bad_range" }, 400);
  const res = await fetch(SHEET_BASE + "/" + env.SHEET_ID + "/values/" + encodeURIComponent(range), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) return json({ ok: false, error: "sheets_read_failed" }, 502);
  const data = await res.json();
  return json({ ok: true, values: data.values || [] });
}

async function runAiBatch(ai, template, skill, level, count) {
  const prompt = buildPrompt(template, skill, level, count);
  const out = await ai.run(AI_MODEL, {
    messages: [
      { role: "system", content: "You output valid JSON arrays only." },
      { role: "user", content: prompt }
    ],
    max_tokens: 6000
  });
  const text = typeof out === "string" ? out : (out?.response || JSON.stringify(out));
  const arr = extractArray(String(text));
  if (!arr) return { ok: false, error: "ai_bad_shape" };
  const clean = arr.filter(validQuestion).slice(0, count);
  if (!clean.length) return { ok: false, error: "ai_empty" };
  return { ok: true, questions: clean };
}

function questionToRow(q, week) {
  return [q.id || "", q.skill || "", q.level || 1, q.type || "mcq", q.prompt_en || "", q.prompt_ml || "", JSON.stringify(q.options || []), q.answer || "", q.hint_en || "", q.hint_ml || "", q.explanation_en || "", q.explanation_ml || "", "draft", week || ""];
}

async function readTemplateFromSheet(token, sheetId, skill) {
  const res = await fetch(SHEET_BASE + "/" + sheetId + "/values/" + encodeURIComponent("Templates!A:D"), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) return null;
  const data = await res.json();
  for (const row of data.values || []) {
    if (String(row[0] || "").toLowerCase() === String(skill).toLowerCase()) {
      try {
        return { rules: row[1] || "", sample: JSON.parse(row[2] || "null") };
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function appendReviewQueue(token, sheetId, skill, questions, week) {
  const rows = questions.map((q) => [...questionToRow(q, week), ""]);
  const res = await appendValues(token, sheetId, "Review_Queue!A:O", rows);
  return res.ok;
}

async function backupJsonToDrive(token, name, payload) {
  const meta = { name, parents: ["appDataFolder"], mimeType: "application/json" };
  const boundary = "sai" + Date.now();
  const body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
    + JSON.stringify(meta) + "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n"
    + JSON.stringify(payload).slice(0, 4000000) + "\r\n--" + boundary + "--";
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "content-type": "multipart/related; boundary=" + boundary },
    body
  });
  return res.ok;
}

function weekTag(date) {
  const d = date || new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  return d.getFullYear() + "-W" + Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

async function handleGenerate(request, env) {
  if (!env.AI) return json({ ok: false, error: "no_ai_binding" }, 500);
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const template = body.template || null;
  const skill = String(body.skill || "");
  const level = Math.min(3, Math.max(1, Number(body.level || 1)));
  const count = Math.min(100, Math.max(1, Number(body.count || 20)));
  const dryRun = body.dryRun !== false;
  if (!SKILLS.includes(skill)) return json({ ok: false, error: "bad_skill" }, 400);
  let active = template;
  const callerToken = needToken(request);
  if ((!active || !active.sample) && callerToken && env.SHEET_ID) {
    active = await readTemplateFromSheet(callerToken, env.SHEET_ID, skill);
  }
  if (!active || !active.sample) return json({ ok: false, error: "missing_template" }, 400);
  const result = await runAiBatch(env.AI, active, skill, level, count);
  if (!result.ok) return json(result, 502);
  let queued = 0;
  if (!dryRun && callerToken && env.SHEET_ID) {
    const ok = await appendReviewQueue(callerToken, env.SHEET_ID, skill, result.questions, weekTag());
    if (ok) queued = result.questions.length;
  }
  return json({ ok: true, skill, level, count: result.questions.length, queued, dryRun, questions: dryRun ? result.questions : [] });
}

async function handleReviewApprove(request, env) {
  const token = needToken(request);
  if (!token) return json({ ok: false, error: "missing_token" }, 401);
  if (!env.SHEET_ID) return json({ ok: false, error: "no_sheet_configured" }, 500);
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const q = body.question || null;
  if (!q || !validQuestion(q)) return json({ ok: false, error: "bad_question" }, 400);
  const row = questionToRow(q, weekTag());
  row[12] = "approved";
  row[14] = String(body.approvedBy || "");
  const res = await appendValues(token, env.SHEET_ID, "Questions!A:O", [row]);
  if (!res.ok) return json({ ok: false, error: "approve_failed" }, 502);
  return json({ ok: true, qid: q.id });
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function proxyPiston(code) {
  const rt = withTimeout(8000);
  try {
    const listRes = await fetch("https://emkc.org/api/v2/piston/runtimes", { signal: rt.signal });
    if (!listRes.ok) throw new Error("piston_runtimes");
    const list = await listRes.json();
    const vers = (list || []).filter((r) => r.language === "python").map((r) => r.version).sort().reverse();
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "python", version: vers[0] || "3.10.0", files: [{ content: code }] }),
      signal: rt.signal
    });
    if (!res.ok) throw new Error("piston_execute");
    const j = await res.json();
    return { ok: (j.run?.code ?? 1) === 0, out: [j.run?.stdout || "", j.run?.stderr || ""].join("\n").trim() };
  } finally {
    rt.done();
  }
}

async function proxyWandbox(code) {
  const wt = withTimeout(12000);
  try {
    const listRes = await fetch("https://wandbox.org/api/list.json", { signal: wt.signal });
    if (!listRes.ok) throw new Error("wandbox_list");
    const list = await listRes.json();
    const compilers = (list || []).filter((c) => /^cpython/i.test(c.name)).map((c) => c.name).sort().reverse();
    if (!compilers.length) throw new Error("wandbox_no_python");
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ compiler: compilers[0], code }),
      signal: wt.signal
    });
    if (!res.ok) throw new Error("wandbox_compile");
    const j = await res.json();
    return { ok: String(j.status || "1") === "0", out: [j.program_output || "", j.program_error || "", j.compiler_error || ""].join("\n").trim() };
  } finally {
    wt.done();
  }
}

async function handleCodeRun(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const code = String(body.code || "").slice(0, 8000);
  if (!code.trim()) return json({ ok: false, error: "empty_code" }, 400);
  if (String(body.language || "python") !== "python") return json({ ok: false, error: "python_only" }, 400);
  try {
    return json({ ...(await proxyPiston(code)), via: "piston" });
  } catch {
    try {
      return json({ ...(await proxyWandbox(code)), via: "wandbox" });
    } catch (e) {
      return json({ ok: false, error: "runners_down", detail: String(e?.message || e) }, 502);
    }
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "authorization,content-type"
        }
      });
    }
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, sheets: Boolean(env.SHEET_ID), ai: Boolean(env.AI) });
    }
    if (request.method === "POST" && url.pathname === "/api/sheets/append") {
      return handleSheetsAppend(request, env);
    }
    if (request.method === "GET" && url.pathname === "/api/sheets/read") {
      return handleSheetsRead(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/questions/generate") {
      return handleGenerate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/review/approve") {
      return handleReviewApprove(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/code/run") {
      return handleCodeRun(request);
    }
    return json({ ok: false, error: "not_found" }, 404);
  },
  async scheduled(event, env, ctx) {
    if (!env.AI || !env.SHEET_ID) return;
    ctx.waitUntil((async () => {
      const schoolToken = env.SCHOOL_TOKEN || "";
      const week = weekTag();
      const level = (Number(week.slice(-1)) % 3) + 1;
      let made = 0;
      for (const skill of SKILLS) {
        const template = schoolToken ? await readTemplateFromSheet(schoolToken, env.SHEET_ID, skill).catch(() => null) : null;
        if (!template?.sample) continue;
        const result = await runAiBatch(env.AI, template, skill, level, 100).catch(() => null);
        if (!result?.ok) continue;
        made += result.questions.length;
        if (schoolToken) {
          await appendReviewQueue(schoolToken, env.SHEET_ID, skill, result.questions, week).catch(() => false);
          await backupJsonToDrive(schoolToken, "sai-weekly-" + week + "-" + skill + ".json", result.questions).catch(() => false);
        }
      }
      console.log("sai-weekly " + week + " level " + level + " made " + made);
    })());
  }
};
