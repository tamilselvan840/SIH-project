# Smart Training Centre Monitor — SIH 2026 Prototype

**AI-Powered Attendance, Infrastructure Compliance & Trusted Monitoring.**

> We don't just automate attendance. We verify what centres report and tell the authority where to inspect first.

A frontend-only trust layer for training-centre monitoring. The workflow is visible throughout the product:

**Detect → Verify → Trust → Alert → Resolve → Report**

The prototype runs entirely in the browser. Metadata is versioned in `localStorage`; evidence images are stored in IndexedDB. There is no backend or database.

## What is real and what is simulated

- When `/public/models/yolov8n.onnx` exists and loads successfully, supported detections, boxes, confidence and inference time come from the live ONNX model in a Web Worker. The UI shows **Live Browser AI**.
- This repository intentionally does not bundle the large model. With no model file, it starts in **Demo Mode: results are simulated**. Bundled sample images use precomputed, source-tagged demo results.
- A single result can never mix `live-model` and `demo` detections.
- The default COCO model supports people, chairs, laptops, TVs/monitors, keyboards, mice, benches and dining tables.
- Whiteboards, projectors, fire extinguishers, first-aid boxes, fans, doors, windows and dustbins are shown as **Needs custom model**, never as detected by COCO.
- Face recognition runs entirely in the browser using bundled TinyFaceDetector, 68-point landmark and face-descriptor models. Matching uses descriptor distance and is never presented as an identity probability.

## Features

- Responsive Authority and Centre Manager workspaces with dark mode.
- 12 Tamil Nadu centres and 30-day history; four suspicious centres rank first at risk 74–92.
- Worker-based ONNX Runtime Web inference with WebGPU preference and WASM fallback.
- Actual model download progress, Cache API caching, reload and failure states.
- Upload, drag/drop, bundled samples and live camera capture.
- Annotated detections, per-class counts and box visibility controls.
- Pure, tested compliance rules with weighted requirements and human-verification thresholds.
- Trust scoring from AI confidence, capture source, time, location, SHA-256 integrity, dHash duplicate checks and evidence availability.
- Tamper-evident hash-chain audit log with a working verification action.
- Persisted Accept, Reject and Request Reinspection decisions.
- Alert lifecycle: Detected → Assigned → In Progress → Resolved → Verified.
- Reinspection can only offer “Compliance Restored” when a new result is actually compliant; a human must confirm it.
- Explainable Inspect-First risk ranking.
- Headcount through supported person detection.
- Real frontend face enrollment and descriptor matching with consent, deletion controls and DPDP Act 2023 privacy copy.
- JSON/CSV exports and print-optimised reports.
- Reset Demo clears localStorage, IndexedDB evidence and enrollment markers.

## Tech stack

- React 19, TypeScript, Vite 8
- Tailwind CSS 4 plus token-based project CSS
- React Router Data mode
- Lucide React, Recharts
- `onnxruntime-web`
- Vitest
- Browser Cache API, Web Workers, Web Crypto, Geolocation, MediaDevices, localStorage and IndexedDB

## Structure

```text
public/
  models/                 Place yolov8n.onnx here
  samples/                Documented bundled demo images
src/
  ai/                     Isolated model loading, worker inference and detection
  components/             Reusable UI components
  data/                   Seed centres and history
  hooks/                  Shared browser-state hook
  layouts/                Responsive application shell
  pages/                  Dashboard, Inspector, Compliance, Trust, Alerts…
  routes/                 React Router configuration
  services/
    storage/              Versioned localStorage and IndexedDB wrapper
    complianceEngine.ts   Pure compliance rules
    trustEngine.ts        Hashes, dHash, trust score and audit chain
    riskEngine.ts         Explainable centre risk
  types/                  Application domain types
```

## Install and run

Requirements: Node.js 24 and pnpm 10.

```bash
pnpm install
pnpm dev
```

Local Vite default: `http://localhost:5173`. In Figma Make, use the supervised preview URL; do not start another development server.

```bash
pnpm test
pnpm build
```

The build output is a static site suitable for Vercel, Netlify or any static host. Configure the host to rewrite application routes to `index.html`.

