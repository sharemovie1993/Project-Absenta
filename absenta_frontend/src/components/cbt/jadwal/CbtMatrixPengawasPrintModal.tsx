import React, { useRef, useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  UniversalDocumentSignatures,
  usePrintHeaderData,
} from '@/components/ui';
import type { CbtJadwalUjian, CbtEventItem } from '@/types/cbt.types';
import { formatLocalDateIndo, formatLocalTimeFromISO, toLocalDate } from '@/utils/attendance/time';
import { detectNodeTingkat } from '@/components/spasial/denahTingkatHelper';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────
//  Tipe data
// ─────────────────────────────────────────────────────────────────
interface PlottingDraftRow {
  jadwal_id: string;
  ruang_ujian: string;
  pengawas_1_id: string;
  proktor_id: string;
  dirty: boolean;
}

interface CbtMatrixPengawasPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwalList: CbtJadwalUjian[];
  plottingDrafts: Record<string, PlottingDraftRow>;
  guruMap: Map<string, any>;
  activeEvent?: CbtEventItem | null;
  eventName?: string;
  targetTingkat?: number[];
}

export interface RoomColumnHeader {
  roomCode: string;   // misal: "R.01"
  namaKelas: string;  // misal: "X TJKT 1"
  tingkat: number;    // 10, 11, 12
}

export interface AssignmentInfo {
  pengawasId: string;
  pengawasNama: string;
  pengawasFoto: string;
  proktorId: string;
  proktorNama: string;
}

export interface DayRowData {
  dateKey: string;     // YYYY-MM-DD
  dayName: string;     // "Senin", "Selasa", dst
  fullLabel: string;   // "Senin, 02 Des 2026"
  // roomCode -> AssignmentInfo
  roomAssignments: Record<string, AssignmentInfo>;
}

export interface TingkatMatrixSheet {
  tingkat: number;
  labelTingkat: string; // "Kelas X", "Kelas XI", dst
  columns: RoomColumnHeader[];
  days: DayRowData[];
}

// ─────────────────────────────────────────────────────────────────
//  Helper Ekstraksi Rombel, Ruang, dan Tingkat
// ─────────────────────────────────────────────────────────────────
function parseScheduleMeta(j: CbtJadwalUjian, draftRoom?: string) {
  const rawRoom = (draftRoom || j.setting_keamanan?.ruang_ujian || '').trim();
  const namaSesi = j.nama_sesi || '';

  let rombel = '-';
  let roomCode = rawRoom;

  const allMatches = Array.from(namaSesi.matchAll(/\(([^()]+)\)/g));
  if (allMatches.length > 0) {
    const inner = allMatches[allMatches.length - 1][1];
    const parts = inner.split(' - ');
    if (parts.length >= 2) {
      rombel = parts[0].trim();
      if (!roomCode) roomCode = parts[1].trim();
    } else {
      const cleaned = inner.trim();
      if (!['ASAS', 'PSAS', 'PSTS', 'SAS', 'SAT', 'STS'].includes(cleaned.toUpperCase())) {
        rombel = cleaned;
      }
    }
  }

  if (!roomCode) {
    roomCode = j.setting_keamanan?.ruang_ujian_nama || 'R.XX';
  }

  const detectedTingkat =
    (j.BankSoal?.tingkat && !Number.isNaN(Number(j.BankSoal.tingkat)) ? Number(j.BankSoal.tingkat) : null) ||
    detectNodeTingkat({
      label_sub: rombel,
      catatan: j.BankSoal?.tingkat,
    }) ||
    10;

  return {
    roomCode,
    rombel,
    tingkat: detectedTingkat,
  };
}

// ─────────────────────────────────────────────────────────────────
//  Helper Natural Sort untuk Nama Kelas (misal: X TJKT 1, X TJKT 2, X AKL 1)
// ─────────────────────────────────────────────────────────────────
function compareKelasNatural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// ─────────────────────────────────────────────────────────────────
//  Helper Urutan Hari Indonesia
// ─────────────────────────────────────────────────────────────────
function getDayNameIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()] || 'Hari';
  } catch {
    return 'Hari';
  }
}

