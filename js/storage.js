import { getState } from "./store.js";
import { env } from "./config.js";
import { getAuthToken } from "./auth.js";

async function apiRequest(path, method = "GET", body = null) {
  const token = getAuthToken();
  const headers = { "content-type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(`${env().apiUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return await res.json();
}

export async function storageGet(kvadId) {
  try {
    const challengesRes = await fetch("./data/challenges.json");
    const challenges = challengesRes.ok ? await challengesRes.json() : [];

    let saved = null;
    try {
      const progress = await apiRequest("/api/v1/progress");
      if (progress.ok) {
        saved = {
          skills: progress.progress.skills,
          answers: {},
        };
      }
    } catch {
      // API not available, use localStorage
    }

    const provider = "sheets";
    return { challenges, saved, provider };
  } catch (e) {
    console.error("storageGet error:", e);
    const raw = localStorage.getItem("sai_backup_" + (kvadId || "anon"));
    const saved = raw ? JSON.parse(raw) : null;
    const challenges = [];
    return { challenges, saved, provider: "local" };
  }
}

export async function storageSet(payload) {
  const answers = payload.answers || {};
  const skills = payload.skills || {};
  const points = payload.points || 0;

  try {
    for (const [challengeId, answer] of Object.entries(answers)) {
      try {
        await apiRequest("/api/v1/progress/challenges", "POST", {
          challengeId,
          skill: answer.skill || "Logic",
          level: answer.level || 1,
          answerGiven: answer.answer || "",
          correct: answer.correct ? 1 : 0,
          score: answer.score || 0,
        });
      } catch {
        // Individual answer failures are non-critical
      }
    }

    localStorage.setItem("sai_backup_" + (payload.kvadId || "anon"), JSON.stringify(payload));
  } catch (e) {
    console.error("storageSet error:", e);
    localStorage.setItem("sai_backup_" + (payload.kvadId || "anon"), JSON.stringify(payload));
  }
}
