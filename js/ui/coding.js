import { getState } from "../store.js";
import { runJS, runPython } from "../coding/runner.js";
import { track } from "../analytics.js";

function friendlyFix(lang, error) {
  const e = String(error || "");
  if (lang === "javascript" && /print is not defined/i.test(e)) {
    return "\n💡 Python code in JS mode — switch to python, or use console.log().";
  }
  if (/timeout/i.test(e)) return "\n💡 Infinite loop? The run was stopped safely.";
  if (/no_server|server_run|piston|wandbox|network|fetch|abort|failed/i.test(e)) return "\n💡 School net is blocking code runners. Switch to JavaScript (works offline) or ask your teacher.";
  return "";
}

export function renderCoding(root) {
  const s = getState();
  root.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";
  const h = document.createElement("h2");
  h.textContent = s.lang === "ml" ? "കോഡിംഗ് ലാബ് (ഫേസ് 5)" : "Coding Lab (Phase 5)";
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = s.lang === "ml"
    ? "JS ഫോണിൽ തന്നെ റൺ ചെയ്യും. Python ഫ്രീ റണ്ണേഴ്സ് + സ്കൂൾ സെർവർ വഴി."
    : "JS runs on the phone itself. Python via free runners + school server.";
  const row = document.createElement("div");
  row.className = "row";
  const samples = {
    javascript: 'console.log("Hello SAI");',
    python: 'print("Hello SAI")'
  };
  const sel = document.createElement("select");
  sel.setAttribute("aria-label", "language");
  for (const l of ["javascript", "python"]) {
    const o = document.createElement("option");
    o.value = l;
    o.textContent = l;
    sel.append(o);
  }
  const area = document.createElement("textarea");
  area.rows = 6;
  area.style.width = "100%";
  area.style.fontFamily = "ui-monospace,monospace";
  area.value = samples.javascript;
  area.setAttribute("aria-label", "code");
  sel.onchange = () => {
    area.value = samples[sel.value] || "";
    out.textContent = "output…";
    out.className = "hint";
  };
  const run = document.createElement("button");
  run.textContent = "Run ▶";
  const out = document.createElement("pre");
  out.className = "hint";
  out.textContent = "output…";
  run.onclick = async () => {
    run.disabled = true;
    out.textContent = "running…";
    const code = area.value;
    const res = sel.value === "python" ? await runPython(code) : await runJS(code);
    track("coding_run", { lang: sel.value, ok: res.ok });
    if (res.ok) {
      out.className = "result-ok";
      out.textContent = [res.out, res.r].filter((x) => String(x || "").trim() !== "").join("\n") || "done ✅";
    } else {
      out.className = "result-bad";
      out.textContent = "❌ " + (res.error || "failed") + (res.out ? "\n" + res.out : "") + friendlyFix(sel.value, res.error);
    }
    run.disabled = false;
  };
  const lazy = document.createElement("div");
  lazy.className = "muted small";
  lazy.style.marginTop = "10px";
  lazy.textContent = s.lang === "ml"
    ? "ഉടൻ വരുന്നു: ബ്ലോക്ക് കോഡിംഗ് • ഫുൾ എഡിറ്റർ"
    : "Coming soon: block coding • full editor";
  row.append(sel, run);
  card.append(h, p, area, row, out, lazy);
  root.append(card);
}
