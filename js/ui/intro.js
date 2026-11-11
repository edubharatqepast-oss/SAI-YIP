import { getState } from "../store.js";
import { t } from "../i18n.js";

const FEATURES = [
  {
    icon: "🎯",
    titleKey: "feature_adaptive",
    bodyKey: "feature_adaptive_body"
  },
  {
    icon: "🌐",
    titleKey: "feature_bilingual",
    bodyKey: "feature_bilingual_body"
  },
  {
    icon: "💻",
    titleKey: "feature_coding",
    bodyKey: "feature_coding_body"
  },
  {
    icon: "🧠",
    titleKey: "feature_games",
    bodyKey: "feature_games_body"
  },
  {
    icon: "📊",
    titleKey: "feature_progress",
    bodyKey: "feature_progress_body"
  },
  {
    icon: "♿",
    titleKey: "feature_accessible",
    bodyKey: "feature_accessible_body"
  }
];

export function renderIntro(root) {
  const s = getState();

  root.innerHTML = "";

  const section = document.createElement("section");
  section.className = "intro";

  section.appendChild(hero(s.lang));
  section.appendChild(features(s.lang));

  root.appendChild(section);
}

function hero(lang) {
  const hero = document.createElement("div");
  hero.className = "intro-hero";

  const brand = document.createElement("div");
  brand.className = "intro-brand";
  const img = document.createElement("img");
  img.src = "./mascot-sai.svg";
  img.alt = "SAI mascot";
  img.width = 64;
  img.height = 64;
  const name = document.createElement("div");
  name.className = "intro-name";
  name.textContent = "SAI.YIP";
  const sub = document.createElement("div");
  sub.className = "intro-sub";
  sub.textContent = t("hero_sub", lang);
  brand.append(img, name, sub);

  const h1 = document.createElement("h1");
  h1.className = "intro-title";
  h1.innerHTML = "Think first. <span class=\"grad\">" + t("answer_second", lang) + "</span>";

  const p = document.createElement("p");
  p.className = "intro-text";
  p.textContent = t("hero_text", lang);

  const actions = document.createElement("div");
  actions.className = "intro-actions";
  const btnLearn = document.createElement("button");
  btnLearn.textContent = t("start_learning", lang);
  btnLearn.onclick = () => window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "lessons" }));
  const btnGames = document.createElement("button");
  btnGames.className = "secondary";
  btnGames.textContent = t("play_iq_games", lang);
  btnGames.onclick = () => window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "games" }));
  actions.append(btnLearn, btnGames);

  hero.append(brand, h1, p, actions);
  return hero;
}

function features(lang) {
  const wrap = document.createElement("div");
  wrap.className = "intro-section";
  const head = document.createElement("div");
  head.className = "intro-head";
  const h2 = document.createElement("h2");
  h2.textContent = t("what_you_get", lang);
  const p = document.createElement("p");
  p.className = "intro-subtitle";
  p.textContent = t("everything_you_get", lang);
  head.append(h2, p);

  const grid = document.createElement("div");
  grid.className = "grid cols-3 intro-features";
  for (const f of FEATURES) {
    const card = document.createElement("div");
    card.className = "card lift intro-feature";
    const ic = document.createElement("div");
    ic.className = "intro-icon";
    ic.textContent = f.icon;
    const ttl = document.createElement("h3");
    ttl.textContent = t(f.titleKey, lang);
    const body = document.createElement("p");
    body.className = "muted small";
    body.textContent = t(f.bodyKey, lang);
    card.append(ic, ttl, body);
    grid.appendChild(card);
  }

  wrap.append(head, grid);
  return wrap;
}
