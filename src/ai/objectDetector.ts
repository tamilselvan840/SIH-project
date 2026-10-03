import { markModelError, markModelLoaded, markModelLoading, resetModelStatus } from "./modelLoader";
import type { DetectionResult } from "./types";

type Detector = import("@tensorflow-models/coco-ssd").ObjectDetection;
let model: Detector | null = null;
let loadPromise: Promise<Detector> | null = null;

export async function loadModel(force = false): Promise<"live-model"> {
  if (force) await disposeModel();
  if (model) return "live-model";
  if (loadPromise) { await loadPromise; return "live-model"; }
  markModelLoading();
  loadPromise = (async () => {
    const [cocoSsd, tf] = await Promise.all([import("@tensorflow-models/coco-ssd"), import("@tensorflow/tfjs")]);
    let backend: "webgl" | "cpu" = "webgl";
    try {
      if (!await tf.setBackend("webgl")) throw new Error("WebGL is unavailable");
    } catch {
      backend = "cpu";
      await tf.setBackend("cpu");
    }
    await tf.ready();
    model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    markModelLoaded(backend);
    return model;
  })().catch((error: unknown) => {
    model = null;
    markModelError(error);
    throw error;
  }).finally(() => { loadPromise = null; });
  await loadPromise;
  return "live-model";
}
export async function detectObjects(image: CanvasImageSource, _width?: number, _height?: number, _demoMode?: boolean): Promise<{ detections: DetectionResult[]; inferenceMs: number }> {
  const start = performance.now();
  const detector = model ?? await loadModel().then(() => model!);
  const predictions = await detector.detect(image as HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, 20, 0.45);
  const timestamp = new Date().toISOString();
  const detections = predictions.map((item) => ({
    className: item.class,
    confidence: item.score,
    boundingBox: { x: item.bbox[0], y: item.bbox[1], width: item.bbox[2], height: item.bbox[3] },
    timestamp,
    source: "live-model" as const,
  }));
  return { detections, inferenceMs: Math.round(performance.now() - start) };
}
export function countObjects(detections: DetectionResult[]) {
  return detections.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.className]: (counts[item.className] || 0) + 1 }), {});
}
export function calculateConfidence(detections: DetectionResult[]) {
  return detections.length ? detections.reduce((sum, item) => sum + item.confidence, 0) / detections.length : 0;
}
export async function disposeModel() { model?.dispose(); model = null; loadPromise = null; resetModelStatus(); }
