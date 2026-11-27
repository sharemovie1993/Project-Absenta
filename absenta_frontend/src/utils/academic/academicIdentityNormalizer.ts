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
  namaJurusan: string; // Alias untuk kemudahan akses komponen
  konsentrasiKeahlian: string; // Alias untuk kemudahan akses komponen
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

export interface TugasTambahanItem {
  id?: string;
  code: string;
  kode: string;
  nama: string;
  kelas?: string | null;
  detail?: string | null;
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
  noKk: string | null;
  npwp: string | null;
  namaIbuKandung: string | null;
  jenisKelaminLabel: 'Laki-laki' | 'Perempuan';
  jenisKelamin: 'L' | 'P';
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
  tmtGuru: string | null;
  maxJp: number;
  noRfid: string | null;

  // Penugasan Struktural & Fungsional
  isWaliKelas: boolean;
  waliKelasDi: string | null;
  waliKelasId: string | null;
  isKaprog: boolean;
  kaprogJurusan: string | null;
  isPembimbingPkl: boolean;
  activePklCount: number;
  isPiketGuru: boolean;
  activePiketCount: number;
  isFasilitatorP5: boolean;
  activeP5Count: number;
  tugasTambahanList: TugasTambahanItem[];
  tugasTambahanLabel: string;

  // Tempat & Tanggal Lahir
  tempatLahir: string;
  tanggalLahir: string | Date | null;
  ttlFormatted: string;

