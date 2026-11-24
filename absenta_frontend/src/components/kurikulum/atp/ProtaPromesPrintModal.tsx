import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { getStrukturTree, getStrukturList } from '@/api/academic/strukturOrganisasi.api';
import { capturePrintSheetsToPdfBlob } from '@/utils/print/capturePrintSheetsToPdf';
import { TujuanPembelajaranItem } from '@/api/atp.api';
import { toast } from 'react-hot-toast';
import { Check, UserCog, RotateCcw } from 'lucide-react';

function cleanNip(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s || s === '-' || s === 'null' || s === 'undefined') return '-';
  const m = s.match(/NIP\.?\s*[:.]?\s*([0-9\s.-]+)/i);
  if (m && m[1]) return m[1].trim();
  return s;
}

export interface ProtaPromesPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  docMode: 'PROTA' | 'PROMES';
  promesSemester: 'GANJIL' | 'GENAP';
  mapelNama: string;
  fase: string;
  tahunPelajaranLabel: string;
  namaAtp: string;
  guruNama: string;
  guruNip?: string;
  tpList: TujuanPembelajaranItem[];
  tpSemesterMap: Record<string, 'GANJIL' | 'GENAP'>;
  promesTpList: TujuanPembelajaranItem[];
  promesWeeks: Record<string, boolean>;
  months: string[];
  protaSummary: { ganjilJp: number; genapJp: number; totalJp: number };
  nonEffectiveWeeks?: Record<string, { label: string; jenis: string }>;
  effectiveWeeksCount?: number;
}

