import { cacheService } from '../../../../../utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../../constants/cache-keys';
import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

async function getAcademicStatistics(tenantId: string) {
  const [totalJurusan, totalKelas, totalGuru, totalSiswa, totalMapel, guruAktif, siswaAktif] = await Promise.all([
    prisma.jurusan.count({ where: { tenant_id: tenantId } }),
    prisma.kelas.count({ where: { tenant_id: tenantId } }),
    prisma.guru.count({ where: { tenant_id: tenantId } }),
    prisma.siswa.count({ where: { tenant_id: tenantId } }),
    prisma.mapel.count({ where: { tenant_id: tenantId } }),
    prisma.guru.count({
      where: {
        tenant_id: tenantId,
        User: { status: 'ACTIVE' }
      }
    }),
    prisma.siswa.count({
      where: {
        tenant_id: tenantId,
        User: { status: 'ACTIVE' }
      }
    })
  ]);

  const rasioGuruSiswa = totalGuru > 0 ? (totalSiswa / totalGuru).toFixed(1) : '0';

  return {
    totalJurusan,
    totalKelas,
    totalGuru,
    totalSiswa,
    totalMapel,
    guruAktif,
    siswaAktif,
    rasioGuruSiswa: `1:${rasioGuruSiswa}`,
    persentaseGuruAktif: totalGuru > 0 ? Math.round((guruAktif / totalGuru) * 100) : 0,
    persentaseSiswaAktif: totalSiswa > 0 ? Math.round((siswaAktif / totalSiswa) * 100) : 0
  };
}

export async function getAcademicDataQuery(tenantId: string) {
  const cacheKey = CACHE_KEYS.TENANT.ACADEMIC(tenantId);

  try {
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const [jurusanData, kelasData, guruData, siswaData, mapelData, academicStats] = await Promise.all([
          prisma.jurusan.findMany({
            where: { tenant_id: tenantId },
            include: {
              Kelas: {
                include: {
                  Siswa: true
                }
              }
            },
            orderBy: { nama: 'asc' }
          }),
          prisma.kelas.findMany({
            where: { tenant_id: tenantId },
            include: {
              Jurusan: true,
              Siswa: true,
              OrganizationalAssignments: {
                where: { is_active: true, Position: { code: 'WALIKELAS' } },
                include: {
                  User: {
                    include: {
                      Guru: true
                    }
                  }
                }
              }
            },
            orderBy: { nama_kelas: 'asc' }
          }),
          prisma.guru.findMany({
            where: { tenant_id: tenantId },
            include: {
              User: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  status: true,
                  organizationalAssignments: {
                    where: { is_active: true, Position: { code: 'WALIKELAS' } }
                  }
                }
              },
              GuruMapel: {
                include: {
                  Mapel: true
                }
              }
            },
            orderBy: { nip: 'asc' }
          }),
          prisma.siswa.findMany({
            where: { tenant_id: tenantId },
            include: {
              User: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  status: true
                }
              },
              Kelas: {
                include: {
                  Jurusan: true
                }
              }
            },
            orderBy: { nis: 'asc' }
          }),
          prisma.mapel.findMany({
            where: { tenant_id: tenantId },
            include: {
              GuruMapel: {
                include: {
                  Guru: {
                    include: {
                      User: {
                        select: {
                          full_name: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: { nama_mapel: 'asc' }
          }),
          getAcademicStatistics(tenantId)
        ]);

        return {
          statistics: academicStats,
          jurusan: (jurusanData as any[]).map((j: any) => ({
            id: j.id,
            nama: j.nama,
            kode: j.kode,
            totalKelas: j.Kelas.length,
            totalSiswa: j.Kelas.reduce((total: number, kelas: any) => total + kelas.Siswa.length, 0),
            created_at: j.created_at
          })),
          kelas: (kelasData as any[]).map((k: any) => ({
            id: k.id,
            nama: k.nama_kelas,
            tingkat: k.tingkat,
            jurusan: k.Jurusan
              ? {
                id: k.Jurusan.id,
                nama: k.Jurusan.nama,
                kode: k.Jurusan.kode
              }
              : null,
            waliKelas: k.OrganizationalAssignments?.[0]
              ? {
                id: k.OrganizationalAssignments[0].id,
                nama: k.OrganizationalAssignments[0].User?.full_name || k.OrganizationalAssignments[0].User?.Guru?.nama_guru || 'Unknown',
                guruId: k.OrganizationalAssignments[0].User?.Guru?.id
              }
              : null,
            totalSiswa: k.Siswa.length,
            created_at: k.created_at
          })),
          guru: (guruData as any[]).map((g: any) => ({
            id: g.id,
            nama: g.User?.full_name || g.nama_guru,
            nip: g.nip,
            email: g.User?.email,
            status: g.User?.status,
            totalKelas: g.User?.organizationalAssignments ? g.User.organizationalAssignments.length : 0,
            totalMapel: g.GuruMapel.length,
            created_at: g.created_at
          })),
          siswa: (siswaData as any[]).map((s: any) => ({
            id: s.id,
            nama: s.User?.full_name || s.nama_siswa,
            nis: s.nis,
            email: s.User?.email,
            kelas: s.Kelas
              ? {
                id: s.Kelas.id,
                nama: s.Kelas.nama_kelas,
                tingkat: s.Kelas.tingkat,
                jurusan: s.Kelas.Jurusan
                  ? {
                    nama: s.Kelas.Jurusan.nama,
                    kode: s.Kelas.Jurusan.kode
                  }
                  : null
              }
              : null,
            status: s.User?.status,
            created_at: s.created_at
          })),
          mapel: (mapelData as any[]).map((m: any) => ({
            id: m.id,
            nama: m.nama_mapel,
            kode: m.kode_mapel,
            tingkat: m.tingkat,
            guru: m.GuruMapel.map((gm: any) => ({
              id: gm.Guru.id,
              nama: gm.Guru.User?.full_name || gm.Guru.nama_guru,
              nip: gm.Guru.nip
            })),
            totalGuru: m.GuruMapel.length,
            created_at: m.created_at
          }))
        };
      },
      CACHE_TTL.ACADEMIC
    );
  } catch (error) {
    console.error('Error getting academic data:', error);
    throw new Error('Gagal mengambil data akademik');
  }
}
