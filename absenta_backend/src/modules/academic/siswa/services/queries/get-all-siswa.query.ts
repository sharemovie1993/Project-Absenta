import type { PaginatedSiswaResponse, PaginationParams, SiswaResponse } from '../siswa.types';
import { siswaDb } from '../repositories/siswa.db';

export async function getAllSiswaQuery(
  scope: { tenantId: string; org: any },
  params: PaginationParams
): Promise<PaginatedSiswaResponse> {
  const { tenantId, org } = scope;
  let whereClause: any = { tenant_id: tenantId };

  if (params?.search) {
    const search = String(params.search || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
    const allSearchMappings: Record<string, any> = {
      ...(isUuid ? { id: { id: search } } : {}),
      nama_siswa: { nama_siswa: { contains: search, mode: 'insensitive' } },
      nis: { nis: { contains: search, mode: 'insensitive' } },
      nisn: { nisn: { contains: search, mode: 'insensitive' } },
      no_rfid: { no_rfid: { contains: search, mode: 'insensitive' } },
      email: { User: { email: { contains: search, mode: 'insensitive' } } },
      user_name: { User: { full_name: { contains: search, mode: 'insensitive' } } },
      nama_kelas: { Kelas: { nama_kelas: { contains: search, mode: 'insensitive' } } },
    };

    if (params.searchFields && params.searchFields.length > 0) {
      const whitelisted = params.searchFields.map((f) => f.toLowerCase());
      whereClause.OR = Object.entries(allSearchMappings)
        .filter(([key]) => whitelisted.includes(key))
        .map(([, value]) => value);
    } else {
      whereClause.OR = Object.values(allSearchMappings);
    }

    if (Array.isArray(whereClause.OR) && whereClause.OR.length === 0) {
      delete whereClause.OR;
      whereClause.id = '00000000-0000-4000-8000-000000000000';
    }
  }

  const safeUserId = typeof params?.user_id === 'string' && params.user_id.trim() !== '' ? params.user_id.trim() : undefined;
  if (safeUserId) {
    whereClause.user_id = safeUserId;
  }

  const safeKelasId = typeof params?.kelas_id === 'string' && params.kelas_id.trim() !== '' ? params.kelas_id.trim() : undefined;
  if (safeKelasId) {
    whereClause.kelas_id = safeKelasId;
  }

  const safeStatus = typeof params?.status === 'string' && params.status.trim() !== '' ? params.status.trim() : undefined;
  if (safeStatus) {
    whereClause.status = safeStatus;
  }

  // Apply Isolate/Scope filter from Organization Engine
  const isElevatedContext = params?.context === 'elevated' && org?.is_elevated_context === true;

  if (org && org.tenant_wide !== true && !isElevatedContext) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (allowed.length > 0) {
      if (safeKelasId) {
        if (!allowed.includes(String(safeKelasId))) {
          // Hard reject if requesting unauthorized class
          whereClause.id = '00000000-0000-4000-8000-000000000000';
        }
      } else {
        whereClause.kelas_id = { in: allowed };
      }
    } else {
        // No assigned classes, return empty
        whereClause.id = '00000000-0000-4000-8000-000000000000';
    }
  }

  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const skip = (page - 1) * limit;

  const total = await siswaDb.siswa.count({ where: whereClause });

  const siswa = await siswaDb.siswa.findMany({
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
      SiswaAkademik: {
        take: 1,
        select: {
          status: true,
          semester_id: true,
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
      PelanggaranSiswa: { select: { poin: true } },
      PrestasiSiswa: { select: { poin: true } }
    },
    orderBy: {
      created_at: 'desc',
    },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  const formattedSiswa = siswa.map((s: any) => ({
    ...s,
    OrangTua: (s.OrangTuaSiswa || []).map((ots: any) => ots.OrangTua),
    OrangTuaSiswa: undefined,
    poin_pelanggaran: (s.PelanggaranSiswa || []).reduce((acc: number, curr: any) => acc + curr.poin, 0),
    poin_prestasi: (s.PrestasiSiswa || []).reduce((acc: number, curr: any) => acc + curr.poin, 0),
  }));

  return {
    data: formattedSiswa as SiswaResponse[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
