import React, { useMemo } from 'react';
import {
  PrintDocumentSheet,
  PrintHeader,
  UniversalDocumentSignatures,
  type PrintHeaderTenantInfo,
} from '@/components/ui/PrintHeader';
import {
  detectKelompokForMapel,
  getJpValueForSemester,
  getKelompokTotal,
  getSubjectSortRank,
  isMapelBelongsToOtherJurusan,
} from '@/utils/kurikulum/masterStrukturHelper';
import type { StrukturPrintRow } from '@/utils/print/modules/pdfKurikulum';

export interface StrukturKurikulumJurusanMeta {
  id?: string;
  nama?: string;
  kode?: string | null;
  singkatan?: string | null;
  program_keahlian?: string | null;
  bidang_keahlian?: string | null;
  ProgramKeahlian?: {
    nama?: string;
    bidang_keahlian?: string;
  } | null;
}

export interface StrukturKurikulumRawItem {
  id?: string;
  mapel_id?: string;
  nama_mapel?: string;
  kode_mapel?: string | null;
  tingkat: number;
  jp_per_minggu: number;
  kelompok?: string;
  jurusan_id?: string | null;
  urutan?: number;
  Mapel?: {
    id?: string;
    nama_mapel?: string;
    kode_mapel?: string;
    kelompok_mapel?: string;
  } | null;
}

export interface StrukturKurikulumDocumentSheetProps {
  mappingData: StrukturKurikulumRawItem[];
  selectedJurusan?: StrukturKurikulumJurusanMeta | null;
  allJurusans?: StrukturKurikulumJurusanMeta[];
  tahunPelajaranNama?: string;
  tahunPelajaranId?: string;
  jenjang?: string;
  tenantInfo?: PrintHeaderTenantInfo;
  showLogoDaerah?: boolean;
  showLogoSekolah?: boolean;
  wakaKurikulumNama?: string;
  wakaKurikulumNip?: string;
  kepalaSekolahNama?: string;
  kepalaSekolahNip?: string;
  kotaTitimangsa?: string;
  tanggalTitimangsa?: string;
  pageNumber?: number;
  totalPages?: number;
}

const ROMAN_GRADE: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
  13: 'XIII',
};

