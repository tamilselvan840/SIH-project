import { useState } from "react";
import { AlertTriangle, Bot, Check, Database, Moon, RefreshCw, Save, Sun } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "../components/ui";
import { useAppState } from "../hooks/useAppState";
import { getModelStatus } from "../ai/modelLoader";
import { disposeModel, loadModel } from "../ai/objectDetector";
import { clearEvidenceImages } from "../services/storage/evidenceDb";
import { createSeedState } from "../data/seed";

export default function SettingsPage() {
  const [state, setState] = useAppState();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const model = getModelStatus();
  const centre = state.centres.find((item) => item.id === "periyar")!;

  async function reload() {
    setMessage("Loading COCO-SSD…");
    await disposeModel();
    try {
      await loadModel(true);
      setMessage("COCO-SSD loaded in this browser.");
    } catch (issue) {
      setMessage(issue instanceof Error ? issue.message : "Person detection model could not be loaded.");
    }
  }
  async function reset() {
    await clearEvidenceImages();
    setState(createSeedState());
    localStorage.removeItem("stcm:face-enrollments:v1");
    setConfirm(false);
    setMessage("Local demo data and legacy face embeddings reset.");
  }

  return <>
    <PageHeader eyebrow="Prototype configuration" title="Settings" description="Model, centre, confidence, compliance, trust, risk, privacy and local data controls." actions={<Button onClick={() => { setState({ ...state }); setMessage("Settings saved locally."); }}><Save/> Save settings</Button>}/>
    {message && <div className="success-banner compact"><Check/><span><strong>Status</strong>{message}</span></div>}
    <div className="settings-grid">
      <Card>
        <div className="card-head"><div><h2>Browser AI</h2><p>Model status and browser inference</p></div><Badge tone={model.status === "loaded" ? "green" : model.status === "error" ? "red" : "amber"}>{model.status}</Badge></div>
        <div className="settings-form">
          <div className="model-panel"><Bot/><span><strong>{model.info?.name || "COCO-SSD person detector"}</strong><small>{model.message}</small>{model.status === "loading" && <progress value={model.progress} max="100"/>}</span><Button variant="secondary" onClick={reload}><RefreshCw/> Reload</Button></div>
          <label>Confidence threshold <b>{Math.round(state.settings.confidenceThreshold * 100)}%</b><input type="range" min=".3" max=".95" step=".05" value={state.settings.confidenceThreshold} onChange={(event) => setState({ ...state, settings: { ...state.settings, confidenceThreshold: Number(event.target.value) } })}/></label>
          <label className="toggle-row"><span><strong>Require human verification</strong><small>For low confidence or low trust</small></span><input type="checkbox" checked={state.settings.humanVerification} onChange={(event) => setState({ ...state, settings: { ...state.settings, humanVerification: event.target.checked } })}/></label>
        </div>
      </Card>
      <Card>
        <div className="card-head"><div><h2>Centre configuration</h2><p>Expected attendance and centre details</p></div></div>
        <div className="settings-form form-grid">
          <label>Expected trainees<input type="number" min="0" step="1" value={state.settings.expectedTrainees ?? 20} onChange={(event) => setState({ ...state, settings: { ...state.settings, expectedTrainees: Math.max(0, Number(event.target.value)) } })}/></label>
          <label>Centre name<input value={centre.name} onChange={(event) => setState({ ...state, centres: state.centres.map((item) => item.id === centre.id ? { ...item, name: event.target.value } : item) })}/></label>
          <label>Latitude<input type="number" value={centre.latitude} onChange={(event) => setState({ ...state, centres: state.centres.map((item) => item.id === centre.id ? { ...item, latitude: Number(event.target.value) } : item) })}/></label>
          <label>Longitude<input type="number" value={centre.longitude} onChange={(event) => setState({ ...state, centres: state.centres.map((item) => item.id === centre.id ? { ...item, longitude: Number(event.target.value) } : item) })}/></label>
          <label>Geofence radius (m)<input type="number" value={centre.geofenceRadius} onChange={(event) => setState({ ...state, centres: state.centres.map((item) => item.id === centre.id ? { ...item, geofenceRadius: Number(event.target.value) } : item) })}/></label>
        </div>
      </Card>
      <Card>
        <div className="card-head"><div><h2>Appearance & local data</h2><p>Stored only in this browser</p></div></div>
        <div className="settings-form">
          <div className="theme-picker"><button className={state.settings.theme === "light" ? "active" : ""} onClick={() => setState({ ...state, settings: { ...state.settings, theme: "light" } })}><Sun/> Light</button><button className={state.settings.theme === "dark" ? "active" : ""} onClick={() => setState({ ...state, settings: { ...state.settings, theme: "dark" } })}><Moon/> Dark</button></div>
          <div className="danger-zone"><AlertTriangle/><span><strong>Reset local data</strong><small>Clears metadata, evidence images, decisions and legacy enrollment data.</small></span>{confirm ? <span className="confirm-actions"><Button variant="danger" onClick={reset}>Confirm reset</Button><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button></span> : <Button variant="secondary" onClick={() => setConfirm(true)}>Reset local data</Button>}</div>
        </div>
      </Card>
    </div>
    <div className="architecture-grid"><Card><div className="architecture"><Badge tone="green">CURRENT PROTOTYPE</Badge><h2>Browser-only architecture</h2><div><span>React</span><i>→</i><span>Browser AI</span><i>→</i><span>Compliance</span><i>→</i><span>Trust Layer</span><i>→</i><span>LocalStorage / IndexedDB</span></div></div></Card><Card><div className="architecture muted"><Badge tone="blue">FUTURE PRODUCTION</Badge><h2>Server-verified architecture</h2><div><span>React</span><i>→</i><span>FastAPI</span><i>→</i><span>YOLO / Face service</span><i>→</i><span>Trust Layer</span><i>→</i><span>PostgreSQL</span></div></div></Card></div>
    <Card className="about-card"><Database/><div><h2>Privacy and limitations</h2><p>Camera frames and detections are processed in this browser and are not uploaded. Live issue evidence remains in memory for the current session. Attendance counts people without recognizing identities or storing biometric data. Unsupported equipment remains unassessed until a suitable model is configured.</p></div></Card>
  </>;
}
