import { UnitPengajaranService, KurikulumPolicyError } from '../unit-pengajaran.service';
import { JadwalValidationService } from '@/modules/jadwal/services/jadwal-validation.service';
import { RekapKBMController } from '@/modules/kurikulum/controllers/rekap-kbm.controller';
import { AscImporterService } from '@/modules/academic/asc-importer/services/asc-importer.service';
import { NilaiCrudService } from '@/modules/rapor/services/sub/nilai-crud.service';
import { CbtBankSoalService } from '@/modules/cbt/services/cbt-bank-soal.service';
import { CbtJadwalService } from '@/modules/cbt/services/cbt-jadwal.service';
import { prisma } from '@/utils/prisma';

const mockTx: any = {
  role: { findFirst: jest.fn() },
  guru: { findFirst: jest.fn(), create: jest.fn() },
  user: { create: jest.fn() },
  kelas: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  jurusan: { findFirst: jest.fn() },
  mapel: { findFirst: jest.fn(), create: jest.fn() },
  jadwalKBM: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
  jadwalKontrakKbm: { deleteMany: jest.fn(), createMany: jest.fn() },
  sesiAbsensi: { findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  absenGuru: { deleteMany: jest.fn() },
  absenSiswa: { deleteMany: jest.fn() },
  nilaiSiswa: { updateMany: jest.fn(), upsert: jest.fn() },
  progresMateri: { deleteMany: jest.fn() },
  guruMapel: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  unitPengajaran: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  cbtBankSoalKontributor: { deleteMany: jest.fn(), upsert: jest.fn() },
  cbtSoal: { create: jest.fn(), count: jest.fn() },
  cbtBankSoal: { update: jest.fn() },
  ascImportLog: { create: jest.fn() },
};

jest.mock('@/utils/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx);
      return Promise.all(arg);
    }),
    config: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    tahunPelajaran: { findFirst: jest.fn() },
    semester: { findFirst: jest.fn() },
    guru: { findFirst: jest.fn(), findMany: jest.fn() },
    kelas: { findFirst: jest.fn(), findMany: jest.fn() },
    jurusan: { findMany: jest.fn().mockResolvedValue([]) },
    mapel: { findMany: jest.fn() },
    guruMapel: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    unitPengajaran: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    strukturKurikulum: { findFirst: jest.fn(), findMany: jest.fn() },
    jadwalKBM: { findFirst: jest.fn(), findMany: jest.fn() },
    jadwalKontrakKbm: { findFirst: jest.fn(), findMany: jest.fn() },
    jadwalKbm: { findMany: jest.fn() },
    sesiAbsensi: { findMany: jest.fn() },
    siswaAkademik: { upsert: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
    nilaiSiswa: { upsert: jest.fn() },
    cbtBankSoal: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    cbtBankSoalKontributor: { findFirst: jest.fn(), findMany: jest.fn() },
    cbtSoal: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    cbtJadwalUjian: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    cbtPesertaUjian: { findMany: jest.fn(), count: jest.fn() },
    redis: null,
  },
}));

jest.mock('@/utils/cache.service', () => {
  const instance = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    getOrSet: jest.fn(async (_k: string, fn: () => Promise<any>) => fn()),
    del: jest.fn().mockResolvedValue(undefined),
  };
  return {
    CacheService: {
      getInstance: jest.fn(() => instance),
    },
    cacheService: instance,
  };
});

