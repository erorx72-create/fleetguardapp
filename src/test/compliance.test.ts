import { describe, expect, it } from "vitest";
import { daysUntil, docStatus, safetyScore, statusFromDays, worstStatus } from "@/lib/compliance";

const today = new Date(2026, 10, 8); // Nov 8 2026

describe("traffic-light status rules", () => {
  it("is green (compliant) with more than 30 days left", () => {
    expect(statusFromDays(31)).toBe("compliant");
  });

  it("is yellow (expiring) from 1 to 30 days left", () => {
    expect(statusFromDays(30)).toBe("expiring");
    expect(statusFromDays(1)).toBe("expiring");
  });

  it("is red (expired) at 0 days or overdue", () => {
    expect(statusFromDays(0)).toBe("expired");
    expect(statusFromDays(-12)).toBe("expired");
  });

  it("treats a document with no expiration date as needing action", () => {
    expect(docStatus(null, today)).toBe("missing");
  });

  it("counts calendar days to the expiration date", () => {
    expect(daysUntil("2026-11-20", today)).toBe(12);
    expect(daysUntil("2026-11-03", today)).toBe(-5);
  });
});

describe("rollups", () => {
  it("uses the worst document as the overall status", () => {
    expect(worstStatus(["compliant", "expiring", "compliant"])).toBe("expiring");
    expect(worstStatus(["compliant", "expired", "expiring"])).toBe("expired");
  });

  it("scores the fleet as the share of compliant documents", () => {
    expect(safetyScore(["compliant", "compliant", "expiring", "expired"])).toBe(50);
  });
});
