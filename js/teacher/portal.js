import { getState, setState } from "../store.js";
import { isTeacher } from "../auth.js";
import { parseLoginCode, hasCamera, loadJsQr, supportedFormats, openCamera, stopCamera, detectOnce } from "../scan.js";
import { fetchChildProgress, detectWeakForReport } from "./inspect.js";
import { donut, skillBarRow } from "../ui/charts.js";
import { renderTeacherLogin } from "./login.js";
import { track } from "../analytics.js";

let tab = "scan";
let report = null;
let fetching = false;

export function renderPortal(root) {
  const s = getState();
  if (!isTeacher()) {
    renderTeacherLogin(root, () => renderPortal(root));
    return;
  }
  root.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = "card";
  const who = document.createElement("div");
  who.className = "row";
  const t = document.createElement("span");
  t.className = "badge";
  t.textContent = (s.session?.teacherId || "Teacher") + (report ? " • 👁 " + report.kvadId : "");
  const out = document.createElement("button");
  out.className = "secondary";
  out.textContent = s.lang === "ml" ? "ലോഗൗട്ട്" : "Logout";
  out.onclick = () => {
    setState({ session: { provider: "none" }, role: "student", inspectedId: "" });
    localStorage.removeItem("sai_session");
    tab = "scan";
    report = null;
    window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "scan" }));
  };
  who.append(t, out);
  banner.append(who);
  const tabs = document.createElement("div");
  tabs.className = "row nav";
  tabs.setAttribute("role", "tablist");
  for (const [id, label] of [["scan", s.lang === "ml" ? "1 • സ്കാൻ" : "1 • Scan"], ["result", s.lang === "ml" ? "2 • റിസൾട്ട്" : "2 • Result"], ["history", s.lang === "ml" ? "3 • ഹിസ്റ്ററി" : "3 • History"], ["assign", s.lang === "ml" ? "4 • നൽകൂ" : "4 • Assign"]]) {
    const b = document.createElement("button");
    b.className = "secondary" + (tab === id ? " active" : "");
    b.textContent = label;
    b.setAttribute("role", "tab");
    if (tab === id) b.setAttribute("aria-selected", "true");
    b.onclick = () => {
      tab = id;
      renderPortal(root);
    };
    tabs.append(b);
  }
  root.append(banner, tabs);
  const body = document.createElement("div");
  body.style.marginTop = "12px";
  root.append(body);
  if (tab === "scan") renderScanTab(body);
  if (tab === "result") renderResultTab(body);
  if (tab === "history") renderHistoryTab(body);
  if (tab === "assign") renderAssignTab(body);
}

