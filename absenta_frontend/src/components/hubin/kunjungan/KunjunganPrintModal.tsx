import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { SlidersHorizontal, MapPin, Camera } from 'lucide-react';
import { KunjunganPrintSignersDrawer } from './KunjunganPrintSignersDrawer';
import { Button } from '@/components/ui';
import type { SiswaPkl } from '@/api/hubin.api';
import { usePklMatriksSigners } from '../nilai-pkl/usePklMatriksSigners';

export type MonitoringCyclePattern = 'standard_3' | 'recorded_only' | 'monthly';

export interface KunjunganPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPkl: SiswaPkl | null;
}

export const KunjunganPrintModal: React.FC<KunjunganPrintModalProps> = ({
  isOpen,
  onClose,
  selectedPkl,
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cyclePattern, setCyclePattern] = useState<MonitoringCyclePattern>('standard_3');
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);

  // 1. Hook SSOT Kop Surat Dinas & Sekolah
  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  // 2. Hook SSOT Struktur Organisasi (Waka Hubin & Kepala Sekolah)
  const autoSigners = usePklMatriksSigners(undefined, selectedPkl?.Siswa?.Kelas?.nama_kelas);

  // Parse kunjungan list from selectedPkl
  const rawKunjunganList = useMemo<any[]>(() => {
    if (!selectedPkl?.kunjungan_json) return [];
    try {
      return Array.isArray(selectedPkl.kunjungan_json)
        ? selectedPkl.kunjungan_json
        : JSON.parse(selectedPkl.kunjungan_json || '[]');
    } catch {
      return [];
    }
  }, [selectedPkl?.kunjungan_json]);

  // Resolving Default Signers
  const resolvedSigners = useMemo(() => {
    const hubinNama = autoSigners?.wakasekHubin?.isAssigned ? autoSigners.wakasekHubin.nama : '';
    const hubinNip =
      autoSigners?.wakasekHubin?.nip && autoSigners.wakasekHubin.nip !== '-'
        ? autoSigners.wakasekHubin.nip
        : '';

    const kepsekNama =
      autoSigners?.kepsek?.nama || (rawSekolah as any)?.kepala_sekolah || (tenantInfo as any)?.kepala_sekolah || '';
    const kepsekNip =
      autoSigners?.kepsek?.nip && autoSigners.kepsek.nip !== '-'
        ? autoSigners.kepsek.nip
        : (rawSekolah as any)?.nip_kepala || (tenantInfo as any)?.nip_kepala || '';

    const pembimbingNama = selectedPkl?.Pembimbing?.nama_guru || '';
    const kota = (rawSekolah as any)?.kota || (tenantInfo as any)?.city || 'Bandung';
    const tanggal = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      mitraNama: selectedPkl?.Mitra?.nama || 'Pembimbing Industri DU/DI',
      pembimbingNama,
      hubinNama,
      hubinNip,
      kepsekNama,
      kepsekNip,
      kota,
      tanggal,
    };
  }, [autoSigners, rawSekolah, tenantInfo, selectedPkl]);

  // Customizable Signer States
  const [activeMitraNama, setActiveMitraNama] = useState('');
  const [activePembimbingNama, setActivePembimbingNama] = useState('');
  const [activeHubinNama, setActiveHubinNama] = useState('');
  const [activeHubinNip, setActiveHubinNip] = useState('');
  const [activeKepsekNama, setActiveKepsekNama] = useState('');
  const [activeKepsekNip, setActiveKepsekNip] = useState('');
  const [activeKota, setActiveKota] = useState('');
  const [activeTanggal, setActiveTanggal] = useState('');

  useEffect(() => {
    setActiveMitraNama(resolvedSigners.mitraNama);
    setActivePembimbingNama(resolvedSigners.pembimbingNama);
    setActiveHubinNama(resolvedSigners.hubinNama);
    setActiveHubinNip(resolvedSigners.hubinNip);
    setActiveKepsekNama(resolvedSigners.kepsekNama);
    setActiveKepsekNip(resolvedSigners.kepsekNip);
    setActiveKota(resolvedSigners.kota);
    setActiveTanggal(resolvedSigners.tanggal);
  }, [resolvedSigners]);

  const handleResetStruktur = useCallback(() => {
    setActiveMitraNama(resolvedSigners.mitraNama);
    setActivePembimbingNama(resolvedSigners.pembimbingNama);
    setActiveHubinNama(resolvedSigners.hubinNama);
    setActiveHubinNip(resolvedSigners.hubinNip);
    setActiveKepsekNama(resolvedSigners.kepsekNama);
    setActiveKepsekNip(resolvedSigners.kepsekNip);
    setActiveKota(resolvedSigners.kota);
    setActiveTanggal(resolvedSigners.tanggal);
    toast.success('Penandatangan direset sesuai hierarki struktur riil database.');
  }, [resolvedSigners]);

  // Compute Monitoring Table Rows
  const monitoringRows = useMemo(() => {
    if (!selectedPkl) return [];

    let targetCount = 3;
    if (cyclePattern === 'recorded_only') {
      targetCount = Math.max(1, rawKunjunganList.length);
    } else if (cyclePattern === 'monthly') {
      if (selectedPkl.tanggal_mulai && selectedPkl.tanggal_selesai) {
        const start = new Date(selectedPkl.tanggal_mulai);
        const end = new Date(selectedPkl.tanggal_selesai);
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        targetCount = Math.max(1, Math.min(6, diffMonths));
      } else {
        targetCount = 3;
      }
    }

    const rows: { index: number; label: string; kunjungan: any | null }[] = [];
    for (let i = 0; i < targetCount; i++) {
      const k = rawKunjunganList[i] || null;
      let label = `Kunjungan Ke-${i + 1}`;
      if (cyclePattern === 'standard_3') {
        if (i === 0) label = 'Siklus I: Monitoring Awal (Orientasi)';
        else if (i === 1) label = 'Siklus II: Monitoring Tengah (Evaluasi)';
        else if (i === 2) label = 'Siklus III: Monitoring Akhir (Penjemputan)';
      } else if (cyclePattern === 'monthly') {
        label = `Monitoring Bulan Ke-${i + 1}`;
      }
      rows.push({ index: i + 1, label, kunjungan: k });
    }
    return rows;
  }, [selectedPkl, cyclePattern, rawKunjunganList]);

  if (!isOpen || !selectedPkl) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    toast.loading('Sedang merender PDF True WYSIWYG...', { id: 'pdf-render' });

    const deskCanvas = document.getElementById('print-desk-canvas-area');
    if (deskCanvas) {
      deskCanvas.style.zoom = '1';
    }

    try {
      const sheetElement = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheetElement) {
        window.print();
        toast.dismiss('pdf-render');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const canvas = await html2canvas(sheetElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
          if (clonedDesk) {
            clonedDesk.style.zoom = '1';
            (clonedDesk.style as any).transform = 'none';
          }
          const allSheets = clonedDoc.querySelectorAll('.print-sheet');
          allSheets.forEach((s: any) => {
            s.style.zoom = '1';
            s.style.transform = 'none';
          });
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      const safeName = (selectedPkl.Siswa?.nama_siswa || 'Siswa').replace(/\s+/g, '_');
      pdf.save(`LEMBAR_SUPERVISI_PKL_${safeName}.pdf`);
      toast.success('Dokumen PDF True WYSIWYG berhasil diunduh!', { id: 'pdf-render' });
    } catch {
      toast.error('Gagal membuat dokumen PDF', { id: 'pdf-render' });
    } finally {
      setIsExporting(false);
    }
  };

  const tglMulai = selectedPkl.tanggal_mulai
    ? new Date(selectedPkl.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';
  const tglSelesai = selectedPkl.tanggal_selesai
    ? new Date(selectedPkl.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Selesai';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Lembar Supervisi & Monitoring PKL"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Siswa:</span>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">
            {selectedPkl.Siswa?.nama_siswa}
          </span>
          <span className="text-xs text-slate-500">• {selectedPkl.Mitra?.nama}</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">• Standar A4 Portrait (210 × 297 mm)</span>
        </div>
      }
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={(show) => setShowLogoDaerah(show)}
      onToggleLogoSekolah={(show) => setShowLogoSekolah(show)}
      allowLogoToggles={true}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      size="5xl"
      extraActions={
        <div className="flex items-center gap-2">
          {/* Cycle Pattern Selector */}
          <select
            value={cyclePattern}
            onChange={(e) => setCyclePattern(e.target.value as MonitoringCyclePattern)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium h-9"
            title="Pola Baris Siklus Kunjungan"
          >
            <option value="standard_3">Pola Standar (3 Siklus: Awal, Tengah, Akhir)</option>
            <option value="recorded_only">Hanya Log Tercatat ({rawKunjunganList.length} Baris)</option>
            <option value="monthly">Pola Bulanan (Sesuai Durasi PKL)</option>
          </select>

          {/* Toggle TTD Config Drawer */}
          <Button
            type="button"
            size="sm"
            variant={showTtdConfig ? 'primary' : 'outline'}
            onClick={() => setShowTtdConfig((v) => !v)}
            className="text-xs font-bold rounded-xl h-9 gap-1.5"
            title="Kustomisasi Penandatangan"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Penandatangan</span>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* Printable Sheet Container */}
        <div id="print-desk-canvas-area" className="w-full flex justify-center overflow-x-auto py-2">
          <PrintDocumentSheet orientation="portrait" footerText="Lembar Monitoring Resmi Praktik Kerja Lapangan (PKL)">
            {/* 1. Kop Surat Resmi Dinas & Sekolah */}
            <PrintHeader
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
              tenantInfo={tenantInfo}
              rawSekolah={rawSekolah}
            />

            {/* 2. Judul Dokumen Resmi */}
            <div className="text-center mt-3 mb-4">
              <h3 className="text-base font-black uppercase tracking-wider text-black border-b-2 border-black inline-block pb-0.5">
                LEMBAR SUPERVISI &amp; MONITORING PRAKTIK KERJA LAPANGAN
              </h3>
              <p className="text-[11px] font-semibold text-gray-700 mt-1">
                Tahun Ajaran: {tenantInfo?.tahun_ajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
              </p>
            </div>

            {/* 3. Biodata Siswa & Perusahaan Mitra */}
            <div className="border border-black rounded-sm p-3 mb-4 text-xs font-sans text-black">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex">
                  <span className="w-32 font-bold shrink-0">Nama Siswa</span>
                  <span className="mr-1">:</span>
                  <span className="font-bold uppercase">{selectedPkl.Siswa?.nama_siswa || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-bold shrink-0">Mitra IDUKA / DU/DI</span>
                  <span className="mr-1">:</span>
                  <span className="font-bold uppercase">{selectedPkl.Mitra?.nama || '-'}</span>
                </div>

                <div className="flex">
                  <span className="w-32 font-bold shrink-0">NIS / Kelas</span>
                  <span className="mr-1">:</span>
                  <span className="font-mono">
                    {selectedPkl.Siswa?.nis || '-'} / {selectedPkl.Siswa?.Kelas?.nama_kelas || 'XII'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-bold shrink-0">Alamat DU/DI</span>
                  <span className="mr-1">:</span>
                  <span className="truncate">{selectedPkl.Mitra?.alamat || '-'}</span>
                </div>

                <div className="flex">
                  <span className="w-32 font-bold shrink-0">Guru Pembimbing</span>
                  <span className="mr-1">:</span>
                  <span>{selectedPkl.Pembimbing?.nama_guru || 'Ditunjuk Sekolah'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-bold shrink-0">Periode PKL</span>
                  <span className="mr-1">:</span>
                  <span>
                    {tglMulai} s/d {tglSelesai}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Tabel Siklus Supervisi & Monitoring Berkala */}
            <table className="w-full mb-3 border-collapse text-[11px] font-sans border border-black text-black">
              <thead>
                <tr className="bg-slate-100 border-b border-black text-center font-bold">
                  <th className="py-2 px-1.5 border-r border-black w-8">NO</th>
                  <th className="py-2 px-2 border-r border-black w-36">SIKLUS &amp; TANGGAL</th>
                  <th className="py-2 px-3 border-r border-black text-left">AGENDA &amp; CATATAN GURU PEMBIMBING</th>
                  <th className="py-2 px-3 border-r border-black w-44 text-left">CATATAN / MASUKAN DU/DI</th>
                  <th className="py-2 px-2 border-black w-24 text-center">PARAF &amp; CAP</th>
                </tr>
              </thead>
              <tbody>
                {monitoringRows.map((row) => {
                  const k = row.kunjungan;
                  const formattedTgl = k?.tanggal
                    ? new Date(k.tanggal).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <tr key={row.index} className="border-b border-black align-top">
                      <td className="py-2.5 px-1.5 border-r border-black text-center font-bold">{row.index}</td>
                      <td className="py-2.5 px-2 border-r border-black">
                        <p className="font-bold text-[10.5px] leading-tight">{row.label}</p>
                        {formattedTgl ? (
                          <p className="font-semibold text-[11px] mt-1 text-indigo-950">
                            {formattedTgl}
                            <span className="block text-[9.5px] text-gray-500 font-normal">
                              Pukul {new Date(k.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-400 mt-2 italic font-mono">Tgl: .... / .... / 20...</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-black">
                        {k?.catatan ? (
                          <div className="space-y-1.5">
                            <p className="leading-relaxed whitespace-pre-wrap">{k.catatan}</p>
                            {(k.latitude || k.foto_url) && (
                              <div className="pt-1 border-t border-dashed border-gray-300 text-[9.5px] text-gray-600 flex flex-wrap gap-x-2">
                                {k.latitude && k.longitude && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin size={9} /> GPS: {Number(k.latitude).toFixed(4)}, {Number(k.longitude).toFixed(4)}
                                  </span>
                                )}
                                {k.foto_url && (
                                  <span className="text-emerald-800 font-bold flex items-center gap-0.5">
                                    <Camera size={9} /> Foto Dokumentasi Terverifikasi
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-4 space-y-2">
                            <div className="border-b border-dotted border-gray-400 h-2" />
                            <div className="border-b border-dotted border-gray-400 h-2" />
                            <div className="border-b border-dotted border-gray-400 h-2" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-r border-black">
                        {k?.catatan_dudi ? (
                          <p className="leading-relaxed whitespace-pre-wrap">{k.catatan_dudi}</p>
                        ) : (
                          <div className="py-4 space-y-2">
                            <div className="border-b border-dotted border-gray-400 h-2" />
                            <div className="border-b border-dotted border-gray-400 h-2" />
                            <div className="border-b border-dotted border-gray-400 h-2" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-1.5 text-center align-middle">
                        <div className="h-14 flex items-center justify-center text-[9px] text-gray-400 italic">
                          (Paraf &amp; Cap DU/DI)
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 5. Catatan Kaki Otentik */}
            <p className="text-[10px] text-gray-600 mb-6 italic leading-relaxed">
              * Lembar ini wajib diisi dan diparaf oleh Pembimbing DU/DI serta Guru Pembimbing setiap kali kunjungan monitoring berlangsung sebagai bukti otentik kegiatan bimbingan PKL.
            </p>

            {/* 6. Tanda Tangan 2-Tier Standar Industri */}
            <div className="mt-6 text-black text-xs font-sans">
              {/* Baris 1: Pembimbing Industri & Guru Pembimbing */}
              <div className="flex justify-between items-start text-center">
                <div className="w-56">
                  <p className="font-medium text-gray-700 mb-0.5">Mengetahui,</p>
                  <p className="font-bold uppercase text-[11px]">{activeMitraNama}</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-[11px]">( .................................................... )</p>
                  <p className="text-[10px] text-gray-600">Pembimbing Industri / DU/DI</p>
                </div>

                <div className="w-64">
                  <p className="text-gray-700 mb-0.5">
                    {activeKota}, {activeTanggal}
                  </p>
                  <p className="font-bold uppercase text-[11px]">Guru Pembimbing PKL</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-[11px]">
                    {activePembimbingNama || '( .................................................... )'}
                  </p>
                  <p className="text-[10px] text-gray-600">Guru Pembimbing Sekolah</p>
                </div>
              </div>

              {/* Baris 2: Waka Hubungan Industri (Hubin) / Kepala Sekolah */}
              <div className="text-center mt-6 w-full flex justify-center">
                <div className="w-72">
                  <p className="font-medium text-gray-700 mb-0.5">Mengesahkan,</p>
                  <p className="font-bold uppercase text-[11px]">Waka. Bidang Hubungan Industri</p>
                  <div className="h-14" />
                  <p className="font-bold underline text-[11px]">
                    {activeHubinNama || activeKepsekNama || '( .................................................... )'}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    NIP. {activeHubinNip || activeKepsekNip || '....................................................'}
                  </p>
                </div>
              </div>
            </div>
          </PrintDocumentSheet>
        </div>

        {/* 7. Drawer Edit Penandatangan (Side Panel) */}
        <KunjunganPrintSignersDrawer
          isOpen={showTtdConfig}
          onClose={() => setShowTtdConfig(false)}
          activeKota={activeKota}
          setActiveKota={setActiveKota}
          activeTanggal={activeTanggal}
          setActiveTanggal={setActiveTanggal}
          activeMitraNama={activeMitraNama}
          setActiveMitraNama={setActiveMitraNama}
          activePembimbingNama={activePembimbingNama}
          setActivePembimbingNama={setActivePembimbingNama}
          activeHubinNama={activeHubinNama}
          setActiveHubinNama={setActiveHubinNama}
          activeHubinNip={activeHubinNip}
          setActiveHubinNip={setActiveHubinNip}
          onReset={handleResetStruktur}
        />
      </div>
    </UniversalDocumentModal>
  );
};

export default KunjunganPrintModal;
