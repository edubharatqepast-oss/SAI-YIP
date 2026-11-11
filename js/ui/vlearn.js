import { getState } from "../store.js";
import { t } from "../i18n.js";
import { loadVideos, getVideos, VIDEO_CATEGORIES, getVideo, getVideosByCategory, getVideosBySource, getLoadStatus } from "../videos.js";

let modal = null;
let playerEl = null;
let currentVideo = null;
let videosLoaded = false;

export async function renderVlearn(root) {
  const s = getState();
  const lang = s.lang;

  if (!videosLoaded) {
    await loadVideos();
    videosLoaded = true;
  }

  const status = getLoadStatus();
  const videos = getVideos();

  root.innerHTML = "";

  const section = document.createElement("section");
  section.className = "vlearn";

  section.appendChild(vlearnHeader(videos.length, status, lang));
  section.appendChild(sourceFilters(lang));
  section.appendChild(categoryFilters(lang));
  section.appendChild(videoGrid(videos));
  section.appendChild(createVideoModal());

  root.appendChild(section);
}

function vlearnHeader(count, status, lang) {
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
  const src = document.createElement("span");
  src.className = "muted small";
  src.textContent = status.loadSource === "sheet" ? t("source_google_sheets", lang) : t("source_fallback", lang);
  right.append(badge, src);

  wrap.append(left, right);
  return wrap;
}

function sourceFilters(lang) {
  const wrap = document.createElement("div");
  wrap.className = "vlearn-filters";
  const sources = [
    { key: "filter_all", text: "All" },
    { key: "source_ted_ed", text: "TED-Ed" },
    { key: "source_wikimedia", text: "Wikimedia Commons" },
    { key: "source_pexels", text: "Pexels" },
    { key: "source_pixabay", text: "Pixabay" },
    { key: "source_faedu", text: "Free Animated Education" },
    { key: "source_google_sheets", text: "Google Sheets" }
  ];
  for (const source of sources) {
    const chip = document.createElement("button");
    chip.className = "vlearn-chip" + (source.text === "All" ? " active" : "");
    chip.textContent = t(source.key, lang);
    chip.onclick = () => {
      document.querySelectorAll(".vlearn-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGridBySource(source.text === "All" ? null : source.text);
    };
    wrap.appendChild(chip);
  }
  return wrap;
}

function categoryFilters(lang) {
  const wrap = document.createElement("div");
  wrap.className = "vlearn-filters";
  for (const cat of VIDEO_CATEGORIES) {
    const chip = document.createElement("button");
    chip.className = "vlearn-chip" + (cat === "All" ? " active" : "");
    chip.textContent = t("cat_" + cat.replace(/\s+/g, "_").toLowerCase(), lang) || cat;
    chip.onclick = () => {
      document.querySelectorAll(".vlearn-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderGridByCategory(cat === "All" ? null : cat);
    };
    wrap.appendChild(chip);
  }
  return wrap;
}

function videoGrid(videos) {
  const grid = document.createElement("div");
  grid.className = "grid cols-3 vlearn-grid";
  grid.id = "vlearn-grid";
  renderVideos(videos, grid);
  return grid;
}

function renderVideos(list, gridEl) {
  const grid = gridEl || document.getElementById("vlearn-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const v of list) {
    grid.appendChild(videoCard(v));
  }
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("no_games_category", getState().lang);
    grid.appendChild(empty);
  }
}

function renderGridBySource(source) {
  const grid = document.getElementById("vlearn-grid");
  const list = source ? getVideosBySource(source) : getVideos();
  renderVideos(list, grid);
}

function renderGridByCategory(cat) {
  const grid = document.getElementById("vlearn-grid");
  const list = cat ? getVideosByCategory(cat) : getVideos();
  renderVideos(list, grid);
}

function videoCard(v) {
  const s = getState();
  const card = document.createElement("div");
  card.className = "card lift video-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", t("watch", s.lang) + " " + v.title);

  const thumb = document.createElement("div");
  thumb.className = "video-thumb";
  const img = document.createElement("img");
  img.src = v.thumbnail || "./mascot-sai.svg";
  img.alt = v.title;
  img.loading = "lazy";
  const play = document.createElement("div");
  play.className = "video-play";
  play.textContent = "▶";
  const dur = document.createElement("span");
  dur.className = "video-duration";
  dur.textContent = v.duration;
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

  card.onclick = () => openVideo(v);
  card.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openVideo(v);
    }
  };

  card.append(thumb, src, ttl, cat, desc, foot);
  return card;
}