function renderScanTab(body) {
  const s = getState();
  const card = document.createElement("div");
  card.className = "card";
  const h = document.createElement("h3");
  h.textContent = s.lang === "ml" ? "കുട്ടിയുടെ QR സ്കാൻ ചെയ്യൂ" : "Scan the child's QR";
  const frame = document.createElement("div");
  frame.className = "scan-frame";
  const video = document.createElement("video");
  video.className = "scan-video";
  video.muted = true;
  const off = document.createElement("div");
  off.className = "scan-off";
  off.textContent = "📷";
  const corner = document.createElement("div");
  corner.className = "scan-corner";
  frame.append(video, off, corner);
  const status = document.createElement("p");
  status.className = "muted";
  status.setAttribute("aria-live", "polite");
  const row = document.createElement("div");
  row.className = "detail-actions";
  const start = document.createElement("button");
  start.textContent = s.lang === "ml" ? "📷 സ്കാൻ" : "📷 Scan";
  const stop = document.createElement("button");
  stop.className = "secondary";
  stop.textContent = s.lang === "ml" ? "നിർത്തൂ" : "Stop";
  stop.disabled = true;
  row.append(start, stop);
  const label = document.createElement("label");
  label.textContent = s.lang === "ml" ? "അല്ലെങ്കിൽ ID ടൈപ്പ് ചെയ്യൂ" : "Or type the ID";
  const input = document.createElement("input");
  input.placeholder = "KVAD-001";
  input.setAttribute("aria-label", "child id");
  const go = document.createElement("button");
  go.className = "secondary";
  go.textContent = s.lang === "ml" ? "കാണൂ →" : "Inspect →";
  card.append(h, frame, status, row, label, input, go);
  body.append(card);
  let stream = null;
  let timer = 0;
  function halt() {
    if (timer) clearInterval(timer);
    timer = 0;
    stopCamera(video, stream);
    stream = null;
    frame.classList.remove("live");
    start.disabled = false;
    stop.disabled = true;
  }
  async function inspect(id) {
    halt();
    if (fetching) return;
    fetching = true;
    status.className = "muted";
    status.textContent = s.lang === "ml" ? "കൊണ്ടുവരുന്നു…" : "Fetching…";
    const res = await fetchChildProgress(id);
    fetching = false;
    if (!res.ok) {
      status.className = "error";
      status.textContent = s.lang === "ml" ? "കുട്ടിയെ കണ്ടില്ല. ID പരിശോധിക്കൂ." : "Child not found. Check the ID.";
      return;
    }
    report = res;
    setState({ inspectedId: res.kvadId });
    track("teacher_inspect", { kvadId: res.kvadId });
    tab = "result";
    renderPortal(body.parentElement || body);
    const root = document.getElementById("page");
    if (root) renderPortal(root);
  }
  start.onclick = async () => {
    if (!hasCamera()) {
      status.className = "error";
      status.textContent = s.lang === "ml" ? "ക്യാമറ ഇല്ല. ID ടൈപ്പ് ചെയ്യൂ." : "No camera. Type the ID.";
      return;
    }
    start.disabled = true;
    stop.disabled = false;
    await loadJsQr();
    try {
      stream = await openCamera(video);
      frame.classList.add("live");
    } catch {
      status.className = "error";
      status.textContent = s.lang === "ml" ? "ക്യാമറ അനുമതി കിട്ടിയില്ല." : "Camera permission denied.";
      start.disabled = false;
      stop.disabled = true;
      return;
    }
    const formats = await supportedFormats();
    timer = setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const raw = await detectOnce(video, formats);
        if (!raw) return;
        const p = parseLoginCode(raw);
        if (p.ok) inspect(p.kvadId);
      } catch {
        return;
      }
    }, 500);
  };
  stop.onclick = halt;
  go.onclick = () => inspect(input.value);
  input.onkeydown = (e) => {
    if (e.key === "Enter") inspect(input.value);
  };
}

function bannerRefresh(parent, body) {
  const r = document.createElement("div");
  r.className = "row";
  const refresh = document.createElement("button");
  refresh.className = "secondary";
  refresh.textContent = getState().lang === "ml" ? "🔄 റിഫ്രഷ്" : "🔄 Refresh";
  refresh.onclick = async () => {
    if (!report) return;
    const res = await fetchChildProgress(report.kvadId);
    if (res.ok) {
      report = res;
      const root = document.getElementById("page");
      if (root) renderPortal(root);
    }
  };
  r.append(refresh);
  parent.append(r);
  parent.append(body);
}

