import { prisma } from '../../../utils/prisma';
import type {
  UpdateClearanceDto,
  PreviewBebasAdministrasiDto,
  PreviewBastDto,
  IssueBastDto,
  GetBukuEkspedisiDto,
} from './bast-ijazah.schema';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export class BastIjazahService {
  /**
   * Menghasilkan nomor surat dinas baku otomatis:
   * 421.5 / {runningNum} / {schoolCode} / BAST-IJZ / {currentMonthRoman} / {currentYear}
   * 421.5 / {runningNum} / {schoolCode} / BEBAS-ADM / {currentMonthRoman} / {currentYear}
   */
  static async generateNomorSurat(tenantId: string, tipe: 'BAST' | 'BEBAS_ADM'): Promise<string> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthRoman = ROMAN_MONTHS[now.getMonth()];
    const kategoriSurat = tipe === 'BAST' ? 'BAST' : 'BebasAdministrasi';

    const count = await prisma.suratKeluar.count({
      where: {
        tenant_id: tenantId,
        kategori_surat: kategoriSurat,
        tanggal_surat: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
        },
      },
    });

    const runningNum = String(count + 1).padStart(3, '0');

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    let schoolCode = 'SMK';
    if (tenant?.name) {
      const words = tenant.name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);
      if (words.length >= 2) {
        schoolCode = words.map((w) => (w.length <= 3 ? w : w.substring(0, 3))).join('-');
      } else if (words[0]) {
        schoolCode = words[0].substring(0, 6);
      }
    }

    const subTag = tipe === 'BAST' ? 'BAST-IJZ' : 'BEBAS-ADM';
    return `421.5 / ${runningNum} / ${schoolCode} / ${subTag} / ${currentMonthRoman} / ${currentYear}`;
  }

  /**
   * Mengambil identitas kepala sekolah untuk pengesahan dokumen
   */
  private static async getKepalaSekolah(tenantId: string) {
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      select: {
        nama: true,
        npsn: true,
        alamat: true,
        kota: true,
        kepala_sekolah: true,
      },
    });

    const guruKepsek = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        jabatan: { contains: 'KEPALA', mode: 'insensitive' },
      },
      select: {
        nama_guru: true,
        nip: true,
      },
    });

    const namaKepsek = guruKepsek?.nama_guru || sekolah?.kepala_sekolah || 'Kepala Sekolah';
    const nipKepsek = guruKepsek?.nip || '-';

    return {
      nama_sekolah: sekolah?.nama || 'SMK Negeri',
      npsn: sekolah?.npsn || '-',
      kota: sekolah?.kota || 'Purwakarta',
      nama_kepala_sekolah: namaKepsek,
      nip_kepala_sekolah: nipKepsek,
    };
  }

  // ─── 1. GET STATUS CLEARANCE 5 POS ─────────────────────────────────────────
  static async getStatusClearance(tenantId: string, siswaId: string) {
    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      include: {
        Kelas: true,
        TahunPelajaran: true,
      },
    });

    if (!siswa) {
      throw new Error('Data peserta didik tidak ditemukan');
    }

    // 1. Auto-Check BK dari PelanggaranSiswa
    const pelanggaran = await prisma.pelanggaranSiswa.findMany({
      where: { siswa_id: siswaId, tenant_id: tenantId },
    });
    const totalPoin = pelanggaran.reduce((acc, p) => acc + (p.poin || 0), 0);
    const bkIsClean = totalPoin === 0;

    // 2. Auto-Check PKL dari SiswaPkl
    const pkl = await prisma.siswaPkl.findFirst({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      orderBy: { tanggal_mulai: 'desc' },
    });
    const pklIsDone = pkl?.status === 'SELESAI';

    // 3. Ambil data KelulusanSiswa & SertifikatUkk
    const [kelulusan, sertifikatUkk] = await Promise.all([
      prisma.kelulusanSiswa.findFirst({
        where: { siswa_id: siswaId, tenant_id: tenantId },
      }),
      prisma.sertifikatUkk.findFirst({
        where: { siswa_id: siswaId, tenant_id: tenantId },
      }),
    ]);

    // 4. Ambil catatan clearance yang tersimpan di SuratKeluar BebasAdministrasi terbaru
    const latestClearance = await prisma.suratKeluar.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id: siswaId,
        kategori_surat: 'BebasAdministrasi',
      },
      orderBy: { created_at: 'desc' },
    });

    let savedPos: any = {};
    if (latestClearance?.isi_ringkas) {
      try {
        const parsed = JSON.parse(latestClearance.isi_ringkas);
        savedPos = parsed.pos_clearance || {};
      } catch {
        savedPos = {};
      }
    }

    const posClearance = {
      perpustakaan: savedPos.perpustakaan || {
        status: 'BEBAS',
        petugas: 'Petugas Perpustakaan',
        catatan: 'Buku paket pelajaran lengkap',
      },
      keuangan: savedPos.keuangan || {
        status: 'BEBAS',
        petugas: 'Staf TU Keuangan',
        catatan: 'Lunas seluruh administrasi sekolah',
      },
      bengkel_jurusan: savedPos.bengkel_jurusan || {
        status: pklIsDone ? 'BEBAS' : 'BEBAS',
        petugas: 'Kepala Program Keahlian',
        catatan: pklIsDone ? 'Laporan PKL & alat lab tuntas' : 'Bebas tanggungan alat bengkel/lab',
      },
      bk: savedPos.bk || {
        status: bkIsClean ? 'BEBAS' : 'BELUM_BEBAS',
        petugas: 'Guru BK',
        catatan: bkIsClean ? 'Bebas catatan kasus (0 poin)' : `Ada catatan pelanggaran (${totalPoin} poin)`,
      },
      wali_kelas: savedPos.wali_kelas || {
        status: 'BEBAS',
        petugas: 'Wali Kelas',
        catatan: 'Pasfoto ijazah 3x4 dop diserahkan',
      },
    };

    const isAllCleared = Object.values(posClearance).every((p: any) => p.status === 'BEBAS');

    return {
      siswa: {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || '-',
        kelas: siswa.Kelas?.nama_kelas || '-',
        tingkat: siswa.Kelas?.tingkat || 12,
        tahun_pelajaran: siswa.TahunPelajaran?.tahun || '-',
      },
      pos_clearance: posClearance,
      is_all_cleared: isAllCleared,
      kelulusan: kelulusan
        ? {
            nomor_skl: kelulusan.nomor_skl,
            tanggal_lulus: kelulusan.tanggal_lulus,
            rata_rata_nilai: kelulusan.rata_rata_nilai,
            status_kelulusan: kelulusan.status_kelulusan,
          }
        : null,
      sertifikat_ukk: sertifikatUkk
        ? {
            nomor_sertifikat: sertifikatUkk.nomor_sertifikat,
            predikat: sertifikatUkk.predikat,
            nilai_praktik: sertifikatUkk.nilai_praktik,
          }
        : null,
    };
  }

  // ─── 2. UPDATE CLEARANCE POS ───────────────────────────────────────────────
  static async updateClearance(tenantId: string, userId: string, params: UpdateClearanceDto) {
    const { siswa_id, pos, status, catatan, petugas_nama } = params;

    const currentStatus = await this.getStatusClearance(tenantId, siswa_id);
    const posKey = pos.toLowerCase() as keyof typeof currentStatus.pos_clearance;

    const updatedPosClearance = {
      ...currentStatus.pos_clearance,
      [posKey]: {
        status,
        petugas: petugas_nama || (currentStatus.pos_clearance as any)[posKey]?.petugas || 'Petugas Satuan',
        catatan: catatan || (currentStatus.pos_clearance as any)[posKey]?.catatan || '',
      },
    };

    const isAllCleared = Object.values(updatedPosClearance).every((p: any) => p.status === 'BEBAS');

    // Update or create draft SuratKeluar BebasAdministrasi
    const existing = await prisma.suratKeluar.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id,
        kategori_surat: 'BebasAdministrasi',
      },
      orderBy: { created_at: 'desc' },
    });

    const metadata = {
      tipe_dokumen: 'BEBAS_ADMINISTRASI',
      pos_clearance: updatedPosClearance,
      is_all_cleared: isAllCleared,
    };

    if (existing) {
      await prisma.suratKeluar.update({
        where: { id: existing.id },
        data: {
          isi_ringkas: JSON.stringify(metadata),
        },
      });
    } else {
      const nomorSurat = await this.generateNomorSurat(tenantId, 'BEBAS_ADM');
      await prisma.suratKeluar.create({
        data: {
          tenant_id: tenantId,
          nomor_surat: nomorSurat,
          judul: `Surat Keterangan Bebas Administrasi a.n. ${currentStatus.siswa.nama_siswa}`,
          tujuan_surat: currentStatus.siswa.nama_siswa,
          kategori_surat: 'BebasAdministrasi',
          status: 'DRAFT',
          siswa_id,
          created_by_id: userId,
          isi_ringkas: JSON.stringify(metadata),
        },
      });
    }

    return {
      success: true,
      pos_clearance: updatedPosClearance,
      is_all_cleared: isAllCleared,
    };
  }

  // ─── 3. PREVIEW BEBAS ADMINISTRASI ─────────────────────────────────────────
  static async previewBebasAdministrasi(tenantId: string, params: PreviewBebasAdministrasiDto) {
    const { siswa_id, keperluan, catatan_tambahan } = params;

    const statusData = await this.getStatusClearance(tenantId, siswa_id);
    const nomorSurat = await this.generateNomorSurat(tenantId, 'BEBAS_ADM');
    const kepsek = await this.getKepalaSekolah(tenantId);

    return {
      tipe: 'BEBAS_ADMINISTRASI' as const,
      nomor_surat: nomorSurat,
      tanggal_surat: new Date().toISOString().slice(0, 10),
      keperluan: keperluan || 'Persyaratan Pengambilan Ijazah & Sertifikat',
      catatan_tambahan: catatan_tambahan || null,
      siswa: statusData.siswa,
      pos_clearance: statusData.pos_clearance,
      is_all_cleared: statusData.is_all_cleared,
      penandatangan: kepsek,
    };
  }

  // ─── 4. PREVIEW BAST IJAZAH ────────────────────────────────────────────────
  static async previewBast(tenantId: string, params: PreviewBastDto) {
    const { siswa_id, nomor_seri_ijazah, tanggal_serah_terima, penerima, dokumen_diserahkan } = params;

    const statusData = await this.getStatusClearance(tenantId, siswa_id);
    const nomorBast = await this.generateNomorSurat(tenantId, 'BAST');
    const kepsek = await this.getKepalaSekolah(tenantId);

    const defaultDokumen = [
      'Ijazah Asli SMK',
      'Buku Rapor Asli Semester 1 s.d. 6',
      'Sertifikat Uji Kompetensi Keahlian (UKK)',
      'Sertifikat Praktik Kerja Lapangan (PKL)',
      'Surat Keterangan Lulus (SKL)',
    ];

    return {
      tipe: 'BAST_IJAZAH' as const,
      nomor_bast: nomorBast,
      nomor_seri_ijazah: nomor_seri_ijazah || 'M-SMK/K13/2026/0000000',
      tanggal_serah_terima: tanggal_serah_terima || new Date().toISOString().slice(0, 10),
      siswa: statusData.siswa,
      nomor_skl: statusData.kelulusan?.nomor_skl || '-',
      nomor_sertifikat_ukk: statusData.sertifikat_ukk?.nomor_sertifikat || '-',
      dokumen_diserahkan: dokumen_diserahkan || defaultDokumen,
      penerima: {
        status: penerima?.status || 'SISWA_SENDIRI',
        nama: penerima?.nama || statusData.siswa.nama_siswa,
        nik: penerima?.nik || '-',
        hubungan: penerima?.hubungan || 'Siswa Yang Bersangkutan',
        no_hp: penerima?.no_hp || '-',
      },
      diserahkan_oleh: {
        nama: 'Petugas Pengelola Ijazah TU',
        jabatan: 'Staf Tata Usaha Satuan Pendidikan',
      },
      penandatangan: kepsek,
    };
  }

  // ─── 5. ISSUE BAST IJAZAH ──────────────────────────────────────────────────
  static async issueBast(tenantId: string, userId: string, params: IssueBastDto) {
    const {
      siswa_id,
      nomor_bast,
      nomor_seri_ijazah,
      tanggal_serah_terima,
      penerima,
      dokumen_diserahkan,
      catatan,
    } = params;

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswa_id, tenant_id: tenantId },
      include: { Kelas: true, TahunPelajaran: true },
    });

    if (!siswa) {
      throw new Error('Siswa tidak ditemukan');
    }

    const parsedDate = new Date(tanggal_serah_terima);
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const metadata = {
      tipe_dokumen: 'BAST_IJAZAH',
      nomor_seri_ijazah,
      penerima,
      dokumen_diserahkan,
      catatan: catatan || null,
      tanggal_serah_terima: validDate.toISOString(),
      nama_siswa: siswa.nama_siswa,
      nis: siswa.nis,
      nisn: siswa.nisn || null,
      kelas: siswa.Kelas?.nama_kelas || null,
      cap_tiga_jari_selesai: true,
    };

    const suratKeluar = await prisma.suratKeluar.create({
      data: {
        tenant_id: tenantId,
        nomor_surat: nomor_bast,
        judul: `Berita Acara Serah Terima Ijazah a.n. ${siswa.nama_siswa}`,
        tujuan_surat: penerima.nama,
        tanggal_surat: validDate,
        isi_ringkas: JSON.stringify(metadata),
        kategori_surat: 'BAST',
        status: 'DIKIRIM',
        siswa_id,
        created_by_id: userId,
      },
    });

    return {
      success: true,
      surat_keluar_id: suratKeluar.id,
      nomor_bast: suratKeluar.nomor_surat,
      nomor_seri_ijazah,
      siswa_id,
    };
  }

  // ─── 6. BUKU EKSPEDISI IJAZAH ──────────────────────────────────────────────
  static async getBukuEkspedisi(tenantId: string, params: GetBukuEkspedisiDto) {
    const { tahun_pelajaran_id, status_ambil = 'ALL', search } = params;

    // Ambil siswa tingkat akhir (12/13) atau yang memiliki KelulusanSiswa
    const students = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        ...(search
          ? {
              OR: [
                { nama_siswa: { contains: search, mode: 'insensitive' } },
                { nis: { contains: search, mode: 'insensitive' } },
                { nisn: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(tahun_pelajaran_id ? { tahun_pelajaran_id } : {}),
      },
      include: {
        Kelas: { select: { nama_kelas: true, tingkat: true } },
        KelulusanSiswa: { select: { nomor_skl: true, status_kelulusan: true } },
        SuratKeluar: {
          where: { kategori_surat: 'BAST' },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { nama_siswa: 'asc' },
    });

    const entries = students.map((s) => {
      const bastLetter = s.SuratKeluar?.[0];
      let meta: any = {};
      if (bastLetter?.isi_ringkas) {
        try {
          meta = JSON.parse(bastLetter.isi_ringkas);
        } catch {
          meta = {};
        }
      }

      const sudahDiambil = Boolean(bastLetter);

      return {
        siswa_id: s.id,
        nama_siswa: s.nama_siswa,
        nis: s.nis,
        nisn: s.nisn || '-',
        kelas: s.Kelas?.nama_kelas || '-',
        tingkat: s.Kelas?.tingkat || 12,
        nomor_skl: s.KelulusanSiswa?.[0]?.nomor_skl || '-',
        status_ambil: sudahDiambil ? ('DIAMBIL' as const) : ('BELUM' as const),
        nomor_seri_ijazah: meta.nomor_seri_ijazah || '-',
        tanggal_ambil: bastLetter?.tanggal_surat || null,
        penerima_nama: meta.penerima?.nama || null,
        penerima_hubungan: meta.penerima?.hubungan || null,
        nomor_bast: bastLetter?.nomor_surat || null,
      };
    });

    const filtered = entries.filter((e) => {
      if (status_ambil === 'DIAMBIL') return e.status_ambil === 'DIAMBIL';
      if (status_ambil === 'BELUM') return e.status_ambil === 'BELUM';
      return true;
    });

    const totalLulusan = entries.length;
    const totalSudahDiambil = entries.filter((e) => e.status_ambil === 'DIAMBIL').length;
    const totalDiBrankas = totalLulusan - totalSudahDiambil;

    const kepsek = await this.getKepalaSekolah(tenantId);

    return {
      entries: filtered,
      rekap: {
        total_lulusan: totalLulusan,
        total_sudah_diambil: totalSudahDiambil,
        total_di_brankas: totalDiBrankas,
      },
      penandatangan: kepsek,
    };
  }
}
