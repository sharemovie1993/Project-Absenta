import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Copy, CheckCircle2, AlertTriangle, RefreshCw, Search, 
  Edit3, Save, X, ExternalLink, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Input, Badge, Loader } from '@/components/ui';
import { 
  getDuplicateSiswaIdentifiers, 
  updateSiswa,
  type DuplicateAuditResponse,
  type DuplicateStudentItem,
  type DuplicateGroupItem
} from '@/api/academic/siswa.api';

interface SiswaDuplicateAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditSiswa?: (siswa: any) => void;
  onDataUpdated?: () => void;
}

export const SiswaDuplicateAuditModal: React.FC<SiswaDuplicateAuditModalProps> = ({
  isOpen,
  onClose,
  onOpenEditSiswa,
  onDataUpdated,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'nisn' | 'nis'>('nisn');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State untuk inline editing: { [studentId]: { nis?: string, nisn?: string } }
  const [editValues, setEditValues] = useState<Record<string, { nis: string; nisn: string }>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  // Query data audit duplikasi
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['siswa-duplicate-identifiers'],
    queryFn: async () => {
      const res = await getDuplicateSiswaIdentifiers();
      return res.data;
    },
    enabled: isOpen,
    staleTime: 0, // Selalu fresh saat dibuka
  });

  const summary = data?.summary;
  const duplicateNisnList = data?.duplicateNisn || [];
  const duplicateNisList = data?.duplicateNis || [];

  // Filter groups berdasarkan search query
  const filteredGroups = useMemo(() => {
    const list = activeTab === 'nisn' ? duplicateNisnList : duplicateNisList;
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((g) => {
      if (g.identifier.toLowerCase().includes(q)) return true;
      return g.students.some(
        (s) =>
          s.nama_siswa.toLowerCase().includes(q) ||
          (s.Kelas?.nama_kelas || '').toLowerCase().includes(q)
      );
    });
  }, [activeTab, duplicateNisnList, duplicateNisList, searchQuery]);

  // Handle in-line input change
  const handleInputChange = (studentId: string, field: 'nis' | 'nisn', value: string, defaultStudent: DuplicateStudentItem) => {
    setEditValues((prev) => ({
      ...prev,
      [studentId]: {
        nis: field === 'nis' ? value : (prev[studentId]?.nis ?? defaultStudent.nis ?? ''),
        nisn: field === 'nisn' ? value : (prev[studentId]?.nisn ?? defaultStudent.nisn ?? ''),
      },
    }));
  };

  // Simpan koreksi inline siswa
  const handleSaveCorrection = async (student: DuplicateStudentItem) => {
    const values = editValues[student.id];
    if (!values) {
      toast.info('Tidak ada perubahan nomor identitas.');
      return;
    }

    setSavingStudentId(student.id);
    const toastId = toast.loading(`Menyimpan koreksi untuk ${student.nama_siswa}...`);

    try {
      await updateSiswa(student.id, {
        nis: values.nis.trim() || undefined,
        nisn: values.nisn.trim() || undefined,
      });

      toast.success(`Koreksi identitas ${student.nama_siswa} berhasil disimpan!`, { id: toastId });
      
      // Hapus dari state draft edit
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });

      // Refetch audit dan list siswa utama
      refetch();
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan koreksi identitas', { id: toastId });
    } finally {
      setSavingStudentId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit & Koreksi Duplikasi NIS / NISN"
      size="4xl"
    >
      <div className="space-y-4">
        {/* Banner Penjelasan Arsitektur Mentah */}
        <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">
              Deteksi Duplikasi Data Mentah (Aktif, Calon, &amp; Riwayat)
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Database mengizinkan data mentah diimpor tanpa memblokir unik, agar Anda dapat mengoreksi nomor NIS atau NISN yang tertukar secara fleksibel di sini sebelum sinkronisasi.
            </p>
          </div>
        </div>

        {/* Bento Stats Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Total Siswa Diperiksa
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                {summary.totalChecked.toLocaleString()}
              </span>
            </div>

            <div 
              onClick={() => setActiveTab('nisn')}
              className={`p-3 border rounded-xl cursor-pointer transition-all ${
                activeTab === 'nisn'
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                  Duplikasi NISN
                </span>
                {summary.totalDuplicateNisnGroups > 0 && (
                  <Badge variant="danger" className="text-[9px] px-1.5 py-0 font-bold">
                    {summary.totalDuplicateNisnGroups} Grup
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {summary.totalDuplicateNisnStudents}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">siswa terdampak</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('nis')}
              className={`p-3 border rounded-xl cursor-pointer transition-all col-span-2 sm:col-span-1 ${
                activeTab === 'nis'
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                  Duplikasi NIS
                </span>
                {summary.totalDuplicateNisGroups > 0 && (
                  <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold">
                    {summary.totalDuplicateNisGroups} Grup
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {summary.totalDuplicateNisStudents}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">siswa terdampak</span>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar Filter & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('nisn')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'nisn'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplikasi NISN</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-full font-bold">
                {duplicateNisnList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('nis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'nis'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplikasi NIS</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full font-bold">
                {duplicateNisList.length}
              </span>
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor atau nama..."
                className="h-8 pl-8 text-xs rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-800"
              title="Periksa ulang data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">Pindai Ulang</span>
            </Button>
          </div>
        </div>

        {/* Content List Area */}
        <div className="min-h-[280px] max-h-[480px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader size="md" />
              <span className="text-xs font-semibold">Memindai seluruh basis data siswa...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {searchQuery
                  ? 'Tidak ada duplikasi yang cocok dengan pencarian Anda.'
                  : `Hebat! Tidak Ditemukan Duplikasi ${activeTab === 'nisn' ? 'NISN' : 'NIS'}`}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm font-medium">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                  : `Seluruh nomor ${activeTab === 'nisn' ? 'NISN' : 'NIS'} siswa di sekolah ini sudah terverifikasi unik dan bersih.`}
              </p>
            </div>
          ) : (
            filteredGroups.map((group, gIdx) => {
              const badgeTheme = activeTab === 'nisn' ? 'rose' : 'amber';
              return (
                <div
                  key={`${activeTab}-${group.identifier}-${gIdx}`}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        badgeTheme === 'rose'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {activeTab.toUpperCase()}: {group.identifier}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ({group.count} Siswa Memiliki Nomor Ini)
                      </span>
                    </div>

                    <Badge variant={badgeTheme === 'rose' ? 'danger' : 'warning'} className="text-[10px] font-bold">
                      Ganda
                    </Badge>
                  </div>

                  {/* Student Rows in this Group */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {group.students.map((student) => {
                      const curEdit = editValues[student.id];
                      const currentNis = curEdit?.nis ?? student.nis ?? '';
                      const currentNisn = curEdit?.nisn ?? student.nisn ?? '';
                      const hasChanged = 
                        (curEdit && curEdit.nis !== (student.nis ?? '')) ||
                        (curEdit && curEdit.nisn !== (student.nisn ?? ''));
                      const isSaving = savingStudentId === student.id;

                      return (
                        <div
                          key={student.id}
                          className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Info Siswa */}
                          <div className="flex items-start gap-2.5 min-w-[220px]">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {student.nama_siswa.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                                {student.nama_siswa}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {student.Kelas?.nama_kelas || 'Tanpa Kelas'}
                                </span>
                                <span className="text-[9px] text-slate-300">•</span>
                                <Badge
                                  variant={student.status === 'AKTIF' ? 'success' : 'neutral'}
                                  className="text-[9px] px-1.5 py-0 font-bold"
                                >
                                  {student.status}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Quick Inline Editor untuk NIS & NISN */}
                          <div className="flex-1 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-[10px] text-slate-400 font-semibold w-9">NISN:</span>
                              <Input
                                value={currentNisn}
                                onChange={(e) => handleInputChange(student.id, 'nisn', e.target.value, student)}
                                placeholder="NISN (10 Digit)"
                                className={`h-7 w-32 text-xs font-mono rounded-lg ${
                                  activeTab === 'nisn' ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30' : ''
                                }`}
                              />
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-[10px] text-slate-400 font-semibold w-7">NIS:</span>
                              <Input
                                value={currentNis}
                                onChange={(e) => handleInputChange(student.id, 'nis', e.target.value, student)}
                                placeholder="NIS Sekolah"
                                className={`h-7 w-32 text-xs font-mono rounded-lg ${
                                  activeTab === 'nis' ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30' : ''
                                }`}
                              />
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                            {hasChanged && (
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => handleSaveCorrection(student)}
                                disabled={isSaving}
                                className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Simpan koreksi nomor siswa"
                              >
                                {isSaving ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                <span>Simpan</span>
                              </Button>
                            )}

                            {onOpenEditSiswa && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  onClose();
                                  onOpenEditSiswa(student);
                                }}
                                className="h-7 px-2 text-[11px] font-semibold gap-1 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                title="Buka form edit profil siswa lengkap"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span className="hidden sm:inline">Form Lengkap</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            Perubahan nomor disimpan langsung ke basis data siswa dan langsung berlaku.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 font-semibold rounded-xl"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};
