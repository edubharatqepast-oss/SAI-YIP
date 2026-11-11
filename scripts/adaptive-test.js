import { validScore, scoreAttempt, buildRecord } from "../js/scoring.js";
import { bandOf, adaptSkill } from "../js/adaptation.js";
import { feedbackFor } from "../js/feedback.js";

let pass = 0;
let fail = 0;
const rows = [];

function check(name, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (ok) pass++;
  else fail++;
  rows.push({ name, expected, actual, ok });
}

function skill(level) {
  return { level, score: 0, tries: 0, hint: "en", history: [] };
}

const c = {
  id: "R1", skill: "Reasoning", level: 1,
  prompt_en: "Q?", prompt_ml: "Q?",
  hint_en: "Think groups.", hint_ml: "വിഭാഗം ചിന്തിക്കൂ.",
  explanation_en: "Carrot is a vegetable.", explanation_ml: "കാരറ്റ് പച്ചക്കറിയാണ്."
};

check("20 selects easier", "easier", adaptSkill(skill(3), 20).decision.action);
check("60 selects targeted", "targeted", adaptSkill(skill(3), 60).decision.action);
check("90 selects harder", "harder", adaptSkill(skill(3), 90).decision.action);
check("boundary 40 is targeted", "targeted", adaptSkill(skill(3), 40).decision.action);
check("boundary 80 is targeted", "targeted", adaptSkill(skill(3), 80).decision.action);
check("band 39.9 easier", "easier", bandOf(39.9));
check("band 80.1 harder", "harder", bandOf(80.1));

const ml = adaptSkill(skill(3), 20);
check("easier suggests Malayalam hint", "ml", ml.decision.hintLang);
check("Malayalam hint text used", c.hint_ml, feedbackFor({ correct: false, score: 20, decision: ml.decision, challenge: c, lang: "ml" }).hintText);
check("explanation localized", c.explanation_ml, feedbackFor({ correct: false, score: 20, decision: ml.decision, challenge: c, lang: "ml" }).explanation);

for (const bad of [null, undefined, NaN, "x", -5, 120, Infinity]) {
  const before = skill(4);
  const after = adaptSkill(before, bad);
  check("invalid holds steady (" + String(bad) + ")", { level: 4, hint: "en", history: [], action: "hold" }, { level: after.level, hint: after.hint, history: after.history, action: after.decision.action });
}

const single = adaptSkill({ level: 5, score: 0, tries: 0, hint: "en", history: [] }, 20);
check("single 20 steps down, not drop to 1", 4, single.level);
const proven = adaptSkill({ level: 5, score: 0, tries: 0, hint: "en", history: [20, 25] }, 20);
check("avg of 3 below 40 rebuilds to L1", 1, proven.level);
check("validScore rejects NaN", false, validScore(NaN));

check("score clean first try", 100, scoreAttempt({ correct: true, hintUsed: false, attempt: 1 }));
check("score hint first try", 75, scoreAttempt({ correct: true, hintUsed: true, attempt: 1 }));
check("score second try", 70, scoreAttempt({ correct: true, hintUsed: false, attempt: 2 }));
check("score second try hinted", 60, scoreAttempt({ correct: true, hintUsed: true, attempt: 2 }));
check("score third try", 50, scoreAttempt({ correct: true, hintUsed: false, attempt: 3 }));
check("score wrong", 20, scoreAttempt({ correct: false, hintUsed: false, attempt: 1 }));
check("score missing answer", null, scoreAttempt({ correct: undefined, hintUsed: false, attempt: 1 }));

const rec = buildRecord({ challenge: c, given: "Carrot", correct: true, score: 100, hintUsed: false, msTaken: 4200, attempt: 1 });
check("record matches submission", { given: "Carrot", correct: true, score: 100, skill: "Reasoning", level: 1, hintUsed: false, msTaken: 4200, attempts: 1 }, { given: rec.given, correct: rec.correct, score: rec.score, skill: rec.skill, level: rec.level, hintUsed: rec.hintUsed, msTaken: rec.msTaken, attempts: rec.attempts });

console.log("name | expected | actual | result");
for (const r of rows) {
  console.log((r.ok ? "PASS" : "FAIL") + " | " + r.name + " | " + JSON.stringify(r.expected) + " | " + JSON.stringify(r.actual));
}
console.log(pass + " passed, " + fail + " failed");
if (fail) process.exit(1);
