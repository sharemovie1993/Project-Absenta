import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge, SearchableSelect, ConfirmDialog } from '../ui';
import { 
  Calendar, 
  User, 
  Users,
  BookOpen, 
  Paintbrush, 
  Eraser, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Search, 
  HelpCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getJadwalKBM, 
  createJadwalKBM, 
  deleteJadwalKBM,
  clearJadwalKBM,
  type JadwalKBM 
} from '../../api/attendance/jadwalKBM.api';
import { useJadwalKegiatan } from '../../hooks/attendance/useJadwalKegiatan';
import { getMapelColor } from '../../utils/mapelColorHelper';
import { listGuruMapel } from '../../api/kurikulum/guru-mapel.api';
import { type DropdownOption } from '../../api/dropdown.api';
import { getMyTenant } from '../../api/tenants.api';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { kurikulumApi } from '../../api/kurikulum.api';
import { useGuruOptions, useMapelOptions, useKelasOptions } from '../common';
import { ViewMode, ToolMode, JadwalBuilderProps } from './jadwal-builder/types';
import { JadwalBuilderHeader } from './jadwal-builder/JadwalBuilderHeader';
import { SingleGridTimetable } from './jadwal-builder/SingleGridTimetable';
import { MasterGridGuruTimetable } from './jadwal-builder/MasterGridGuruTimetable';
import { MasterGridKelasTimetable } from './jadwal-builder/MasterGridKelasTimetable';
import { BebanGuruSummaryModal } from './jadwal-builder/BebanGuruSummaryModal';
import { calculateSmartJpStatus, calculateClassJpStatus } from './jadwal-builder/jpCalculationHelper';
import { getSlotsForDay } from './jam-kbm/JamKBMTypes';