jest.mock('@/utils/cache-invalidation.service', () => ({
  cacheInvalidationService: {
    invalidateBebanGuruCache: jest.fn().mockResolvedValue(undefined),
    invalidateJadwalKbmCache: jest.fn().mockResolvedValue(undefined),
    invalidateRaporCache: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/infra/redis/redisClient', () => ({
  getRedisConnection: jest.fn(() => null),
}));

describe('Arsitektur Kurikulum Multi-Skenario End-to-End Logic', () => {
  const TENANT = 'tenant-1';
  const TP_ID = 'tp-2026';
  const SEM_ID = 'sem-ganjil';

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.tahunPelajaran.findFirst as jest.Mock).mockResolvedValue({
      id: TP_ID,
      tahun: '2026/2027',
      is_active: true,
    });
    (prisma.semester.findFirst as jest.Mock).mockResolvedValue({
      id: SEM_ID,
      nama_semester: 'Ganjil',
      is_active: true,
    });
    (prisma.strukturKurikulum.findFirst as jest.Mock).mockResolvedValue({ jp_per_minggu: 6 });
  });

  // ── 1. Multi-Tenant Mid-Semester Mode Policy & UnitPengajaran Integrity ──
  describe('1. UnitPengajaranService & Multi-Tenant Mid-Semester Policy', () => {
    const unitService = new UnitPengajaranService();

    const makeGmFixture = (mode: 'SINGLE' | 'COLLABORATION', unitCounts: Array<{ sesi: number; jadwal: number; cbt: number }>) => ({
      id: 'gm-1',
      tenant_id: TENANT,
      guru_id: 'guru-sk',
      mapel_id: 'mapel-inf',
      kelas_id: 'kelas-10a',
      jurusan_id: 'jur-dkv',
      tahun_pelajaran_id: TP_ID,
      semester_id: SEM_ID,
      teaching_mode: mode,
      Kelas: { id: 'kelas-10a', jurusan_id: 'jur-dkv' },
      UnitPengajaran: unitCounts.map((c, idx) => ({
        id: `unit-hist-${idx + 1}`,
        nama_unit: mode === 'SINGLE' && idx === 0 ? null : `Unit ${idx + 1}`,
        guru_id: idx === 0 ? 'guru-sk' : 'guru-2',
        jp_alokasi: 2,
        target_sumatif_slot: idx + 1,
        is_active: true,
        _count: { SesiAbsensi: c.sesi, JadwalKBM: c.jadwal, CbtSoal: c.cbt },
      })),
    });

    it('menolak transisi SINGLE -> COLLABORATION dengan MID_SEMESTER_MODE_LOCKED jika policy tenant mengunci tengah semester', async () => {
      (prisma.guruMapel.findFirst as jest.Mock).mockResolvedValue(
        makeGmFixture('SINGLE', [{ sesi: 3, jadwal: 2, cbt: 0 }])
      );
      (prisma.config.findFirst as jest.Mock).mockResolvedValue({ value: 'true' });

      await expect(
        unitService.switchTeachingMode(TENANT, 'gm-1', {
          teaching_mode: 'COLLABORATION',
          units: [
            { nama_unit: 'Desain Grafis', guru_id: 'guru-sk', jp_alokasi: 2 },
            { nama_unit: 'Animasi 2D', guru_id: 'guru-2', jp_alokasi: 2 },
          ],
        })
      ).rejects.toMatchObject<Partial<KurikulumPolicyError>>({
        code: 'MID_SEMESTER_MODE_LOCKED',
        statusCode: 409,
      });
    });

    it('meminta konfirmasi MID_SEMESTER_CONFIRM_REQUIRED jika policy lock OFF, lalu berhasil memelihara Unit 1 saat confirmMidSemesterSplit = true', async () => {
      (prisma.guruMapel.findFirst as jest.Mock).mockResolvedValue(
        makeGmFixture('SINGLE', [{ sesi: 2, jadwal: 1, cbt: 0 }])
      );
      (prisma.config.findFirst as jest.Mock).mockResolvedValue({ value: 'false' });
      (prisma.guru.findMany as jest.Mock).mockResolvedValue([{ id: 'guru-sk' }, { id: 'guru-2' }]);

      await expect(
        unitService.switchTeachingMode(TENANT, 'gm-1', {
          teaching_mode: 'COLLABORATION',
          units: [
            { id: 'unit-hist-1', nama_unit: 'Desain Grafis', guru_id: 'guru-sk', jp_alokasi: 2 },
            { nama_unit: 'Animasi 2D', guru_id: 'guru-2', jp_alokasi: 2 },
          ],
        })
      ).rejects.toMatchObject<Partial<KurikulumPolicyError>>({
        code: 'MID_SEMESTER_CONFIRM_REQUIRED',
        statusCode: 409,
      });

      mockTx.unitPengajaran.update.mockResolvedValue({ id: 'unit-hist-1' });
      mockTx.unitPengajaran.create.mockResolvedValue({ id: 'unit-new-2' });
      mockTx.guruMapel.findFirst.mockResolvedValue({
        id: 'gm-1',
        UnitPengajaran: [
          { id: 'unit-hist-1', nama_unit: 'Desain Grafis', guru_id: 'guru-sk', jp_alokasi: 2, is_active: true },
          { id: 'unit-new-2', nama_unit: 'Animasi 2D', guru_id: 'guru-2', jp_alokasi: 2, is_active: true },
        ],
      });
      (prisma.cbtBankSoal.findMany as jest.Mock).mockResolvedValue([]);

      const res = await unitService.switchTeachingMode(TENANT, 'gm-1', {
        teaching_mode: 'COLLABORATION',
        confirmMidSemesterSplit: true,
        units: [
          { id: 'unit-hist-1', nama_unit: 'Desain Grafis', guru_id: 'guru-sk', jp_alokasi: 2 },
          { nama_unit: 'Animasi 2D', guru_id: 'guru-2', jp_alokasi: 2 },
        ],
      });

      expect(mockTx.unitPengajaran.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'unit-hist-1' },
          data: expect.objectContaining({ nama_unit: 'Desain Grafis' }),
        })
      );
      expect(mockTx.unitPengajaran.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nama_unit: 'Animasi 2D', guru_id: 'guru-2' }),
        })
      );
      expect(res.guru_mapel?.UnitPengajaran).toHaveLength(2);
    });

    it('menolak COLLABORATION -> SINGLE (COLLABORATION_DOWNGRADE_BLOCKED) bila > 1 unit punya riwayat aktif', async () => {
      (prisma.guruMapel.findFirst as jest.Mock).mockResolvedValue(
        makeGmFixture('COLLABORATION', [
          { sesi: 4, jadwal: 1, cbt: 0 },
          { sesi: 3, jadwal: 1, cbt: 0 },
        ])
      );
      (prisma.config.findFirst as jest.Mock).mockResolvedValue({ value: 'false' });

      await expect(
        unitService.switchTeachingMode(TENANT, 'gm-1', { teaching_mode: 'SINGLE' })
      ).rejects.toMatchObject<Partial<KurikulumPolicyError>>({
        code: 'COLLABORATION_DOWNGRADE_BLOCKED',
        statusCode: 409,
      });
    });
  });

  // ── 2. Delegasi Guru & Akuntansi SK Resmi vs Pelaksana Riil ──
  describe('2. JadwalValidationService & RekapKBMController (Delegasi)', () => {
    it('mendeteksi bentrok jadwal berdasarkan Effective Teacher (guru_pelaksana_id)', async () => {
      const validation = new JadwalValidationService();
      (prisma.jadwalKBM.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Class conflict check
        .mockResolvedValueOnce({
          id: 'jk-existing',
          Kelas: { nama_kelas: 'XI RPL 1' },
          Mapel: { nama_mapel: 'Produktif RPL' },
        }); // Effective teacher conflict check

      const result = await validation.validateConflict({
        tenant_id: TENANT,
        tahun_pelajaran_id: TP_ID,
        semester_id: SEM_ID,
        kelas_id: 'kelas-10a',
        guru_id: 'guru-sk',
        guru_pelaksana_id: 'guru-pelaksana',
        hari: 'SENIN',
        jam_mulai: '07:00',
        jam_selesai: '07:45',
        slot_index: 1,
      });

      expect(result.is_valid).toBe(false);
      expect(result.error?.code).toBe('GURU_CONFLICT');
      expect(prisma.jadwalKBM.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ guru_pelaksana_id: 'guru-pelaksana' }]),
          }),
        })
      );
    });

    it('memisahkan JTM SK Resmi (pemilik SK) vs JTM Pelaksana Riil & sesi terlaksana pada Rekap KBM', async () => {
      (prisma.jadwalKBM.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'jk-1',
          guru_pelaksana_id: 'guru-pelaksana',
          unit_pengajaran_id: 'unit-1',
          Guru: { id: 'guru-sk', nama_guru: 'Pak Budi SK', nip: '111' },
          GuruPelaksana: { id: 'guru-pelaksana', nama_guru: 'Bu Siti Pelaksana', nip: '222' },
          UnitPengajaran: { id: 'unit-1', nama_unit: 'Desain Grafis', jp_alokasi: 2, Guru: { id: 'guru-sk', nama_guru: 'Pak Budi SK', nip: '111' } },
          Mapel: { id: 'm-1', nama_mapel: 'Informatika' },
          Kelas: { id: 'k-1', nama_kelas: 'X DKV 1', tingkat: 10 },
        },
      ]);
      (prisma.guruMapel.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.strukturKurikulum.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sesiAbsensi.findMany as jest.Mock).mockResolvedValue([
        { guru_id: 'guru-sk', guru_pelaksana_id: 'guru-pelaksana', slot_kbm: 2 },
      ]);

      const sendMock = jest.fn();
      const reply = { status: jest.fn(() => ({ send: sendMock })), send: sendMock };
      await RekapKBMController.getAll(
        { tenantId: TENANT, query: { tahun_pelajaran_id: TP_ID, semester_id: SEM_ID }, log: { error: jest.fn() } },
        reply
      );

      expect(sendMock).toHaveBeenCalledTimes(1);
      const rows = sendMock.mock.calls[0][0].data;
      const skRow = rows.find((r: any) => r.guru_id === 'guru-sk');
      const pelaksanaRow = rows.find((r: any) => r.guru_id === 'guru-pelaksana');

      expect(skRow.total_jp_sk_resmi).toBe(1);
      expect(skRow.total_jp_delegasi_keluar).toBe(1);
      expect(skRow.jp_terlaksana).toBe(0);

      expect(pelaksanaRow.total_jp_dijadwalkan).toBe(1);
      expect(pelaksanaRow.total_jp_delegasi_masuk).toBe(1);
      expect(pelaksanaRow.total_jp_rencana).toBe(2);
      expect(pelaksanaRow.jp_terlaksana).toBe(2);
    });
  });

  // ── 3. aSc TimeTables XML Importer (Versi Dapodik + History + Re-import Preserving Unit ID) ──
  describe('3. AscImporterService (Versi Dapodik)', () => {
    const sampleXml = `
      <timetable>
        <daysdefs><daysdef id="d1" name="Senin" short="Sn" days="10000"/></daysdefs>
        <periods><period period="2" name="Jam 1" starttime="07:00" endtime="07:45"/></periods>
        <teachers>
          <teacher id="t1" name="Pak SK"/>
          <teacher id="t2" name="Bu Pelaksana"/>
        </teachers>
        <classes><class id="c1" name="X DKV 1"/></classes>
        <subjects><subject id="s1" name="Desain Grafis" short="DG"/></subjects>
        <lessons>
          <lesson id="l1" classids="c1" subjectid="s1" teacherids="t1" periodspercard="1" periodsperweek="2"/>
        </lessons>
        <cards>
          <card lessonid="l1" day="d1" period="2" days="10000"/>
        </cards>
      </timetable>
    `;

    it('menyarankan UNIT_OF_PARENT saat analyzeAscXml menemukan riwayat/unit dari Mapel Induk Dapodik', async () => {
      (prisma.guru.findMany as jest.Mock).mockResolvedValue([
        { id: 'guru-sk', nama_guru: 'Pak SK', nip: null, asc_id: null },
        { id: 'guru-2', nama_guru: 'Bu Pelaksana', nip: null, asc_id: null },
      ]);
      (prisma.kelas.findMany as jest.Mock).mockResolvedValue([{ id: 'k-1', nama_kelas: 'X DKV 1', asc_id: null }]);
      (prisma.mapel.findMany as jest.Mock).mockResolvedValue([
        { id: 'mapel-dkv', nama_mapel: 'Dasar-Dasar DKV', kode_mapel: 'DDKV', asc_id: null },
      ]);
      (prisma.config.findFirst as jest.Mock).mockResolvedValue({
        value: JSON.stringify({
          subjects: {
            [(AscImporterService as any).normalizeName('Desain Grafis')]: {
              action: 'UNIT_OF_PARENT',
              target_id: 'mapel-dkv',
              parent_mapel_id: 'mapel-dkv',
              unit_name: 'Desain Grafis',
            },
          },
          lessons: {},
        }),
      });

      const analysis = await AscImporterService.analyzeAscXml(TENANT, sampleXml);
      expect(analysis.subjects[0]).toMatchObject({
        asc_id: 's1',
        saved_action: 'UNIT_OF_PARENT',
        saved_parent_mapel_id: 'mapel-dkv',
        saved_unit_name: 'Desain Grafis',
      });
      expect(analysis.db_subjects).toHaveLength(1);
    });

    it('executeAscImport memetakan UNIT_OF_PARENT ke Mapel Induk Dapodik, mereuse UnitPengajaran.id lama, dan mencatat guru_pelaksana_id', async () => {
      mockTx.role.findFirst.mockResolvedValue({ id: 'role-guru' });
      mockTx.mapel.findFirst.mockResolvedValue({ id: 'mapel-dkv' });
      mockTx.jadwalKBM.findMany.mockResolvedValue([]);
      mockTx.sesiAbsensi.findMany.mockResolvedValue([]);
      mockTx.sesiAbsensi.updateMany.mockResolvedValue({ count: 0 });
      mockTx.jadwalKBM.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.jadwalKontrakKbm.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.kelas.findMany.mockResolvedValue([{ id: 'k-1', jurusan_id: 'jur-dkv' }]);

      // Simulasi re-import: UnitPengajaran.id lama ditemukan & harus di-update in-place
      mockTx.guruMapel.findFirst.mockResolvedValue({
        id: 'gm-existing',
        UnitPengajaran: [
          { id: 'unit-existing-uuid', nama_unit: 'Desain Grafis', guru_id: 'guru-sk', target_sumatif_slot: 1 },
        ],
      });
      mockTx.guruMapel.update.mockResolvedValue({
        id: 'gm-existing',
        UnitPengajaran: [
          { id: 'unit-existing-uuid', nama_unit: 'Desain Grafis', guru_id: 'guru-sk', target_sumatif_slot: 1 },
        ],
      });
      mockTx.unitPengajaran.update.mockResolvedValue({ id: 'unit-existing-uuid' });
      mockTx.jadwalKontrakKbm.createMany.mockResolvedValue({ count: 1 });
      mockTx.jadwalKBM.createMany.mockResolvedValue({ count: 1 });
      mockTx.ascImportLog.create.mockResolvedValue({ id: 'log-1' });
      (prisma.jurusan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.config.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cbtBankSoal.findMany as jest.Mock).mockResolvedValue([]);

      const res = await AscImporterService.executeAscImport(TENANT, {
        tahun_pelajaran_id: TP_ID,
        semester_id: SEM_ID,
        filename: 'timetable-dapodik.xml',
        xml_content: sampleXml,
        teacher_mappings: [
          { asc_id: 't1', name: 'Pak SK', action: 'MATCH', target_id: 'guru-sk' },
          { asc_id: 't2', name: 'Bu Pelaksana', action: 'MATCH', target_id: 'guru-2' },
        ],
        class_mappings: [{ asc_id: 'c1', name: 'X DKV 1', action: 'MATCH', target_id: 'k-1' }],
        subject_mappings: [
          {
            asc_id: 's1',
            name: 'Desain Grafis',
            action: 'UNIT_OF_PARENT',
            target_id: 'mapel-dkv',
            parent_mapel_id: 'mapel-dkv',
            unit_name: 'Desain Grafis',
          },
        ],
        lesson_mappings: [
          {
            asc_lesson_id: 'l1',
            sk_guru_id: 'guru-sk',
            guru_pelaksana_id: 'guru-2',
            unit_name: 'Desain Grafis',
            target_sumatif_slot: 2,
          },
        ],
      });

      expect(mockTx.unitPengajaran.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'unit-existing-uuid' },
          data: expect.objectContaining({ nama_unit: 'Desain Grafis', target_sumatif_slot: 2 }),
        })
      );
      expect(mockTx.unitPengajaran.create).not.toHaveBeenCalled();
      expect(mockTx.jadwalKBM.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              mapel_id: 'mapel-dkv',
              guru_id: 'guru-sk',
              guru_pelaksana_id: 'guru-2',
              unit_pengajaran_id: 'unit-existing-uuid',
            }),
          ]),
        })
      );
      expect(res.summary.total_mapel_unit_of_parent).toBe(1);
      expect(res.summary.total_delegated_lessons).toBe(1);
    });
  });

  // ── 4. Rapor sumatif_4 Non-Breaking Averaging ──
  describe('4. NilaiCrudService sumatif_4 Averaging', () => {
    it('menjaga rata-rata 3 sumatif tetap membagi 3 bila sumatif_4 null, dan membagi 4 bila sumatif_4 diisi', async () => {
      (prisma.config.findFirst as jest.Mock).mockResolvedValue({ value: 'FORMULA_SUMATIF' });
      (prisma.siswaAkademik.upsert as jest.Mock).mockResolvedValue({ id: 'sa-1' });
      (prisma.nilaiSiswa.upsert as jest.Mock).mockImplementation((args: any) => Promise.resolve(args.create));

      await NilaiCrudService.upsertBatchSumatifNilai(TENANT, {
        kelas_id: 'k-1',
        mapel_id: 'm-1',
        tahun_pelajaran_id: TP_ID,
        semester_id: SEM_ID,
        scores: [
          {
            siswa_id: 'siswa-3slot',
            sumatif_1: 80,
            sumatif_2: 90,
            sumatif_3: 85,
            sumatif_4: null,
            nilai_akhir_sumatif: 90,
          },
          {
            siswa_id: 'siswa-4slot',
            sumatif_1: 80,
            sumatif_2: 90,
            sumatif_3: 85,
            sumatif_4: 95,
            nilai_akhir_sumatif: 90,
          },
        ],
      });

      const calls = (prisma.nilaiSiswa.upsert as jest.Mock).mock.calls;
      const call3 = calls.find((c: any[]) => c[0].create.siswa_id === 'siswa-3slot')[0];
      const call4 = calls.find((c: any[]) => c[0].create.siswa_id === 'siswa-4slot')[0];

      // (80+90+85)/3 = 85; final = (85+90)/2 = 87.5
      expect(call3.create.sumatif_4).toBeNull();
      expect(call3.create.rata_rata_sumatif).toBe(85);
      expect(call3.create.nilai_rapor_final).toBe(87.5);

      // (80+90+85+95)/4 = 87.5; final = (87.5+90)/2 = 88.75
      expect(call4.create.sumatif_4).toBe(95);
      expect(call4.create.rata_rata_sumatif).toBe(87.5);
      expect(call4.create.nilai_rapor_final).toBe(88.75);
    });
  });

  // ── 5. CBT Collaboration Contributors, Per-Unit Soal & Score Breakdown ──
  describe('5. CbtBankSoalService & CbtJadwalService (Kolaborasi & Unit Breakdown)', () => {
    it('auto-registrasi guru UnitPengajaran & guru_pelaksana_id ke CbtBankSoalKontributor dan memberi izin createQuestion', async () => {
      (prisma.cbtBankSoal.findFirst as jest.Mock).mockResolvedValue({
        id: 'bank-1',
        tenant_id: TENANT,
        guru_id: 'guru-koord',
        mapel_id: 'mapel-dkv',
        tahun_pelajaran_id: TP_ID,
        semester_id: SEM_ID,
        unit_pengajaran_id: null,
        Mapel: { id: 'mapel-dkv', nama_mapel: 'Dasar DKV', kode_mapel: 'DDKV' },
        UnitPengajaran: null,
        Kontributor: [{ id: 'c1', bank_soal_id: 'bank-1', guru_id: 'guru-unit-2', unit_pengajaran_id: 'unit-2', can_edit_soal: true }],
      });
      (prisma.unitPengajaran.findMany as jest.Mock).mockResolvedValue([
        { id: 'unit-2', nama_unit: 'Animasi 2D', guru_id: 'guru-unit-2', Guru: { id: 'guru-unit-2', nama_guru: 'Pak Unit 2' } },
      ]);
      (prisma.jadwalKBM.findMany as jest.Mock).mockResolvedValue([
        { guru_pelaksana_id: 'guru-delegasi', unit_pengajaran_id: 'unit-2' },
      ]);
      (prisma.cbtBankSoalKontributor.findMany as jest.Mock).mockResolvedValue([]);

      await CbtBankSoalService.syncCollaborationContributors(TENANT, 'bank-1');

      expect(mockTx.cbtBankSoalKontributor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ bank_soal_id: 'bank-1', guru_id: 'guru-unit-2', unit_pengajaran_id: 'unit-2' }),
        })
      );
      expect(mockTx.cbtBankSoalKontributor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ bank_soal_id: 'bank-1', guru_id: 'guru-delegasi', unit_pengajaran_id: 'unit-2' }),
        })
      );

      // Guru luar (bukan owner & bukan kontributor) DITOLAK
      (prisma.cbtBankSoalKontributor.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.jadwalKBM.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        CbtBankSoalService.createQuestion(
          TENANT,
          'bank-1',
          { konten_pertanyaan: 'Tes?', opsi_jawaban_json: [], kunci_jawaban: 'A' },
          { role: 'GURU', guru_profile: { id: 'guru-asing' } }
        )
      ).rejects.toThrow(/Akses ditolak/);

      // Kontributor terdaftar DIIZINKAN menambah soal dengan unit_pengajaran_id
      (prisma.cbtBankSoalKontributor.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'c1' });
      (prisma.jadwalKBM.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.unitPengajaran.findFirst as jest.Mock).mockResolvedValue({
        id: 'unit-2',
        mapel_id: 'mapel-dkv',
      });
      (prisma.cbtSoal.findFirst as jest.Mock).mockResolvedValue({ nomor_urut: 4 });
      mockTx.cbtSoal.create.mockResolvedValue({ id: 'soal-5', unit_pengajaran_id: 'unit-2' });
      mockTx.cbtSoal.count.mockResolvedValue(5);
      mockTx.cbtBankSoal.update.mockResolvedValue({});

      const soal = await CbtBankSoalService.createQuestion(
        TENANT,
        'bank-1',
        { konten_pertanyaan: 'Apa itu keyframe?', unit_pengajaran_id: 'unit-2', opsi_jawaban_json: [], kunci_jawaban: 'A' },
        { role: 'GURU', guru_profile: { id: 'guru-unit-2' } }
      );

      expect(mockTx.cbtSoal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ unit_pengajaran_id: 'unit-2', nomor_urut: 5 }),
        })
      );
      expect(soal.unit_pengajaran_id).toBe('unit-2');
    });

    it('menampilkan label Kolaborasi / Nama Unit di Jadwal CBT serta menghitung unit_scores peserta', async () => {
      (prisma.cbtJadwalUjian.count as jest.Mock).mockResolvedValue(2);
      (prisma.cbtJadwalUjian.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'jad-resmi',
          BankSoal: {
            mapel_id: 'mapel-dkv',
            unit_pengajaran_id: null,
            Mapel: { id: 'mapel-dkv', nama_mapel: 'Dasar DKV', kode_mapel: 'DDKV' },
            UnitPengajaran: null,
            Kontributor: [],
          },
        },
        {
          id: 'jad-kuis',
          BankSoal: {
            mapel_id: 'mapel-dkv',
            unit_pengajaran_id: 'unit-2',
            Mapel: { id: 'mapel-dkv', nama_mapel: 'Dasar DKV', kode_mapel: 'DDKV' },
            UnitPengajaran: { id: 'unit-2', nama_unit: 'Animasi 2D', kode_unit: 'A2D' },
            Kontributor: [],
          },
        },
      ]);
      (prisma.guruMapel.findMany as jest.Mock).mockResolvedValue([{ mapel_id: 'mapel-dkv' }]);

      const jadwalRes = await CbtJadwalService.list(TENANT, { page: 1, limit: 10 });
      expect(jadwalRes.items[0]).toMatchObject({
        display_mapel: 'Dasar DKV',
        kolaborasi_badge: 'Kolaborasi',
      });
      expect(jadwalRes.items[1]).toMatchObject({
        display_mapel: 'Dasar DKV — Animasi 2D',
        kolaborasi_badge: null,
      });

      // Verifikasi breakdown unit_scores pada getPesertaList
      (prisma.cbtPesertaUjian.count as jest.Mock).mockResolvedValue(1);
      (prisma.cbtPesertaUjian.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pes-1',
          siswa_id: 'sis-1',
          status: 'FINISHED',
          sisa_waktu_detik: 100,
          durasi_pengerjaan_detik: 500,
          status_sinkron: 'SYNCED',
          jawaban_json: [
            { soal_id: 's-1', jawaban_siswa: 'A' },
            { soal_id: 's-2', jawaban_siswa: 'B' },
          ],
          Siswa: { id: 'sis-1', nama_siswa: 'Andi', nis: '1001' },
        },
      ]);
      (prisma.cbtJadwalUjian.findFirst as jest.Mock).mockResolvedValue({
        bank_soal_id: 'bank-1',
        durasi_menit: 60,
        tanggal_selesai: null,
        setting_keamanan: {},
      });
      (prisma.cbtSoal.findMany as jest.Mock).mockResolvedValue([
        {
          id: 's-1',
          bobot: 2,
          kunci_jawaban: 'A',
          unit_pengajaran_id: 'unit-1',
          UnitPengajaran: { id: 'unit-1', nama_unit: 'Desain Grafis', Guru: { nama_guru: 'Pak Budi' } },
        },
        {
          id: 's-2',
          bobot: 2,
          kunci_jawaban: 'C',
          unit_pengajaran_id: 'unit-2',
          UnitPengajaran: { id: 'unit-2', nama_unit: 'Animasi 2D', Guru: { nama_guru: 'Bu Siti' } },
        },
      ]);

      const pesertaRes = await CbtJadwalService.getPesertaList(TENANT, 'jad-resmi', { page: 1, limit: 20 });
      expect((pesertaRes[0] as any).unit_scores).toEqual([
        expect.objectContaining({ unit_pengajaran_id: 'unit-1', nama_unit: 'Desain Grafis', benar: 1, total_soal: 1, skor: 100 }),
        expect.objectContaining({ unit_pengajaran_id: 'unit-2', nama_unit: 'Animasi 2D', benar: 0, total_soal: 1, skor: 0 }),
      ]);
    });
  });
});
