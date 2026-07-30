import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  ShieldCheck,
  UserCheck,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Users,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  FileText,
  Wrench,
  Eye,
  Lock,
  Bell,
  LayoutGrid,
  Table
} from 'lucide-react';
import { piketGuruApi, JadwalPiketGuru, Hari } from '../../api/piketGuru.api';
import { guruApi, tahunPelajaranApi, semesterApi, jurusanApi } from '../../api/academic.api';
import { getMyTenant } from '../../api/tenants.api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useJenjang } from '../../hooks/useJenjang';
import { useAuth } from '../../hooks/useAuth';
import { PiketNotifModal } from '../../components/piket/PiketNotifModal';

function getPosBadgeStyle(posName: string = '') {
  const pos = posName.toUpperCase();
  if (pos.includes('UMUM')) {
    return 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  }
  if (pos.includes('JURUSAN') || pos.includes('RPL') || pos.includes('TKJ') || pos.includes('AKL') || pos.includes('OTKP')) {
    return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
  if (pos.includes('DISIPLIN') || pos.includes('GERBANG') || pos.includes('UTAMA')) {
    return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }
  if (pos.includes('KBM') || pos.includes('IZIN')) {
    return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }
  return 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800';
}



const DEFAULT_SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '06:30', end: '07:45' },
  2: { start: '07:45', end: '08:30' },
  3: { start: '08:30', end: '09:15' },
  4: { start: '09:35', end: '10:20' },
  5: { start: '10:20', end: '11:05' },
  6: { start: '11:05', end: '11:50' },
  7: { start: '12:30', end: '13:15' },
  8: { start: '13:15', end: '14:00' },
  9: { start: '14:00', end: '14:45' },
  10: { start: '14:45', end: '15:30' },
  11: { start: '15:30', end: '16:15' },
  12: { start: '16:15', end: '17:00' },
};

const HARI_LIST: { id: Hari; label: string; short: string }[] = [
  { id: 'SENIN', label: 'Senin', short: 'Sen' },
  { id: 'SELASA', label: 'Selasa', short: 'Sel' },
  { id: 'RABU', label: 'Rabu', short: 'Rab' },
  { id: 'KAMIS', label: 'Kamis', short: 'Kam' },
  { id: 'JUMAT', label: 'Jumat', short: 'Jum' },
  { id: 'SABTU', label: 'Sabtu', short: 'Sab' },
  { id: 'MINGGU', label: 'Minggu', short: 'Min' },
];