export const ProtaPromesPrintModal: React.FC<ProtaPromesPrintModalProps> = ({
  isOpen,
  onClose,
  docMode,
  promesSemester,
  mapelNama,
  fase,
  tahunPelajaranLabel,
  namaAtp,
  guruNama,
  guruNip,
  tpList,
  tpSemesterMap,
  promesTpList,
  promesWeeks,
  months,
  protaSummary,
  nonEffectiveWeeks = {},
  effectiveWeeksCount,
}) => {
  const printDeskRef = useRef<HTMLDivElement>(null);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showSignerEditor, setShowSignerEditor] = useState(false);

  const { data: sekolahRes } = useQuery({
    queryKey: ['sekolah-profile-signers'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const { data: treeRes } = useQuery({
    queryKey: ['struktur-organisasi-tree-print'],
    queryFn: () => getStrukturTree().catch(() => ({})),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const { data: listRes } = useQuery({
    queryKey: ['struktur-organisasi-list-print'],
    queryFn: () => getStrukturList().catch(() => []),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const headerData = usePrintHeaderData(sekolahRes as any);

  const resolvedSigners = useMemo(() => {
    const tree = (treeRes as any)?.data || treeRes || {};
    const list = Array.isArray((listRes as any)?.data)
      ? (listRes as any).data
      : Array.isArray(listRes)
      ? listRes
      : [];
    const sekolah = (sekolahRes as any)?.data || sekolahRes || {};

    // 1. RESOLVE KEPALA SEKOLAH
    let kepsekNama = sekolah?.kepala_sekolah || '';
    let kepsekNip = cleanNip(sekolah?.nip_kepala || sekolah?.nip_kepala_sekolah);

    const kepsekNodes = Array.isArray(tree['KEPALA_SEKOLAH']) ? tree['KEPALA_SEKOLAH'] : [];
    const activeKepsek = kepsekNodes.find((n: any) => Array.isArray(n?.members) && n.members.length > 0);
    if (activeKepsek?.members?.[0]?.name) {
      kepsekNama = activeKepsek.members[0].name;
      const parsedNip = cleanNip(activeKepsek.members[0].details);
      if (parsedNip !== '-') kepsekNip = parsedNip;
    }

    if (!kepsekNama) {
      const kepsekPos = list.find((p: any) => {
        const code = String(p?.kode || p?.code || '').toUpperCase();
        return code === 'KEPALA_SEKOLAH' || code === 'KEPSEK';
      });
      const assign =
        kepsekPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) ||
        kepsekPos?.organizationalAssigns?.[0];
      if (assign?.User?.Guru) {
        kepsekNama = assign.User.Guru.nama_guru;
        kepsekNip = assign.User.Guru.nip || kepsekNip;
      }
    }

    // 2. RESOLVE WAKASEK KURIKULUM
    let wakaNama = '';
    let wakaNip = '-';

    const kurikulumNodes = [
      ...(Array.isArray(tree['KURIKULUM']) ? tree['KURIKULUM'] : []),
      ...(Array.isArray(tree['WAKA_KURIKULUM']) ? tree['WAKA_KURIKULUM'] : []),
    ];
    const activeKurikulum = kurikulumNodes.find((n: any) => Array.isArray(n?.members) && n.members.length > 0);
    if (activeKurikulum?.members?.[0]?.name) {
      wakaNama = activeKurikulum.members[0].name;
      const parsedNip = cleanNip(activeKurikulum.members[0].details);
      if (parsedNip !== '-') wakaNip = parsedNip;
    }

    if (!wakaNama) {
      const kurikulumPos = list.find((p: any) => {
        const code = String(p?.kode || p?.code || '').toUpperCase();
        const name = String(p?.nama || p?.name || '').toUpperCase();
        return code === 'KURIKULUM' || code === 'WAKA_KURIKULUM' || name.includes('KURIKULUM');
      });
      const assign =
        kurikulumPos?.organizationalAssigns?.find((a: any) => a.is_active !== false) ||
        kurikulumPos?.organizationalAssigns?.[0];
      if (assign?.User?.Guru) {
        wakaNama = assign.User.Guru.nama_guru;
        wakaNip = assign.User.Guru.nip || '-';
      }
    }

    const kota = sekolah?.kabupaten_kota || sekolah?.kota || 'Purwakarta';

    return {
      kepsekNama: kepsekNama || 'Kepala Sekolah',
      kepsekNip: kepsekNip || '-',
      wakaNama: wakaNama || 'Wakasek Bidang Kurikulum',
      wakaNip: wakaNip || '-',
      kota,
    };
  }, [treeRes, listRes, sekolahRes]);

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

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const orientation = docMode === 'PROMES' ? 'landscape' : 'portrait';

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const result = await capturePrintSheetsToPdfBlob(printDeskRef.current, {
        orientation,
        fileName: `${docMode}_${mapelNama}_Fase_${fase}_${tahunPelajaranLabel}.pdf`,
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
      toast.success(`PDF ${docMode} True WYSIWYG berhasil diunduh!`);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal merender PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        docMode === 'PROTA'
          ? 'Pratinjau Cetak Program Tahunan (PROTA)'
          : `Pratinjau Cetak Program Semester ${promesSemester} (PROMES)`
      }
      subtitle={`${mapelNama} • Fase ${fase} • TP ${tahunPelajaranLabel}`}
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
            footerText={`${docMode} ${mapelNama} — Fase ${fase} (${tahunPelajaranLabel})`}
          >
            <PrintHeader
              data={headerData}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            {/* Judul Resmi */}
            <div className="text-center my-3 space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
                {docMode === 'PROTA'
                  ? 'PROGRAM TAHUNAN (PROTA)'
                  : `PROGRAM SEMESTER ${promesSemester} (PROMES)`}
              </h2>
              <p className="text-[11px] font-bold text-slate-700">
                KURIKULUM MERDEKA • TAHUN PELAJARAN {tahunPelajaranLabel}
              </p>
            </div>

            {/* Identitas Mapel */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-800 mb-3 border border-slate-300 rounded-md p-2.5 bg-slate-50/50">
              <div><span className="font-bold">Mata Pelajaran:</span> {mapelNama}</div>
              <div><span className="font-bold">Guru Pengampu:</span> {guruNama}</div>
              <div><span className="font-bold">Fase / Tingkat:</span> Fase {fase}</div>
              <div><span className="font-bold">Sumber ATP:</span> {namaAtp || '-'}</div>
            </div>

            {/* Tabel Data */}
            {docMode === 'PROTA' ? (
              <table className="w-full border-collapse text-[10.5px] text-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-800 px-2 py-1.5 w-8 text-center">No</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Kode TP</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Tujuan Pembelajaran / Materi Pokok</th>
                    <th className="border border-slate-800 px-2 py-1.5 text-left">Capaian Pembelajaran (CP)</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Semester</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-16 text-center">Alokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {tpList.map((tp, idx) => {
                    const key = tp.id || tp.kode_tp || String(idx);
                    const sem = tpSemesterMap[key] || 'GANJIL';
                    return (
                      <tr key={key}>
                        <td className="border border-slate-800 px-2 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-mono font-bold">{tp.kode_tp}</td>
                        <td className="border border-slate-800 px-2 py-1.5 font-semibold">{tp.judul_materi}</td>
                        <td className="border border-slate-800 px-2 py-1.5">{tp.deskripsi_tp || '-'}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center">
                          {sem === 'GANJIL' ? 'Ganjil (1)' : 'Genap (2)'}
                        </td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-bold">{tp.alokasi_jp || 0} JP</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border border-slate-800 px-2 py-1.5 text-right">
                      Rekapitulasi Alokasi Jam Pelajaran (Ganjil: {protaSummary.ganjilJp} JP • Genap: {protaSummary.genapJp} JP)
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center">TOTAL</td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center">{protaSummary.totalJp} JP</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-[9.5px] text-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-7 text-center">No</th>
                    <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-14 text-center">Kode</th>
                    <th rowSpan={2} className="border border-slate-800 px-2 py-1 text-left">Tujuan Pembelajaran / Materi Pokok</th>
                    <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-10 text-center">JP</th>
                    {months.map((m) => (
                      <th key={m} colSpan={4} className="border border-slate-800 px-1 py-1 text-center">
                        {m}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-100 font-bold text-[8.5px]">
                    {months.map((m) =>
                      [1, 2, 3, 4].map((w) => (
                        <th key={`${m}-${w}`} className="border border-slate-800 w-5 py-0.5 text-center">
                          {w}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {promesTpList.map((tp, idx) => {
                    const key = tp.id || tp.kode_tp || String(idx);
                    return (
                      <tr key={key}>
                        <td className="border border-slate-800 px-1.5 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 px-1.5 py-1 text-center font-mono font-bold">{tp.kode_tp}</td>
                        <td className="border border-slate-800 px-2 py-1 font-semibold">{tp.judul_materi}</td>
                        <td className="border border-slate-800 px-1.5 py-1 text-center font-bold">{tp.alokasi_jp || 0}</td>
                        {months.map((_, mIdx) =>
                          [0, 1, 2, 3].map((wIdx) => {
                            const nonEff = nonEffectiveWeeks[`${mIdx}_${wIdx}`];
                            const checked = !nonEff && Boolean(promesWeeks[`${key}_${mIdx}_${wIdx}`]);
                            return (
                              <td
                                key={`${mIdx}-${wIdx}`}
                                title={nonEff ? nonEff.label : undefined}
                                className={`border border-slate-800 text-center ${
                                  nonEff
                                    ? 'bg-slate-300/80 text-slate-500'
                                    : checked
                                    ? 'bg-slate-200 font-black'
                                    : ''
                                }`}
                              >
                                {nonEff ? '×' : checked ? <Check className="w-3 h-3 mx-auto text-slate-900" /> : ''}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {docMode === 'PROMES' && typeof effectiveWeeksCount === 'number' && (
              <div className="mt-2 text-[9.5px] text-slate-700 flex items-center justify-between">
                <span>
                  <strong>Kalender Pendidikan:</strong> {effectiveWeeksCount} Minggu Efektif KBM • {Object.keys(nonEffectiveWeeks).length} Minggu Tidak Efektif (ditandai arsiran ×)
                </span>
              </div>
            )}

            {/* Standar Tanda Tangan 2-Tier */}
            <div className="mt-6 text-[10.5px] text-slate-900 break-inside-avoid">
              {/* Baris 1: Verifikator (Kiri) + Pembuat Dokumen (Kanan) */}
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

              {/* Baris 2: Kepala Sekolah (Tengah Bawah) */}
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
