export async function backupToDrive(payload) {
  const key = "sai_drive_" + (payload.kvadId || "anon");
  localStorage.setItem(key, JSON.stringify(payload));
  return { ok: true, key };
}

export function driveQuotaInfo() {
  return { freeTier: "15GB per user", usedEstimate: "<100KB" };
}
