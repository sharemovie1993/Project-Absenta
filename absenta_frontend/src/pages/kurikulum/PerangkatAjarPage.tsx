import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
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
  Clock
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi, mapelApi, guruApi } from '../../api/academic.api';
import { toast } from 'sonner';
import useConfirm from '../../hooks/useConfirm';
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

const uploadSchema = z.object({
  judul: z.string().min(1, 'Judul dokumen wajib diisi'),
  jenis: z.string().min(1, 'Jenis perangkat wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  guru_id: z.string().min(1, 'Guru pengajar wajib dipilih'),
  file_url: z.string().url('URL tautan berkas harus berupa URL yang valid')
});

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  catatan_reviewer: z.string().optional()
});

export default function PerangkatAjarPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPerangkatId, setSelectedPerangkatId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('');

  const [uploadForm, setUploadForm] = useState({
    judul: '',
    jenis: 'RPP',
    mapel_id: '',
    guru_id: '',
    file_url: ''
  });

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

  const uploadMutation = useMutation({
    mutationFn: kurikulumApi.uploadPerangkatAjar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success('Perangkat ajar berhasil diunggah');
      setIsUploadModalOpen(false);
      setUploadForm({ judul: '', jenis: 'RPP', mapel_id: '', guru_id: '', file_url: '' });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal mengunggah berkas');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewPayload }) => kurikulumApi.reviewPerangkatAjar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
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
    uploadMutation.mutate({
      ...uploadForm,
      tahun_pelajaran_id: activeYear!.id,
      semester_id: activeSemester!.id
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

  const filterStatusOptions = useMemo(() => [
    { label: 'Semua Status Review', value: '' },
    { label: 'PENDING (Belum Diverifikasi)', value: 'PENDING' },
    { label: 'APPROVED (Disetujui)', value: 'APPROVED' },
    { label: 'REJECTED (Ditolak)', value: 'REJECTED' }
  ], []);

  const filterJenisOptions = useMemo(() => [
    { label: 'Semua Jenis Berkas', value: '' },
    { label: 'RPP / Modul Ajar', value: 'RPP' },
    { label: 'Silabus', value: 'SILABUS' },
    { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
    { label: 'Program Semester (PROMES)', value: 'PROMES' }
  ], []);

  const filterMapelOptions = useMemo(() => [
    { label: 'Semua Mata Pelajaran', value: '' },
    ...(subjects?.data ?? [])?.map((m: Subject) => ({ label: m.nama_mapel, value: m.id }))
  ], [subjects]);

  const formJenisOptions = useMemo(() => [
    { label: 'RPP / Modul Ajar', value: 'RPP' },
    { label: 'Silabus', value: 'SILABUS' },
    { label: 'PROTA', value: 'PROTA' },
    { label: 'PROMES', value: 'PROMES' }
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

  return (
    <AcademicPageLayout
      title="Perangkat Ajar Guru"
      description="Manajemen pengunggahan dan verifikasi berkas administrasi KBM guru."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey={hardeningModuleKey}
      instruction={{
        title: 'Panduan Perangkat Ajar',
        description: 'Repositori penyimpanan berkas administrasi KBM guru seperti RPP, Silabus, PROTA, dan PROMES.',
        items: [
          { text: 'Guru dapat mengunggah dokumen dengan mengklik tombol "UNGGAH BERKAS".' },
          { text: 'Staf kurikulum dapat melakukan verifikasi (APPROVED / REJECTED) dengan mengklik tombol "VERIFIKASI".' },
          { text: 'Filter status dan mata pelajaran di atas untuk menyaring data.' }
        ]
      }}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repositori Perangkat Ajar</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Verifikasi berkas RPP, Modul Ajar, Silabus, dan Program Tahunan Guru.</p>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold"
          >
            <Upload className="w-4 h-4 mr-2" />
            UNGGAH BERKAS
          </Button>
        </div>

        <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 flex flex-wrap gap-4 items-center">
          <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
            <Filter size={16} className="mr-1.5" />
            Filter Data
          </div>

          <Suspense fallback={<div className="h-9 w-60 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />}>
            <div className="w-full sm:w-60">
              <SearchableSelect
                id="filter-status-select"
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={filterStatusOptions}
                placeholder="Semua Status Review"
              />
            </div>
          </Suspense>

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
            <p className="text-xs text-slate-400 max-w-sm">Guru belum mengunggah perangkat ajar di tahun pelajaran atau semester aktif ini.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listPerangkat?.data?.map((item: PerangkatAjar) => (
              <Card key={item.id} className="p-5 border-none shadow-sm relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border-none">{item.jenis}</Badge>
                    {item.status === 'APPROVED' && <Badge className="bg-emerald-50 text-emerald-600 border-none font-black flex items-center"><Check size={12} className="mr-1" /> APPROVED</Badge>}
                    {item.status === 'REJECTED' && <Badge className="bg-rose-50 text-rose-600 border-none font-black flex items-center"><XCircle size={12} className="mr-1" /> REJECTED</Badge>}
                    {item.status === 'PENDING' && <Badge className="bg-amber-50 text-amber-600 border-none font-black flex items-center"><Clock size={12} className="mr-1" /> PENDING</Badge>}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-500 transition-colors line-clamp-1">{item.judul}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Guru: {item.Guru?.nama_guru} | NIP. {item.Guru?.nip || '-'}</p>
                    <p className="text-[11px] text-slate-400">Mapel: {item.Mapel?.nama_mapel} ({item.Mapel?.kode_mapel})</p>
                  </div>

                  {item.catatan_reviewer && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-[11px] text-slate-500 border border-slate-100 dark:border-slate-800 italic">
                      "Review: {item.catatan_reviewer}"
                      <p className="text-[9px] text-slate-400 mt-1 font-semibold not-italic">— Verifikator: {item.Reviewer?.full_name || 'Admin'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50 dark:border-slate-800">
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center">
                      <ExternalLink size={14} className="mr-1.5" />
                      UNDUH BERKAS
                    </Button>
                  </a>

                  <div className="flex items-center gap-2">
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

                    <Button
                      onClick={() => handleDelete(item.id)}
                      variant="ghost"
                      size="sm"
                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 p-2"
                      aria-label="Hapus perangkat ajar"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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
                <label htmlFor="judul-input" className="text-xs font-bold text-slate-500">Judul Dokumen</label>
                <input
                  id="judul-input"
                  type="text"
                  placeholder="Contoh: RPP Matematika Kelas X Trigonometri"
                  value={uploadForm.judul}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, judul: e.target.value }))}
                  aria-label="Judul dokumen"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="jenis-select" className="text-xs font-bold text-slate-500">Jenis Perangkat</label>
                  <SearchableSelect
                    id="jenis-select"
                    value={uploadForm.jenis}
                    onValueChange={(val) => setUploadForm(prev => ({ ...prev, jenis: val }))}
                    options={formJenisOptions}
                    placeholder="Pilih Jenis"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="mapel-select" className="text-xs font-bold text-slate-500">Mata Pelajaran</label>
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
                <label htmlFor="guru-select" className="text-xs font-bold text-slate-500">Guru Pengajar</label>
                <SearchableSelect
                  id="guru-select"
                  value={uploadForm.guru_id}
                  onValueChange={(val) => setUploadForm(prev => ({ ...prev, guru_id: val }))}
                  options={formGuruOptions}
                  placeholder="Pilih Guru"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="file-url-input" className="text-xs font-bold text-slate-500">URL Tautan Berkas (PDF/Drive)</label>
                <input
                  id="file-url-input"
                  type="url"
                  placeholder="https://storage.absenta.id/rpp/... atau Google Drive Link"
                  value={uploadForm.file_url}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, file_url: e.target.value }))}
                  aria-label="URL Tautan Berkas"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)} className="rounded-xl font-bold">BATAL</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">UNGGAH</Button>
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
                <label className="text-xs font-bold text-slate-500">Status Persetujuan</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, status: 'APPROVED' }))}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                      reviewForm.status === 'APPROVED' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
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
                        ? 'bg-rose-50 border-rose-500 text-rose-600' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <XCircle size={16} />
                    TOLAK (REJECTED)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="catatan-reviewer" className="text-xs font-bold text-slate-500">Catatan Umpan Balik (Feedback Reviewer)</label>
                <textarea
                  id="catatan-reviewer"
                  placeholder="Berikan saran/rekomendasi perbaikan RPP bila ada..."
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
