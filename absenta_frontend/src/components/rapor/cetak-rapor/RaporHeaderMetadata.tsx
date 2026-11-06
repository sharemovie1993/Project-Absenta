import React from 'react';

export interface RaporHeaderMetadataProps {
  /**
   * Mode Lembar Dokumen:
   * - 'page1': Lembar Nilai Akademik Intra-Kurikuler (CK1).
   *   Otomatis membedakan era Legacy (2-kelompok tanpa bidang/program/konsentrasi) vs Modern (4-kelompok dengan info kejuruan).
   * - 'page2': Lembar Catatan Wali, Kokurikuler, Presensi & Ekskul (CK2).
   */
  pageMode?: 'page1' | 'page2';

  // Identitas Siswa & Rombel
  namaSiswa: string;
  nis: string;
  nisn: string;
  kelas: string;
  fase: string;

  // Identitas Satuan Pendidikan & Periode Akademik
  namaSekolah: string;
  alamatSekolah: string;
  effectiveSemesterNama: string;
  effectiveTahunPelajaranNama: string;

  // Info Kejuruan SMK (Hanya tampil pada page1 era modern 2025/2026 ke atas)
  isJenjangSmk?: boolean;
  bidangKeahlian?: string;
  programKeahlian?: string;
  konsentrasiKeahlian?: string;

  // Penentu Era Kurikulum (Jika tidak dioper, auto-detect dari 4 digit tahun pada effectiveTahunPelajaranNama)
  isLegacyEra?: boolean;

  className?: string;
}

/**
 * Komponen Standar Reusable Header Metadata Rapor Semester (CK1 & CK2)
 * Mematuhi Standar Format Resmi Kemendikbudristek:
 * - Format Legacy (< 2025): Header ringkas di atas, garis pemisah tegas, judul LAPORAN HASIL BELAJAR, langsung ke tabel nilai.
 * - Format Modern (2025+): Judul di atas beserta (RAPOR), metadata 2 kolom + bidang/program/konsentrasi, judul I. INTRA KURIKULER.
 * - Lembar 2 (CK2): Identitas pokok ringkas tanpa bidang keahlian.
 */
