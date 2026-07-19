import React, { useMemo, useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  ExternalLink,
  Filter,
  Check,
  Clock,
  Sparkles,
  Download
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi, mapelApi, guruApi } from '../../api/academic.api';
import { toast } from 'sonner';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../hooks/useAuth';
import { z } from 'zod';

const hardeningModuleKey = 'perangkat_ajar_page';

const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

interface Subject {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
}

interface Teacher {
  id: string;
  nama_guru: string;
  nip?: string;
  user_id?: string;
}

interface PerangkatAjar {
  id: string;
  judul: string;
  jenis: string;
  status: string;
  file_url: string;
  catatan_reviewer?: string;
  Guru?: Teacher;
  Mapel?: Subject;
  Reviewer?: { full_name: string };
}

interface ReviewPayload {
  status: 'APPROVED' | 'REJECTED';
  catatan_reviewer: string;
}

const JENIS_LABELS: Record<string, string> = {
  MODUL_AJAR: 'Modul Ajar',
  ATP: 'ATP (Alur Tujuan Pembelajaran)',
  MODUL_PROJEK: 'Modul Projek (P5)',
  PROTA: 'Program Tahunan (PROTA)',
  PROMES: 'Program Semester (PROMES)',
  KKTP: 'KKTP',
  RPP: 'RPP / Modul Ajar (K13 Legacy)',
  SILABUS: 'Silabus (K13 Legacy)',
};

const uploadSchema = z.object({
  judul: z.string().min(1, 'Judul dokumen wajib diisi'),
  jenis: z.string().min(1, 'Jenis perangkat wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  guru_id: z.string().min(1, 'Guru pengajar wajib dipilih'),
  file: z.any().refine((v) => v instanceof File, 'File dokumen wajib dipilih')
});

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  catatan_reviewer: z.string().optional()
});