  // Kontak & Alamat
  email: string | null;
  noHp: string;
  alamatLengkap: string;
  dusun: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
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
  const cleanTempat = tStr
    ? tStr
        .split(/\s+/)
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
        .join(' ')
    : '';
  const dStr = formatTanggalIndonesia(tanggal).trim();
  if (cleanTempat && dStr) return `${cleanTempat}, ${dStr}`;
  return cleanTempat || dStr || '';
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
 * Sesuai Pedoman Tata Naskah Dinas Resmi (TND Kemendikbudristek & BKN):
 * 18 digit angka NIP ditulis bersambung/digabung tanpa spasi (misal: NIP. 197111022008011001).
 */
export function formatNip(nip?: string | null): string {
  const c = cleanNip(nip);
  if (!c) return '';
  const digitsOnly = c.replace(/\D/g, '');
  return `NIP. ${digitsOnly || c}`;
}

/**
 * Format Alamat Lengkap
 */
export function formatAlamatLengkap(obj: Record<string, any>): string {
  if (!obj) return '';
  if (obj.alamat_lengkap) return String(obj.alamat_lengkap).trim();

  const parts: string[] = [];
  if (obj.alamat_jalan || obj.alamat) parts.push(String(obj.alamat_jalan || obj.alamat).trim());
  
  const rtRw = [obj.rt ? `RT ${obj.rt}` : '', obj.rw ? `RW ${obj.rw}` : ''].filter(Boolean).join(' / ');
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
      namaJurusan: '-',
      konsentrasiKeahlian: '-',
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
  const jurusanDirect = raw.Jurusan || raw.jurusan || raw.Siswa?.Jurusan || raw.Siswa?.jurusan;
  const jurusanViaKelas = kelas.Jurusan || kelas.jurusan;

  const jurusanObj = (typeof jurusanViaKelas === 'object' && jurusanViaKelas !== null)
    ? jurusanViaKelas
    : (typeof jurusanDirect === 'object' && jurusanDirect !== null ? jurusanDirect : null);

  const jurusanStr = typeof raw.jurusan === 'string'
    ? raw.jurusan
    : (typeof raw.Jurusan === 'string' ? raw.Jurusan : (typeof raw.nama_jurusan === 'string' ? raw.nama_jurusan : ''));

  const rawJurusanNama = jurusanObj?.nama || jurusanObj?.nama_jurusan || jurusanStr || '';

  const progViaJurusan = jurusanObj?.ProgramKeahlian || jurusanObj?.programKeahlian;
  const progDirect = raw.ProgramKeahlian || raw.program_keahlian || raw.Siswa?.ProgramKeahlian;
  const progObj = (typeof progViaJurusan === 'object' && progViaJurusan !== null)
    ? progViaJurusan
    : (typeof progDirect === 'object' && progDirect !== null ? progDirect : null);
  const progStr = typeof raw.program_keahlian === 'string' ? raw.program_keahlian : '';

  const rawProgNama = progObj?.nama || progObj?.nama_program_keahlian || progStr || '';

  const progBidangStr = typeof progObj?.bidang_keahlian === 'string'
    ? progObj.bidang_keahlian
    : (typeof progObj?.bidangKeahlian === 'string' ? progObj.bidangKeahlian : '');

  const bidangViaProg = progObj?.BidangKeahlian || progObj?.bidangKeahlian;
  const bidangDirect = raw.BidangKeahlian || raw.bidang_keahlian;
  const bidangObj = (typeof bidangViaProg === 'object' && bidangViaProg !== null)
    ? bidangViaProg
    : (typeof bidangDirect === 'object' && bidangDirect !== null ? bidangDirect : null);
  const bidangStr = typeof raw.bidang_keahlian === 'string'
    ? raw.bidang_keahlian
    : (progBidangStr || '');

  const rawBidangNama = bidangObj?.nama || bidangObj?.bidang_keahlian || bidangStr || '-';

  // Nama Kelas & Tingkat
  const rawNamaKelas = kelas.nama_kelas || kelas.nama || raw.nama_kelas || raw.nama_rombel || raw.kelas || '';
  let tingkat = Number(kelas.tingkat || raw.tingkat || 10);
  if (isNaN(tingkat) || tingkat <= 0) {
    if (rawNamaKelas.startsWith('XII') || rawNamaKelas.startsWith('12')) tingkat = 12;
    else if (rawNamaKelas.startsWith('XI') || rawNamaKelas.startsWith('11')) tingkat = 11;
    else tingkat = 10;
  }
  const tingkatRomawi = tingkat === 12 ? 'XII' : tingkat === 11 ? 'XI' : 'X';
  const fase: 'E' | 'F' = tingkat === 10 ? 'E' : 'F';

  // Konsentrasi Keahlian, Program Keahlian, & Bidang Keahlian
  const jurusanNama = rawJurusanNama || raw.konsentrasi_keahlian || (rawNamaKelas ? '' : '-') || '-';
  const programKeahlian = rawProgNama || rawJurusanNama || '-';
  const bidangKeahlian = rawBidangNama;

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
  const PEKERJAAN_LABEL_MAP: Record<string, string> = {
    PNS: 'PNS',
    TNI_POLRI: 'TNI/Polri',
    GURU: 'Guru',
    DOSEN: 'Dosen',
    DOKTER: 'Dokter',
    BIDAN: 'Bidan',
    PERAWAT: 'Perawat',
    PENGUSAHA: 'Pengusaha',
    PEDAGANG: 'Pedagang',
    PETANI: 'Petani',
    PETERNAK: 'Peternak',
    NELAYAN: 'Nelayan',
    BURUH: 'Buruh',
    KARYAWAN_SWASTA: 'Karyawan Swasta',
    WIRASWASTA: 'Wiraswasta',
    PENSIUNAN: 'Pensiunan',
    IRT: 'Ibu Rumah Tangga',
    TIDAK_BEKERJA: 'Tidak Bekerja',
    LAINNYA: 'Lainnya',
  };

  const HUBUNGAN_WALI_LABEL_MAP: Record<string, string> = {
    AYAH_KANDUNG: 'Ayah Kandung',
    IBU_KANDUNG: 'Ibu Kandung',
    KAKEK: 'Kakek',
    NENEK: 'Nenek',
    PAMAN: 'Paman',
    BIBI: 'Bibi',
    KAKAK: 'Kakak',
    ADIK: 'Adik',
    LAINNYA: 'Lainnya',
  };

  const formatPekerjaanLabel = (val?: string | null): string => {
    if (!val || !String(val).trim() || String(val).trim() === '-') return '-';
    const s = String(val).trim();
    const upper = s.toUpperCase();
    return PEKERJAAN_LABEL_MAP[upper] || s;
  };

  const formatHubunganWaliLabel = (val?: string | null): string => {
    if (!val || !String(val).trim() || String(val).trim() === '-') return '-';
    const s = String(val).trim();
    const upper = s.toUpperCase();
    return HUBUNGAN_WALI_LABEL_MAP[upper] || s;
  };

  const rawNamaAyah = raw.nama_ayah || raw.Siswa?.nama_ayah || '';
  const rawNamaIbu = raw.nama_ibu || raw.Siswa?.nama_ibu || '';
  const rawNamaWali = raw.nama_wali || raw.Siswa?.nama_wali || '';

  const namaAyah = String(rawNamaAyah).trim() && String(rawNamaAyah).trim() !== '-' ? String(rawNamaAyah).trim() : '-';
  const namaIbu = String(rawNamaIbu).trim() && String(rawNamaIbu).trim() !== '-' ? String(rawNamaIbu).trim() : '-';
  const namaWali = String(rawNamaWali).trim() && String(rawNamaWali).trim() !== '-' ? String(rawNamaWali).trim() : '-';
  const hasValidWali = namaWali !== '-';

  const namaOrtuFormal = (namaAyah !== '-' ? namaAyah : (namaIbu !== '-' ? namaIbu : (namaWali !== '-' ? namaWali : '-')));

  const kontakOrtu =
    raw.no_hp_ortu ||
    raw.no_hp_ayah ||
    raw.no_hp_ibu ||
    (hasValidWali ? raw.no_hp_wali : null) ||
    raw.no_hp ||
    '-';

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
    namaJurusan: jurusanNama,
    konsentrasiKeahlian: jurusanNama,
    programKeahlian,
    bidangKeahlian,
    namaAyah,
    pekerjaanAyah: formatPekerjaanLabel(raw.pekerjaan_ayah || raw.Siswa?.pekerjaan_ayah),
    nikAyah: raw.nik_ayah || raw.Siswa?.nik_ayah || '-',
    noHpAyah: raw.no_hp_ayah || raw.Siswa?.no_hp_ayah || '-',
    namaIbu,
    pekerjaanIbu: formatPekerjaanLabel(raw.pekerjaan_ibu || raw.Siswa?.pekerjaan_ibu),
    nikIbu: raw.nik_ibu || raw.Siswa?.nik_ibu || '-',
    noHpIbu: raw.no_hp_ibu || raw.Siswa?.no_hp_ibu || '-',
    namaWali,
    pekerjaanWali: hasValidWali ? formatPekerjaanLabel(raw.pekerjaan_wali || raw.Siswa?.pekerjaan_wali) : '-',
    nikWali: hasValidWali ? (raw.nik_wali || raw.Siswa?.nik_wali || '-') : '-',
    noHpWali: hasValidWali ? (raw.no_hp_wali || raw.Siswa?.no_hp_wali || '-') : '-',
    hubunganWali: hasValidWali ? formatHubunganWaliLabel(raw.hubungan_wali || raw.Siswa?.hubungan_wali) : '-',
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
      noKk: null,
      npwp: null,
      namaIbuKandung: null,
      jenisKelamin: 'L',
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
      tmtGuru: null,
      maxJp: 24,
      noRfid: null,
      isWaliKelas: false,
      waliKelasDi: null,
      waliKelasId: null,
      isKaprog: false,
      kaprogJurusan: null,
      isPembimbingPkl: false,
      activePklCount: 0,
      isPiketGuru: false,
      activePiketCount: 0,
      isFasilitatorP5: false,
      activeP5Count: 0,
      tugasTambahanList: [],
      tugasTambahanLabel: 'Guru Mata Pelajaran',
      tempatLahir: '',
      tanggalLahir: null,
      ttlFormatted: '-',
      email: null,
      noHp: '-',
      alamatLengkap: '-',
      dusun: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
      kabupaten: '',
      provinsi: '',
      kodePos: '',
    };
  }

  const nama = raw.nama_guru || raw.nama || raw.name || raw.Guru?.nama_guru || '';
  const nipRaw = raw.nip || raw.nip_guru || raw.Guru?.nip || null;
  const nipCleanVal = cleanNip(nipRaw);
  const nipFormattedVal = formatNip(nipCleanVal);

  const foto = raw.foto || raw.foto_url || raw.avatar || raw.Guru?.foto || null;
  const hasFoto = Boolean(foto && String(foto).trim().length > 0);

  const tempatLahir = raw.tempat_lahir || raw.Guru?.tempat_lahir || '';
  const tanggalLahir = raw.tanggal_lahir || raw.Guru?.tanggal_lahir || null;
  const ttlFormatted = formatTtl(tempatLahir, tanggalLahir);

  const jkRaw = String(raw.jenis_kelamin || raw.Guru?.jenis_kelamin || 'L').toUpperCase();
  const jenisKelamin: 'L' | 'P' = jkRaw.startsWith('P') ? 'P' : 'L';
  const jenisKelaminLabel = jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki';

  let namaLengkapGelar = raw.nama_lengkap || raw.nama_dengan_gelar || '';
  if (!namaLengkapGelar && nama) {
    const gDepan = (raw.gelar_depan || raw.Guru?.gelar_depan || '').trim();
    const gBelakang = (raw.gelar_belakang || raw.Guru?.gelar_belakang || '').trim();
    const parts: string[] = [];
    if (gDepan) parts.push(gDepan);
    parts.push(nama);
    let base = parts.join(' ');
    if (gBelakang) base = `${base}, ${gBelakang}`;
    namaLengkapGelar = base;
  }
  if (!namaLengkapGelar) namaLengkapGelar = nama || 'Guru';

  // ── Penugasan Struktural & Organizational Positions ──────────────────────
  // 1. Kumpulkan semua position code dari berbagai field payload
  const rawCodes: string[] = [];
  if (Array.isArray(raw.position_codes)) {
    raw.position_codes.forEach((c: any) => { if (c) rawCodes.push(String(c).toUpperCase()); });
  }
  if (Array.isArray(raw.jabatan_list)) {
    raw.jabatan_list.forEach((c: any) => { if (c) rawCodes.push(String(c).toUpperCase()); });
  }
  if (Array.isArray(raw.positions)) {
    raw.positions.forEach((p: any) => {
      const code = p?.code || p?.name || (typeof p === 'string' ? p : null);
      if (code) rawCodes.push(String(code).toUpperCase());
    });
  }

  // 2. Kumpulkan raw assignments
  const rawAssignments: any[] = [];
  if (Array.isArray(raw.organizational_assignments)) {
    rawAssignments.push(...raw.organizational_assignments);
  }
  if (Array.isArray(raw.organizationalAssignments)) {
    rawAssignments.push(...raw.organizationalAssignments);
  }
  if (Array.isArray(raw.assignments)) {
    rawAssignments.push(...raw.assignments);
  }

  rawAssignments.forEach((a: any) => {
    const code = a.position_code || a.Position?.code || a.pos_code || a.kode || a.code;
    if (code) rawCodes.push(String(code).toUpperCase());
  });

  const uniqueCodes = Array.from(new Set(rawCodes));

  // 3. Kaprog Resolution
  const rawKaprogObj = raw.kaprog_jurusan || raw.kaprogJurusan || raw.Jurusan;
  const kaprogJurusan = rawKaprogObj?.nama || rawKaprogObj?.nama_jurusan || rawKaprogObj?.singkatan || (typeof rawKaprogObj === 'string' ? rawKaprogObj : null);
  const isKaprog = Boolean(
    uniqueCodes.includes('KAPROG') ||
    raw.is_kaprog ||
    raw.isKaprog ||
    rawKaprogObj ||
    (raw.jabatan && String(raw.jabatan).toUpperCase().includes('KAPROG')) ||
    (raw.tugas_tambahan && String(raw.tugas_tambahan).toUpperCase().includes('KAPROG'))
  );

  // 4. Wali Kelas Resolution (Ketat: Hanya true jika terdaftar resmi & ada objek/nama kelas)
  const rawWaliKelasObj = raw.wali_kelas_di || raw.walikelas_kelas;
  const waliKelasDi = rawWaliKelasObj?.nama_kelas || rawWaliKelasObj?.nama || (typeof rawWaliKelasObj === 'string' ? rawWaliKelasObj : null);
  const waliKelasId = rawWaliKelasObj?.id || null;
  const isWaliKelas = Boolean(
    (uniqueCodes.includes('WALIKELAS') || uniqueCodes.includes('WALI_KELAS') || raw.is_wali_kelas || (raw.jabatan && String(raw.jabatan).toLowerCase().includes('wali'))) &&
    (waliKelasDi || raw.walikelas_kelas || raw.wali_kelas_di)
  );

  // 5. Pembimbing PKL, Piket, P5
  const activePklCount = Number(raw.active_pkl_count || 0);
  const isPembimbingPkl = Boolean(
    uniqueCodes.includes('PEMBIMBING_PKL') ||
    activePklCount > 0 ||
    (raw.is_pembimbing_pkl && activePklCount > 0)
  );

  const isPiketGuru = Boolean(
    uniqueCodes.includes('PIKET') ||
    uniqueCodes.includes('GURU_PIKET') ||
    raw.is_piket_guru ||
    (raw.active_piket_count && raw.active_piket_count > 0)
  );
  const activePiketCount = Number(raw.active_piket_count || 0);

  const isFasilitatorP5 = Boolean(
    uniqueCodes.includes('FASILITATOR_P5') ||
    raw.is_fasilitator_p5 ||
    (raw.active_p5_count && raw.active_p5_count > 0)
  );
  const activeP5Count = Number(raw.active_p5_count || 0);

  // 6. Construct canonical tugasTambahanList
  const POSITION_CODE_NAMES: Record<string, string> = {
    KAPROG: 'Ketua Program Keahlian (Kaprog)',
    WALIKELAS: 'Wali Kelas',
    WALI_KELAS: 'Wali Kelas',
    KEPALA_SEKOLAH: 'Kepala Sekolah',
    KURIKULUM: 'Waka Kurikulum',
    KESISWAAN: 'Waka Kesiswaan',
    HUBIN: 'Waka Hubinmas',
    SARPRAS: 'Waka Sarana & Prasarana',
    BPBK: 'Guru BK / Konselor',
    BKK: 'Bursa Kerja Khusus (BKK)',
    TOOLMAN: 'Teknisi / Toolman',
    KABENG: 'Kepala Bengkel / Lab',
    PEMBINA_ESKUL: 'Pembina Ekstrakurikuler',
    GERBANG: 'Petugas Piket Gerbang',
    PETUGAS_KELAS: 'Petugas Kelas',
    TU_KEPALA: 'Kepala Tata Usaha',
    TU: 'Staf Tata Usaha',
    TU_PERSURATAN: 'Staf TU Persuratan',
    TU_KEUANGAN: 'Staf TU Keuangan',
    TU_KEPEGAWAIAN: 'Staf TU Kepegawaian',
    TU_SARPRAS: 'Staf TU Logistik & Sarpras',
    KOPERASI: 'Pengurus Koperasi',
    PEMBIMBING_PKL: 'Pembimbing PKL',
    PIKET: 'Guru Piket',
    GURU_PIKET: 'Guru Piket',
    FASILITATOR_P5: 'Fasilitator P5',
  };

  const tugasTambahanList: TugasTambahanItem[] = [];
  const addedCodes = new Set<string>();

  // Prioritas 1: Kaprog
  if (isKaprog) {
    addedCodes.add('KAPROG');
    tugasTambahanList.push({
      code: 'KAPROG',
      kode: 'KAPROG',
      nama: kaprogJurusan ? `Kaprog — ${kaprogJurusan}` : 'Ketua Program Keahlian (Kaprog)',
      detail: kaprogJurusan || null,
    });
  }

  // Prioritas 2: Wali Kelas
  if (isWaliKelas && waliKelasDi) {
    addedCodes.add('WALIKELAS');
    addedCodes.add('WALI_KELAS');
    tugasTambahanList.push({
      code: 'WALIKELAS',
      kode: 'WALIKELAS',
      nama: `Wali Kelas — ${waliKelasDi}`,
      kelas: waliKelasDi,
      detail: waliKelasDi,
    });
  }

  // Prioritas 3: Structured assignments from OrganizationalAssignment
  rawAssignments.forEach((a: any) => {
    const rawCode = a.position_code || a.Position?.code || a.pos_code || a.kode || a.code;
    if (!rawCode) return;
    const cUpper = String(rawCode).toUpperCase();
    if (addedCodes.has(cUpper)) return;
    addedCodes.add(cUpper);

    const posName = a.position_name || a.Position?.name || a.pos_name || POSITION_CODE_NAMES[cUpper] || rawCode;
    const detail = a.kelas?.nama_kelas || a.Kelas?.nama_kelas || a.unit?.nama || a.Unit?.nama || null;
    tugasTambahanList.push({
      id: a.id,
      code: cUpper,
      kode: cUpper,
      nama: detail ? `${posName} — ${detail}` : posName,
      kelas: a.kelas?.nama_kelas || a.Kelas?.nama_kelas || null,
      detail,
    });
  });

  // Prioritas 4: Other position codes
  uniqueCodes.forEach((cUpper) => {
    if (addedCodes.has(cUpper)) return;
    if (cUpper === 'GURU' || cUpper === 'STAFF' || cUpper === 'USER') return;
    addedCodes.add(cUpper);
    const posName = POSITION_CODE_NAMES[cUpper] || cUpper;
    tugasTambahanList.push({
      code: cUpper,
      kode: cUpper,
      nama: posName,
      detail: null,
    });
  });

  // Prioritas 5: Fungsional duties
  if (isPembimbingPkl && !addedCodes.has('PEMBIMBING_PKL')) {
    addedCodes.add('PEMBIMBING_PKL');
    tugasTambahanList.push({
      code: 'PEMBIMBING_PKL',
      kode: 'PEMBIMBING_PKL',
      nama: activePklCount > 0 ? `Pembimbing PKL (${activePklCount} Siswa)` : 'Pembimbing PKL',
    });
  }

  if (isPiketGuru && !addedCodes.has('PIKET') && !addedCodes.has('GURU_PIKET')) {
    addedCodes.add('PIKET');
    tugasTambahanList.push({
      code: 'PIKET',
      kode: 'PIKET',
      nama: 'Guru Piket',
    });
  }

  if (isFasilitatorP5 && !addedCodes.has('FASILITATOR_P5')) {
    addedCodes.add('FASILITATOR_P5');
    tugasTambahanList.push({
      code: 'FASILITATOR_P5',
      kode: 'FASILITATOR_P5',
      nama: activeP5Count > 0 ? `Fasilitator P5 (${activeP5Count} Projek)` : 'Fasilitator P5',
    });
  }

  const tugasTambahanLabel = tugasTambahanList.length > 0
    ? tugasTambahanList.map(t => t.nama).join(', ')
    : 'Guru Mata Pelajaran';

  return {
    id: raw.id || raw.guru_id || raw.Guru?.id || '',
    nama,
    namaLengkapGelar,
    nip: nipCleanVal || null,
    nipClean: nipCleanVal,
    nipFormatted: nipFormattedVal,
    nuptk: raw.nuptk || raw.Guru?.nuptk || null,
    nik: raw.nik || raw.Guru?.nik || null,
    noKk: raw.no_kk || raw.Guru?.no_kk || null,
    npwp: raw.npwp || raw.Guru?.npwp || null,
    namaIbuKandung: raw.nama_ibu_kandung || raw.Guru?.nama_ibu_kandung || null,
    jenisKelamin,
    jenisKelaminLabel,
    agama: raw.agama || raw.Guru?.agama || 'Islam',
    fotoUrl: foto,
    hasFoto,
    initials: formatInitials(nama),
    statusKepegawaian: raw.status_kepegawaian || raw.Guru?.status_kepegawaian || raw.status || 'PNS',
    pangkatGolongan: raw.pangkat_golongan || raw.Guru?.pangkat_golongan || raw.golongan || '-',
    jabatan: raw.jabatan || raw.Guru?.jabatan || 'Guru Mata Pelajaran',
    jenisPtk: raw.jenis_ptk || raw.Guru?.jenis_ptk || 'Guru Mapel',
    pendidikanTerakhir: raw.pendidikan_terakhir || raw.Guru?.pendidikan_terakhir || '-',
    tmtGuru: raw.tmt_guru ? formatTanggalIndonesia(raw.tmt_guru) : null,
    maxJp: Number(raw.max_jp || raw.Guru?.max_jp || 24),
    noRfid: raw.no_rfid || raw.Guru?.no_rfid || null,
    isWaliKelas,
    waliKelasDi,
    waliKelasId,
    isKaprog,
    kaprogJurusan,
    isPembimbingPkl,
    activePklCount,
    isPiketGuru,
    activePiketCount,
    isFasilitatorP5,
    activeP5Count,
    tugasTambahanList,
    tugasTambahanLabel,
    tempatLahir,
    tanggalLahir,
    ttlFormatted,
    email: raw.email || raw.User?.email || null,
    noHp: raw.no_hp || raw.telepon || raw.User?.no_hp || '-',
    alamatLengkap: formatAlamatLengkap(raw.Guru || raw),
    dusun: raw.dusun || raw.Guru?.dusun || '',
    rt: raw.rt || raw.Guru?.rt || '',
    rw: raw.rw || raw.Guru?.rw || '',
    kelurahan: raw.kelurahan || raw.Guru?.kelurahan || raw.desa || '',
    kecamatan: raw.kecamatan || raw.Guru?.kecamatan || '',
    kabupaten: raw.kabupaten || raw.Guru?.kabupaten || raw.kota || '',
    provinsi: raw.provinsi || raw.Guru?.provinsi || '',
    kodePos: raw.kode_pos || raw.Guru?.kode_pos || '',
  };
}
