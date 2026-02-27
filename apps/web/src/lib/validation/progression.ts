import { z } from "zod";

export const getProgressionSchema = z.object({
  hackathonId: z.string().min(1),
  teamId: z.string().min(1),
});
