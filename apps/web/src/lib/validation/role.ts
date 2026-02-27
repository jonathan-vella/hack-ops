import { z } from "zod";

export const inviteRoleSchema = z.object({
  hackathonId: z.string().min(1),
  githubLogin: z.string().min(1).max(39),
  role: z.enum(["admin", "coach"]),
});

export const listRolesSchema = z.object({
  hackathonId: z.string().min(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  continuationToken: z.string().optional(),
});
