import { DashboardKaprogStatsService } from './dashboard-kaprog-stats.service';
import { prisma } from '@/utils/prisma';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    tahunPelajaran: {
      findFirst: jest.fn(),
    },
    semester: {
      findFirst: jest.fn(),
    },
    jurusan: {
      findFirst: jest.fn(),
    },
    organizationalAssignment: {
      findFirst: jest.fn(),
    },
    kelas: {
      findMany: jest.fn(),
    },
    guruMapel: {
      findMany: jest.fn(),
    },
    sesiAbsensi: {
      findMany: jest.fn(),
    },
    sarprasAsset: {
      findMany: jest.fn(),
    },
    sarprasLoan: {
      count: jest.fn(),
    },
    absenSiswa: {
      groupBy: jest.fn(),
    },
    siswaAkademik: {
      groupBy: jest.fn(),
    },
    siswa: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/modules/hubin/services/sub/hubin-penilaian.service', () => ({
  HubinPenilaianService: jest.fn().mockImplementation(() => ({
    getKaprogPklSummary: jest.fn().mockResolvedValue({
      tpStatus: { totalMitra: 5, filledMitra: 4, pendingMitra: 1, completionPercentage: 80 },
      penilaianStatus: { totalSiswaPkl: 30, sudahDinilaiDudi: 25, belumDinilaiDudi: 5 },
    }),
  })),
}));

describe('DashboardKaprogStatsService - Real Data Engine', () => {
  let service: DashboardKaprogStatsService;
  const mockTenantId = 'tenant-smk-1';
  const mockUserId = 'user-kaprog-1';

  beforeEach(() => {
    service = new DashboardKaprogStatsService();
    jest.clearAllMocks();
  });

  it('harus mengembalikan struktur data dashboard Kaprog yang lengkap dan valid', async () => {
    (prisma.tahunPelajaran.findFirst as jest.Mock).mockResolvedValue({
      id: 'tp-2025',
      tahun: '2025/2026',
      is_active: true,
    });

    (prisma.semester.findFirst as jest.Mock).mockResolvedValue({
      id: 'sem-1',
      nama: 'Ganjil',
      semester: 1,
      is_active: true,
    });

    (prisma.organizationalAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: 'oa-1',
      unit_id: 'jurusan-tkj',
      Unit: {
        id: 'jurusan-tkj',
        nama: 'Teknik Komputer dan Jaringan',
        singkatan: 'TKJ',
        kode: 'TKJ',
      },
    });

    (prisma.kelas.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'kls-1',
        nama_kelas: 'X TKJ 1',
        tingkat: 10,
        OrganizationalAssignments: [{ User: { full_name: 'Wali Kelas 1' } }],
      },
    ]);

    (prisma.guruMapel.findMany as jest.Mock).mockResolvedValue([
      {
        Guru: { id: 'g-1', nama_guru: 'Guru Jaringan', nip: '123' },
        Mapel: { id: 'm-1', nama_mapel: 'Administrasi Jaringan' },
      },
    ]);

    (prisma.sesiAbsensi.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sesi-1',
        guru_id: 'g-1',
        status: 'BERLANGSUNG',
        waktu_mulai: new Date(),
        Mapel: { nama_mapel: 'Administrasi Jaringan' },
        Kelas: { nama_kelas: 'X TKJ 1' },
      },
    ]);

    (prisma.sarprasAsset.findMany as jest.Mock).mockResolvedValue([
      { id: 'ast-1', nama: 'Mikrotik RB750', kondisi: 'BAIK', jumlah: 5, is_loanable: true },
      { id: 'ast-2', nama: 'Switch Cisco', kondisi: 'RUSAK', jumlah: 1, is_loanable: false },
    ]);

    (prisma.sarprasLoan.count as jest.Mock).mockResolvedValue(2);

    (prisma.absenSiswa.groupBy as jest.Mock).mockResolvedValue([
      { kelas_id_snapshot: 'kls-1', status: 'HADIR', _count: { id: 34 } },
      { kelas_id_snapshot: 'kls-1', status: 'ALFA', _count: { id: 2 } },
    ]);

    (prisma.siswaAkademik.groupBy as jest.Mock).mockResolvedValue([
      { kelas_id: 'kls-1', _count: { id: 36 } },
    ]);

    const result = await service.getKaprogStats(mockTenantId, mockUserId);

    expect(result).toBeDefined();
    expect(result.konteksAkademik.tahunPelajaran.tahun).toBe('2025/2026');
    expect(result.konteksAkademik.semester.nama).toBe('Ganjil');
    expect(result.jurusan.singkatan).toBe('TKJ');
    expect(result.kpi).toBeDefined();
    expect(result.kehadiranKelas).toHaveLength(1);
    expect(result.kehadiranKelas[0].namaKelas).toBe('X TKJ 1');
    expect(result.kehadiranKelas[0].hadirCount).toBe(34);
    expect(result.guruProduktif).toHaveLength(1);
    expect(result.guruProduktif[0].status).toBe('HADIR');
    expect(result.saranaBengkel.totalAlat).toBe(6);
    expect(result.saranaBengkel.rusak).toBe(1);
    expect(result.saranaBengkel.dipinjam).toBe(2);
  });
});
