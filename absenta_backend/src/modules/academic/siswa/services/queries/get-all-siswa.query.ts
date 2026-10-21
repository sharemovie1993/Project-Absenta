import type { PaginatedSiswaResponse, PaginationParams, SiswaResponse } from '../siswa.types';
import { siswaDb } from '../repositories/siswa.db';
import { CacheService } from '@/utils/cache.service';
import { CACHE_KEYS } from '@/constants/cache-keys';

const cacheService = CacheService.getInstance();

export async function getAllSiswaQuery(
  scope: { tenantId: string; org: any },
  params: PaginationParams
): Promise<PaginatedSiswaResponse> {
  const { tenantId, org } = scope;
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const search = params?.search || '';
  const kelasId = params?.kelas_id || '';
  const status = params?.status || '';
  const gender = params?.gender || '';
  const tingkat = params?.tingkat !== undefined ? String(params.tingkat) : '';
  const jurusanId = params?.jurusan_id || '';
  const tahunPelajaranId = params?.tahun_pelajaran_id || '';
  const semesterId = params?.semester_id || '';

  const isSearchable = !!search || !!params?.user_id || !!tahunPelajaranId || !!semesterId;
  const cacheKey = CACHE_KEYS.ACADEMIC.SISWA_LIST(
    tenantId,
    page,
    limit,
    search,
    kelasId,
    status,
    gender,
    tingkat,
    jurusanId,
    tahunPelajaranId,
    semesterId
  );

  if (!isSearchable) {
    const cached = await cacheService.get<PaginatedSiswaResponse>(cacheKey);
    if (cached) {
      return cached;
    }
  }

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
  const safeStatus = typeof params?.status === 'string' && params.status.trim() !== '' ? params.status.trim() : undefined;
  if (safeStatus) {
    whereClause.status = safeStatus;
  }

  const safeGender = typeof params?.gender === 'string' && params.gender.trim() !== '' ? params.gender.trim() : undefined;
  if (safeGender) {
    whereClause.jenis_kelamin = safeGender;
  }

  const safeTingkat = params?.tingkat !== undefined && String(params.tingkat).trim() !== '' ? Number(params.tingkat) : undefined;
  const safeJurusanId = typeof params?.jurusan_id === 'string' && params.jurusan_id.trim() !== '' ? params.jurusan_id.trim() : undefined;
  const safeTahunPelajaranId = typeof params?.tahun_pelajaran_id === 'string' && params.tahun_pelajaran_id.trim() !== '' ? params.tahun_pelajaran_id.trim() : undefined;
  const safeSemesterId = typeof params?.semester_id === 'string' && params.semester_id.trim() !== '' ? params.semester_id.trim() : undefined;

  // Build kelas filter object
  const kelasFilter: any = {};
  if (safeTingkat !== undefined && !isNaN(safeTingkat)) {
    kelasFilter.tingkat = safeTingkat;
  }
  if (safeKelasId) {
    kelasFilter.id = safeKelasId;
  }

  // Apply Isolate/Scope filter from Organization Engine
  const isElevatedContext = params?.context === 'elevated' && org?.is_elevated_context === true;

  if (org && org.is_siswa === true) {
    // A student can ONLY query their own record
    whereClause.user_id = safeUserId;
  } else if (org && org.tenant_wide !== true && !isElevatedContext) {
    if (safeStatus === 'CALON') {
      // CALON students don't have a class. Filter by direct jurusan_id if unit restricted.
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        whereClause.jurusan_id = { in: org.unit_ids };
      }
    } else {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        const allowedUnits = safeJurusanId
          ? (org.unit_ids.includes(safeJurusanId) ? [safeJurusanId] : [])
          : org.unit_ids;
        kelasFilter.jurusan_id = allowedUnits.length === 1 ? allowedUnits[0] : { in: allowedUnits };
      } else if (safeJurusanId) {
        kelasFilter.jurusan_id = safeJurusanId;
      }

      if (!org.is_unit_restricted) {
        if (safeKelasId) {
          whereClause.kelas_id = safeKelasId;
        } else {
          const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
          if (allowed.length > 0) {
            whereClause.kelas_id = { in: allowed };
          }
        }
      }
    }
  } else {
    if (safeJurusanId) {
      kelasFilter.jurusan_id = safeJurusanId;
    }
    if (safeKelasId) {
      whereClause.kelas_id = safeKelasId;
    }
  }

  // Handle academic year and class filtering
  if (safeTahunPelajaranId) {
    const currentPointerWhere: any = {
      tahun_pelajaran_id: safeTahunPelajaranId,
      ...(safeSemesterId ? { semester_id: safeSemesterId } : {}),
      ...(Object.keys(kelasFilter).length > 0 ? { Kelas: kelasFilter } : {}),
    };

    const historicalSaWhere: any = {
      tahun_pelajaran_id: safeTahunPelajaranId,
      ...(safeSemesterId ? { semester_id: safeSemesterId } : {}),
      ...(Object.keys(kelasFilter).length > 0 ? { kelas: kelasFilter } : {}),
    };

    if (!whereClause.AND) {
      whereClause.AND = [];
    }
    whereClause.AND.push({
      OR: [
        currentPointerWhere,
        { SiswaAkademik: { some: historicalSaWhere } },
      ],
    });
  } else {
    if (Object.keys(kelasFilter).length > 0) {
      whereClause.Kelas = {
        ...(whereClause.Kelas || {}),
        ...kelasFilter,
      };
    }
  }

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
          status: true,
          last_login: true,
        },
      },
      Jurusan: {
        select: {
          id: true,
          nama: true,
          warna: true,
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
        where: safeTahunPelajaranId
          ? {
              tahun_pelajaran_id: safeTahunPelajaranId,
              ...(safeSemesterId ? { semester_id: safeSemesterId } : {}),
            }
          : undefined,
        take: 1,
        select: {
          status: true,
          semester_id: true,
          kelas: {
            select: {
              id: true,
              nama_kelas: true,
              tingkat: true,
            },
          },
          tahunPelajaran: {
            select: {
              id: true,
              tahun: true,
            },
          },
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
      PrestasiSiswa: { select: { poin: true } },
    },
    orderBy: {
      created_at: 'desc',
    },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  const formattedSiswa = siswa.map((s: any) => {
    const historicalAcademic = s.SiswaAkademik?.[0];
    const resolvedKelas = safeTahunPelajaranId && historicalAcademic?.kelas
      ? historicalAcademic.kelas
      : s.Kelas;
    const resolvedTahunPelajaran = safeTahunPelajaranId && historicalAcademic?.tahunPelajaran
      ? historicalAcademic.tahunPelajaran
      : s.TahunPelajaran;

    return {
      ...s,
      Kelas: resolvedKelas,
      TahunPelajaran: resolvedTahunPelajaran,
      OrangTua: (s.OrangTuaSiswa || []).map((ots: any) => ots.OrangTua),
      OrangTuaSiswa: undefined,
      poin_pelanggaran: (s.PelanggaranSiswa || []).reduce((acc: number, curr: any) => acc + curr.poin, 0),
      poin_prestasi: (s.PrestasiSiswa || []).reduce((acc: number, curr: any) => acc + curr.poin, 0),
    };
  });

  const result: PaginatedSiswaResponse = {
    data: formattedSiswa as SiswaResponse[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };

  if (!isSearchable) {
    await cacheService.set(cacheKey, result, 300);
  }

  return result;
}
