import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Printer, Download, Filter, BookOpen, User, School, CheckCircle2, Calendar, Sparkles } from 'lucide-react';
import { Button } from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { cn } from '../../../lib/utils';
import { generateGenericPdf } from '../../../utils/print/pdfGeneric';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { getJadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { useGuruOptions, useMapelOptions, useKelasOptions, useTahunPelajaranOptions, useSemesterOptions } from '../../common';
import { useTenantSettings } from '../../../hooks/useTenantSettings';
import { useJadwalKegiatan } from '../../../hooks/attendance/useJadwalKegiatan';
import { WORKDAYS_HARI_KEYS, getDayLabel } from '../../../constants/day.constants';
import { getMapelAbbreviation } from '../../../utils/mapelColorHelper';
import { toast } from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'KELAS' | 'GURU';
  initialKelasId?: string;
  initialGuruId?: string;
}

const SLOT_TIME_MAP: Record<number, { start: string; end: string }> = {
  0: { start: "06:30", end: "07:00" },
  1: { start: "07:00", end: "07:45" },
  2: { start: "07:45", end: "08:30" },
  3: { start: "08:30", end: "09:15" },
  4: { start: "09:35", end: "10:20" },
  5: { start: "10:20", end: "11:05" },
  6: { start: "11:05", end: "11:50" },
  7: { start: "12:30", end: "13:15" },
  8: { start: "13:15", end: "14:00" },
  9: { start: "14:00", end: "14:45" },
  10: { start: "14:45", end: "15:30" },
  11: { start: "15:30", end: "16:15" },
  12: { start: "16:15", end: "17:00" },
};

