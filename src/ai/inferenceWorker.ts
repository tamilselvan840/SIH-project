import * as ort from "onnxruntime-web";

let session: ort.InferenceSession | null = null;
self.onmessage = async (event: MessageEvent) => {
  const { type, id } = event.data;
  try {
    if (type === "load") {
      session = await ort.InferenceSession.create(event.data.buffer, { executionProviders: [event.data.backend, "wasm"], graphOptimizationLevel: "all" });
      self.postMessage({ id, type: "loaded", inputName: session.inputNames[0], outputName: session.outputNames[0] });
    } else if (type === "detect" && session) {
      const tensor = new ort.Tensor("float32", event.data.data, [1, 3, event.data.inputSize, event.data.inputSize]);
      const results = await session.run({ [session.inputNames[0]]: tensor });
      const output = results[session.outputNames[0]];
      self.postMessage({ id, type: "result", data: output.data, dims: output.dims }, [output.data.buffer]);
    } else if (type === "dispose") {
      await session?.release(); session = null; self.postMessage({ id, type: "disposed" });
    }
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : "Inference failed" });
  }
};
