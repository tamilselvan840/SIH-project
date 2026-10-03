import type { AuditEntry, EvidenceRecord } from "../types";

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
export async function sha256(data: Blob | string): Promise<string> {
  const buffer = typeof data === "string" ? new TextEncoder().encode(data) : await data.arrayBuffer();
  return hex(await crypto.subtle.digest("SHA-256", buffer));
}
export async function calculateDHash(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(9, 8), context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, 9, 8);
  const pixels = context.getImageData(0, 0, 9, 8).data;
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const left = pixels[(y * 9 + x) * 4], right = pixels[(y * 9 + x + 1) * 4]; bits += left > right ? "1" : "0";
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}
export function hashSimilarity(a: string, b: string) {
  const xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`); let value = xor, distance = 0;
  while (value) { distance += Number(value & 1n); value >>= 1n; }
  return Math.round((1 - distance / 64) * 100);
}
export function findDuplicate(dHash: string, evidence: EvidenceRecord[]) {
  return evidence.reduce((best, item) => {
    const match = hashSimilarity(dHash, item.dHash);
    return match > best.match ? { match, evidenceId: item.id } : best;
  }, { match: 0, evidenceId: "" });
}
export function calculateTrust(input: {
  source: "live-model" | "demo"; captureSource: "camera" | "upload"; meanConfidence: number;
  timestampValid: boolean; locationVerified: boolean; integrityStored: boolean; duplicateMatch: number; evidenceStored: boolean;
}, weights: Record<string, number>) {
  const components = [
    { key: "aiConfidence", label: "AI confidence", value: input.source === "live-model" ? input.meanConfidence : 0, explanation: input.source === "live-model" ? "Calculated from live model inference" : "Demo output does not contribute real AI trust" },
    { key: "captureSource", label: "Capture source", value: input.captureSource === "camera" ? 1 : .45, explanation: input.captureSource === "camera" ? "Live camera capture" : "Upload source cannot be verified" },
    { key: "timestamp", label: "Timestamp", value: input.timestampValid ? 1 : 0, explanation: input.timestampValid ? "Capture agrees within 2 minutes" : "Capture time not verified" },
    { key: "location", label: "Location", value: input.locationVerified ? 1 : 0, explanation: input.locationVerified ? "Inside configured geofence" : "Not verified" },
    { key: "integrity", label: "Image integrity", value: input.integrityStored ? 1 : 0, explanation: input.integrityStored ? "SHA-256 stored" : "Hash unavailable" },
    { key: "duplicate", label: "Duplicate check", value: input.duplicateMatch >= 90 ? 0 : 1, explanation: input.duplicateMatch >= 90 ? `${input.duplicateMatch}% image match found` : "No strong prior match" },
    { key: "availability", label: "Evidence availability", value: input.evidenceStored ? 1 : 0, explanation: input.evidenceStored ? "Image and result stored" : "Evidence incomplete" },
  ];
  const total = components.reduce((sum, item) => sum + (weights[item.key] || 0), 0);
  const score = Math.round(components.reduce((sum, item) => sum + item.value * (weights[item.key] || 0), 0) / Math.max(1, total) * 100);
  return { score, components, humanVerificationRequired: score < 60 || input.meanConfidence < .8 };
}
export async function appendAudit(entries: AuditEntry[], action: string, entityId: string, detail: string): Promise<AuditEntry[]> {
  const previousHash = entries.at(-1)?.hash || "GENESIS";
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ timestamp, action, entityId, detail, previousHash });
  return [...entries, { id: crypto.randomUUID(), timestamp, action, entityId, detail, previousHash, hash: await sha256(payload) }];
}
export async function verifyAudit(entries: AuditEntry[]) {
  let previousHash = "GENESIS";
  for (const entry of entries) {
    if (entry.previousHash !== previousHash) return false;
    const payload = JSON.stringify({ timestamp: entry.timestamp, action: entry.action, entityId: entry.entityId, detail: entry.detail, previousHash });
    if (await sha256(payload) !== entry.hash) return false;
    previousHash = entry.hash;
  }
  return true;
}
