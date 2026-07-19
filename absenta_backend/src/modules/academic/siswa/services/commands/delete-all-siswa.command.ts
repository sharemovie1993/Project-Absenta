import { siswaDb } from '../repositories/siswa.db';

export async function deleteAllSiswaCommand(tenantId: string): Promise<{ count: number }> {
  // Step 1: Fetch siswa IDs and user IDs for this tenant
  const siswas = await siswaDb.siswa.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, user_id: true },
  });

  if (siswas.length === 0) {
    return { count: 0 };
  }

  const siswaIds = siswas.map((s: any) => s.id);
  const userIds = siswas.map((s: any) => s.user_id).filter((id: any): id is string => !!id);
  const count = siswaIds.length;

  // Step 2: Delete all related records using raw SQL in a single fast transaction.
  // Table names verified directly from database FK constraint query.
  // Order: child tables first (RESTRICT FK), then parent (Siswa).
  await siswaDb.$transaction(
    async (tx: any) => {
      // --- RESTRICT FK tables (must be deleted before Siswa) ---
      await tx.$executeRawUnsafe(`DELETE FROM "AbsenGerbangSiswa" WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "AsesmenSiswa"      WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "HomeVisit"          WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "KasusBK"            WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "KonselingSiswa"     WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "PelanggaranSiswa"   WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "PemanggilanOrangTua" WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "PrestasiSiswa"      WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "RujukanKasus"       WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "SiswaFaceTemplate"  WHERE "siswa_id" = ANY($1::text[])`, siswaIds);

      // --- SET NULL FK tables: delete by siswa_id OR by siswa_akademik_id reference ---
      // AbsenSiswa has two FKs: siswa_id (SET NULL) and siswa_akademik_id (RESTRICT via SiswaAkademik).
      // Records with siswa_id=NULL but still referencing SiswaAkademik must also be cleaned up.
      await tx.$executeRawUnsafe(
        `DELETE FROM "AbsenSiswa"
         WHERE "siswa_id" = ANY($1::text[])
            OR "siswa_akademik_id" IN (
              SELECT id FROM "SiswaAkademik" WHERE "siswa_id" = ANY($1::text[])
            )`,
        siswaIds
      );

      // --- CASCADE FK tables (auto-deleted by DB, but explicit is safer & faster) ---
      await tx.$executeRawUnsafe(`DELETE FROM "OrangTuaSiswa" WHERE "siswa_id" = ANY($1::text[])`, siswaIds);
      await tx.$executeRawUnsafe(`DELETE FROM "SiswaAkademik" WHERE "siswa_id" = ANY($1::text[])`, siswaIds);

      // --- Finally delete the main Siswa records ---
      await tx.$executeRawUnsafe(`DELETE FROM "Siswa" WHERE "tenant_id" = $1`, tenantId);
    },
    { timeout: 120000 } // 2 minute timeout for large datasets
  );

  // Step 3: Clean up associated user accounts (outside transaction, non-critical)
  if (userIds.length > 0) {
    try {
      await siswaDb.$executeRawUnsafe(
        `DELETE FROM "User" WHERE "id" = ANY($1::text[]) AND "tenant_id" = $2`,
        userIds,
        tenantId
      );
    } catch (error) {
      console.error('Failed to batch delete associated users:', error);
    }
  }

  return { count };
}
