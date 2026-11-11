export function validScore(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

export function scoreAttempt({ correct, hintUsed, attempt }) {
  if (typeof correct !== "boolean") return null;
  const n = Math.max(1, Math.floor(Number(attempt) || 1));
  if (!correct) return n === 1 ? 20 : 10;
  if (n >= 3) return 50;
  if (n === 2) return hintUsed ? 60 : 70;
  return hintUsed ? 75 : 100;
}

export function buildRecord({ challenge, given, correct, score, hintUsed, msTaken, attempt }) {
  return {
    given: String(given ?? ""),
    correct: Boolean(correct),
    score: validScore(score) ? score : null,
    skill: challenge?.skill || "",
    level: challenge?.level || 0,
    hintUsed: Boolean(hintUsed),
    msTaken: Math.max(0, Math.floor(Number(msTaken) || 0)),
    attempts: Math.max(1, Math.floor(Number(attempt) || 1)),
    at: new Date().toISOString()
  };
}
