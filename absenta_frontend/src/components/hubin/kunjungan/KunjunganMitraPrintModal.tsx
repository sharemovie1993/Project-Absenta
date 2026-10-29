import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UniversalDocumentModal, usePrintHeaderData } from '@/components/ui/PrintHeader';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { SlidersHorizontal } from 'lucide-react';
import { KunjunganPrintSignersDrawer } from './KunjunganPrintSignersDrawer';
import { KunjunganMitraPrintSheet } from './KunjunganMitraPrintSheet';
import { Button } from '@/components/ui';
import { hubinApi } from '@/api/hubin.api';
import { usePklMatriksSigners } from '../nilai-pkl/usePklMatriksSigners';
import type { MitraTargetGroup } from './types';

export interface KunjunganMitraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: MitraTargetGroup | null;
}

export const KunjunganMitraPrintModal: React.FC<KunjunganMitraPrintModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);

  // 1. Resolve Academic Year ID
  const tahunPelajaranId = useMemo(() => {
    return group?.siswaList?.[0]?.rawPkl?.tahun_pelajaran_id;
  }, [group]);

  // 2. Fetch Hubin Settings
  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', tahunPelajaranId],
    queryFn: () =>
      hubinApi.getSettings(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : undefined),
    enabled: Boolean(isOpen && group),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Kop Surat & Struktur Organisasi
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const autoSigners = usePklMatriksSigners(undefined, group?.siswaList?.[0]?.kelas);

  // 4. Extract All Recorded Visits for this Mitra Group
  const allGroupVisits = useMemo(() => {
    if (!group?.siswaList || group.siswaList.length === 0) return [];

    // Cari siswa dengan riwayat kunjungan paling lengkap
    let maxVisitsStudent = group.siswaList[0];
    let maxCount = 0;

    for (const s of group.siswaList) {
      const pkl = s.rawPkl;
      if (pkl?.kunjungan_json) {
        try {
          const list = Array.isArray(pkl.kunjungan_json)
            ? pkl.kunjungan_json
            : JSON.parse((pkl.kunjungan_json as string) || '[]');
          if (Array.isArray(list) && list.length > maxCount) {
            maxCount = list.length;
            maxVisitsStudent = s;
          }
        } catch {
          // ignore
        }
      }
    }

    try {
      const pkl = maxVisitsStudent.rawPkl;
      const list = Array.isArray(pkl?.kunjungan_json)
        ? pkl.kunjungan_json
        : JSON.parse((pkl?.kunjungan_json as string) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, [group]);

  // State Pilihan Sesi Kunjungan: angka (index kunjungan) atau 'blank' (template kosong)
  const [selectedVisitIndex, setSelectedVisitIndex] = useState<number | 'blank'>('blank');

  // Set default ke sesi kunjungan terakhir ketika modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (allGroupVisits.length > 0) {
        setSelectedVisitIndex(allGroupVisits.length - 1);
      } else {
        setSelectedVisitIndex('blank');
      }
    }
  }, [isOpen, allGroupVisits.length]);

  // 5. Resolve Visit Data for the Selected Session
  const activeVisitData = useMemo(() => {
    if (
      selectedVisitIndex === 'blank' ||
      typeof selectedVisitIndex !== 'number' ||
      !allGroupVisits[selectedVisitIndex]
    ) {
      return {
        tahap: undefined,
        tanggalFormatted: '',
        catatan: '',
        catatanDudi: '',
        fotoUrl: undefined,
        lat: undefined,
        lng: undefined,
        jurnalVerified: false,
        cycleTitle: 'Formulir Blanko Supervisi Lapangan',
      };
    }

    const v = allGroupVisits[selectedVisitIndex];
    const idx = selectedVisitIndex;
    const cycleMode = hubinSettings?.visitCycleMode || 'THREE_CYCLE';

    let cycleTitle = `Siklus Ke-${idx + 1}`;
    if (v.tahap === 'PENGANTARAN') {
      cycleTitle = 'Siklus I: Pengantaran & Penyerahan Siswa ke DU/DI';
    } else if (v.tahap === 'PENJEMPUTAN') {
      cycleTitle = 'Siklus Akhir: Penjemputan & Penarikan Resmi Siswa PKL';
    } else if (v.tahap === 'INSIDENTAL') {
      cycleTitle = 'Supervisi Khusus / Insidental';
    } else if (cycleMode === 'FOUR_CYCLE') {
      const titles = [
        'Siklus I: Monitoring Awal (Penyerahan & Orientasi DU/DI)',
        'Siklus II: Monitoring Tengah (Evaluasi Kinerja & Progres PKL)',
        'Siklus III: Monitoring Pra-Akhir (Verifikasi Jurnal & Laporan)',
        'Siklus IV: Monitoring Akhir (Evaluasi Akhir & Penjemputan)',
      ];
      cycleTitle = titles[idx] || `Siklus Ke-${idx + 1}`;
    } else if (cycleMode === 'THREE_CYCLE') {
      const titles = [
        'Siklus I: Monitoring Awal (Orientasi Siswa)',
        'Siklus II: Monitoring Tengah (Evaluasi & Kendala)',
        'Siklus III: Monitoring Akhir (Penjemputan & Penarikan)',
      ];
      cycleTitle = titles[idx] || `Siklus Ke-${idx + 1}`;
    }

    const tglFormatted = v.tanggal
      ? new Date(v.tanggal).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }) +
        ` (Pukul ${new Date(v.tanggal).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })} WIB)`
      : '';

    return {
      tahap: v.tahap,
      tanggalFormatted: tglFormatted,
      catatan: v.catatan || '',
      catatanDudi: v.catatan_dudi || '',
      fotoUrl: v.foto_url,
      lat: v.latitude,
      lng: v.longitude,
      jurnalVerified: v.jurnal_verified !== false,
      cycleTitle,
    };
  }, [allGroupVisits, selectedVisitIndex, hubinSettings]);

  // Helper Label untuk Dropdown Pilihan Kunjungan
  const getStageOptionLabel = (v: any, idx: number) => {
    const dateStr = v.tanggal
      ? new Date(v.tanggal).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';
    const stageName =
      v.tahap === 'PENGANTARAN'
        ? 'Pengantaran & Penyerahan'
        : v.tahap === 'PENJEMPUTAN'
        ? 'Penjemputan & Penarikan'
        : v.tahap === 'INSIDENTAL'
        ? 'Kunjungan Khusus'
        : 'Monitoring Berkala';

    return `Sesi ${idx + 1}: ${stageName}${dateStr ? ` • ${dateStr}` : ''}`;
  };

  // Signers Default Resolution
  const resolvedSigners = useMemo(() => {
    const hubinNama = autoSigners?.wakasekHubin?.isAssigned ? autoSigners.wakasekHubin.nama : '';
    const hubinNip =
      autoSigners?.wakasekHubin?.nip && autoSigners.wakasekHubin.nip !== '-'
        ? autoSigners.wakasekHubin.nip
        : '';

    const firstStudent = group?.siswaList?.[0];
    const pembimbingNama = firstStudent?.pembimbing_nama || '';
    const kota = (rawSekolah as any)?.kota || (tenantInfo as any)?.city || 'Bandung';
    const tanggal = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      mitraNama: group?.nama_mitra ? `Pembimbing DU/DI ${group.nama_mitra}` : 'Pembimbing Industri DU/DI',
      pembimbingNama,
      hubinNama,
      hubinNip,
      kota,
      tanggal,
    };
  }, [autoSigners, rawSekolah, tenantInfo, group]);

  // Customizable Signers States
  const [activeMitraNama, setActiveMitraNama] = useState('');
  const [activePembimbingNama, setActivePembimbingNama] = useState('');
  const [activeHubinNama, setActiveHubinNama] = useState('');
  const [activeHubinNip, setActiveHubinNip] = useState('');
  const [activeKota, setActiveKota] = useState('');
  const [activeTanggal, setActiveTanggal] = useState('');

  useEffect(() => {
    setActiveMitraNama(resolvedSigners.mitraNama);
    setActivePembimbingNama(resolvedSigners.pembimbingNama);
    setActiveHubinNama(resolvedSigners.hubinNama);
    setActiveHubinNip(resolvedSigners.hubinNip);
    setActiveKota(resolvedSigners.kota);
    setActiveTanggal(resolvedSigners.tanggal);
  }, [resolvedSigners]);

  const handleResetStruktur = useCallback(() => {
    setActiveMitraNama(resolvedSigners.mitraNama);
    setActivePembimbingNama(resolvedSigners.pembimbingNama);
    setActiveHubinNama(resolvedSigners.hubinNama);
    setActiveHubinNip(resolvedSigners.hubinNip);
    setActiveKota(resolvedSigners.kota);
    setActiveTanggal(resolvedSigners.tanggal);
    toast.success('Penandatangan direset sesuai hierarki struktur database.');
  }, [resolvedSigners]);

  if (!isOpen || !group) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    toast.loading('Sedang merender PDF Berita Acara...', { id: 'pdf-mitra' });

    const deskCanvas = document.getElementById('print-desk-canvas-area');
    if (deskCanvas) deskCanvas.style.zoom = '1';

    try {
      const sheetElement = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheetElement) {
        window.print();
        toast.dismiss('pdf-mitra');
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

      const safeName = (group.nama_mitra || 'Mitra').replace(/\s+/g, '_');
      const stageTag = activeVisitData.tahap ? `_${activeVisitData.tahap}` : '';
      pdf.save(`BERITA_ACARA${stageTag}_${safeName}.pdf`);
      toast.success('Dokumen Berita Acara PDF berhasil diunduh!', { id: 'pdf-mitra' });
    } catch {
      toast.error('Gagal membuat dokumen PDF', { id: 'pdf-mitra' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Berita Acara Supervisi PKL (Kolektif Mitra)"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Mitra:</span>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">
            {group.nama_mitra}
          </span>
          <span className="text-xs text-slate-500">• {group.siswaList.length} Siswa Bimbingan</span>
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
          {/* Dropdown Pemilih Sesi Berita Acara (Bebas Cetak Ulang Kapan Saja) */}
          <select
            value={selectedVisitIndex}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedVisitIndex(val === 'blank' ? 'blank' : Number(val));
            }}
            className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold h-9 shadow-2xs cursor-pointer max-w-[260px] sm:max-w-[340px]"
            title="Pilih Sesi Berita Acara yang Ingin Dicetak"
          >
            {allGroupVisits.length > 0 ? (
              allGroupVisits.map((v, idx) => (
                <option key={idx} value={idx}>
                  {getStageOptionLabel(v, idx)}
                  {idx === allGroupVisits.length - 1 ? ' ★ (Terbaru)' : ''}
                </option>
              ))
            ) : (
              <option value="blank" disabled>
                Belum ada riwayat kunjungan tercatat
              </option>
            )}
            <option value="blank">📄 Template Formulir Kosong (Isi Manual Tangan)</option>
          </select>

          <Button
            type="button"
            size="sm"
            variant={showTtdConfig ? 'primary' : 'outline'}
            onClick={() => setShowTtdConfig((v) => !v)}
            className="text-xs font-bold rounded-xl h-9 gap-1.5 shrink-0"
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
          <KunjunganMitraPrintSheet
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
            tenantInfo={tenantInfo}
            rawSekolah={rawSekolah}
            group={group}
            cycleTitle={activeVisitData.cycleTitle}
            tahap={activeVisitData.tahap}
            visitDateFormatted={activeVisitData.tanggalFormatted}
            visitCatatan={activeVisitData.catatan}
            visitCatatanDudi={activeVisitData.catatanDudi}
            visitFotoUrl={activeVisitData.fotoUrl}
            visitLat={activeVisitData.lat}
            visitLng={activeVisitData.lng}
            visitJurnalVerified={activeVisitData.jurnalVerified}
            hubinSettings={hubinSettings}
            activeMitraNama={activeMitraNama}
            activePembimbingNama={activePembimbingNama}
            activeHubinNama={activeHubinNama}
            activeHubinNip={activeHubinNip}
            activeKota={activeKota}
            activeTanggal={activeTanggal}
          />
        </div>

        {/* Drawer Edit Penandatangan */}
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

export default KunjunganMitraPrintModal;
