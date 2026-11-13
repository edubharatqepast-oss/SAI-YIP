import { getState } from "../store.js";
import { t } from "../i18n.js";
import {
  loadVideos,
  getVideos,
  VIDEO_CATEGORIES,
  getVideosBySource,
  getVideosByCategory,
  getLoadStatus,
} from "../videos.js";
import {
  isQuotaExhausted,
  getRemainingMinutes,
  formatMinutes,
  startSession,
  endSession,
} from "../quota.js";

let modal = null;
let playerEl = null;
let currentVideo = null;
let videosLoaded = false;
let watchSessionStarted = false;

export async function renderVlearn(root) {
  const s = getState();
  const lang = s.lang;

  if (!videosLoaded) {
    await loadVideos();
    videosLoaded = true;
  }

  const status = getLoadStatus();
  const videos = getVideos();
  const exhausted = isQuotaExhausted();

  root.innerHTML = "";

  const section = document.createElement("section");
  section.className = "vlearn";

  section.appendChild(vlearnHeader(videos.length, status, exhausted, lang));
  section.appendChild(sourceFilters(lang));
  section.appendChild(categoryFilters(lang));
  section.appendChild(videoGrid(videos, exhausted, lang));

  root.appendChild(section);
}

function vlearnHeader(count, status, exhausted, lang) {
  const wrap = document.createElement("div");
  wrap.className = "vlearn-header";

  const left = document.createElement("div");
  left.className = "vlearn-header-left";
  const h2 = document.createElement("h2");
  h2.textContent = t("vlearn", lang);
  const sub = document.createElement("p");
  sub.className = "muted small";
  sub.textContent = t("vlearn_desc", lang);
  left.append(h2, sub);

  const right = document.createElement("div");
  right.className = "vlearn-header-right";

  const badge = document.createElement("span");
  badge.className = "badge skill";
  badge.textContent = count + " " + t("videos", lang);

  const quota = document.createElement("div");
  quota.className = "vlearn-quota";
  const dot = document.createElement("span");
  dot.className = "vlearn-quota-dot";
  dot.style.background = exhausted ? "var(--sai-bad)" : "var(--sai-ok)";
  dot.setAttribute("aria-label", exhausted ? t("quota_exhausted", lang) : "quota ok");
  const txt = document.createElement("span");
  txt.className = "vlearn-quota-text";
  txt.textContent = exhausted
    ? t("quota_exhausted", lang)
    : formatMinutes(getRemainingMinutes()) + " " + t("left", lang);
  quota.append(dot, txt);

  const src = document.createElement("span");
  src.className = "muted small";
  src.textContent =
    status.loadSource === "sheet" ? t("source_google_sheets", lang) : t("source_fallback", lang);

  right.append(badge, quota, src);
  wrap.append(left, right);
  return wrap;
}

function sourceFilters(lang) {
  const wrap = document.createElement("div");
  wrap.className = "vlearn-filters vlearn-source-filters";
  const sources = [
    { key: "filter_all", text: "All" },
    { key: "source_ted_ed", text: "TED-Ed" },
    { key: "source_wikimedia", text: "Wikimedia Commons" },
    { key: "source_pexels", text: "Pexels" },
    { key: "source_pixabay", text: "Pixabay" },
    { key: "source_faedu", text: "Free Animated Education" },
    { key: "source_google_sheets", text: "Google Sheets" },
  ];
  for (const source of sources) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className =
      "vlearn-chip source-chip" + (source.text === "All" ? " active" : "");
    const translated = t(source.key, lang);
    chip.textContent = translated === source.key ? source.text : translated;
    chip.onclick = () => {
      wrap.querySelectorAll(".source-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGridBySource(source.text === "All" ? null : source.text);
    };
    wrap.appendChild(chip);
  }
  return wrap;
}

