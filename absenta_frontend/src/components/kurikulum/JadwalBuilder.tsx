import React, { useState, useEffect, useMemo } from 'react';
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
  type JadwalKBM 
} from '../../api/attendance/jadwalKBM.api';
import { getMapelColor } from '../../utils/mapelColorHelper';
import { getGuruList } from '../../api/academic/guru.api';
import { getMapelList } from '../../api/academic/mapel.api';
import { listGuruMapel } from '../../api/kurikulum/guru-mapel.api';
import { getKelasForDropdown, type DropdownOption } from '../../api/dropdown.api';
import { getMyTenant } from '../../api/tenants.api';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { kurikulumApi } from '../../api/kurikulum.api';
import { ViewMode, ToolMode, JadwalBuilderProps } from './jadwal-builder/types';
import { JadwalBuilderHeader } from './jadwal-builder/JadwalBuilderHeader';
import { SingleGridTimetable } from './jadwal-builder/SingleGridTimetable';
import { MasterGridGuruTimetable } from './jadwal-builder/MasterGridGuruTimetable';
import { MasterGridKelasTimetable } from './jadwal-builder/MasterGridKelasTimetable';
import { BebanGuruSummaryModal } from './jadwal-builder/BebanGuruSummaryModal';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

// Standard slot times
const SLOT_TIME: Record<number, { start: string; end: string }> = {
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
};

