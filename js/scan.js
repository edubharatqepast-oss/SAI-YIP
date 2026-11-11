export const QR_VERSION = 1;

export function parseLoginCode(raw) {
  const text = String(raw || "").trim();
  if (!text) return { ok: false };
  try {
    const j = JSON.parse(text);
    if (j && typeof j.kvad === "string") {
      const id = j.kvad.trim().toUpperCase();
      if (/^KVAD-\d{3}$/.test(id)) return { ok: true, kvadId: id, version: Number(j.v) || 0 };
    }
  } catch {
    // not json
  }
  const tagged = text.toUpperCase().match(/SAI(\d*):(KVAD-\d{3})/);
  if (tagged) return { ok: true, kvadId: tagged[2], version: Number(tagged[1]) || 0 };
  const m = text.toUpperCase().match(/KVAD-\d{3}/);
  if (m) return { ok: true, kvadId: m[0], version: 0 };
  return { ok: false };
}

export function buildQrPayload(kvadId) {
  return "SAI" + QR_VERSION + ":" + String(kvadId || "").trim().toUpperCase();
}

export function hasCamera() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function hasNativeDetector() {
  return Boolean(window.BarcodeDetector);
}

export function scanSupported() {
  return hasCamera() || true;
}

export async function supportedFormats() {
  try {
    const f = await window.BarcodeDetector.getSupportedFormats();
    return f || [];
  } catch {
    return ["qr_code", "code_128", "ean_13", "code_39"];
  }
}

export async function openCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();
  return stream;
}

export function stopCamera(video, stream) {
  try {
    (stream || video.srcObject)?.getTracks?.().forEach((tr) => tr.stop());
  } catch {
    return;
  }
  if (video) video.srcObject = null;
}

let jsqrPromise = null;

export function loadJsQr() {
  if (window.jsQR) return Promise.resolve(true);
  if (jsqrPromise) return jsqrPromise;
  jsqrPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    tag.async = true;
    tag.crossOrigin = "anonymous";
    tag.integrity = "sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx";
    tag.onload = () => resolve(Boolean(window.jsQR));
    tag.onerror = () => resolve(false);
    document.head.append(tag);
    setTimeout(() => resolve(Boolean(window.jsQR)), 8000);
  });
  return jsqrPromise;
}

const workCanvas = { el: null };

function canvasFor() {
  if (!workCanvas.el) workCanvas.el = document.createElement("canvas");
  return workCanvas.el;
}

export function decodeFrameJsQr(video) {
  if (!window.jsQR) return "";
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  if (!vw || !vh) return "";
  const scale = Math.min(1, 640 / vw);
  const w = Math.max(2, Math.round(vw * scale));
  const h = Math.max(2, Math.round(vh * scale));
  const cv = canvasFor();
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, w, h);
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const found = window.jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
    return found?.data ? String(found.data) : "";
  } catch {
    return "";
  }
}

export function decodeFileJsQr(file) {
  return loadJsQr().then((ok) => {
    if (!ok) return "";
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 900;
          const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(2, Math.round(img.width * sc));
          const h = Math.max(2, Math.round(img.height * sc));
          const cv = canvasFor();
          cv.width = w;
          cv.height = h;
          const ctx = cv.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h);
          const found = window.jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
          resolve(found?.data ? String(found.data) : "");
        } catch {
          resolve("");
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("");
      };
      img.src = url;
    });
  });
}

export async function detectOnce(video, formats) {
  if (hasNativeDetector()) {
    try {
      const detector = new window.BarcodeDetector({ formats });
      const found = await detector.detect(video);
      if (found?.length) return String(found[0].rawValue || "");
    } catch {
      // fall through to jsqr
    }
  }
  return decodeFrameJsQr(video);
}
