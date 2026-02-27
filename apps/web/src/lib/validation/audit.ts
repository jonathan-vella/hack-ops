import { z } from "zod";

export const listAuditSchema = z.object({
  action: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  continuationToken: z.string().optional(),
});
