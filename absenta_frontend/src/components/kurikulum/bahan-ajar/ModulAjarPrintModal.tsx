import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
} from '@/components/ui/PrintHeader';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import { PertemuanItem } from '@/api/bahan-ajar.api';
import { useKurikulumSigners } from '../atp/useKurikulumSigners';
import { toast } from 'react-hot-toast';
import { UserCog, RotateCcw } from 'lucide-react';

export interface ModulAjarPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  judulBab: string;
  nomorBab: number;
  deskripsiBab?: string;
  mapelNama: string;
  fase: string;
  tingkat: number;
  guruNama: string;
  guruNip?: string;
  pertemuanList: PertemuanItem[];
}

export const ModulAjarPrintModal: React.FC<ModulAjarPrintModalProps> = ({
  isOpen,
  onClose,
  judulBab,
  nomorBab,
  deskripsiBab,
  mapelNama,
  fase,
  tingkat,
  guruNama,
  guruNip,
  pertemuanList,
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

  const totalJp = useMemo(
    () => pertemuanList.reduce((acc, m) => acc + (Number(m.alokasi_jp) || 0), 0),
    [pertemuanList]
  );

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const result = await capturePrintSheetsToPdfBlob(printDeskRef.current, {
        orientation: 'portrait',
        fileName: `MODUL_AJAR_${mapelNama}_Bab_${nomorBab}_Fase_${fase}.pdf`,
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
      toast.success('PDF Modul Ajar True WYSIWYG berhasil diunduh!');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal merender PDF Modul Ajar');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pratinjau Cetak Modul Ajar — Bab ${nomorBab}`}
      subtitle={`${mapelNama} • Fase ${fase} • ${pertemuanList.length} Pertemuan (${totalJp} JP)`}
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={() => window.print()}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Merender PDF...' : 'Unduh PDF (WYSIWYG)'}
      printButtonText="Cetak Modul Ajar"
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
            orientation="portrait"
            pageNumber={1}
            totalPages={1}
            footerText={`Modul Ajar ${mapelNama} — Bab ${nomorBab} (Fase ${fase})`}
          >
            <PrintHeader
              data={headerData}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            <div className="text-center my-3 space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
                MODUL AJAR KURIKULUM MERDEKA
              </h2>
              <p className="text-[11px] font-bold text-slate-700">
                BAB {nomorBab}: {judulBab || mapelNama}
              </p>
            </div>

            {/* A. Informasi Umum */}
            <div className="border border-slate-800 rounded-none mb-3 text-[10.5px] text-slate-900">
              <div className="bg-slate-100 border-b border-slate-800 px-2.5 py-1 font-black uppercase">
                A. Informasi Umum
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 p-2.5">
                <div><span className="font-bold">Mata Pelajaran:</span> {mapelNama}</div>
                <div><span className="font-bold">Guru Pengampu:</span> {guruNama}</div>
                <div><span className="font-bold">Fase / Kelas:</span> Fase {fase} (Tingkat {tingkat})</div>
                <div><span className="font-bold">Alokasi Waktu:</span> {totalJp} JP ({pertemuanList.length} Pertemuan)</div>
                {deskripsiBab && (
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="font-bold">Deskripsi Singkat:</span> {deskripsiBab}
                  </div>
                )}
              </div>
            </div>

            {/* B. Rangkaian Pertemuan & Langkah KBM */}
            <div className="space-y-3 text-[10px] text-slate-900">
              {pertemuanList.map((m, idx) => (
                <div key={idx} className="border border-slate-800 break-inside-avoid">
                  <div className="bg-slate-100 border-b border-slate-800 px-2.5 py-1.5 flex items-center justify-between font-bold">
                    <span>
                      Pertemuan {m.nomor_pertemuan || idx + 1}: {m.topik}
                    </span>
                    <span className="font-mono text-[9.5px]">
                      {m.alokasi_jp} JP ({m.durasi_menit || m.alokasi_jp * 45} Menit)
                    </span>
                  </div>

                  <div className="p-2.5 space-y-2">
                    {Array.isArray(m.tujuan_pembelajaran) && m.tujuan_pembelajaran.filter(Boolean).length > 0 && (
                      <div>
                        <p className="font-bold underline mb-0.5">Tujuan Pembelajaran:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {m.tujuan_pembelajaran.filter(Boolean).map((tp, tIdx) => (
                            <li key={tIdx}>{tp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-1.5">
                      {Array.isArray(m.langkah_kbm?.pendahuluan?.kegiatan) &&
                        m.langkah_kbm.pendahuluan.kegiatan.filter(Boolean).length > 0 && (
                        <div>
                          <p className="font-bold">
                            1. Pendahuluan ({m.langkah_kbm.pendahuluan.durasi_menit || 15} menit):
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {m.langkah_kbm.pendahuluan.kegiatan.filter(Boolean).map((k, kIdx) => (
                              <li key={kIdx}>{k}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(m.langkah_kbm?.inti?.kegiatan) &&
                        m.langkah_kbm.inti.kegiatan.filter(Boolean).length > 0 && (
                        <div>
                          <p className="font-bold">
                            2. Kegiatan Inti ({m.langkah_kbm.inti.durasi_menit || 60} menit):
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {m.langkah_kbm.inti.kegiatan.filter(Boolean).map((k, kIdx) => (
                              <li key={kIdx}>{k}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {m.langkah_kbm?.inti?.lkpd?.judul && (
                        <div className="p-2 bg-slate-50 border border-slate-300">
                          <p className="font-bold">LKPD: {m.langkah_kbm.inti.lkpd.judul}</p>
                          {m.langkah_kbm.inti.lkpd.petunjuk && (
                            <p className="whitespace-pre-line mt-0.5 text-[9.5px]">
                              {m.langkah_kbm.inti.lkpd.petunjuk}
                            </p>
                          )}
                        </div>
                      )}

                      {Array.isArray(m.langkah_kbm?.penutup?.kegiatan) &&
                        m.langkah_kbm.penutup.kegiatan.filter(Boolean).length > 0 && (
                        <div>
                          <p className="font-bold">
                            3. Penutup ({m.langkah_kbm.penutup.durasi_menit || 15} menit):
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {m.langkah_kbm.penutup.kegiatan.filter(Boolean).map((k, kIdx) => (
                              <li key={kIdx}>{k}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
