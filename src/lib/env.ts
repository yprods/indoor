import { z } from "zod";

const envSchema = z.object({
  ADMIN_PIN: z
    .string()
    .min(1, "ADMIN_PIN cannot be empty")
    .optional(),
});

const parsed = envSchema.safeParse({
  ADMIN_PIN: process.env.ADMIN_PIN,
});

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = {
  ADMIN_PIN: parsed.data.ADMIN_PIN ?? "2468",
};