function renderResultTab(body) {
  const s = getState();
  if (!report) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = s.lang === "ml" ? "ആദ്യം Tab 1-ൽ സ്കാൻ ചെയ്യൂ." : "Scan a child in Tab 1 first.";
    body.append(d);
    return;
  }
  const wrap = document.createElement("div");
  const h = document.createElement("h3");
  h.textContent = report.kvadId + (report.source === "sheet" ? " • sheet" : " • this device");
  wrap.append(h);
  const solved = Object.values(report.answers).filter((a) => a.correct).length;
  const total = 15;
  const top = document.createElement("div");
  top.className = "card progress-top";
  const left = document.createElement("div");
  left.className = "donut-wrap";
  left.append(donut(solved, total));
  const right = document.createElement("div");
  right.className = "progress-meta";
  const weakBox = document.createElement("div");
  weakBox.className = "muted small";
  weakBox.textContent = s.lang === "ml" ? "ദുർബലത പരിശോധിക്കുന്നു…" : "Checking weak spots…";
  right.append(weakBox);
  top.append(left, right);
  wrap.append(top);
  const bars = document.createElement("div");
  bars.className = "bars";
  body.append(wrap);
  detectWeakForReport(report.skills, report.answers).then((spots) => {
    if (!weakBox.isConnected) return;
    if (!spots.length) {
      weakBox.textContent = s.lang === "ml" ? "ദുർബലത ഇല്ല. മികച്ചത്! ✅" : "No weak spots. Great! ✅";
    } else {
      weakBox.innerHTML = "";
      const t = document.createElement("div");
      t.style.fontWeight = "800";
      t.textContent = (s.lang === "ml" ? "ശ്രദ്ധ വേണ്ടത്: " : "Needs attention: ") + spots.map((w) => w.skill + " (" + w.pattern + ")").join(", ");
      weakBox.append(t);
    }
    for (const name of Object.keys(report.skills)) {
      const sk = report.skills[name];
      const streak = "streak: " + (sk.history || []).filter((x) => x > 60).length + " • hint: " + sk.hint;
      bars.append(skillBarRow(name, sk, streak));
    }
    wrap.append(bars);
    bannerRefresh(body, document.createElement("div"));
  });
}

function renderHistoryTab(body) {
  const s = getState();
  if (!report) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = s.lang === "ml" ? "ആദ്യം Tab 1-ൽ സ്കാൻ ചെയ്യൂ." : "Scan a child in Tab 1 first.";
    body.append(d);
    return;
  }
  const entries = Object.entries(report.answers);
  if (!entries.length) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = s.lang === "ml" ? "ഉത്തരങ്ങളില്ല." : "No answers yet.";
    body.append(d);
    return;
  }
  for (const [qid, a] of entries.slice(-20).reverse()) {
    const card = document.createElement("div");
    card.className = a.correct ? "result-ok" : "result-bad";
    card.style.marginBottom = "8px";
    card.textContent = qid + " • " + (a.correct ? "✅" : "❌") + " • " + (a.given || "") + " • " + (a.score || 0) + "%";
    body.append(card);
  }
}

function renderAssignTab(body) {
  const s = getState();
  if (!report) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = s.lang === "ml" ? "ആദ്യം Tab 1-ൽ സ്കാൻ ചെയ്യൂ." : "Scan a child in Tab 1 first.";
    body.append(d);
    return;
  }
  detectWeakForReport(report.skills, report.answers).then((spots) => {
    if (!body.isConnected) return;
    if (!spots.length) {
      const d = document.createElement("div");
      d.className = "result-ok";
      d.textContent = s.lang === "ml" ? "എല്ലാം ശരി. പുതിയ പാഠങ്ങൾ നൽകൂ! ✅" : "All good. Assign new lessons! ✅";
      body.append(d);
      return;
    }
    for (const w of spots.slice(0, 3)) {
      const card = document.createElement("div");
      card.className = "card";
      const t = document.createElement("div");
      t.style.fontWeight = "800";
      t.textContent = "📌 " + w.skill + " • Level " + w.level + " • " + w.pattern;
      const p = document.createElement("p");
      p.className = "muted small";
      p.textContent = s.lang === "ml"
        ? "കുട്ടിയോട് ഈ സ്കില്ലിന്റെ പാഠം വീണ്ടും ചെയ്യാൻ പറയൂ + മലയാളം സൂചന ON."
        : "Ask the child to redo this skill's lessons with Malayalam hints ON.";
      const go = document.createElement("button");
      go.className = "secondary";
      go.textContent = s.lang === "ml" ? "പാഠങ്ങൾ തുറക്കൂ →" : "Open lessons →";
      go.onclick = () => window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "lessons" }));
      card.append(t, p, go);
      body.append(card);
    }
  });
}