## Add the live ONNX model

Install Ultralytics in a separate Python environment and export the standard model:

```bash
pip install ultralytics
yolo export model=yolov8n.pt format=onnx imgsz=640 simplify=True
```

Copy the result:

```text
public/models/yolov8n.onnx
```

Reload the app or use **Settings → Browser AI → Reload**. The loader caches the model response, prefers WebGPU when available and falls back to WASM. Disable the explicit Demo Mode toggle to use live inference.

The implementation expects the standard YOLOv8 detection output shaped like `[1, 84, 8400]`. If an exported model has different inputs or outputs, adapt `src/ai/preprocessing.ts` and `src/ai/postprocessing.ts`.

## Train and swap a custom infrastructure model

1. Collect and label representative centre images for classes such as `whiteboard`, `projector`, `fire_extinguisher`, `first_aid_box`, `fan`, `door`, `window` and `dustbin`.
2. Train with Ultralytics:

   ```bash
   yolo detect train data=training-centre.yaml model=yolov8n.pt imgsz=640 epochs=100
   yolo export model=runs/detect/train/weights/best.pt format=onnx imgsz=640 simplify=True
   ```

3. Replace `public/models/yolov8n.onnx`.
4. Replace label ordering and support flags in `src/ai/classMap.ts`.
5. Test output dimensions and thresholds with representative positive and negative images.

Do not set an item to `supported: true` until the loaded model actually contains that class.

## Demo walkthrough

1. Open **Dashboard** and show the persistent Demo Mode badge and top four Inspect-First centres.
2. Open **AI Inspector**, choose Classroom A, and start analysis.
3. Point out that boxes and confidence explicitly say simulated and unsupported requirements say Needs custom model.
4. Show the weighted non-compliance result, evidence hash, local storage and human-review alert.
5. Open **Trust Layer**, review capture penalties, SHA-256, duplicate result and audit chain. Click **Verify audit chain**.
6. Accept, reject or request reinspection and show persistence after refresh.
7. Move an alert through its lifecycle. Resolved issues require a new inspection before human confirmation.
8. Open **Attendance** and explain that person count is supported, while recognition is honestly not installed.
9. Export JSON/CSV from **Reports** and show model, geofence, threshold and reset controls in **Settings**.

## Privacy

- Raw face video is never stored.
- Enrollment requires explicit consent.
- The prototype stores only 128-value numeric face embeddings with consent; raw enrollment images and video are discarded.
- Copy follows DPDP Act 2023 principles: consent, purpose limitation, minimisation, access and deletion.
- Evidence images remain in this browser’s IndexedDB and can be deleted with Reset Demo.

## Limitations

- Client-side trust checks are prototype checks. A device owner can modify browser storage or code.
- Production requires signed device requests, secure server time, server-side nonce protection, authenticated roles and externally anchored audit logs.
- Browser geolocation accuracy depends on device and permission.
- COCO is not an infrastructure-specific model.
- Demo confidence values are simulated and labelled as such.
- Face matching is prototype-grade and sensitive to lighting, pose and camera quality. Basic blink liveness is not implemented.
- Cache and IndexedDB quotas vary by browser.

## Troubleshooting

### Model stays in Demo Mode

- Confirm the exact path is `public/models/yolov8n.onnx`.
- Open browser developer tools and check the request to `/models/yolov8n.onnx`.
- Use Settings → Reload. A missing model intentionally falls back to Demo Mode.

### WebGPU unavailable

The app falls back to ONNX Runtime WASM. Use a current Chrome or Edge version for WebGPU. WASM may be slower but remains real inference.

### WASM fails to initialise

- Serve through Vite or a static web server, not `file://`.
- Ensure `.wasm` files are deployed with the generated assets.
- Check strict content-security policies and cross-origin isolation configuration.

### Camera or location denied

The UI displays a clear denial message. Upload remains available with a visible trust penalty. Location remains **Not verified** and is never silently treated as verified.

### Local data or quota issues

Use **Settings → Reset Demo**. Evidence images consume IndexedDB quota; individual uploads are limited to 30 MB.

## Design principle

**Evidence over claims. Humans decide. Risk ranks where to look first.**
