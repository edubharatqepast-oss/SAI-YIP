export function track(event, data) {
  try {
    const key = "sai_metrics";
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ event, data: data || {}, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
  } catch {
    return;
  }
}

export function readMetrics() {
  try {
    return JSON.parse(localStorage.getItem("sai_metrics") || "[]");
  } catch {
    return [];
  }
}

export function impactSummary(answers, skills) {
  const solved = Object.values(answers).filter((a) => a.correct).length;
  const leveled = Object.values(skills).filter((s) => s.level >= 2).length;
  return { solved, leveled, skillsTracked: Object.keys(skills).length };
}