function categoryFilters(lang) {
  const wrap = document.createElement("div");
  wrap.className = "vlearn-filters vlearn-category-filters";
  for (const cat of VIDEO_CATEGORIES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className =
      "vlearn-chip category-chip" + (cat === "All" ? " active" : "");
    chip.textContent =
      t("cat_" + cat.replace(/\s+/g, "_").toLowerCase(), lang) || cat;
    chip.onclick = () => {
      wrap.querySelectorAll(".category-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGridByCategory(cat === "All" ? null : cat);
    };
    wrap.appendChild(chip);
  }
  return wrap;
}

function videoGrid(videos, exhausted, lang) {
  const grid = document.createElement("div");
  grid.className = "grid cols-3 vlearn-grid";
  grid.id = "vlearn-grid";
  renderVideos(videos, grid, exhausted, lang);
  return grid;
}

function renderVideos(list, gridEl, exhausted, lang) {
  const grid = gridEl || document.getElementById("vlearn-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const v of list) {
    grid.appendChild(videoCard(v, exhausted, lang));
  }
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML =
      '<div style="font-size:40px;margin-bottom:10px;">📺</div>' +
      '<div style="font-weight:800;margin-bottom:6px;">' +
      t("no_videos_category", lang) +
      "</div>";
    const cta = document.createElement("button");
    cta.className = "secondary";
    cta.textContent = t("show_all_videos", lang);
    cta.style.marginTop = "10px";
    cta.onclick = () => {
      document.querySelectorAll(".source-chip.active").forEach((c) => c.classList.remove("active"));
      document.querySelectorAll(".category-chip.active").forEach((c) => c.classList.remove("active"));
      const allSource = document.querySelector(".vlearn-source-filters .source-chip");
      const allCat = document.querySelector(".vlearn-category-filters .category-chip");
      if (allSource) allSource.classList.add("active");
      if (allCat) allCat.classList.add("active");
      renderVideos(getVideos(), grid, exhausted, lang);
    };
    empty.appendChild(cta);
    grid.appendChild(empty);
  }
}

function renderGridBySource(source) {
  const grid = document.getElementById("vlearn-grid");
  const exhausted = isQuotaExhausted();
  const lang = getState().lang;
  const list = source ? getVideosBySource(source) : getVideos();
  renderVideos(list, grid, exhausted, lang);
}

function renderGridByCategory(cat) {
  const grid = document.getElementById("vlearn-grid");
  const exhausted = isQuotaExhausted();
  const lang = getState().lang;
  const list = cat ? getVideosByCategory(cat) : getVideos();
  renderVideos(list, grid, exhausted, lang);
}

function videoCard(v, exhausted, lang) {
  const s = getState();
  const card = document.createElement("div");
  card.className = "card lift video-card" + (exhausted ? " locked" : "");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", t("watch", s.lang) + " " + v.title);
  card.setAttribute("aria-disabled", exhausted ? "true" : "false");

  const thumb = document.createElement("div");
  thumb.className = "video-thumb";
  const img = document.createElement("img");
  img.src = v.thumbnail || "./mascot-sai.svg";
  img.alt = v.title;
  img.loading = "lazy";
  img.onerror = () => {
    img.src = "./mascot-sai.svg";
  };
  const play = document.createElement("div");
  play.className = "video-play";
  play.textContent = "▶";
  const dur = document.createElement("span");
  dur.className = "video-duration";
  dur.textContent = v.duration;
  if (exhausted) {
    const lock = document.createElement("span");
    lock.className = "video-card-lock";
    lock.textContent = "🔒";
    lock.setAttribute("aria-label", t("quota_exhausted", lang));
    thumb.appendChild(lock);
  }
  thumb.append(img, play, dur);

  const src = document.createElement("span");
  src.className = "video-source";
  src.textContent = v.source;
  const ttl = document.createElement("h3");
  ttl.textContent = v.title;
  const cat = document.createElement("p");
  cat.className = "muted small";
  cat.textContent = v.category;
  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.fontSize = "13px";
  desc.textContent = v.description;
  const foot = document.createElement("div");
  foot.className = "video-card-foot";
  const lic = document.createElement("span");
  lic.className = "muted small";
  lic.textContent = v.license;
  const age = document.createElement("span");
  age.className = "badge skill";
  age.textContent = t("age", s.lang) + " " + v.age;
  foot.append(lic, age);

  const open = () => openVideo(v);
  card.onclick = () => {
    if (exhausted) return;
    open();
  };
  card.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (exhausted) return;
      open();
    }
  };

  card.append(thumb, src, ttl, cat, desc, foot);
  return card;
}

function openVideo(v) {
  if (isQuotaExhausted()) return;
  currentVideo = v;
  startSession();
  watchSessionStarted = true;
  showVideoModal(v);
}

