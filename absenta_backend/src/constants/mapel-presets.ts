export interface MapelPreset {
  nama_mapel: string;
  kode_mapel: string;
}

export const MAPEL_PRESETS: Record<string, MapelPreset[]> = {
  SD: [
    { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Seni dan Budaya', kode_mapel: 'SENI' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' }
  ],
  MI: [
    { nama_mapel: 'Al-Qur\'an Hadis', kode_mapel: 'QURDIS' },
    { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Seni dan Budaya', kode_mapel: 'SENI' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' }
  ],
  SMP: [
    { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Ilmu Pengetahuan Alam', kode_mapel: 'IPA' },
    { nama_mapel: 'Ilmu Pengetahuan Sosial', kode_mapel: 'IPS' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
  ],
  MTs: [
    { nama_mapel: 'Al-Qur\'an Hadis', kode_mapel: 'QURDIS' },
    { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Ilmu Pengetahuan Alam', kode_mapel: 'IPA' },
    { nama_mapel: 'Ilmu Pengetahuan Sosial', kode_mapel: 'IPS' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
  ],
  SMA: [
    { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { nama_mapel: 'Fisika', kode_mapel: 'FIS' },
    { nama_mapel: 'Kimia', kode_mapel: 'KIM' },
    { nama_mapel: 'Biologi', kode_mapel: 'BIO' },
    { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { nama_mapel: 'Geografi', kode_mapel: 'GEO' },
    { nama_mapel: 'Ekonomi', kode_mapel: 'EKO' },
    { nama_mapel: 'Sosiologi', kode_mapel: 'SOS' },
    { nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
  ],
  MA: [
    { nama_mapel: 'Al-Qur\'an Hadis', kode_mapel: 'QURDIS' },
    { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { nama_mapel: 'Fisika', kode_mapel: 'FIS' },
    { nama_mapel: 'Kimia', kode_mapel: 'KIM' },
    { nama_mapel: 'Biologi', kode_mapel: 'BIO' },
    { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { nama_mapel: 'Geografi', kode_mapel: 'GEO' },
    { nama_mapel: 'Ekonomi', kode_mapel: 'EKO' },
    { nama_mapel: 'Sosiologi', kode_mapel: 'SOS' },
    { nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
  ],
  SMK: [
    { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' }
  ],
  MAK: [
    { nama_mapel: 'Al-Qur\'an Hadis', kode_mapel: 'QURDIS' },
    { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' }
  ]
};
