import { localize } from "./adaptation.js";

export function feedbackFor({ correct, score, decision, challenge, lang }) {
  const loc = localize(challenge, lang === "ml" ? "ml" : "en");
  const hintLang = decision?.hintLang || "en";
  const hintText = hintLang === "ml" ? challenge.hint_ml : challenge.hint_en;
  return {
    correct: Boolean(correct),
    score,
    action: decision?.action || "hold",
    headline: correct ? "✅" : "❌",
    explanation: loc.explanation,
    hintText,
    hintOffer: !correct,
    levelLine: challenge.skill + " L" + (decision?.level ?? challenge.level)
  };
}