export default function PerangkatAjarPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { user, can } = useAuth();
  
  const isKurikulumOrAdmin = useMemo(() => {
    return can('academic.manage.academic') || user?.role?.name === 'ADMIN';
  }, [user, can]);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPerangkatId, setSelectedPerangkatId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('');

  const filterStatus = useMemo(() => {
    return activeTab === 'ALL' ? '' : activeTab;
  }, [activeTab]);

  const [uploadForm, setUploadForm] = useState<{
    judul: string;
    jenis: string;
    mapel_id: string;
    guru_id: string;
    file: File | null;
  }>({
    judul: '',
    jenis: 'MODUL_AJAR',
    mapel_id: '',
    guru_id: '',
    file: null
  });

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [reviewForm, setReviewForm] = useState<ReviewPayload>({
    status: 'APPROVED',
    catatan_reviewer: ''
  });

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });
  const activeYear = useMemo(() => (years?.data ?? []).find(y => y.is_active), [years]);
  const activeSemester = useMemo(() => activeYear?.Semester?.find((s: { is_active: boolean }) => s.is_active), [activeYear]);

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => guruApi.getAll()
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => mapelApi.getAll()
  });

  const currentGuru = useMemo(() => {
    if (!user || !teachers?.data) return null;
    return (teachers.data as Teacher[]).find((t: any) => t.user_id === user.id);
  }, [user, teachers]);

  // Set default guru_id in uploadForm for Teachers
  useEffect(() => {
    if (!isKurikulumOrAdmin && currentGuru) {
      setUploadForm(prev => ({ ...prev, guru_id: currentGuru.id }));
    }
  }, [isKurikulumOrAdmin, currentGuru]);

  const { data: listPerangkat, isLoading } = useQuery({
    queryKey: ['perangkat-ajar', filterStatus, filterJenis, filterMapel, activeYear?.id, activeSemester?.id],
    queryFn: () => kurikulumApi.getPerangkatAjar({
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id,
      status: filterStatus || undefined,
      jenis: filterJenis || undefined,
      mapel_id: filterMapel || undefined
    }),
    enabled: !!activeYear && !!activeSemester
  });

  const { data: allPerangkatForStats } = useQuery({
    queryKey: ['perangkat-ajar-stats', activeYear?.id, activeSemester?.id],
    queryFn: () => kurikulumApi.getPerangkatAjar({
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!activeYear && !!activeSemester
  });

  const stats = useMemo(() => {
    const data = allPerangkatForStats?.data || [];
    return {
      total: data.length,
      pending: data.filter((x: any) => x.status === 'PENDING').length,
      approved: data.filter((x: any) => x.status === 'APPROVED').length,
      rejected: data.filter((x: any) => x.status === 'REJECTED').length,
    };
  }, [allPerangkatForStats]);

  const uploadMutation = useMutation({
    mutationFn: kurikulumApi.uploadPerangkatAjar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats'] });
      toast.success('Perangkat ajar berhasil diunggah');
      setIsUploadModalOpen(false);
      setUploadForm({ judul: '', jenis: 'MODUL_AJAR', mapel_id: '', guru_id: !isKurikulumOrAdmin && currentGuru ? currentGuru.id : '', file: null });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal mengunggah berkas');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewPayload }) => kurikulumApi.reviewPerangkatAjar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats'] });
      toast.success('Hasil verifikasi berhasil disimpan');
      setIsReviewModalOpen(false);
      setReviewForm({ status: 'APPROVED', catatan_reviewer: '' });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menyimpan verifikasi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: kurikulumApi.deletePerangkatAjar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats'] });
      toast.success('Berkas berhasil dihapus');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menghapus berkas');
    }
  });

  const handleUploadSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const validation = uploadSchema.safeParse(uploadForm);
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Harap isi semua kolom formulir';
      toast.error(errMsg);
      return;
    }
    
    setUploadProgress(0);
    uploadMutation.mutate({
      ...uploadForm,
      file: uploadForm.file!,
      tahun_pelajaran_id: activeYear!.id,
      semester_id: activeSemester!.id,
      onProgress: setUploadProgress
    }, {
      onSettled: () => {
        setUploadProgress(null);
      }
    });
  }, [uploadForm, uploadMutation, activeYear, activeSemester]);

  const handleReviewSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerangkatId) return;
    const validation = reviewSchema.safeParse(reviewForm);
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Data verifikasi tidak valid';
      toast.error(errMsg);
      return;
    }
    reviewMutation.mutate({
      id: selectedPerangkatId,
      data: reviewForm
    });
  }, [selectedPerangkatId, reviewForm, reviewMutation]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Berkas Perangkat Ajar',
      description: 'Apakah Anda yakin ingin menghapus berkas perangkat ajar ini?',
      confirmText: 'Hapus',
      style: 'danger'
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  }, [confirm, deleteMutation]);

  const handleDownloadFile = useCallback(async (item: PerangkatAjar) => {
    const loadingToast = toast.loading('Mengunduh berkas...');
    try {
      const { blob, filename } = await kurikulumApi.downloadPerangkatAjarFile(item.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success('Berkas berhasil diunduh');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Gagal mengunduh berkas');
    }
  }, []);

  const filterJenisOptions = useMemo(() => [
    { label: 'Semua Jenis Berkas', value: '' },
    { label: 'Modul Ajar', value: 'MODUL_AJAR' },
    { label: 'ATP (Alur Tujuan Pembelajaran)', value: 'ATP' },
    { label: 'Modul Projek (P5)', value: 'MODUL_PROJEK' },
    { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
    { label: 'Program Semester (PROMES)', value: 'PROMES' },
    { label: 'KKTP', value: 'KKTP' },
    { label: 'RPP / Modul Ajar (K13 Legacy)', value: 'RPP' },
    { label: 'Silabus (K13 Legacy)', value: 'SILABUS' }
  ], []);

  const filterMapelOptions = useMemo(() => [
    { label: 'Semua Mata Pelajaran', value: '' },
    ...(subjects?.data ?? [])?.map((m: Subject) => ({ label: m.nama_mapel, value: m.id }))
  ], [subjects]);

  const formJenisOptions = useMemo(() => [
    { label: 'Modul Ajar', value: 'MODUL_AJAR' },
    { label: 'ATP (Alur Tujuan Pembelajaran)', value: 'ATP' },
    { label: 'Modul Projek (P5)', value: 'MODUL_PROJEK' },
    { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
    { label: 'Program Semester (PROMES)', value: 'PROMES' },
    { label: 'KKTP', value: 'KKTP' }
  ], []);

  const formMapelOptions = useMemo(() => [
    { label: 'Pilih Mapel', value: '' },
    ...(subjects?.data ?? [])?.map((m: Subject) => ({ label: m.nama_mapel, value: m.id }))
  ], [subjects]);

  const formGuruOptions = useMemo(() => [
    { label: 'Pilih Guru', value: '' },
    ...(teachers?.data ?? [])?.map((g: Teacher) => ({ label: g.nama_guru, value: g.id }))
  ], [teachers]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', href: '/kurikulum/dashboard' },
    { label: 'Perangkat Ajar' }
  ], []);

  const statisticsList = useMemo(() => [
    { title: "Total Berkas", value: stats.total, icon: <FileText className="h-4 w-4 text-white" />, gradient: "from-blue-500 to-indigo-600", subtitle: "Diajukan oleh guru" },
    { title: "Perlu Review", value: stats.pending, icon: <Clock className="h-4 w-4 text-white" />, gradient: "from-amber-500 to-orange-600", subtitle: "Menunggu persetujuan" },
    { title: "Disetujui", value: stats.approved, icon: <CheckCircle className="h-4 w-4 text-white" />, gradient: "from-emerald-500 to-teal-600", subtitle: "Lolos verifikasi" },
    { title: "Perlu Revisi", value: stats.rejected, icon: <XCircle className="h-4 w-4 text-white" />, gradient: "from-rose-500 to-pink-600", subtitle: "Ditolak & butuh revisi" },
  ], [stats]);

  return (
    <AcademicPageLayout
      title="Perangkat Ajar Guru (Kurikulum Merdeka)"
      description="Manajemen pengunggahan dan verifikasi berkas administrasi KBM guru."
      breadcrumbs={breadcrumbs}
      stats={statisticsList}
      hardeningModuleKey={hardeningModuleKey}
      instruction={{
        title: 'Panduan Perangkat Ajar Kurikulum Merdeka',
        description: 'Repositori penyimpanan berkas administrasi KBM Kurikulum Merdeka guru seperti Modul Ajar, ATP, Modul Projek P5, PROTA, PROMES, dan KKTP.',
        items: [
          { text: 'Guru dapat mengunggah berkas fisik PDF/Word dengan mengklik tombol "UNGGAH BERKAS".' },
          { text: 'Staf kurikulum dapat melakukan verifikasi (APPROVED / REJECTED) dengan mengklik tombol "VERIFIKASI" di tab Perlu Review.' },
          { text: 'Filter jenis berkas dan mata pelajaran untuk menyaring data spesifik.' }
        ]
      }}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repositori Perangkat Ajar</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Verifikasi berkas administrasi dan perencanaan pembelajaran guru.</p>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold"
          >
            <Upload className="w-4 h-4 mr-2" />
            UNGGAH BERKAS
          </Button>
        </div>

        {/* Tab Controls for Status Filter */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 gap-2 overflow-x-auto scrollbar-none">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => {
            const labelMap = {
              ALL: 'Semua Berkas',
              PENDING: 'Perlu Review',
              APPROVED: 'Disetujui',
              REJECTED: 'Perlu Revisi',
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>

        <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 flex flex-wrap gap-4 items-center">
          <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
            <Filter size={16} className="mr-1.5" />
            Filter Data
          </div>

          <Suspense fallback={<div className="h-9 w-60 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />}>
            <div className="w-full sm:w-60">
              <SearchableSelect
                id="filter-jenis-select"
                value={filterJenis}
                onValueChange={setFilterJenis}
                options={filterJenisOptions}
                placeholder="Semua Jenis Berkas"
              />
            </div>
          </Suspense>

          <Suspense fallback={<div className="h-9 w-60 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />}>
            <div className="w-full sm:w-60">
              <SearchableSelect
                id="filter-mapel-select"
                value={filterMapel}
                onValueChange={setFilterMapel}
                options={filterMapelOptions}
                placeholder="Semua Mata Pelajaran"
              />
            </div>
          </Suspense>
        </Card>

        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-xs italic">Memuat berkas perangkat ajar...</div>
        ) : !listPerangkat?.data || listPerangkat.data.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3">
            <FileText size={48} className="text-slate-300" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Dokumen</h4>
            <p className="text-xs text-slate-400 max-w-sm">Guru belum mengunggah perangkat ajar pada semester aktif ini.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listPerangkat?.data?.map((item: PerangkatAjar) => {
              const isOwner = currentGuru && item.Guru?.id === currentGuru.id;
              const canUserDelete = isKurikulumOrAdmin || (isOwner && item.status === 'PENDING');
              
              return (
                <Card key={item.id} className="p-5 border-none shadow-sm relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow dark:bg-slate-900/60">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border-none">
                        {JENIS_LABELS[item.jenis] || item.jenis}
                      </Badge>
                      {item.status === 'APPROVED' && <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-none font-black flex items-center"><Check size={12} className="mr-1" /> APPROVED</Badge>}
                      {item.status === 'REJECTED' && <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-none font-black flex items-center"><XCircle size={12} className="mr-1" /> REJECTED</Badge>}
                      {item.status === 'PENDING' && <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-none font-black flex items-center"><Clock size={12} className="mr-1" /> PENDING</Badge>}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{item.judul}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Guru: {item.Guru?.nama_guru} | NIP. {item.Guru?.nip || '-'}</p>
                      <p className="text-[11px] text-slate-400">Mapel: {item.Mapel?.nama_mapel} ({item.Mapel?.kode_mapel})</p>
                    </div>

                    {item.catatan_reviewer && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80 italic">
                        "Review: {item.catatan_reviewer}"
                        <p className="text-[9px] text-slate-400 mt-1 font-semibold not-italic">— Verifikator: {item.Reviewer?.full_name || 'Admin'}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50 dark:border-slate-800/80">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownloadFile(item)}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                    >
                      <Download size={14} className="mr-1.5" />
                      UNDUH BERKAS
                    </Button>

                    <div className="flex items-center gap-2">
                      {isKurikulumOrAdmin && (
                        <Button
                          onClick={() => {
                            setSelectedPerangkatId(item.id);
                            setIsReviewModalOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-xs font-bold border-slate-200 dark:border-slate-800"
                        >
                          VERIFIKASI
                        </Button>
                      )}

                      {canUserDelete && (
                        <Button
                          onClick={() => handleDelete(item.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 p-2"
                          aria-label="Hapus perangkat ajar"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Suspense fallback={null}>
          <Modal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            title="Unggah Perangkat Ajar"
          >
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="judul-input" className="text-xs font-bold text-slate-500 dark:text-slate-400">Judul Dokumen</label>
                <input
                  id="judul-input"
                  type="text"
                  placeholder="Contoh: Modul Ajar Matematika Kelas X Trigonometri"
                  value={uploadForm.judul}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, judul: e.target.value }))}
                  aria-label="Judul dokumen"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="jenis-select" className="text-xs font-bold text-slate-500 dark:text-slate-400">Jenis Perangkat</label>
                  <SearchableSelect
                    id="jenis-select"
                    value={uploadForm.jenis}
                    onValueChange={(val) => setUploadForm(prev => ({ ...prev, jenis: val }))}
                    options={formJenisOptions}
                    placeholder="Pilih Jenis"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="mapel-select" className="text-xs font-bold text-slate-500 dark:text-slate-400">Mata Pelajaran</label>
                  <SearchableSelect
                    id="mapel-select"
                    value={uploadForm.mapel_id}
                    onValueChange={(val) => setUploadForm(prev => ({ ...prev, mapel_id: val }))}
                    options={formMapelOptions}
                    placeholder="Pilih Mapel"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="guru-select" className="text-xs font-bold text-slate-500 dark:text-slate-400">Guru Pengajar</label>
                <SearchableSelect
                  id="guru-select"
                  value={uploadForm.guru_id}
                  onValueChange={(val) => setUploadForm(prev => ({ ...prev, guru_id: val }))}
                  options={formGuruOptions}
                  placeholder="Pilih Guru"
                  disabled={!isKurikulumOrAdmin} // Guru base role cannot select other teachers
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Pilih File Berkas (PDF/DOCX/XLSX)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-800/80 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-slate-400" />
                      <p className="mb-1 text-xs text-slate-500 dark:text-slate-400 font-semibold"><span className="text-indigo-600 font-bold">Pilih berkas</span> atau seret kesini</p>
                      <p className="text-[10px] text-slate-400">PDF, DOCX, XLSX, max 10MB</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setUploadForm(prev => ({ ...prev, file }));
                      }} 
                    />
                  </label>
                </div>
                {uploadForm.file && (
                  <div className="flex items-center gap-2 p-2 mt-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-400">
                    <FileText size={16} className="shrink-0" />
                    <span className="font-semibold truncate flex-1">{uploadForm.file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                      className="text-indigo-500 hover:text-indigo-700 font-bold ml-1"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>

              {typeof uploadProgress === 'number' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">
                    <span>Mengunggah Berkas</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)} className="rounded-xl font-bold" disabled={typeof uploadProgress === 'number'}>BATAL</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold" disabled={!uploadForm.file || typeof uploadProgress === 'number'}>UNGGAH</Button>
              </div>
            </form>
          </Modal>
        </Suspense>

        <Suspense fallback={null}>
          <Modal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            title="Verifikasi Perangkat Ajar"
          >
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Status Persetujuan</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, status: 'APPROVED' }))}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                      reviewForm.status === 'APPROVED' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-500 dark:text-emerald-400' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <CheckCircle size={16} />
                    SETUJUI (APPROVED)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, status: 'REJECTED' }))}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                      reviewForm.status === 'REJECTED' 
                        ? 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-950/20 dark:border-rose-500 dark:text-rose-400' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <XCircle size={16} />
                    TOLAK (REJECTED)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="catatan-reviewer" className="text-xs font-bold text-slate-500 dark:text-slate-400">Catatan Umpan Balik (Feedback Reviewer)</label>
                <textarea
                  id="catatan-reviewer"
                  placeholder="Berikan saran/rekomendasi perbaikan berkas perangkat ajar bila ada..."
                  rows={4}
                  value={reviewForm.catatan_reviewer}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, catatan_reviewer: e.target.value }))}
                  aria-label="Catatan Umpan Balik"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsReviewModalOpen(false)} className="rounded-xl font-bold">BATAL</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">SIMPAN VERIFIKASI</Button>
              </div>
            </form>
          </Modal>
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
}
