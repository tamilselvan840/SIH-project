import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Clock3, Eye, EyeOff, ImagePlus, Info, LoaderCircle, LocateFixed, Play, ScanLine, StopCircle, Upload, Video, X } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatusBadge } from "../components/ui";
import { useAppState } from "../hooks/useAppState";
import { calculateConfidence, countObjects, detectObjects } from "../ai/objectDetector";
import { getModelStatus } from "../ai/modelLoader";
import { evaluateCompliance } from "../services/complianceEngine";
import { appendAudit, calculateDHash, calculateTrust, findDuplicate, sha256 } from "../services/trustEngine";
import { saveEvidenceImage } from "../services/storage/evidenceDb";
import { getMonitoringSnapshot, publishMonitoringSnapshot, type MonitoringEvidence } from "../services/monitorState";
import type { DetectionResult } from "../ai/types";
import type { EvidenceRecord } from "../types";

type InputMode = "upload" | "camera";
export default function InspectorPage() {
  const [state, setState] = useAppState();
  const [mode, setMode] = useState<InputMode>("upload");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 960, height: 600 });
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [peopleDetected, setPeopleDetected] = useState<number | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [detectionError, setDetectionError] = useState("");
  const [monitorEvidence, setMonitorEvidence] = useState<MonitoringEvidence | null>(null);
  const [location, setLocation] = useState<"idle" | "verified" | "denied">("idle");
  const [result, setResult] = useState<{ inferenceMs: number; evidence: EvidenceRecord } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorEvidenceRef = useRef<MonitoringEvidence | null>(null);
  const cameraRequestRef = useRef(false);
  const mountedRef = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const centre = state.centres.find((item) => item.id === "periyar")!;
  const counts = useMemo(() => countObjects(detections), [detections]);
  const compliance = useMemo(() => evaluateCompliance(state.requirements.filter((item) => item.className !== "person"), detections, state.settings.confidenceThreshold), [state.requirements, detections, state.settings.confidenceThreshold]);

  useEffect(() => {
    if (mode === "camera" && video.current && cameraStream) {
      video.current.srcObject = cameraStream;
      video.current.play().catch(() => setCameraError("The browser blocked video playback. Check this page's camera permission and try again."));
    }
  }, [mode, cameraStream]);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cameraRequestRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const snapshot = getMonitoringSnapshot();
      publishMonitoringSnapshot({ ...snapshot, cameraStatus: "idle", peopleDetected: null, attendancePercentage: null, detections: [] });
    };
  }, []);
  useEffect(() => {
    if (mode !== "camera" || !cameraStream) return;
    let active = true;
    let timer = 0;
    let previousIssueKey = "";
    const runDetection = async () => {
      const liveVideo = video.current;
      if (!active || !liveVideo?.videoWidth || !liveVideo.videoHeight) {
        if (active) timer = window.setTimeout(runDetection, 200);
        return;
      }
      try {
        const output = await detectObjects(liveVideo, liveVideo.videoWidth, liveVideo.videoHeight);
        if (!active) return;
        const people = output.detections.filter((item) => item.className === "person");
        const expected = Math.max(0, state.settings.expectedTrainees ?? 20);
        const attendance = expected ? Math.min(100, Math.round(people.length / expected * 100)) : 100;
        const infrastructureRequirements = state.requirements.filter((item) => item.className !== "person");
        const infrastructure = evaluateCompliance(infrastructureRequirements, output.detections, state.settings.confidenceThreshold);
        const issueItems = infrastructure.items.filter((item) => item.status === "NON-COMPLIANT");
        const issueKey = [people.length < expected ? "attendance" : "", ...issueItems.map((item) => item.requirement.id)].filter(Boolean).sort().join("|");
        const canvas = overlay.current;
        if (canvas) {
          canvas.width = liveVideo.clientWidth;
          canvas.height = liveVideo.clientHeight;
          const context = canvas.getContext("2d");
          context?.clearRect(0, 0, canvas.width, canvas.height);
          if (context) {
            const scale = Math.max(canvas.width / liveVideo.videoWidth, canvas.height / liveVideo.videoHeight);
            const offsetX = (canvas.width - liveVideo.videoWidth * scale) / 2;
            const offsetY = (canvas.height - liveVideo.videoHeight * scale) / 2;
            context.lineWidth = Math.max(2, canvas.width / 500);
            context.font = `bold ${Math.max(14, canvas.width / 55)}px sans-serif`;
            people.forEach((person) => {
              const { x, y, width, height } = person.boundingBox;
              context.strokeStyle = "#5eead4";
              context.fillStyle = "#5eead4";
              const boxX = x * scale + offsetX;
              const boxY = y * scale + offsetY;
              context.strokeRect(boxX, boxY, width * scale, height * scale);
              context.fillText(`Person ${Math.round(person.confidence * 100)}%`, boxX + 4, Math.max(18, boxY - 7));
            });
          }
        }
        setDetections(output.detections);
        setPeopleDetected(people.length);
        setAttendancePercentage(attendance);
        setDetectionError("");
        let evidence = monitorEvidenceRef.current;
        if (issueKey && issueKey !== previousIssueKey) {
          const capture = document.createElement("canvas");
          capture.width = liveVideo.videoWidth;
          capture.height = liveVideo.videoHeight;
          capture.getContext("2d")?.drawImage(liveVideo, 0, 0);
          const infrastructureSummary = issueItems.map((item) => `${item.requirement.label}: ${item.detected}/${item.requirement.required}`).join(", ");
          const detected = [people.length < expected ? `People detected ${people.length}/${expected}` : "", infrastructureSummary].filter(Boolean).join(" · ");
          const confidence = people.length < expected && people.length
            ? people.reduce((sum, item) => sum + item.confidence, 0) / people.length
            : issueItems.find((item) => item.meanConfidence > 0)?.meanConfidence ?? null;
          evidence = {
            imageUrl: capture.toDataURL("image/jpeg", 0.78),
            timestamp: new Date().toISOString(),
            centreId: centre.id,
            detected,
            confidence,
          };
          monitorEvidenceRef.current = evidence;
          setMonitorEvidence(evidence);
        }
        previousIssueKey = issueKey;
        publishMonitoringSnapshot({
          cameraStatus: "active",
          peopleDetected: people.length,
          expectedTrainees: expected,
          attendancePercentage: attendance,
          infrastructureStatus: infrastructure.status,
          compliancePercentage: infrastructure.percentage,
          activeAlerts: state.alerts.filter((item) => item.stage !== "Verified").length + (issueKey ? 1 : 0),
          detections: output.detections,
          evidence,
        });
      } catch (issue) {
        if (!active) return;
        const message = issue instanceof Error ? issue.message : "Person detection failed";
        setDetectionError(`Detection unavailable: ${message}. Camera frames remain on this device.`);
        publishMonitoringSnapshot({ cameraStatus: "error", peopleDetected: null, expectedTrainees: state.settings.expectedTrainees ?? 20, attendancePercentage: null, infrastructureStatus: "NOT ASSESSABLE", compliancePercentage: null, activeAlerts: state.alerts.filter((item) => item.stage !== "Verified").length, detections: [], evidence: monitorEvidenceRef.current, message });
        active = false;
      }
      if (active) timer = window.setTimeout(runDetection, 900);
    };
    void runDetection();
    return () => { active = false; window.clearTimeout(timer); };
  }, [cameraStream, mode, state.settings.expectedTrainees, state.settings.confidenceThreshold, state.requirements, state.alerts, centre.id]);
  function chooseFile(file?: File | Blob, name = "uploaded-evidence.jpg") {
    if (!file || !file.type.startsWith("image/")) { setError("Choose a valid JPG, PNG, WebP or SVG image."); return; }
    if (file.size > 30 * 1024 * 1024) { setError("Image is larger than 30 MB. Choose a smaller image."); return; }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setBlob(file); setImageUrl(URL.createObjectURL(file)); setDetections([]); setResult(null); setError("");
    if (!(file instanceof File)) Object.defineProperty(file, "name", { value: name });
  }
  async function useSample(path: string) {
    try { const response = await fetch(path); chooseFile(await response.blob(), path.split("/").pop()); }
    catch { setError("The bundled sample could not be loaded."); }
  }
  async function startCamera() {
    if (cameraRequestRef.current) return;
    cameraRequestRef.current = true;
    setMode("camera"); setCameraError("");
    if (!window.isSecureContext) { setCameraError("Camera access requires HTTPS or a secure browser preview. Use the image upload option instead."); cameraRequestRef.current = false; return; }
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError("This browser or preview does not expose camera access. Use the image upload option instead."); cameraRequestRef.current = false; return; }
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraStream(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      setCameraStream(stream);
      setPeopleDetected(null); setAttendancePercentage(null); setDetectionError("");
      publishMonitoringSnapshot({ cameraStatus: "active", peopleDetected: null, expectedTrainees: state.settings.expectedTrainees ?? 20, attendancePercentage: null, infrastructureStatus: "NOT ASSESSABLE", compliancePercentage: null, activeAlerts: state.alerts.filter((item) => item.stage !== "Verified").length, detections: [], evidence: monitorEvidence });
    } catch (issue) {
      if (!mountedRef.current) return;
      const name = issue instanceof DOMException ? issue.name : "CameraError";
      const messages: Record<string, string> = {
        NotAllowedError: "Camera permission was denied. Allow camera access for this site in your browser settings, then try again.",
        NotFoundError: "No camera device was found. Connect or enable a webcam and try again.",
        NotReadableError: "The camera is already in use or could not be opened. Close other camera apps and try again.",
        OverconstrainedError: "The camera cannot satisfy the requested video settings. Check that the selected camera supports video capture.",
        SecurityError: "The browser blocked camera access for security reasons. Use HTTPS and allow camera access for this page.",
      };
      const message = messages[name] || `Unable to open the camera (${name}). Check browser permission and device availability.`;
      setCameraError(message);
      publishMonitoringSnapshot({ cameraStatus: "error", peopleDetected: null, expectedTrainees: state.settings.expectedTrainees ?? 20, attendancePercentage: null, infrastructureStatus: "NOT ASSESSABLE", compliancePercentage: null, activeAlerts: state.alerts.filter((item) => item.stage !== "Verified").length, detections: [], evidence: monitorEvidence, message });
    } finally {
      cameraRequestRef.current = false;
    }
  }
  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraStream(null);
    setDetections([]); setPeopleDetected(null); setAttendancePercentage(null);
    publishMonitoringSnapshot({ cameraStatus: "idle", peopleDetected: null, expectedTrainees: state.settings.expectedTrainees ?? 20, attendancePercentage: null, infrastructureStatus: "NOT ASSESSABLE", compliancePercentage: null, activeAlerts: state.alerts.filter((item) => item.stage !== "Verified").length, detections: [], evidence: monitorEvidence });
  }
  async function captureCamera() {
    if (!video.current?.videoWidth) return;
    const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
    canvas.getContext("2d")!.drawImage(video.current, 0, 0);
    const captured = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), "image/jpeg", .9));
    chooseFile(captured, "live-camera-capture.jpg");
  }
  async function checkLocation(): Promise<boolean> {
    if (!navigator.geolocation) { setLocation("denied"); return false; }
    return new Promise((resolve) => navigator.geolocation.getCurrentPosition((position) => {
      const earth = 6371000, p1 = centre.latitude * Math.PI / 180, p2 = position.coords.latitude * Math.PI / 180;
      const dp = (position.coords.latitude - centre.latitude) * Math.PI / 180, dl = (position.coords.longitude - centre.longitude) * Math.PI / 180;
      const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
      const inside = earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= centre.geofenceRadius;
      setLocation(inside ? "verified" : "denied"); resolve(inside);
    }, () => { setLocation("denied"); resolve(false); }, { enableHighAccuracy: true, timeout: 7000 }));
  }
  async function analyse() {
    if (!blob || !imageUrl) return;
    setLoading(true); setError("");
    try {
      const image = new Image(); image.src = imageUrl; await image.decode();
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      const output = await detectObjects(image, image.naturalWidth, image.naturalHeight);
      setDetections(output.detections);
      const assessed = evaluateCompliance(state.requirements.filter((item) => item.className !== "person"), output.detections, state.settings.confidenceThreshold);
      const hash = await sha256(blob);
      let dHash = "0000000000000000"; try { dHash = await calculateDHash(blob); } catch { /* SHA-256 still guarantees integrity when dHash is unavailable. */ }
      const duplicate = findDuplicate(dHash, state.evidence);
      const locationVerified = mode === "camera" ? await checkLocation() : false;
      const mean = calculateConfidence(output.detections);
      const trust = calculateTrust({ source: "live-model", captureSource: mode, meanConfidence: mean, timestampValid: mode === "camera", locationVerified, integrityStored: true, duplicateMatch: duplicate.match, evidenceStored: true }, state.settings.trustWeights);
      const id = `EV-${Date.now()}`, imageKey = `image:${id}`;
      await saveEvidenceImage(imageKey, blob);
      const evidence: EvidenceRecord = { id, centreId: centre.id, createdAt: new Date().toISOString(), source: "live-model", captureSource: mode, imageKey, imageName: (blob as File).name || "capture.jpg", detections: output.detections, inferenceMs: output.inferenceMs, compliance: assessed.percentage, complianceStatus: assessed.status, trustScore: trust.score, sha256: hash, dHash, duplicateMatch: duplicate.match, locationStatus: locationVerified ? "verified" : "not-verified", reviewStatus: trust.humanVerificationRequired ? "pending" : "accepted" };
      let audit = await appendAudit(state.audit, "Image uploaded", id, `${mode} evidence stored`);
      audit = await appendAudit(audit, "AI detection", id, `${output.detections.length} detections · source ${evidence.source}`);
      audit = await appendAudit(audit, "Trust check", id, `Score ${trust.score} · duplicate ${duplicate.match}%`);
      const needsAlert = assessed.status !== "COMPLIANT" || trust.humanVerificationRequired || duplicate.match >= 90;
      if (needsAlert) audit = await appendAudit(audit, "Alert created", id, "Human decision required");
      const alert = needsAlert ? { id: `AL-${Date.now()}`, centreId: centre.id, severity: (duplicate.match >= 90 ? "Critical" : trust.score < 60 ? "High" : "Medium") as "Critical" | "High" | "Medium", title: duplicate.match >= 90 ? "Duplicate evidence" : assessed.status === "NON-COMPLIANT" ? "Infrastructure non-compliance" : "Human verification required", reason: duplicate.match >= 90 ? `${duplicate.match}% perceptual image match` : `Compliance ${assessed.percentage}% · Trust ${trust.score}`, stage: "Detected" as const, createdAt: new Date().toISOString(), evidenceId: id } : null;
      const reinspectedAlerts = state.alerts.map((item) => item.centreId === centre.id && item.stage === "Resolved" && assessed.status === "COMPLIANT"
        ? { ...item, evidenceId: id, reason: `Reinspection reached ${assessed.percentage}% compliance · awaiting human verification` }
        : item);
      setState({ ...state, evidence: [evidence, ...state.evidence], audit, alerts: alert ? [alert, ...reinspectedAlerts] : reinspectedAlerts });
      setResult({ inferenceMs: output.inferenceMs, evidence });
    } catch (issue) { setError(`Analysis failed: ${issue instanceof Error ? issue.message : "Unknown error"}. Check the model status and try again.`); }
    finally { setLoading(false); }
  }
  const equipmentCards = [
    { label: "Computers", classes: ["laptop"] },
    { label: "Projector", classes: ["projector"] },
    { label: "Chairs", classes: ["chair"] },
    { label: "Other required equipment", classes: ["tv", "keyboard", "mouse", "dining table", "whiteboard", "fire extinguisher"] },
  ].map(({ label, classes }) => {
    const requirements = state.requirements.filter((item) => classes.includes(item.className));
    const assessable = requirements.filter((item) => item.supported);
    const detected = assessable.reduce((sum, item) => sum + (counts[item.className] || 0), 0);
    const required = assessable.reduce((sum, item) => sum + item.required, 0);
    return { label, requirements, detected, required, assessable: assessable.length > 0 };
  });
  return <>
    <PageHeader eyebrow="Detect → Verify → Trust" title="Infrastructure AI Inspector" description="Count people and compare model-supported equipment locally in your browser." actions={<Badge tone={getModelStatus().status === "loaded" ? "green" : getModelStatus().status === "error" ? "red" : "amber"} dot>{getModelStatus().status === "loaded" ? "Live Browser AI" : getModelStatus().status === "error" ? "Model unavailable" : "Loading browser model"}</Badge>} />
    <div className="limitation-note"><Info/><span><strong>Browser-only monitoring:</strong> COCO-SSD detects people, chairs, laptops, monitors, keyboards, mice, benches and tables. Projectors and other unsupported objects show “Detection model not configured.” No identity recognition is used.</span></div>
    <div className="inspector-grid">
      <Card className="inspector-input">
        <div className="tabs"><button className={mode === "upload" ? "active" : ""} onClick={() => { stopCamera(); setMode("upload"); }}><Upload/> Upload</button><button className={mode === "camera" ? "active" : ""} onClick={startCamera}><Camera/> Live camera</button></div>
        {mode === "upload" ? <div className={`dropzone ${drag ? "drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files[0]); }} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => chooseFile(e.target.files?.[0])}/><span><ImagePlus/></span><h2>Drop evidence here</h2><p>or choose an image · JPG, PNG, WebP · max 30 MB</p><Button variant="secondary" type="button">Choose image</Button>
          <small><AlertTriangle/> Upload source cannot be verified and receives a visible trust penalty.</small>
        </div> : <><div className="camera-surface"><video ref={video} autoPlay muted playsInline/><canvas ref={overlay} className="person-overlay"/><div className="scan-line"/>{cameraError && <div className="camera-message"><AlertTriangle/><strong>Camera unavailable</strong><p>{cameraError}</p><Button onClick={() => { setCameraError(""); void startCamera(); }}>Try again</Button></div>}{cameraStream && <div className="camera-live-indicator"><i/> Camera active · processing on this device</div>}</div><div className="live-count-row"><strong>People Detected: {peopleDetected === null ? "—" : peopleDetected}</strong><span>{attendancePercentage === null ? "Attendance: waiting for detection" : `Attendance: ${peopleDetected} / ${state.settings.expectedTrainees ?? 20} · ${attendancePercentage}%`}</span><div>{cameraStream ? <Button variant="secondary" onClick={stopCamera}><StopCircle/> Stop Camera</Button> : <Button onClick={startCamera}><Camera/> Start Camera</Button>}{cameraStream && <Button variant="secondary" onClick={captureCamera}><ImagePlus/> Capture frame</Button>}</div></div>{detectionError && <div className="error-state"><AlertTriangle/><span>{detectionError}</span></div>}</>}
        <div className="sample-row"><span>Sample images for model testing</span><button onClick={() => useSample("/samples/classroom-a.svg")}>Classroom A</button><button onClick={() => useSample("/samples/classroom-b.svg")}>Classroom B</button></div>
      </Card>
      <Card className="analysis-card">
        <div className="card-head"><div><h2>Evidence preview</h2><p>{blob ? `${(blob.size / 1024).toFixed(0)} KB · ready for local analysis` : "Choose evidence to begin"}</p></div>{result && <Badge tone="green">Live Browser AI</Badge>}</div>
        <div className="annotated">
          {imageUrl ? <><img src={imageUrl} alt="Evidence selected for analysis"/><svg viewBox={`0 0 ${imageSize.width} ${imageSize.height}`} preserveAspectRatio="xMidYMid meet">{detections.map((item, index) => hidden.has(item.className) ? null : <g key={`${item.className}-${index}`}><rect x={item.boundingBox.x} y={item.boundingBox.y} width={item.boundingBox.width} height={item.boundingBox.height}/><text x={item.boundingBox.x + 4} y={Math.max(16, item.boundingBox.y - 5)}>{item.className} · {Math.round(item.confidence * 100)}%</text></g>)}</svg></> : <div className="empty-visual"><ScanLine/><strong>No evidence selected</strong><span>Boxes and confidence labels appear here.</span></div>}
        </div>
        {error && <div className="error-state"><AlertTriangle/><span>{error}</span><button onClick={() => setError("")}><X/></button></div>}
        <div className="analysis-actions"><span>{location === "verified" ? <><LocateFixed/> Location inside geofence</> : location === "denied" ? <><AlertTriangle/> Location not verified</> : <><Clock3/> Integrity checks run after analysis</>}</span><Button onClick={analyse} disabled={!blob || loading}>{loading ? <><LoaderCircle className="spin"/> Analysing in browser…</> : <><Play/> Start analysis</>}</Button></div>
      </Card>
    </div>
    {cameraStream && <div className="infrastructure-monitor-grid">{equipmentCards.map((item) => <Card key={item.label}><div className="card-head"><div><h2>{item.label}</h2><p>{item.requirements.map((requirement) => requirement.label).join(", ") || "No requirement configured"}</p></div><StatusBadge status={!item.assessable ? "NOT ASSESSABLE" : item.detected >= item.required ? "COMPLIANT" : "NON-COMPLIANT"}/></div><div className="equipment-count">{item.assessable ? <><strong>{item.detected} / {item.required}</strong><span>Detected / required</span>{item.requirements.some((requirement) => !requirement.supported) && <small>Some equipment: Detection model not configured</small>}</> : <strong>Detection model not configured</strong>}</div></Card>)}</div>}
    {monitorEvidence && <Card className="monitor-evidence-card"><div className="card-head"><div><h2>Compliance evidence</h2><p>{new Date(monitorEvidence.timestamp).toLocaleString()} · Centre {monitorEvidence.centreId}</p></div></div><div className="monitor-evidence"><img src={monitorEvidence.imageUrl} alt="Live camera evidence captured for a compliance issue"/><div><strong>{monitorEvidence.detected}</strong><small>Confidence {monitorEvidence.confidence === null ? "not available" : `${Math.round(monitorEvidence.confidence * 100)}%`}</small></div></div></Card>}
    {detections.length > 0 && <div className="result-grid">
      <Card><div className="card-head"><div><h2>Detected objects</h2><p>{result?.inferenceMs ?? "Live"} ms inference · local model confidence</p></div><Badge tone="blue">{detections.length} objects</Badge></div><div className="counts-list">{Object.entries(counts).map(([name, count]) => <div key={name}><button onClick={() => setHidden((current) => { const next = new Set(current); next.has(name) ? next.delete(name) : next.add(name); return next; })}>{hidden.has(name) ? <EyeOff/> : <Eye/>}</button><span><strong>{name}</strong><small>{detections.filter((d) => d.className === name).map((d) => `${Math.round(d.confidence * 100)}%`).join(", ")}</small></span><b>{count}</b></div>)}</div></Card>
      <Card className="compliance-result"><div className="card-head"><div><h2>Required vs detected</h2><p>Threshold {Math.round(state.settings.confidenceThreshold * 100)}% · low confidence requires a human</p></div><StatusBadge status={compliance.status}/></div><div className="table-wrap"><table><thead><tr><th>Item</th><th>Required</th><th>Detected</th><th>Difference</th><th>Confidence</th><th>Status</th></tr></thead><tbody>{compliance.items.map((item) => <tr key={item.requirement.id}><td><strong>{item.requirement.label}</strong>{!item.requirement.supported && <small>Detection model not configured</small>}</td><td>{item.requirement.required}</td><td>{item.status === "NOT ASSESSABLE" ? "—" : item.detected}</td><td>{item.status === "NOT ASSESSABLE" ? "—" : item.difference}</td><td>{item.meanConfidence ? `${Math.round(item.meanConfidence * 100)}%` : "—"}</td><td><StatusBadge status={item.status}/></td></tr>)}</tbody></table></div><div className="overall-result"><span className="score-ring small"><strong>{compliance.percentage}</strong><small>%</small></span><div><span>Weighted compliance</span><strong>{compliance.status}</strong><small>AI flags this result. An authorised human decides the outcome.</small></div></div></Card>
    </div>}
  </>;
}
