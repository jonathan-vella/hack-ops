import { z } from "zod";

export const updateConfigSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const READ_ONLY_KEYS = ["primary-admin"] as const;

export function isReadOnlyKey(key: string): boolean {
  return (READ_ONLY_KEYS as readonly string[]).includes(key);
}
