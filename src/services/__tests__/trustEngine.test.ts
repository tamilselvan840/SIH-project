import { describe, expect, it } from "vitest";
import { appendAudit, hashSimilarity, verifyAudit } from "../trustEngine";
describe("trust engine", () => {
  it("identifies identical dHashes", () => expect(hashSimilarity("ffffffffffffffff", "ffffffffffffffff")).toBe(100));
  it("verifies the append-only chain and detects edits", async () => {
    let log = await appendAudit([], "upload", "e1", "stored");
    log = await appendAudit(log, "detect", "e1", "five objects");
    expect(await verifyAudit(log)).toBe(true);
    expect(await verifyAudit(log.map((entry, index) => index ? { ...entry, detail: "edited" } : entry))).toBe(false);
  });
});