export const JadwalPrintPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialMode = 'KELAS',
  initialKelasId = '',
  initialGuruId = '',
}) => {
  const [mode, setMode] = useState<'KELAS' | 'GURU'>(initialMode);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(initialKelasId);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(initialGuruId);
  const [fokusMapelId, setFokusMapelId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // ── 1. Reference Data Hooks (Google/Absenta Enterprise Standard) ───────────
  const { tenant, printHeader, shiftSlots } = useTenantSettings();
  const { options: kelasSelectOptions, rawList: kelasRawList } = useKelasOptions();
  const { rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { options: mapelSelectOptions, rawList: mapelRawList } = useMapelOptions();
  const { activeTahunPelajaran, rawList: tpRawList } = useTahunPelajaranOptions();
  const { activeSemester, rawList: semRawList } = useSemesterOptions({ tahunPelajaranId: activeTahunPelajaran?.id });

  // School Profile Hook
  const { data: sekolahProfileRes } = useQuery({
    queryKey: ['sekolah-profile-preview-modal'],
    queryFn: () => sekolahApi.getProfile().catch(() => null),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const getSlotTime = (slotIndex: number) => {
    if (shiftSlots && shiftSlots[slotIndex]) {
      return shiftSlots[slotIndex];
    }
    return SLOT_TIME_MAP[slotIndex] || { start: "07:00", end: "07:45" };
  };

  // Dynamic Hari Sekolah List from Tenant Config or Centralized Constants
  const activeHariSekolah = useMemo(() => {
    if (tenant && Array.isArray(tenant.hari_sekolah) && tenant.hari_sekolah.length > 0) {
      const order = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
      return [...tenant.hari_sekolah].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }
    return WORKDAYS_HARI_KEYS;
  }, [tenant]);

  // Dynamic Slots Array: Always Includes Slot 0 (Kesiswaan) + 12 KBM Slots
  const activeSlots = useMemo(() => {
    const kbmSlots = Array.from({ length: 12 }, (_, i) => i + 1);
    if (tenant?.shift_jam_pelajaran?.shifts?.[0]?.slots?.length) {
      const tenantSlots = tenant.shift_jam_pelajaran.shifts[0].slots.map(s => Number(s.slot));
      return Array.from(new Set([0, ...tenantSlots, ...kbmSlots])).sort((a, b) => a - b);
    }
    return [0, ...kbmSlots];
  }, [tenant]);

  // Auto Select Defaults if Empty
  React.useEffect(() => {
    if (isOpen) {
      if (!selectedKelasId && kelasRawList && kelasRawList.length > 0) {
        setSelectedKelasId(kelasRawList[0].id);
      }
      if (!selectedGuruId && guruRawList && guruRawList.length > 0) {
        setSelectedGuruId(guruRawList[0].id);
      }
    }
  }, [isOpen, kelasRawList, guruRawList, selectedKelasId, selectedGuruId]);

  // ── 2. Real-Time Reactive Schedule Fetching Hook ───────────────────────────
  const { data: jadwalRes, isLoading: loadingJadwal } = useQuery({
    queryKey: ['jadwal-kbm-preview-query', mode, selectedKelasId, selectedGuruId, activeTahunPelajaran?.id, activeSemester?.id],
    queryFn: () => {
      if (!activeTahunPelajaran?.id || !activeSemester?.id) return { data: [] };
      return getJadwalKBM({
        kelas_id: mode === 'KELAS' ? selectedKelasId : undefined,
        guru_id: mode === 'GURU' ? selectedGuruId : undefined,
        tahun_pelajaran_id: activeTahunPelajaran.id,
        semester_id: activeSemester.id,
      }).catch(() => ({ data: [] }));
    },
    enabled: isOpen && !!activeTahunPelajaran?.id && !!activeSemester?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { pembiasaanList } = useJadwalKegiatan({ aktif: true });

  const pembiasaanJadwalItems = useMemo(() => {
    if (!pembiasaanList || pembiasaanList.length === 0) return [];
    
    const items: any[] = [];
    const parseArr = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return field.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    pembiasaanList.forEach((keg: any) => {
      const days = parseArr(keg.hari);
      const targetKelasIds = parseArr(keg.target_kelas_ids);
      const isTargetAll = keg.target_semua_kelas || !targetKelasIds || targetKelasIds.length === 0;

      const activeClassIds = isTargetAll
        ? (kelasRawList && kelasRawList.length > 0 ? kelasRawList.map(k => k.id) : (selectedKelasId ? [selectedKelasId] : []))
        : targetKelasIds;

      const mapelNama = keg.nama ? (keg.nama.toUpperCase().startsWith('PEMBIASAAN') ? keg.nama.toUpperCase() : `PEMBIASAAN ${keg.nama.toUpperCase()}`) : 'PEMBIASAAN';

      days.forEach(dayStr => {
        const upperDay = dayStr.toUpperCase();

        activeClassIds.forEach(kId => {
          items.push({
            id: `pembiasaan-${keg.id}-${upperDay}-${kId}`,
            tenant_id: keg.tenant_id,
            tahun_pelajaran_id: activeTahunPelajaran?.id || '',
            semester_id: activeSemester?.id || '',
            kelas_id: kId,
            guru_id: selectedGuruId || 'all',
            hari: upperDay,
            slot_index: 0,
            jam_mulai: keg.waktu_mulai || '06:30',
            jam_selesai: keg.waktu_selesai || '07:00',
            jenis_kegiatan: 'PEMBIASAAN',
            is_locked: true,
            is_pembiasaan: true,
            target_semua_kelas: keg.target_semua_kelas,
            Mapel: { id: `mapel-pembiasaan-${keg.id}`, nama_mapel: mapelNama, kode_mapel: 'PEMBIASAAN' },
            Kelas: { id: kId, nama_kelas: 'Seluruh Kelas' },
            Guru: undefined
          });
        });
      });
    });

    return items;
  }, [pembiasaanList, kelasRawList, activeTahunPelajaran, activeSemester, selectedKelasId, selectedGuruId]);

  const rawJadwalList = useMemo(() => {
    const apiData = Array.isArray(jadwalRes)
      ? jadwalRes
      : (Array.isArray((jadwalRes as any)?.data) ? (jadwalRes as any).data : []);
    return apiData;
  }, [jadwalRes]);

  const jadwalList = useMemo(() => {
    return [...rawJadwalList, ...pembiasaanJadwalItems];
  }, [rawJadwalList, pembiasaanJadwalItems]);

  // Dynamic Options Formatting
  const kelasOptionsFormatted = useMemo(() => {
    return (kelasRawList || []).map((k: any) => ({
      label: k.nama_kelas,
      value: k.id,
    }));
  }, [kelasRawList]);

  const guruOptionsFormatted = useMemo(() => {
    return (guruRawList || []).map((g: any) => ({
      label: g.nama_guru,
      value: g.id,
    }));
  }, [guruRawList]);

  const mapelOptionsFormatted = useMemo(() => {
    const list = [{ label: '✨ Semua Mata Pelajaran', value: '' }];
    (mapelRawList || []).forEach((m: any) => {
      list.push({
        label: m.nama_mapel,
        value: m.id,
      });
    });
    return list;
  }, [mapelRawList]);

  // Current entity metadata
  const currentKelas = useMemo(() => {
    return (kelasRawList || []).find((k: any) => k.id === selectedKelasId);
  }, [kelasRawList, selectedKelasId]);

  const currentGuru = useMemo(() => {
    return (guruRawList || []).find((g: any) => g.id === selectedGuruId);
  }, [guruRawList, selectedGuruId]);

  // Filtered schedules for grid preview
  const previewJadwalMap = useMemo(() => {
    const map = new Map<string, any>();
    (jadwalList || []).forEach((j: any) => {
      if (j.is_pembiasaan || j.jenis_kegiatan === 'PEMBIASAAN' || Number(j.slot_index) === 0) {
        if (!map.has(`${j.hari}-0`)) {
          map.set(`${j.hari}-0`, j);
        }
      } else if (mode === 'KELAS' && selectedKelasId && j.kelas_id === selectedKelasId) {
        map.set(`${j.hari}-${j.slot_index}`, j);
      } else if (mode === 'GURU' && selectedGuruId && j.guru_id === selectedGuruId) {
        map.set(`${j.hari}-${j.slot_index}`, j);
      }
    });
    return map;
  }, [jadwalList, mode, selectedKelasId, selectedGuruId]);

  // Calculate total JP for current view
  const totalJpCount = useMemo(() => {
    let count = 0;
    previewJadwalMap.forEach((j) => {
      if (!fokusMapelId || j.mapel_id === fokusMapelId) {
        count++;
      }
    });
    return count;
  }, [previewJadwalMap, fokusMapelId]);

  if (!isOpen) return null;

  // Handle direct window print
  const handleDirectPrint = () => {
    window.print();
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading('Menyiapkan file PDF pratinjau...');
    try {
      const blob = await generateGenericPdf({
        module: 'kurikulum',
        printType: mode === 'GURU' ? 'roster_teacher' : 'roster',
        selectedClassId: mode === 'KELAS' ? selectedKelasId : 'all',
        selectedGuruId: mode === 'GURU' ? selectedGuruId : 'all',
        sekolah: sekolahProfileRes,
        tenantInfo: sekolahProfileRes,
        strukturList: [],
        logoDaerahBase64: null,
        logoSekolahBase64: null,
        includeSchoolLogo: true,
        filterData: {
          jadwalList,
          classes: kelasRawList || [],
          gurus: guruRawList || [],
        }
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const title = mode === 'KELAS' 
        ? `Jadwal_Kelas_${currentKelas?.nama_kelas || 'Selected'}` 
        : `Jadwal_Guru_${currentGuru?.nama_guru || 'Selected'}`;
      link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('File PDF berhasil diunduh!');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.dismiss(toastId);
      toast.error('Gagal mengunduh file PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header (Google Enterprise Style) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold shadow-sm">
              🖨️
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-2">
                Pratinjau Cetak & Dokumen PDF Jadwal Pelajaran
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 font-extrabold border border-indigo-200 dark:border-indigo-800">
                  Google Standard
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                Format resmi siap cetak printer & diunduh sebagai dokumen PDF
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300/60 dark:border-slate-750">
              <button
                onClick={() => setMode('KELAS')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all',
                  mode === 'KELAS'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <School size={14} />
                <span>Cetak Per Kelas</span>
              </button>
              <button
                onClick={() => setMode('GURU')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all',
                  mode === 'GURU'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <User size={14} />
                <span>Cetak Per Guru</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDirectPrint}
                className="flex items-center gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl"
              >
                <Printer size={14} />
                <span>Cetak Printer</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md rounded-xl"
              >
                <Download size={14} />
                <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh File PDF'}</span>
              </Button>
            </div>
          </div>

          {/* Sub Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Entity Selector */}
            {mode === 'KELAS' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <School size={12} className="text-indigo-500" />
                  <span>Pilih Kelas Cetak:</span>
                </label>
                <SearchableSelect
                  value={selectedKelasId}
                  onValueChange={setSelectedKelasId}
                  options={kelasOptionsFormatted}
                  placeholder="Pilih Kelas..."
                  className="w-full"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <User size={12} className="text-indigo-500" />
                  <span>Pilih Guru Cetak:</span>
                </label>
                <SearchableSelect
                  value={selectedGuruId}
                  onValueChange={setSelectedGuruId}
                  options={guruOptionsFormatted}
                  placeholder="Pilih Guru..."
                  className="w-full"
                />
              </div>
            )}

            {/* Filter Fokus Mapel */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <BookOpen size={12} className="text-amber-500" />
                <span>🎯 Filter Fokus Mapel:</span>
              </label>
              <SearchableSelect
                value={fokusMapelId}
                onValueChange={setFokusMapelId}
                options={mapelOptionsFormatted}
                placeholder="Semua Mapel..."
                className="w-full"
              />
            </div>

            {/* JP Summary Pill */}
            <div className="space-y-1 flex flex-col justify-end">
              <div className="p-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Total Alokasi Terpasang:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                  {totalJpCount} JP / Minggu
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Printable Document Preview Paper (Standard A4 Landscape Canvas 297mm x 210mm) */}
        <div className="flex-1 p-4 sm:p-8 overflow-auto bg-slate-200/70 dark:bg-slate-950 flex justify-center">
          <div
            ref={printAreaRef}
            className="w-[1123px] min-w-[1123px] min-h-[794px] bg-white text-slate-900 p-8 shadow-2xl border border-slate-300 space-y-5 rounded-none print:w-full print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Kop Sekolah Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {printHeader.logo || sekolahProfileRes?.logo_url ? (
                  <img src={printHeader.logo || sekolahProfileRes?.logo_url} alt="Logo" className="w-14 h-14 object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-indigo-600 text-white font-black text-xl rounded-2xl flex items-center justify-center shadow-md">
                    A
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-900 leading-tight">
                    {printHeader.sekolah || sekolahProfileRes?.nama_sekolah || tenant?.name || 'SEKOLAH ABSENTA ACADEMY'}
                  </h2>
                  <p className="text-[11px] text-slate-600 font-semibold leading-tight">
                    {tenant?.address || sekolahProfileRes?.alamat || 'Jl. Pendidikan No. 100, Indonesia'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Tahun Pelajaran: {activeTahunPelajaran?.nama_tahun || '2026/2027'} | Semester: {activeSemester?.nama_semester || 'Ganjil'}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center space-y-1">
              <h1 className="text-base font-black uppercase tracking-widest text-slate-900">
                {mode === 'KELAS'
                  ? `JADWAL PELAJARAN KELAS ${currentKelas?.nama_kelas || '...'}`
                  : `JADWAL MENGAJAR GURU: ${currentGuru?.nama_guru || '...'}`}
              </h1>
              {fokusMapelId && (
                <div className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-0.5 rounded-full border border-amber-300">
                  🎯 FOKUS MAPEL: {(mapelRawList || []).find((m: any) => m.id === fokusMapelId)?.nama_mapel || 'Mapel Terpilih'}
                </div>
              )}
            </div>

            {/* Main Timetable Grid Table (Top Horizontal Header: JAM, Left Vertical Column: HARI) */}
            <div className="overflow-x-auto border border-slate-900 rounded-xl overflow-hidden">
              <table className="w-full text-center border-collapse text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-black text-[10px] uppercase">
                    <th className="p-2 border-r border-slate-900 w-24 bg-slate-200/80">HARI / WAKTU</th>
                    {activeSlots.map((slotIndex) => {
                      const slotTime = getSlotTime(slotIndex);
                      const isSlotZero = slotIndex === 0;
                      return (
                        <th
                          key={slotIndex}
                          className={cn(
                            "p-1.5 border-r last:border-r-0 border-slate-900 min-w-[115px]",
                            isSlotZero ? "bg-amber-100/90 text-amber-900" : ""
                          )}
                        >
                          <div className={cn("font-black text-[10.5px]", isSlotZero ? "text-amber-900 uppercase" : "text-indigo-700")}>
                            {isSlotZero ? 'JAM 0 (KESISWAAN)' : `JAM ${slotIndex}`}
                          </div>
                          <div className="text-[8.5px] font-bold text-slate-600 font-mono">{slotTime.start} - {slotTime.end}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeHariSekolah.map((h) => (
                    <tr key={h} className="hover:bg-slate-50">
                      {/* Left Vertical Column: Day Name */}
                      <td className="p-2 border-r border-slate-900 font-black text-xs bg-slate-100/70 text-slate-900 tracking-wider uppercase">
                        {getDayLabel(h, h)}
                      </td>

                      {/* Horizontal Slot Cells for this Day */}
                      {activeSlots.map((slotIndex) => {
                        const slotTime = getSlotTime(slotIndex);
                        const item = previewJadwalMap.get(`${h}-${slotIndex}`);
                        const isFocused = !fokusMapelId || (item && item.mapel_id === fokusMapelId);

                        if (!item) {
                          return (
                            <td key={`${h}-${slotIndex}`} className="p-1.5 border-r last:border-r-0 border-slate-300 text-slate-300 text-[9px]">
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`${h}-${slotIndex}`}
                            className={cn(
                              'p-2 border-r last:border-r-0 border-slate-400 transition-all text-center align-middle',
                              slotIndex === 0 ? 'bg-amber-50/80' : isFocused ? 'bg-indigo-50/50' : 'opacity-30 bg-slate-100/50'
                            )}
                          >
                            {slotIndex === 0 ? (
                              <div className="space-y-0.5">
                                <div className="font-black text-[10px] text-amber-900 uppercase leading-tight">
                                  {item.Mapel?.nama_mapel || item.nama || item.jenis_kegiatan || 'PEMBIASAAN'}
                                </div>
                                <div className="text-[8.5px] font-bold text-amber-700/80">
                                  [Kesiswaan]
                                </div>
                              </div>
                            ) : mode === 'KELAS' ? (
                              <div className="space-y-1">
                                <div className="font-black text-[11px] text-slate-900 leading-tight">
                                  {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                                </div>
                                <div className="text-[9.5px] text-slate-700 font-bold leading-tight">
                                  {item.Guru?.nama_guru || item.Guru?.User?.full_name || 'Guru KBM'}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-black text-[11px] text-indigo-700 leading-tight">
                                  {item.Kelas?.nama_kelas || 'Kelas KBM'}
                                </div>
                                <div className="text-[9.5px] text-slate-800 font-bold leading-tight">
                                  {getMapelAbbreviation(item.Mapel?.nama_mapel || item.Guru?.nama_guru || item.Guru?.User?.full_name || item.jenis_kegiatan)}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legal Signatures / Approval Block */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs font-semibold text-slate-800">
              <div>
                <p className="text-[10px] text-slate-500">Mengetahui,</p>
                <p className="font-bold">Wakasek Kurikulum</p>
                <div className="h-14"></div>
                <p className="font-black underline">( .................................................. )</p>
                <p className="text-[10px] text-slate-500">NIP. -</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500">
                  {sekolahProfileRes?.kota || 'Kabupaten'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="font-bold">
                  {mode === 'KELAS' ? 'Wali Kelas' : 'Kepala Sekolah'}
                </p>
                <div className="h-14"></div>
                <p className="font-black underline">( .................................................. )</p>
                <p className="text-[10px] text-slate-500">NIP. -</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
