import { getState, setState } from "./store.js";
import { storageGet, storageSet } from "./storage.js";

export async function batchGet10() {
  setState({ status: "loading", error: "" });
  try {
    const s = getState();
    const got = await storageGet(s.kvadId);
    if (got.saved?.skills) s.skills = { ...s.skills, ...got.saved.skills };
    if (got.saved?.answers) s.answers = got.saved.answers;
    setState({ challenges: got.challenges, status: "ready", provider: got.provider });
    return { ok: true, count: got.challenges.length, provider: got.provider };
  } catch (e) {
    setState({ status: "error", error: String(e?.message || e) });
    return { ok: false };
  }
}

export async function batchUpdate4() {
  const s = getState();
  const payload = {
    kvadId: s.kvadId,
    lang: s.lang,
    answers: s.answers,
    skills: s.skills,
    points: s.points,
    badges: s.badges,
    updatedAt: new Date().toISOString()
  };
  try {
    const res = await storageSet(payload);
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
