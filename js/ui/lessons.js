import { getState, setState } from "../store.js";
import { t } from "../i18n.js";

const SKILLS = {
  Reasoning: { icon: "🧠", cls: "sk-reason", tag: "Think sharp" },
  Observation: { icon: "👁️", cls: "sk-observ", tag: "Look closer" },
  Logic: { icon: "🧩", cls: "sk-logic", tag: "Reason it out" },
  Coding: { icon: "💻", cls: "sk-coding", tag: "Talk to computers" },
  "Problem Solving": { icon: "🚀", cls: "sk-solve", tag: "Solve real life" }
};

let lessonsCache = null;

async function loadLessons() {
  if (lessonsCache) return lessonsCache;
  const res = await fetch("./data/lessons.json", { cache: "no-store" });
  if (!res.ok) throw new Error("lessons_fetch_failed");
  lessonsCache = await res.json();
  return lessonsCache;
}

function textOf(lesson, lang, base) {
  return lang === "ml" ? lesson[base + "_ml"] : lesson[base + "_en"];
}

export function renderLessons(root) {
  const s = getState();
  root.innerHTML = "";
  const head = document.createElement("div");
  head.className = "journey-head";
  const h = document.createElement("h2");
  h.textContent = s.lang === "ml" ? "പാഠങ്ങൾ" : "Lessons";
  const sub = document.createElement("p");
  sub.className = "muted";
  sub.textContent = s.lang === "ml"
    ? "ആദ്യം പഠിക്കൂ • പിന്നെ കളിക്കൂ • അവസാനം വെല്ലുവിളി"
    : "Learn first • Play next • Challenge last";
  head.append(h, sub);
  root.append(head);
  const loading = document.createElement("div");
  loading.className = "loader";
  loading.textContent = t("loading", s.lang);
  root.append(loading);
  loadLessons().then((lessons) => {
    if (!root.isConnected) return;
    loading.remove();
    paintRoad(root, lessons);
  }).catch(() => {
    loading.remove();
    const d = document.createElement("div");
    d.className = "error";
    d.textContent = t("empty", getState().lang);
    root.append(d);
  });
}

function paintRoad(root, lessons) {
  const s = getState();
  const order = ["Reasoning", "Observation", "Logic", "Coding", "Problem Solving"];
  let n = 0;
  for (const skill of order) {
    const items = lessons.filter((l) => l.skill === skill).sort((a, b) => a.level - b.level);
    if (!items.length) continue;
    const meta = SKILLS[skill] || { icon: "⭐", cls: "", tag: "" };
    const sec = document.createElement("section");
    sec.className = "leg " + meta.cls;
    const legHead = document.createElement("div");
    legHead.className = "leg-head";
    const ic = document.createElement("span");
    ic.className = "leg-icon";
    ic.textContent = meta.icon;
    const tt = document.createElement("div");
    const st = document.createElement("div");
    st.className = "leg-skill";
    st.textContent = skill;
    const tg = document.createElement("div");
    tg.className = "muted small";
    tg.textContent = meta.tag;
    tt.append(st, tg);
    legHead.append(ic, tt);
    const road = document.createElement("ol");
    road.className = "road";
    items.forEach((lesson) => {
      n += 1;
      const challenge = s.challenges.find((c) => c.id === lesson.challengeId);
      const done = challenge && s.answers[challenge.id]?.correct === true;
      const li = document.createElement("li");
      li.className = "stop" + (done ? " done" : "") + (n % 2 === 0 ? " right" : " left");
      const pin = document.createElement("div");
      pin.className = "pin";
      const num = document.createElement("span");
      num.className = "pin-num";
      num.textContent = String(n).padStart(2, "0");
      const dot = document.createElement("span");
      dot.className = "pin-dot";
      dot.textContent = done ? "✓" : "📖";
      pin.append(num, dot);
      const card = document.createElement("div");
      card.className = "stop-card lesson-card";
      const lvl = document.createElement("span");
      lvl.className = "badge l" + lesson.level;
      lvl.textContent = (s.lang === "ml" ? "പാഠം " : "Lesson ") + lesson.level;
      const nm = document.createElement("div");
      nm.className = "stop-name";
      nm.textContent = textOf(lesson, s.lang, "title");
      const vis = document.createElement("div");
      vis.className = "lesson-visual";
      vis.textContent = lesson.visual;
      const notes = document.createElement("ul");
      notes.className = "lesson-notes";
      const lines = s.lang === "ml" ? lesson.notes_ml : lesson.notes_en;
      for (const line of lines.slice(0, 3)) {
        const li2 = document.createElement("li");
        li2.textContent = line;
        notes.append(li2);
      }
      const ex = document.createElement("div");
      ex.className = "hint lesson-ex";
      ex.textContent = "💡 " + textOf(lesson, s.lang, "example");
      const tip = document.createElement("div");
      tip.className = "muted small";
      tip.textContent = "⭐ " + textOf(lesson, s.lang, "tip");
      const moral = document.createElement("div");
      moral.className = "hint lesson-moral";
      moral.textContent = "❤️ " + (s.lang === "ml" ? (lesson.moral_ml || "") : (lesson.moral_en || ""));
      const go = document.createElement("button");
      go.textContent = done ? "Done ✅" : (s.lang === "ml" ? "വെല്ലുവിളി കളിക്കൂ →" : "Play final challenge →");
      go.onclick = (e) => {
        e.stopPropagation();
        if (challenge) {
          setState({ currentId: challenge.id });
          window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "detail" }));
        }
      };
      card.append(lvl, nm, vis, notes, ex, tip, moral, go);
      card.onpointermove = (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "translateY(-3px) rotateX(" + (-y * 4) + "deg) rotateY(" + (x * 6) + "deg)";
      };
      card.onpointerleave = () => {
        card.style.transform = "";
      };
      li.append(pin, card);
      road.append(li);
    });
    const boss = items[items.length - 1];
    const bossChallenge = s.challenges.find((c) => c.id === boss.challengeId);
    if (bossChallenge) {
      n += 1;
      const done = s.answers[bossChallenge.id]?.correct === true;
      const li = document.createElement("li");
      li.className = "stop boss" + (done ? " done" : "") + (n % 2 === 0 ? " right" : " left");
      const pin = document.createElement("div");
      pin.className = "pin boss-pin";
      const num = document.createElement("span");
      num.className = "pin-num";
      num.textContent = "★";
      const dot = document.createElement("span");
      dot.className = "pin-dot";
      dot.textContent = done ? "✓" : "🏆";
      pin.append(num, dot);
      const card = document.createElement("button");
      card.className = "stop-card boss-card";
      const nm = document.createElement("div");
      nm.className = "stop-name";
      nm.textContent = s.lang === "ml" ? "അവസാന വെല്ലുവിളി" : "Final challenge";
      const te = document.createElement("div");
      te.className = "muted small";
      te.textContent = skill + " • " + (done ? "Done ✅" : "Tap to play →");
      card.append(nm, te);
      card.onclick = () => {
        setState({ currentId: bossChallenge.id });
        window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "detail" }));
      };
      li.append(pin, card);
      road.append(li);
    }
    sec.append(legHead, road);
    root.append(sec);
  }
}
