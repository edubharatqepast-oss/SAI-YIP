import { getState, setState } from "../store.js";
import { t } from "../i18n.js";
import { validKvad, saveLocal, lockSession, enforceLock, switchSession, isLocked, loginDemo, loginWithKvad, markSheetReady } from "../auth.js";
import { requestGoogleToken, fetchGoogleProfile, ensureUserRow, canUseGoogle } from "../google.js";
import { apiConfigured } from "../backend.js";
import { parseLoginCode, hasCamera, loadJsQr, supportedFormats, openCamera, stopCamera, detectOnce, decodeFileJsQr } from "../scan.js";
import { batchGet10 } from "../sheets.js";
import { track } from "../analytics.js";

export function renderScan(root) {
  const s = getState();
  root.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card login-card gold lift";
  const title = document.createElement("h2");
  title.textContent = s.lang === "ml" ? "സ്കാൻ ചെയ്ത് ലോഗിൻ" : "Scan to login";
  const sub = document.createElement("p");
  sub.className = "muted";
  sub.textContent = s.lang === "ml"
    ? "QR / ബാർകോഡ് കാണിക്കൂ, അല്ലെങ്കിൽ ഫോട്ടോ എടുത്ത് അപ്‌ലോഡ് ചെയ്യൂ"
    : "Show your QR / barcode, or snap a photo and upload it";
  const frame = document.createElement("div");
  frame.className = "scan-frame";
  const video = document.createElement("video");
  video.className = "scan-video";
  video.muted = true;
  const off = document.createElement("div");
  off.className = "scan-off";
  const offIcon = document.createElement("div");
  offIcon.className = "big";
  offIcon.textContent = "📷";
  const offText = document.createElement("div");
  offText.textContent = s.lang === "ml" ? "ക്യാമറ ഓഫ് — താഴെ ബട്ടൺ അമർത്തൂ" : "Camera off — tap a button below";
  off.append(offIcon, offText);
  const corner = document.createElement("div");
  corner.className = "scan-corner";
  frame.append(video, off, corner);
  const status = document.createElement("p");
  status.className = "muted";
  status.setAttribute("aria-live", "polite");
  const row = document.createElement("div");
  row.className = "scan-actions";
  const startBtn = document.createElement("button");
  startBtn.textContent = s.lang === "ml" ? "📷 ലൈവ് സ്കാൻ" : "📷 Live scan";
  const snapBtn = document.createElement("button");
  snapBtn.className = "secondary";
  snapBtn.textContent = s.lang === "ml" ? "📤 ഫോട്ടോ അപ്‌ലോഡ്" : "📤 Upload photo";
  const stopBtn = document.createElement("button");
  stopBtn.className = "secondary";
  stopBtn.textContent = s.lang === "ml" ? "നിർത്തൂ" : "Stop";
  stopBtn.disabled = true;
  row.append(startBtn, snapBtn, stopBtn);
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.setAttribute("capture", "environment");
  file.className = "sr-only";
  file.setAttribute("aria-label", "upload qr photo");
  const fallback = document.createElement("div");
  fallback.className = "scan-fallback";
  const label = document.createElement("label");
  label.setAttribute("for", "codeInput");
  label.textContent = s.lang === "ml" ? "അല്ലെങ്കിൽ കോഡ് ടൈപ്പ് ചെയ്യൂ" : "Or type the code";
  const input = document.createElement("input");
  input.id = "codeInput";
  input.placeholder = "KVAD-001";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "login code");
  input.inputMode = "text";
  const useBtn = document.createElement("button");
  useBtn.className = "secondary";
  useBtn.textContent = s.lang === "ml" ? "കോഡ് ഉപയോഗിക്കൂ" : "Use code";
  const demoBtn = document.createElement("button");
  demoBtn.className = "secondary";
  demoBtn.textContent = s.lang === "ml" ? "ഡെമോ ആയി പരീക്ഷിക്കൂ (QR വേണ്ട)" : "Try demo (no QR needed)";
  fallback.append(label, input, useBtn, demoBtn);
  const cloudBox = document.createElement("div");
  cloudBox.className = "scan-fallback";
  const cloudBtn = document.createElement("button");
  cloudBtn.className = "secondary";
  cloudBtn.textContent = s.lang === "ml" ? "☁️ Google ബന്ധിപ്പിക്കൂ (ക്ലൗഡ് സേവ്)" : "☁️ Link Google (cloud save)";
  const cloudNote = document.createElement("p");
  cloudNote.className = "muted small";
  const hasToken = Boolean(getState().session?.token);
  if (hasToken) {
    cloudNote.textContent = s.lang === "ml" ? "☁️ ക്ലൗഡ് സേവ് ON ✅" : "☁️ Cloud save ON ✅";
    cloudBtn.disabled = true;
  } else if (!canUseGoogle() && !apiConfigured()) {
    cloudNote.textContent = s.lang === "ml"
      ? "സ്കൂൾ Sheet ID ചേർത്താൽ ക്ലൗഡ് സേവ് ഓണാകും."
      : "Cloud save turns on once the school adds its Sheet ID.";
    cloudBtn.disabled = true;
  } else {
    cloudNote.textContent = s.lang === "ml"
      ? "ഒരിക്കൽ ബന്ധിപ്പിച്ചാൽ പുരോഗതി ഷീറ്റിൽ സേവ് ആകും."
      : "Link once — progress saves to the sheet after that.";
  }
  cloudBtn.onclick = async () => {
    cloudBtn.disabled = true;
    status.className = "muted";
    status.textContent = s.lang === "ml" ? "Google തുറക്കുന്നു…" : "Opening Google…";
    const tok = await requestGoogleToken();
    if (!tok.ok) {
      status.className = "error";
      status.textContent =
        tok.reason === "no-gsi"
          ? s.lang === "ml"
            ? "Google ഈ നെറ്റിൽ തടഞ്ഞിരിക്കുന്നു. JavaScript മോഡ് ഉപയോഗിക്കൂ."
            : "Google is blocked on this network. Demo still works fully."
          : s.lang === "ml"
            ? "റദ്ദാക്കി. വീണ്ടും ശ്രമിക്കൂ."
            : "Cancelled. Try again.";
      cloudBtn.disabled = false;
      return;
    }
    const profile = await fetchGoogleProfile(tok.token);
    const st = getState();
    st.session = { ...(st.session || {}), token: tok.token, sub: profile.sub || "", email: profile.email || "" };
    saveLocal();
    status.textContent = s.lang === "ml" ? "ഷീറ്റിൽ ചേർക്കുന്നു…" : "Adding you to the sheet…";
    const sheet = await ensureUserRow();
    if (sheet.ok) markSheetReady();
    status.className = sheet.ok ? "result-ok" : "muted";
    status.textContent = sheet.ok
      ? (s.lang === "ml" ? "☁️ ക്ലൗഡ് സേവ് ON ✅" : "☁️ Cloud save ON ✅")
      : (s.lang === "ml" ? "ഷീറ്റ് ഒഴിവാക്കി — സേവ് ചെയ്യുമ്പോൾ വീണ്ടും." : "Sheet skipped — will retry on Save.");
    cloudNote.textContent = status.textContent;
  };
  cloudBox.append(cloudBtn, cloudNote);
  const switchBox = document.createElement("div");
  switchBox.className = "hint";
  switchBox.style.display = "none";
  card.append(title, sub, frame, status, row, file, fallback, cloudBox, switchBox);
  root.append(card);
  let stream = null;
  let timer = 0;
  let busy = false;
  async function enterLessons(kvadId) {
    status.className = "muted";
    status.textContent = s.lang === "ml" ? "ഷീറ്റിൽ പരിശോധിക്കുന്നു…" : "Checking sheet…";
    stopLoop();
    track("scan_login", { kvadId });
    await batchGet10();
    window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "lessons" }));
  }
  function askSwitch(nextId) {
    const cur = getState().kvadId;
    switchBox.innerHTML = "";
    switchBox.style.display = "block";
    const msg = document.createElement("div");
    msg.textContent = (s.lang === "ml" ? "🔒 ഇപ്പോൾ " : "🔒 Now learning as ") + cur + (s.lang === "ml" ? ". മാറണോ " : ". Switch to ") + nextId + "?";
    const keep = document.createElement("button");
    keep.className = "secondary";
    keep.textContent = s.lang === "ml" ? "വേണ്ട, തുടരൂ" : "Keep mine";
    keep.onclick = () => {
      switchBox.style.display = "none";
      busy = false;
      enterLessons(cur);
    };
    const swap = document.createElement("button");
    swap.textContent = s.lang === "ml" ? "മാറൂ" : "Switch";
    swap.onclick = () => {
      switchBox.style.display = "none";
      switchSession(nextId, "scan");
      busy = false;
      enterLessons(nextId);
    };
    const row2 = document.createElement("div");
    row2.className = "detail-actions";
    row2.append(keep, swap);
    switchBox.append(msg, row2);
  }
  async function finishWithCode(raw) {
    if (busy) return;
    busy = true;
    const parsed = parseLoginCode(raw);
    if (!parsed.ok || !validKvad(parsed.kvadId)) {
      status.className = "error";
      status.textContent = t("login_error", s.lang);
      busy = false;
      return;
    }
    const gate = enforceLock(parsed.kvadId);
    if (!gate.ok && gate.locked) {
      status.className = "muted";
      status.textContent = "";
      askSwitch(gate.next);
      busy = false;
      return;
    }
    status.className = "muted";
    status.textContent = s.lang === "ml"
      ? "ലോഗിൻ ചെയ്യുന്നു…"
      : "Signing in…";
    const authed = await loginWithKvad(parsed.kvadId);
    if (authed.ok) {
      await enterLessons(parsed.kvadId);
      return;
    }
    lockSession(parsed.kvadId);
    localStorage.setItem("sai_token", "demo-local:" + parsed.kvadId);
    status.className = "muted";
    status.textContent = s.lang === "ml"
      ? "സർവർ ലഭ്യമില്ല — ഡെമോ മോഡ്."
      : "Server unavailable — demo mode.";
    await enterLessons(parsed.kvadId);
    busy = false;
  }
  function stopLoop() {
    if (timer) clearInterval(timer);
    timer = 0;
    stopCamera(video, stream);
    stream = null;
    frame.classList.remove("live");
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
  async function loop(formats) {
    if (video.readyState < 2) return;
    try {
      const raw = await detectOnce(video, formats);
      if (raw) await finishWithCode(raw);
    } catch {
      return;
    }
  }
  startBtn.onclick = async () => {
    if (!hasCamera()) {
      status.className = "error";
      status.textContent = s.lang === "ml"
        ? "ക്യാമറ കിട്ടിയില്ല. ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യൂ അല്ലെങ്കിൽ കോഡ് ടൈപ്പ് ചെയ്യൂ."
        : "No camera found. Upload a photo or type the code.";
      file.click();
      return;
    }
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.className = "muted";
    status.textContent = s.lang === "ml" ? "സ്കാനർ തയ്യാറാക്കുന്നു…" : "Preparing scanner…";
    await loadJsQr();
    try {
      stream = await openCamera(video);
      frame.classList.add("live");
    } catch {
      status.className = "error";
      status.textContent = s.lang === "ml"
        ? "ക്യാമറ അനുമതി കിട്ടിയില്ല. ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യൂ."
        : "Camera permission denied. Upload a photo instead.";
      startBtn.disabled = false;
      stopBtn.disabled = true;
      file.click();
      return;
    }
    status.textContent = s.lang === "ml" ? "കോഡ് ഫ്രെയിമിൽ പിടിക്കൂ…" : "Hold the code inside the frame…";
    const formats = await supportedFormats();
    timer = setInterval(() => { loop(formats); }, 500);
  };
  stopBtn.onclick = () => {
    stopLoop();
    status.className = "muted";
    status.textContent = "";
  };
  snapBtn.onclick = () => file.click();
  file.onchange = async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    status.className = "muted";
    status.textContent = s.lang === "ml" ? "ഫോട്ടോ വായിക്കുന്നു…" : "Reading photo…";
    const raw = await decodeFileJsQr(picked);
    file.value = "";
    if (!raw) {
      status.className = "error";
      status.textContent = s.lang === "ml"
        ? "ഫോട്ടോയിൽ കോഡ് കണ്ടില്ല. വെളിച്ചത്തിൽ വീണ്ടും എടുക്കൂ."
        : "No code found in photo. Retake in good light.";
      return;
    }
    await finishWithCode(raw);
  };
  useBtn.onclick = () => finishWithCode(input.value);
  demoBtn.onclick = async () => {
    if (busy) return;
    busy = true;
    loginDemo("KVAD-001");
    localStorage.setItem("sai_token", "demo-local:KVAD-001");
    status.className = "muted";
    status.textContent = s.lang === "ml"
      ? "ഡെമോ: ഈ ഫോണിൽ മാത്രം സേവ് ചെയ്യും."
      : "Demo: saves on this phone only.";
    stopLoop();
    track("demo_login", {});
    await batchGet10();
    window.dispatchEvent(new CustomEvent("sai:navigate", { detail: "lessons" }));
    busy = false;
  };
  input.oninput = () => {
    if (status.className === "error") {
      status.className = "muted";
      status.textContent = "";
    }
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") finishWithCode(input.value);
  };
}
