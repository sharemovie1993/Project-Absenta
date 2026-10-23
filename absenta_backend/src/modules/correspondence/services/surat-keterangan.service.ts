import { prisma } from '../../../utils/prisma';
import type {
  PreviewSuratKeteranganDto,
  IssueSuratKeteranganDto,
  GetSuratKeteranganHistoryDto,
} from './surat-keterangan.schema';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export class SuratKeteranganService {
  /**
   * Menghasilkan nomor surat dinas baku otomatis:
   * [Kode Klasifikasi: 421.5] / [No Urut 3 Digit] / [Kode Sekolah / SMKN1PLR] / [Bulan Romawi] / [Tahun]
   */
  static async generateNomorSurat(tenantId: string, templateType: string): Promise<string> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthRoman = ROMAN_MONTHS[now.getMonth()];

    // Hitung surat keterangan pada tahun berjalan
    const count = await prisma.suratKeluar.count({
      where: {
        tenant_id: tenantId,
        kategori_surat: 'Keterangan',
        tanggal_surat: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
        },
      },
    });

    const runningNum = String(count + 1).padStart(3, '0');

    // Ambil kode sekolah dari tenant name / default
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

    let subCode = '421.5';
    if (templateType === 'SKKB') subCode = '421.5-SKKB';
    else if (templateType === 'REKOMENDASI') subCode = '421.5-REK';

    return `${subCode} / ${runningNum} / ${schoolCode} / ${currentMonthRoman} / ${currentYear}`;
  }

  /**
   * Pratinjau Naskah Surat Keterangan + Auto-Fill + Discipline Risk Guard
   */
  static async preview(tenantId: string, params: PreviewSuratKeteranganDto) {
    const { template_type, siswa_id, keperluan, keterangan_tambahan } = params;

    // 1. Ambil data Siswa lengkap beserta kelas, ortu, semester, dan TP
    const siswa = await prisma.siswa.findFirst({
      where: {
        id: siswa_id,
        tenant_id: tenantId,
      },
      include: {
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
            jurusan_id: true,
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
          include: {
            OrangTua: true,
          },
        },
      },
    });

    if (!siswa) {
      throw new Error('Data siswa tidak ditemukan pada tenant ini');
    }

    // 2. Ambil Profil Sekolah / Kepala Sekolah
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      select: {
        nama: true,
        alamat: true,
        kota: true,
        telepon: true,
        email: true,
        website: true,
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

    const namaKepsek = guruKepsek?.nama_guru || sekolah?.kepala_sekolah || 'Drs. H. Ujang Solihin, M.Pd.';
    const nipKepsek = guruKepsek?.nip || '19680312 199403 1 005';

    // 3. Auto-Guard Pengecekan Kedisiplinan (PelanggaranSiswa)
    const pelanggaranList = await prisma.pelanggaranSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: siswa_id,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const totalPoin = pelanggaranList.reduce((acc, p) => acc + (p.poin || 0), 0);
    const unresolvedCases = pelanggaranList.filter(
      (p) => (p.status || '').toUpperCase() !== 'SELESAI' && (p.status || '').toUpperCase() !== 'RESOLVED'
    );

    const disciplineCheck = {
      is_clean: totalPoin === 0 && unresolvedCases.length === 0,
      has_violations: pelanggaranList.length > 0,
      total_poin: totalPoin,
      unresolved_count: unresolvedCases.length,
      recent_violations: pelanggaranList.slice(0, 3).map((p) => ({
        id: p.id,
        nama: p.jenis_pelanggaran || p.keterangan || 'Pelanggaran Disiplin',
        poin: p.poin || 0,
        tanggal: p.tanggal,
        status: p.status,
      })),
    };

    // 4. Generate Nomor Surat Otomatis
    const nomorSurat = await this.generateNomorSurat(tenantId, template_type);
    const tanggalSurat = new Date();

    // 5. Normalisasi data orang tua
    const primaryOrtu = siswa.OrangTuaSiswa?.[0]?.OrangTua;
    const namaOrtu = primaryOrtu?.nama || siswa.nama_ayah || siswa.nama_ibu || '-';
    const pekerjaanOrtu = primaryOrtu?.pekerjaan || siswa.pekerjaan_ayah || siswa.pekerjaan_ibu || 'Karyawan / Wiraswasta';

    // 6. Format Tanggal Indonesia
    const formatIndo = (d?: Date | string | null) => {
      if (!d) return '-';
      try {
        return new Date(d).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      } catch {
        return String(d);
      }
    };

    const ttlStr = [siswa.tempat_lahir, formatIndo(siswa.tanggal_lahir)].filter((x) => x && x !== '-').join(', ') || '-';
    const jkStr = (siswa.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'Laki-laki' : 'Perempuan';

    // 7. Penyusunan Judul & Naskah Narasi Resmi
    let judulSurat = 'SURAT KETERANGAN SISWA AKTIF';
    let klausulPernyataan = '';

    if (template_type === 'SISWA_AKTIF') {
      judulSurat = 'SURAT KETERANGAN SISWA AKTIF';
      klausulPernyataan = `Adalah benar peserta didik tersebut di atas tercatat aktif sebagai peserta didik pada ${sekolah?.nama || 'Sekolah'} Tahun Pelajaran ${siswa.TahunPelajaran?.tahun || '2026/2027'} Semester ${siswa.Semester?.nama_semester || 'Ganjil'} pada kelas ${siswa.Kelas?.nama_kelas || '-'}.\n\nSurat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagai: ${keperluan}.`;
    } else if (template_type === 'SKKB') {
      judulSurat = 'SURAT KETERANGAN KELAKUAN BAIK (SKKB)';
      klausulPernyataan = `Berdasarkan data dan pengamatan rekam jejak kesiswaan serta bimbingan konseling di sekolah kami, peserta didik tersebut di atas selama menempuh pendidikan pada ${sekolah?.nama || 'Sekolah'} senantiasa BERKELAKUAN BAIK, mentaati peraturan tata tertib sekolah, serta tidak pernah terlibat tindakan kriminal, penyalahgunaan narkotika, tawuran pelajar, maupun pelanggaran berat lainnya.\n\nSurat keterangan ini diterbitkan dengan sebenarnya untuk keperluan: ${keperluan}.`;
    } else if (template_type === 'REKOMENDASI') {
      judulSurat = 'SURAT REKOMENDASI SEKOLAH';
      klausulPernyataan = `Memberikan REKOMENDASI penuh kepada peserta didik tersebut di atas berdasarkan prestasi akademik, kedisiplinan, serta kompetensi kejuruan yang dimiliki untuk dapat mengikuti / mendaftarkan diri pada program: ${keperluan}.\n\nDemikian rekomendasi ini kami sampaikan dengan harapan dapat dipertimbangkan sebagaimana mestinya.`;
    }

    if (keterangan_tambahan) {
      klausulPernyataan += `\n\nCatatan Tambahan: ${keterangan_tambahan}`;
    }

    return {
      template_type,
      judul_surat: judulSurat,
      nomor_surat: nomorSurat,
      tanggal_surat: tanggalSurat.toISOString(),
      tanggal_surat_formatted: formatIndo(tanggalSurat),
      kota_sekolah: sekolah?.kota || 'Purwakarta',
      penandatangan: {
        jabatan: 'Kepala Sekolah',
        nama: namaKepsek,
        nip: nipKepsek,
      },
      siswa: {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn || '-',
        ttl: ttlStr,
        jenis_kelamin: jkStr,
        agama: siswa.agama || 'Islam',
        kelas: siswa.Kelas?.nama_kelas || '-',
        tingkat: siswa.Kelas?.tingkat || 10,
        tahun_pelajaran: siswa.TahunPelajaran?.tahun || '2026/2027',
        nama_ortu: namaOrtu,
        pekerjaan_ortu: pekerjaanOrtu,
        alamat: siswa.alamat || '-',
      },
      keperluan,
      keterangan_tambahan,
      klausul_pernyataan: klausulPernyataan,
      discipline_check: disciplineCheck,
    };
  }

  /**
   * Terbitkan Surat Resmi & Simpan ke Buku Agenda SuratKeluar
   */
  static async issue(tenantId: string, userId: string, data: IssueSuratKeteranganDto) {
    const { template_type, siswa_id, nomor_surat, keperluan, isi_surat } = data;

    let judul = 'Surat Keterangan Siswa Aktif';
    if (template_type === 'SKKB') judul = 'Surat Keterangan Kelakuan Baik (SKKB)';
    else if (template_type === 'REKOMENDASI') judul = 'Surat Rekomendasi Sekolah';

    const created = await prisma.suratKeluar.create({
      data: {
        tenant_id: tenantId,
        nomor_surat: nomor_surat,
        judul: `${judul} - ${keperluan}`,
        tujuan_surat: keperluan,
        kategori_surat: 'Keterangan',
        siswa_id: siswa_id,
        isi_ringkas: isi_surat,
        status: 'SELESAI',
        created_by_id: userId,
        tanggal_surat: new Date(),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: { select: { nama_kelas: true } },
          },
        },
      },
    });

    return created;
  }

  /**
   * Riwayat Surat Keterangan yang Pernah Diterbitkan
   */
  static async getHistory(tenantId: string, params: GetSuratKeteranganHistoryDto) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
      kategori_surat: 'Keterangan',
    };

    if (params.siswa_id) {
      where.siswa_id = params.siswa_id;
    }

    if (params.search) {
      where.OR = [
        { nomor_surat: { contains: params.search, mode: 'insensitive' } },
        { judul: { contains: params.search, mode: 'insensitive' } },
        { tujuan_surat: { contains: params.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: params.search, mode: 'insensitive' } } },
        { Siswa: { nis: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.suratKeluar.count({ where }),
      prisma.suratKeluar.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              nisn: true,
              Kelas: { select: { id: true, nama_kelas: true } },
            },
          },
          CreatedBy: {
            select: { id: true, full_name: true },
          },
        },
      }),
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
