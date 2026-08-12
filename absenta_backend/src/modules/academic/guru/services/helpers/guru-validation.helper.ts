import { prisma } from '@/utils/prisma';

/**
 * Reusable check for unique NIP within tenant scope.
 */
export async function validateUniqueNip(
  tenantId: string,
  nip?: string | null,
  excludeGuruId?: string
): Promise<void> {
  if (!nip) return;
  const where: any = {
    tenant_id: tenantId,
    nip: nip.trim(),
  };

  if (excludeGuruId) {
    where.id = { not: excludeGuruId };
  }

  const existing = await prisma.guru.findFirst({ where });
  if (existing) {
    throw new Error('NIP already exists in this tenant');
  }
}

/**
 * Reusable check for unique User email within tenant scope.
 */
export async function validateUniqueUserEmail(
  tenantId: string,
  email: string,
  excludeUserId?: string
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const where: any = {
    email: cleanEmail,
    tenant_id: tenantId,
  };

  if (excludeUserId) {
    where.id = { not: excludeUserId };
  }

  const existing = await prisma.user.findFirst({ where });
  if (existing) {
    throw new Error('Email sudah terdaftar untuk pengguna lain');
  }
}
