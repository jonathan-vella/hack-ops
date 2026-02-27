import { z } from "zod";

export const createHackathonSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  teamSize: z.number().int().min(2).max(20).optional(),
});

export const updateHackathonSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  teamSize: z.number().int().min(2).max(20).optional(),
});

export const assignTeamsSchema = z.object({
  teamSize: z.number().int().min(2).max(20).optional(),
});