export const RaporHeaderMetadata: React.FC<RaporHeaderMetadataProps> = React.memo(({
  pageMode = 'page1',
  namaSiswa,
  nis,
  nisn,
  kelas,
  fase,
  namaSekolah,
  alamatSekolah,
  effectiveSemesterNama,
  effectiveTahunPelajaranNama,
  isJenjangSmk = true,
  bidangKeahlian = '-',
  programKeahlian = '-',
  konsentrasiKeahlian = '-',
  isLegacyEra: explicitIsLegacy,
  className = '',
}) => {
  // Resolusi Era Kurikulum
  const isLegacy = React.useMemo(() => {
    if (explicitIsLegacy !== undefined) return explicitIsLegacy;
    const matchYear = String(effectiveTahunPelajaranNama || '').match(/([12]\d{3})/);
    const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    return startYear < 2025;
  }, [explicitIsLegacy, effectiveTahunPelajaranNama]);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. LEMBAR 2 (CK2) - IDENTITAS POKOK RINGKAS
  // ══════════════════════════════════════════════════════════════════════════
  if (pageMode === 'page2') {
    return (
      <div className={`w-full mb-[3.5mm] text-[8.5pt] leading-tight text-black print:text-black font-sans ${className}`}>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[32mm]" />
            <col className="w-[4mm]" />
            <col className="w-[64mm]" />
            <col className="w-[34mm]" />
            <col className="w-[4mm]" />
            <col className="w-[44mm]" />
          </colgroup>
          <tbody>
            <tr>
              <td className="py-[0.7mm] text-left">Nama Peserta Didik</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left font-bold truncate">{namaSiswa}</td>
              <td className="py-[0.7mm] text-left">Kelas</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left font-bold">{kelas}</td>
            </tr>
            <tr>
              <td className="py-[0.7mm] text-left">NIS/NISN</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left">{nis} / {nisn}</td>
              <td className="py-[0.7mm] text-left">Fase</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left">{fase}</td>
            </tr>
            <tr>
              <td className="py-[0.7mm] text-left">Nama Sekolah</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left truncate">{namaSekolah}</td>
              <td className="py-[0.7mm] text-left">Semester</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left">{effectiveSemesterNama}</td>
            </tr>
            <tr>
              <td className="py-[0.7mm] text-left align-top">Alamat</td>
              <td className="py-[0.7mm] text-center align-top">:</td>
              <td className="py-[0.7mm] text-left align-top">{alamatSekolah}</td>
              <td className="py-[0.7mm] text-left align-top">Tahun Pelajaran</td>
              <td className="py-[0.7mm] text-center align-top">:</td>
              <td className="py-[0.7mm] text-left align-top">{effectiveTahunPelajaranNama}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. LEMBAR 1 (CK1) - FORMAT LEGACY (< 2025)
  // ══════════════════════════════════════════════════════════════════════════
  if (isLegacy) {
    return (
      <div className={`w-full font-sans ${className}`}>
        {/* Metadata Header Ringkas di Atas */}
        <div className="w-full mb-[2mm] text-[8.5pt] leading-tight text-black print:text-black">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[32mm]" />
              <col className="w-[4mm]" />
              <col className="w-[64mm]" />
              <col className="w-[34mm]" />
              <col className="w-[4mm]" />
              <col className="w-[44mm]" />
            </colgroup>
            <tbody>
              <tr>
                <td className="py-[0.7mm] text-left">Nama</td>
                <td className="py-[0.7mm] text-center">:</td>
                <td className="py-[0.7mm] text-left font-bold truncate">{namaSiswa}</td>
                <td className="py-[0.7mm] text-left">Kelas</td>
                <td className="py-[0.7mm] text-center">:</td>
                <td className="py-[0.7mm] text-left font-bold">{kelas}</td>
              </tr>
              <tr>
                <td className="py-[0.7mm] text-left">NIS/NISN</td>
                <td className="py-[0.7mm] text-center">:</td>
                <td className="py-[0.7mm] text-left">{nis} / {nisn}</td>
                <td className="py-[0.7mm] text-left">Fase</td>
                <td className="py-[0.7mm] text-center">:</td>
                <td className="py-[0.7mm] text-left">{fase}</td>
              </tr>
              <tr>
                <td className="py-[0.7mm] text-left">Nama Sekolah</td>
                <td className="py-[0.7mm] text-center">:</td>
                <td className="py-[0.7mm] text-left truncate">{namaSekolah}</td>
                <td className="py-[0.7mm] text-left">Semester</td>
                <td className="py-[0.7mm] text-center">:</td>
                <td className="py-[0.7mm] text-left">{effectiveSemesterNama}</td>
              </tr>
              <tr>
                <td className="py-[0.7mm] text-left align-top">Alamat</td>
                <td className="py-[0.7mm] text-center align-top">:</td>
                <td className="py-[0.7mm] text-left align-top">{alamatSekolah}</td>
                <td className="py-[0.7mm] text-left align-top">Tahun Pelajaran</td>
                <td className="py-[0.7mm] text-center align-top">:</td>
                <td className="py-[0.7mm] text-left align-top">{effectiveTahunPelajaranNama}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Garis Pemisah Header Tegas */}
        <div className="w-full border-t border-black my-2" />

        {/* Judul Laporan Hasil Belajar Legacy (Tanpa RAPOR dan Tanpa I. INTRA KURIKULER) */}
        <div className="text-center mb-[3.5mm]">
          <h1 className="font-bold text-[11.5pt] leading-tight text-black tracking-[0.2px] uppercase">
            LAPORAN HASIL BELAJAR
          </h1>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. LEMBAR 1 (CK1) - FORMAT MODERN (2025/2026 KE ATAS)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={`w-full font-sans ${className}`}>
      {/* Judul Header Modern */}
      <div className="text-center mb-[4mm]">
        <h1 className="font-bold text-[12pt] leading-tight text-black tracking-[0.2px] uppercase">
          LAPORAN HASIL BELAJAR
        </h1>
        <h2 className="font-bold text-[12pt] leading-tight text-black uppercase">
          (RAPOR)
        </h2>
      </div>

      {/* Grid Identitas 2 Kolom dengan Bidang/Program/Konsentrasi Kejuruan */}
      <div className="w-full mb-[3.5mm] text-[8.5pt] leading-tight text-black print:text-black">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[32mm]" />
            <col className="w-[4mm]" />
            <col className="w-[64mm]" />
            <col className="w-[34mm]" />
            <col className="w-[4mm]" />
            <col className="w-[44mm]" />
          </colgroup>
          <tbody>
            <tr>
              <td className="py-[0.7mm] text-left">Nama Peserta Didik</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left font-bold truncate">{namaSiswa}</td>
              <td className="py-[0.7mm] text-left">Kelas</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left font-bold">{kelas}</td>
            </tr>
            <tr>
              <td className="py-[0.7mm] text-left">NIS/NISN</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left">{nis} / {nisn}</td>
              <td className="py-[0.7mm] text-left">Fase</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left">{fase}</td>
            </tr>
            <tr>
              <td className="py-[0.7mm] text-left">Nama Sekolah</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left truncate">{namaSekolah}</td>
              <td className="py-[0.7mm] text-left">Semester</td>
              <td className="py-[0.7mm] text-center">:</td>
              <td className="py-[0.7mm] text-left">{effectiveSemesterNama}</td>
            </tr>
            <tr>
              <td className="py-[0.7mm] text-left align-top">Alamat</td>
              <td className="py-[0.7mm] text-center align-top">:</td>
              <td className="py-[0.7mm] text-left align-top">{alamatSekolah}</td>
              <td className="py-[0.7mm] text-left align-top">Tahun Pelajaran</td>
              <td className="py-[0.7mm] text-center align-top">:</td>
              <td className="py-[0.7mm] text-left align-top">{effectiveTahunPelajaranNama}</td>
            </tr>
            {isJenjangSmk && (
              <>
                <tr>
                  <td colSpan={6} className="py-[0.5mm]" />
                </tr>
                <tr>
                  <td className="py-[0.7mm] text-left">Bidang Keahlian</td>
                  <td className="py-[0.7mm] text-center">:</td>
                  <td colSpan={4} className="py-[0.7mm] text-left truncate">{bidangKeahlian}</td>
                </tr>
                <tr>
                  <td className="py-[0.7mm] text-left">Program Keahlian</td>
                  <td className="py-[0.7mm] text-center">:</td>
                  <td colSpan={4} className="py-[0.7mm] text-left truncate">{programKeahlian}</td>
                </tr>
                <tr>
                  <td className="py-[0.7mm] text-left">Konsentrasi Keahlian</td>
                  <td className="py-[0.7mm] text-center">:</td>
                  <td colSpan={4} className="py-[0.7mm] text-left truncate">{konsentrasiKeahlian}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Section I: INTRA KURIKULER */}
      <div className="font-bold text-[10pt] text-black mb-[2mm]">
        I. INTRA KURIKULER
      </div>
    </div>
  );
});

RaporHeaderMetadata.displayName = 'RaporHeaderMetadata';
