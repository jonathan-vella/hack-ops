import { z } from "zod";

export const createSubmissionSchema = z.object({
  challengeId: z.string().min(1),
  description: z.string().min(1).max(10000),
  attachments: z.array(z.string().url()).optional(),
});

const categoryScoreSchema = z.object({
  categoryId: z.string().min(1),
  score: z.number().int().min(0),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reason: z.string().min(1).max(2000),
  scores: z.array(categoryScoreSchema).optional(),
});

export const listSubmissionsSchema = z.object({
  hackathonId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  teamId: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  continuationToken: z.string().optional(),
});
