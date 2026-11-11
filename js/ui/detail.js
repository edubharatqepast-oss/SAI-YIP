import { getState } from "../store.js";
import { t } from "../i18n.js";
import { isCorrect, adaptSkill, localize } from "../adaptation.js";
import { scoreAttempt, buildRecord } from "../scoring.js";
import { feedbackFor } from "../feedback.js";
import { detectWeakSpots } from "../weakness.js";
import { track } from "../analytics.js";
import { announce } from "../a11y.js";

export function renderDetail(root) {
  const s = getState();
  root.innerHTML = "";
  const c = s.challenges.find((x) => x.id === s.currentId) || s.challenges[0];
  if (!c) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = t("empty", s.lang);
    root.append(d);
    return;
  }
  const loc = localize(c, s.lang);
  const card = document.createElement("div");
  card.className = "card";
  const top = document.createElement("div");
  top.className = "row";
  const badge = document.createElement("span");
  badge.className = "badge l" + c.level;
  badge.textContent = c.id + " • L" + c.level + " • " + c.skill;
  const prog = document.createElement("span");
  prog.className = "muted";
  const idx = s.challenges.findIndex((x) => x.id === c.id) + 1;
  prog.textContent = idx + "/" + s.challenges.length;
  top.append(badge, prog);
  const q = document.createElement("h3");
  q.tabIndex = 0;
  q.textContent = loc.prompt;
  card.append(top, q);
  let given = "";
  if (c.type === "mcq" && c.options?.length) {
    const opts = document.createElement("div");
    opts.className = "options";
    opts.setAttribute("role", "radiogroup");
    for (const o of c.options) {
      const b = document.createElement("button");
      b.className = "option";
      b.setAttribute("role", "radio");
      b.textContent = o;
      b.onclick = () => {
        given = o;
        for (const x of opts.children) {
          x.classList.remove("selected");
          x.setAttribute("aria-checked", "false");
        }
        b.classList.add("selected");
        b.setAttribute("aria-checked", "true");
      };
      opts.append(b);
    }
    card.append(opts);
  } else {
    const inp = document.createElement("input");
    inp.placeholder = s.lang === "ml" ? "ഉത്തരം എഴുതൂ…" : "Type answer…";
    inp.setAttribute("aria-label", "answer");
    inp.autocomplete = "off";
    inp.oninput = () => { given = inp.value; };
    card.append(inp);
  }
  const startedAt = Date.now();
  let hintUsed = false;
  const hintBox = document.createElement("div");
  hintBox.className = "hint";
  hintBox.style.display = "none";
  hintBox.setAttribute("role", "note");
  const hintBtn = document.createElement("button");
  hintBtn.className = "secondary";
  hintBtn.textContent = t("show_hint", s.lang);
  hintBtn.onclick = () => {
    const skill = s.skills[c.skill];
    const lang = skill?.hint || s.lang;
    hintBox.textContent = lang === "ml" ? c.hint_ml : c.hint_en;
    hintBox.style.display = "block";
    hintUsed = true;
    track("hint", { id: c.id, lang });
  };
  const out = document.createElement("div");
  out.style.marginTop = "12px";
  out.setAttribute("aria-live", "polite");
  const actions = document.createElement("div");
  actions.className = "detail-actions";
  const submit = document.createElement("button");
  submit.textContent = t("submit", s.lang);
  submit.onclick = () => {
    if (!String(given).trim()) {
      out.className = "result-bad";
      out.textContent = s.lang === "ml" ? "❌ ആദ്യം ഉത്തരം തിരഞ്ഞെടുക്കൂ" : "❌ Pick an answer first";
      return;
    }
    const correct = isCorrect(c, given);
    const prevRecord = s.answers[c.id] || {};
    const attempt = (prevRecord.attempts || 0) + 1;
    const usedHint = hintUsed || prevRecord.hintUsed || false;
    const score = scoreAttempt({ correct, hintUsed: usedHint, attempt });
    const prev = s.skills[c.skill];
    const adapted = adaptSkill(prev, score);
    s.skills[c.skill] = adapted;
    s.answers[c.id] = buildRecord({ challenge: c, given, correct, score, hintUsed: usedHint, msTaken: Date.now() - startedAt, attempt });
    track("submit", { id: c.id, correct, score, attempt });
    const fb = feedbackFor({ correct, score, decision: adapted.decision, challenge: c, lang: s.lang });
    out.className = fb.correct ? "result-ok" : "result-bad";
    out.textContent = fb.headline + " " + fb.explanation + " | " + fb.levelLine;
    const spots = detectWeakSpots(s.skills, s.answers).filter((w) => w.skill === c.skill);
    if (spots.length && !correct) {
      const weak = spots[0];
      if (s.skills[c.skill].hint !== "ml") s.skills[c.skill].hint = "ml";
      const nudge = document.createElement("div");
      nudge.className = "hint";
      nudge.style.marginTop = "8px";
      nudge.textContent = (s.lang === "ml" ? "👀 ഇവിടെ ശ്രദ്ധ വേണം (" : "👀 Needs attention (") + weak.pattern + "). " + (s.lang === "ml" ? "മലയാളം സൂചന ON. പാഠങ്ങൾ വീണ്ടും നോക്കൂ 👇" : "Malayalam hint ON. Revisit the lessons 👇");
      const goLessons = document.createElement("button");
      goLessons.className = "secondary";
      goLessons.textContent = s.lang === "ml" ? "പാഠങ്ങൾ →" : "Lessons →";
      goLessons.onclick = () => window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "lessons" }));
      nudge.append(goLessons);
      out.append(nudge);
    }
    announce(out.textContent);
    submit.disabled = true;
    setTimeout(() => { submit.disabled = false; }, 800);
  };
  const next = document.createElement("button");
  next.className = "secondary";
  next.textContent = t("next", s.lang);
  next.onclick = () => {
    const i = s.challenges.findIndex((x) => x.id === c.id);
    const n = s.challenges[(i + 1) % s.challenges.length];
    s.currentId = n.id;
    renderDetail(root);
    q.focus?.();
  };
  const retryBtn = document.createElement("button");
  retryBtn.className = "secondary";
  retryBtn.textContent = t("retry", s.lang);
  retryBtn.onclick = () => renderDetail(root);
  actions.append(submit, hintBtn, retryBtn, next);
  card.append(actions, out);
  root.append(card);
}
