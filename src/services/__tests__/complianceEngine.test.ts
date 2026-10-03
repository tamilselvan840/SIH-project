import { describe, expect, it } from "vitest";
import { evaluateCompliance, evaluateRequirement } from "../complianceEngine";
import type { DetectionResult } from "../../ai/types";
import type { Requirement } from "../../types";

const requirement: Requirement = { id: "chair", className: "chair", label: "Chairs", required: 2, weight: 10, supported: true };
const detection = (confidence: number): DetectionResult => ({ className: "chair", confidence, boundingBox: { x: 0, y: 0, width: 10, height: 10 }, timestamp: "", source: "live-model" });
describe("compliance engine", () => {
  it("marks sufficient confident counts compliant", () => expect(evaluateRequirement(requirement, [detection(.9), detection(.85)]).status).toBe("COMPLIANT"));
  it("marks insufficient counts non-compliant", () => expect(evaluateRequirement(requirement, [detection(.9)]).status).toBe("NON-COMPLIANT"));
  it("routes low confidence to human verification", () => expect(evaluateRequirement(requirement, [detection(.7), detection(.75)]).status).toBe("REQUIRES HUMAN VERIFICATION"));
  it("never assesses an unsupported class", () => expect(evaluateRequirement({ ...requirement, supported: false }, [detection(.99)]).status).toBe("NOT ASSESSABLE"));
  it("keeps an all-unsupported requirement set unassessable", () => expect(evaluateCompliance([{ ...requirement, supported: false }], [detection(.99)]).status).toBe("NOT ASSESSABLE"));
  it("does not certify unsupported required equipment as compliant", () => expect(evaluateCompliance([requirement, { ...requirement, id: "projector", supported: false }], [detection(.99), detection(.99)]).status).toBe("NOT ASSESSABLE"));
});
