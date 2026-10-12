import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Sparkles,
  Plus,
  Search,
  User,
  Users,
  Edit3,
  Trash2,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  CalendarDays,
  GraduationCap,
  Printer,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useWaliKelasOptions } from '@/hooks/useWaliKelasOptions';
import { usePembinaUpacara } from '@/hooks/attendance/usePembinaUpacara';
import {
  JadwalPembinaUpacaraItem,
  CreatePembinaUpacaraPayload,
  AutoGenerateUpacaraPayload,
  StatusPelaksanaanUpacara,
} from '@/api/attendance/pembinaUpacara.api';
import { Button, SectionCard } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Table, type Column } from '@/components/ui/Table';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useConfirm } from '@/providers/ConfirmProvider';
import { PembinaUpacaraFormModal } from '@/components/attendance/pembina-upacara/PembinaUpacaraFormModal';
import { AutoGenerateUpacaraModal } from '@/components/attendance/pembina-upacara/AutoGenerateUpacaraModal';
import { CetakDokumenUpacaraModal } from '@/components/attendance/pembina-upacara/CetakDokumenUpacaraModal';
import { PengaturanNotifUpacaraModal } from '@/components/attendance/pembina-upacara/PengaturanNotifUpacaraModal';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';

export default React.memo(function JadwalPembinaUpacaraPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  // Konteks Akademik
  const {
    selectedTahunPelajaran: selectedTpId,
    selectedSemester: selectedSemId,
    handleTpChange: setSelectedTpId,
    handleSemesterChange: setSelectedSemId,
    tpOptions,
    semesterOptions,
    tpRawList: tahunPelajaranList,
  } = useAcademicContext();

  const activeTpData =
    tahunPelajaranList.find((tp) => tp.id === selectedTpId) ||
    tahunPelajaranList.find((tp) => tp.is_active) ||
    tahunPelajaranList[0];
  const activeTahunPelajaranId = selectedTpId || activeTpData?.id || '';

  // Data References
  const { rawList: guruList, isLoading: loadingGuru } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: classList, isLoading: loadingKelas } = useKelasOptions();
  const { rawList: waliKelasList, isLoading: loadingWaliKelas } = useWaliKelasOptions({ onlyActive: true });

  const activeSemesterData = semesterOptions.find((s) => s.value === selectedSemId);
  const academicContextLabel = `${activeTpData?.tahun || ''} ${activeSemesterData?.label ? `— ${activeSemesterData.label}` : ''}`.trim();

  // Data Schedules
  const {
    list: schedules,
    isLoading: loadingSchedules,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkDeleteMutation,
    autoGenerateMutation,
  } = usePembinaUpacara({
    tahun_pelajaran_id: selectedTpId,
    semester_id: selectedSemId,
  });

  // Local UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusPelaksanaanUpacara>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWaConfigModalOpen, setIsWaConfigModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPembinaUpacaraItem | null>(null);

  // Filtered List
  const filteredList = useMemo(() => {
    return schedules.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const searchLower = searchTerm.toLowerCase().trim();
      if (!searchLower) return matchStatus;

      const guruNama = item.GuruUtama?.nama_guru?.toLowerCase() || '';
      const nipGuru = item.GuruUtama?.nip?.toLowerCase() || '';
      const penggantiNama = item.GuruPengganti?.nama_guru?.toLowerCase() || '';
      const kelasNama = item.KelasPetugas?.nama_kelas?.toLowerCase() || '';
      const tema = item.tema_amanat?.toLowerCase() || '';

      const matchSearch =
        guruNama.includes(searchLower) ||
        nipGuru.includes(searchLower) ||
        penggantiNama.includes(searchLower) ||
        kelasNama.includes(searchLower) ||
        tema.includes(searchLower);

      return matchStatus && matchSearch;
    });
  }, [schedules, statusFilter, searchTerm]);

  // Reset page and selections when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowKeys(new Set());
  }, [searchTerm, statusFilter, selectedTpId, selectedSemId]);

  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: JadwalPembinaUpacaraItem) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string, tanggalStr: string, namaGuru: string) => {
      const tglFormatted = new Date(tanggalStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const ok = await confirm({
        title: 'Hapus Jadwal Pembina Upacara?',
        description: `Apakah Anda yakin ingin menghapus jadwal upacara tanggal ${tglFormatted} dengan pembina ${namaGuru}?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger',
      });
      if (ok) {
        await deleteMutation.mutateAsync(id);
        setSelectedRowKeys((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [confirm, deleteMutation]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedRowKeys.size === 0) return;
    const ok = await confirm({
      title: 'Hapus Jadwal Terpilih',
      description: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.size} jadwal pembina upacara terpilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: `Ya, Hapus (${selectedRowKeys.size})`,
      cancelText: 'Batal',
      style: 'danger',
    });
    if (ok) {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedRowKeys));
      setSelectedRowKeys(new Set());
    }
  }, [confirm, selectedRowKeys, bulkDeleteMutation]);

  const handleFormSubmit = useCallback(
    async (payload: CreatePembinaUpacaraPayload) => {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    },
    [editingItem, updateMutation, createMutation]
  );

  const handleAutoSubmit = useCallback(
    async (payload: AutoGenerateUpacaraPayload) => {
      await autoGenerateMutation.mutateAsync(payload);
    },
    [autoGenerateMutation]
  );

  const loading = loadingGuru || loadingKelas || loadingSchedules || loadingWaliKelas;

  // 1. Analytics Cards
  const academicStats = useMemo(() => {
    const total = schedules.length;
    const selesai = schedules.filter((s) => s.status === 'SELESAI').length;
    const digantikan = schedules.filter((s) => s.status === 'DIGANTIKAN').length;
    const totalWali = waliKelasList.length;

    return [
      {
        title: 'Total Upacara Semester Ini',
        value: total,
        subtitle: `${selesai} selesai dilaksanakan`,
        icon: <CalendarDays className="w-4 h-4 text-indigo-500" />,
        gradient: 'from-indigo-500 to-blue-600',
      },
      {
        title: 'Wali Kelas Terdata',
        value: totalWali,
        subtitle: 'Sumber rotasi pembina upacara',
        icon: <GraduationCap className="w-4 h-4 text-emerald-500" />,
        gradient: 'from-emerald-500 to-teal-600',
      },
      {
        title: 'Pelaksanaan Selesai',
        value: selesai,
        subtitle: `${total - selesai} jadwal tersisa`,
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
        gradient: 'from-green-500 to-emerald-600',
      },
      {
        title: 'Handover / Digantikan',
        value: digantikan,
        subtitle: 'Guru pengganti bertugas',
        icon: <ShieldAlert className="w-4 h-4 text-amber-500" />,
        gradient: 'from-amber-500 to-orange-600',
      },
    ];
  }, [schedules, waliKelasList]);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Presensi', path: '/attendance' },
      { label: 'Kesiswaan', path: '/kesiswaan/jadwal-kegiatan' },
      { label: 'Jadwal Pembina Upacara' },
    ],
    []
  );

  // Status Badge Renderer
  const renderStatusBadge = useCallback((status: StatusPelaksanaanUpacara) => {
    switch (status) {
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Selesai
          </span>
        );
      case 'DIGANTIKAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-3 h-3" />
            Digantikan
          </span>
        );
      case 'DIJADWALKAN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Clock className="w-3 h-3" />
            Dijadwalkan
          </span>
        );
    }
  }, []);

  // Table Columns (Desktop)
  const columns: Column[] = useMemo(
    () => [
      {
        key: 'tanggal',
        label: 'Tanggal / Pekan',
        render: (_val: unknown, row: JadwalPembinaUpacaraItem) => {
          const dateObj = new Date(row.tanggal);
          const formattedDate = dateObj.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const hariNama = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
          return (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-slate-800 dark:text-slate-100">{formattedDate}</div>
                <div className="text-[11px] text-slate-400 font-semibold">{hariNama}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'pembina',
        label: 'Pembina Upacara',
        render: (_val: unknown, row: JadwalPembinaUpacaraItem) => {
          const isReplaced = !!row.guru_pengganti_id;
          return (
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className={isReplaced ? 'line-through text-slate-400' : ''}>
                  {row.GuruUtama?.nama_guru || '-'}
                </span>
              </div>
              {isReplaced && row.GuruPengganti && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg w-fit">
                  <ArrowRight className="w-3 h-3" />
                  Digantikan: {row.GuruPengganti.nama_guru}
                </div>
              )}
              {row.GuruUtama?.nip && !isReplaced && (
                <div className="text-[10px] text-slate-400 font-mono">NIP: {row.GuruUtama.nip}</div>
              )}
            </div>
          );
        },
      },
      {
        key: 'kelas_petugas',
        label: 'Kelas Petugas',
        render: (_val: unknown, row: JadwalPembinaUpacaraItem) => (
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {row.KelasPetugas?.nama_kelas || '-'}
          </div>
        ),
      },
      {
        key: 'tema_amanat',
        label: 'Amanat / Tema',
        render: (_val: unknown, row: JadwalPembinaUpacaraItem) => (
          <div className="max-w-xs text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
            {row.tema_amanat || <span className="italic text-slate-400">Belum ada tema ditentukan</span>}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (_val: unknown, row: JadwalPembinaUpacaraItem) => renderStatusBadge(row.status),
      },
      {
        key: 'actions',
        label: 'Aksi',
        className: 'text-right',
        render: (_val: unknown, row: JadwalPembinaUpacaraItem) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleOpenEdit(row)}
              aria-label="Edit Jadwal"
              className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
              title="Edit / Ganti Pembina"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(row.id, row.tanggal, row.GuruUtama?.nama_guru || 'Guru')}
              aria-label="Hapus Jadwal"
              className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              title="Hapus Jadwal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenEdit, handleDelete, renderStatusBadge]
  );

  // Mobile Card Renderer
  const renderUpacaraMobileCard = useCallback(
    (item: JadwalPembinaUpacaraItem) => {
      const dateObj = new Date(item.tanggal);
      const formattedDate = dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const hariNama = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      const isReplaced = !!item.guru_pengganti_id;
      const isSelected = selectedRowKeys.has(item.id);

      const toggleSelect = () => {
        setSelectedRowKeys((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      };

      return (
        <div
          key={item.id}
          className={`bg-white dark:bg-slate-900 border ${
            isSelected
              ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-slate-200/80 dark:border-slate-800'
          } rounded-2xl p-4 shadow-xs space-y-3 transition-colors`}
        >
          {/* Header Card: Checkbox + Tanggal & Badge Status */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={toggleSelect}
                aria-label={`Pilih jadwal ${formattedDate}`}
              />
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{formattedDate}</div>
                <div className="text-[11px] text-slate-400 font-semibold">{hariNama}</div>
              </div>
            </div>
            <div>{renderStatusBadge(item.status)}</div>
          </div>

          {/* Body Card: Pembina & Rombel */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-400 font-medium">Pembina:</span>
              <div className="text-right font-bold text-slate-800 dark:text-slate-200">
                <span className={isReplaced ? 'line-through text-slate-400 mr-1' : ''}>
                  {item.GuruUtama?.nama_guru || '-'}
                </span>
                {isReplaced && item.GuruPengganti && (
                  <span className="text-amber-600 dark:text-amber-400 block text-[11px]">
                    (Ganti: {item.GuruPengganti.nama_guru})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 font-medium">Petugas Rombel:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {item.KelasPetugas?.nama_kelas || '-'}
              </span>
            </div>

            {item.tema_amanat && (
              <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                "{item.tema_amanat}"
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEdit(item)}
              className="text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(item.id, item.tanggal, item.GuruUtama?.nama_guru || 'Guru')}
              className="text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </Button>
          </div>
        </div>
      );
    },
    [handleOpenEdit, handleDelete, renderStatusBadge, selectedRowKeys]
  );

  return (
    <AcademicPageLayout
      title="Jadwal Pembina Upacara"
      description="Susun jadwal giliran pembina upacara bendera hari Senin, kelas petugas pengibar, dan tema amanat upacara per semester."
      breadcrumbs={breadcrumbs}
      stats={academicStats}
      isLoadingStats={loading}
      hardeningModuleKey="attendance_jadwal_kegiatan"
      instruction={{
        title: 'Panduan Jadwal Pembina Upacara',
        description: 'Kelola daftar guru pembina dan kelas pelaksana upacara bendera hari Senin.',
        items: [
          {
            text: 'Gunakan tombol Auto-Generate 1 Semester untuk membagi rotasi guru pembina dan rombel petugas secara merata dalam satu klik.',
          },
          {
            text: 'Jika pembina utama berhalangan atau dinas luar, klik Edit lalu pilih Guru Pengganti (Handover) tanpa menghapus jadwal asli.',
          },
          {
            text: 'Cetak jadwal resmi berkop surat kedinasan menggunakan tombol Cetak ke PDF untuk dibagikan ke dewan guru.',
          },
        ],
      }}
    >
      <PremiumFeatureGate
        isLocked={false}
        featureName="Jadwal Pembina Upacara"
        moduleName="KESISWAAN"
        description="Kelola jadwal giliran pembina dan petugas upacara bendera sekolah."
      >
        <SectionCard fullWidth noPadding>
          {isMobile ? (
            /* ── MOBILE VIEW ─────────────────────────────────────────── */
            <div className="p-4 space-y-4">
              {/* Mobile Search & Filter Section */}
              <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                {/* Search Input */}
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Cari pembina, kelas, tema..."
                    aria-label="Cari jadwal upacara"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="h-4 w-4 text-slate-400" />}
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <SearchableSelect
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as any)}
                    options={[
                      { label: 'Semua Status', value: 'ALL' },
                      { label: 'Dijadwalkan', value: 'DIJADWALKAN' },
                      { label: 'Selesai', value: 'SELESAI' },
                      { label: 'Digantikan', value: 'DIGANTIKAN' },
                    ]}
                    placeholder="Status"
                    triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />

                  <SearchableSelect
                    value={selectedTpId}
                    onValueChange={setSelectedTpId}
                    options={tpOptions}
                    placeholder="Tahun Pelajaran"
                    triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />

                  <SearchableSelect
                    value={selectedSemId}
                    onValueChange={setSelectedSemId}
                    options={semesterOptions}
                    placeholder="Semester"
                    triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Action Buttons on Mobile */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {selectedRowKeys.size > 0 && (
                    <Button
                      variant="toolbarDanger"
                      size="toolbar"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl font-bold shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Hapus ({selectedRowKeys.size}) Terpilih
                    </Button>
                  )}
                  <Button
                    onClick={handleOpenCreate}
                    variant="toolbarPrimary"
                    size="toolbar"
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tambah
                  </Button>
                  <Button
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => setIsAutoModalOpen(true)}
                    className="flex-1 text-indigo-600 dark:text-indigo-400"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Auto 1 Sem
                  </Button>
                  <Button
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="flex-1 text-emerald-600 dark:text-emerald-400"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Cetak PDF
                  </Button>
                  <Button
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => setIsWaConfigModalOpen(true)}
                    className="flex-1 text-teal-600 dark:text-teal-400"
                  >
                    <Bell className="w-3.5 h-3.5 mr-1" />
                    Notif WA
                  </Button>
                  <Button
                    variant="toolbarOutline"
                    size="toolbarIcon"
                    onClick={() => refetch()}
                    aria-label="Refresh Data"
                    className="rounded-xl"
                    disabled={loadingSchedules}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSchedules ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Mobile Card List with Pagination */}
              <MobileAcademicList
                title="Daftar Pembina Upacara"
                data={paginatedList}
                loading={loadingSchedules}
                totalItems={totalItems}
                onRefresh={() => refetch()}
                onAdd={handleOpenCreate}
                canManage={true}
                pagination={{
                  currentPage,
                  totalPages,
                  totalItems,
                  itemsPerPage,
                  onPageChange: (p) => setCurrentPage(p),
                  onLimitChange: (limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  },
                }}
                renderCard={renderUpacaraMobileCard}
              />
            </div>
          ) : (
            /* ── DESKTOP VIEW (Table with Toolbar & Built-in Pagination) ── */
            <div className="hidden md:block">
              <Table
                columns={columns}
                data={paginatedList}
                loading={loadingSchedules}
                emptyMessage="Belum ada jadwal pembina upacara pada semester ini"
                compact={true}
                rowKey="id"
                selectedRowKeys={selectedRowKeys}
                onSelectedRowKeysChange={setSelectedRowKeys}
                pagination={{
                  currentPage,
                  totalPages,
                  totalItems,
                  itemsPerPage,
                  onPageChange: (page) => setCurrentPage(page),
                  onLimitChange: (limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  },
                }}
                toolbarLeft={
                  <div className="flex flex-col w-full gap-3 p-4">
                    {/* Row 1: Search & Filter + Konteks Akademik */}
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                      {/* Search Box */}
                      <div className="flex-1 w-full">
                        <Input
                          type="text"
                          placeholder="Cari pembina (Nama, NIP), kelas petugas, tema amanat..."
                          aria-label="Cari pembina upacara"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                          className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                        />
                      </div>

                      {/* Dropdown Filters & Konteks Akademik */}
                      <div className="flex flex-col md:flex-row gap-2.5 w-full md:w-auto">
                        {/* Status Filter */}
                        <div className="w-full md:w-44">
                          <SearchableSelect
                            value={statusFilter}
                            onValueChange={(val) => setStatusFilter(val as any)}
                            options={[
                              { label: 'Semua Status', value: 'ALL' },
                              { label: 'Dijadwalkan', value: 'DIJADWALKAN' },
                              { label: 'Selesai', value: 'SELESAI' },
                              { label: 'Digantikan', value: 'DIGANTIKAN' },
                            ]}
                            placeholder="Semua Status"
                            searchPlaceholder="Cari Status..."
                            className="w-full"
                            triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                          />
                        </div>

                        {/* Konteks TP */}
                        <div className="w-full md:w-48">
                          <SearchableSelect
                            value={selectedTpId}
                            onValueChange={setSelectedTpId}
                            options={tpOptions}
                            placeholder="Pilih Tahun Pelajaran"
                            searchPlaceholder="Cari Tahun..."
                            className="w-full"
                            triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                          />
                        </div>

                        {/* Konteks Semester */}
                        <div className="w-full md:w-40">
                          <SearchableSelect
                            value={selectedSemId}
                            onValueChange={setSelectedSemId}
                            options={semesterOptions}
                            placeholder="Pilih Semester"
                            searchPlaceholder="Cari Semester..."
                            className="w-full"
                            triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Secondary Action Toolbar (Semua tombol aksi dikumpulkan) */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        onClick={handleOpenCreate}
                        variant="toolbarPrimary"
                        size="toolbar"
                        className="rounded-xl shadow-xs"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Tambah Jadwal
                      </Button>

                      {selectedRowKeys.size > 0 && (
                        <>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                          <Button
                            variant="toolbarDanger"
                            size="toolbar"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                            className="rounded-xl shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Hapus ({selectedRowKeys.size})
                          </Button>
                        </>
                      )}

                      <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => setIsAutoModalOpen(true)}
                        className="rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 font-bold"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                        Auto-Generate 1 Semester
                      </Button>

                      <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => setIsPrintModalOpen(true)}
                        className="rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-bold"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                        Cetak ke PDF
                      </Button>

                      <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => setIsWaConfigModalOpen(true)}
                        className="rounded-xl text-teal-600 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 font-bold"
                      >
                        <Bell className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
                        Notifikasi WA
                      </Button>

                      <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => navigate('/kesiswaan/jadwal-kegiatan')}
                        className="rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Slot Jadwal Kegiatan
                      </Button>

                      <Button
                        variant="toolbarOutline"
                        size="toolbarIcon"
                        onClick={() => refetch()}
                        aria-label="Refresh Data Jadwal"
                        className="rounded-xl"
                        disabled={loadingSchedules}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSchedules ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                }
              />
            </div>
          )}
        </SectionCard>
      </PremiumFeatureGate>

      {/* Modal Manual Form */}
      {isFormModalOpen && (
        <PembinaUpacaraFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
          editingItem={editingItem}
          waliKelasList={waliKelasList}
          guruList={guruList}
          classList={classList}
          tahunPelajaranId={activeTahunPelajaranId}
          semesterId={selectedSemId}
        />
      )}

      {/* Modal Auto Generate */}
      {isAutoModalOpen && (
        <AutoGenerateUpacaraModal
          isOpen={isAutoModalOpen}
          onClose={() => setIsAutoModalOpen(false)}
          onSubmit={handleAutoSubmit}
          waliKelasList={waliKelasList}
          guruList={guruList}
          classList={classList}
          tahunPelajaranId={activeTahunPelajaranId}
          semesterId={selectedSemId}
          academicContextLabel={academicContextLabel}
        />
      )}

      {/* Modal Cetak Dokumen Resmi Kop Surat */}
      {isPrintModalOpen && (
        <CetakDokumenUpacaraModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          tahunPelajaranId={activeTahunPelajaranId}
          semesterId={selectedSemId}
          schedules={filteredList}
          tahunAjaranNama={activeTpData?.tahun}
          semesterNama={activeSemesterData?.label}
        />
      )}

      {/* Modal Pengaturan Notifikasi WA */}
      {isWaConfigModalOpen && (
        <PengaturanNotifUpacaraModal
          isOpen={isWaConfigModalOpen}
          onClose={() => setIsWaConfigModalOpen(false)}
        />
      )}
    </AcademicPageLayout>
  );
});
