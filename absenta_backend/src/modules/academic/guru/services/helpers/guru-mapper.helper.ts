/**
 * Standard Prisma User select block for Guru queries to prevent duplicate schema definitions.
 */
export const PRISMA_GURU_USER_SELECT = {
  select: {
    id: true,
    email: true,
    full_name: true,
    status: true,
    no_hp: true,
    last_login: true,
    Role: {
      select: {
        id: true,
        name: true,
      },
    },
  },
} as const;

/**
 * Reusable helper to enrich Guru entity with fallback User email and no_hp properties.
 */
export function enrichGuruWithUser(guru: any): any {
  if (!guru) return null;
  if (guru.User) {
    guru.email = guru.email || guru.User.email || null;
    guru.no_hp = guru.no_hp || guru.User.no_hp || null;
    guru.last_login = guru.last_login || guru.User.last_login || null;
  }
  return guru;
}

/**
 * Helper to safely extract YYYY-MM-DD from ISO Date string or Date object.
 */
export function formatDateForStorage(date?: Date | string | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}
