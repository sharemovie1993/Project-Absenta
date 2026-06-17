
import { ParentDataService } from '../services/parent-data.service';
import { prisma } from '@/utils/prisma';
import { JenisTap } from '@/constants/enums';
import { AbsensiMode } from '@/constants/enums';

// Mock prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    siswa: { findUnique: jest.fn() },
    tahunPelajaran: { findFirst: jest.fn() },
    semester: { findFirst: jest.fn() },
    absenSiswa: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    absenGerbangSiswa: { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() }
  }
}));

describe('ParentDataService - Attendance Summary', () => {
  let service: ParentDataService;

  beforeEach(() => {
    service = new ParentDataService();
    jest.clearAllMocks();
  });

  test('should return AbsenGerbangSiswa stats when AbsenSiswa is empty', async () => {
    // Setup mocks
    (prisma.siswa.findUnique as jest.Mock).mockResolvedValue({ tenant_id: 't1' });
    (prisma.tahunPelajaran.findFirst as jest.Mock).mockResolvedValue({ id: 'tp1' });
    (prisma.semester.findFirst as jest.Mock).mockResolvedValue({ id: 'sem1' });
    
    (prisma.absenGerbangSiswa.findMany as jest.Mock).mockResolvedValue([
      { status: 'HADIR', is_terlambat: false, waktu_tap: new Date('2026-01-01T07:00:00.000Z'), poin_kehadiran: 100 },
      { status: 'HADIR', is_terlambat: true, waktu_tap: new Date('2026-01-02T07:20:00.000Z'), poin_kehadiran: 50 },
      { status: 'SAKIT', is_terlambat: false, waktu_tap: new Date('2026-01-03T07:00:00.000Z'), poin_kehadiran: 0 }
    ]);

    // Invoke private method
    const summary = await (service as any).getAttendanceSummary('s1');

    // Assertions
    expect(prisma.absenSiswa.findMany).not.toHaveBeenCalled();
    expect(prisma.absenGerbangSiswa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        siswa_id: 's1',
        tahun_pelajaran_id_snapshot: 'tp1',
        arah: JenisTap.GERBANG_DATANG
      })
    }));

    expect(summary).toEqual(expect.objectContaining({
      hadir: 2,
      terlambat: 1,
      sakit: 1,
      total_poin: expect.any(Number)
    }));
  });

  test('should include AbsenSiswa records in MULTI_SESI mode', async () => {
    // Setup mocks
    (prisma.siswa.findUnique as jest.Mock).mockResolvedValue({ tenant_id: 't1' });
    (prisma.tahunPelajaran.findFirst as jest.Mock).mockResolvedValue({ id: 'tp1' });
    (prisma.semester.findFirst as jest.Mock).mockResolvedValue({ id: 'sem1' });
    
    (prisma.absenGerbangSiswa.findMany as jest.Mock).mockResolvedValue([
      { status: 'ALPA', is_terlambat: false, waktu_tap: new Date('2026-01-01T07:00:00.000Z'), poin_kehadiran: 50 }
    ]);

    (prisma.absenSiswa.findMany as jest.Mock).mockResolvedValue([
      { status: 'HADIR', is_terlambat: true, poin_kehadiran: 70, SesiAbsensi: { tanggal: new Date('2026-01-01T00:00:00.000Z') } }
    ]);

    const summary = await (service as any).getAttendanceSummary('s1', AbsensiMode.MULTI_SESI);

    expect(prisma.absenSiswa.findMany).toHaveBeenCalled();
    expect(prisma.absenGerbangSiswa.findMany).toHaveBeenCalled();

    expect(summary).toEqual(expect.objectContaining({
      hadir: 1,
      terlambat: 1,
      total_poin: 70
    }));
  });
});
