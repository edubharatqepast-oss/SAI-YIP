const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw60xxzX4UXi7gaTQl_bI0nteLGsUwtRIXch-oe2UuLJiT0ocrWQrr56zF-FrAToPsymA/exec";

export async function fetchVideosFromSheet() {
  try {
    console.log("[Videos] Fetching from:", APPS_SCRIPT_URL);
    const res = await fetch(APPS_SCRIPT_URL);
    console.log("[Videos] Response status:", res.status, res.ok);
    if (!res.ok) {
      console.error("[Videos] HTTP error:", res.status);
      return null;
    }
    const data = await res.json();
    console.log("[Videos] Data received:", data);
    if (!data || data.error) {
      console.error("[Videos] API error:", data.error);
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("[Videos] Empty or non-array data:", data);
      return null;
    }

    return data.map((v) => ({
      id: v.id || "sheet-" + Math.random().toString(36).slice(2, 8),
      title: v.title || "Untitled",
      source: v.source || "Google Sheets",
      category: v.category || "Video",
      description: v.description || "",
      url: v.url || "",
      type: v.type || "youtube",
      license: v.license || "CC",
      thumbnail: v.thumbnail || "",
      duration: v.duration || "",
      age: v.age || "All",
      tags: Array.isArray(v.tags) ? v.tags : (v.tags ? v.tags.split(",").map((t) => t.trim()).filter(Boolean) : [])
    }));
  } catch (err) {
    console.error("[Videos] Fetch failed:", String(err));
    return null;
  }
}
