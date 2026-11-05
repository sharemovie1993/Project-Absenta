/**
 * Universal Academic Identity Normalizer (SSoT)
 *
 * Engine normalisasi identitas siswa dan pendidik (Guru/PTK) yang bersih,
 * bebas dari dependensi DOM/React, dan aman digunakan bersamaan oleh
 * layar web (Dashboard/Modal) maupun generator dokumen cetak (jsPDF).
 *
 * Mematuhi protokol:
 * 1. Anti-Kerning Collapse & Anti-Teks Bertumpuk
 * 2. Zero-Fallback Mandate NIP (anti bocor "NIP. -" pada non-PNS)
 * 3. Anti-Bocor Koma Gantung TTL (anti "Purwakarta, -")
 * 4. Penelusuran hierarki akademik: Siswa -> Kelas -> Jurusan -> ProgramKeahlian
 */

export interface StudentIdentity {
  // Identitas Pokok
  id: string;
  nama: string;
  nis: string;
  nisn: string;
  nik: string;
  jenisKelamin: 'L' | 'P';
  jenisKelaminLabel: 'Laki-laki' | 'Perempuan';
  agama: string;

  // Subsistem Foto Profil
  fotoUrl: string | null;
  hasFoto: boolean;
  initials: string;

  // Tempat & Tanggal Lahir
  tempatLahir: string;
  tanggalLahir: string | Date | null;
  ttlFormatted: string;

  // Hierarki Akademik
  kelasId: string;
  namaKelas: string;
  tingkat: number;
  tingkatRomawi: string;
  fase: 'E' | 'F';
  jurusanNama: string; // Konsentrasi Keahlian (e.g. "Kuliner")
  programKeahlian: string; // Program Keahlian (e.g. "Kuliner")
  bidangKeahlian: string; // Bidang Keahlian (e.g. "Pariwisata")

  // Keluarga & Orang Tua
  namaAyah: string;
  pekerjaanAyah: string;
  nikAyah: string;
  noHpAyah: string;
  namaIbu: string;
  pekerjaanIbu: string;
  nikIbu: string;
  noHpIbu: string;
  namaWali: string;
  pekerjaanWali: string;
  nikWali: string;
  noHpWali: string;
  hubunganWali: string;
  namaOrtuFormal: string; // Prioritas: Ayah -> Ibu -> Wali -> "-"
  kontakOrtu: string;

  // Alamat & Riwayat Sekolah
  alamatLengkap: string;
  dusun: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  sekolahAsal: string;
  tanggalMasuk: string | null;
  status: string;
}

export interface TeacherIdentity {
  // Identitas Pokok
  id: string;
  nama: string;
  namaLengkapGelar: string;
  nip: string | null;
  nipClean: string;
  nipFormatted: string; // Zero-Fallback: "" jika non-PNS
  nuptk: string | null;
  nik: string | null;
  jenisKelaminLabel: 'Laki-laki' | 'Perempuan';
  agama: string;

  // Subsistem Foto Profil
  fotoUrl: string | null;
  hasFoto: boolean;
  initials: string;

  // Kepegawaian & Jabatan
  statusKepegawaian: string;
  pangkatGolongan: string;
  jabatan: string;
  jenisPtk: string;
  pendidikanTerakhir: string;

  // Tempat & Tanggal Lahir
  tempatLahir: string;
  tanggalLahir: string | Date | null;
  ttlFormatted: string;

