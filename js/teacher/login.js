import { getState, setState } from "../store.js";
import { validTeacher, loginTeacher, saveLocal } from "../auth.js";

export function renderTeacherLogin(root, done) {
  const s = getState();
  root.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card login-card silver lift";
  const h = document.createElement("h2");
  h.textContent = s.lang === "ml" ? "ടീച്ചർ ലോഗിൻ" : "Teacher login";
  const sub = document.createElement("p");
  sub.className = "muted";
  sub.textContent = s.lang === "ml"
    ? "സ്കൂൾ നൽകിയ ടീച്ചർ കോഡ് നൽകൂ (ഉദാ TCH-001)"
    : "Enter the school-issued teacher code (eg TCH-001)";
  const input = document.createElement("input");
  input.placeholder = "TCH-001";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "teacher code");
  const status = document.createElement("p");
  status.className = "muted";
  status.setAttribute("aria-live", "polite");
  const btn = document.createElement("button");
  btn.textContent = s.lang === "ml" ? "തുടരൂ" : "Continue";
  btn.onclick = () => {
    const res = loginTeacher(input.value);
    saveLocal();
    if (!res.ok) {
      status.className = "error";
      status.textContent = s.lang === "ml" ? "TCH-001 പോലെ സാധുവായ കോഡ് നൽകൂ" : "Enter a valid code like TCH-001";
      return;
    }
    done();
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") btn.click();
  };
  card.append(h, sub, input, status, btn);
  root.append(card);
}
