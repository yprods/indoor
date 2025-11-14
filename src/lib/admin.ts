import { env } from "./env";

const DEFAULT_ADMIN_PIN = env.ADMIN_PIN.trim();

export function validateAdminPin(candidate?: string | null) {
  if (!candidate) {
    return false;
  }
  return candidate.trim() === DEFAULT_ADMIN_PIN;
}

