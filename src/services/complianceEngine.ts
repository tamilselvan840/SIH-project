import type { DetectionResult } from "../ai/types";
import type { Requirement, RequirementStatus } from "../types";

export interface ComplianceResult {
  requirement: Requirement; detected: number; difference: number; meanConfidence: number; status: RequirementStatus;
}
export function evaluateRequirement(requirement: Requirement, detections: DetectionResult[], threshold = .8): ComplianceResult {
  if (!requirement.supported) return { requirement, detected: 0, difference: requirement.required, meanConfidence: 0, status: "NOT ASSESSABLE" };
  const matches = detections.filter((item) => item.className === requirement.className);
  const meanConfidence = matches.length ? matches.reduce((sum, item) => sum + item.confidence, 0) / matches.length : 0;
  let status: RequirementStatus;
  if (matches.length > 0 && meanConfidence < threshold) status = "REQUIRES HUMAN VERIFICATION";
  else status = matches.length >= requirement.required ? "COMPLIANT" : "NON-COMPLIANT";
  return { requirement, detected: matches.length, difference: matches.length - requirement.required, meanConfidence, status };
}
export function evaluateCompliance(requirements: Requirement[], detections: DetectionResult[], threshold = .8) {
  const items = requirements.map((item) => evaluateRequirement(item, detections, threshold));
  const assessable = items.filter((item) => item.status !== "NOT ASSESSABLE");
  const status: RequirementStatus = !assessable.length ? "NOT ASSESSABLE"
    : assessable.some((item) => item.status === "NON-COMPLIANT") ? "NON-COMPLIANT"
      : assessable.some((item) => item.status === "REQUIRES HUMAN VERIFICATION") ? "REQUIRES HUMAN VERIFICATION"
        : items.some((item) => item.status === "NOT ASSESSABLE") ? "NOT ASSESSABLE" : "COMPLIANT";
  const weightedTotal = assessable.reduce((sum, item) => sum + item.requirement.weight, 0);
  const earned = items.reduce((sum, item) => {
    if (item.status === "NOT ASSESSABLE") return sum;
    const ratio = Math.min(1, item.detected / Math.max(1, item.requirement.required));
    return sum + ratio * item.requirement.weight;
  }, 0);
  return { items, status, percentage: weightedTotal ? Math.round(earned / weightedTotal * 100) : 0 };
}
