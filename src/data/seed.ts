import type { AppState, Centre } from "../types";

const names = [
  ["anna", "Arignar Anna Skill Academy", "TN-CHN-041", "Chennai", 13.0827, 80.2707, 120, 100, 48, 42, 92],
  ["kaveri", "Kaveri Technical Centre", "TN-TRY-018", "Tiruchirappalli", 10.7905, 78.7047, 88, 99, 54, 48, 87],
  ["vaigai", "Vaigai Training Institute", "TN-MDU-027", "Madurai", 9.9252, 78.1198, 96, 98, 51, 55, 81],
  ["tamira", "Tamiraparani Skills Hub", "TN-TVL-009", "Tirunelveli", 8.7139, 77.7567, 72, 100, 62, 59, 74],
  ["periyar", "Periyar Digital Academy", "TN-CBE-033", "Coimbatore", 11.0168, 76.9558, 104, 88, 90, 91, 18],
  ["nila", "Nila Vocational Centre", "TN-SLM-022", "Salem", 11.6643, 78.146, 84, 84, 86, 88, 22],
  ["marina", "Marina Skills Campus", "TN-CHN-056", "Chennai", 13.0475, 80.2824, 92, 86, 90, 94, 11],
  ["cauvery", "Cauvery Women Skills Centre", "TN-TNJ-014", "Thanjavur", 10.787, 79.1378, 78, 91, 89, 92, 14],
  ["erode", "Erode Future Skills", "TN-ERD-011", "Erode", 11.341, 77.7172, 81, 79, 82, 84, 28],
  ["vellore", "Vellore Career Academy", "TN-VLR-025", "Vellore", 12.9165, 79.1325, 75, 82, 87, 86, 25],
  ["kanchi", "Kanchi Digital Learning", "TN-KPM-016", "Kanchipuram", 12.8342, 79.7036, 69, 77, 79, 81, 29],
  ["pearl", "Pearl City Training Hub", "TN-TUT-020", "Thoothukudi", 8.7642, 78.1348, 73, 89, 88, 90, 16],
] as const;

export const centres: Centre[] = names.map(([id, name, code, district, latitude, longitude, students, attendance, compliance, trust, risk]) => ({
  id, name, code, district, latitude, longitude, geofenceRadius: 150, students, attendance, compliance, trust, risk,
}));

export const requirements = [
  ["chair", "chair", "Chairs", 20, 20, true], ["laptop", "laptop", "Laptop / Computer", 10, 25, true],
  ["tv", "tv", "Monitor", 2, 10, true], ["table", "dining table", "Tables", 5, 10, true],
  ["person", "person", "People capacity", 10, 5, true], ["whiteboard", "whiteboard", "Whiteboard", 1, 10, false],
  ["projector", "projector", "Projector", 1, 8, false], ["extinguisher", "fire extinguisher", "Fire Extinguisher", 1, 12, false],
].map(([id, className, label, required, weight, supported]) => ({ id, className, label, required, weight, supported })) as AppState["requirements"];

export function createSeedState(): AppState {
  return {
    version: 2, role: "authority", centres: structuredClone(centres), requirements: structuredClone(requirements), evidence: [],
    alerts: [
      { id: "a1", centreId: "anna", severity: "Critical", title: "Duplicate evidence", reason: "Image matches an earlier centre submission", stage: "Detected", createdAt: new Date(Date.now() - 120000).toISOString() },
      { id: "a2", centreId: "vaigai", severity: "High", title: "Low-trust inspection", reason: "Location was not verified", stage: "Assigned", assignee: "Inspector Lakshmi", createdAt: new Date(Date.now() - 1080000).toISOString() },
      { id: "a3", centreId: "kaveri", severity: "High", title: "Attendance anomaly", reason: "Near-100% attendance for 30 days", stage: "In Progress", createdAt: new Date(Date.now() - 2200000).toISOString() },
      { id: "a4", centreId: "tamira", severity: "Medium", title: "Missing equipment", reason: "Required computer count not met", stage: "Resolved", createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: "a5", centreId: "kanchi", severity: "Medium", title: "Human verification", reason: "Detection confidence below threshold", stage: "Detected", createdAt: new Date(Date.now() - 10800000).toISOString() },
      { id: "a6", centreId: "nila", severity: "Low", title: "Camera unavailable", reason: "Centre used lower-trust upload path", stage: "Verified", createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    audit: [],
    settings: {
      theme: "light", confidenceThreshold: .8, humanVerification: true, expectedTrainees: 20,
      trustWeights: { aiConfidence: 25, captureSource: 20, timestamp: 15, location: 15, integrity: 10, duplicate: 10, availability: 5 },
      riskWeights: { nonCompliance: 25, lowTrust: 20, duplicate: 17, attendance: 18, alerts: 12, challenges: 8 },
    },
  };
}

export const history = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`, attendance: Math.round(83 + Math.sin(i / 3) * 4), compliance: Math.round(79 + i * .22 + Math.sin(i / 4) * 2),
}));