function openVideo(v) {
  currentVideo = v;
  showVideoModal(v);
}

function showVideoModal(v) {
  if (modal) modal.remove();

  const s = getState();
  const lang = s.lang;

  const overlay = document.createElement("div");
  overlay.className = "video-modal-overlay";
  const modalEl = document.createElement("div");
  modalEl.className = "video-modal";

  const head = document.createElement("div");
  head.className = "video-modal-head";
  const badge = document.createElement("div");
  badge.className = "video-modal-badge";
  badge.textContent = "📺";
  const ttl = document.createElement("h3");
  ttl.textContent = v.title;
  const close = document.createElement("button");
  close.className = "game-modal-close";
  close.textContent = "✕";
  close.onclick = hideVideoModal;
  head.append(badge, ttl, close);

  const body = document.createElement("div");
  body.className = "video-modal-body";

  const playerWrap = document.createElement("div");
  playerWrap.className = "video-player-wrap";
  playerEl = document.createElement("div");
  playerEl.className = "video-player";
  if (v.type === "youtube") {
    const iframe = document.createElement("iframe");
    iframe.src = v.url + "?rel=0&modestbranding=1";
    iframe.className = "video-iframe";
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.setAttribute("loading", "lazy");
    const fail = document.createElement("div");
    fail.className = "game-load-fail";
    fail.style.display = "none";
    fail.innerHTML =
      '<div style="text-align:center;padding:20px;">' +
      '<div style="font-size:32px;margin-bottom:8px;">🔒</div>' +
      '<div style="font-weight:800;margin-bottom:6px;">' + t("video_cannot_play", lang) + '</div>' +
      '<div style="font-size:13px;color:var(--sai-muted);margin-bottom:12px;">' + t("video_blocks_embedding", lang) + '</div>' +
      '<div style="font-size:13px;color:var(--sai-muted);margin-bottom:16px;">License: <strong>' + v.license + '</strong></div>' +
      '</div>';
    playerWrap.append(iframe, fail);
    let failed = false;
    const timeout = setTimeout(() => {
      if (!failed) {
        failed = true;
        iframe.style.display = "none";
        fail.style.display = "block";
      }
    }, 8000);
    iframe.onload = () => { clearTimeout(timeout); failed = true; };
    iframe.onerror = () => { clearTimeout(timeout); if (!failed) { failed = true; iframe.style.display = "none"; fail.style.display = "block"; } };
  } else {
    const video = document.createElement("video");
    video.className = "video-direct";
    video.controls = true;
    video.preload = "metadata";
    video.src = v.url;
    video.poster = v.thumbnail || "";
    playerEl.appendChild(video);
  }
  playerWrap.appendChild(playerEl);

  const desc = document.createElement("p");
  desc.className = "modal-desc";
  desc.textContent = v.description;

  const meta = document.createElement("p");
  meta.className = "modal-meta";
  meta.textContent = v.source + " · " + v.category + " · " + v.duration + " · " + t("age", lang) + " " + v.age;

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
  document.body.appendChild(overlay);
  modal = overlay;
}

function hideVideoModal() {
  if (modal) {
    modal.remove();
    modal = null;
    playerEl = null;
    currentVideo = null;
  }
}

function createVideoModal() {
  const div = document.createElement("div");
  div.id = "video-modal-root";
  div.style.display = "none";
  return div;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal) hideVideoModal();
});
