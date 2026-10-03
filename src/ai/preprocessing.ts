import type { PreprocessResult } from "./types";

export function preprocessImage(image: CanvasImageSource, width: number, height: number, inputSize = 640): PreprocessResult {
  const scale = Math.min(inputSize / width, inputSize / height);
  const resizedWidth = Math.round(width * scale), resizedHeight = Math.round(height * scale);
  const padX = Math.floor((inputSize - resizedWidth) / 2), padY = Math.floor((inputSize - resizedHeight) / 2);
  const canvas = new OffscreenCanvas(inputSize, inputSize);
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.fillStyle = "#727272"; context.fillRect(0, 0, inputSize, inputSize);
  context.drawImage(image, padX, padY, resizedWidth, resizedHeight);
  const rgba = context.getImageData(0, 0, inputSize, inputSize).data;
  const plane = inputSize * inputSize, data = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    data[i] = rgba[i * 4] / 255; data[plane + i] = rgba[i * 4 + 1] / 255; data[plane * 2 + i] = rgba[i * 4 + 2] / 255;
  }
  return { data, originalWidth: width, originalHeight: height, scale, padX, padY, inputSize };
}
