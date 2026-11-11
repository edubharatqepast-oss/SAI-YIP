export function pointsFor(correct, level) {
  return correct ? 10 + level * 2 : 2;
}

export function streakFor(history) {
  let s = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] > 60) s++;
    else break;
  }
  return s;
}

export function badgesFor(answers, skills) {
  const badges = [];
  const solved = Object.values(answers).filter((a) => a.correct).length;
  if (solved >= 1) badges.push("first-win");
  if (solved >= 5) badges.push("sharp-5");
  if (solved >= 10) badges.push("steady-10");
  if (solved >= 15) badges.push("sai-star");
  for (const [k, v] of Object.entries(skills)) {
    if (v.level >= 3) badges.push("level3-" + k.toLowerCase().replace(/\s+/g, "-"));
    if (streakFor(v.history) >= 3) badges.push("streak3-" + k.toLowerCase().replace(/\s+/g, "-"));
  }
  return [...new Set(badges)];
}

export function totalPoints(answers, challenges) {
  const byId = new Map(challenges.map((c) => [c.id, c.level]));
  let total = 0;
  for (const [id, a] of Object.entries(answers)) {
    total += pointsFor(a.correct, byId.get(id) || 1);
  }
  return total;
}
