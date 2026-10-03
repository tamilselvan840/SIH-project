export interface BoundingBox { x: number; y: number; width: number; height: number }
export interface DetectionResult {
  className: string; confidence: number; boundingBox: BoundingBox; timestamp: string; source: "live-model" | "demo";
}
export interface ModelInfo { name: string; inputSize: number; backend: "webgl" | "cpu"; source: "live-model" }
export type ModelStatusName = "not-loaded" | "loading" | "loaded" | "error";
export interface ModelStatus { status: ModelStatusName; progress: number; message: string; info?: ModelInfo }
export interface PreprocessResult { data: Float32Array; originalWidth: number; originalHeight: number; scale: number; padX: number; padY: number; inputSize: number }
