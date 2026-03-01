import { z } from "zod";

export const createChallengeSchema = z.object({
  hackathonId: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(50000),
  maxScore: z.number().int().positive(),
});

export const updateChallengeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(50000).optional(),
  maxScore: z.number().int().positive().optional(),
});

export const listChallengesSchema = z.object({
  hackathonId: z.string().min(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  continuationToken: z.string().optional(),
});
