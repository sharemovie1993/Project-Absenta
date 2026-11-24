import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
} from '@/components/ui/PrintHeader';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import { TujuanPembelajaranItem } from '@/api/atp.api';
import { useKurikulumSigners } from './useKurikulumSigners';
import { toast } from 'react-hot-toast';
import { UserCog, RotateCcw } from 'lucide-react';

export interface KktpIntervalBand {
  label: string;
  min: number;
  max: number;
  tuntas: boolean;
  tindakLanjut: string;
}

export interface KktpRubricRow {
  perluBimbingan: string;
  cukup: string;
  baik: string;
  sangatBaik: string;
}

export interface KktpPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  approach: 'INTERVAL' | 'RUBRIK';
  kktpThreshold: number;
  intervals: KktpIntervalBand[];
  rubricMap: Record<string, KktpRubricRow>;
  mapelNama: string;
  fase: string;
  tahunPelajaranLabel: string;
  namaAtp: string;
  guruNama: string;
  guruNip?: string;
  tpList: TujuanPembelajaranItem[];
}

export const KktpPrintModal: React.FC<KktpPrintModalProps> = ({
  isOpen,
  onClose,
  approach,
  kktpThreshold,
  intervals,
  rubricMap,
  mapelNama,
  fase,
  tahunPelajaranLabel,
  namaAtp,
  guruNama,
  guruNip,
  tpList,
}) => {
  const printDeskRef = useRef<HTMLDivElement>(null);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showSignerEditor, setShowSignerEditor] = useState(false);

  const { headerData, resolvedSigners } = useKurikulumSigners(isOpen);

  const [wakaNamaEdit, setWakaNamaEdit] = useState('');
  const [wakaNipEdit, setWakaNipEdit] = useState('');
  const [kepsekNamaEdit, setKepsekNamaEdit] = useState('');
  const [kepsekNipEdit, setKepsekNipEdit] = useState('');
  const [kotaEdit, setKotaEdit] = useState('');

  useEffect(() => {
    setWakaNamaEdit(resolvedSigners.wakaNama);
    setWakaNipEdit(resolvedSigners.wakaNip);
    setKepsekNamaEdit(resolvedSigners.kepsekNama);
    setKepsekNipEdit(resolvedSigners.kepsekNip);
    setKotaEdit(resolvedSigners.kota);
  }, [resolvedSigners]);

  const handleResetSigners = () => {
    setWakaNamaEdit(resolvedSigners.wakaNama);
    setWakaNipEdit(resolvedSigners.wakaNip);
    setKepsekNamaEdit(resolvedSigners.kepsekNama);
    setKepsekNipEdit(resolvedSigners.kepsekNip);
    setKotaEdit(resolvedSigners.kota);
    toast.success('Penandatangan dikembalikan ke data struktur organisasi');
  };

  const todayFormatted = useMemo(
    () =>
      new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const orientation = approach === 'RUBRIK' ? 'landscape' : 'portrait';

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const result = await capturePrintSheetsToPdfBlob(printDeskRef.current, {
        orientation,
        fileName: `KKTP_${mapelNama}_Fase_${fase}_${tahunPelajaranLabel}.pdf`,
        scale: 2.5,
      });

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF KKTP True WYSIWYG berhasil diunduh!');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal merender PDF KKTP');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)"
      subtitle={`${mapelNama} • Fase ${fase} • Pendekatan ${approach === 'INTERVAL' ? 'Interval Nilai' : 'Rubrik 4 Kriteria'}`}
      orientation={orientation}
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={() => window.print()}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Merender PDF...' : 'Unduh PDF (WYSIWYG)'}
      printButtonText="Cetak Dokumen"
      size="5xl"
      extraActions={
        <button
          type="button"
          onClick={() => setShowSignerEditor((v) => !v)}
          className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
        >
          <UserCog className="w-3.5 h-3.5" />
          <span>Edit Penandatangan</span>
        </button>
      }
    >
      {showSignerEditor && (
        <div className="mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              Sesuaikan Pejabat Penandatangan (Sementara)
            </span>
            <button
              type="button"
              onClick={handleResetSigners}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Struktur</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <input
              value={wakaNamaEdit}
              onChange={(e) => setWakaNamaEdit(e.target.value)}
              placeholder="Nama Wakasek Kurikulum"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
            />
            <input
              value={wakaNipEdit}
              onChange={(e) => setWakaNipEdit(e.target.value)}
              placeholder="NIP Wakasek"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
            <input
              value={kepsekNamaEdit}
              onChange={(e) => setKepsekNamaEdit(e.target.value)}
              placeholder="Nama Kepala Sekolah"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
            />
            <input
              value={kepsekNipEdit}
              onChange={(e) => setKepsekNipEdit(e.target.value)}
              placeholder="NIP Kepala Sekolah"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
            />
            <input
              value={kotaEdit}
              onChange={(e) => setKotaEdit(e.target.value)}
              placeholder="Kota Titimangsa"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
            />
          </div>
        </div>
      )}

      <div ref={printDeskRef} className="py-2">
        <div id="print-desk-canvas-area">
          <PrintDocumentSheet
            orientation={orientation}
            pageNumber={1}
            totalPages={1}
            footerText={`KKTP ${mapelNama} — Fase ${fase} (${tahunPelajaranLabel})`}
          >
            <PrintHeader
              data={headerData}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            <div className="text-center my-3 space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
                KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)
              </h2>
              <p className="text-[11px] font-bold text-slate-700">
                KURIKULUM MERDEKA • TAHUN PELAJARAN {tahunPelajaranLabel}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-800 mb-3 border border-slate-300 rounded-md p-2.5 bg-slate-50/50">
              <div><span className="font-bold">Mata Pelajaran:</span> {mapelNama}</div>
              <div><span className="font-bold">Guru Pengampu:</span> {guruNama}</div>
              <div><span className="font-bold">Fase / Sumber ATP:</span> Fase {fase} ({namaAtp || '-'})</div>
              <div>
                <span className="font-bold">Pendekatan / Ambang Tuntas:</span>{' '}
                {approach === 'INTERVAL' ? `Interval Nilai (KKTP ≥ ${kktpThreshold})` : 'Rubrik 4 Kriteria (Min. Baik)'}
              </div>
            </div>

            {approach === 'INTERVAL' ? (
              <div className="space-y-3">
                <table className="w-full border-collapse text-[10px] text-slate-900">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-slate-800 px-2 py-1.5 w-24 text-center">Rentang Nilai</th>
                      <th className="border border-slate-800 px-2 py-1.5 w-32 text-left">Predikat</th>
                      <th className="border border-slate-800 px-2 py-1.5 w-28 text-center">Status</th>
                      <th className="border border-slate-800 px-2 py-1.5 text-left">Tindak Lanjut / Intervensi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intervals.map((b, i) => (
                      <tr key={i}>
                        <td className="border border-slate-800 px-2 py-1 text-center font-mono font-bold">
                          {b.min} – {b.max}
                        </td>
                        <td className="border border-slate-800 px-2 py-1 font-semibold">{b.label}</td>
                        <td className="border border-slate-800 px-2 py-1 text-center font-bold">
                          {b.tuntas ? 'Tuntas' : 'Belum Tuntas'}
                        </td>
                        <td className="border border-slate-800 px-2 py-1">{b.tindakLanjut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="w-full border-collapse text-[10px] text-slate-900">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-slate-800 px-2 py-1.5 w-8 text-center">No</th>
                      <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Kode TP</th>
                      <th className="border border-slate-800 px-2 py-1.5 text-left">Tujuan Pembelajaran / Materi Pokok</th>
                      <th className="border border-slate-800 px-2 py-1.5 text-left">Indikator Ketercapaian</th>
                      <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Ambang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tpList.map((tp, idx) => (
                      <tr key={tp.id || idx}>
                        <td className="border border-slate-800 px-2 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-mono font-bold">{tp.kode_tp}</td>
                        <td className="border border-slate-800 px-2 py-1.5 font-semibold">{tp.judul_materi}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{tp.deskripsi_tp || '-'}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-bold">≥ {kktpThreshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <table className="w-full border-collapse text-[9.5px] text-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-800 px-1.5 py-1.5 w-7 text-center">No</th>
                    <th className="border border-slate-800 px-1.5 py-1.5 w-16 text-center">Kode TP</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-44 text-left">Tujuan Pembelajaran</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Perlu Bimbingan</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Cukup</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Baik (Tuntas)</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Sangat Baik</th>
                  </tr>
                </thead>
                <tbody>
                  {tpList.map((tp, idx) => {
                    const key = tp.id || tp.kode_tp || String(idx);
                    const row = rubricMap[key];
                    return (
                      <tr key={key}>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center font-mono font-bold">{tp.kode_tp}</td>
                        <td className="border border-slate-800 px-2 py-1.5 font-semibold">{tp.judul_materi}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{row?.perluBimbingan || '-'}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{row?.cukup || '-'}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{row?.baik || '-'}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{row?.sangatBaik || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Standar Tanda Tangan 2-Tier */}
            <div className="mt-6 text-[10.5px] text-slate-900 break-inside-avoid">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p>&nbsp;</p>
                  <p>Diverifikasi oleh,</p>
                  <p className="font-bold">Wakasek Bidang Kurikulum</p>
                  <div className="h-14" />
                  <p className="font-bold underline underline-offset-2">{wakaNamaEdit}</p>
                  <p className="text-[9.5px]">NIP. {wakaNipEdit}</p>
                </div>
                <div className="text-center">
                  <p>{kotaEdit}, {todayFormatted}</p>
                  <p>Disusun oleh,</p>
                  <p className="font-bold">Guru Mata Pelajaran</p>
                  <div className="h-14" />
                  <p className="font-bold underline underline-offset-2">{guruNama}</p>
                  <p className="text-[9.5px]">NIP. {guruNip || '-'}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <div className="text-center min-w-[220px]">
                  <p>Mengetahui / Menyetujui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-14" />
                  <p className="font-bold underline underline-offset-2">{kepsekNamaEdit}</p>
                  <p className="text-[9.5px]">NIP. {kepsekNipEdit}</p>
                </div>
              </div>
            </div>
          </PrintDocumentSheet>
        </div>
      </div>
    </UniversalDocumentModal>
  );
};
