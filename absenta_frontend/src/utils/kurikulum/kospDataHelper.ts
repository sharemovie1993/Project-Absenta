import { StrukturKurikulum, getJpValueForSemester, getSubjectSortRank, detectKelompokForMapel } from './masterStrukturHelper';
import type { Jurusan } from '../../types/academic';

/**
 * Generates Word-style HTML for Cover Logo
 */
export const buildKospCoverLogoHtml = (logoUrl?: string, defaultName: string = 'Sekolah'): string => {
  if (logoUrl) {
    return `<img src="${logoUrl}" alt="Logo Sekolah" style="max-height:160px; width:auto; margin:24px auto; display:block; object-fit:contain;" />`;
  }
  return `
    <div style="width:140px; height:140px; margin:28px auto; border-radius:50%; background-color:#eff6ff; border:3px double #2563eb; display:flex; align-items:center; justify-content:center; text-align:center; color:#1e40af; font-weight:bold; font-size:12px; padding:12px; box-sizing:border-box;">
      LOGO RESMI<br/>${defaultName.toUpperCase()}
    </div>
  `;
};

export interface TimPenyusunItem {
  no?: number;
  nama: string;
  jabatan_kedinasan: string;
  jabatan_tim: string;
}

/**
 * Generates Word-style HTML Table for SK Tim Penyusun KOSP
 */
