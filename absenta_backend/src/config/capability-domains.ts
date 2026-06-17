export type CapabilityDomain =
  | "PLATFORM"
  | "TENANT"
  | "SHARED"
  | "ORGANIZATIONAL";

export const CAPABILITY_DOMAIN_MAP: Record<string, CapabilityDomain> = {};
