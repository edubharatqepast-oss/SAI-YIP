export function accuracyOf(history) {
  if (!history?.length) return null;
  return history.reduce((a, b) => a + b, 0) / history.length;
}

export function patternOf(skillState, answersForSkill) {
  const h = skillState.history || [];
  const recent = h.slice(-3);
  const guesses = recent.filter((x) => x <= 25).length;
  const hintRate = answersForSkill.length
    ? answersForSkill.filter((a) => a.hintUsed).length / answersForSkill.length
    : 0;
  const retries = skillState.tries || 0;
  if (recent.length === 3 && guesses === 3) return "guessing";
  if (hintRate > 0.6 && recent.length >= 2) return "hint-dependent";
  if (retries >= 2 && accuracyOf(recent) !== null && accuracyOf(recent) < 50) return "slow";
  if (recent.length >= 2 && accuracyOf(recent) < 40) return "struggling";
  return "";
}

export function detectWeakSpots(skills, answers) {
  const spots = [];
  const bySkill = {};
  for (const [qid, a] of Object.entries(answers || {})) {
    const skill = a.skill || "";
    if (!bySkill[skill]) bySkill[skill] = [];
    bySkill[skill].push(a);
  }
  for (const [skill, st] of Object.entries(skills || {})) {
    const pattern = patternOf(st, bySkill[skill] || []);
    if (!pattern) continue;
    const acc = accuracyOf(st.history || []);
    spots.push({
      skill,
      level: st.level,
      pattern,
      confidence: (st.history || []).length >= 3 ? "high" : "watching",
      accuracy: acc === null ? 0 : Math.round(acc)
    });
  }
  return spots.sort((a, b) => a.accuracy - b.accuracy);
}

export function remedialFor(spot, lessons) {
  const pool = (lessons || []).filter((l) => l.skill === spot.skill && l.level <= spot.level);
  return pool.slice(0, 2).map((l) => l.id);
}