export const buildKospSkTimTableHtml = (
  namaKepsek: string, 
  wakasekKurikulum: string,
  customTimList?: TimPenyusunItem[]
): string => {
  const defaultList: TimPenyusunItem[] = [
    { no: 1, nama: namaKepsek, jabatan_kedinasan: 'Kepala Sekolah', jabatan_tim: 'Penanggung Jawab' },
    { no: 2, nama: wakasekKurikulum, jabatan_kedinasan: 'Wakasek Bidang Kurikulum', jabatan_tim: 'Ketua Tim Penyusun' },
    { no: 3, nama: 'Drs. H. Mulyana, M.Pd.', jabatan_kedinasan: 'Pengawas Pembina Sekolah', jabatan_tim: 'Narasumber / Pendamping' },
    { no: 4, nama: 'H. Dudung Abdurrahman, M.Pd.', jabatan_kedinasan: 'Ketua Komite Sekolah', jabatan_tim: 'Narasumber Komite' },
    { no: 5, nama: 'Wakasek Bidang Kesiswaan', jabatan_kedinasan: 'Wakasek Kesiswaan', jabatan_tim: 'Anggota / Tim Pengembang' },
    { no: 6, nama: 'Wakasek Bidang Humas & Hubin', jabatan_kedinasan: 'Wakasek Humas/DUDI', jabatan_tim: 'Anggota / Tim Penyelaras DUDI' },
    { no: 7, nama: 'Wakasek Bidang Sarana Prasarana', jabatan_kedinasan: 'Wakasek Sarpras', jabatan_tim: 'Anggota / Tim Fasilitas' },
    { no: 8, nama: 'Para Ketua Program Keahlian (Kaprog)', jabatan_kedinasan: 'Kaprog Keahlian', jabatan_tim: 'Anggota / Tim Kurikulum Jurusan' },
    { no: 9, nama: 'Koor. Bimbingan Konseling (BK)', jabatan_kedinasan: 'Guru BK', jabatan_tim: 'Anggota / Tim Asesmen & Karakter' },
  ];

  const listToRender = (customTimList && customTimList.length > 0) ? customTimList : defaultList;

  const rows = listToRender.map((item, idx) => `
    <tr>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.no || (idx + 1)}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; font-weight:bold;">${item.nama}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.jabatan_kedinasan}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center; font-weight:bold; color:#1e3a8a;">${item.jabatan_tim}</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top:12px; margin-bottom:20px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Susunan Tim Pengembang & Penyusun KOSP
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:7%;">NO</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:33%;">NAMA PERSONAL</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:30%;">JABATAN KEDINASAN</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:30%;">TUGAS DALAM TIM</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates Word-style HTML Table for Tema P5 (Projek Penguatan Profil Pelajar Pancasila)
 */
export const buildKospP5TableHtml = (): string => {
  const temaList = [
    { no: 1, tema: 'Gaya Hidup Berkelanjutan', alokasi: 'Kelas X (Sem 1)', target: 'Kesadaran Pengelolaan Sampah & Lingkungan Sekolah' },
    { no: 2, tema: 'Kearifan Lokal', alokasi: 'Kelas X (Sem 2)', target: 'Pelestarian Seni Budaya & Tradisi Daerah' },
    { no: 3, tema: 'Bhinneka Tunggal Ika', alokasi: 'Kelas XI (Sem 1)', target: 'Toleransi & Moderasi Beragama dalam Kebinekaan' },
    { no: 4, tema: 'Kebekerjaan (Tema Wajib SMK)', alokasi: 'Kelas XI (Sem 2) & XII', target: 'Budaya Kerja Industri (5R/5S), K3LH, & Soft Skills' },
  ];

  const rows = temaList.map(item => `
    <tr>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.no}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; font-weight:bold; color:#0f172a;">${item.tema}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.alokasi}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.target}</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top:12px; margin-bottom:20px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Matriks Tema Projek Penguatan Profil Pelajar Pancasila (P5) & Budaya Kerja
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:7%;">NO</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:33%;">TEMA P5</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:22%;">SASARAN & WAKTU</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:38%;">FOCUS CAPAIAN PROJECT</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates Word-style HTML Table for Ekstrakurikuler
 */
export const buildKospEskulTableHtml = (): string => {
  const eskulList = [
    { no: 1, jenis: 'Wajib', nama: 'Pramuka (Kepramukaan)', sasaran: 'Seluruh Siswa Kelas X', pembina: 'Tim Pembina Kepramukaan' },
    { no: 2, jenis: 'Pilihan (Bela Negara)', nama: 'Paskibra & PMR', sasaran: 'Siswa Minat Kelas X & XI', pembina: 'Pembina Paskibra & PMR' },
    { no: 3, jenis: 'Pilihan (Olahraga)', nama: 'Futsal, Bola Voli, Basket, Pencak Silat', sasaran: 'Siswa Minat Kelas X, XI, XII', pembina: 'Guru Olahraga & Pelatih Eksternal' },
    { no: 4, jenis: 'Pilihan (Seni & Komputer)', nama: 'Seni Musik, Marawis, IT Club & Design', sasaran: 'Siswa Minat Kelas X & XI', pembina: 'Pembina Seni & Komputer' },
    { no: 5, jenis: 'Pilihan (Kerohanian)', nama: 'ROHIS / Ikatan Remaja Masjid', sasaran: 'Seluruh Siswa Muslim', pembina: 'Guru Agama Islam' },
  ];

  const rows = eskulList.map(item => `
    <tr>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.no}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center; font-weight:bold; color:${item.jenis === 'Wajib' ? '#b91c1c' : '#0369a1'};">${item.jenis}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; font-weight:bold;">${item.nama}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.sasaran}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.pembina}</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top:12px; margin-bottom:20px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Program Pengembangan Diri & Ekstrakurikuler Sekolah
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:6%;">NO</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:15%;">SIFAT</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:30%;">NAMA EKSTRAKURIKULER</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:24%;">TARGET PESERTA</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:25%;">PEMBINA / PELATIH</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates Word-style HTML Table for Kalender Pendidikan
 */
export const buildKospKalenderPendidikanHtml = (kalenderItems: any[] = []): string => {
  if (!kalenderItems || kalenderItems.length === 0) {
    return `
      <div style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; font-size:11px; text-align:center; color:#64748b;">
        <em>Kalender Pendidikan disesuaikan dengan Keputusan Kepala Dinas Pendidikan Provinsi setempat tentang Kalender Pendidikan Tahun Ajaran berjalan.</em>
      </div>
    `;
  }

  const rowsHtml = kalenderItems.map((item, idx) => `
    <tr>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.tanggal || item.tgl || '-'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; font-weight:bold;">${item.kegiatan || item.nama_kegiatan || '-'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.keterangan || item.kat || 'Kegiatan Akademik'}</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top:12px; margin-bottom:20px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Agenda Kegiatan Kalender Pendidikan Sekolah
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:7%;">NO</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:28%;">TANGGAL / WAKTU</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:45%;">NAMA KEGIATAN</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:20%;">KATEGORI</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates Word-style HTML Table for Pengaturan Jam KBM / Roster Waktu Belajar
 */
export const buildKospJamKbmHtml = (jamKbmItems: any[] = []): string => {
  const defaultTimes = [
    { jamKe: 1, waktu: '07.00 - 07.45', durasi: '45 Menit', ket: 'KBM / Upacara' },
    { jamKe: 2, waktu: '07.45 - 08.30', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: 3, waktu: '08.30 - 09.15', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: 4, waktu: '09.15 - 10.00', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: '-', waktu: '10.00 - 10.15', durasi: '15 Menit', ket: 'Istirahat I' },
    { jamKe: 5, waktu: '10.15 - 11.00', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: 6, waktu: '11.00 - 11.45', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: '-', waktu: '11.45 - 12.30', durasi: '45 Menit', ket: 'ISHOMA (Istirahat / Sholat)' },
    { jamKe: 7, waktu: '12.30 - 13.15', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: 8, waktu: '13.15 - 14.00', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: 9, waktu: '14.00 - 14.45', durasi: '45 Menit', ket: 'KBM' },
    { jamKe: 10, waktu: '14.45 - 15.30', durasi: '45 Menit', ket: 'KBM / Pembiasaan' },
  ];

  const listToRender = (jamKbmItems && jamKbmItems.length > 0) ? jamKbmItems : defaultTimes;

  const rows = listToRender.map((item) => `
    <tr style="${item.jamKe === '-' ? 'background-color:#f1f5f9; font-weight:bold;' : ''}">
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.jamKe || item.jam_ke || '-'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.waktu || `${item.jam_masuk} - ${item.jam_keluar}`}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${item.durasi || '45 Menit'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.ket || item.keterangan || 'KBM'}</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top:12px; margin-bottom:20px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Struktur Alokasi Waktu Belajar Harian (Jam KBM)
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:12%;">JAM KE</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:28%;">RENTANG WAKTU</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:20%;">DURASI</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:40%;">URAIAN KEGIATAN</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates Word-style HTML Table for Industri / DUDI Mitra PKL
 */
export const buildKospDudiMitraHtml = (dudiItems: any[] = []): string => {
  if (!dudiItems || dudiItems.length === 0) {
    return `
      <div style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; font-size:11px; text-align:center; color:#64748b;">
        <em>Mitra Dunia Usaha / Dunia Kerja (DUDI) bekerja sama secara aktif dalam sinkronisasi kurikulum, pengujian kompetensi, dan pelaksanaan Praktik Kerja Lapangan (PKL).</em>
      </div>
    `;
  }

  const displayItems = dudiItems.slice(0, 15);
  const isMoreThan15 = dudiItems.length > 15;

  const rows = displayItems.map((item, idx) => `
    <tr>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; font-weight:bold;">${item.nama || item.nama_mitra || item.nama_perusahaan || '-'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.bidang_usaha || item.bidang || 'Industri / Jasa'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${item.alamat || item.kota || '-'}</td>
      <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px; text-align:center; color:#166534; font-weight:bold;">AKTIF (MoU)</td>
    </tr>
  `).join('');

  return `
    <div style="margin-top:12px; margin-bottom:20px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Daftar Industri Pasangan / DUDI Mitra Pembelajaran
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:7%;">NO</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:33%;">NAMA INDUSTRI / PERUSAHAAN</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:22%;">BIDANG USAHA</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:23%;">ALAMAT / KOTA</th>
            <th style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:15%;">STATUS KERJA SAMA</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ${isMoreThan15 ? `<p style="font-size:10px; color:#64748b; margin-top:6px; font-style:italic;">* Menampilkan 15 dari ${dudiItems.length} total mitra DUDI. Data lengkap tersedia di modul Hubin.</p>` : ''}
    </div>
  `;
};

/**
 * Generates Word-style HTML Table for Struktur Kurikulum of a specific Jurusan
 */
export const buildKospStrukturTableHtml = (
  jurusan: Jurusan,
  mappingDataAll: StrukturKurikulum[]
): string => {
  const jurusanId = jurusan.id;
  const namaJurusan = jurusan.nama || (jurusan as any).nama_jurusan || 'Konsentrasi Keahlian';
  const kodeJurusan = jurusan.singkatan || jurusan.kode || 'KONSENTRASI';

  // Filter mapping items for this jurusan OR general subjects (no jurusan_id)
  const jurusanItems = mappingDataAll.filter(item => {
    return !item.jurusan_id || item.jurusan_id === jurusanId;
  });

  if (jurusanItems.length === 0) {
    return `
      <div style="padding:12px; border:1px dashed #cbd5e1; border-radius:6px; background:#f8fafc; text-align:center; color:#64748b; font-size:11px; margin-bottom:16px;">
        <em>Belum ada pemetaan Struktur Kurikulum untuk <strong>${namaJurusan}</strong> (${kodeJurusan}).</em>
      </div>
    `;
  }

  // Group by Mapel
  const mapelMap = new Map<string, {
    id: string;
    nama: string;
    kode: string;
    kelompok: string;
    jp: Record<number, number>;
    rawItem: any;
  }>();

  jurusanItems.forEach(item => {
    const mapelId = item.mapel_id;
    const mapelNama = item.Mapel?.nama_mapel || (item as any).nama_mapel || '';
    const mapelKode = item.Mapel?.kode_mapel || (item as any).kode_mapel || '';
    const tingkat = item.tingkat;
    const baseJp = item.jp_per_minggu;

    if (!mapelMap.has(mapelId)) {
      mapelMap.set(mapelId, {
        id: mapelId,
        nama: mapelNama,
        kode: mapelKode,
        kelompok: item.kelompok || detectKelompokForMapel(mapelKode, mapelNama),
        jp: {},
        rawItem: item
      });
    }
    mapelMap.get(mapelId)!.jp[tingkat] = baseJp;
  });

  // Sort subjects
  const sortedList = Array.from(mapelMap.values()).sort((a, b) => {
    const rankA = getSubjectSortRank(a.rawItem);
    const rankB = getSubjectSortRank(b.rawItem);
    if (rankA !== rankB) return rankA - rankB;
    return a.nama.localeCompare(b.nama);
  });

  // Categorize
  const umum = sortedList.filter(m => m.kelompok === 'MATA PELAJARAN UMUM');
  const kejuruan = sortedList.filter(m => m.kelompok === 'MATA PELAJARAN KEJURUAN');
  const pilihanMulok = sortedList.filter(m => m.kelompok === 'MATA PELAJARAN PILIHAN' || m.kelompok === 'MUATAN LOKAL');

  const getCellVal = (m: typeof sortedList[0], tingkat: number, sem: 1 | 2) => {
    const base = m.jp[tingkat] || 0;
    if (base === 0) return '-';
    return getJpValueForSemester(m.nama, m.kode, tingkat, sem, base);
  };

  const calculateGroupTotal = (list: typeof sortedList, tingkat: number, sem: 1 | 2) => {
    let sum = 0;
    list.forEach(m => {
      const val = getCellVal(m, tingkat, sem);
      if (val !== '-') sum += Number(val);
    });
    return sum;
  };

  const renderRows = (list: typeof sortedList) => {
    return list.map((m, idx) => {
      const x1 = getCellVal(m, 10, 1);
      const x2 = getCellVal(m, 10, 2);
      const xi1 = getCellVal(m, 11, 1);
      const xi2 = getCellVal(m, 11, 2);
      const xii1 = getCellVal(m, 12, 1);
      const xii2 = getCellVal(m, 12, 2);

      return `
        <tr>
          <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${idx + 1}. ${m.nama}</td>
          <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${x1}</td>
          <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${x2}</td>
          <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${xi1}</td>
          <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${xi2}</td>
          <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${xii1}</td>
          <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${xii2}</td>
        </tr>
      `;
    }).join('');
  };

  const renderSubtotalRow = (label: string, list: typeof sortedList) => {
    return `
      <tr style="background-color:#f1f5f9; font-weight:bold;">
        <td style="border:1px solid #94a3b8; padding:5px 8px; font-size:10.5px;">${label}</td>
        <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${calculateGroupTotal(list, 10, 1) || '-'}</td>
        <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${calculateGroupTotal(list, 10, 2) || '-'}</td>
        <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${calculateGroupTotal(list, 11, 1) || '-'}</td>
        <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${calculateGroupTotal(list, 11, 2) || '-'}</td>
        <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${calculateGroupTotal(list, 12, 1) || '-'}</td>
        <td style="border:1px solid #94a3b8; padding:5px; text-align:center; font-size:10.5px;">${calculateGroupTotal(list, 12, 2) || '-'}</td>
      </tr>
    `;
  };

  const grandTotalX1 = calculateGroupTotal(sortedList, 10, 1);
  const grandTotalX2 = calculateGroupTotal(sortedList, 10, 2);
  const grandTotalXi1 = calculateGroupTotal(sortedList, 11, 1);
  const grandTotalXi2 = calculateGroupTotal(sortedList, 11, 2);
  const grandTotalXii1 = calculateGroupTotal(sortedList, 12, 1);
  const grandTotalXii2 = calculateGroupTotal(sortedList, 12, 2);

  return `
    <div style="margin-top:14px; margin-bottom:24px;">
      <h4 style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#0f172a; text-transform:uppercase;">
        Konsentrasi Keahlian: ${namaJurusan} (${kodeJurusan})
      </h4>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif;">
        <thead>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th rowspan="3" style="border:1px solid #94a3b8; padding:6px; font-size:11px; width:45%;">MATA PELAJARAN</th>
            <th colspan="6" style="border:1px solid #94a3b8; padding:4px; font-size:11px;">ALOKASI WAKTU (JP / MINGGU)</th>
          </tr>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th colspan="2" style="border:1px solid #94a3b8; padding:4px; font-size:10.5px;">KELAS X</th>
            <th colspan="2" style="border:1px solid #94a3b8; padding:4px; font-size:10.5px;">KELAS XI</th>
            <th colspan="2" style="border:1px solid #94a3b8; padding:4px; font-size:10.5px;">KELAS XII</th>
          </tr>
          <tr style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
            <th style="border:1px solid #94a3b8; padding:4px; font-size:10px; width:9%;">Sem 1</th>
            <th style="border:1px solid #94a3b8; padding:4px; font-size:10px; width:9%;">Sem 2</th>
            <th style="border:1px solid #94a3b8; padding:4px; font-size:10px; width:9%;">Sem 1</th>
            <th style="border:1px solid #94a3b8; padding:4px; font-size:10px; width:9%;">Sem 2</th>
            <th style="border:1px solid #94a3b8; padding:4px; font-size:10px; width:9%;">Sem 1</th>
            <th style="border:1px solid #94a3b8; padding:4px; font-size:10px; width:9%;">Sem 2</th>
          </tr>
        </thead>
        <tbody>
          <!-- Kelompok A -->
          <tr style="background-color:#f8fafc; font-weight:bold;">
            <td colspan="7" style="border:1px solid #94a3b8; padding:5px 8px; font-size:11px; color:#1e293b;">A. MATA PELAJARAN UMUM</td>
          </tr>
          ${renderRows(umum)}
          ${renderSubtotalRow('Jumlah Jam Kelompok A', umum)}

          <!-- Kelompok B -->
          <tr style="background-color:#f8fafc; font-weight:bold;">
            <td colspan="7" style="border:1px solid #94a3b8; padding:5px 8px; font-size:11px; color:#1e293b;">B. MATA PELAJARAN KEJURUAN</td>
          </tr>
          ${renderRows(kejuruan)}

          <!-- Kelompok C -->
          ${pilihanMulok.length > 0 ? `
            <tr style="background-color:#f8fafc; font-weight:bold;">
              <td colspan="7" style="border:1px solid #94a3b8; padding:5px 8px; font-size:11px; color:#1e293b;">C. MATA PELAJARAN PILIHAN & MUATAN LOKAL</td>
            </tr>
            ${renderRows(pilihanMulok)}
          ` : ''}
          ${renderSubtotalRow('Jumlah Jam Kelompok B + C', [...kejuruan, ...pilihanMulok])}

          <!-- Total Beban Belajar -->
          <tr style="background-color:#dcfce7; color:#14532d; font-weight:bold;">
            <td style="border:1px solid #86efac; padding:6px 8px; font-size:11px;">TOTAL BEBAN BELAJAR (A + B + C)</td>
            <td style="border:1px solid #86efac; padding:6px; text-align:center; font-size:11px;">${grandTotalX1}</td>
            <td style="border:1px solid #86efac; padding:6px; text-align:center; font-size:11px;">${grandTotalX2}</td>
            <td style="border:1px solid #86efac; padding:6px; text-align:center; font-size:11px;">${grandTotalXi1}</td>
            <td style="border:1px solid #86efac; padding:6px; text-align:center; font-size:11px;">${grandTotalXi2}</td>
            <td style="border:1px solid #86efac; padding:6px; text-align:center; font-size:11px;">${grandTotalXii1}</td>
            <td style="border:1px solid #86efac; padding:6px; text-align:center; font-size:11px;">${grandTotalXii2}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};
