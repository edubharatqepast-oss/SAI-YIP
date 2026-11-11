import { validScore } from "./scoring.js";

export function normalizeAnswer(v) {
  return String(v || "").trim().toLowerCase();
}

export function isCorrect(challenge, given) {
  return normalizeAnswer(challenge.answer) === normalizeAnswer(given);
}

export function bandOf(score) {
  if (!validScore(score)) return "hold";
  if (score < 40) return "easier";
  if (score <= 80) return "targeted";
  return "harder";
}

export function adaptSkill(skillState, score) {
  const base = {
    level: skillState.level,
    score: skillState.score,
    tries: skillState.tries,
    hint: skillState.hint,
    history: [...(skillState.history || [])]
  };
  if (!validScore(score)) {
    return { ...base, decision: { action: "hold", level: base.level, hintLang: base.hint, reason: "invalid-score" } };
  }
  const history = [...base.history, score].slice(-3);
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  const band = bandOf(avg);
  const next = { ...base, history };
  if (band === "easier") {
    next.level = history.length >= 3 ? 1 : Math.max(1, base.level - 1);
    next.hint = "ml";
    next.tries = 0;
    return { ...next, decision: { action: "easier", level: next.level, hintLang: "ml", reason: history.length >= 3 ? "avg-below-40" : "single-below-40" } };
  }
  if (band === "harder") {
    next.level = Math.min(10, base.level + 1);
    next.hint = "en";
    next.tries = 0;
    next.bonus = true;
    return { ...next, decision: { action: "harder", level: next.level, hintLang: "en", reason: "avg-above-80" } };
  }
  next.tries = (base.tries || 0) + 1;
  if (next.tries >= 3) next.tries = 0;
  return { ...next, decision: { action: "targeted", level: next.level, hintLang: next.hint, reason: "avg-40-to-80" } };
}

export function localize(challenge, lang) {
  return {
    prompt: lang === "ml" ? challenge.prompt_ml : challenge.prompt_en,
    hint: lang === "ml" ? challenge.hint_ml : challenge.hint_en,
    explanation: lang === "ml" ? challenge.explanation_ml : challenge.explanation_en
  };
}
