import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Link as LinkIcon,
  RefreshCw,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  BookOpen,
  ExternalLink,
  ChevronRight,
  Search,
  Check,
  X,
  FileCheck2,
  Info
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { raporApi, RaporStagingItem, RaporStagingDetail } from '@/api/rapor.api';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { useIsMobile } from '@/hooks/useIsMobile';

export default React.memo(function RaporStagingPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const {
    selectedTahunPelajaran,
    selectedSemester,
    handleTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
  } = useAcademicContext();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  // ── Query: Daftar Staging Sheets ──
  const { data: sheets = [], isLoading } = useQuery<RaporStagingItem[]>({
    queryKey: ['rapor-staging-sheets'],
    queryFn: async () => {
      const res = await raporApi.getStagedSheets();
      return res.data || [];
    },
  });

  // ── Query: Detail Preview Staging Sheet ──
  const { data: previewData, isLoading: isLoadingPreview } = useQuery<RaporStagingDetail>({
    queryKey: ['rapor-staging-detail', previewId],
    queryFn: async () => {
      if (!previewId) throw new Error('No ID');
      const res = await raporApi.getStagedSheetDetail(previewId);
      return res.data;
    },
    enabled: !!previewId,
  });

  // ── Mutation: Fetch & Stage Sheets ──
  const fetchMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      return await raporApi.fetchAndStageGoogleSheets(urls);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
      const results = res.data?.results || [];
      const errors = res.data?.errors || [];

      if (results.length > 0) {
        setIsFetchModalOpen(false);
        setUrlInput('');
        toast.success(`Berhasil memproses ${results.length} Google Sheet kelas!`);
      }

      if (errors.length > 0) {
        errors.forEach((errItem: { url: string; error: string }) => {
          toast.error(errItem.error, { duration: 9000 });
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memproses tautan Google Sheet');
    },
  });

  // ── Mutation: Sync Staging ke e-Rapor ──
  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      return await raporApi.syncStagingToRapor(id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['school-teacher-monitoring'] });
      const { totalNilaiSynced, totalRaporSynced, unmappedStudents, unmappedSubjects } = res.data || {};
      
      let msg = `Sinkronisasi berhasil! ${totalNilaiSynced} nilai & ${totalRaporSynced} rapor siswa diperbarui.`;
      if (unmappedStudents?.length > 0) {
        msg += ` (${unmappedStudents.length} siswa belum terdaftar)`;
      }
      toast.success(msg);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyinkronkan data ke e-Rapor');
    },
  });

  // ── Mutation: Delete Staged Sheet ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await raporApi.deleteStagedSheet(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapor-staging-sheets'] });
      toast.success('Lembar staging berhasil dihapus dari penampung');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus data');
    },
  });

  const handleFetchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      toast.error('Masukkan minimal satu URL Google Sheet');
      return;
    }

    fetchMutation.mutate(urls);
  };

  // Filter sheets
  const filteredSheets = sheets.filter((s) => {
    const matchSearch =
      s.nama_kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tahun_pelajaran_nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.wali_kelas_nama && s.wali_kelas_nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.jurusan_nama && s.jurusan_nama.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  // Summary Metrics
  const totalSheets = sheets.length;
  const syncedSheets = sheets.filter((s) => s.status === 'SYNCED').length;
  const readySheets = sheets.filter((s) => s.status === 'READY').length;
  const totalStudents = sheets.reduce((acc, curr) => acc + (curr.total_siswa || 0), 0);

  return (
    <AcademicPageLayout
      title="Wadah Penampung Nilai Rapor"
      subtitle="Hubungkan dan sinkronkan tautan Google Sheet per kelas langsung ke e-Rapor tanpa login satu per satu"
      toolbar={
        <div className={`flex items-center gap-2 flex-wrap ${isMobile ? 'w-full' : ''}`}>
          <AcademicContextBar
            id="staging-rapor"
            tahunPelajaranId={selectedTahunPelajaran}
            semesterId={selectedSemester}
            onTahunPelajaranChange={handleTpChange}
            onSemesterChange={handleSemesterChange}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            isLoadingTp={isLoadingTp}
            isLoadingSem={isLoadingSem}
            variant="toolbar"
          />
          <Button
            onClick={() => setIsFetchModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold gap-1.5"
            size="sm"
          >
            <LinkIcon size={14} />
            <span>+ Hubungkan Google Sheet</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── 4 Metrics Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <AnalyticsCard
            title="Total Sheet Terkoneksi"
            value={`${totalSheets} Kelas`}
            icon={<FileSpreadsheet size={18} />}
            gradient="from-sky-500 to-sky-700 text-white"
            subtitle={`${totalStudents} Siswa Terdaftar`}
            mobileCompact={true}
          />
          <AnalyticsCard
            title="Siap Disinkronkan"
            value={`${readySheets} Rombel`}
            icon={<Clock size={18} />}
            gradient="from-amber-500 to-amber-700 text-white"
            subtitle="Menunggu 1-Click Sync"
            mobileCompact={true}
          />
          <AnalyticsCard
            title="Tersinkron ke e-Rapor"
            value={`${syncedSheets} Rombel`}
            icon={<CheckCircle2 size={18} />}
            gradient="from-emerald-500 to-emerald-700 text-white"
            subtitle="Masuk ke Nilai & Leger"
            mobileCompact={true}
          />
          <AnalyticsCard
            title="Rata-rata Mapel"
            value="15 Mapel"
            icon={<BookOpen size={18} />}
            gradient="from-purple-500 to-purple-700 text-white"
            subtitle="Kurikulum Merdeka SMK"
            mobileCompact={true}
          />
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Cari kelas, tahun ajaran, walas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            <span>Menampilkan <strong>{filteredSheets.length}</strong> dari <strong>{sheets.length}</strong> rombel</span>
          </div>
        </div>

        {/* ── Grid Sheet Kelas ── */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="animate-spin mx-auto mb-3 text-indigo-500" size={24} />
            <p className="text-sm">Memuat wadah penampung nilai rapor...</p>
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <FileSpreadsheet size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Belum Ada Tautan Google Sheet yang Dihubungkan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Anda tidak perlu mengunduh file satu per satu. Cukup salin tautan Google Sheet rapor kelas dan Absenta akan mengekstrak nilai sumatif, capaian kompetensi, dan absensi secara otomatis.
              </p>
            </div>
            <Button
              onClick={() => setIsFetchModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
            >
              <LinkIcon size={14} />
              <span>Hubungkan Google Sheet Sekarang</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSheets.map((item) => {
              const isSyncing = syncMutation.isPending && syncMutation.variables === item.id;
              const isDeleting = deleteMutation.isPending && deleteMutation.variables === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg tracking-tight">
                            {item.nama_kelas}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                              item.status === 'SYNCED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60'
                            )}
                          >
                            {item.status === 'SYNCED' ? 'Tersinkron' : 'Siap Sinkron'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.tahun_pelajaran_nama} • Semester {item.semester}
                        </p>
                      </div>

                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Buka Google Sheet asli di tab baru"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block uppercase">Wali Kelas</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                          {item.wali_kelas_nama || 'Belum terisi'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 block uppercase">Konsentrasi</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                          {item.jurusan_nama || 'Umum'}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] font-medium text-slate-400 block uppercase">Daftar Siswa</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Users size={12} /> {item.total_siswa} Siswa
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] font-medium text-slate-400 block uppercase">Mata Pelajaran</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <BookOpen size={12} /> {item.total_mapel} Mapel
                        </span>
                      </div>
                    </div>

                    {/* Log status sync */}
                    {item.last_synced_at && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <Check size={12} />
                        <span>
                          Terakhir disinkronkan: {new Date(item.last_synced_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId(item.id)}
                      className="text-xs h-8 gap-1.5 rounded-xl text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    >
                      <Eye size={13} />
                      <span>Pratinjau Data</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        disabled={isSyncing}
                        onClick={() => syncMutation.mutate(item.id)}
                        className={cn(
                          'text-xs h-8 gap-1.5 rounded-xl font-semibold shadow-2xs',
                          item.status === 'SYNCED'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        )}
                      >
                        <RefreshCw size={12} className={cn(isSyncing && 'animate-spin')} />
                        <span>{item.status === 'SYNCED' ? 'Sinkron Ulang' : '1-Click Sync'}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus lembar staging ${item.nama_kelas}?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-xl"
                        title="Hapus dari Hub"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL 1: HUBUNGKAN GOOGLE SHEET (LINK INGESTION) ── */}
      <Modal
        isOpen={isFetchModalOpen}
        onClose={() => setIsFetchModalOpen(false)}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-indigo-600" />
            <span>Hubungkan Link Google Sheet Rapor</span>
          </div>
        }
        description="Salin dan tempel tautan Google Sheet rapor kelas. Anda dapat memasukkan banyak tautan sekaligus (satu tautan per baris)."
      >
        <form onSubmit={handleFetchSubmit} className="space-y-4 p-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tautan Berkas Google Sheet Kelas (Satu baris per tautan)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gunakan tautan berkas per kelas (format: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">https://docs.google.com/spreadsheets/d/.../edit</code>). Jika Anda memiliki Folder Google Drive, buka folder tersebut lalu salin tautan berkas sheet kelas di dalamnya.
            </p>
            <Textarea
              rows={5}
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1R6-4FyKNiIWwV1sOQ_7ZJYOYj59ccLKIAQdlM0AVfiA/edit&#10;https://docs.google.com/spreadsheets/d/.../edit"
              className="text-xs font-mono rounded-xl resize-none"
            />
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 p-3 rounded-2xl flex items-start gap-2.5">
            <Info size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                Adaptif Multi-Tahun:
              </p>
              <p>
                Sistem menggunakan <em>Dynamic Variable Scanner</em> berbasis label sel pada sheet <code>SETTING</code>, <code>INPUT SUMATIF</code>, dan <code>INPUT CP</code>. Posisi baris atau penambahan fitur di lembar rapor Google Sheet tidak akan merusak parsing.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFetchModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={fetchMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
            >
              <RefreshCw size={13} className={cn(fetchMutation.isPending && 'animate-spin')} />
              <span>{fetchMutation.isPending ? 'Sedang Membaca & Mengekstrak...' : 'Tarik & Simpan ke Wadah'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: PRATINJAU INTERAKTIF STAGING SHEET ── */}
      <Modal
        isOpen={!!previewId}
        onClose={() => setPreviewId(null)}
        size="5xl"
        title={
          <div className="flex items-center justify-between w-full pr-8">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-indigo-600" />
              <span>Pratinjau Data Kelas: {previewData?.nama_kelas || 'Memuat...'}</span>
            </div>
            {previewData && (
              <Button
                size="sm"
                onClick={() => {
                  syncMutation.mutate(previewData.id);
                  setPreviewId(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl gap-1 shadow-xs font-semibold"
              >
                <RefreshCw size={12} />
                <span>Sinkronkan ke e-Rapor</span>
              </Button>
            )}
          </div>
        }
        description={`Tahun Ajaran ${previewData?.tahun_pelajaran_nama || ''} • Semester ${previewData?.semester || ''} • Wali Kelas: ${previewData?.wali_kelas_nama || '-'}`}
      >
        <div className="p-6 pt-2 max-h-[75vh] overflow-y-auto">
          {isLoadingPreview ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-500" size={20} />
              <p className="text-xs">Mengambil pratinjau data siswa dan nilai...</p>
            </div>
          ) : previewData ? (
            <Tabs defaultValue="sumatif" className="mt-2 space-y-4">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <TabsTrigger value="sumatif" className="text-xs rounded-xl font-bold">
                  Nilai Sumatif ({previewData.sumatif_sheet_data?.length || 0} Siswa)
                </TabsTrigger>
                <TabsTrigger value="cp" className="text-xs rounded-xl font-bold">
                  Nilai Rapor & Deskripsi CP
                </TabsTrigger>
                <TabsTrigger value="absensi" className="text-xs rounded-xl font-bold">
                  Absensi, Ekskul & Catatan
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Nilai Sumatif */}
              <TabsContent value="sumatif" className="space-y-3">
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">No</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-24">NIS / NISN</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[180px]">Nama Siswa</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-14 text-center">JK</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[200px]">Contoh Nilai Sumatif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewData.sumatif_sheet_data?.map((s) => {
                        const sampleSubject = Object.keys(s.scores || {})[0];
                        const sampleScore = sampleSubject ? s.scores[sampleSubject] : null;

                        return (
                          <tr key={s.nis || s.nama} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-mono text-slate-500">{s.no}</td>
                            <td className="p-2.5 font-mono text-slate-500">{s.nis || s.nisn || '-'}</td>
                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.nama}</td>
                            <td className="p-2.5 text-center text-slate-500">{s.jk}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">
                              {sampleSubject ? (
                                <span className="text-[11px]">
                                  <strong>{sampleSubject}</strong>: Sum1 ({sampleScore?.sumatif1 ?? '-'}), Sum2 ({sampleScore?.sumatif2 ?? '-'}), Rata ({sampleScore?.rataRata ?? '-'})
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Tidak ada nilai</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Tab 2: CP & Rapor */}
              <TabsContent value="cp" className="space-y-3">
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">No</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[180px]">Nama Siswa</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Pratinjau Nilai Rapor & Deskripsi CP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewData.cp_sheet_data?.map((s) => {
                        const firstMapel = Object.keys(s.scores || {})[0];
                        const mapelScore = firstMapel ? s.scores[firstMapel] : null;

                        return (
                          <tr key={s.nis || s.nama} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-mono text-slate-500">{s.no}</td>
                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.nama}</td>
                            <td className="p-2.5 space-y-1">
                              {firstMapel ? (
                                <div className="text-[11px]">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {firstMapel}: {mapelScore?.nilaiRapor ?? '-'}
                                  </span>
                                  <p className="text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {mapelScore?.capaianKompetensi || 'Belum ada deskripsi'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Belum ada nilai CP</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Tab 3: Absensi & Catatan */}
              <TabsContent value="absensi" className="space-y-3">
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-12 text-center">No</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 min-w-[180px]">Nama Siswa</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 w-24 text-center">Kehadiran (S/I/A)</th>
                        <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Catatan Wali Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {previewData.cp_sheet_data?.map((s) => (
                        <tr key={s.nis || s.nama} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 text-center font-mono text-slate-500">{s.no}</td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.nama}</td>
                          <td className="p-2.5 text-center font-mono">
                            <span className="text-sky-600 font-bold">{s.absensi?.sakit ?? 0}</span> /{' '}
                            <span className="text-amber-600 font-bold">{s.absensi?.izin ?? 0}</span> /{' '}
                            <span className="text-rose-600 font-bold">{s.absensi?.alpa ?? 0}</span>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                            {s.catatanWalas || <span className="text-slate-400 italic">Tidak ada catatan</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </Modal>
    </AcademicPageLayout>
  );
});
