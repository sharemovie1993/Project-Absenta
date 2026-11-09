export interface PublicSchoolProfile {
  id: string;
  nama: string;
  npsn: string | null;
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK' | string;
  akreditasi: string | null;
  kurikulum: string | null;
  alamat: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kota: string | null;
  provinsi: string | null;
  kode_pos: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  kepala_sekolah: string | null;
  nip_kepala: string | null;
  logo_url: string | null;
  tahun_berdiri: number | null;
  subdomain: string | null;
  custom_domain: string | null;
  // Dynamic statistics
  stats: {
    total_siswa: number;
    total_guru: number;
    total_jurusan: number;
    total_mitra_industri: number;
    total_fasilitas: number;
  };
  // Dynamic Web CMS Configuration
  web_config: {
    theme_color: string;
    hero_title: string;
    hero_subtitle: string;
    hero_images: string[];
    sambutan_kepsek: string | null;
    foto_kepsek: string | null;
    visi: string | null;
    misi: string[];
    social_links: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
      tiktok?: string;
    };
    ppdb_active: boolean;
    ppdb_url?: string;
    ppdb_announcement?: string;
  };
}

export interface PublicStaffMember {
  id: string;
  nama_guru: string;
  nip: string | null;
  foto: string | null;
  jenis_kelamin: string | null;
  jabatan: string | null;
  pendidikan_terakhir: string | null;
  jenis_ptk: string; // PENDIDIK / TENAGA_KEPENDIDIKAN
  mata_pelajaran: string[];
}

export interface PublicProgram {
  id: string;
  nama: string;
  kode: string | null;
  singkatan: string | null;
  warna: string | null;
  logo_url: string | null;
  program_keahlian: string | null;
  durasi_jurusan: string | null;
  jumlah_kelas: number;
}

export interface PublicAchievement {
  id: string;
  nama_prestasi: string;
  kategori: string;
  tanggal: string;
  keterangan: string | null;
  nama_siswa: string;
  nama_kelas: string | null;
}

export interface PublicHubinData {
  mitra: Array<{
    id: string;
    nama: string;
    bidang: string | null;
    logo_url: string | null;
    kompetensi_keahlian: string | null;
    alamat: string | null;
  }>;
  lowongan: Array<{
    id: string;
    perusahaan_nama: string;
    judul_posisi: string;
    deskripsi: string;
    persyaratan: string;
    kuota: number;
    tanggal_tutup: string;
  }>;
  tefa_projects: Array<{
    id: string;
    nama_proyek: string;
    deskripsi: string | null;
    status_proyek: string;
  }>;
}

export interface PublicFacility {
  id: string;
  nama: string;
  deskripsi: string | null;
  unit_jurusan: string | null;
  image_url: string | null;
}

export interface PublicArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  author_name: string;
  published_at: string;
  event_date: string | null;
  views_count: number;
}

export interface PublicArticleDetail extends PublicArticleSummary {
  content: string;
}
