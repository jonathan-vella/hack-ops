import { z } from "zod";

export const reassignSchema = z.object({
  hackerId: z.string().min(1),
  targetTeamId: z.string().min(1),
});
