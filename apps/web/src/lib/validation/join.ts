import { z } from "zod";

export const joinSchema = z.object({
  eventCode: z.string().regex(/^\d{4}$/, "Event code must be exactly 4 digits"),
});
