import type { ModelStatus } from "./types";

let status: ModelStatus = { status: "not-loaded", progress: 0, message: "Person detection model not loaded" };
const listeners = new Set<(value: ModelStatus) => void>();
const emit = (next: ModelStatus) => { status = next; listeners.forEach((listener) => listener(status)); };

export function getModelStatus() { return status; }
export function subscribeModelStatus(listener: (value: ModelStatus) => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function markModelLoading() { emit({ status: "loading", progress: 10, message: "Loading COCO-SSD in this browser…" }); }
export function markModelLoaded(backend: "webgl" | "cpu") {
  emit({ status: "loaded", progress: 100, message: `COCO-SSD person detection ready (${backend.toUpperCase()})`, info: { name: "COCO-SSD MobileNet", inputSize: 300, backend, source: "live-model" } });
}
export function markModelError(error: unknown) {
  emit({ status: "error", progress: 0, message: `Person detection model unavailable: ${error instanceof Error ? error.message : "Unknown error"}` });
}
export function resetModelStatus() { emit({ status: "not-loaded", progress: 0, message: "Person detection model not loaded" }); }