export const StrukturKurikulumDocumentSheet: React.FC<StrukturKurikulumDocumentSheetProps> = ({
  mappingData,
  selectedJurusan,
  allJurusans = [],
  tahunPelajaranNama = '2025/2026',
  tahunPelajaranId,
  jenjang = 'SMK',
  tenantInfo,
  showLogoDaerah = true,
  showLogoSekolah = true,
  wakaKurikulumNama = 'Wakasek Bidang Kurikulum',
  wakaKurikulumNip = '-',
  kepalaSekolahNama = 'Kepala Sekolah',
  kepalaSekolahNip = '-',
  kotaTitimangsa = 'Purwakarta',
  tanggalTitimangsa,
  pageNumber = 1,
  totalPages = 1,
}) => {
  const isSmkOrMak = useMemo(() => {
    const j = (jenjang || 'SMK').toUpperCase();
    return j === 'SMK' || j === 'MAK';
  }, [jenjang]);

  const gradeLevels = useMemo(() => {
    const j = (jenjang || 'SMK').toUpperCase();
    if (j === 'SD' || j === 'MI') return [1, 2, 3, 4, 5, 6];
    if (j === 'SMP' || j === 'MTS') return [7, 8, 9];
    return [10, 11, 12];
  }, [jenjang]);

  // Filter & Group subjects into Kelompok A, B, and C
  const { kelompokA, kelompokB, kelompokC } = useMemo(() => {
    const selectedJurusanId = selectedJurusan?.id || '';
    const jurusansList = allJurusans.length > 0 ? allJurusans : selectedJurusan ? [selectedJurusan] : [];

    const filteredItems = (mappingData || []).filter((item) => {
      if (!isSmkOrMak || !selectedJurusanId) return true;
      if (item.jurusan_id && item.jurusan_id !== selectedJurusanId) return false;

      const nama = item.Mapel?.nama_mapel || item.nama_mapel || '';
      const kode = item.Mapel?.kode_mapel || item.kode_mapel || '';
      const belongsToOther = isMapelBelongsToOtherJurusan(
        {
          id: item.mapel_id || item.id || '',
          nama_mapel: nama,
          kode_mapel: kode,
          jurusan_id: item.jurusan_id || undefined,
        } as any,
        isSmkOrMak,
        jurusansList,
        selectedJurusanId
      );
      return !belongsToOther;
    });

    const mapelMap = new Map<
      string,
      StrukturPrintRow & { urutan?: number; rawKelompok?: string }
    >();

    filteredItems.forEach((item) => {
      const nama = (item.Mapel?.nama_mapel || item.nama_mapel || '').trim();
      const kode = (item.Mapel?.kode_mapel || item.kode_mapel || '').trim();
      if (!nama) return;

      const key = item.mapel_id || kode || nama.toLowerCase();
      if (!mapelMap.has(key)) {
        const detected = detectKelompokForMapel(kode, nama, jenjang);
        mapelMap.set(key, {
          id: key,
          nama,
          kode,
          kelompok: detected,
          rawKelompok: item.kelompok || item.Mapel?.kelompok_mapel || detected,
          urutan: item.urutan ?? 999,
          jp: {},
        });
      }

      const entry = mapelMap.get(key)!;
      // Prefer jurusan-specific row JP over general null-jurusan row if both exist
      if (entry.jp[item.tingkat] === undefined || item.jurusan_id === selectedJurusanId) {
        entry.jp[item.tingkat] = Number(item.jp_per_minggu) || 0;
      }
    });

    const umum: StrukturPrintRow[] = [];
    const kejuruan: StrukturPrintRow[] = [];
    const pilihanDanMulok: StrukturPrintRow[] = [];

    const sortFn = (a: StrukturPrintRow, b: StrukturPrintRow) => {
      const rankA = getSubjectSortRank({ kode_mapel: a.kode, nama_mapel: a.nama, kelompok: a.kelompok });
      const rankB = getSubjectSortRank({ kode_mapel: b.kode, nama_mapel: b.nama, kelompok: b.kelompok });
      if (rankA !== rankB) return rankA - rankB;
      return a.nama.localeCompare(b.nama, 'id');
    };

    mapelMap.forEach((m) => {
      const g = detectKelompokForMapel(m.kode, m.nama, jenjang);
      if (g === 'MATA PELAJARAN KEJURUAN') {
        kejuruan.push({ ...m, kelompok: 'MATA PELAJARAN KEJURUAN' });
      } else if (g === 'MUATAN LOKAL') {
        const labelNama = m.nama.toLowerCase().includes('muatan lokal')
          ? m.nama
          : `${m.nama} (Muatan Lokal)`;
        pilihanDanMulok.push({ ...m, nama: labelNama, kelompok: 'MUATAN LOKAL' });
      } else if (g === 'MATA PELAJARAN PILIHAN') {
        pilihanDanMulok.push({ ...m, kelompok: 'MATA PELAJARAN PILIHAN' });
      } else {
        umum.push({ ...m, kelompok: 'MATA PELAJARAN UMUM' });
      }
    });

    umum.sort(sortFn);
    kejuruan.sort(sortFn);
    pilihanDanMulok.sort(sortFn);

    return {
      kelompokA: umum,
      kelompokB: kejuruan,
      kelompokC: pilihanDanMulok,
    };
  }, [mappingData, selectedJurusan, allJurusans, isSmkOrMak, jenjang]);

  const bidangKeahlian =
    selectedJurusan?.bidang_keahlian ||
    selectedJurusan?.ProgramKeahlian?.bidang_keahlian ||
    (isSmkOrMak ? 'Teknologi, Informasi, Bisnis & Manajemen / Vokasi' : null);

  const programKeahlian =
    selectedJurusan?.program_keahlian ||
    selectedJurusan?.ProgramKeahlian?.nama ||
    selectedJurusan?.nama ||
    (isSmkOrMak ? 'Semua Program Keahlian' : null);

  const konsentrasiKeahlian = selectedJurusan?.nama
    ? `${selectedJurusan.nama}${selectedJurusan.singkatan ? ` (${selectedJurusan.singkatan})` : ''}`
    : isSmkOrMak
    ? 'Semua Konsentrasi Keahlian'
    : null;

  const renderGroupRows = (
    groupLetter: string,
    groupTitle: string,
    rows: StrukturPrintRow[]
  ) => {
    if (rows.length === 0) return null;

    return (
      <React.Fragment key={groupLetter}>
        {/* Group Header Row */}
        <tr className="bg-slate-100 font-bold text-black">
          <td
            colSpan={2 + gradeLevels.length * 2}
            className="border border-black px-2 py-1 text-left uppercase tracking-normal"
            style={{ letterSpacing: 'normal', wordSpacing: 'normal' }}
          >
            {groupLetter}. {groupTitle}
          </td>
        </tr>

        {/* Subject Rows */}
        {rows.map((row, idx) => (
          <tr key={row.id || `${groupLetter}-${idx}`} className="text-black">
            <td
              className="border border-black px-1.5 py-1 text-center font-medium w-[28px]"
              style={{ letterSpacing: 'normal' }}
            >
              {idx + 1}.
            </td>
            <td
              className="border border-black px-2 py-1 text-left font-medium"
              style={{ letterSpacing: 'normal', wordSpacing: 'normal' }}
            >
              {row.nama}
            </td>
            {gradeLevels.map((tingkat) => {
              const baseJp = row.jp[tingkat] || 0;
              const sem1 = baseJp > 0 ? getJpValueForSemester(row.nama, row.kode, tingkat, 1, baseJp) : '-';
              const sem2 = baseJp > 0 ? getJpValueForSemester(row.nama, row.kode, tingkat, 2, baseJp) : '-';
              return (
                <React.Fragment key={`${row.id}-${tingkat}`}>
                  <td
                    className="border border-black px-1 py-1 text-center font-semibold w-[34px]"
                    style={{ letterSpacing: 'normal' }}
                  >
                    {sem1}
                  </td>
                  <td
                    className="border border-black px-1 py-1 text-center font-semibold w-[34px]"
                    style={{ letterSpacing: 'normal' }}
                  >
                    {sem2}
                  </td>
                </React.Fragment>
              );
            })}
          </tr>
        ))}
      </React.Fragment>
    );
  };

  const allRows = useMemo(
    () => [...kelompokA, ...kelompokB, ...kelompokC],
    [kelompokA, kelompokB, kelompokC]
  );

  const kelompokBC = useMemo(
    () => [...kelompokB, ...kelompokC],
    [kelompokB, kelompokC]
  );

  return (
    <PrintDocumentSheet
      orientation="portrait"
      pageNumber={pageNumber}
      totalPages={totalPages}
      footerText={`Dokumen Resmi Struktur Kurikulum (KOSP) TP ${tahunPelajaranNama} — ${tenantInfo?.name || 'Satuan Pendidikan'}`}
      className="text-black font-serif !p-5 sm:!p-6 print:!border-none print:!shadow-none"
      style={{ letterSpacing: 'normal', wordSpacing: 'normal' }}
    >
      {/* 1. KOP SURAT DINAS & SEKOLAH RESMI */}
      <PrintHeader
        variant="portrait"
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        tenantInfo={tenantInfo}
        className="mb-2"
      />

      {/* 2. JUDUL DOKUMEN RESMI */}
      <div className="text-center mb-2.5" style={{ letterSpacing: 'normal' }}>
        <h2
          className="text-xs sm:text-[13px] font-black uppercase underline text-black"
          style={{ letterSpacing: 'normal' }}
        >
          STRUKTUR KURIKULUM OPERASIONAL SATUAN PENDIDIKAN (KOSP)
        </h2>
        <p
          className="text-[10.5px] font-bold uppercase mt-0.5 text-black"
          style={{ letterSpacing: 'normal' }}
        >
          TAHUN PELAJARAN {tahunPelajaranNama}
        </p>
      </div>

      {/* 3. METADATA IDENTITAS PROGRAM / KONSENTRASI KEAHLIAN */}
      <div
        className="w-full mb-2.5 text-[10px] leading-snug text-black"
        style={{ letterSpacing: 'normal', wordSpacing: 'normal' }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {isSmkOrMak ? (
              <>
                <tr>
                  <td className="w-[150px] py-0.5 font-semibold">Bidang Keahlian</td>
                  <td className="w-[10px] py-0.5 text-center">:</td>
                  <td className="py-0.5 font-bold">{bidangKeahlian}</td>
                  <td className="w-[115px] py-0.5 font-semibold">Kurikulum Acuan</td>
                  <td className="w-[10px] py-0.5 text-center">:</td>
                  <td className="w-[140px] py-0.5 font-semibold">Kurikulum Merdeka</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Program Keahlian</td>
                  <td className="py-0.5 text-center">:</td>
                  <td className="py-0.5 font-bold">{programKeahlian}</td>
                  <td className="py-0.5 font-semibold">Alokasi Waktu</td>
                  <td className="py-0.5 text-center">:</td>
                  <td className="py-0.5 font-semibold">1 JP = 45 Menit (Per Minggu)</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Konsentrasi Keahlian</td>
                  <td className="py-0.5 text-center">:</td>
                  <td colSpan={4} className="py-0.5 font-black uppercase">
                    {konsentrasiKeahlian}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="w-[130px] py-0.5 font-semibold">Satuan Pendidikan</td>
                <td className="w-[10px] py-0.5 text-center">:</td>
                <td className="py-0.5 font-bold">{tenantInfo?.name || 'Satuan Pendidikan'}</td>
                <td className="w-[115px] py-0.5 font-semibold">Kurikulum Acuan</td>
                <td className="w-[10px] py-0.5 text-center">:</td>
                <td className="w-[140px] py-0.5 font-semibold">Kurikulum Merdeka</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. TABEL MATRIKS STRUKTUR KURIKULUM STANDAR KEMENDIKBUDRISTEK */}
      <div className="w-full mb-2.5 overflow-hidden">
        <table
          className="w-full border-collapse border border-black text-[9.5px] leading-tight text-black"
          style={{ letterSpacing: 'normal', wordSpacing: 'normal' }}
        >
          <thead>
            <tr className="bg-slate-200/80 font-black text-center text-black">
              <th
                rowSpan={3}
                className="border border-black px-1 py-1.5 w-[28px] align-middle"
                style={{ letterSpacing: 'normal' }}
              >
                NO
              </th>
              <th
                rowSpan={3}
                className="border border-black px-2 py-1.5 text-center align-middle"
                style={{ letterSpacing: 'normal' }}
              >
                MATA PELAJARAN
              </th>
              <th
                colSpan={gradeLevels.length * 2}
                className="border border-black px-2 py-1 text-center"
                style={{ letterSpacing: 'normal' }}
              >
                ALOKASI WAKTU PER MINGGU (JAM PELAJARAN / JP)
              </th>
            </tr>
            <tr className="bg-slate-100 font-bold text-center text-black">
              {gradeLevels.map((tingkat) => (
                <th
                  key={`header-grade-${tingkat}`}
                  colSpan={2}
                  className="border border-black px-1 py-1"
                  style={{ letterSpacing: 'normal' }}
                >
                  KELAS {ROMAN_GRADE[tingkat] || tingkat}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 font-bold text-center text-[8.5px] text-black">
              {gradeLevels.map((tingkat) => (
                <React.Fragment key={`header-sem-${tingkat}`}>
                  <th
                    className="border border-black px-1 py-0.5 w-[34px]"
                    style={{ letterSpacing: 'normal' }}
                  >
                    Sem 1
                  </th>
                  <th
                    className="border border-black px-1 py-0.5 w-[34px]"
                    style={{ letterSpacing: 'normal' }}
                  >
                    Sem 2
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {allRows.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + gradeLevels.length * 2}
                  className="border border-black py-6 text-center italic text-slate-500"
                >
                  Belum ada data pemetaan mata pelajaran pada Struktur Kurikulum ini.
                </td>
              </tr>
            ) : (
              <>
                {renderGroupRows('A', 'MATA PELAJARAN UMUM', kelompokA)}

                {/* Sub-Total Kelompok A */}
                {kelompokA.length > 0 && (
                  <tr className="bg-slate-100/90 font-bold text-black">
                    <td
                      colSpan={2}
                      className="border border-black px-2 py-1 text-right"
                      style={{ letterSpacing: 'normal' }}
                    >
                      Jumlah Jam Pelajaran Kelompok A (Umum)
                    </td>
                    {gradeLevels.map((tingkat) => {
                      const tot1 = getKelompokTotal(kelompokA, tingkat, 1);
                      const tot2 = getKelompokTotal(kelompokA, tingkat, 2);
                      return (
                        <React.Fragment key={`sub-a-${tingkat}`}>
                          <td className="border border-black px-1 py-1 text-center font-bold">
                            {tot1 || '-'}
                          </td>
                          <td className="border border-black px-1 py-1 text-center font-bold">
                            {tot2 || '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                )}

                {renderGroupRows(
                  'B',
                  isSmkOrMak ? 'MATA PELAJARAN KEJURUAN' : 'MATA PELAJARAN PEMINATAN',
                  kelompokB
                )}

                {renderGroupRows(
                  kelompokB.length > 0 ? 'C' : 'B',
                  'MATA PELAJARAN PILIHAN & MUATAN LOKAL',
                  kelompokC
                )}

                {/* Sub-Total Kelompok B + C */}
                {kelompokBC.length > 0 && (
                  <tr className="bg-slate-100/90 font-bold text-black">
                    <td
                      colSpan={2}
                      className="border border-black px-2 py-1 text-right"
                      style={{ letterSpacing: 'normal' }}
                    >
                      {isSmkOrMak
                        ? 'Jumlah Jam Pelajaran Kelompok B + C (Kejuruan, Pilihan & Mulok)'
                        : 'Jumlah Jam Pelajaran Pilihan & Muatan Lokal'}
                    </td>
                    {gradeLevels.map((tingkat) => {
                      const tot1 = getKelompokTotal(kelompokBC, tingkat, 1);
                      const tot2 = getKelompokTotal(kelompokBC, tingkat, 2);
                      return (
                        <React.Fragment key={`sub-bc-${tingkat}`}>
                          <td className="border border-black px-1 py-1 text-center font-bold">
                            {tot1 || '-'}
                          </td>
                          <td className="border border-black px-1 py-1 text-center font-bold">
                            {tot2 || '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                )}

                {/* Grand Total Row */}
                <tr className="bg-slate-200 font-black text-black text-[10px]">
                  <td
                    colSpan={2}
                    className="border border-black px-2 py-1.5 text-center uppercase"
                    style={{ letterSpacing: 'normal' }}
                  >
                    TOTAL ALOKASI JAM PELAJARAN PER MINGGU (A + B + C)
                  </td>
                  {gradeLevels.map((tingkat) => {
                    const grand1 = getKelompokTotal(allRows, tingkat, 1);
                    const grand2 = getKelompokTotal(allRows, tingkat, 2);
                    return (
                      <React.Fragment key={`grand-${tingkat}`}>
                        <td className="border border-black px-1 py-1.5 text-center font-black">
                          {grand1 || '-'}
                        </td>
                        <td className="border border-black px-1 py-1.5 text-center font-black">
                          {grand2 || '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. CATATAN PEDOMAN AKADEMIK */}
      <div
        className="border border-black rounded-sm p-2 mb-2.5 text-[8.5px] leading-snug bg-slate-50/40 text-black"
        style={{ letterSpacing: 'normal', wordSpacing: 'normal' }}
      >
        <span className="font-bold uppercase block mb-0.5" style={{ letterSpacing: 'normal' }}>
          Keterangan &amp; Ketentuan Struktur Kurikulum:
        </span>
        <ol className="list-decimal pl-4 space-y-0">
          <li>
            Alokasi waktu disajikan dalam satuan <strong>Jam Pelajaran (JP) Tatap Muka per Minggu</strong> (1 JP = 45 Menit), belum termasuk alokasi Projek Penguatan Profil Pelajar Pancasila (Kokurikuler).
          </li>
          {isSmkOrMak && (
            <li>
              Pada <strong>Kelas XII Semester 1 (Ganjil)</strong>, pelaksanaan Praktik Kerja Lapangan (PKL) terfokus di Dunia Usaha / Dunia Industri (DUDI), sedangkan Konsentrasi Keahlian, Projek Kreatif &amp; Kewirausahaan (PKK), dan Mata Pelajaran Pilihan dilaksanakan secara intensif pada Semester 2 (Genap).
            </li>
          )}
          <li>
            Dokumen Struktur Kurikulum ini mengacu pada regulasi Kurikulum Nasional (Kemendikbudristek) yang berlaku pada Tahun Pelajaran {tahunPelajaranNama}.
          </li>
        </ol>
      </div>

      {/* 6. TANDA TANGAN PENGESAHAN RESMI (UNIVERSAL SIGNATURE ENGINE) */}
      <div className="w-full page-break-inside-avoid">
        <UniversalDocumentSignatures
          layout="dual_unit_kepsek"
          tahunPelajaranId={tahunPelajaranId}
          titimangsaCity={kotaTitimangsa}
          titimangsaDate={tanggalTitimangsa}
          overrideSignerLeft={{
            roleTitle: 'Wakil Kepala Sekolah Bidang Kurikulum',
            personName: wakaKurikulumNama,
            nip: wakaKurikulumNip,
          }}
          overrideSignerRight={{
            personName: kepalaSekolahNama,
            nip: kepalaSekolahNip,
          }}
          spacingHeightMm={15}
        />
      </div>
    </PrintDocumentSheet>
  );
};

export default StrukturKurikulumDocumentSheet;
