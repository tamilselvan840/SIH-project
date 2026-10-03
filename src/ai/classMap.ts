export const COCO_LABELS = [
  "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack","umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant","bed","dining table","toilet","tv","laptop","mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","book","clock","vase","scissors","teddy bear","hair drier","toothbrush"
];

export const infrastructureClassMap: Record<string, { label: string; supported: boolean; canonical?: string }> = {
  person: { label: "Person", supported: true }, chair: { label: "Chair", supported: true },
  laptop: { label: "Laptop / Computer", supported: true }, tv: { label: "Monitor", supported: true },
  keyboard: { label: "Keyboard", supported: true }, mouse: { label: "Mouse", supported: true },
  bench: { label: "Bench", supported: true }, "dining table": { label: "Table", supported: true },
  whiteboard: { label: "Whiteboard", supported: false }, projector: { label: "Projector", supported: false },
  "fire extinguisher": { label: "Fire Extinguisher", supported: false }, "first aid box": { label: "First Aid Box", supported: false },
  fan: { label: "Fan", supported: false }, door: { label: "Door", supported: false },
  window: { label: "Window", supported: false }, dustbin: { label: "Dustbin", supported: false },
};
export const supportedModelClasses = new Set(Object.entries(infrastructureClassMap).filter(([, value]) => value.supported).map(([key]) => key));