export const JadwalBuilder: React.FC<JadwalBuilderProps> = ({
  tahunPelajaranId,
  semesterId,
  onRefresh
}) => {
  // Mode state
  const [viewMode, setViewModeState] = useState<ViewMode>('KELAS');
  const [masterGridHari, setMasterGridHari] = useState<string>('SENIN');
  const [toolMode, setToolMode] = useState<ToolMode>('PAINT');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
  const [colorByMode, setColorByMode] = useState<ColorByMode>('MAPEL');

  const setViewMode = (m: ViewMode) => {
    setViewModeState(m);
    if (m === 'MASTER_GURU' || m === 'MASTER_KELAS') {
      setShowLeftPanel(false);
    } else {
      setShowLeftPanel(true);
    }
  };

  // Keyboard shortcut listener for Esc key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);
  
  // Selections
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  
  // Paint payload
  const [paintMapelId, setPaintMapelId] = useState<string>('');
  const [paintGuruId, setPaintGuruId] = useState<string>('');

  // Data lists
  const [kelasList, setKelasList] = useState<DropdownOption[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  
  // All schedules in system for conflict detection
  const [allJadwal, setAllJadwal] = useState<JadwalKBM[]>([]);

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
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [mappedMapelIds, setMappedMapelIds] = useState<string[] | null>(null);
  const [loadingMappedMapels, setLoadingMappedMapels] = useState<boolean>(false);

  // Beban guru states
  const [bebanModalOpen, setBebanModalOpen] = useState(false);
  const [bebanGuruList, setBebanGuruList] = useState<any[]>([]);
  const [loadingBeban, setLoadingBeban] = useState(false);
  const [searchBebanGuru, setSearchBebanGuru] = useState('');

  const fetchBebanGuru = async () => {
    try {
      setLoadingBeban(true);
      const res = await kurikulumApi.getBebanMengajar({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId
      });
      if (res.success) {
        setBebanGuruList(res.data || []);
      } else {
        toast.error('Gagal mengambil data beban guru');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Terjadi kesalahan saat memuat beban guru');
    } finally {
      setLoadingBeban(false);
    }
  };

  useEffect(() => {
    if (bebanModalOpen) {
      fetchBebanGuru();
    }
  }, [bebanModalOpen, tahunPelajaranId, semesterId]);

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

  // Resolve slot time dynamically based on the class shift assignment
  const resolveSlotTime = (targetKelasId: string, slotIndex: number): { start: string; end: string } => {
    if (shiftJamPelajaran) {
      const assignedShiftId = shiftJamPelajaran.class_assignments?.[targetKelasId] || 'pagi';
      const shift = shiftJamPelajaran.shifts?.find((s: any) => s.id === assignedShiftId) || shiftJamPelajaran.shifts?.[0];
      if (shift) {
        const slot = shift.slots?.find((sl: any) => sl.slot === slotIndex);
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

  // Fetch reference lists
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [kelasData, guruData, mapelData] = await Promise.all([
          getKelasForDropdown(),
          getGuruList(1, 200, '', ''),
          getMapelList(1, 200, '')
        ]);
        
        const sortedKelas = (kelasData || []).sort((a: any, b: any) => a.label.localeCompare(b.label));
        const sortedGuru = (guruData?.data || []).sort((a: any, b: any) => a.nama_guru.localeCompare(b.nama_guru));
        const sortedMapel = (mapelData?.data || []).sort((a: any, b: any) => a.nama_mapel.localeCompare(b.nama_mapel));

        setKelasList(sortedKelas);
        setGuruList(sortedGuru);
        setMapelList(sortedMapel);
        
        if (sortedKelas.length > 0) {
          setSelectedKelasId(sortedKelas[0].value);
        }
        if (sortedGuru.length > 0) {
          setSelectedGuruId(sortedGuru[0].id);
        }
      } catch (err) {
        console.error('Failed to load references:', err);
        toast.error('Gagal memuat daftar referensi');
      }
    };
    fetchReferences();
  }, []);

  // Fetch all schedules for real-time conflict checking
  const fetchSchedules = async () => {
    if (!tahunPelajaranId || !semesterId) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const res = await getJadwalKBM({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId
      });
      setAllJadwal(res?.data || []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      toast.error('Gagal mengambil data jadwal');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [tahunPelajaranId, semesterId]);

  useEffect(() => {
    if (viewMode === 'GURU' && selectedGuruId) {
      setPaintGuruId(selectedGuruId);
    }
  }, [viewMode, selectedGuruId]);

  useEffect(() => {
    if (viewMode !== 'GURU') {
      setMappedMapelIds(null);
      return;
    }
    if (!selectedGuruId) {
      setMappedMapelIds([]);
      return;
    }

    const fetchMappedMapels = async () => {
      setLoadingMappedMapels(true);
      try {
        const res = await listGuruMapel({ guru_id: selectedGuruId });
        if (res?.success && res.data) {
          const ids = res.data.map(gm => gm.mapel_id);
          setMappedMapelIds(ids);
          if (ids.length > 0) {
            if (!ids.includes(paintMapelId)) {
              setPaintMapelId(ids[0]);
            }
          } else {
            setPaintMapelId('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch mapped mapels:', err);
      } finally {
        setLoadingMappedMapels(false);
      }
    };

    fetchMappedMapels();
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

  const guruSelectOptions = useMemo(() => {
    return guruList.map(g => ({
      label: g.nama_guru,
      value: g.id
    }));
  }, [guruList]);

  const keKelasSelectOptions = useMemo(() => {
    return kelasList.map(k => ({
      label: k.label.split(' - ')[0],
      value: k.value
    }));
  }, [kelasList]);

  // Conflict calculations for current paint selection
  const checkConflict = (day: string, slotIndex: number, targetKelasId: string) => {
    if (toolMode !== 'PAINT' || !paintMapelId || !paintGuruId) return null;

    const targetSlot = resolveSlotTime(targetKelasId, slotIndex);

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

  // Find slot data for grid rendering
  const getSlotData = (day: string, slotIndex: number) => {
    if (viewMode === 'KELAS') {
      return allJadwal.find(j => 
        j.hari === day && 
        j.slot_index === slotIndex && 
        j.kelas_id === selectedKelasId
      );
    } else {
      // 1. Search for selected teacher's own schedule
      const ownSchedule = allJadwal.find(j => 
        j.hari === day && 
        j.guru_id === selectedGuruId &&
        j.slot_index === slotIndex
      );
      if (ownSchedule) return ownSchedule;

      // 2. If no own schedule, check if the target class is occupied by another teacher
      if (selectedKelasId) {
        const foreignSchedule = allJadwal.find(j => 
          j.hari === day && 
          j.slot_index === slotIndex && 
          j.kelas_id === selectedKelasId
        );
        if (foreignSchedule) {
          return {
            ...foreignSchedule,
            isForeign: true
          };
        }
      }
      return undefined;
    }
  };

  // Dedicated delete slot action
  const handleDeleteSlotAction = async (day: string, slotIndex: number, id: string) => {
    const key = `${day}-${slotIndex}`;
    setSavingSlot(key);
    try {
      await deleteJadwalKBM(id);
      setAllJadwal(prev => prev.filter(j => j.id !== id));
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

      const slot = resolveSlotTime(targetKelasId, slotIndex);

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

  const selectedPaintTeacherName = useMemo(() => {
    return guruList.find(g => g.id === paintGuruId)?.nama_guru || '';
  }, [guruList, paintGuruId]);

  const selectedPaintMapelName = useMemo(() => {
    return mapelList.find(m => m.id === paintMapelId)?.nama_mapel || '';
  }, [mapelList, paintMapelId]);

  return (
    <>
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start transition-all duration-300",
        isFocusMode && "fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto w-screen h-screen m-0"
      )}>

        {/* 🌟 FOCUS MODE HEADER BANNER */}
        {isFocusMode && (
          <div className="lg:col-span-12 flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg border border-purple-700/50 mb-1">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-purple-500/30 rounded-xl text-amber-300 animate-pulse font-black text-base">✨</span>
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase text-amber-300">Mode Fokus Penjadwalan Aktif</h4>
                <p className="text-[11px] text-purple-200">Sidebar & menu platform disembunyikan untuk ruang kerja jadwal 100% penuh.</p>
              </div>
            </div>
            <button
              onClick={() => setIsFocusMode(false)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>❌ Keluar Mode Fokus (Esc)</span>
            </button>
          </div>
        )}
      
      {/* 🛠️ LEFT PANEL: Toolbox & Cards */}
      {showLeftPanel && (
        <div className="lg:col-span-4 flex flex-col space-y-4">
        
        {/* Toggle Mode Builder */}
        <Card className="p-4 border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-purple-500" />
            Mode Peralatan Builder
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={toolMode === 'PAINT' ? 'primary' : 'outline'}
              className={cn("w-full py-2.5 rounded-xl font-medium", toolMode === 'PAINT' && "bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-md shadow-blue-500/20 text-white")}
              onClick={() => setToolMode('PAINT')}
            >
              <Paintbrush className="w-4 h-4 mr-2" />
              Penempel Kartu
            </Button>
            <Button
              variant={toolMode === 'ERASER' ? 'primary' : 'outline'}
              className={cn("w-full py-2.5 rounded-xl font-medium", toolMode === 'ERASER' && "bg-gradient-to-r from-red-600 to-rose-600 border-none shadow-md shadow-red-500/20 text-white")}
              onClick={() => setToolMode('ERASER')}
            >
              <Eraser className="w-4 h-4 mr-2" />
              Penghapus Slot
            </Button>
          </div>

          {toolMode === 'PAINT' && (
            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Panduan Langkah Demi Langkah:</span>
              <div className="space-y-2">
                {/* Step 1 */}
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  {paintMapelId ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-350 dark:border-slate-750 shrink-0 flex items-center justify-center text-[9px] font-black text-slate-400">1</div>
                  )}
                  <span className={paintMapelId ? "text-slate-500 line-through font-normal" : "text-slate-700 dark:text-slate-300 font-bold"}>
                    Pilih Mata Pelajaran di daftar bawah
                  </span>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  {paintGuruId ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-350 dark:border-slate-750 shrink-0 flex items-center justify-center text-[9px] font-black text-slate-400">2</div>
                  )}
                  <span className={paintGuruId ? "text-slate-500 line-through font-normal" : "text-slate-750 dark:text-slate-300 font-bold"}>
                    Pilih Guru Pengampu di daftar bawah
                  </span>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  {paintMapelId && paintGuruId ? (
                    <div className="w-4 h-4 rounded-full bg-indigo-650 text-white shrink-0 flex items-center justify-center text-[9px] font-black animate-bounce">3</div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center text-[9px] font-black text-slate-400">3</div>
                  )}
                  <span className={paintMapelId && paintGuruId ? "text-indigo-600 dark:text-indigo-400 font-extrabold animate-pulse" : "text-slate-400"}>
                    Klik kotak jam pelajaran pada tabel kanan untuk menempelkan
                  </span>
                </div>
              </div>
            </div>
          )}

          {toolMode === 'ERASER' && (
            <div className="mt-4 p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900/30 rounded-xl animate-pulse">
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>Mode Penghapus aktif. Klik kotak grid berisi jadwal untuk mengosongkannya seketika.</span>
              </p>
            </div>
          )}
        </Card>

        {/* Lesson Cards Chooser (Only in PAINT mode) */}
        {toolMode === 'PAINT' && (
          <Card className="p-4 border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 flex flex-col space-y-4">
            
            {/* Active Card Preview */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Kartu Mengajar Aktif</span>
              {paintGuruId && paintMapelId ? (
                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800 rounded-xl relative overflow-hidden">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{selectedPaintMapelName}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center">
                        <User className="w-3 h-3 mr-1 text-green-500" />
                        {selectedPaintTeacherName}
                      </p>
                    </div>
                  </div>
                  <span className="absolute right-2.5 top-3 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full animate-bounce">
                    Siap Tempel
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Silakan pilih mapel & guru di bawah untuk membuat kartu</p>
                </div>
              )}
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Step 1: Select Subject */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">1. Pilih Mata Pelajaran</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Mata Pelajaran..."
                  value={searchMapel}
                  onChange={(e) => setSearchMapel(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="max-h-[140px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {loadingMappedMapels ? (
                  <div className="flex items-center justify-center py-6 text-xs text-slate-500">
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin text-indigo-500" />
                    Memuat pemetaan mapel...
                  </div>
                ) : filteredMapels.length > 0 ? (
                  filteredMapels.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPaintMapelId(m.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors",
                        paintMapelId === m.id 
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <span>{m.nama_mapel}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.kode_mapel}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {viewMode === 'GURU' ? (
                      <div className="space-y-1">
                        <p className="font-bold text-amber-600 dark:text-amber-500">
                          Guru ini belum dipetakan ke mata pelajaran apa pun.
                        </p>
                        <p className="text-[10px]">
                          Silakan petakan terlebih dahulu di menu <strong>Guru Pengampu</strong>.
                        </p>
                      </div>
                    ) : (
                      <p>Mata pelajaran tidak ditemukan.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Select Teacher */}
            {viewMode === 'GURU' ? (
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">2. Guru Pengampu</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="text-xs font-black text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span>{selectedPaintTeacherName || 'Guru belum terpilih'}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase border-slate-200 text-slate-500 font-bold scale-90">
                    Otomatis
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  ✓ Terkunci sesuai Guru yang aktif pada filter tabel kanan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">2. Pilih Guru Pengampu</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari Guru..."
                    value={searchGuru}
                    onChange={(e) => setSearchGuru(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="max-h-[140px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredGurus.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setPaintGuruId(g.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors",
                        paintGuruId === g.id 
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <span>{g.nama_guru}</span>
                      <Badge variant="outline" className="text-[9px] scale-90 border-slate-200 text-slate-500 uppercase">
                        {g.status_kepegawaian}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </Card>
        )}

      </div>
      )}

      {/* 📅 RIGHT COLUMN: TIMETABLE GRID */}
      <div className={cn("flex flex-col space-y-4 transition-all duration-300", showLeftPanel ? "lg:col-span-8" : "lg:col-span-12")}>
        {/* Header, Switcher & Filters */}
        <JadwalBuilderHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          toolMode={toolMode}
          colorByMode={colorByMode}
          setColorByMode={setColorByMode}
          selectedKelasId={selectedKelasId}
          setSelectedKelasId={setSelectedKelasId}
          selectedGuruId={selectedGuruId}
          setSelectedGuruId={setSelectedGuruId}
          masterGridHari={masterGridHari}
          setMasterGridHari={setMasterGridHari}
          kelasList={kelasList}
          guruSelectOptions={guruSelectOptions}
          keKelasSelectOptions={keKelasSelectOptions}
          hariSekolah={hariSekolah}
          loadingData={loadingData}
          onRefreshSchedules={fetchSchedules}
          onOpenBebanModal={() => setBebanModalOpen(true)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
          showLeftPanel={showLeftPanel}
          onToggleLeftPanel={() => setShowLeftPanel(prev => !prev)}
        />

        {/* Mode 1 & 2: Single Grid Timetable (Per Kelas & Per Guru) */}
        {(viewMode === 'KELAS' || viewMode === 'GURU') && (
          <SingleGridTimetable
            viewMode={viewMode}
            toolMode={toolMode}
            colorByMode={colorByMode}
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
    </div>
  </>
);
};

export default JadwalBuilder;
