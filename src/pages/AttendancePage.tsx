import { useEffect, useState } from "react";
import { Activity, Camera, ClipboardCheck, Users } from "lucide-react";
import { Link } from "react-router";
import { Badge, Button, Card, Metric, PageHeader } from "../components/ui";
import { getMonitoringSnapshot, subscribeMonitoringSnapshot } from "../services/monitorState";
import type { MonitoringSnapshot } from "../services/monitorState";

export default function AttendancePage() {
  const [monitoring, setMonitoring] = useState<MonitoringSnapshot>(getMonitoringSnapshot);
  useEffect(() => subscribeMonitoringSnapshot(setMonitoring), []);

  return <>
    <PageHeader eyebrow="Attendance · privacy first" title="Person Count Attendance" description="Attendance uses browser-based person detection only. It does not identify trainees or store biometric data." actions={<Badge tone={monitoring.cameraStatus === "active" ? "green" : monitoring.cameraStatus === "error" ? "red" : "slate"} dot>{monitoring.cameraStatus === "active" ? "Camera active" : monitoring.cameraStatus === "error" ? "Camera or model error" : "Camera idle"}</Badge>}/>
    <div className="metrics-grid attendance-metrics">
      <Metric icon={Camera} label="Camera status" value={monitoring.cameraStatus === "active" ? "Active" : monitoring.cameraStatus === "error" ? "Error" : "Idle"} detail={monitoring.cameraStatus === "active" ? "Video remains on this device" : "Start monitoring from AI Inspector"} tone={monitoring.cameraStatus === "active" ? "green" : "slate"}/>
      <Metric icon={Users} label="People detected" value={monitoring.peopleDetected ?? "—"} detail={`Expected trainees: ${monitoring.expectedTrainees}`} tone="blue"/>
      <Metric icon={Activity} label="Attendance" value={monitoring.attendancePercentage === null ? "—" : `${monitoring.attendancePercentage}%`} detail={monitoring.peopleDetected === null ? "Waiting for a live detection" : `${monitoring.peopleDetected} / ${monitoring.expectedTrainees}`} tone="green"/>
      <Metric icon={ClipboardCheck} label="Infrastructure" value={monitoring.infrastructureStatus} detail={monitoring.compliancePercentage === null ? "Not assessed" : `${monitoring.compliancePercentage}% compliant`} tone="amber"/>
    </div>
    <Card className="attendance-live-card">
      <div className="card-head"><div><h2>Live person count</h2><p>Model output is an anonymous count, not a student identity</p></div><Badge tone={monitoring.cameraStatus === "active" ? "green" : "slate"} dot>{monitoring.cameraStatus === "active" ? "Processing in browser" : "No active stream"}</Badge></div>
      <div className="attendance-live-body">
        <div><strong>{monitoring.peopleDetected ?? "—"}<small> / {monitoring.expectedTrainees}</small></strong><span>People detected</span></div>
        <div><strong>{monitoring.attendancePercentage === null ? "—" : `${monitoring.attendancePercentage}%`}</strong><span>Attendance percentage</span></div>
        <p>{monitoring.message || (monitoring.cameraStatus === "active" ? "Bounding boxes and counts are refreshed continuously from the live camera stream." : "Start the camera in AI Inspector to begin real-time person detection.")}</p>
        <Link to="/inspector"><Button><Camera/> Open AI Inspector</Button></Link>
      </div>
    </Card>
    {monitoring.evidence && <Card className="attendance-live-evidence"><div className="card-head"><div><h2>Latest compliance evidence</h2><p>{new Date(monitoring.evidence.timestamp).toLocaleString()} · Centre {monitoring.evidence.centreId}</p></div></div><img src={monitoring.evidence.imageUrl} alt="Locally captured compliance evidence"/><p>{monitoring.evidence.detected} · Confidence {monitoring.evidence.confidence === null ? "not available" : `${Math.round(monitoring.evidence.confidence * 100)}%`}</p></Card>}
  </>;
}
