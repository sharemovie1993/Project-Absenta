import { prisma } from '../../../utils/prisma';
import type {
  PreviewMutasiKeluarDto,
  IssueMutasiKeluarDto,
  PreviewMutasiMasukDto,
  IssueMutasiMasukDto,
  GetBukuRegisterDto,
  GetAgendaMutasiDto,
} from './mutasi.schema';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export class MutasiService {
  /**
   * Menghasilkan nomor surat dinas mutasi otomatis berurutan:
   * 421.5 / {runningNum} / {schoolCode} / MUTASI-OUT / {currentMonthRoman} / {currentYear}
   * 421.5 / {runningNum} / {schoolCode} / MUTASI-IN / {currentMonthRoman} / {currentYear}
   */
  static async generateNomorSurat(tenantId: string, tipe: 'MUTASI_KELUAR' | 'MUTASI_MASUK'): Promise<string> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthRoman = ROMAN_MONTHS[now.getMonth()];

    const count = await prisma.suratKeluar.count({
      where: {
        tenant_id: tenantId,
        kategori_surat: 'Mutasi',
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

    const subTag = tipe === 'MUTASI_KELUAR' ? 'MUTASI-OUT' : 'MUTASI-IN';
    return `421.5 / ${runningNum} / ${schoolCode} / ${subTag} / ${currentMonthRoman} / ${currentYear}`;
  }

  /**
   * Mengambil data kepala sekolah untuk penandatanganan dokumen dinas
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

  // ─── 1. PREVIEW MUTASI KELUAR ──────────────────────────────────────────────
  static async previewKeluar(tenantId: string, params: PreviewMutasiKeluarDto) {
    const { siswa_id, sekolah_tujuan, alasan, tanggal_keluar, no_rekomendasi_dinas, keterangan_tambahan } = params;

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswa_id, tenant_id: tenantId },
      include: {
        Kelas: true,
        TahunPelajaran: true,
        Semester: true,
        OrangTuaSiswa: {
          include: { OrangTua: true },
        },
      },
    });

    if (!siswa) {
      throw new Error('Data peserta didik tidak ditemukan pada tenant ini');
    }

    const nomorSurat = await this.generateNomorSurat(tenantId, 'MUTASI_KELUAR');
    const kepsek = await this.getKepalaSekolah(tenantId);

    const primaryOrtu = siswa.OrangTuaSiswa?.[0]?.OrangTua;

    return {
      tipe: 'MUTASI_KELUAR' as const,
      nomor_surat: nomorSurat,
      tanggal_surat: tanggal_keluar || new Date().toISOString().slice(0, 10),
      sekolah_tujuan,
      alasan,
      no_rekomendasi_dinas: no_rekomendasi_dinas || null,
      keterangan_tambahan: keterangan_tambahan || null,
      siswa: {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || '-',
        gender: siswa.jenis_kelamin === 'L' ? 'Laki-laki' : siswa.jenis_kelamin === 'P' ? 'Perempuan' : siswa.jenis_kelamin || '-',
        tempat_lahir: siswa.tempat_lahir || '-',
        tanggal_lahir: siswa.tanggal_lahir,
        agama: siswa.agama || '-',
        kelas: siswa.Kelas?.nama_kelas || '-',
        tingkat: siswa.Kelas?.tingkat || 10,
        tahun_pelajaran: siswa.TahunPelajaran?.tahun || '-',
        semester: siswa.Semester?.nama_semester || '-',
        nama_orang_tua: primaryOrtu?.nama || '-',
        pekerjaan_orang_tua: primaryOrtu?.pekerjaan || '-',
        alamat_orang_tua: siswa.alamat || '-',
      },
      penandatangan: kepsek,
    };
  }

  // ─── 2. ISSUE MUTASI KELUAR ────────────────────────────────────────────────
  static async issueKeluar(tenantId: string, userId: string, params: IssueMutasiKeluarDto) {
    const {
      siswa_id,
      nomor_surat,
      sekolah_tujuan,
      alasan,
      tanggal_keluar,
      no_rekomendasi_dinas,
      keterangan_tambahan,
      dossier_terlampir = true,
    } = params;

    const siswa = await prisma.siswa.findFirst({
      where: { id: siswa_id, tenant_id: tenantId },
      include: { Kelas: true, TahunPelajaran: true },
    });

    if (!siswa) {
      throw new Error('Siswa tidak ditemukan pada tenant ini');
    }

    const parsedDate = new Date(tanggal_keluar);
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    // Transaction: update Siswa status, update SiswaAkademik status, save SuratKeluar
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Siswa
      const updatedSiswa = await tx.siswa.update({
        where: { id: siswa_id },
        data: {
          status: 'MUTASI',
          tanggal_keluar: validDate,
          alasan_keluar: `${alasan} (Tujuan: ${sekolah_tujuan})`,
        },
      });

      // 2. Update SiswaAkademik aktif agar tidak muncul di absensi rombel (enum status: PINDAH)
      await tx.siswaAkademik.updateMany({
        where: {
          siswa_id,
          status: { not: 'LULUS' },
        },
        data: {
          status: 'PINDAH',
        },
      });

      // 3. Simpan SuratKeluar
      const metadataPayload = {
        tipe_mutasi: 'MUTASI_KELUAR',
        sekolah_tujuan,
        alasan,
        tanggal_keluar: validDate.toISOString(),
        no_rekomendasi_dinas: no_rekomendasi_dinas || null,
        keterangan_tambahan: keterangan_tambahan || null,
        dossier_terlampir,
        kelas_terakhir: siswa.Kelas?.nama_kelas || null,
        tahun_pelajaran: siswa.TahunPelajaran?.tahun || null,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || null,
      };

      const suratKeluar = await tx.suratKeluar.create({
        data: {
          tenant_id: tenantId,
          nomor_surat,
          judul: `Surat Keterangan Pindah Sekolah a.n. ${siswa.nama_siswa}`,
          tujuan_surat: sekolah_tujuan,
          tanggal_surat: validDate,
          isi_ringkas: JSON.stringify(metadataPayload),
          kategori_surat: 'Mutasi',
          status: 'DIKIRIM',
          siswa_id,
          created_by_id: userId,
        },
      });

      return { updatedSiswa, suratKeluar };
    });

    return {
      success: true,
      surat_keluar_id: result.suratKeluar.id,
      nomor_surat: result.suratKeluar.nomor_surat,
      siswa_id: result.updatedSiswa.id,
      status: result.updatedSiswa.status,
    };
  }

  // ─── 3. PREVIEW MUTASI MASUK ───────────────────────────────────────────────
  static async previewMasuk(tenantId: string, params: PreviewMutasiMasukDto) {
    const {
      siswa_id,
      nama_siswa,
      nisn,
      sekolah_asal,
      kelas_id,
      kelas_tujuan,
      tingkat,
      tanggal_masuk,
      no_rekomendasi_dinas,
      keterangan_tambahan,
    } = params;

    let targetKelasName = kelas_tujuan || '-';
    let targetTingkat = tingkat || 10;

    if (kelas_id) {
      const kelas = await prisma.kelas.findFirst({
        where: { id: kelas_id, tenant_id: tenantId },
        select: { nama_kelas: true, tingkat: true },
      });
      if (kelas) {
        targetKelasName = kelas.nama_kelas;
        targetTingkat = kelas.tingkat;
      }
    }

    const nomorSurat = await this.generateNomorSurat(tenantId, 'MUTASI_MASUK');
    const kepsek = await this.getKepalaSekolah(tenantId);

    return {
      tipe: 'MUTASI_MASUK' as const,
      nomor_surat: nomorSurat,
      tanggal_surat: tanggal_masuk || new Date().toISOString().slice(0, 10),
      sekolah_asal,
      target_kelas: targetKelasName,
      tingkat: targetTingkat,
      no_rekomendasi_dinas: no_rekomendasi_dinas || null,
      keterangan_tambahan: keterangan_tambahan || null,
      siswa: {
        id: siswa_id || null,
        nama_siswa,
        nisn: nisn || '-',
      },
      penandatangan: kepsek,
    };
  }

  // ─── 4. ISSUE MUTASI MASUK ─────────────────────────────────────────────────
  static async issueMasuk(tenantId: string, userId: string, params: IssueMutasiMasukDto) {
    const {
      siswa_id,
      nama_siswa,
      nisn,
      sekolah_asal,
      kelas_id,
      kelas_tujuan,
      tingkat,
      tanggal_masuk,
      nomor_surat,
      no_rekomendasi_dinas,
      keterangan_tambahan,
    } = params;

    const parsedDate = new Date(tanggal_masuk);
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    let targetKelasName = kelas_tujuan || '-';
    if (kelas_id) {
      const kelas = await prisma.kelas.findFirst({
        where: { id: kelas_id, tenant_id: tenantId },
        select: { nama_kelas: true, tingkat: true },
      });
      if (kelas) {
        targetKelasName = kelas.nama_kelas;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Jika siswa_id diberikan (sudah ada data siswa di DB)
      let resolvedSiswaId = siswa_id || null;
      if (siswa_id) {
        await tx.siswa.update({
          where: { id: siswa_id },
          data: {
            sekolah_asal,
            tanggal_masuk: validDate,
            status: 'AKTIF',
            ...(kelas_id ? { kelas_id } : {}),
          },
        });
      }

      const metadataPayload = {
        tipe_mutasi: 'MUTASI_MASUK',
        sekolah_asal,
        nama_siswa,
        nisn: nisn || null,
        target_kelas: targetKelasName,
        tingkat: tingkat || 10,
        tanggal_masuk: validDate.toISOString(),
        no_rekomendasi_dinas: no_rekomendasi_dinas || null,
        keterangan_tambahan: keterangan_tambahan || null,
      };

      const suratKeluar = await tx.suratKeluar.create({
        data: {
          tenant_id: tenantId,
          nomor_surat,
          judul: `Surat Keterangan Diterima a.n. ${nama_siswa}`,
          tujuan_surat: sekolah_asal,
          tanggal_surat: validDate,
          isi_ringkas: JSON.stringify(metadataPayload),
          kategori_surat: 'Mutasi',
          status: 'DIKIRIM',
          siswa_id: resolvedSiswaId,
          created_by_id: userId,
        },
      });

      return { suratKeluar, siswaId: resolvedSiswaId };
    });

    return {
      success: true,
      surat_keluar_id: result.suratKeluar.id,
      nomor_surat: result.suratKeluar.nomor_surat,
      siswa_id: result.siswaId,
    };
  }

  // ─── 5. BUKU REGISTER MUTASI (AKREDITASI) ──────────────────────────────────
  static async getBukuRegister(tenantId: string, params: GetBukuRegisterDto) {
    const { tahun_pelajaran_id, semester_id, tipe = 'ALL', search } = params;

    // Ambil surat keluar mutasi
    const letters = await prisma.suratKeluar.findMany({
      where: {
        tenant_id: tenantId,
        kategori_surat: 'Mutasi',
        ...(search
          ? {
              OR: [
                { nomor_surat: { contains: search, mode: 'insensitive' } },
                { judul: { contains: search, mode: 'insensitive' } },
                { tujuan_surat: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            nama_siswa: true,
            jenis_kelamin: true,
            Kelas: { select: { nama_kelas: true, tingkat: true } },
            SiswaAkademik: tahun_pelajaran_id || semester_id ? {
              where: {
                ...(tahun_pelajaran_id ? { tahun_pelajaran_id } : {}),
                ...(semester_id ? { semester_id } : {}),
              },
            } : false,
          },
        },
      },
      orderBy: { tanggal_surat: 'desc' },
    });

    // Parse metadata
    const parsedEntries = letters.map((letter) => {
      let meta: any = {};
      try {
        meta = letter.isi_ringkas ? JSON.parse(letter.isi_ringkas) : {};
      } catch {
        meta = {};
      }

      const isKeluar = meta.tipe_mutasi === 'MUTASI_KELUAR' || letter.nomor_surat.includes('MUTASI-OUT');
      const tipeMutasi = isKeluar ? 'MUTASI_KELUAR' : 'MUTASI_MASUK';

      return {
        id: letter.id,
        tipe: tipeMutasi,
        nomor_surat: letter.nomor_surat,
        tanggal: letter.tanggal_surat,
        siswa_id: letter.siswa_id,
        nama_siswa: letter.Siswa?.nama_siswa || meta.nama_siswa || letter.judul.replace(/Surat Keterangan (Pindah Sekolah|Diterima) a\.n\. /, ''),
        nis: letter.Siswa?.nis || meta.nis || '-',
        nisn: letter.Siswa?.nisn || meta.nisn || '-',
        gender: letter.Siswa?.jenis_kelamin || '-',
        kelas: letter.Siswa?.Kelas?.nama_kelas || meta.kelas_terakhir || meta.target_kelas || '-',
        tingkat: letter.Siswa?.Kelas?.tingkat || meta.tingkat || 10,
        sekolah_tujuan: isKeluar ? (meta.sekolah_tujuan || letter.tujuan_surat || '-') : null,
        sekolah_asal: !isKeluar ? (meta.sekolah_asal || letter.tujuan_surat || '-') : null,
        alasan: meta.alasan || '-',
        no_rekomendasi_dinas: meta.no_rekomendasi_dinas || '-',
      };
    });

    const filtered = parsedEntries.filter((entry) => {
      if (tipe === 'MASUK') return entry.tipe === 'MUTASI_MASUK';
      if (tipe === 'KELUAR') return entry.tipe === 'MUTASI_KELUAR';
      return true;
    });

    const totalMasuk = parsedEntries.filter((e) => e.tipe === 'MUTASI_MASUK').length;
    const totalKeluar = parsedEntries.filter((e) => e.tipe === 'MUTASI_KELUAR').length;

    const kepsek = await this.getKepalaSekolah(tenantId);

    return {
      entries: filtered,
      rekap: {
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        total_mutasi: totalMasuk + totalKeluar,
      },
      penandatangan: kepsek,
    };
  }

  // ─── 6. AGENDA MUTASI (PAGINATED) ──────────────────────────────────────────
  static async getAgendaMutasi(tenantId: string, params: GetAgendaMutasiDto) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
      kategori_surat: 'Mutasi',
    };

    if (params.search) {
      where.OR = [
        { nomor_surat: { contains: params.search, mode: 'insensitive' } },
        { judul: { contains: params.search, mode: 'insensitive' } },
        { tujuan_surat: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.tipe && params.tipe !== 'ALL') {
      const matchTag = params.tipe === 'MUTASI_KELUAR' ? 'MUTASI-OUT' : 'MUTASI-IN';
      where.nomor_surat = { contains: matchTag };
    }

    const [total, items] = await Promise.all([
      prisma.suratKeluar.count({ where }),
      prisma.suratKeluar.findMany({
        where,
        include: {
          Siswa: {
            select: {
              id: true,
              nis: true,
              nama_siswa: true,
              Kelas: { select: { nama_kelas: true } },
            },
          },
          CreatedBy: {
            select: { id: true, full_name: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formatted = items.map((item) => {
      let meta: any = {};
      try {
        meta = item.isi_ringkas ? JSON.parse(item.isi_ringkas) : {};
      } catch {
        meta = {};
      }

      return {
        id: item.id,
        nomor_surat: item.nomor_surat,
        judul: item.judul,
        tujuan_surat: item.tujuan_surat,
        tanggal_surat: item.tanggal_surat,
        created_at: item.created_at,
        created_by: item.CreatedBy?.full_name || 'Staf TU',
        siswa: item.Siswa
          ? {
              id: item.Siswa.id,
              nis: item.Siswa.nis,
              nama_siswa: item.Siswa.nama_siswa,
              kelas: item.Siswa.Kelas?.nama_kelas || '-',
            }
          : null,
        metadata: meta,
      };
    });

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
