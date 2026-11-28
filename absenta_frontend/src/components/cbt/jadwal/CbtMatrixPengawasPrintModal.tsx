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
  namaKelas: string;  // misal: "X AKL 1"
  tingkat: number;    // 10, 11, 12
}

export interface DayRowData {
  dateKey: string;     // YYYY-MM-DD
  dayName: string;     // "Senin", "Selasa", dst
  fullLabel: string;   // "Senin, 02 Des 2026"
  // roomCode -> { pengawas: string, proktor: string }
  roomAssignments: Record<string, { pengawas: string; proktor: string }>;
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
        // Update nama rombel jika sebelumnya '-'
        const existing = roomHeaderMap.get(meta.roomCode)!;
        if (existing.namaKelas === '-' && meta.rombel !== '-') {
          existing.namaKelas = meta.rombel;
        }
      }
    });

    // Urutkan kolom Ruang secara natural (R.01, R.02, R.03 ...)
    const columns = Array.from(roomHeaderMap.values()).sort((a, b) => {
      const numA = parseInt(a.roomCode.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.roomCode.replace(/\D/g, '') || '0', 10);
      if (numA !== numB) return numA - numB;
      return a.roomCode.localeCompare(b.roomCode);
    });

    if (columns.length === 0) return;

    // Buat baris per hari
    const days: DayRowData[] = sortedDateKeys.map((dk) => {
      const dayName = getDayNameIndo(dk);
      const fullLabel = dateKeyMap.get(dk) || dk;
      const roomAssignments: Record<string, { pengawas: string; proktor: string }> = {};

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

        const p1Name = p1Id
          ? (guruMap.get(p1Id)?.nama_guru || j.setting_keamanan?.pengawas_1_nama || '')
          : (j.setting_keamanan?.pengawas_1_nama || '');
        const prName = prId
          ? (guruMap.get(prId)?.nama_guru || j.setting_keamanan?.proktor_nama || '')
          : (j.setting_keamanan?.proktor_nama || '');

        // Karena skema 1 guru mengawas 1 ruang seharian penuh, ambil assignment pertama yang terisi
        if (!roomAssignments[meta.roomCode] || (!roomAssignments[meta.roomCode].pengawas && p1Name)) {
          roomAssignments[meta.roomCode] = {
            pengawas: p1Name || '',
            proktor: prName || '',
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedTingkatTab, setSelectedTingkatTab] = useState<number | 'ALL'>('ALL');
  const [showProktor, setShowProktor] = useState(
    () => Boolean(activeEvent?.enable_proctor)
  );

  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  const namaEvent = activeEvent?.nama_event || eventName || 'Ujian CBT';

  // Build matriks per tingkat (Kolom = Ruang/Kelas, Baris = Hari)
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
      pdf.save(`Matrix_Pengawas_Ruang_${safeName}.pdf`);
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
      title={`Cetak Matrix Pengawas (Kolom: Ruang/Kelas, Baris: Hari) — ${namaEvent}`}
      allowLogoToggles
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      isExportingPdf={isExportingPdf}
      onExportPdf={handleExportPdf}
      extraControls={
        <div className="flex items-center gap-3">
          {tingkatSheets.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedTingkatTab('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all',
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
                    'px-2 py-1 rounded-md font-bold transition-all',
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
              <div className="text-center mb-2.5 mt-0.5">
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
                <p className="text-slate-500 italic text-[7.5pt]">
                  * Skema Ploting: 1 Guru mengawas 1 Ruang/Kelas penuh seharian (Full-Day Single Supervisor)
                </p>
              </div>

              {/* ── TABEL MATRIKS: Kolom = Ruang/Kelas, Baris = Hari ── */}
              <div className="overflow-x-auto w-full">
                <table
                  className="w-full border-collapse"
                  style={{
                    fontSize: '7.5pt',
                    tableLayout: 'fixed',
                  }}
                >
                  <colgroup>
                    {/* Kolom Hari & Tanggal */}
                    <col style={{ width: '90px' }} />
                    {/* Kolom Ruang / Kelas */}
                    {sheet.columns.map((col) => (
                      <col key={col.roomCode} />
                    ))}
                  </colgroup>

                  {/* HEADER TABEL: RUANG & KELAS */}
                  <thead>
                    {/* Baris 1: Kode Ruang (R.01, R.02 ...) */}
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
                          fontSize: '8pt',
                        }}
                      >
                        HARI &amp; TANGGAL
                      </th>
                      {sheet.columns.map((col) => (
                        <th
                          key={col.roomCode}
                          style={{
                            border: '1.2px solid #334155',
                            padding: '3px 2px',
                            backgroundColor: '#e0e7ff',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#1e3a8a',
                            fontSize: '8pt',
                          }}
                        >
                          {col.roomCode}
                        </th>
                      ))}
                    </tr>
                    {/* Baris 2: Nama Rombel Kelas (X AKL 1, X TKJ 2 ...) */}
                    <tr>
                      {sheet.columns.map((col) => (
                        <th
                          key={col.roomCode}
                          style={{
                            border: '1.2px solid #334155',
                            padding: '3px 2px',
                            backgroundColor: '#eef2ff',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#312e81',
                            fontSize: '7pt',
                            wordBreak: 'break-word',
                          }}
                        >
                          {col.namaKelas}
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
                              padding: '5px 4px',
                              textAlign: 'center',
                              fontWeight: 700,
                              backgroundColor: isEven ? '#f8fafc' : '#ffffff',
                              color: '#0f172a',
                            }}
                          >
                            <div style={{ fontSize: '8pt', color: '#1e293b' }}>{day.dayName}</div>
                            <div style={{ fontSize: '6.5pt', color: '#64748b', fontWeight: 500 }}>
                              {day.dateKey}
                            </div>
                          </td>

                          {/* Sel per Ruang: Nama Guru Pengawas */}
                          {sheet.columns.map((col) => {
                            const assign = day.roomAssignments[col.roomCode];
                            const p1 = assign?.pengawas || '';
                            const pr = assign?.proktor || '';
                            const isUnassigned = !p1;

                            return (
                              <td
                                key={col.roomCode}
                                style={{
                                  border: '1px solid #94a3b8',
                                  padding: '4px 3px',
                                  textAlign: 'center',
                                  backgroundColor: isUnassigned
                                    ? '#fff1f2'
                                    : isEven
                                      ? '#ffffff'
                                      : '#fafafa',
                                  color: isUnassigned ? '#ef4444' : '#0f172a',
                                  verticalAlign: 'middle',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.25',
                                }}
                              >
                                {isUnassigned ? (
                                  <span style={{ fontStyle: 'italic', color: '#f87171', fontSize: '6.5pt' }}>
                                    (Kosong)
                                  </span>
                                ) : (
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '7.5pt' }}>
                                      {p1}
                                    </div>
                                    {showProktor && pr && (
                                      <div style={{ fontSize: '6.5pt', color: '#6b21a8', marginTop: '1px' }}>
                                        Proktor: {pr}
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
              <div className="mt-5 pt-1 w-full page-break-inside-avoid">
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
                  spacingHeightMm={14}
                />
              </div>

              {/* FOOTER LEMBAR */}
              <div
                className="mt-3 pt-1 border-t border-slate-300 flex items-center justify-between text-slate-500"
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
