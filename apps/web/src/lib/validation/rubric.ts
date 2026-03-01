import { z } from "zod";

const rubricCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  maxScore: z.number().int().positive(),
});

export const createRubricSchema = z.object({
  hackathonId: z.string().min(1),
  categories: z.array(rubricCategorySchema).min(1),
});

export const listRubricsSchema = z.object({
  hackathonId: z.string().min(1),
  activeOnly: z.coerce.boolean().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  continuationToken: z.string().optional(),
});
