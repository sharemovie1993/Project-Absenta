export interface AsesmenPreset {
  nama: string;
  singkatan: string;
  kategori: 'Massal' | 'Khusus';
  keterangan: string;
}

export const ASESMEN_PRESETS: AsesmenPreset[] = [
  { nama: 'Angket Gaya Belajar (V-A-K)', singkatan: 'Gaya Belajar', kategori: 'Massal', keterangan: 'Mengidentifikasi kecenderungan gaya belajar siswa (Visual, Auditori, Kinestetik).' },
  { nama: 'AKPD (Angket Kebutuhan Peserta Didik)', singkatan: 'AKPD', kategori: 'Massal', keterangan: 'Asesmen kebutuhan siswa untuk penyusunan program BK tahunan.' },
  { nama: 'AUM Umum (Alat Ungkap Masalah)', singkatan: 'AUM Umum', kategori: 'Massal', keterangan: 'Mengungkapkan masalah-masalah umum siswa dalam berbagai aspek kehidupan.' },
  { nama: 'AUM PTSDL (Masalah Belajar)', singkatan: 'AUM PTSDL', kategori: 'Massal', keterangan: 'Mengungkapkan masalah belajar siswa (Prasyarat, Terbiasa, Sikap, Disiplin, Lambat).' },
  { nama: 'DCM (Daftar Cek Masalah)', singkatan: 'DCM', kategori: 'Khusus', keterangan: 'Daftar cek untuk mengidentifikasi jenis masalah yang dialami siswa.' },
  { nama: 'Sosiometri Hubungan Sosial', singkatan: 'Sosiometri', kategori: 'Khusus', keterangan: 'Mengukur hubungan sosial dan keterasingan siswa dalam kelas.' },
  { nama: 'Inventori Tugas Perkembangan (ITP)', singkatan: 'ITP', kategori: 'Massal', keterangan: 'Mengukur pencapaian tingkat tugas perkembangan siswa.' },
  { nama: 'Kuesioner Minat Karir (RIASEC)', singkatan: 'RIASEC', kategori: 'Massal', keterangan: 'Mengidentifikasi kecenderungan orientasi karir siswa.' }
];