function showVideoModal(v) {
  if (modal) modal.remove();

  const s = getState();
  const lang = s.lang;

  const overlay = document.createElement("div");
  overlay.className = "video-modal-overlay";
  overlay.setAttribute("aria-hidden", "false");

  const modalEl = document.createElement("div");
  modalEl.className = "video-modal";
  modalEl.setAttribute("role", "dialog");
  modalEl.setAttribute("aria-modal", "true");

  const head = document.createElement("div");
  head.className = "video-modal-head";
  const badge = document.createElement("div");
  badge.className = "video-modal-badge";
  badge.textContent = "📺";
  const ttl = document.createElement("h3");
  ttl.id = "video-modal-title";
  ttl.textContent = v.title;
  modalEl.setAttribute("aria-labelledby", "video-modal-title");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "video-modal-close";
  close.textContent = "✕";
  const closeLabel = t("close", lang);
  close.setAttribute("aria-label", closeLabel === "close" ? "Close" : closeLabel);
  close.onclick = hideVideoModal;
  head.append(badge, ttl, close);

  const body = document.createElement("div");
  body.className = "video-modal-body";

  const playerWrap = document.createElement("div");
  playerWrap.className = "video-player-wrap";
  playerEl = document.createElement("div");
  playerEl.className = "video-player";

  const fail = document.createElement("div");
  fail.className = "game-load-fail";
  fail.style.display = "none";

  if (v.type === "youtube") {
    const iframe = document.createElement("iframe");
    iframe.className = "video-iframe";
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-presentations");
    const watchUrl = v.url.replace(/\/embed\//, "/watch?v=");
    const ytLink = document.createElement("div");
    ytLink.style.cssText = "margin-top:10px;font-size:13px;color:var(--sai-muted);";
    ytLink.innerHTML = '<a href="' + watchUrl + '" target="_blank" rel="noopener" style="color:var(--sai-brand);text-decoration:underline;">Open on YouTube →</a>';
    ytLink.style.display = "none";
    fail.appendChild(ytLink);

    let failed = false;
    const timeout = setTimeout(() => {
      if (!failed) {
        failed = true;
        iframe.style.display = "none";
        fail.style.display = "block";
        ytLink.style.display = "block";
      }
    }, 8000);
    iframe.onload = () => {
      clearTimeout(timeout);
      failed = true;
    };
    iframe.onerror = () => {
      clearTimeout(timeout);
      if (!failed) {
        failed = true;
        iframe.style.display = "none";
        fail.style.display = "block";
        ytLink.style.display = "block";
      }
    };
    iframe.src = v.url + "?rel=0&modestbranding=1";
    playerEl.appendChild(iframe);
  } else {
    const video = document.createElement("video");
    video.className = "video-direct";
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.src = v.url;
    video.poster = v.thumbnail || "";
    video.onerror = () => {
      video.style.display = "none";
      fail.style.display = "block";
    };
    playerEl.appendChild(video);
  }
  playerWrap.appendChild(playerEl, fail);

  const desc = document.createElement("p");
  desc.className = "modal-desc";
  desc.textContent = v.description;

  const meta = document.createElement("p");
  meta.className = "modal-meta";
  meta.textContent =
    v.source + " · " + v.category + " · " + v.duration + " · " + t("age", lang) + " " + v.age;

  const lic = document.createElement("p");
  lic.className = "modal-license";
  lic.innerHTML = t("license", lang) + ": <strong>" + v.license + "</strong>";

  const tags = document.createElement("div");
  tags.className = "video-tags";
  for (const tag of v.tags) {
    const chip = document.createElement("span");
    chip.className = "vlearn-chip";
    chip.textContent = tag;
    tags.appendChild(chip);
  }

  body.append(playerWrap, desc, meta, lic, tags);
  modalEl.append(head, body);
  overlay.appendChild(modalEl);
  overlay.onclick = (e) => {
    if (e.target === overlay) hideVideoModal();
  };
  document.body.appendChild(overlay);
  modal = overlay;
}

function hideVideoModal() {
  if (!modal) return;
  if (playerEl) {
    const iframe = playerEl.querySelector("iframe");
    const video = playerEl.querySelector("video");
    if (iframe) {
      iframe.src = "about:blank";
      iframe.remove();
    }
    if (video) {
      video.pause();
      video.src = "";
      video.remove();
    }
  }
  modal.remove();
  modal = null;
  playerEl = null;
  currentVideo = null;
  if (watchSessionStarted) {
    endSession();
    watchSessionStarted = false;
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal) hideVideoModal();
});
