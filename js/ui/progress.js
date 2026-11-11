import { getState } from "../store.js";
import { t } from "../i18n.js";
import { totalPoints, badgesFor } from "../gamify.js";
import { donut, skillBarRow } from "./charts.js";
import { detectWeakSpots } from "../weakness.js";

export function renderProgress(root) {
  const s = getState();
  root.innerHTML = "";
  const points = totalPoints(s.answers, s.challenges);
  const badges = badgesFor(s.answers, s.skills);
  s.points = points;
  s.badges = badges;
  const solved = Object.values(s.answers).filter((a) => a.correct).length;
  const total = s.challenges.length || 15;
  const h = document.createElement("h2");
  h.textContent = t("progress", s.lang);
  const sum = document.createElement("div");
  sum.className = "card progress-top";
  const left = document.createElement("div");
  left.className = "donut-wrap";
  left.append(donut(solved, total));
  const right = document.createElement("div");
  right.className = "progress-meta";
  const line = document.createElement("div");
  line.className = "row";
  const p1 = document.createElement("span");
  p1.className = "badge";
  p1.textContent = points + " " + t("points", s.lang);
  const p2 = document.createElement("span");
  p2.className = "badge skill";
  p2.textContent = solved + "/" + total + " " + t("solved", s.lang);
  line.append(p1, p2);
  const bwrap = document.createElement("div");
  bwrap.className = "row";
  const blabel = document.createElement("span");
  blabel.className = "muted small";
  blabel.textContent = t("badges", s.lang) + ":";
  bwrap.append(blabel);
  if (!badges.length) {
    const none = document.createElement("span");
    none.className = "muted";
    none.textContent = "—";
    bwrap.append(none);
  }
  for (const b of badges.slice(0, 6)) {
    const el = document.createElement("span");
    el.className = "badge l1";
    el.textContent = "🏅 " + b;
    bwrap.append(el);
  }
  const how = document.createElement("p");
  how.className = "muted small";
  how.textContent = t("how_it_works", s.lang);
  right.append(line, bwrap, how);
  sum.append(left, right);
  const spots = detectWeakSpots(s.skills, s.answers);
  if (spots.length) {
    const weak = document.createElement("div");
    weak.className = "hint";
    weak.style.marginTop = "10px";
    weak.textContent = (s.lang === "ml" ? "👀 ശ്രദ്ധ വേണ്ടത്: " : "👀 Watch: ") + spots.slice(0, 3).map((w) => w.skill + " (" + w.pattern + ")").join(", ");
    root.append(h, sum, weak);
  } else {
    root.append(h, sum);
  }
  const barsHead = document.createElement("h3");
  barsHead.className = "bars-title";
  barsHead.textContent = s.lang === "ml" ? "സ്കിൽ ഗ്രാഫ്" : "Skills bar graph";
  const bars = document.createElement("div");
  bars.className = "bars";
  for (const name of Object.keys(s.skills)) {
    const sk = s.skills[name];
    bars.append(skillBarRow(name, sk, t("streak", s.lang) + ": " + sk.history.filter((x) => x > 60).length + " • hint: " + sk.hint));
  }
  root.append(barsHead, bars);
}
