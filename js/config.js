export const APP = {
  name: "SAI.YIP",
  tagline: "Think first. Answer second.",
  school: "KV Adoor",
  program: "YIP Kerala",
  version: "1.0.0",
  langs: ["en", "ml"],
  futureLangs: ["hi", "ta"],
  skills: ["Reasoning", "Observation", "Logic", "Coding", "Problem Solving"],
  budgets: { jsKB: 30, swKB: 2, backupKB: 100 },
  sync: { getMax: 10, setMax: 4, perUserQuotaPerMin: 60 },
  hosting: { provider: "Cloudflare Pages", domain: "sai-kvador.pages.dev" },
  db: { primary: "sheets", future: "d1" },
  runner: { piston: "https://emkc.org/api/v2/piston/execute", timeoutMs: 5000 }
};

export function env() {
  return {
    googleClientId: window.__SAI_ENV__?.GOOGLE_CLIENT_ID || "",
    sheetId: window.__SAI_ENV__?.SHEET_ID || "",
    d1Url: window.__SAI_ENV__?.D1_URL || "",
    apiUrl: window.__SAI_ENV__?.API_URL || "https://sai-yip-bckd.edubharatqepast.workers.dev"
  };
}
