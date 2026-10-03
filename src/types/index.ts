export type AISource = "live-model" | "demo";
export type RiskLevel = "Low" | "Medium" | "High";
export type RequirementStatus = "COMPLIANT" | "NON-COMPLIANT" | "REQUIRES HUMAN VERIFICATION" | "NOT ASSESSABLE";
export type AlertStage = "Detected" | "Assigned" | "In Progress" | "Resolved" | "Verified";

export interface Centre {
  id: string; name: string; code: string; district: string; latitude: number; longitude: number;
  geofenceRadius: number; students: number; attendance: number; compliance: number; trust: number; risk: number;
}
export interface Requirement {
  id: string; className: string; label: string; required: number; weight: number; supported: boolean;
}
export interface EvidenceRecord {
  id: string; centreId: string; createdAt: string; source: AISource; captureSource: "camera" | "upload";
  imageKey: string; imageName: string; detections: import("../ai/types").DetectionResult[]; inferenceMs: number;
  compliance: number; complianceStatus: RequirementStatus; trustScore: number; sha256: string; dHash: string;
  duplicateMatch: number; locationStatus: "verified" | "not-verified"; reviewStatus: "pending" | "accepted" | "rejected" | "reinspection";
}
export interface AlertRecord {
  id: string; centreId: string; severity: "Critical" | "High" | "Medium" | "Low"; title: string; reason: string;
  stage: AlertStage; createdAt: string; evidenceId?: string; assignee?: string;
}
export interface AuditEntry {
  id: string; timestamp: string; action: string; entityId: string; detail: string; previousHash: string; hash: string;
}
export interface AppSettings {
  theme: "light" | "dark"; confidenceThreshold: number; humanVerification: boolean;
  expectedTrainees: number;
  trustWeights: Record<string, number>; riskWeights: Record<string, number>;
}
export interface AppState {
  version: 2; role: "authority" | "manager"; centres: Centre[]; requirements: Requirement[];
  evidence: EvidenceRecord[]; alerts: AlertRecord[]; audit: AuditEntry[]; settings: AppSettings;
}
