import * as faceapi from "@vladmandic/face-api";

export type FaceModelStatus = "not-loaded" | "loading" | "loaded" | "error";
export interface FaceEmbeddingResult {
  embedding: number[];
  detectionConfidence: number;
  box: { x: number; y: number; width: number; height: number };
}
export interface FaceEnrollment {
  id: string;
  name: string;
  embedding: number[];
  consentAt: string;
  purpose: "attendance";
}

const MODEL_PATH = "/models/face-api";
let status: FaceModelStatus = "not-loaded";
let loadPromise: Promise<void> | null = null;

export function getFaceModelStatus() { return status; }

export async function loadFaceModels() {
  if (status === "loaded") return;
  if (loadPromise) return loadPromise;
  status = "loading";
  loadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_PATH),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
  ]).then(() => { status = "loaded"; }).catch((error) => {
    status = "error"; loadPromise = null;
    throw new Error(`Face recognition models failed to load: ${error instanceof Error ? error.message : "unknown error"}`);
  });
  return loadPromise;
}

export async function createFaceEmbedding(input: HTMLVideoElement | HTMLImageElement): Promise<FaceEmbeddingResult> {
  await loadFaceModels();
  const result = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  if (!result) throw new Error("No clear face found. Face the camera directly in good lighting and try again.");
  return {
    embedding: Array.from(result.descriptor),
    detectionConfidence: result.detection.score,
    box: {
      x: result.detection.box.x, y: result.detection.box.y,
      width: result.detection.box.width, height: result.detection.box.height,
    },
  };
}

export function averageEmbeddings(samples: number[][]) {
  if (!samples.length) throw new Error("At least one embedding is required");
  return samples[0].map((_, index) => samples.reduce((sum, sample) => sum + sample[index], 0) / samples.length);
}

export function descriptorDistance(a: number[], b: number[]) {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

export function findBestFaceMatch(embedding: number[], enrollments: FaceEnrollment[], threshold = 0.55) {
  const ranked = enrollments.map((item) => ({ enrollment: item, distance: descriptorDistance(embedding, item.embedding) })).sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  if (!best || best.distance > threshold) return { matched: false, enrollment: null, distance: best?.distance ?? null, similarity: best ? Math.max(0, 1 - best.distance) : 0 };
  return { matched: true, enrollment: best.enrollment, distance: best.distance, similarity: Math.max(0, 1 - best.distance) };
}