// ─────────────────────────────────────────────────────────────────
//  Builder Matriks per Tingkat: Kolom = Ruang/Kelas, Baris = Hari
// ─────────────────────────────────────────────────────────────────
function buildTingkatMatrices(
  jadwalList: CbtJadwalUjian[],
  plottingDrafts: Record<string, PlottingDraftRow>,
  guruMap: Map<string, any>,
  targetTingkat?: number[]
): TingkatMatrixSheet[] {
  // 1. Ekstrak seluruh tanggal unik
  const dateKeyMap = new Map<string, string>(); // dateKey -> fullLabel
  jadwalList.forEach((j) => {
    if (j.tanggal_mulai) {
      const dk = toLocalDate(new Date(j.tanggal_mulai));
      if (!dateKeyMap.has(dk)) {
        dateKeyMap.set(dk, formatLocalDateIndo(j.tanggal_mulai));
      }
    }
  });

  const sortedDateKeys = Array.from(dateKeyMap.keys()).sort();

  // 2. Kumpulkan tingkat yang ada
  const tingkatSet = new Set<number>();
  if (targetTingkat && targetTingkat.length > 0) {
    targetTingkat.forEach((t) => tingkatSet.add(t));
  } else {
    jadwalList.forEach((j) => {
      const meta = parseScheduleMeta(j, plottingDrafts[j.id]?.ruang_ujian);
      tingkatSet.add(meta.tingkat);
    });
  }

  const sortedTingkats = Array.from(tingkatSet).sort((a, b) => a - b);
  const romanMap: Record<number, string> = { 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII' };

  const result: TingkatMatrixSheet[] = [];

  sortedTingkats.forEach((tingkat) => {
    // Kumpulkan seluruh ruang unik di tingkat ini
    const roomHeaderMap = new Map<string, RoomColumnHeader>();

    jadwalList.forEach((j) => {
      const draft = plottingDrafts[j.id];
      const meta = parseScheduleMeta(j, draft?.ruang_ujian);
      if (meta.tingkat !== tingkat) return;

      if (!roomHeaderMap.has(meta.roomCode)) {
        roomHeaderMap.set(meta.roomCode, {
          roomCode: meta.roomCode,
          namaKelas: meta.rombel !== '-' ? meta.rombel : meta.roomCode,
          tingkat,
        });
      } else {
        const existing = roomHeaderMap.get(meta.roomCode)!;
        if (existing.namaKelas === '-' && meta.rombel !== '-') {
          existing.namaKelas = meta.rombel;
        }
      }
    });

    // Urutkan kolom terutama berdasarkan KELAS (X TJKT 1, X TJKT 2, X AKL 1 ...)
    const columns = Array.from(roomHeaderMap.values()).sort((a, b) => {
      const cmpKelas = compareKelasNatural(a.namaKelas, b.namaKelas);
      if (cmpKelas !== 0) return cmpKelas;
      return a.roomCode.localeCompare(b.roomCode, undefined, { numeric: true });
    });

    if (columns.length === 0) return;

    // Buat baris per hari
    const days: DayRowData[] = sortedDateKeys.map((dk) => {
      const dayName = getDayNameIndo(dk);
      const fullLabel = dateKeyMap.get(dk) || dk;
      const roomAssignments: Record<string, AssignmentInfo> = {};

      // Cari jadwal pada hari dk dan tingkat ini
      jadwalList.forEach((j) => {
        if (!j.tanggal_mulai) return;
        const jDk = toLocalDate(new Date(j.tanggal_mulai));
        if (jDk !== dk) return;

        const draft = plottingDrafts[j.id];
        const meta = parseScheduleMeta(j, draft?.ruang_ujian);
        if (meta.tingkat !== tingkat) return;

        const p1Id = (draft?.pengawas_1_id !== undefined ? draft.pengawas_1_id : j.setting_keamanan?.pengawas_1_id) || '';
        const prId = (draft?.proktor_id !== undefined ? draft.proktor_id : (j.setting_keamanan?.proktor_id || j.setting_keamanan?.pengawas_2_id)) || '';

        const guruP1 = p1Id ? guruMap.get(p1Id) : null;
        const p1Name = guruP1?.nama_guru || j.setting_keamanan?.pengawas_1_nama || '';
        const p1Foto = guruP1?.foto || guruP1?.foto_url || guruP1?.avatar || '';

        const guruPr = prId ? guruMap.get(prId) : null;
        const prName = guruPr?.nama_guru || j.setting_keamanan?.proktor_nama || '';

        if (!roomAssignments[meta.roomCode] || (!roomAssignments[meta.roomCode].pengawasNama && p1Name)) {
          roomAssignments[meta.roomCode] = {
            pengawasId: p1Id,
            pengawasNama: p1Name,
            pengawasFoto: p1Foto,
            proktorId: prId,
            proktorNama: prName,
          };
        }
      });

      return {
        dateKey: dk,
        dayName,
        fullLabel,
        roomAssignments,
      };
    });

    result.push({
      tingkat,
      labelTingkat: `Kelas ${romanMap[tingkat] || tingkat}`,
      columns,
      days,
    });
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────
//  KOMPONEN UTAMA
// ─────────────────────────────────────────────────────────────────
export const CbtMatrixPengawasPrintModal: React.FC<CbtMatrixPengawasPrintModalProps> = ({
  isOpen,
  onClose,
  jadwalList,
  plottingDrafts,
  guruMap,
  activeEvent,
  eventName,
  targetTingkat,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedTingkatTab, setSelectedTingkatTab] = useState<number | 'ALL'>('ALL');
  const [showProktor, setShowProktor] = useState(
    () => Boolean(activeEvent?.enable_proctor)
  );

  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  const namaEvent = activeEvent?.nama_event || eventName || 'Ujian CBT';

  // Build matriks per tingkat (Kolom = Kelas/Ruang tersortir, Baris = Hari)
  const tingkatSheets = useMemo(
    () => buildTingkatMatrices(jadwalList, plottingDrafts, guruMap, targetTingkat),
    [jadwalList, plottingDrafts, guruMap, targetTingkat]
  );

  const displaySheets = useMemo(() => {
    if (selectedTingkatTab === 'ALL') return tingkatSheets;
    return tingkatSheets.filter((s) => s.tingkat === selectedTingkatTab);
  }, [tingkatSheets, selectedTingkatTab]);

  // ── Handler True WYSIWYG PDF Export (Landscape A4 per Lembar Tingkat) ──
  const handleExportPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) return;
    const sheets = container.querySelectorAll<HTMLElement>('.print-sheet');
    if (!sheets.length) return;

    setIsExportingPdf(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const pdfW = 297;
      const pdfH = 210;

      for (let i = 0; i < sheets.length; i++) {
        const sheetEl = sheets[i];

        // Pastikan gambar selesai di-load
        await Promise.all(
          Array.from(sheetEl.querySelectorAll('img')).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })
          )
        );

        const canvas = await html2canvas(sheetEl, {
          scale: 2.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll<HTMLElement>('.print-sheet').forEach((s) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage('a4', 'landscape');
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      }

      const safeName = namaEvent.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Matrix_Pengawas_Kelas_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF export error', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      title={`Cetak Matrix Pengawas (Urut Kelas: X TJKT 1, X AKL 1 ...) — ${namaEvent}`}
      allowLogoToggles
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      isExportingPdf={isExportingPdf}
      onExportPdf={handleExportPdf}
      extraControls={
        <div className="flex items-center gap-3 flex-wrap">
          {tingkatSheets.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedTingkatTab('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer',
                  selectedTingkatTab === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                Semua Tingkat ({tingkatSheets.length} Lembar)
              </button>
              {tingkatSheets.map((s) => (
                <button
                  key={s.tingkat}
                  type="button"
                  onClick={() => setSelectedTingkatTab(s.tingkat)}
                  className={cn(
                    'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                    selectedTingkatTab === s.tingkat
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  {s.labelTingkat}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPhotos}
              onChange={(e) => setShowPhotos(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-indigo-600"
            />
            Sertakan Foto Pengawas
          </label>

          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showProktor}
              onChange={(e) => setShowProktor(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-indigo-600"
            />
            Sertakan Proktor
          </label>
        </div>
      }
    >
      <div ref={sheetContainerRef} id="print-desk-canvas-area" className="space-y-6">
        {displaySheets.length === 0 ? (
          <PrintDocumentSheet orientation="landscape">
            <div className="text-center py-16 text-slate-400" style={{ fontSize: '10pt' }}>
              Belum ada data jadwal/ruang yang siap dicetak untuk tingkat ini.
            </div>
          </PrintDocumentSheet>
        ) : (
          displaySheets.map((sheet, sheetIdx) => (
            <PrintDocumentSheet
              key={sheet.tingkat}
              orientation="landscape"
              footerText={`Dokumen Resmi Penugasan Pengawas CBT • ${namaEvent}`}
            >
              {/* KOP SURAT */}
              <PrintHeader
                tenantInfo={tenantInfo}
                sekolahData={sekolahData}
                showLogoDaerah={showLogoDaerah}
                showLogoSekolah={showLogoSekolah}
              />

              {/* JUDUL DOKUMEN */}
              <div className="text-center mb-2 mt-0.5">
                <h2
                  className="font-bold uppercase tracking-wide text-slate-900"
                  style={{ fontSize: '11pt', letterSpacing: '0.04em' }}
                >
                  DAFTAR PLOTING PENGAWAS RUANG UJIAN CBT
                </h2>
                <p className="text-slate-700 font-semibold mt-0.5" style={{ fontSize: '9pt' }}>
                  {sheet.labelTingkat} — {namaEvent}
                  {activeEvent?.semester ? ` Semester ${activeEvent.semester}` : ''}
                </p>
                <p className="text-slate-500 italic text-[7pt]">
                  * Skema Ploting: 1 Guru mengawas 1 Ruang/Kelas penuh seharian (Full-Day Single Supervisor)
                </p>
              </div>

              {/* ── TABEL MATRIKS: Kolom = Ruang/Kelas, Baris = Hari ── */}
              <div className="overflow-x-auto w-full">
                <table
                  className="w-full border-collapse"
                  style={{
                    fontSize: '7pt',
                    tableLayout: 'fixed',
                  }}
                >
                  <colgroup>
                    {/* Kolom Hari & Tanggal */}
                    <col style={{ width: '82px' }} />
                    {/* Kolom Kelas & Ruang (dibagi proporsional) */}
                    {sheet.columns.map((col) => (
                      <col key={col.roomCode} />
                    ))}
                  </colgroup>

                  {/* HEADER TABEL: KELAS DI ATAS, RUANG DI BAWAH */}
                  <thead>
                    {/* Baris 1 (Paling Atas): LABEL KELAS */}
                    <tr>
                      <th
                        rowSpan={2}
                        style={{
                          border: '1.2px solid #334155',
                          padding: '4px 3px',
                          backgroundColor: '#f1f5f9',
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#0f172a',
                          fontSize: '7.5pt',
                        }}
                      >
                        HARI &amp; TANGGAL
                      </th>
                      {sheet.columns.map((col) => (
                        <th
                          key={col.roomCode}
                          style={{
                            border: '1.2px solid #334155',
                            padding: '4px 2px',
                            backgroundColor: '#e0e7ff',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#1e3a8a',
                            fontSize: '7.5pt',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={col.namaKelas}
                        >
                          {col.namaKelas}
                        </th>
                      ))}
                    </tr>

                    {/* Baris 2 (Di Bawah Kelas): KODE RUANG */}
                    <tr>
                      {sheet.columns.map((col) => (
                        <th
                          key={col.roomCode}
                          style={{
                            border: '1.2px solid #334155',
                            padding: '2px 2px',
                            backgroundColor: '#eef2ff',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#3730a3',
                            fontSize: '6.5pt',
                          }}
                        >
                          {col.roomCode}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* BODY TABEL: BARIS SENIN, SELASA, RABU, KAMIS, JUMAT */}
                  <tbody>
                    {sheet.days.map((day, rowIdx) => {
                      const isEven = rowIdx % 2 === 0;
                      return (
                        <tr key={day.dateKey}>
                          {/* Kolom Hari & Tanggal */}
                          <td
                            style={{
                              border: '1px solid #64748b',
                              padding: '4px 3px',
                              textAlign: 'center',
                              fontWeight: 700,
                              backgroundColor: isEven ? '#f8fafc' : '#ffffff',
                              color: '#0f172a',
                            }}
                          >
                            <div style={{ fontSize: '7.5pt', color: '#1e293b' }}>{day.dayName}</div>
                            <div style={{ fontSize: '6pt', color: '#64748b', fontWeight: 500 }}>
                              {day.dateKey}
                            </div>
                          </td>

                          {/* Sel per Ruang: Foto + Nama Pengawas (1 Line) */}
                          {sheet.columns.map((col) => {
                            const assign = day.roomAssignments[col.roomCode];
                            const p1 = assign?.pengawasNama || '';
                            const fotoUrl = assign?.pengawasFoto ? resolveProfilePhotoUrl(assign.pengawasFoto) : '';
                            const pr = assign?.proktorNama || '';
                            const isUnassigned = !p1;

                            return (
                              <td
                                key={col.roomCode}
                                style={{
                                  border: '1px solid #94a3b8',
                                  padding: '3px 2px',
                                  textAlign: 'center',
                                  backgroundColor: isUnassigned
                                    ? '#fff1f2'
                                    : isEven
                                      ? '#ffffff'
                                      : '#fafafa',
                                  color: isUnassigned ? '#ef4444' : '#0f172a',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {isUnassigned ? (
                                  <span style={{ fontStyle: 'italic', color: '#f87171', fontSize: '6.5pt' }}>
                                    (Kosong)
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    {/* Foto Pengawas (Opsional via toggle) */}
                                    {showPhotos && (
                                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center shadow-2xs">
                                        {fotoUrl ? (
                                          <img
                                            src={fotoUrl}
                                            alt={p1}
                                            className="w-full h-full object-cover"
                                            crossOrigin="anonymous"
                                            onError={(e) => {
                                              // Fallback initial huruf jika gagal load
                                              (e.currentTarget as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <span className="text-[7pt] font-bold text-slate-500 uppercase">
                                            {p1.charAt(0)}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Nama Pengawas: 1 Line dengan Ellipsis & Native Tooltip Hover */}
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '6.5pt',
                                        maxWidth: '100%',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: '1.2',
                                      }}
                                      title={p1}
                                    >
                                      {p1}
                                    </div>

                                    {/* Nama Proktor (Jika diaktifkan) */}
                                    {showProktor && pr && (
                                      <div
                                        style={{
                                          fontSize: '5.5pt',
                                          color: '#6b21a8',
                                          maxWidth: '100%',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                        title={`Proktor: ${pr}`}
                                      >
                                        P: {pr}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TANDA TANGAN RESMI UNIVERSAL DOCUMENT PRINTING */}
              <div className="mt-4 pt-1 w-full page-break-inside-avoid">
                <UniversalDocumentSignatures
                  layout="dual_cbt_pengawas"
                  titimangsaCity={
                    sekolahData?.kabupaten ||
                    sekolahData?.kota ||
                    tenantInfo?.kota ||
                    'Tempat'
                  }
                  titimangsaDate={new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  notesOrApprovalLabel="Mengetahui,\nKepala Sekolah"
                  customSigners={{
                    pengawasUjian: {
                      roleTitle: 'Ketua Panitia Pelaksana CBT,',
                      personName: activeEvent?.keterangan || 'Ketua Pelaksana',
                      nip: '',
                    },
                    kepsek: {
                      roleTitle: 'Mengetahui,\nKepala Sekolah',
                      personName:
                        sekolahData?.kepala_sekolah ||
                        sekolahData?.nama_kepala_sekolah ||
                        tenantInfo?.kepala_sekolah ||
                        'Kepala Sekolah',
                      nip:
                        sekolahData?.nip_kepala_sekolah ||
                        tenantInfo?.nip_kepala_sekolah ||
                        '-',
                    },
                  }}
                  spacingHeightMm={13}
                />
              </div>

              {/* FOOTER LEMBAR */}
              <div
                className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-slate-500"
                style={{ fontSize: '6.5pt' }}
              >
                <span>
                  Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span>
                  {sekolahData?.nama_sekolah || tenantInfo?.name || 'Sekolah'}
                </span>
                <span>
                  Lembar: <strong>{sheet.labelTingkat}</strong> (Halaman {sheetIdx + 1} dari {displaySheets.length})
                </span>
              </div>
            </PrintDocumentSheet>
          ))
        )}
      </div>
    </UniversalDocumentModal>
  );
};

export default CbtMatrixPengawasPrintModal;
