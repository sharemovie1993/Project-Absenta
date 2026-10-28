import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UniversalDocumentModal, usePrintHeaderData } from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { SlidersHorizontal } from 'lucide-react';
import { KunjunganPrintSignersDrawer } from './KunjunganPrintSignersDrawer';
import { KunjunganPrintSheet, type MonitoringRow } from './KunjunganPrintSheet';
import { Button } from '@/components/ui';
import { hubinApi, type SiswaPkl } from '@/api/hubin.api';
import { usePklMatriksSigners } from '../nilai-pkl/usePklMatriksSigners';

export type MonitoringCyclePattern = 'hubin_policy' | 'standard_3' | 'standard_4' | 'recorded_only' | 'monthly';

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
  const [cyclePattern, setCyclePattern] = useState<MonitoringCyclePattern>('hubin_policy');
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);

  // 1. Fetch Hubin Visit Cycle Policy & Settings for this Academic Year
  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', selectedPkl?.tahun_pelajaran_id],
    queryFn: () =>
      hubinApi.getSettings(
        selectedPkl?.tahun_pelajaran_id ? { tahun_pelajaran_id: selectedPkl.tahun_pelajaran_id } : undefined
      ),
    enabled: Boolean(isOpen && selectedPkl),
    staleTime: 5 * 60 * 1000,
  });

  // 2. SSOT Kop Surat Dinas & Sekolah
  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  // 3. SSOT Struktur Organisasi (Waka Hubin & Kepala Sekolah)
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

  // Compute Monitoring Table Rows respecting Hubin Policy
  const monitoringRows = useMemo<MonitoringRow[]>(() => {
    if (!selectedPkl) return [];

    let effectiveMode: 'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM' = 'THREE_CYCLE';
    let targetCount = 3;

    if (cyclePattern === 'hubin_policy') {
      effectiveMode = hubinSettings?.visitCycleMode || 'THREE_CYCLE';
      targetCount = hubinSettings?.visitCycleTarget || (effectiveMode === 'FOUR_CYCLE' ? 4 : 3);
    } else if (cyclePattern === 'standard_4') {
      effectiveMode = 'FOUR_CYCLE';
      targetCount = 4;
    } else if (cyclePattern === 'standard_3') {
      effectiveMode = 'THREE_CYCLE';
      targetCount = 3;
    } else if (cyclePattern === 'recorded_only') {
      targetCount = Math.max(1, rawKunjunganList.length);
    } else if (cyclePattern === 'monthly') {
      if (selectedPkl.tanggal_mulai && selectedPkl.tanggal_selesai) {
        const start = new Date(selectedPkl.tanggal_mulai);
        const end = new Date(selectedPkl.tanggal_selesai);
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        targetCount = Math.max(1, Math.min(6, diffMonths));
      }
    }

    const rows: MonitoringRow[] = [];
    for (let i = 0; i < targetCount; i++) {
      const k = rawKunjunganList[i] || null;
      let label = `Kunjungan Ke-${i + 1}`;

      if (cyclePattern === 'hubin_policy' || cyclePattern === 'standard_4' || cyclePattern === 'standard_3') {
        if (effectiveMode === 'FOUR_CYCLE') {
          const fourTitles = [
            'Siklus I: Monitoring Awal (Penyerahan & Orientasi DU/DI)',
            'Siklus II: Monitoring Tengah (Evaluasi Kinerja & Progres PKL)',
            'Siklus III: Monitoring Pra-Akhir (Verifikasi Jurnal & Laporan)',
            'Siklus IV: Monitoring Akhir (Evaluasi Akhir & Penjemputan Siswa)',
          ];
          label = fourTitles[i] || `Siklus ${i + 1}: Supervisi Lanjutan`;
        } else if (effectiveMode === 'THREE_CYCLE') {
          const threeTitles = [
            'Siklus I: Monitoring Awal (Orientasi Siswa)',
            'Siklus II: Monitoring Tengah (Evaluasi & Kendala)',
            'Siklus III: Monitoring Akhir (Penjemputan & Penarikan)',
          ];
          label = threeTitles[i] || `Siklus ${i + 1}: Supervisi Lanjutan`;
        } else {
          label = `Siklus Ke-${i + 1}: Supervisi Terjadwal`;
        }
      } else if (cyclePattern === 'monthly') {
        label = `Monitoring Bulan Ke-${i + 1}`;
      }
      rows.push({ index: i + 1, label, kunjungan: k });
    }
    return rows;
  }, [selectedPkl, cyclePattern, rawKunjunganList, hubinSettings]);

  if (!isOpen || !selectedPkl) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    toast.loading('Sedang merender PDF True WYSIWYG...', { id: 'pdf-render' });

    const deskCanvas = document.getElementById('print-desk-canvas-area');
    if (deskCanvas) deskCanvas.style.zoom = '1';

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
            className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium h-9 max-w-[260px] truncate"
            title="Pola Baris Siklus Kunjungan"
          >
            <option value="hubin_policy">
              Kebijakan Hubin ({hubinSettings?.visitCycleMode === 'FOUR_CYCLE' ? '4 Siklus Vokasi' : hubinSettings?.visitCycleMode === 'CUSTOM' ? `${hubinSettings.visitCycleTarget} Siklus` : '3 Siklus Standar'})
            </option>
            <option value="standard_3">Pola Standar 3 Siklus (Awal, Tengah, Akhir)</option>
            <option value="standard_4">Pola 4 Siklus Intensif Vokasi</option>
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
          <KunjunganPrintSheet
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
            tenantInfo={tenantInfo}
            rawSekolah={rawSekolah}
            selectedPkl={selectedPkl}
            monitoringRows={monitoringRows}
            hubinSettings={hubinSettings}
            tglMulai={tglMulai}
            tglSelesai={tglSelesai}
            activeMitraNama={activeMitraNama}
            activePembimbingNama={activePembimbingNama}
            activeHubinNama={activeHubinNama}
            activeHubinNip={activeHubinNip}
            activeKepsekNama={activeKepsekNama}
            activeKepsekNip={activeKepsekNip}
            activeKota={activeKota}
            activeTanggal={activeTanggal}
          />
        </div>

        {/* Drawer Edit Penandatangan (Side Panel) */}
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
