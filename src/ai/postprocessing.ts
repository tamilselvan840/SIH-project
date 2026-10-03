import { COCO_LABELS, supportedModelClasses } from "./classMap";
import type { BoundingBox, DetectionResult, PreprocessResult } from "./types";

type RawOutput = { data: Float32Array; dims: readonly number[] };
const iou = (a: BoundingBox, b: BoundingBox) => {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.width, b.x + b.width), y2 = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return intersection / (a.width * a.height + b.width * b.height - intersection || 1);
};

export function postprocess(output: RawOutput, meta: PreprocessResult, threshold = .35): DetectionResult[] {
  const [, channels, boxes] = output.dims;
  if (!channels || !boxes) return [];
  const candidates: DetectionResult[] = [];
  for (let i = 0; i < boxes; i++) {
    let best = 0, classIndex = -1;
    for (let c = 4; c < channels; c++) {
      const value = output.data[c * boxes + i];
      if (value > best) { best = value; classIndex = c - 4; }
    }
    const className = COCO_LABELS[classIndex];
    if (best < threshold || !supportedModelClasses.has(className)) continue;
    const cx = output.data[i], cy = output.data[boxes + i], w = output.data[boxes * 2 + i], h = output.data[boxes * 3 + i];
    const x = Math.max(0, (cx - w / 2 - meta.padX) / meta.scale), y = Math.max(0, (cy - h / 2 - meta.padY) / meta.scale);
    candidates.push({ className, confidence: best, boundingBox: { x, y, width: Math.min(meta.originalWidth - x, w / meta.scale), height: Math.min(meta.originalHeight - y, h / meta.scale) }, timestamp: new Date().toISOString(), source: "live-model" });
  }
  const selected: DetectionResult[] = [];
  for (const item of candidates.sort((a, b) => b.confidence - a.confidence)) {
    if (!selected.some((kept) => kept.className === item.className && iou(kept.boundingBox, item.boundingBox) > .45)) selected.push(item);
  }
  return selected;
}
