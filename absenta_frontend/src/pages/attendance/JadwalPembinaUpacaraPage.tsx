import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Sparkles,
  Plus,
  Search,
  Filter,
  User,
  Users,
  UserCheck,
  Edit3,
  Trash2,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { usePembinaUpacara } from '@/hooks/attendance/usePembinaUpacara';
import {
  JadwalPembinaUpacaraItem,
  CreatePembinaUpacaraPayload,
  AutoGenerateUpacaraPayload,
  StatusPelaksanaanUpacara,
} from '@/api/attendance/pembinaUpacara.api';
import { Button, SectionCard } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { useConfirm } from '@/providers/ConfirmProvider';
import { PembinaUpacaraFormModal } from '@/components/attendance/pembina-upacara/PembinaUpacaraFormModal';
import { AutoGenerateUpacaraModal } from '@/components/attendance/pembina-upacara/AutoGenerateUpacaraModal';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';

export default React.memo(function JadwalPembinaUpacaraPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();

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

  // Data Schedules
  const {
    list: schedules,
    isLoading: loadingSchedules,
    createMutation,
    updateMutation,
    deleteMutation,
    autoGenerateMutation,
  } = usePembinaUpacara({
    tahun_pelajaran_id: selectedTpId,
    semester_id: selectedSemId,
  });

  // Local UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusPelaksanaanUpacara>('ALL');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPembinaUpacaraItem | null>(null);

  // Filtered List
  const filteredList = useMemo(() => {
    return schedules.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const searchLower = searchTerm.toLowerCase().trim();
      if (!searchLower) return matchStatus;

      const guruNama = item.GuruUtama?.nama_guru?.toLowerCase() || '';
      const penggantiNama = item.GuruPengganti?.nama_guru?.toLowerCase() || '';
      const kelasNama = item.KelasPetugas?.nama_kelas?.toLowerCase() || '';
      const tema = item.tema_amanat?.toLowerCase() || '';

      const matchSearch =
        guruNama.includes(searchLower) ||
        penggantiNama.includes(searchLower) ||
        kelasNama.includes(searchLower) ||
        tema.includes(searchLower);

      return matchStatus && matchSearch;
    });
  }, [schedules, statusFilter, searchTerm]);

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
      }
    },
    [confirm, deleteMutation]
  );

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

  const loading = loadingGuru || loadingKelas || loadingSchedules;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Presensi', path: '/attendance' },
      { label: 'Kesiswaan', path: '/kesiswaan/jadwal-kegiatan' },
      { label: 'Jadwal Pembina Upacara' },
    ],
    []
  );

  return (
    <AcademicPageLayout
      title="Jadwal Pembina Upacara"
      description="Susun jadwal giliran pembina upacara bendera hari Senin, kelas petugas pengibar, dan tema amanat upacara per semester."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="attendance_jadwal_kegiatan"
      topSlot={
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => navigate('/kesiswaan/jadwal-kegiatan')}
            className="flex items-center gap-1.5 font-bold rounded-xl"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            Slot Jadwal Kegiatan
          </Button>
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => setIsAutoModalOpen(true)}
            className="flex items-center gap-1.5 font-bold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Generate 1 Semester
          </Button>
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal
          </Button>
        </div>
      }
      instruction={{
        title: "Panduan Jadwal Pembina Upacara",
        description: "Kelola daftar guru pembina dan kelas pelaksana upacara bendera hari Senin.",
        items: [
          { text: "Gunakan tombol Auto-Generate 1 Semester untuk membagi rotasi guru pembina dan rombel petugas secara merata dalam satu klik." },
          { text: "Jika pembina utama berhalangan atau dinas luar, klik Edit lalu pilih Guru Pengganti (Handover) tanpa menghapus jadwal asli." },
          { text: "Data pembina upacara otomatis terhubung ke kartu dashboard guru dan pembukaan sesi presensi upacara di lapangan." }
        ]
      }}
    >
      <PremiumFeatureGate
        isLocked={false}
        featureName="Jadwal Pembina Upacara"
        moduleName="KESISWAAN"
        description="Kelola jadwal giliran pembina dan petugas upacara bendera sekolah."
      >
        {/* Context Bar */}
        <div className="mb-4">
          <AcademicContextBar
            id="pembina-upacara-context"
            tahunPelajaranId={selectedTpId}
            semesterId={selectedSemId}
            onTahunPelajaranChange={setSelectedTpId}
            onSemesterChange={setSelectedSemId}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            variant="toolbar"
          />
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru, kelas petugas, tema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Status Badges Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'ALL', label: 'Semua Status' },
                { id: 'DIJADWALKAN', label: 'Dijadwalkan' },
                { id: 'SELESAI', label: 'Selesai' },
                { id: 'DIGANTIKAN', label: 'Digantikan' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === s.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <SectionCard fullWidth className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size="lg" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 m-6">
              <CalendarDays className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={48} />
              <h3 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">
                {schedules.length === 0
                  ? 'Belum ada jadwal pembina upacara'
                  : 'Tidak ada jadwal yang cocok dengan filter'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto text-xs sm:text-sm">
                {schedules.length === 0
                  ? 'Gunakan fitur Auto-Generate untuk menyusun seluruh jadwal hari Senin dalam 1 semester, atau tambahkan jadwal secara manual.'
                  : 'Coba ubah kata kunci pencarian atau ganti status filter.'}
              </p>
              {schedules.length === 0 && (
                <div className="flex items-center justify-center gap-2.5 mt-5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAutoModalOpen(true)}
                    className="rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto-Generate 1 Semester
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCreate}
                    className="rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Manual
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Tanggal / Pekan</th>
                    <th className="py-3.5 px-4">Pembina Upacara</th>
                    <th className="py-3.5 px-4">Kelas Petugas</th>
                    <th className="py-3.5 px-4">Amanat / Tema</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredList.map((item) => {
                    const dateObj = new Date(item.tanggal);
                    const formattedDate = dateObj.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const hariNama = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });

                    const isReplaced = !!item.guru_pengganti_id;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Tanggal */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-800 dark:text-slate-100">
                                {formattedDate}
                              </div>
                              <div className="text-[11px] text-slate-400 font-semibold">{hariNama}</div>
                            </div>
                          </div>
                        </td>

                        {/* Pembina */}
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className={isReplaced ? 'line-through text-slate-400' : ''}>
                                {item.GuruUtama?.nama_guru || '-'}
                              </span>
                            </div>
                            {isReplaced && item.GuruPengganti && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg w-fit">
                                <ArrowRight className="w-3 h-3" />
                                Digantikan: {item.GuruPengganti.nama_guru}
                              </div>
                            )}
                            {item.GuruUtama?.nip && !isReplaced && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                NIP: {item.GuruUtama.nip}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Kelas Petugas */}
                        <td className="py-4 px-4">
                          {item.KelasPetugas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                              <Users className="w-3.5 h-3.5" />
                              {item.KelasPetugas.nama_kelas}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Belum ditentukan</span>
                          )}
                        </td>

                        {/* Amanat / Tema */}
                        <td className="py-4 px-4 max-w-xs">
                          <div className="truncate font-medium text-slate-700 dark:text-slate-300">
                            {item.tema_amanat || <span className="text-slate-400 italic">Umum / Bebas</span>}
                          </div>
                          {item.catatan && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.catatan}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              item.status === 'SELESAI'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : item.status === 'DIGANTIKAN'
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : item.status === 'DIBATALKAN'
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              aria-label="Edit jadwal upacara"
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Hapus jadwal upacara"
                              onClick={() =>
                                handleDelete(
                                  item.id,
                                  item.tanggal,
                                  item.GuruUtama?.nama_guru || 'Pembina'
                                )
                              }
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
          guruList={guruList}
          classList={classList}
          tahunPelajaranId={activeTahunPelajaranId}
          semesterId={selectedSemId}
        />
      )}
    </AcademicPageLayout>
  );
});
