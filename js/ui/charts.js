export const SKILL_COLORS = {
  Reasoning: "#1d4ed8",
  Observation: "#7c3aed",
  Logic: "#b45309",
  Coding: "#047857",
  "Problem Solving": "#be123c"
};

export function donut(solved, total) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 140 140");
  svg.setAttribute("class", "donut");
  svg.setAttribute("role", "img");
  const pct = total ? Math.round((solved / total) * 100) : 0;
  svg.setAttribute("aria-label", solved + " of " + total + " solved, " + pct + " percent");
  const bg = document.createElementNS(svgNS, "circle");
  bg.setAttribute("cx", "70");
  bg.setAttribute("cy", "70");
  bg.setAttribute("r", "54");
  bg.setAttribute("class", "donut-bg");
  const fg = document.createElementNS(svgNS, "circle");
  fg.setAttribute("cx", "70");
  fg.setAttribute("cy", "70");
  fg.setAttribute("r", "54");
  fg.setAttribute("class", "donut-fg");
  const C = 2 * Math.PI * 54;
  fg.style.strokeDasharray = C + "";
  fg.style.strokeDashoffset = C + "";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fg.style.strokeDashoffset = C * (1 - solved / Math.max(1, total)) + "";
    });
  });
  const tx = document.createElementNS(svgNS, "text");
  tx.setAttribute("x", "70");
  tx.setAttribute("y", "66");
  tx.setAttribute("text-anchor", "middle");
  tx.setAttribute("class", "donut-num");
  tx.textContent = pct + "%";
  const tx2 = document.createElementNS(svgNS, "text");
  tx2.setAttribute("x", "70");
  tx2.setAttribute("y", "86");
  tx2.setAttribute("text-anchor", "middle");
  tx2.setAttribute("class", "donut-sub");
  tx2.textContent = solved + "/" + total;
  svg.append(bg, fg, tx, tx2);
  return svg;
}

export function skillBarRow(name, sk, streakLabel) {
  const row = document.createElement("div");
  row.className = "bar-row";
  const label = document.createElement("div");
  label.className = "bar-label";
  const nm = document.createElement("span");
  nm.className = "bar-name";
  nm.textContent = name;
  const lv = document.createElement("span");
  lv.className = "badge l" + Math.min(3, sk.level);
  lv.textContent = "L" + sk.level;
  label.append(nm, lv);
  const track = document.createElement("div");
  track.className = "bar-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuenow", String(sk.score));
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "100");
  track.setAttribute("aria-label", name);
  const fill = document.createElement("div");
  fill.className = "bar-fill";
  fill.style.background = SKILL_COLORS[name] || "var(--sai-brand)";
  fill.style.width = "0%";
  const pct = document.createElement("span");
  pct.className = "bar-pct";
  pct.textContent = sk.score + "%";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.width = Math.max(0, Math.min(100, sk.score)) + "%";
    });
  });
  track.append(fill);
  const meta = document.createElement("div");
  meta.className = "muted small";
  meta.textContent = streakLabel;
  row.append(label, track, pct, meta);
  return row;
}
