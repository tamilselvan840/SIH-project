import type { DetectionResult } from "../ai/types";
import type { RequirementStatus } from "../types";

export interface MonitoringEvidence {
  imageUrl: string;
  timestamp: string;
  centreId: string;
  detected: string;
  confidence: number | null;
}

export interface MonitoringSnapshot {
  cameraStatus: "idle" | "active" | "error";
  peopleDetected: number | null;
  expectedTrainees: number;
  attendancePercentage: number | null;
  infrastructureStatus: RequirementStatus | "NOT ASSESSABLE";
  compliancePercentage: number | null;
  activeAlerts: number;
  detections: DetectionResult[];
  evidence: MonitoringEvidence | null;
  message?: string;
}

let snapshot: MonitoringSnapshot = {
  cameraStatus: "idle",
  peopleDetected: null,
  expectedTrainees: 20,
  attendancePercentage: null,
  infrastructureStatus: "NOT ASSESSABLE",
  compliancePercentage: null,
  activeAlerts: 0,
  detections: [],
  evidence: null,
};
const listeners = new Set<(value: MonitoringSnapshot) => void>();

export function getMonitoringSnapshot() { return snapshot; }
export function publishMonitoringSnapshot(next: MonitoringSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener(snapshot));
}
export function subscribeMonitoringSnapshot(listener: (value: MonitoringSnapshot) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