  // Kontak & Alamat
  noHp: string;
  alamatLengkap: string;
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Format tanggal Indonesia aman dari anomali string dan timezone offset
 */
export function formatTanggalIndonesia(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  try {
    if (typeof dateVal === 'string' && dateVal.includes('-')) {
      const parts = dateVal.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
          return `${d} ${INDONESIAN_MONTHS[m]} ${y}`;
        }
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Format Tempat dan Tanggal Lahir bersih tanpa kebocoran koma gantung
 */
export function formatTtl(tempat?: string | null, tanggal?: string | Date | null): string {
  const tStr = (tempat || '').trim();
  const dStr = formatTanggalIndonesia(tanggal).trim();
  if (tStr && dStr) return `${tStr}, ${dStr}`;
  return tStr || dStr || '-';
}

/**
 * Inisial 2 huruf untuk avatar visual
 */
export function formatInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '??';
  const clean = name.trim().replace(/^(dr|drg|drs|ir|prof|apt|h|hj)\.?\s+/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Pembersih NIP dari karakter ilegal
 */
export function cleanNip(nip?: string | null): string {
  if (!nip) return '';
  const s = String(nip).trim();
  if (s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  return s.replace(/\s+/g, '');
}

/**
 * Format NIP dengan Zero-Fallback Mandate:
 * Mengembalikan string kosong "" jika NIP tidak valid/non-PNS.
 * DILARANG keras mengembalikan "NIP. -" atau "NIP. null".
 */
export function formatNip(nip?: string | null): string {
  const c = cleanNip(nip);
  return c ? `NIP. ${c}` : '';
}

/**
 * Format Alamat Lengkap
 */
export function formatAlamatLengkap(obj: Record<string, any>): string {
  if (!obj) return '';
  if (obj.alamat_lengkap) return String(obj.alamat_lengkap).trim();

  const parts: string[] = [];
  if (obj.alamat) parts.push(String(obj.alamat).trim());
  
  const rtRw = [obj.rt ? `RT ${obj.rt}` : '', obj.rw ? `RW ${obj.rw}` : ''].filter(Boolean).join('/');
  if (rtRw) parts.push(rtRw);
  
  if (obj.dusun) parts.push(`Dsn. ${obj.dusun}`);
  if (obj.kelurahan || obj.desa) parts.push(`Desa/Kel. ${obj.kelurahan || obj.desa}`);
  if (obj.kecamatan) parts.push(`Kec. ${obj.kecamatan}`);
  if (obj.kabupaten || obj.kota) parts.push(`${obj.kabupaten || obj.kota}`);
  if (obj.provinsi) parts.push(`${obj.provinsi}`);
  if (obj.kode_pos) parts.push(String(obj.kode_pos));

  return parts.filter(Boolean).join(', ');
}

// ─── NORMALIZER UTILITIES (SSoT) ────────────────────────────────

/**
 * Normalizer Identitas Siswa
 * Menyatukan seluruh data mentah dari berbagai kemungkinan relasi Prisma / API
 */
export function normalizeStudentIdentity(raw: any): StudentIdentity {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      nama: 'Siswa',
      nis: '-',
      nisn: '-',
      nik: '-',
      jenisKelamin: 'L',
      jenisKelaminLabel: 'Laki-laki',
      agama: '-',
      fotoUrl: null,
      hasFoto: false,
      initials: 'SW',
      tempatLahir: '',
      tanggalLahir: null,
      ttlFormatted: '-',
      kelasId: '',
      namaKelas: '-',
      tingkat: 10,
      tingkatRomawi: 'X',
      fase: 'E',
      jurusanNama: '-',
      programKeahlian: '-',
      bidangKeahlian: '-',
      namaAyah: '-',
      pekerjaanAyah: '-',
      nikAyah: '-',
      noHpAyah: '-',
      namaIbu: '-',
      pekerjaanIbu: '-',
      nikIbu: '-',
      noHpIbu: '-',
      namaWali: '-',
      pekerjaanWali: '-',
      nikWali: '-',
      noHpWali: '-',
      hubunganWali: '-',
      namaOrtuFormal: '-',
      kontakOrtu: '-',
      alamatLengkap: '-',
      dusun: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
      kabupaten: '',
      provinsi: '',
      kodePos: '',
      sekolahAsal: '-',
      tanggalMasuk: null,
      status: 'AKTIF',
    };
  }

  // Relasi Kelas & Jurusan (Pengecekan bertingkat multi-source)
  const kelas = raw.Kelas || raw.kelas || raw.Siswa?.Kelas || raw.Siswa?.kelas || {};
  const jurusanDirect = raw.Jurusan || raw.jurusan || raw.Siswa?.Jurusan || raw.Siswa?.jurusan || {};
  const jurusanViaKelas = kelas.Jurusan || kelas.jurusan || {};
  const effectiveJurusan = jurusanViaKelas.nama ? jurusanViaKelas : jurusanDirect;

  const progDirect = effectiveJurusan.ProgramKeahlian || effectiveJurusan.programKeahlian || {};
  const progViaKelas = jurusanViaKelas.ProgramKeahlian || jurusanViaKelas.programKeahlian || {};
  const effectiveProg = progViaKelas.nama ? progViaKelas : progDirect;

  // Nama Kelas & Tingkat
  const rawNamaKelas = kelas.nama_kelas || kelas.nama || raw.nama_kelas || raw.nama_rombel || '';
  let tingkat = Number(kelas.tingkat || raw.tingkat || 10);
  if (isNaN(tingkat) || tingkat <= 0) {
    if (rawNamaKelas.startsWith('XII') || rawNamaKelas.startsWith('12')) tingkat = 12;
    else if (rawNamaKelas.startsWith('XI') || rawNamaKelas.startsWith('11')) tingkat = 11;
    else tingkat = 10;
  }
  const tingkatRomawi = tingkat === 12 ? 'XII' : tingkat === 11 ? 'XI' : 'X';
  const fase: 'E' | 'F' = tingkat === 10 ? 'E' : 'F';

  // Konsentrasi Keahlian, Program Keahlian, & Bidang Keahlian
  const jurusanNama = effectiveJurusan.nama || raw.konsentrasi_keahlian || rawNamaKelas || '-';
  const programKeahlian = effectiveProg.nama || raw.program_keahlian || effectiveJurusan.nama || '-';
  const bidangKeahlian = effectiveProg.bidang_keahlian || raw.bidang_keahlian || '-';

  // Identitas Personal
  const nama = raw.nama_siswa || raw.nama || raw.Siswa?.nama_siswa || raw.Siswa?.nama || '';
  const nis = raw.nis || raw.Siswa?.nis || '-';
  const nisn = raw.nisn || raw.Siswa?.nisn || '-';
  const nik = raw.nik || raw.Siswa?.nik || '-';
  
  const jkRaw = String(raw.jenis_kelamin || raw.Siswa?.jenis_kelamin || 'L').toUpperCase();
  const jenisKelamin: 'L' | 'P' = jkRaw.startsWith('P') ? 'P' : 'L';
  const jenisKelaminLabel = jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki';

  const tempatLahir = raw.tempat_lahir || raw.Siswa?.tempat_lahir || '';
  const tanggalLahir = raw.tanggal_lahir || raw.Siswa?.tanggal_lahir || null;
  const ttlFormatted = formatTtl(tempatLahir, tanggalLahir);

  // Foto Profil
  const foto = raw.foto || raw.foto_url || raw.Siswa?.foto || raw.Siswa?.foto_url || null;
  const hasFoto = Boolean(foto && String(foto).trim().length > 0);

  // Orang Tua & Wali
  const namaAyah = raw.nama_ayah || raw.Siswa?.nama_ayah || '-';
  const namaIbu = raw.nama_ibu || raw.Siswa?.nama_ibu || '-';
  const namaWali = raw.nama_wali || raw.Siswa?.nama_wali || '-';
  const namaOrtuFormal = (namaAyah !== '-' ? namaAyah : (namaIbu !== '-' ? namaIbu : (namaWali !== '-' ? namaWali : '-')));

  const kontakOrtu = raw.no_hp_ortu || raw.no_hp_ayah || raw.no_hp_ibu || raw.no_hp_wali || raw.no_hp || '-';

  return {
    id: raw.id || raw.siswa_id || raw.Siswa?.id || '',
    nama,
    nis,
    nisn,
    nik,
    jenisKelamin,
    jenisKelaminLabel,
    agama: raw.agama || raw.Siswa?.agama || 'Islam',
    fotoUrl: foto,
    hasFoto,
    initials: formatInitials(nama),
    tempatLahir,
    tanggalLahir,
    ttlFormatted,
    kelasId: kelas.id || raw.kelas_id || '',
    namaKelas: rawNamaKelas || '-',
    tingkat,
    tingkatRomawi,
    fase,
    jurusanNama,
    programKeahlian,
    bidangKeahlian,
    namaAyah,
    pekerjaanAyah: raw.pekerjaan_ayah || raw.Siswa?.pekerjaan_ayah || '-',
    nikAyah: raw.nik_ayah || raw.Siswa?.nik_ayah || '-',
    noHpAyah: raw.no_hp_ayah || raw.Siswa?.no_hp_ayah || '-',
    namaIbu,
    pekerjaanIbu: raw.pekerjaan_ibu || raw.Siswa?.pekerjaan_ibu || '-',
    nikIbu: raw.nik_ibu || raw.Siswa?.nik_ibu || '-',
    noHpIbu: raw.no_hp_ibu || raw.Siswa?.no_hp_ibu || '-',
    namaWali,
    pekerjaanWali: raw.pekerjaan_wali || raw.Siswa?.pekerjaan_wali || '-',
    nikWali: raw.nik_wali || raw.Siswa?.nik_wali || '-',
    noHpWali: raw.no_hp_wali || raw.Siswa?.no_hp_wali || '-',
    hubunganWali: raw.hubungan_wali || raw.Siswa?.hubungan_wali || '-',
    namaOrtuFormal,
    kontakOrtu,
    alamatLengkap: formatAlamatLengkap(raw.Siswa || raw),
    dusun: raw.dusun || raw.Siswa?.dusun || '',
    rt: raw.rt || raw.Siswa?.rt || '',
    rw: raw.rw || raw.Siswa?.rw || '',
    kelurahan: raw.kelurahan || raw.Siswa?.kelurahan || '',
    kecamatan: raw.kecamatan || raw.Siswa?.kecamatan || '',
    kabupaten: raw.kabupaten || raw.Siswa?.kabupaten || '',
    provinsi: raw.provinsi || raw.Siswa?.provinsi || '',
    kodePos: raw.kode_pos || raw.Siswa?.kode_pos || '',
    sekolahAsal: raw.sekolah_asal || raw.Siswa?.sekolah_asal || '-',
    tanggalMasuk: raw.tanggal_masuk ? formatTanggalIndonesia(raw.tanggal_masuk) : null,
    status: raw.status || raw.Siswa?.status || 'AKTIF',
  };
}

/**
 * Normalizer Identitas Pendidik (Guru / Pegawai)
 */
export function normalizeTeacherIdentity(raw: any): TeacherIdentity {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      nama: 'Guru',
      namaLengkapGelar: 'Guru',
      nip: null,
      nipClean: '',
      nipFormatted: '',
      nuptk: null,
      nik: null,
      jenisKelaminLabel: 'Laki-laki',
      agama: '-',
      fotoUrl: null,
      hasFoto: false,
      initials: 'GR',
      statusKepegawaian: 'Honorer',
      pangkatGolongan: '-',
      jabatan: 'Tenaga Pendidik',
      jenisPtk: 'Guru Mapel',
      pendidikanTerakhir: '-',
      tempatLahir: '',
      tanggalLahir: null,
      ttlFormatted: '-',
      noHp: '-',
      alamatLengkap: '-',
    };
  }

  const nama = raw.nama_guru || raw.nama || raw.name || '';
  const nipRaw = raw.nip || raw.nip_guru || null;
  const nipCleanVal = cleanNip(nipRaw);
  const nipFormattedVal = formatNip(nipCleanVal);

  const foto = raw.foto || raw.foto_url || raw.avatar || null;
  const hasFoto = Boolean(foto && String(foto).trim().length > 0);

  const tempatLahir = raw.tempat_lahir || '';
  const tanggalLahir = raw.tanggal_lahir || null;
  const ttlFormatted = formatTtl(tempatLahir, tanggalLahir);

  const jkRaw = String(raw.jenis_kelamin || 'L').toUpperCase();
  const jenisKelaminLabel = jkRaw.startsWith('P') ? 'Perempuan' : 'Laki-laki';

  return {
    id: raw.id || raw.guru_id || '',
    nama,
    namaLengkapGelar: raw.nama_lengkap || raw.nama_dengan_gelar || nama,
    nip: nipCleanVal || null,
    nipClean: nipCleanVal,
    nipFormatted: nipFormattedVal,
    nuptk: raw.nuptk || null,
    nik: raw.nik || null,
    jenisKelaminLabel,
    agama: raw.agama || 'Islam',
    fotoUrl: foto,
    hasFoto,
    initials: formatInitials(nama),
    statusKepegawaian: raw.status_kepegawaian || raw.status || 'PNS',
    pangkatGolongan: raw.pangkat_golongan || raw.golongan || '-',
    jabatan: raw.jabatan || 'Guru Mata Pelajaran',
    jenisPtk: raw.jenis_ptk || 'Guru Mapel',
    pendidikanTerakhir: raw.pendidikan_terakhir || '-',
    tempatLahir,
    tanggalLahir,
    ttlFormatted,
    noHp: raw.no_hp || raw.telepon || '-',
    alamatLengkap: formatAlamatLengkap(raw),
  };
}
