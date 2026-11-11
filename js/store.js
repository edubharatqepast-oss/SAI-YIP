const state = {
  kvadId: "",
  lang: "en",
  challenges: [],
  currentId: "",
  answers: {},
  points: 0,
  badges: [],
  role: "student",
  provider: "sheets",
  session: { provider: "none" },
  skills: {
    Reasoning: { level: 1, score: 0, tries: 0, hint: "en", history: [] },
    Observation: { level: 1, score: 0, tries: 0, hint: "en", history: [] },
    Logic: { level: 1, score: 0, tries: 0, hint: "en", history: [] },
    Coding: { level: 1, score: 0, tries: 0, hint: "en", history: [] },
    "Problem Solving": { level: 1, score: 0, tries: 0, hint: "en", history: [] }
  },
  status: "idle",
  error: "",
  quota: {
    minUsed: 0,
    date: "",
    limit: 40
  },
  sessionStart: null
};

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
}

export function resetProgress() {
  state.answers = {};
  state.points = 0;
  state.badges = [];
  for (const k of Object.keys(state.skills)) {
    state.skills[k] = { level: 1, score: 0, tries: 0, hint: "en", history: [] };
  }
}
