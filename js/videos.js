import { fetchVideosFromSheet } from "./video-sheet.js";

let VIDEOS = [];

const FALLBACKS = [
  {
    id: "fallback-ted",
    title: "Logic Puzzle: The Bridge Riddle",
    source: "TED-Ed",
    category: "Logic Puzzles",
    description: "A classic logic puzzle about crossing a bridge at night. (Offline fallback)",
    url: "https://www.youtube.com/embed/iF6yPk5J7P0",
    type: "youtube",
    license: "CC BY-NC-ND",
    thumbnail: "https://img.youtube.com/vi/iF6yPk5J7P0/hqdefault.jpg",
    duration: "5:20",
    age: "10+",
    tags: ["logic", "riddle", "cc"]
  },
  {
    id: "fallback-abacus",
    title: "Abacus Counting",
    source: "Pexels",
    category: "Math",
    description: "Colorful abacus beads for basic arithmetic. (Offline fallback)",
    url: "https://videos.pexels.com/video-files/3276278/3276278-hd_1920_1080_25fps.mp4",
    type: "direct",
    license: "Pexels License",
    thumbnail: "https://images.pexels.com/videos/3276278/free-video-3276278.jpg",
    duration: "0:23",
    age: "6+",
    tags: ["math", "counting"]
  }
];

export const VIDEO_CATEGORIES = ["All", "Logic Puzzles", "Math", "Geometry", "Coding", "Classification", "Animation"];

let loaded = false;
let loadPromise = null;
let loadError = null;
let loadSource = "none";

export async function loadVideos() {
  if (loaded) return VIDEOS;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const fromSheet = await fetchVideosFromSheet().catch((e) => {
        loadError = String(e);
        return null;
      });
      if (fromSheet && fromSheet.length) {
        VIDEOS = fromSheet;
        loadSource = "sheet";
        console.log("[Videos] Loaded from sheet:", VIDEOS.length, "videos");
      } else {
        VIDEOS = FALLBACKS;
        loadSource = "fallback";
        console.log("[Videos] Using fallback videos:", VIDEOS.length);
      }
    } catch (e) {
      loadError = String(e);
      VIDEOS = FALLBACKS;
      loadSource = "fallback";
      console.error("[Videos] Load failed, using fallback:", e);
    }
    loaded = true;
    return VIDEOS;
  })();
  return loadPromise;
}

export function getVideos() {
  return VIDEOS;
}

export function getLoadStatus() {
  return { loaded, loadError, loadSource, count: VIDEOS.length };
}

export function getVideo(id) {
  return VIDEOS.find((v) => v.id === id) || null;
}

export function getVideosByCategory(category) {
  return category === "All" ? VIDEOS : VIDEOS.filter((v) => v.category === category);
}

export function getVideosBySource(source) {
  return VIDEOS.filter((v) => v.source === source);
}
