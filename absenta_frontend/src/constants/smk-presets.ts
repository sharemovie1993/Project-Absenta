export interface SMKPresetProgram {
  bidang_keahlian: string;
  nama: string;
  kode: string;
  singkatan: string;
  jurusans: Array<{
    nama: string;
    kode: string;
    singkatan: string;
  }>;
}

export const SMK_PRESETS: SMKPresetProgram[] = [
  {
    bidang_keahlian: 'Teknologi Informasi',
    nama: 'Pengembangan Perangkat Lunak dan Gim',
    kode: 'PPLG',
    singkatan: 'PPLG',
    jurusans: [
      { nama: 'Rekayasa Perangkat Lunak', kode: 'RPL', singkatan: 'RPL' },
      { nama: 'Pengembangan Gim', kode: 'GIM', singkatan: 'GIM' }
    ]
  },
  {
    bidang_keahlian: 'Teknologi Informasi',
    nama: 'Teknik Jaringan Komputer dan Telekomunikasi',
    kode: 'TJKT',
    singkatan: 'TJKT',
    jurusans: [
      { nama: 'Teknik Komputer dan Jaringan', kode: 'TKJ', singkatan: 'TKJ' },
      { nama: 'Teknik Jaringan Akses Telekomunikasi', kode: 'TJAT', singkatan: 'TJAT' }
    ]
  },
  {
    bidang_keahlian: 'Seni dan Ekonomi Kreatif',
    nama: 'Desain Komunikasi Visual',
    kode: 'DKV',
    singkatan: 'DKV',
    jurusans: [
      { nama: 'Desain Komunikasi Visual', kode: 'DKV_JUR', singkatan: 'DKV' }
    ]
  },
  {
    bidang_keahlian: 'Seni dan Ekonomi Kreatif',
    nama: 'Animasi',
    kode: 'ANIM',
    singkatan: 'ANIM',
    jurusans: [
      { nama: 'Animasi', kode: 'ANIM_JUR', singkatan: 'ANIM' }
    ]
  },
  {
    bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
    nama: 'Teknik Mesin',
    kode: 'TM',
    singkatan: 'TM',
    jurusans: [
      { nama: 'Teknik Pemesinan', kode: 'TPM', singkatan: 'TPM' },
      { nama: 'Teknik Pengelasan', kode: 'TPL', singkatan: 'TPL' },
      { nama: 'Teknik Fabrikasi Logam dan Manufaktur', kode: 'TFLM', singkatan: 'TFLM' }
    ]
  },
  {
    bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
    nama: 'Teknik Otomotif',
    kode: 'TO',
    singkatan: 'TO',
    jurusans: [
      { nama: 'Teknik Kendaraan Ringan Otomotif', kode: 'TKRO', singkatan: 'TKRO' },
      { nama: 'Teknik dan Bisnis Sepeda Motor', kode: 'TBSM', singkatan: 'TBSM' },
      { nama: 'Teknik Alat Berat', kode: 'TAB', singkatan: 'TAB' }
    ]
  },
  {
    bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
    nama: 'Teknik Elektronika',
    kode: 'TE',
    singkatan: 'TE',
    jurusans: [
      { nama: 'Teknik Audio Video', kode: 'TAV', singkatan: 'TAV' },
      { nama: 'Teknik Elektronika Industri', kode: 'TEI', singkatan: 'TEI' },
      { nama: 'Teknik Mekatronika', kode: 'TMEK', singkatan: 'TMEK' }
    ]
  },
  {
    bidang_keahlian: 'Bisnis dan Manajemen',
    nama: 'Akuntansi dan Keuangan Lembaga',
    kode: 'AKL',
    singkatan: 'AKL',
    jurusans: [
      { nama: 'Akuntansi', kode: 'AKT', singkatan: 'AKT' },
      { nama: 'Perbankan dan Keuangan Mikro', kode: 'PKM', singkatan: 'PKM' }
    ]
  },
  {
    bidang_keahlian: 'Bisnis dan Manajemen',
    nama: 'Manajemen Perkantoran dan Layanan Bisnis',
    kode: 'MPLB',
    singkatan: 'MPLB',
    jurusans: [
      { nama: 'Manajemen Perkantoran', kode: 'MP', singkatan: 'MP' },
      { nama: 'Logistik', kode: 'LOG', singkatan: 'LOG' }
    ]
  },
  {
    bidang_keahlian: 'Bisnis dan Manajemen',
    nama: 'Pemasaran',
    kode: 'PMS',
    singkatan: 'PMS',
    jurusans: [
      { nama: 'Bisnis Digital', kode: 'BD', singkatan: 'BD' },
      { nama: 'Pemasaran', kode: 'PM', singkatan: 'PM' }
    ]
  }
];
