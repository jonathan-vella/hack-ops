import { z } from "zod";

const categoryScoreSchema = z.object({
  categoryId: z.string().min(1),
  score: z.number().int().min(0),
});

export const overrideScoreSchema = z.object({
  categoryScores: z.array(categoryScoreSchema).min(1),
  reason: z.string().min(1).max(2000),
});
