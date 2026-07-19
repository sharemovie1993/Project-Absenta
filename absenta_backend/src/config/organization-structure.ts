export interface StrukturOrganisasiDef {
  kode: string;
  nama: string;
  scope: string; // academic, student, admin, facility, attendance
  scope_type: 'global' | 'unit' | 'kelas';
  deskripsi: string;
  order: number;
}

export const STRUKTUR_CODES = {
  KEPALA_SEKOLAH: 'KEPALA_SEKOLAH',
  TU: 'TU',
  KAPROG: 'KAPROG',
  GERBANG: 'GERBANG',
  PETUGAS_KELAS: 'PETUGAS_KELAS',
  KURIKULUM: 'KURIKULUM',
  KESISWAAN: 'KESISWAAN',
  HUBIN: 'HUBIN',
  SARPRAS: 'SARPRAS',
  TOOLMAN: 'TOOLMAN',
  WALIKELAS: 'WALIKELAS',
  BPBK: 'BPBK',
  BKK: 'BKK',
  KABENG: 'KABENG',
  PEMBINA_ESKUL: 'PEMBINA_ESKUL',
  BENDAHARA_KOPERASI: 'BENDAHARA_KOPERASI',
  KETUA_KOPERASI: 'KETUA_KOPERASI',
  SEKRETARIS_KOPERASI: 'SEKRETARIS_KOPERASI',
  MANAJER_TOKO_KOPERASI: 'MANAJER_TOKO_KOPERASI',
  PENGAWAS_KOPERASI: 'PENGAWAS_KOPERASI'
} as const;

export type StrukturKode = keyof typeof STRUKTUR_CODES;

export const DEFAULT_STRUKTUR_ORGANISASI: StrukturOrganisasiDef[] = [
  { 
    kode: STRUKTUR_CODES.KEPALA_SEKOLAH, 
    nama: 'Kepala Sekolah', 
    scope: 'academic', 
    scope_type: 'global',
    deskripsi: 'Pimpinan satuan pendidikan, akses dashboard dan rekap global',
    order: 5
  },
  { 
    kode: STRUKTUR_CODES.KURIKULUM, 
    nama: 'Waka Kurikulum & Staf', 
    scope: 'academic', 
    scope_type: 'global',
    deskripsi: 'Mengelola kurikulum, jadwal, dan kegiatan akademik',
    order: 10
  },
  { 
    kode: STRUKTUR_CODES.KESISWAAN, 
    nama: 'Waka Kesiswaan & Staf', 
    scope: 'student', 
    scope_type: 'global',
    deskripsi: 'Menangani pembinaan siswa, izin, dan kesiswaan',
    order: 11
  },
  { 
    kode: STRUKTUR_CODES.HUBIN, 
    nama: 'Waka Hubin & Staf', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Hubungan Industri, Humas, dan Praktik Kerja Lapangan',
    order: 12
  },
  { 
    kode: STRUKTUR_CODES.SARPRAS, 
    nama: 'Waka Sarpras & Staf', 
    scope: 'facility', 
    scope_type: 'global',
    deskripsi: 'Mengelola sarana prasarana sekolah secara global',
    order: 13
  },
  { 
    kode: STRUKTUR_CODES.TU, 
    nama: 'Kepala TU', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Administrasi umum, persuratan, dan tata usaha',
    order: 14
  },
  { 
    kode: STRUKTUR_CODES.KAPROG, 
    nama: 'Kaprog', 
    scope: 'academic', 
    scope_type: 'unit',
    deskripsi: 'Ketua Program Keahlian / Jurusan',
    order: 20
  },
  { 
    kode: STRUKTUR_CODES.KABENG, 
    nama: 'Kepala Bengkel', 
    scope: 'facility', 
    scope_type: 'unit',
    deskripsi: 'Kepala Bengkel atau Laboratorium tingkat jurusan',
    order: 21
  },
  { 
    kode: STRUKTUR_CODES.BPBK, 
    nama: 'Koordinator BP/BK', 
    scope: 'student', 
    scope_type: 'global',
    deskripsi: 'Bimbingan Konseling dan pembinaan karakter siswa',
    order: 22
  },
  { 
    kode: STRUKTUR_CODES.BKK, 
    nama: 'Ketua BKK', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Bursa Kerja Khusus - Penyaluran tamatan ke dunia kerja',
    order: 23
  },
  { 
    kode: STRUKTUR_CODES.WALIKELAS, 
    nama: 'Wali Kelas', 
    scope: 'student', 
    scope_type: 'kelas',
    deskripsi: 'Monitoring kelas dan siswa binaan',
    order: 24
  },
  { 
    kode: STRUKTUR_CODES.PEMBINA_ESKUL, 
    nama: 'Pembina Eskul', 
    scope: 'student', 
    scope_type: 'global',
    deskripsi: 'Guru pembina kegiatan ekstrakurikuler sekolah',
    order: 25
  },
  { 
    kode: STRUKTUR_CODES.TOOLMAN, 
    nama: 'Toolman', 
    scope: 'facility', 
    scope_type: 'unit',
    deskripsi: 'Petugas teknis peralatan bengkel/laboratorium',
    order: 40
  },
  { 
    kode: STRUKTUR_CODES.GERBANG, 
    nama: 'Petugas Absensi Gerbang', 
    scope: 'attendance', 
    scope_type: 'global',
    deskripsi: 'Petugas absensi di gerbang sekolah',
    order: 41
  },
  { 
    kode: STRUKTUR_CODES.PETUGAS_KELAS, 
    nama: 'Petugas Absensi Kelas', 
    scope: 'attendance', 
    scope_type: 'kelas',
    deskripsi: 'Petugas absensi per kelas (perwakilan siswa)',
    order: 42
  },
  { 
    kode: STRUKTUR_CODES.BENDAHARA_KOPERASI, 
    nama: 'Bendahara Koperasi', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Pengurus Koperasi - Mengelola simpanan, anggota, dan keuangan koperasi',
    order: 25
  },
  { 
    kode: STRUKTUR_CODES.KETUA_KOPERASI, 
    nama: 'Ketua Koperasi', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Pimpinan Koperasi - Menyetujui kebijakan strategis dan memberikan persetujuan pinjaman.',
    order: 26
  },
  { 
    kode: STRUKTUR_CODES.SEKRETARIS_KOPERASI, 
    nama: 'Sekretaris Koperasi', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Pengurus Koperasi - Mengelola pendaftaran anggota, keluhan tiket bantuan, dan pengumuman.',
    order: 27
  },
  { 
    kode: STRUKTUR_CODES.MANAJER_TOKO_KOPERASI, 
    nama: 'Pengelola Usaha Koperasi', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Kasir/Pengelola Toko - Mengoperasikan POS kasir minimarket dan mengelola inventaris produk.',
    order: 28
  },
  { 
    kode: STRUKTUR_CODES.PENGAWAS_KOPERASI, 
    nama: 'Pengawas Koperasi', 
    scope: 'admin', 
    scope_type: 'global',
    deskripsi: 'Dewan Pengawas - Melakukan audit berkala dan memantau kepatuhan keuangan (Read-Only).',
    order: 29
  }
];
