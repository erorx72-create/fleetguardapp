import { describe, expect, it } from "vitest";
import { finishSubmissionSchema, submissionTypes, validUploadPath } from "@/lib/submission-validation";

describe("manual submissions", () => {
  it("supports CDL, Medical Card, and Annual Inspection", () => {
    expect(submissionTypes).toContain("cdl");
    expect(submissionTypes).toContain("medical_card");
    expect(submissionTypes).toContain("annual_inspection");
  });
  it("accepts optional state for a CDL submission", () => {
    expect(finishSubmissionSchema.safeParse({ token: "a30c6881-2d63-4ff2-b4e0-dc6de1c36412", submissionId: "c4c6639c-cbdd-4aab-ae72-0675cd682fa0" }).success).toBe(true);
  });
  it("rejects driver IDs and guesses in place of valid tokens", () => {
    expect(finishSubmissionSchema.safeParse({ token: "driver-123", submissionId: "c4c6639c-cbdd-4aab-ae72-0675cd682fa0" }).success).toBe(false);
  });
  it("binds upload paths to company, driver, and submission", () => {
    expect(validUploadPath("company/driver/sub/file.pdf", "company", "driver", "sub")).toBe(true);
    expect(validUploadPath("other/driver/sub/file.pdf", "company", "driver", "sub")).toBe(false);
    expect(validUploadPath("company/driver/sub/../file.pdf", "company", "driver", "sub")).toBe(false);
  });
});