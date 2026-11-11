import { getState } from "../store.js";
import { sheetsReadViaApi, apiConfigured } from "../backend.js";

function localChild(kvadId) {
  try {
    const raw = localStorage.getItem("sai_backup_" + kvadId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toSkills(payload) {
  const base = {};
  for (const k of ["Reasoning", "Observation", "Logic", "Coding", "Problem Solving"]) {
    base[k] = { level: 1, score: 0, tries: 0, hint: "en", history: [] };
  }
  if (!payload?.skills) return base;
  for (const k of Object.keys(base)) {
    if (payload.skills[k]) base[k] = { ...base[k], ...payload.skills[k] };
  }
  return base;
}

export async function fetchChildProgress(kvadId) {
  const id = String(kvadId || "").trim().toUpperCase();
  if (!/^KVAD-\d{3}$/.test(id)) return { ok: false, error: "bad_id" };
  if (apiConfigured()) {
    try {
      const [skillsRes, progRes] = await Promise.all([
        sheetsReadViaApi("Skills_" + id + "!A:F"),
        sheetsReadViaApi("Progress_" + id + "!A:E")
      ]);
        const skills = toSkills({ skills: parseSkillsCells(skillsRes.values) });
        const answers = parseProgressCells(progRes.values);
        return { ok: true, kvadId: id, skills, answers, source: "sheet" };
    } catch {
      // fall through to local
    }
  }
  const saved = localChild(id);
  if (!saved) return { ok: false, error: "not_found" };
  return { ok: true, kvadId: id, skills: toSkills(saved), answers: saved.answers || {}, source: "local" };
}

function parseSkillsCells(values) {
  const out = {};
  for (const row of values || []) {
    if (row.length < 2) continue;
    try {
      const skills = JSON.parse(row[1]);
      for (const k of Object.keys(skills)) out[k] = skills[k];
    } catch {
      continue;
    }
  }
  return out;
}

function parseProgressCells(values) {
  const out = {};
  for (const row of values || []) {
    if (row.length < 2) continue;
    try {
      const answers = JSON.parse(row[1]);
      Object.assign(out, answers);
    } catch {
      continue;
    }
  }
  return out;
}

export async function detectWeakForReport(skills, answers) {
  try {
    const m = await import("../weakness.js");
    return m.detectWeakSpots(skills, answers);
  } catch {
    return [];
  }
}
