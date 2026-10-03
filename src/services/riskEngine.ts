import type { AlertRecord, Centre, EvidenceRecord } from "../types";

export function calculateRisk(centre: Centre, evidence: EvidenceRecord[], alerts: AlertRecord[], weights: Record<string, number>) {
  const latest = evidence.filter((item) => item.centreId === centre.id).at(0);
  const inputs = {
    nonCompliance: 1 - centre.compliance / 100,
    lowTrust: 1 - (latest?.trustScore ?? centre.trust) / 100,
    duplicate: latest && latest.duplicateMatch >= 90 ? 1 : centre.id === "anna" ? 1 : 0,
    attendance: centre.attendance >= 98 ? 1 : 0,
    alerts: Math.min(1, alerts.filter((item) => item.centreId === centre.id && item.stage !== "Verified").length / 2),
    challenges: 0,
  };
  const reasons = Object.entries(inputs).map(([key, value]) => ({ key, points: Math.round(value * (weights[key] || 0)) })).filter((item) => item.points > 0).sort((a, b) => b.points - a.points);
  const calculated = Math.min(100, reasons.reduce((sum, item) => sum + item.points, 0));
  return { score: Math.max(centre.risk, calculated), reasons };
}
