import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FileText
} from 'lucide-react';
import { piketGuruApi, JadwalPiketGuru, Hari } from '../../api/piketGuru.api';
import { guruApi, tahunPelajaranApi, semesterApi } from '../../api/academic.api';
import type { Guru } from '../../types/academic';

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
  const [activeHari, setActiveHari] = useState<Hari>('SENIN');
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

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPiketGuru | null>(null);

  // Form State Single Assign
  const [formGuruId, setFormGuruId] = useState('');
  const [formHari, setFormHari] = useState<Hari>('SENIN');
  const [formPos, setFormPos] = useState('Piket Umum');
  const [formJamMulai, setFormJamMulai] = useState('06:30');
  const [formJamSelesai, setFormJamSelesai] = useState('15:30');
  const [formCatatan, setFormCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State Bulk Assign
  const [bulkGuruIds, setBulkGuruIds] = useState<string[]>([]);
  const [bulkHari, setBulkHari] = useState<Hari>('SENIN');
  const [bulkPos, setBulkPos] = useState('Piket Umum');
  const [bulkJamMulai, setBulkJamMulai] = useState('06:30');
  const [bulkJamSelesai, setBulkJamSelesai] = useState('15:30');

  // Confirm Delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Master Data (TP, Semester, Guru)
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [tpRes, semRes, guruRes] = await Promise.all([
          tahunPelajaranApi.getAll(),
          semesterApi.getAll(),
          guruApi.getAll()
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

  // Filtered List for active tab
  const activeHariSchedules = useMemo(() => {
    const list = schedulesByHari[activeHari] || [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      item =>
        item.Guru?.nama_guru.toLowerCase().includes(term) ||
        item.Guru?.nip?.toLowerCase().includes(term) ||
        item.pos_piket?.toLowerCase().includes(term)
    );
  }, [schedulesByHari, activeHari, searchTerm]);

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
      title="Penjadwalan Piket Guru"
      description="Kelola alokasi penugasan guru piket harian per semester dan pos tugas sekolah."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Jadwal Piket Guru' }
      ]}
      stats={stats}
      isLoadingStats={loading}
      instruction={{
        title: 'Panduan Penjadwalan Piket Guru',
        description: 'Tentukan penugasan guru piket harian untuk menjaga kedisiplinan dan keamanan lingkungan sekolah.',
        items: [
          { text: 'Pilih Tahun Pelajaran & Semester aktif sebagai konteks penugasan.' },
          { text: 'Klik tab Hari (Senin–Sabtu) untuk melihat daftar guru yang bertugas.' },
          { text: 'Gunakan tombol "+ Tambah Penugasan" untuk menambah guru piket perorangan atau "+ Penugasan Massal" untuk beberapa guru sekaligus.' },
          { text: 'Data piket yang dibuat di sini secara otomatis akan terdeteksi di Modul Kesiswaan Piket saat pencatatan izin siswa.' }
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

              {/* SEARCH INPUT */}
              <div className="relative w-full sm:w-64">
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

          {/* SCHEDULE CARDS GRID */}
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
                Tambahkan alokasi penugasan piket untuk hari ini agar operasional piket berjalan lancar.
              </p>
              <button
                onClick={() => handleOpenAdd(activeHari)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus size={14} />
                <span>Tugaskan Guru Piket</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeHariSchedules.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-600 transition shadow-xs flex flex-col justify-between"
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
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {item.Guru?.nama_guru || 'Guru'}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            NIP: {item.Guru?.nip || '-'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                        {item.pos_piket || 'Piket Umum'}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>Jam Operasional: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.jam_mulai || '06:30'} - {item.jam_selesai || '15:30'} WIB
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
                  </div>
                </div>
              ))}
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
                <select
                  required
                  disabled={!!editingItem}
                  value={formGuruId}
                  onChange={e => setFormGuruId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Guru --</option>
                  {guruList.map(g => {
                    const load = teachingLoadMap[g.id]?.total_jp || 0;
                    return (
                      <option key={g.id} value={g.id}>
                        {g.nama_guru} {g.nip ? `(NIP: ${g.nip})` : ''} - [{load === 0 ? '🟢 0 JP (Kosong)' : load >= 5 ? `🔴 ${load} JP (Padat)` : `🟡 ${load} JP`}]
                      </option>
                    );
                  })}
                </select>

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
                    placeholder="Contoh: Piket Gerbang / Gedung A"
                    value={formPos}
                    onChange={e => setFormPos(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai
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
                    Jam Selesai
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
                    placeholder="Piket Umum"
                    value={bulkPos}
                    onChange={e => setBulkPos(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 px-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Guru Bertugas (Bisa Beberapa Guru) <span className="text-rose-500">*</span>
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
                  {guruList.map(g => {
                    const isChecked = bulkGuruIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition text-xs"
                      >
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
                        <span className="font-medium text-slate-800 dark:text-slate-200">{g.nama_guru}</span>
                        {g.nip && <span className="text-[10px] text-slate-400">(NIP: {g.nip})</span>}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Terpilih: <strong>{bulkGuruIds.length}</strong> guru
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai
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
                    Jam Selesai
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
    </AcademicPageLayout>
  );
}
