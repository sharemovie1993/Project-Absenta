import { prisma } from '../../../utils/prisma';
import type {
  GetMatriksDknDto,
  PreviewSuratPengantarDto,
  IssueSuratPengantarDto,
  GetArsipDknDto,
} from './dkn.schema';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export class DknService {
  /**
   * Menghasilkan nomor surat dinas DKN otomatis:
   * 421.5 / {runningNum} / {schoolCode} / DKN / {currentMonthRoman} / {currentYear}
   */
  static async generateNomorSurat(tenantId: string): Promise<string> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthRoman = ROMAN_MONTHS[now.getMonth()];

    const count = await prisma.suratKeluar.count({
      where: {
        tenant_id: tenantId,
        kategori_surat: 'DKN',
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

    return `421.5 / ${runningNum} / ${schoolCode} / DKN / ${currentMonthRoman} / ${currentYear}`;
  }

  /**
   * Mengambil identitas pimpinan sekolah untuk legalitas DKN
   */
  private static async getSchoolPejabat(tenantId: string) {
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

    const guruKurikulum = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        jabatan: { contains: 'KURIKULUM', mode: 'insensitive' },
      },
      select: {
        nama_guru: true,
        nip: true,
      },
    });

    return {
      nama_sekolah: sekolah?.nama || 'SMK Negeri',
      npsn: sekolah?.npsn || '-',
      kota: sekolah?.kota || 'Purwakarta',
      alamat: sekolah?.alamat || '-',
      kepala_sekolah: {
        nama: guruKepsek?.nama_guru || sekolah?.kepala_sekolah || 'Kepala Sekolah',
        nip: guruKepsek?.nip || '-',
      },
      waka_kurikulum: {
        nama: guruKurikulum?.nama_guru || 'Wakil Kepala Sekolah Bidang Kurikulum',
        nip: guruKurikulum?.nip || '-',
      },
    };
  }

  // ─── 1. GET MATRIKS DKN ────────────────────────────────────────────────────
  static async getMatriksDkn(tenantId: string, params: GetMatriksDknDto) {
    const pejabat = await this.getSchoolPejabat(tenantId);

    // Filter siswa
    const siswaWhere: any = {
      tenant_id: tenantId,
    };

    if (params.search) {
      siswaWhere.OR = [
        { nama_siswa: { contains: params.search, mode: 'insensitive' } },
        { nis: { contains: params.search, mode: 'insensitive' } },
        { nisn: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // SiswaAkademik filter condition
    const akademikFilter: any = {};
    if (params.tahun_pelajaran_id) {
      akademikFilter.tahun_pelajaran_id = params.tahun_pelajaran_id;
    }
    if (params.kelas_id) {
      akademikFilter.kelas_id = params.kelas_id;
    }
    if (params.tingkat) {
      akademikFilter.kelas = { tingkat: params.tingkat };
    }
    if (params.jurusan_id) {
      akademikFilter.kelas = {
        ...(akademikFilter.kelas || {}),
        jurusan_id: params.jurusan_id,
      };
    }

    if (Object.keys(akademikFilter).length > 0) {
      siswaWhere.SiswaAkademik = {
        some: akademikFilter,
      };
    }

    const siswaList = await prisma.siswa.findMany({
      where: siswaWhere,
      include: {
        Kelas: {
          include: {
            Jurusan: true,
          },
        },
        KelulusanSiswa: true,
        SertifikatUkk: true,
        NilaiSiswa: {
          include: {
            Mapel: true,
          },
        },
        SiswaAkademik: {
          include: {
            kelas: {
              include: {
                Jurusan: true,
              },
            },
            tahunPelajaran: true,
            semester: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
      orderBy: {
        nama_siswa: 'asc',
      },
    });

    // Kumpulkan seluruh mapel yang ada dalam dataset untuk pembentukan kolom matriks dinamis
    const mapelSet = new Map<string, { id: string; nama_mapel: string; kode_mapel: string | null; kelompok_mapel: string }>();

    siswaList.forEach((s) => {
      s.NilaiSiswa.forEach((ns) => {
        if (ns.Mapel && !mapelSet.has(ns.Mapel.id)) {
          let kelompok = ns.Mapel.kelompok_mapel || 'UMUM';
          const upperKelompok = kelompok.toUpperCase();
          if (upperKelompok.includes('A') || upperKelompok.includes('NASIONAL') || upperKelompok.includes('UMUM')) {
            kelompok = 'A';
          } else if (upperKelompok.includes('B') || upperKelompok.includes('KEWILAYAHAN') || upperKelompok.includes('MULOK')) {
            kelompok = 'B';
          } else {
            kelompok = 'C';
          }
          mapelSet.set(ns.Mapel.id, {
            id: ns.Mapel.id,
            nama_mapel: ns.Mapel.nama_mapel,
            kode_mapel: ns.Mapel.kode_mapel,
            kelompok_mapel: kelompok,
          });
        }
      });
    });

    const columnsMapel = Array.from(mapelSet.values()).sort((a, b) => {
      if (a.kelompok_mapel !== b.kelompok_mapel) {
        return a.kelompok_mapel.localeCompare(b.kelompok_mapel);
      }
      return a.nama_mapel.localeCompare(b.nama_mapel);
    });

    // Transform siswa row dengan nilai per kolom mapel
    const rows = siswaList.map((siswa, idx) => {
      const nilaiMap: Record<string, number> = {};
      let totalNilai = 0;
      let countMapel = 0;

      siswa.NilaiSiswa.forEach((ns) => {
        const val = ns.nilai_rapor_final ?? ns.nilai_akhir_sumatif ?? ns.nilai ?? 0;
        nilaiMap[ns.mapel_id] = val;
        totalNilai += val;
        countMapel++;
      });

      const avgNilai = countMapel > 0 ? Number((totalNilai / countMapel).toFixed(2)) : 0;
      const kelulusan = siswa.KelulusanSiswa?.[0];
      const ukk = siswa.SertifikatUkk?.[0];

      const currentAkademik = siswa.SiswaAkademik?.[0];
      const kelasNama = siswa.Kelas?.nama_kelas || currentAkademik?.kelas?.nama_kelas || '-';
      const jurusanNama = (siswa.Kelas?.Jurusan as any)?.nama || (currentAkademik?.kelas?.Jurusan as any)?.nama || '-';

      return {
        id: siswa.id,
        nomor_urut: idx + 1,
        nis: siswa.nis,
        nisn: siswa.nisn || '-',
        nama_siswa: siswa.nama_siswa,
        gender: siswa.jenis_kelamin || '-',
        kelas: kelasNama,
        jurusan: jurusanNama,
        nilai_per_mapel: nilaiMap,
        nilai_ukk: ukk?.nilai_praktik ?? null,
        predikat_ukk: ukk?.predikat ?? null,
        nomor_sertifikat_ukk: ukk?.nomor_sertifikat ?? null,
        rata_rata_nilai: kelulusan?.rata_rata_nilai ?? avgNilai,
        status_kelulusan: kelulusan?.status_kelulusan || (siswa.status === 'LULUS' ? 'LULUS' : 'LULUS'),
        nomor_skl: kelulusan?.nomor_skl || '-',
        tanggal_lulus: kelulusan?.tanggal_lulus || null,
        rank: 1, // Akan dihitung setelah sorting
      };
    });

    // Hitung peringkat (rank) paralel berdasarkan rata-rata nilai descending
    const sortedForRank = [...rows].sort((a, b) => b.rata_rata_nilai - a.rata_rata_nilai);
    sortedForRank.forEach((item, index) => {
      const found = rows.find((r) => r.id === item.id);
      if (found) {
        found.rank = index + 1;
      }
    });

    // Hitung ringkasan statistik (rekap)
    const totalSiswa = rows.length;
    const totalLulus = rows.filter((r) => r.status_kelulusan === 'LULUS').length;
    const totalTidakLulus = totalSiswa - totalLulus;
    const avgKeseluruhan = totalSiswa > 0
      ? Number((rows.reduce((acc, r) => acc + r.rata_rata_nilai, 0) / totalSiswa).toFixed(2))
      : 0;

    // Info Program Keahlian / Kelas dari dataset
    const programKeahlian = rows[0]?.jurusan || 'Semua Program Keahlian';
    const rombelTerpilih = rows[0]?.kelas || 'Semua Kelas';

    return {
      pejabat,
      program_keahlian: programKeahlian,
      kelas_terpilih: rombelTerpilih,
      columns_mapel: columnsMapel,
      rekapitulasi: {
        total_siswa: totalSiswa,
        total_lulus: totalLulus,
        total_tidak_lulus: totalTidakLulus,
        rata_rata_angkatan: avgKeseluruhan,
      },
      rows,
    };
  }

  // ─── 2. PREVIEW SURAT PENGANTAR DINAS ──────────────────────────────────────
  static async previewSuratPengantar(tenantId: string, payload: PreviewSuratPengantarDto) {
    const pejabat = await this.getSchoolPejabat(tenantId);
    const nomorSurat = payload.nomor_surat_manual || (await this.generateNomorSurat(tenantId));

    // Ambil tahun pelajaran
    const tp = await prisma.tahunPelajaran.findUnique({
      where: { id: payload.tahun_pelajaran_id },
      select: { tahun: true },
    });

    // Ambil rekap siswa DKN
    const dknData = await this.getMatriksDkn(tenantId, {
      tahun_pelajaran_id: payload.tahun_pelajaran_id,
      jurusan_id: payload.jurusan_id,
      kelas_id: payload.kelas_id,
    });

    const tanggalSuratObj = payload.tanggal_surat ? new Date(payload.tanggal_surat) : new Date();

    return {
      nomor_surat: nomorSurat,
      lampiran: payload.lampiran || '1 (Satu) Berkas',
      perihal: `Penyerahan Laporan Kelulusan & Daftar Kolektif Nilai (DKN) Tahun Ajaran ${tp?.tahun || '-'}`,
      tanggal_surat: tanggalSuratObj.toISOString(),
      tujuan_dinas: payload.tujuan_dinas,
      alamat_dinas: payload.alamat_dinas || 'Di Tempat',
      tahun_pelajaran: tp?.tahun || '-',
      program_keahlian: dknData.program_keahlian,
      rekapitulasi: dknData.rekapitulasi,
      pejabat,
      catatan_pengantar: payload.catatan_pengantar || null,
    };
  }

  // ─── 3. ISSUE SURAT PENGANTAR DINAS & SIMPAN KE SURAT_KELUAR ──────────────
  static async issueSuratPengantar(tenantId: string, userId: string, payload: IssueSuratPengantarDto) {
    const preview = await this.previewSuratPengantar(tenantId, payload);

    // Simpan ke agenda SuratKeluar (Zero New Tables)
    const suratKeluar = await prisma.suratKeluar.create({
      data: {
        tenant_id: tenantId,
        nomor_surat: preview.nomor_surat,
        judul: preview.perihal,
        tujuan_surat: preview.tujuan_dinas,
        tanggal_surat: new Date(preview.tanggal_surat),
        kategori_surat: 'DKN',
        status: 'DIKIRIM',
        created_by_id: userId,
        isi_ringkas: JSON.stringify({
          lampiran: preview.lampiran,
          alamat_dinas: preview.alamat_dinas,
          tahun_pelajaran: preview.tahun_pelajaran,
          program_keahlian: preview.program_keahlian,
          rekapitulasi: preview.rekapitulasi,
          waka_kurikulum: {
            nama: payload.waka_kurikulum_nama || preview.pejabat.waka_kurikulum.nama,
            nip: payload.waka_kurikulum_nip || preview.pejabat.waka_kurikulum.nip,
          },
          pengawas_pembina: {
            nama: payload.pengawas_pembina_nama || 'Pengawas Pembina Cabang Dinas',
            nip: payload.pengawas_pembina_nip || '-',
          },
          kepala_sekolah: preview.pejabat.kepala_sekolah,
          catatan_pengantar: payload.catatan_pengantar || '',
        }),
      },
    });

    return {
      surat_keluar_id: suratKeluar.id,
      nomor_surat: suratKeluar.nomor_surat,
      preview,
    };
  }

  // ─── 4. GET ARSIP DKN (DAFTAR SURAT_KELUAR KATEGORI DKN) ───────────────────
  static async getArsipDkn(tenantId: string, query: GetArsipDknDto) {
    const where: any = {
      tenant_id: tenantId,
      kategori_surat: 'DKN',
    };

    if (query.search) {
      where.OR = [
        { nomor_surat: { contains: query.search, mode: 'insensitive' } },
        { judul: { contains: query.search, mode: 'insensitive' } },
        { tujuan_surat: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tahun) {
      where.tanggal_surat = {
        gte: new Date(`${query.tahun}-01-01T00:00:00.000Z`),
        lte: new Date(`${query.tahun}-12-31T23:59:59.999Z`),
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [total, items] = await Promise.all([
      prisma.suratKeluar.count({ where }),
      prisma.suratKeluar.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { tanggal_surat: 'desc' },
        include: {
          CreatedBy: {
            select: { full_name: true, email: true },
          },
        },
      }),
    ]);

    const formatted = items.map((item) => {
      let meta: any = {};
      try {
        if (item.isi_ringkas) meta = JSON.parse(item.isi_ringkas);
      } catch {
        // ignore json parse error
      }

      return {
        id: item.id,
        nomor_surat: item.nomor_surat,
        judul: item.judul,
        tujuan_surat: item.tujuan_surat,
        tanggal_surat: item.tanggal_surat,
        status: item.status,
        tahun_pelajaran: meta.tahun_pelajaran || '-',
        program_keahlian: meta.program_keahlian || '-',
        total_siswa: meta.rekapitulasi?.total_siswa ?? 0,
        total_lulus: meta.rekapitulasi?.total_lulus ?? 0,
        rata_rata_angkatan: meta.rekapitulasi?.rata_rata_angkatan ?? 0,
        created_by_name: item.CreatedBy?.full_name || 'Staff TU',
        metadata: meta,
      };
    });

    return {
      data: formatted,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
