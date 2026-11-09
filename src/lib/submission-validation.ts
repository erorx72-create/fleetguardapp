import { z } from "zod";

export const submissionTypes = ["cdl", "medical_card", "annual_inspection", "mvr", "drug_test"] as const;
export const finishSubmissionSchema = z.object({
  token: z.string().uuid(),
  submissionId: z.string().uuid(),
  state: z.string().trim().max(80).optional(),
});

export function validUploadPath(path: string, companyId: string, driverId: string, submissionId: string) {
  return path.startsWith(`${companyId}/${driverId}/${submissionId}/`) && !path.includes("..") && path.split("/").length === 4;
}