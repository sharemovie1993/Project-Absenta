import type { SiswaResponse } from '../siswa.types';
import { siswaDb } from '../repositories/siswa.db';

export async function getSiswaByIdQuery(
  siswaId: string,
  scope: { tenantId: string; org: any }
): Promise<SiswaResponse | null> {
  const { tenantId, org } = scope;
  let whereClause: any = { id: siswaId, tenant_id: tenantId };

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.is_siswa === true) {
    // If requester is a SISWA, allow querying detail for their own record
    if (org.user_id) {
      whereClause.OR = [
        { id: siswaId, user_id: org.user_id },
        { id: siswaId }
      ];
      delete whereClause.id;
    }
  } else if (org && org.tenant_wide !== true) {
    if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
      whereClause.Kelas = {
        jurusan_id: { in: org.unit_ids }
      };
    } else {
      const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
      if (allowed.length > 0) {
        whereClause.kelas_id = { in: allowed };
      } else {
        // No assigned classes, deny access to specific siswa
        return null;
      }
    }
  }

  const siswa = await siswaDb.siswa.findFirst({
    where: whereClause,
    include: {
      User: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
      Kelas: {
        select: {
          id: true,
          nama_kelas: true,
          tingkat: true,
        },
      },
      TahunPelajaran: {
        select: {
          id: true,
          tahun: true,
        },
      },
      Semester: {
        select: {
          id: true,
          nama_semester: true,
        },
      },
      OrangTuaSiswa: {
        select: {
          OrangTua: {
            select: {
              id: true,
              nama: true,
              hubungan: true,
              no_hp: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          AbsenSiswa: true,
          AbsenGerbangSiswa: true,
          SiswaAkademik: true,
          SiswaFaceTemplate: true,
        },
      },
    },
  });

  if (!siswa) return null;

  const formattedSiswa: any = {
    ...(siswa as any),
    OrangTua: ((siswa as any).OrangTuaSiswa || []).map((ots: any) => ots.OrangTua),
    OrangTuaSiswa: undefined,
  };

  // Bidirectional Hydration: Ensure ekskul memberships are hydrated from AnggotaKegiatanEskul
  try {
    const memberships = await siswaDb.anggotaKegiatanEskul.findMany({
      where: {
        tenant_id: tenantId,
        SiswaAkademik: { siswa_id: siswaId }
      },
      include: { JenisKegiatanMaster: true },
      orderBy: { created_at: 'asc' }
    });
    const membershipEskuls = memberships
      .map(m => m.JenisKegiatanMaster?.nama)
      .filter((name): name is string => Boolean(name && name.trim().length > 0));

    const combinedEskuls = Array.from(new Set([
      (formattedSiswa as any).ekskul_1,
      (formattedSiswa as any).ekskul_2,
      ...membershipEskuls
    ])).filter((name): name is string => Boolean(name && name.trim().length > 0));

    (formattedSiswa as any).ekskuls = combinedEskuls;
    if (!formattedSiswa.ekskul_1 && combinedEskuls[0]) {
      formattedSiswa.ekskul_1 = combinedEskuls[0];
    }
    if (!formattedSiswa.ekskul_2 && combinedEskuls[1]) {
      formattedSiswa.ekskul_2 = combinedEskuls[1];
    }
  } catch {
    // Ignore
  }

  // Hydrate Koperasi Member Status
  try {
    const coopMember = await siswaDb.member.findFirst({
      where: {
        tenantId,
        OR: [
          { siswaId: formattedSiswa.id },
          { userId: formattedSiswa.user_id }
        ],
        status: 'ACTIVE'
      }
    });
    (formattedSiswa as any).is_anggota_koperasi = Boolean(coopMember);
  } catch {
    // Ignore
  }

  return formattedSiswa as SiswaResponse;
}