export default function JadwalPiketGuruPage() {
  const { user, isAdmin, can } = useAuth();
  const currentGuruId = user?.guru_profile?.id;

  const isKurikulumAdmin = useMemo(() => {
    if (isAdmin()) return true;
    if (can('kurikulum:jadwal-piket:manage') || can('kurikulum:jadwal-piket:create')) return true;
    const roleName = (user?.role?.name || '').toUpperCase();
    return roleName === 'ADMIN' || roleName === 'KURIKULUM' || roleName === 'SUPERADMIN';
  }, [user, isAdmin, can]);

  const { jenjang } = useJenjang();
  const isSmk = useMemo(() => ['SMK', 'MAK'].includes((jenjang || '').toUpperCase()), [jenjang]);

  const [activeHari, setActiveHari] = useState<Hari>('SENIN');
  const [piketFilterMode, setPiketFilterMode] = useState<'ALL' | 'MY_PIKET'>('ALL');
  const [schedules, setSchedules] = useState<JadwalPiketGuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown Master Data
  const [tahunPelajaranList, setTahunPelajaranList] = useState<{ id: string; tahun: string; is_active: boolean }[]>([]);
  const [semesterList, setSemesterList] = useState<{ id: string; nama_semester: string; is_active: boolean }[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);

  // Selected Filter
  const [selectedTpId, setSelectedTpId] = useState<string>('');
  const [selectedSemId, setSelectedSemId] = useState<string>('');

  // View Mode State (Grid vs Table)
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPiketGuru | null>(null);



  // Form State Single Assign
  const [formGuruId, setFormGuruId] = useState('');
  const [formHari, setFormHari] = useState<Hari>('SENIN');
  const [formPos, setFormPos] = useState('Piket Umum');
  const [formSlotMulai, setFormSlotMulai] = useState(1);
  const [formSlotSelesai, setFormSlotSelesai] = useState(10);
  const [formJamMulai, setFormJamMulai] = useState('06:30');
  const [formJamSelesai, setFormJamSelesai] = useState('15:30');
  const [formCatatan, setFormCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State Bulk Assign
  const [bulkGuruIds, setBulkGuruIds] = useState<string[]>([]);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [bulkHari, setBulkHari] = useState<Hari>('SENIN');
  const [bulkPos, setBulkPos] = useState('Piket Umum');
  const [bulkSlotMulai, setBulkSlotMulai] = useState(1);
  const [bulkSlotSelesai, setBulkSlotSelesai] = useState(10);
  const [bulkJamMulai, setBulkJamMulai] = useState('06:30');
  const [bulkJamSelesai, setBulkJamSelesai] = useState('15:30');

  // Confirm Delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);

  // Master Tenant Shift Slot Config
  const [tenantSlots, setTenantSlots] = useState<Record<number, { start: string; end: string }>>(DEFAULT_SLOT_TIMES);

  const getSlotStartTime = useCallback((slot: number) => {
    if (tenantSlots[slot]?.start) return tenantSlots[slot].start;
    if (DEFAULT_SLOT_TIMES[slot]?.start) return DEFAULT_SLOT_TIMES[slot].start;
    return '06:30';
  }, [tenantSlots]);

  const getSlotEndTime = useCallback((slot: number) => {
    if (tenantSlots[slot]?.end) return tenantSlots[slot].end;
    if (DEFAULT_SLOT_TIMES[slot]?.end) return DEFAULT_SLOT_TIMES[slot].end;
    return '15:30';
  }, [tenantSlots]);

  const handleFormSlotMulaiChange = (slot: number) => {
    setFormSlotMulai(slot);
    setFormJamMulai(getSlotStartTime(slot));
  };

  const handleFormSlotSelesaiChange = (slot: number) => {
    setFormSlotSelesai(slot);
    setFormJamSelesai(getSlotEndTime(slot));
  };

  const handleBulkSlotMulaiChange = (slot: number) => {
    setBulkSlotMulai(slot);
    setBulkJamMulai(getSlotStartTime(slot));
  };

  const handleBulkSlotSelesaiChange = (slot: number) => {
    setBulkSlotSelesai(slot);
    setBulkJamSelesai(getSlotEndTime(slot));
  };

  // Fetch Master Data (TP, Semester, Guru, Tenant, Jurusan)
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [tpRes, semRes, guruRes, tenantRes, jurusanRes] = await Promise.all([
          tahunPelajaranApi.getAll(),
          semesterApi.getAll(),
          guruApi.getAll({ limit: 1000 }),
          getMyTenant().catch(() => null),
          jurusanApi.getAll().catch(() => ({ success: false, data: [] }))
        ]);

        if (tpRes.success) {
          setTahunPelajaranList(tpRes.data || []);
          const activeTp = tpRes.data?.find(t => t.is_active);
          if (activeTp) setSelectedTpId(activeTp.id);
          else if (tpRes.data?.length) setSelectedTpId(tpRes.data[0].id);
        }

        if (semRes.success) {
          setSemesterList(semRes.data || []);
          const activeSem = semRes.data?.find(s => s.is_active);
          if (activeSem) setSelectedSemId(activeSem.id);
          else if (semRes.data?.length) setSelectedSemId(semRes.data[0].id);
        }

        if (guruRes.success) {
          setGuruList(guruRes.data || []);
        }

        if (jurusanRes?.success) {
          setJurusanList(jurusanRes.data || []);
        }

        if (tenantRes?.data?.shift_jam_pelajaran?.shifts?.[0]?.slots) {
          const rawSlots = tenantRes.data.shift_jam_pelajaran.shifts[0].slots;
          const mapped: Record<number, { start: string; end: string }> = {};
          rawSlots.forEach((s: any) => {
            if (s.slot) {
              mapped[s.slot] = { start: s.start || s.jam_mulai, end: s.end || s.jam_selesai };
            }
          });
          setTenantSlots(prev => ({ ...prev, ...mapped }));
        }
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };

    fetchMaster();
  }, []);

  const [teachingLoadMap, setTeachingLoadMap] = useState<Record<string, { total_jp: number; detail: Array<{ kelas: string; mapel: string; jam: string }> }>>({});

  const fetchTeachingLoad = useCallback(async () => {
    if (!selectedTpId || !selectedSemId) return;
    try {
      const res = await piketGuruApi.getTeachingLoad({
        tahun_pelajaran_id: selectedTpId,
        semester_id: selectedSemId,
        hari: activeHari
      });
      if (res.success) {
        setTeachingLoadMap(res.data || {});
      }
    } catch (err) {
      console.error('Failed to load teaching load:', err);
    }
  }, [selectedTpId, selectedSemId, activeHari]);

  useEffect(() => {
    fetchTeachingLoad();
  }, [fetchTeachingLoad]);

  const guruSelectOptions = useMemo(() => {
    return guruList.map(g => {
      const load = teachingLoadMap[g.id]?.total_jp || 0;
      const loadLabel = load === 0 ? '🟢 0 JP (Kosong)' : load >= 5 ? `🔴 ${load} JP (Padat)` : `🟡 ${load} JP`;
      return {
        value: g.id,
        label: `${g.nama_guru}${g.nip ? ` (NIP: ${g.nip})` : ''} - [${loadLabel}]`
      };
    });
  }, [guruList, teachingLoadMap]);

  const filteredBulkGuruList = useMemo(() => {
    if (!bulkSearchTerm.trim()) return guruList;
    const q = bulkSearchTerm.toLowerCase();
    return guruList.filter(g =>
      (g.nama_guru || '').toLowerCase().includes(q) ||
      (g.nip || '').toLowerCase().includes(q)
    );
  }, [guruList, bulkSearchTerm]);

  // Fetch Schedules when filters change
  const fetchSchedules = useCallback(async () => {
    if (!selectedTpId || !selectedSemId) return;
    setLoading(true);
    try {
      const res = await piketGuruApi.getList({
        tahun_pelajaran_id: selectedTpId,
        semester_id: selectedSemId
      });
      if (res.success) {
        setSchedules(res.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat jadwal piket:', err);
      toast.error('Gagal memuat data jadwal piket guru');
    } finally {
      setLoading(false);
    }
  }, [selectedTpId, selectedSemId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Group schedules by Hari
  const schedulesByHari = useMemo(() => {
    const map: Record<Hari, JadwalPiketGuru[]> = {
      SENIN: [],
      SELASA: [],
      RABU: [],
      KAMIS: [],
      JUMAT: [],
      SABTU: [],
      MINGGU: []
    };

    schedules.forEach(item => {
      if (map[item.hari]) {
        map[item.hari].push(item);
      }
    });

    return map;
  }, [schedules]);

  // Personal Duty on Active Hari (for Guru Consumer)
  const myDutyOnActiveHari = useMemo(() => {
    if (!currentGuruId) return null;
    return (schedulesByHari[activeHari] || []).find(s => s.guru_id === currentGuruId);
  }, [schedulesByHari, activeHari, currentGuruId]);

  // Filtered List for active tab
  const activeHariSchedules = useMemo(() => {
    let list = schedulesByHari[activeHari] || [];
    if (!isKurikulumAdmin && piketFilterMode === 'MY_PIKET' && currentGuruId) {
      list = list.filter(item => item.guru_id === currentGuruId);
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      item =>
        item.Guru?.nama_guru.toLowerCase().includes(term) ||
        item.Guru?.nip?.toLowerCase().includes(term) ||
        item.pos_piket?.toLowerCase().includes(term)
    );
  }, [schedulesByHari, activeHari, searchTerm, isKurikulumAdmin, piketFilterMode, currentGuruId]);

  // Statistics
  const stats = useMemo(() => {
    const totalAssigned = schedules.length;
    const activeTodayCount = (schedulesByHari[HARI_LIST[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.id || 'SENIN'] || []).length;
    
    // Day with max piket
    let maxDay = 'SENIN';
    let maxCount = 0;
    Object.entries(schedulesByHari).forEach(([day, items]) => {
      if (items.length > maxCount) {
        maxCount = items.length;
        maxDay = day;
      }
    });

    return [
      {
        title: 'Total Penugasan Piket',
        value: totalAssigned,
        icon: <Users size={14} />,
        gradient: 'from-indigo-500 to-blue-600',
        subtitle: 'Seluruh penugasan di semester aktif'
      },
      {
        title: 'Piket Hari Ini',
        value: activeTodayCount,
        icon: <UserCheck size={14} />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: 'Guru bertugas pada hari ini'
      },
      {
        title: 'Hari Terbanyak Piket',
        value: `${HARI_LIST.find(h => h.id === maxDay)?.label || maxDay} (${maxCount})`,
        icon: <Calendar size={14} />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Jumlah penugasan tertinggi'
      },
      {
        title: 'Status Jadwal',
        value: 'Aktif',
        icon: <ShieldCheck size={14} />,
        gradient: 'from-rose-500 to-pink-600',
        subtitle: 'Terhubung ke Modul Piket Kesiswaan'
      }
    ];
  }, [schedules, schedulesByHari]);

  // Actions
  const handleOpenAdd = (hari?: Hari) => {
    setEditingItem(null);
    setFormGuruId('');
    setFormHari(hari || activeHari);
    setFormPos('Piket Umum');
    setFormSlotMulai(1);
    setFormSlotSelesai(10);
    setFormJamMulai('06:30');
    setFormJamSelesai('15:30');
    setFormCatatan('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: JadwalPiketGuru) => {
    setEditingItem(item);
    setFormGuruId(item.guru_id);
    setFormHari(item.hari);
    setFormPos(item.pos_piket || 'Piket Umum');
    setFormSlotMulai(item.slot_mulai || 1);
    setFormSlotSelesai(item.slot_selesai || 10);
    setFormJamMulai(item.jam_mulai || '06:30');
    setFormJamSelesai(item.jam_selesai || '15:30');
    setFormCatatan(item.catatan || '');
    setIsModalOpen(true);
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGuruId) {
      toast.error('Silakan pilih guru terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        const res = await piketGuruApi.update(editingItem.id, {
          hari: formHari,
          pos_piket: formPos,
          slot_mulai: Number(formSlotMulai),
          slot_selesai: Number(formSlotSelesai),
          jam_mulai: formJamMulai,
          jam_selesai: formJamSelesai,
          catatan: formCatatan
        });
        if (res.success) {
          toast.success('Jadwal piket guru berhasil diperbarui');
          setIsModalOpen(false);
          await fetchSchedules();
        }
      } else {
        const res = await piketGuruApi.create({
          tahun_pelajaran_id: selectedTpId,
          semester_id: selectedSemId,
          guru_id: formGuruId,
          hari: formHari,
          pos_piket: formPos,
          slot_mulai: Number(formSlotMulai),
          slot_selesai: Number(formSlotSelesai),
          jam_mulai: formJamMulai,
          jam_selesai: formJamSelesai,
          catatan: formCatatan
        });
        if (res.success) {
          toast.success('Guru berhasil ditugaskan untuk piket');
          setIsModalOpen(false);
          await fetchSchedules();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan penugasan piket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkGuruIds.length) {
      toast.error('Silakan pilih minimal 1 guru');
      return;
    }

    setSubmitting(true);
    try {
      const res = await piketGuruApi.bulkCreate({
        tahun_pelajaran_id: selectedTpId,
        semester_id: selectedSemId,
        hari: bulkHari,
        guru_ids: bulkGuruIds,
        pos_piket: bulkPos,
        slot_mulai: Number(bulkSlotMulai),
        slot_selesai: Number(bulkSlotSelesai),
        jam_mulai: bulkJamMulai,
        jam_selesai: bulkJamSelesai
      });

      if (res.success) {
        toast.success(`Berhasil menugaskan ${res.data.length} guru untuk piket hari ${bulkHari}`);
        setIsBulkModalOpen(false);
        setBulkGuruIds([]);
        await fetchSchedules();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan penugasan piket massal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await piketGuruApi.delete(itemToDelete);
      if (res.success) {
        toast.success('Penugasan piket berhasil dihapus');
        await fetchSchedules();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menghapus penugasan piket');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <AcademicPageLayout
      title={isKurikulumAdmin ? "Penjadwalan & Pengelolaan Piket Guru" : "Jadwal Piket Guru & Penugasan Saya"}
      description={isKurikulumAdmin ? "Kelola alokasi penugasan guru piket harian per semester dan pos tugas sekolah." : "Lihat jadwal penugasan piket Anda dan daftar guru piket harian sekolah."}
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Jadwal Piket Guru' }
      ]}
      stats={stats}
      isLoadingStats={loading}
      instruction={{
        title: isKurikulumAdmin ? 'Panduan Pengelolaan Piket Guru (Kurikulum)' : 'Panduan Penugasan Piket Guru',
        description: isKurikulumAdmin ? 'Tentukan penugasan guru piket harian untuk menjaga kedisiplinan dan keamanan lingkungan sekolah.' : 'Informasi penugasan piket harian guru.',
        items: isKurikulumAdmin ? [
          { text: 'Pilih Tahun Pelajaran & Semester aktif sebagai konteks penugasan.' },
          { text: 'Klik tab Hari (Senin–Sabtu) untuk melihat daftar guru yang bertugas.' },
          { text: 'Gunakan tombol "+ Tambah Penugasan" untuk menambah guru piket perorangan atau "+ Penugasan Massal" untuk beberapa guru sekaligus.' },
          { text: 'Data piket yang dibuat di sini secara otomatis akan terdeteksi di Modul Kesiswaan Piket saat pencatatan izin siswa.' }
        ] : [
          { text: 'Gunakan filter "Piket Saya" untuk melihat penugasan piket milik Anda sendiri.' },
          { text: 'Klik tab Hari untuk melihat rekan guru lain yang bertugas pada hari tersebut.' },
          { text: 'Jika Anda bertugas hari ini, gunakan tombol "Buka Meja Piket" untuk memproses presensi/izin siswa.' }
        ]
      }}
    >
      <div className="space-y-6 pb-20">
        {/* FILTER BAR & ACTION BUTTONS */}
        <Card className="p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Filter size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Konteks Akademik:</span>
              </div>
              <select
                className="text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 py-1.5 px-3 focus:ring-2 focus:ring-indigo-500"
                value={selectedTpId}
                onChange={e => setSelectedTpId(e.target.value)}
              >
                {tahunPelajaranList.map(tp => (
                  <option key={tp.id} value={tp.id}>
                    TP {tp.tahun} {tp.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
              <select
                className="text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 py-1.5 px-3 focus:ring-2 focus:ring-indigo-500"
                value={selectedSemId}
                onChange={e => setSelectedSemId(e.target.value)}
              >
                {semesterList.map(sem => (
                  <option key={sem.id} value={sem.id}>
                    {sem.nama_semester} {sem.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              {isKurikulumAdmin ? (
                <>
                  <button
                    onClick={() => setIsNotifModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition shadow-2xs"
                  >
                    <Bell size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Pengaturan WA Group</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkHari(activeHari);
                      setBulkGuruIds([]);
                      setBulkPos('Piket Umum');
                      setIsBulkModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>+ Penugasan Massal</span>
                  </button>

                  <button
                    onClick={() => handleOpenAdd()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                  >
                    <Plus size={15} />
                    <span>+ Tambah Guru Piket</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPiketFilterMode(p => p === 'ALL' ? 'MY_PIKET' : 'ALL')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                      piketFilterMode === 'MY_PIKET'
                        ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <UserCheck size={14} />
                    <span>{piketFilterMode === 'MY_PIKET' ? '👤 Piket Saya (Aktif)' : '👥 Tampilkan Piket Saya'}</span>
                  </button>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    <Eye size={12} /> Mode Lihat
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* DAY TABS & CONTENT */}
        <Card className="p-4 sm:p-6 shadow-sm">
          {/* DAY NAVIGATION TABS */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1">
                {HARI_LIST.map(hari => {
                  const count = (schedulesByHari[hari.id] || []).length;
                  const isActive = activeHari === hari.id;
                  return (
                    <button
                      key={hari.id}
                      onClick={() => setActiveHari(hari.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{hari.label}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* SEARCH INPUT & VIEW SWITCHER */}
              <div className="flex items-center gap-2">
                {/* VIEW MODE SWITCHER */}
                <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewMode('GRID')}
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                      viewMode === 'GRID'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Tampilan Kartu (Grid)"
                  >
                    <LayoutGrid size={14} />
                    <span className="hidden sm:inline">Kartu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('TABLE')}
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                      viewMode === 'TABLE'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Tampilan Tabel"
                  >
                    <Table size={14} />
                    <span className="hidden sm:inline">Tabel</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari guru piket..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PERSONAL DUTY BANNER FOR GURU CONSUMER */}
          {myDutyOnActiveHari && (
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400 text-slate-900 rounded-xl font-black shrink-0 shadow-xs">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30">
                      Tugas Piket Anda
                    </span>
                    <span className="text-xs text-purple-200 font-semibold">
                      Hari {HARI_LIST.find(h => h.id === activeHari)?.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {myDutyOnActiveHari.pos_piket || 'Piket Umum'} (Slot Jam Ke-{myDutyOnActiveHari.slot_mulai || 1} s/d {myDutyOnActiveHari.slot_selesai || 10} • {myDutyOnActiveHari.jam_mulai} - {myDutyOnActiveHari.jam_selesai} WIB)
                  </div>
                </div>
              </div>
              <Link
                to="/kesiswaan/piket"
                className="px-4 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg shadow-sm transition shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Buka Meja Piket</span>
                <span>→</span>
              </Link>
            </div>
          )}

          {/* SCHEDULE LIST CONTENT (GRID / TABLE) */}
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent mb-3" />
              <p className="text-xs">Memuat daftar jadwal piket guru...</p>
            </div>
          ) : activeHariSchedules.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <ShieldCheck size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Belum Ada Guru Piket untuk Hari {HARI_LIST.find(h => h.id === activeHari)?.label}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                {isKurikulumAdmin
                  ? 'Tambahkan alokasi penugasan piket untuk hari ini agar operasional piket berjalan lancar.'
                  : 'Tidak ada penugasan guru piket yang ditemukan untuk hari ini.'}
              </p>
              {isKurikulumAdmin && (
                <button
                  onClick={() => handleOpenAdd(activeHari)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
                >
                  <Plus size={14} />
                  <span>Tugaskan Guru Piket</span>
                </button>
              )}
            </div>
          ) : viewMode === 'GRID' ? (
            /* MODE KARTU (GRID VIEW) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeHariSchedules.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition shadow-xs flex flex-col justify-between ${
                    currentGuruId && item.guru_id === currentGuruId
                      ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-400/40'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-600'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm overflow-hidden border border-indigo-200 dark:border-indigo-800 shrink-0">
                          {item.Guru?.foto ? (
                            <img src={item.Guru.foto} alt={item.Guru.nama_guru} className="w-full h-full object-cover" />
                          ) : (
                            item.Guru?.nama_guru?.substring(0, 2).toUpperCase() || 'GP'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                              {item.Guru?.nama_guru || 'Guru'}
                            </h4>
                            {currentGuruId && item.guru_id === currentGuruId && (
                              <span className="px-1.5 py-0.2 text-[9px] font-black bg-indigo-600 text-white rounded-full">Anda</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            NIP: {item.Guru?.nip || '-'}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPosBadgeStyle(item.pos_piket || 'Piket Umum')}`}>
                        {item.pos_piket || 'Piket Umum'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>Slot Piket: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Jam Ke-{item.slot_mulai || 1} s/d {item.slot_selesai || 10} ({item.jam_mulai || '06:30'} - {item.jam_selesai || '15:30'})
                        </span>
                      </div>
                      {item.catatan && (
                        <div className="flex items-start gap-2 text-[11px] text-slate-500 italic">
                          <FileText size={13} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>"{item.catatan}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      Hari: <strong className="text-slate-600 dark:text-slate-300">{item.hari}</strong>
                    </span>
                    {isKurikulumAdmin ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition"
                          title="Edit Penugasan"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete(item.id);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                          title="Hapus Penugasan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={12} /> Terjadwal
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* MODE TABEL (TABLE VIEW) */
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-200">
                <thead className="text-[11px] font-bold uppercase bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Hari</th>
                    <th className="py-3 px-4">Guru Bertugas</th>
                    <th className="py-3 px-4">Waktu & Slot Jam</th>
                    <th className="py-3 px-4">Jenis / Pos Piket</th>
                    <th className="py-3 px-4">Catatan / Mandat</th>
                    {isKurikulumAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-900">
                  {activeHariSchedules.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                        currentGuruId && item.guru_id === currentGuruId ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">{item.hari}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs overflow-hidden border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {item.Guru?.foto ? (
                              <img src={item.Guru.foto} alt={item.Guru.nama_guru} className="w-full h-full object-cover" />
                            ) : (
                              item.Guru?.nama_guru?.substring(0, 2).toUpperCase() || 'GP'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{item.Guru?.nama_guru || '-'}</span>
                              {currentGuruId && item.guru_id === currentGuruId && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black bg-indigo-600 text-white rounded-full">Anda</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">NIP: {item.Guru?.nip || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          Jam Ke-{item.slot_mulai || 1} s/d {item.slot_selesai || 10}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          ({item.jam_mulai || '06:30'} s/d {item.jam_selesai || '15:30'})
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getPosBadgeStyle(item.pos_piket || 'Piket Umum')}`}>
                          📌 {(item.pos_piket || 'Piket Umum').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 italic text-slate-500 dark:text-slate-400 max-w-xs">
                        {item.catatan ? `"${item.catatan}"` : '-'}
                      </td>
                      {isKurikulumAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition"
                              title="Edit Penugasan"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(item.id);
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                              title="Hapus Penugasan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </Card>
      </div>

      {/* MODAL ADD / EDIT SINGLE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={18} />
                <span>{editingItem ? 'Edit Penugasan Piket Guru' : 'Tambah Penugasan Piket Guru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingle} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Guru <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={formGuruId}
                  onValueChange={(val) => setFormGuruId(val)}
                  options={guruSelectOptions}
                  placeholder="-- Cari & Pilih Guru --"
                  searchPlaceholder="Ketik Nama / NIP Guru..."
                  disabled={!!editingItem}
                />

                {formGuruId && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px]">
                    {teachingLoadMap[formGuruId]?.total_jp ? (
                      <div className="text-amber-700 dark:text-amber-300 font-medium">
                        ⚠️ Guru ini mengajar <strong>{teachingLoadMap[formGuruId].total_jp} JP</strong> pada hari {formHari}.
                      </div>
                    ) : (
                      <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                        ✅ Guru ini <strong>bebas mengajar (0 JP)</strong> pada hari {formHari} (Sangat cocok untuk Piket Utama).
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Hari Piket <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formHari}
                    onChange={e => setFormHari(e.target.value as Hari)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    {HARI_LIST.map(h => (
                      <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pos / Peran Piket
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Piket Umum / Piket Jurusan RPL"
                    value={formPos}
                    onChange={e => setFormPos(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormPos('Piket Umum')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/60"
                    >
                      🏫 Piket Umum
                    </button>
                    {isSmk && (
                      <button
                        type="button"
                        onClick={() => setFormPos('Piket Jurusan')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60"
                      >
                        🛠️ Piket Jurusan
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dari Jam Ke-
                  </label>
                  <select
                    value={formSlotMulai}
                    onChange={e => handleFormSlotMulaiChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(slot => {
                      const busySlots = (formGuruId ? teachingLoadMap[formGuruId]?.busy_slots : []) || [];
                      const isBusy = busySlots.includes(slot);
                      const detail = formGuruId ? teachingLoadMap[formGuruId]?.detail?.find(d => d.slot_index === slot) : null;
                      const slotTime = tenantSlots[slot] || DEFAULT_SLOT_TIMES[slot];
                      const timeText = slotTime ? ` (${slotTime.start} - ${slotTime.end})` : '';
                      return (
                        <option key={slot} value={slot}>
                          {isBusy ? `🔴 Jam Ke-${slot}${timeText} - ⚠️ Mengajar ${detail?.kelas || ''}` : `Jam Ke-${slot}${timeText}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sampai Jam Ke-
                  </label>
                  <select
                    value={formSlotSelesai}
                    onChange={e => handleFormSlotSelesaiChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(slot => {
                      const busySlots = (formGuruId ? teachingLoadMap[formGuruId]?.busy_slots : []) || [];
                      const isBusy = busySlots.includes(slot);
                      const detail = formGuruId ? teachingLoadMap[formGuruId]?.detail?.find(d => d.slot_index === slot) : null;
                      const slotTime = tenantSlots[slot] || DEFAULT_SLOT_TIMES[slot];
                      const timeText = slotTime ? ` (${slotTime.start} - ${slotTime.end})` : '';
                      return (
                        <option key={slot} value={slot}>
                          {isBusy ? `🔴 Jam Ke-${slot}${timeText} - ⚠️ Mengajar ${detail?.kelas || ''}` : `Jam Ke-${slot}${timeText}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Conflict Alert for Selected Range */}
              {(() => {
                const busySlots = (formGuruId ? teachingLoadMap[formGuruId]?.busy_slots : []) || [];
                const minS = Math.min(formSlotMulai, formSlotSelesai);
                const maxS = Math.max(formSlotMulai, formSlotSelesai);
                const overlaps = busySlots.filter(s => s >= minS && s <= maxS);
                if (overlaps.length === 0) return null;
                return (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                    ⚠️ <strong>Peringatan Beririsan Jam Mengajar:</strong> Slot Jam Ke-{minS} s/d {maxS} beririsan dengan {overlaps.length} JP mengajar guru (Jam Ke-{overlaps.join(', ')}).
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai (WIB)
                  </label>
                  <input
                    type="text"
                    placeholder="06:30"
                    value={formJamMulai}
                    onChange={e => setFormJamMulai(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jam Selesai (WIB)
                  </label>
                  <input
                    type="text"
                    placeholder="15:30"
                    value={formJamSelesai}
                    onChange={e => setFormJamSelesai(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Tugas Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan peran piket..."
                  value={formCatatan}
                  onChange={e => setFormCatatan(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BULK ASSIGN */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="text-indigo-600 dark:text-indigo-400" size={18} />
                <span>Penugasan Piket Guru Massal</span>
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBulk} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Hari Piket <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bulkHari}
                    onChange={e => setBulkHari(e.target.value as Hari)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    {HARI_LIST.map(h => (
                      <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pos / Peran Piket
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Piket Umum / Piket Jurusan RPL"
                    value={bulkPos}
                    onChange={e => setBulkPos(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setBulkPos('Piket Umum')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/60"
                    >
                      🏫 Piket Umum
                    </button>
                    {isSmk && (
                      <button
                        type="button"
                        onClick={() => setBulkPos('Piket Jurusan')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60"
                      >
                        🛠️ Piket Jurusan
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Guru Bertugas (Bisa Beberapa Guru) <span className="text-rose-500">*</span>
                </label>

                {/* Quick Add Via SearchableSelect */}
                <div className="mb-2">
                  <SearchableSelect
                    value=""
                    onValueChange={(val) => {
                      if (val && !bulkGuruIds.includes(val)) {
                        setBulkGuruIds(prev => [...prev, val]);
                      }
                    }}
                    options={guruSelectOptions.filter(opt => !bulkGuruIds.includes(opt.value))}
                    placeholder="➕ Cari & Tambah Guru Spesifik..."
                    searchPlaceholder="Ketik Nama / NIP Guru..."
                  />
                </div>

                {/* Filter & Select All / Deselect All Bar */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Cari / filter nama & NIP guru..."
                      value={bulkSearchTerm}
                      onChange={(e) => setBulkSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const idsToAdd = filteredBulkGuruList.map(g => g.id);
                      setBulkGuruIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                    }}
                    className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 hover:bg-indigo-100 shrink-0 cursor-pointer"
                  >
                    Pilih Semua ({filteredBulkGuruList.length})
                  </button>
                  {bulkGuruIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBulkGuruIds([])}
                      className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 hover:bg-rose-100 shrink-0 cursor-pointer"
                    >
                      Hapus Pilihan
                    </button>
                  )}
                </div>

                {/* Selected Teachers Chips */}
                {bulkGuruIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 max-h-24 overflow-y-auto p-2 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                    {bulkGuruIds.map(id => {
                      const g = guruList.find(item => item.id === id);
                      if (!g) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                          {g.nama_guru}
                          <button
                            type="button"
                            onClick={() => setBulkGuruIds(prev => prev.filter(x => x !== id))}
                            className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Scrollable Teacher Checkboxes */}
                <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
                  {filteredBulkGuruList.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 font-medium">Tidak ada guru yang cocok dengan pencarian</div>
                  ) : (
                    filteredBulkGuruList.map(g => {
                      const isChecked = bulkGuruIds.includes(g.id);
                      const load = teachingLoadMap[g.id]?.total_jp || 0;
                      return (
                        <label
                          key={g.id}
                          className={`flex items-center justify-between p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition text-xs ${
                            isChecked ? 'bg-indigo-50/80 dark:bg-indigo-950/40 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setBulkGuruIds(prev => [...prev, g.id]);
                                } else {
                                  setBulkGuruIds(prev => prev.filter(id => id !== g.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{g.nama_guru}</span>
                            {g.nip && <span className="text-[10px] text-slate-400 shrink-0">(NIP: {g.nip})</span>}
                          </div>
                          <span className="text-[10px] font-bold shrink-0 ml-2">
                            {load === 0 ? <span className="text-emerald-600">🟢 0 JP</span> : <span className="text-amber-600">🟡 {load} JP</span>}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Terpilih: <strong>{bulkGuruIds.length}</strong> dari {guruList.length} guru
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dari Jam Ke-
                  </label>
                  <select
                    value={bulkSlotMulai}
                    onChange={e => handleBulkSlotMulaiChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(slot => {
                      const slotTime = tenantSlots[slot] || DEFAULT_SLOT_TIMES[slot];
                      const timeText = slotTime ? ` (${slotTime.start} - ${slotTime.end})` : '';
                      return (
                        <option key={slot} value={slot}>
                          Jam Ke-{slot}{timeText}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sampai Jam Ke-
                  </label>
                  <select
                    value={bulkSlotSelesai}
                    onChange={e => handleBulkSlotSelesaiChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(slot => {
                      const slotTime = tenantSlots[slot] || DEFAULT_SLOT_TIMES[slot];
                      const timeText = slotTime ? ` (${slotTime.start} - ${slotTime.end})` : '';
                      return (
                        <option key={slot} value={slot}>
                          Jam Ke-{slot}{timeText}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai (WIB)
                  </label>
                  <input
                    type="text"
                    placeholder="06:30"
                    value={bulkJamMulai}
                    onChange={e => setBulkJamMulai(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jam Selesai (WIB)
                  </label>
                  <input
                    type="text"
                    placeholder="15:30"
                    value={bulkJamSelesai}
                    onChange={e => setBulkJamSelesai(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !bulkGuruIds.length}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Penugasan Massal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Hapus Penugasan Guru Piket"
        description="Apakah Anda yakin ingin menghapus penugasan piket guru ini? Guru tidak lagi terdaftar sebagai guru piket pada hari tersebut."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        style="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
      />

      {/* NOTIF WA GROUP CONFIG MODAL */}
      <PiketNotifModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />
    </AcademicPageLayout>
  );
}