import { WORKDAYS_HARI_KEYS as DAYS } from '../../constants/day.constants';
const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Standard slot times
const SLOT_TIME: Record<number, { start: string; end: string }> = {
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

export const JadwalBuilder: React.FC<JadwalBuilderProps> = ({
  tahunPelajaranId,
  semesterId,
  readOnly = false,
  onRefresh,
  initialViewMode = 'GURU',
  initialKelasId,
  initialGuruId,
  selectedGuruId: propSelectedGuruId,
  setSelectedGuruId: propSetSelectedGuruId,
  selectedKelasId: propSelectedKelasId,
  setSelectedKelasId: propSetSelectedKelasId,
  onOpenPrintPreview,
}) => {
  const queryClient = useQueryClient();

  const invalidateJadwalBuilderCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all-builder'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
    queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
    queryClient.invalidateQueries({ queryKey: ['bebanGuru'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-config'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
  }, [queryClient]);

  // Mode state
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode);
  const [gridOrientation, setGridOrientation] = useState<GridOrientation>('VERTICAL_HARI');
  const [masterGridHari, setMasterGridHari] = useState<string>('SENIN');
  const [toolMode, setToolMode] = useState<ToolMode>('PAINT');
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(false);
  const [colorByMode, setColorByMode] = useState<ColorByMode>('MAPEL');

  const setViewMode = (m: ViewMode) => {
    setViewModeState(m);
    setShowLeftPanel(false);
  };
  
  // Selections
  const [internalSelectedKelasId, setInternalSelectedKelasId] = useState<string>(initialKelasId || '');
  const [internalSelectedGuruId, setInternalSelectedGuruId] = useState<string>(initialGuruId || '');

  const selectedKelasId = propSelectedKelasId !== undefined ? propSelectedKelasId : internalSelectedKelasId;
  const setSelectedKelasId = propSetSelectedKelasId || setInternalSelectedKelasId;

  const selectedGuruId = propSelectedGuruId !== undefined ? propSelectedGuruId : internalSelectedGuruId;
  const setSelectedGuruId = propSetSelectedGuruId || setInternalSelectedGuruId;
  
  // Paint payload
  const [paintMapelId, setPaintMapelId] = useState<string>('');
  const [paintGuruId, setPaintGuruId] = useState<string>('');

  // ── Reference Options Hooks ──────────────────────────────────────────────
  const { options: kelasSelectOptions, rawList: kelasRawList } = useKelasOptions();
  const { rawList: guruRawList } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { rawList: mapelRawList } = useMapelOptions();



  const { data: allGuruMapelRes } = useQuery({
    queryKey: ['guru-mapel-all-builder', tahunPelajaranId, semesterId],
    queryFn: () => (tahunPelajaranId && semesterId) ? listGuruMapel({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId
    }).catch(() => null) : listGuruMapel().catch(() => null),
    enabled: !!tahunPelajaranId && !!semesterId,
    staleTime: 5 * 60 * 1000,
  });

  const assignedGuruIds = useMemo(() => {
    if (allGuruMapelRes?.success && Array.isArray(allGuruMapelRes.data)) {
      return new Set(allGuruMapelRes.data.map(gm => gm.guru_id));
    }
    return null;
  }, [allGuruMapelRes]);

  const guruList = useMemo(() => {
    let list = (guruRawList || []).slice();
    if (assignedGuruIds !== null && assignedGuruIds.size > 0) {
      list = list.filter(g => assignedGuruIds.has(g.id));
    }
    return list.sort((a, b) => (a.nama_guru || '').localeCompare(b.nama_guru || ''));
  }, [guruRawList, assignedGuruIds]);

  const mapelList = useMemo(() => {
    return (mapelRawList || []).slice().sort((a, b) => (a.nama_mapel || '').localeCompare(b.nama_mapel || ''));
  }, [mapelRawList]);

  useEffect(() => {
    if (guruList.length > 0 && !selectedGuruId) {
      setSelectedGuruId(guruList[0].id);
    }
  }, [guruList, selectedGuruId]);

  // ── useQuery: All Schedules for real-time conflict checking ───────────────
  const { data: schedulesRes, isLoading: loadingData, refetch: fetchSchedules } = useQuery({
    queryKey: ['jadwal-kbm-all-builder', tahunPelajaranId, semesterId, selectedGuruId, selectedKelasId, viewMode],
    queryFn: () => {
      if (!tahunPelajaranId || !semesterId) return null;
      const params: any = {
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      };
      if (viewMode === 'GURU' && selectedGuruId) {
        params.guru_id = selectedGuruId;
      } else if (viewMode === 'KELAS' && selectedKelasId) {
        params.kelas_id = selectedKelasId;
      }
      return getJadwalKBM(params).catch(() => null);
    },
    enabled: !!tahunPelajaranId && !!semesterId,
    staleTime: 0,
  });

  const [localJadwal, setLocalJadwal] = useState<JadwalKBM[]>([]);

  useEffect(() => {
    if (schedulesRes) {
      const list = Array.isArray(schedulesRes)
        ? schedulesRes
        : (Array.isArray((schedulesRes as any).data) ? (schedulesRes as any).data : []);
      setLocalJadwal(list);
    }
  }, [schedulesRes]);

  const { pembiasaanList } = useJadwalKegiatan({ aktif: true });

  const pembiasaanJadwalItems = useMemo(() => {
    if (!pembiasaanList || pembiasaanList.length === 0) return [];
    
    const items: JadwalKBM[] = [];
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

      days.forEach(dayStr => {
        const upperDay = dayStr.toUpperCase();

        if (keg.target_semua_kelas) {
          const activeClassIds = (kelasRawList && kelasRawList.length > 0) ? kelasRawList.map(k => k.id) : (selectedKelasId ? [selectedKelasId] : []);
          activeClassIds.forEach(kId => {
            items.push({
              id: `pembiasaan-${keg.id}-${upperDay}-${kId}`,
              tenant_id: keg.tenant_id,
              tahun_pelajaran_id: tahunPelajaranId || '',
              semester_id: semesterId || '',
              kelas_id: kId,
              hari: upperDay,
              slot_index: 0,
              jam_mulai: keg.waktu_mulai || '06:30',
              jam_selesai: keg.waktu_selesai || '07:00',
              jenis_kegiatan: 'PEMBIASAAN',
              is_locked: true,
              is_pembiasaan: true,
              Mapel: { id: `mapel-pembiasaan-${keg.id}`, nama_mapel: mapelNama, kode_mapel: 'PEMBIASAAN' },
              Kelas: { id: kId, nama_kelas: 'Seluruh Kelas' },
              Guru: undefined
            } as any);
          });
        } else {
          targetKelasIds.forEach(kId => {
            items.push({
              id: `pembiasaan-${keg.id}-${upperDay}-${kId}`,
              tenant_id: keg.tenant_id,
              tahun_pelajaran_id: tahunPelajaranId || '',
              semester_id: semesterId || '',
              kelas_id: kId,
              hari: upperDay,
              slot_index: 0,
              jam_mulai: keg.waktu_mulai || '06:30',
              jam_selesai: keg.waktu_selesai || '07:00',
              jenis_kegiatan: 'PEMBIASAAN',
              is_locked: true,
              is_pembiasaan: true,
              Mapel: { id: `mapel-pembiasaan-${keg.id}`, nama_mapel: keg.nama || 'PEMBIASAAN', kode_mapel: 'PEMBIASAAN' },
              Kelas: { id: kId, nama_kelas: 'Kelas Terpilih' },
              Guru: { nama_guru: 'Pembiasaan Sekolah' }
            } as any);
          });
        }
      });
    });

    return items;
  }, [pembiasaanList, kelasRawList, tahunPelajaranId, semesterId, selectedKelasId]);

  const allJadwal = useMemo(() => {
    return [...localJadwal, ...pembiasaanJadwalItems];
  }, [localJadwal, pembiasaanJadwalItems]);

  const setAllJadwal = setLocalJadwal;

  // Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const requestConfirm = (title: string, description: React.ReactNode): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        description,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const [savingSlot, setSavingSlot] = useState<string | null>(null);

  // ── useQuery: Mapped Mapel for Selected Guru ──────────────────────────────
  const { data: mappedMapelsRes, isLoading: loadingMappedMapels } = useQuery({
    queryKey: ['guru-mapped-mapels', selectedGuruId],
    queryFn: () => (selectedGuruId && viewMode === 'GURU') ? listGuruMapel({ guru_id: selectedGuruId }).catch(() => null) : null,
    enabled: viewMode === 'GURU' && !!selectedGuruId,
    staleTime: 5 * 60 * 1000,
  });

  const mappedMapelIds = useMemo(() => {
    if (viewMode !== 'GURU') return null;
    if (!selectedGuruId) return [];
    if (mappedMapelsRes?.success && mappedMapelsRes.data) {
      return mappedMapelsRes.data.map(gm => gm.mapel_id);
    }
    return null;
  }, [viewMode, selectedGuruId, mappedMapelsRes]);

  // ── useQuery: Struktur Kurikulum ───────────────────────────────────────────
  const { data: strukturRes } = useQuery({
    queryKey: ['struktur-kurikulum-builder-jp', tahunPelajaranId],
    queryFn: () => (tahunPelajaranId) ? kurikulumApi.getStruktur({ tahun_pelajaran_id: tahunPelajaranId }).catch(() => null) : null,
    enabled: !!tahunPelajaranId,
    staleTime: 5 * 60 * 1000,
  });

  const targetJpMap = useMemo(() => {
    const map = new Map<string, number>();
    if (strukturRes?.data && Array.isArray(strukturRes.data)) {
      strukturRes.data.forEach((s: any) => {
        if (s.mapel_id && s.jp_per_minggu) {
          map.set(s.mapel_id, s.jp_per_minggu);
        }
      });
    }
    return map;
  }, [strukturRes]);

  const targetClassJpMap = useMemo(() => {
    const map = new Map<string, number>();
    if (strukturRes?.data && Array.isArray(strukturRes.data)) {
      const sumByTingkat = new Map<string, number>();
      let grandTotal = 0;

      strukturRes.data.forEach((s: any) => {
        const jp = s.jp_per_minggu || 0;
        grandTotal += jp;
        if (s.tingkat) {
          sumByTingkat.set(String(s.tingkat), (sumByTingkat.get(String(s.tingkat)) || 0) + jp);
        }
        if (s.jurusan_id) {
          sumByTingkat.set(`jurusan_${s.jurusan_id}`, (sumByTingkat.get(`jurusan_${s.jurusan_id}`) || 0) + jp);
        }
      });

      (kelasRawList || []).forEach((k: any) => {
        const tingkatStr = String(k.tingkat || '');
        let target = 0;
        if (k.jurusan_id && sumByTingkat.has(`jurusan_${k.jurusan_id}`)) {
          target = sumByTingkat.get(`jurusan_${k.jurusan_id}`) || 0;
        } else if (tingkatStr && sumByTingkat.has(tingkatStr)) {
          target = sumByTingkat.get(tingkatStr) || 0;
        } else {
          target = grandTotal > 0 ? grandTotal : 40;
        }
        map.set(k.id, target);
      });
    }
    return map;
  }, [strukturRes, kelasRawList]);

  const kelasList = useMemo<DropdownOption[]>(() => {
    return (kelasRawList || [])
      .slice()
      .sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || ''))
      .map(k => {
        const smartStatus = calculateClassJpStatus({
          kelasId: k.id,
          allJadwal,
          targetClassJpMap,
          defaultTarget: 40
        });

        return {
          value: k.id,
          label: k.nama_kelas,
          statusDotClass: smartStatus.statusDotClass,
          rightBadge: smartStatus.rightBadge,
          rightBadgeClass: smartStatus.rightBadgeClass,
        };
      });
  }, [kelasRawList, allJadwal, targetClassJpMap]);

  useEffect(() => {
    if (kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].value);
    }
  }, [kelasList, selectedKelasId]);

  const guruMapelSelectOptions = useMemo(() => {
    let baseList = [];
    if (mappedMapelsRes?.success && Array.isArray(mappedMapelsRes.data) && mappedMapelsRes.data.length > 0) {
      baseList = mappedMapelsRes.data.map((gm: any) => ({
        id: gm.mapel_id,
        nama_mapel: gm.Mapel?.nama_mapel || 'Mata Pelajaran',
        target_jp: gm.alokasi_jam || gm.jp_per_minggu || gm.Mapel?.jp_per_minggu || targetJpMap.get(gm.mapel_id) || 2
      }));
    } else {
      baseList = mapelList.map((m: any) => ({
        id: m.id,
        nama_mapel: m.nama_mapel,
        target_jp: m.alokasi_jam || m.jp_per_minggu || targetJpMap.get(m.id) || 2
      }));
    }

    return baseList.map(m => {
      const smartStatus = calculateSmartJpStatus({
        mapelId: m.id,
        selectedGuruId,
        selectedKelasId,
        allJadwal,
        targetJpMap,
        defaultTarget: m.target_jp
      });

      return {
        label: m.nama_mapel,
        value: m.id,
        status: smartStatus.status,
        statusDotClass: smartStatus.statusDotClass,
        rightBadge: smartStatus.rightBadge,
        rightBadgeClass: smartStatus.rightBadgeClass,
      };
    });
  }, [mappedMapelsRes, mapelList, allJadwal, selectedGuruId, selectedKelasId, targetJpMap]);

  useEffect(() => {
    if (guruMapelSelectOptions && guruMapelSelectOptions.length > 0) {
      const availableOptions = guruMapelSelectOptions.filter((m: any) => m.status !== 'PAS');
      const currentSelected = guruMapelSelectOptions.find((m: any) => m.value === paintMapelId);

      if (!currentSelected || currentSelected.status === 'PAS') {
        if (availableOptions.length > 0) {
          setPaintMapelId(availableOptions[0].value);
        } else {
          setPaintMapelId(guruMapelSelectOptions[0].value);
        }
      }
    } else if (mappedMapelIds && mappedMapelIds.length === 0) {
      setPaintMapelId('');
    }
  }, [guruMapelSelectOptions, mappedMapelIds, paintMapelId]);

  // Beban guru states
  const [bebanModalOpen, setBebanModalOpen] = useState(false);
  const [searchBebanGuru, setSearchBebanGuru] = useState('');

  // ── useQuery: Beban Guru List ─────────────────────────────────────────────
  const { data: bebanGuruRes, isLoading: loadingBeban, refetch: fetchBebanGuru } = useQuery({
    queryKey: ['beban-guru-list', tahunPelajaranId, semesterId],
    queryFn: () => (tahunPelajaranId && semesterId) ? kurikulumApi.getBebanMengajar({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId
    }).catch(() => null) : null,
    enabled: !!tahunPelajaranId && !!semesterId,
    staleTime: 5 * 60 * 1000,
  });
  const bebanGuruList = useMemo(() => bebanGuruRes?.data || [], [bebanGuruRes]);

  // Shift config states
  const [shiftJamPelajaran, setShiftJamPelajaran] = useState<any>(null);
  const [hariSekolah, setHariSekolah] = useState<string[]>(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);

  useEffect(() => {
    const fetchTenantShift = async () => {
      try {
        const tenantRes = await getMyTenant();
        if (tenantRes?.success) {
          if (tenantRes.data?.shift_jam_pelajaran) {
            setShiftJamPelajaran(tenantRes.data.shift_jam_pelajaran);
          }
          if (Array.isArray(tenantRes.data?.hari_sekolah) && tenantRes.data.hari_sekolah.length > 0) {
            const order = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
            const sortedDays = [...tenantRes.data.hari_sekolah].sort((a, b) => order.indexOf(a) - order.indexOf(b));
            setHariSekolah(sortedDays);
          }
        }
      } catch (err) {
        console.error('Failed to load shift jam pelajaran config:', err);
      }
    };
    fetchTenantShift();
  }, []);

  // Resolve slot time dynamically based on the class shift assignment (STRICT MANDATORY DAY PARAMETER)
  const resolveSlotTime = (targetKelasId: string, slotIndex: number, day: string): { start: string; end: string } => {
    if (shiftJamPelajaran) {
      const assignedShiftId = shiftJamPelajaran.class_assignments?.[targetKelasId] || 'pagi';
      const shift = shiftJamPelajaran.shifts?.find((s: any) => s.id === assignedShiftId) || shiftJamPelajaran.shifts?.[0];
      if (shift) {
        const slotsForDay = getSlotsForDay(shift, day);
        const slot = slotsForDay?.find((sl: any) => sl.slot === slotIndex);
        if (slot) {
          return { start: slot.start, end: slot.end };
        }
      }
    }
    return SLOT_TIME[slotIndex] || { start: "07:00", end: "07:45" };
  };

  // Search filters for lists
  const [searchGuru, setSearchGuru] = useState<string>('');
  const [searchMapel, setSearchMapel] = useState<string>('');

  useEffect(() => {
    if (viewMode === 'GURU' && selectedGuruId) {
      setPaintGuruId(selectedGuruId);
    }
  }, [viewMode, selectedGuruId]);

  // Filters
  const filteredGurus = useMemo(() => {
    return guruList.filter(g => g.nama_guru.toLowerCase().includes(searchGuru.toLowerCase()));
  }, [guruList, searchGuru]);

  const filteredMapels = useMemo(() => {
    let list = mapelList;
    if (viewMode === 'GURU' && mappedMapelIds !== null) {
      list = mapelList.filter(m => mappedMapelIds.includes(m.id));
    }
    return list.filter(m => m.nama_mapel.toLowerCase().includes(searchMapel.toLowerCase()));
  }, [mapelList, searchMapel, viewMode, mappedMapelIds]);

  const bebanGuruMap = useMemo(() => {
    const map = new Map<string, any>();
    if (bebanGuruRes?.success && Array.isArray(bebanGuruRes.data)) {
      bebanGuruRes.data.forEach((b: any) => map.set(b.id, b));
    }
    return map;
  }, [bebanGuruRes]);

  const guruSelectOptions = useMemo(() => {
    return guruList.map(g => {
      const bebanInfo = bebanGuruMap.get(g.id);
      const totalJp = bebanInfo ? (bebanInfo.total_calculated_jp ?? bebanInfo.current_jp ?? 0) : 0;
      const maxJp = bebanInfo ? bebanInfo.max_jp : (g.max_jp || 24);

      let statusDotClass = 'bg-slate-300 dark:bg-slate-600';
      let rightBadgeClass = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';

      if (totalJp > maxJp) {
        statusDotClass = 'bg-rose-500 shadow-sm shadow-rose-500/50';
        rightBadgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      } else if (totalJp === maxJp && maxJp > 0) {
        statusDotClass = 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
        rightBadgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      } else if (totalJp > 0) {
        statusDotClass = 'bg-blue-500';
        rightBadgeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      }

      return {
        label: g.nama_guru,
        value: g.id,
        statusDotClass,
        rightBadge: `${totalJp}/${maxJp} JP`,
        rightBadgeClass,
      };
    });
  }, [guruList, bebanGuruMap]);

  const keKelasSelectOptions = useMemo(() => {
    return kelasList.map(k => ({
      ...k,
      label: k.label.split(' - ')[0]
    }));
  }, [kelasList]);

  // Conflict calculations for current paint selection
  const checkConflict = (day: string, slotIndex: number, targetKelasId: string) => {
    if (toolMode !== 'PAINT' || !paintMapelId || !paintGuruId) return null;

    const targetSlot = resolveSlotTime(targetKelasId, slotIndex, day);

    // Check 1: Teacher conflict (Guru is already scheduled at an overlapping time in another class)
    const teacherConflict = allJadwal.find(j => 
      j.hari === day && 
      j.guru_id === paintGuruId &&
      j.kelas_id !== targetKelasId &&
      (j.jam_mulai && j.jam_selesai && targetSlot.start && targetSlot.end
        ? (j.jam_mulai < targetSlot.end && targetSlot.start < j.jam_selesai)
        : false)
    );
    if (teacherConflict) {
      return {
        type: 'TEACHER' as const,
        message: `Guru sudah mengajar di kelas ${teacherConflict.Kelas?.nama_kelas || 'lain'} pada jam ${teacherConflict.jam_mulai} - ${teacherConflict.jam_selesai}.`
      };
    }

    // Check 2: Class conflict (Class already has a lesson at this slot)
    const classConflict = allJadwal.find(j => 
      j.hari === day && 
      j.slot_index === slotIndex && 
      j.kelas_id === targetKelasId &&
      !(j.guru_id === paintGuruId && j.mapel_id === paintMapelId)
    );
    if (classConflict) {
      return {
        type: 'CLASS' as const,
        message: `Kelas ini sudah diisi oleh pelajaran ${classConflict.Mapel?.nama_mapel || 'lain'}. Tap untuk menimpa.`
      };
    }

    return null;
  };

  // High-performance O(1) Hash Map for JadwalBuilder slot rendering to prevent CPU spikes
  const { builderKelasSlotMap, builderGuruSlotMap } = useMemo(() => {
    const kMap = new Map<string, JadwalKBM>();
    const gMap = new Map<string, JadwalKBM>();
    for (let i = 0; i < allJadwal.length; i++) {
      const j = allJadwal[i];
      if (!j.hari || j.slot_index == null) continue;
      const h = String(j.hari).trim().toUpperCase();
      const s = Number(j.slot_index);
      if (j.kelas_id) {
        kMap.set(`${h}_${s}_${String(j.kelas_id).trim()}`, j);
      }
      if (j.guru_id) {
        gMap.set(`${h}_${s}_${String(j.guru_id).trim()}`, j);
      }
    }
    return { builderKelasSlotMap: kMap, builderGuruSlotMap: gMap };
  }, [allJadwal]);

  // Find slot data for grid rendering - Instant O(1) Lookup
  const getSlotData = useCallback((day: string, slotIndex: number) => {
    const normDay = String(day || '').trim().toUpperCase();
    const normSlot = Number(slotIndex);
    const normGuruId = String(selectedGuruId || '').trim();
    const normKelasId = String(selectedKelasId || '').trim();

    if (viewMode === 'KELAS') {
      return builderKelasSlotMap.get(`${normDay}_${normSlot}_${normKelasId}`);
    } else {
      // 1. Search for selected teacher's own schedule
      const ownSchedule = builderGuruSlotMap.get(`${normDay}_${normSlot}_${normGuruId}`);
      if (ownSchedule) return ownSchedule;

      // 2. If no own schedule, check if the target class is occupied by another teacher
      if (normKelasId) {
        const foreignSchedule = builderKelasSlotMap.get(`${normDay}_${normSlot}_${normKelasId}`);
        if (foreignSchedule) {
          return {
            ...foreignSchedule,
            isForeign: true
          };
        }
      }
      return undefined;
    }
  }, [viewMode, selectedGuruId, selectedKelasId, builderKelasSlotMap, builderGuruSlotMap]);

  // Dedicated delete slot action
  const handleDeleteSlotAction = async (day: string, slotIndex: number, id: string) => {
    const key = `${day}-${slotIndex}`;
    setSavingSlot(key);
    try {
      await deleteJadwalKBM(id);
      setAllJadwal(prev => prev.filter(j => j.id !== id));
      invalidateJadwalBuilderCache();
      toast.success('Slot jadwal berhasil dikosongkan.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus slot jadwal.');
    } finally {
      setSavingSlot(null);
    }
  };

  // Click handler on slot
  const handleSlotClick = async (day: string, slotIndex: number) => {
    if (!tahunPelajaranId || !semesterId) {
      toast.error('Tahun Pelajaran atau Semester belum dipilih.');
      return;
    }

    const existing = getSlotData(day, slotIndex);
    const key = `${day}-${slotIndex}`;

    // ERASER MODE: Delete slot if exists
    if (toolMode === 'ERASER') {
      if (!existing) return;
      setSavingSlot(key);
      try {
        await deleteJadwalKBM(existing.id);
        setAllJadwal(prev => prev.filter(j => j.id !== existing.id));
        invalidateJadwalBuilderCache();
        toast.success('Slot jadwal berhasil dikosongkan.');
        if (onRefresh) onRefresh();
      } catch (err) {
        toast.error('Gagal menghapus slot jadwal.');
      } finally {
        setSavingSlot(null);
      }
      return;
    }

    // PAINT MODE: Place lesson card
    if (toolMode === 'PAINT') {
      if (!paintMapelId || !paintGuruId) {
        toast.error('Silakan pilih Guru & Mapel di panel kiri terlebih dahulu.');
        return;
      }

      // Check class to assign
      let targetKelasId = selectedKelasId;
      if (viewMode === 'GURU') {
        if (!selectedKelasId) {
          toast.error('Pilih Kelas tujuan penempatan terlebih dahulu.');
          return;
        }
        targetKelasId = selectedKelasId;
      }

      const slot = resolveSlotTime(targetKelasId, slotIndex, day);

      // Check conflict
      const conflict = checkConflict(day, slotIndex, targetKelasId);
      if (conflict && conflict.type === 'TEACHER') {
        toast.error(`Gagal: ${conflict.message}`);
        return;
      }

      // Check if there is already a lesson in this class at this time slot
      const classExisting = allJadwal.find(j => 
        j.hari === day && 
        j.slot_index === slotIndex && 
        j.kelas_id === targetKelasId
      );

      if (classExisting) {
        if (classExisting.guru_id !== paintGuruId || classExisting.mapel_id !== paintMapelId) {
          const targetTeacherName = guruList.find(g => g.id === paintGuruId)?.nama_guru || '';
          const targetMapelName = mapelList.find(m => m.id === paintMapelId)?.nama_mapel || '';
          const confirmReplace = await requestConfirm(
            'Konfirmasi Ganti Jadwal',
            <div className="space-y-3.5 text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-805 dark:text-slate-205 text-left">
                Slot waktu terpilih sudah terisi oleh jadwal KBM berikut:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/55 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kelas:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{classExisting.Kelas?.nama_kelas || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mata Pelajaran:</span>
                  <span className="text-indigo-650 dark:text-indigo-405 font-black">{classExisting.Mapel?.nama_mapel || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guru Pengampu:</span>
                  <span className="text-slate-850 dark:text-slate-150 font-bold">{classExisting.Guru?.User?.full_name || classExisting.Guru?.nama_guru || ''}</span>
                </div>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-left">
                Apakah Anda yakin ingin menimpa (menggantikan) jadwal tersebut dengan <span className="text-indigo-600 dark:text-indigo-400 font-bold">"{targetMapelName}"</span> oleh <span className="font-bold text-slate-800 dark:text-slate-200">{targetTeacherName}</span>?
              </p>
            </div>
          );
          if (!confirmReplace) return;
        }

        setSavingSlot(key);
        try {
          await deleteJadwalKBM(classExisting.id);
        } catch (err) {
          console.warn('Jadwal sudah tidak ada di server, melanjutkan...', err);
        }
        setAllJadwal(prev => prev.filter(j => j.id !== classExisting.id));
      } else if (existing) {
        if (existing.guru_id !== paintGuruId || existing.mapel_id !== paintMapelId) {
          const targetTeacherName = guruList.find(g => g.id === paintGuruId)?.nama_guru || '';
          const targetMapelName = mapelList.find(m => m.id === paintMapelId)?.nama_mapel || '';
          const confirmReplace = await requestConfirm(
            'Konfirmasi Ganti Jadwal',
            <div className="space-y-3.5 text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-805 dark:text-slate-205 text-left">
                Slot waktu terpilih sudah terisi oleh jadwal KBM berikut:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/55 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kelas:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{existing.Kelas?.nama_kelas || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mata Pelajaran:</span>
                  <span className="text-indigo-655 dark:text-indigo-405 font-black">{existing.Mapel?.nama_mapel || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guru Pengampu:</span>
                  <span className="text-slate-850 dark:text-slate-150 font-bold">{existing.Guru?.User?.full_name || existing.Guru?.nama_guru || ''}</span>
                </div>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-left">
                Apakah Anda yakin ingin menimpa (menggantikan) jadwal tersebut dengan <span className="text-indigo-600 dark:text-indigo-400 font-bold">"{targetMapelName}"</span> oleh <span className="font-bold text-slate-800 dark:text-slate-200">{targetTeacherName}</span>?
              </p>
            </div>
          );
          if (!confirmReplace) return;
        }

        setSavingSlot(key);
        try {
          await deleteJadwalKBM(existing.id);
        } catch (err) {
          console.warn('Jadwal sudah tidak ada di server, melanjutkan...', err);
        }
        setAllJadwal(prev => prev.filter(j => j.id !== existing.id));
      }

      setSavingSlot(key);
      try {
        // Capping JP check
        if (paintGuruId) {
          try {
            const checkRes = await kurikulumApi.checkBebanGuru(paintGuruId, paintMapelId, targetKelasId);
            if (checkRes?.success) {
              const { 
                is_exceeded, 
                is_allocation_exceeded, 
                current_jp, 
                max_jp, 
                nama_guru, 
                current_allocation_jp, 
                max_allocation_jp, 
                mapel_name, 
                kelas_name 
              } = checkRes.data;

              if (is_exceeded) {
                const proceed = await requestConfirm(
                  'Beban Mengajar Melebihi Batas',
                  <div className="space-y-3 text-slate-600 dark:text-slate-400 text-left">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Jam mengajar <strong className="text-slate-900 dark:text-white">{nama_guru}</strong> akan melebihi batas yang ditentukan ({current_jp} JP dari maks {max_jp} JP per minggu).
                    </p>
                    <p className="text-xs">Apakah Anda yakin ingin tetap menempatkan jadwal ini?</p>
                  </div>
                );
                if (!proceed) {
                  setSavingSlot(null);
                  return;
                }
              }

              if (is_allocation_exceeded) {
                const proceed = await requestConfirm(
                  'Alokasi Kurikulum Melebihi Batas',
                  <div className="space-y-3 text-slate-600 dark:text-slate-400 text-left">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Alokasi mata pelajaran <strong className="text-indigo-600 dark:text-indigo-400">{mapel_name}</strong> di kelas <strong className="text-slate-900 dark:text-white">{kelas_name}</strong> melebihi batas alokasi struktur kurikulum ({current_allocation_jp} JP dari alokasi {max_allocation_jp} JP per minggu).
                    </p>
                    <p className="text-xs">Apakah Anda yakin ingin tetap menempatkan jadwal ini?</p>
                  </div>
                );
                if (!proceed) {
                  setSavingSlot(null);
                  return;
                }
              }
            }
          } catch (e) {
            console.error('Failed to check beban guru capping:', e);
          }
        }

        const payload = {
          tahun_pelajaran_id: tahunPelajaranId,
          semester_id: semesterId,
          kelas_id: targetKelasId,
          hari: day,
          slot_index: slotIndex,
          jam_mulai: slot.start,
          jam_selesai: slot.end,
          mapel_id: paintMapelId,
          guru_id: paintGuruId,
          jenis_kegiatan: 'KBM'
        };

        const res = await createJadwalKBM(payload);
        if (res?.data) {
          // Re-fetch or locally append to allJadwal
          const mapelObj = mapelList.find(m => m.id === paintMapelId);
          const guruObj = guruList.find(g => g.id === paintGuruId);
          const kelasObj = kelasList.find(k => k.value === targetKelasId);
          
          const newSlot: JadwalKBM = {
            id: res.data.id,
            tenant_id: res.data.tenant_id || '',
            tahun_pelajaran_id: tahunPelajaranId,
            semester_id: semesterId,
            kelas_id: targetKelasId,
            hari: day as any,
            slot_index: slotIndex,
            jam_mulai: slot.start,
            jam_selesai: slot.end,
            jenis_kegiatan: 'KBM',
            mapel_id: paintMapelId,
            guru_id: paintGuruId,
            Mapel: mapelObj ? { nama_mapel: mapelObj.nama_mapel, kode_mapel: mapelObj.kode_mapel || '' } : undefined,
            Guru: guruObj ? { id: guruObj.id, User: { full_name: guruObj.nama_guru } } : undefined,
            Kelas: kelasObj ? { id: kelasObj.value, nama_kelas: kelasObj.label.split(' - ')[0] } : undefined
          };

          setAllJadwal(prev => [...prev.filter(j => j.id !== classExisting?.id && j.id !== existing?.id), newSlot]);
          invalidateJadwalBuilderCache();
          toast.success('Jadwal berhasil ditempatkan.');
          if (onRefresh) onRefresh();
        }
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.code === 'KELAS_CONFLICT' && errorData?.details?.id) {
          const conflictId = errorData.details.id;
          const confirmTimpa = await requestConfirm(
            'Konfirmasi Timpa KBM',
            <div className="space-y-3.5 text-slate-600 dark:text-slate-400">
              <p className="font-bold text-slate-805 dark:text-slate-200 text-left">
                Kelas sudah memiliki jadwal lain pada slot waktu ini:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-450">Mata Pelajaran:</span>
                  <span className="text-indigo-650 dark:text-indigo-405 font-black">{errorData.details.mapel || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Guru Pengampu:</span>
                  <span className="text-slate-850 dark:text-slate-150 font-bold">{errorData.details.guru || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Waktu KBM:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{errorData.details.waktu || ''}</span>
                </div>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-left">
                Apakah Anda yakin ingin menimpa (menggantikan) jadwal tersebut?
              </p>
            </div>
          );
          if (confirmTimpa) {
            try {
              await deleteJadwalKBM(conflictId);
              
              // Retry creation
              const res = await createJadwalKBM(payload);
              if (res?.data) {
                const mapelObj = mapelList.find(m => m.id === paintMapelId);
                const guruObj = guruList.find(g => g.id === paintGuruId);
                const kelasObj = kelasList.find(k => k.value === targetKelasId);
                
                const newSlot: JadwalKBM = {
                  id: res.data.id,
                  tenant_id: res.data.tenant_id || '',
                  tahun_pelajaran_id: tahunPelajaranId,
                  semester_id: semesterId,
                  kelas_id: targetKelasId,
                  hari: day as any,
                  slot_index: slotIndex,
                  jam_mulai: slot.start,
                  jam_selesai: slot.end,
                  jenis_kegiatan: 'KBM',
                  mapel_id: paintMapelId,
                  guru_id: paintGuruId,
                  Mapel: mapelObj ? { nama_mapel: mapelObj.nama_mapel, kode_mapel: mapelObj.kode_mapel || '' } : undefined,
                  Guru: guruObj ? { id: guruObj.id, User: { full_name: guruObj.nama_guru } } : undefined,
                  Kelas: kelasObj ? { id: kelasObj.value, nama_kelas: kelasObj.label.split(' - ')[0] } : undefined
                };

                setAllJadwal(prev => [...prev.filter(j => j.id !== classExisting?.id && j.id !== existing?.id && j.id !== conflictId), newSlot]);
                toast.success('Jadwal berhasil ditempatkan (menimpa jadwal kelas).');
                if (onRefresh) onRefresh();
              }
            } catch (retryErr: any) {
              console.error('Failed to overwrite conflict schedule:', retryErr);
              toast.error(retryErr.response?.data?.message || 'Gagal menimpa jadwal.');
            }
          }
        } else {
          toast.error(errorData?.message || err?.message || 'Gagal menyimpan slot jadwal.');
        }
      } finally {
        setSavingSlot(null);
      }
    }
  };

  const handleClearSchedule = async () => {
    let targetKelas = viewMode === 'KELAS' ? selectedKelasId : undefined;
    let targetGuru = viewMode === 'GURU' ? selectedGuruId : undefined;
    
    let scopeText = 'SELURUH jadwal KBM sekolah';
    if (viewMode === 'KELAS' && targetKelas) {
      const k = kelasList.find(c => c.value === targetKelas);
      scopeText = `seluruh jadwal KBM untuk KELAS ${k?.label || ''}`;
    } else if (viewMode === 'GURU' && targetGuru) {
      const g = guruList.find(guru => guru.id === targetGuru);
      scopeText = `seluruh jadwal KBM untuk GURU ${g?.nama_guru || ''}`;
    } else if (viewMode === 'MASTER_KELAS') {
      scopeText = 'SELURUH jadwal KBM sekolah (Master Grid Kelas)';
    } else if (viewMode === 'MASTER_GURU') {
      scopeText = 'SELURUH jadwal KBM sekolah (Master Grid Guru)';
    }

    const proceed = await requestConfirm(
      'Kosongkan / Reset Jadwal KBM',
      <div className="space-y-3 text-slate-600 dark:text-slate-400 text-left">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Apakah Anda yakin ingin mengosongkan/menghapus <strong className="text-rose-600 dark:text-rose-400">{scopeText}</strong>?
        </p>
        <p className="text-xs text-rose-500 font-medium">Tindakan ini akan menghapus slot jadwal beserta sesi absensi terkait dan tidak dapat dibatalkan.</p>
      </div>
    );
    if (!proceed) return;

    try {
      const res = await clearJadwalKBM({
        kelas_id: targetKelas || undefined,
        guru_id: targetGuru || undefined,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });

      if (res && res.success !== false) {
        toast.success(res.message || 'Jadwal berhasil dikosongkan.');
        setAllJadwal([]);
        invalidateJadwalBuilderCache();
        fetchSchedules();
        if (onRefresh) onRefresh();
      } else {
        toast.error(res?.message || 'Gagal mengosongkan jadwal');
      }
    } catch (err) {
      console.error('Failed to clear schedules', err);
      toast.error('Gagal mengosongkan jadwal KBM');
    }
  };

  const selectedPaintTeacherName = useMemo(() => {
    return guruList.find(g => g.id === paintGuruId)?.nama_guru || '';
  }, [guruList, paintGuruId]);

  const selectedPaintMapelName = useMemo(() => {
    return mapelList.find(m => m.id === paintMapelId)?.nama_mapel || '';
  }, [mapelList, paintMapelId]);

  return (
    <>
      <div className="w-full flex flex-col space-y-4">
        {/* Header, Switcher & Filters */}
        <JadwalBuilderHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          gridOrientation={gridOrientation}
          setGridOrientation={setGridOrientation}
          toolMode={toolMode}
          colorByMode={colorByMode}
          setColorByMode={setColorByMode}
          selectedKelasId={selectedKelasId}
          setSelectedKelasId={setSelectedKelasId}
          selectedGuruId={selectedGuruId}
          setSelectedGuruId={setSelectedGuruId}
          paintMapelId={paintMapelId}
          setPaintMapelId={setPaintMapelId}
          guruMapelSelectOptions={guruMapelSelectOptions}
          masterGridHari={masterGridHari}
          setMasterGridHari={setMasterGridHari}
          kelasList={kelasList}
          guruSelectOptions={guruSelectOptions}
          keKelasSelectOptions={keKelasSelectOptions}
          hariSekolah={hariSekolah}
          loadingData={loadingData}
          onRefreshSchedules={fetchSchedules}
          onOpenPrintPreview={onOpenPrintPreview}
        />

        {/* Mode 1 & 2: Single Grid Timetable (Per Kelas & Per Guru) */}
        {(viewMode === 'KELAS' || viewMode === 'GURU') && (
          <SingleGridTimetable
            viewMode={viewMode}
            toolMode={toolMode}
            colorByMode={colorByMode}
            gridOrientation={gridOrientation}
            selectedKelasId={selectedKelasId}
            hariSekolah={hariSekolah}
            slots={SLOTS}
            loadingData={loadingData}
            savingSlot={savingSlot}
            resolveSlotTime={resolveSlotTime}
            getSlotData={getSlotData}
            checkConflict={checkConflict}
            onSlotClick={handleSlotClick}
            onDeleteSlot={handleDeleteSlotAction}
          />
        )}

        {/* Mode 3: Master Grid Guru (Semua Guru vs Jam + Conflict Highlight) */}
        {viewMode === 'MASTER_GURU' && (
          <MasterGridGuruTimetable
            guruList={guruList}
            allJadwal={allJadwal}
            masterGridHari={masterGridHari}
            slots={SLOTS}
            colorByMode={colorByMode}
          />
        )}

        {/* Mode 4: Master Grid Kelas (Semua Kelas vs Jam) */}
        {viewMode === 'MASTER_KELAS' && (
          <MasterGridKelasTimetable
            kelasList={kelasList}
            allJadwal={allJadwal}
            masterGridHari={masterGridHari}
            slots={SLOTS}
            colorByMode={colorByMode}
          />
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          description={confirmState.description}
          confirmText="Ya, Timpa"
          cancelText="Batal"
          style="warning"
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />

        {/* Modal Beban Mengajar Guru */}
        <BebanGuruSummaryModal
          isOpen={bebanModalOpen}
          onClose={() => setBebanModalOpen(false)}
          loadingBeban={loadingBeban}
          bebanGuruList={bebanGuruList}
          onSelectTeacherForSchedule={(guruId) => {
            setViewMode('GURU');
            setSelectedGuruId(guruId);
            setBebanModalOpen(false);
          }}
        />
      </div>
    </>
  );
};

export default JadwalBuilder;
