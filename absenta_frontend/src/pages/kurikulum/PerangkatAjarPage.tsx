import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Search, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  Clock
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi, mapelApi, guruApi } from '../../api/academic.api';
import { toast } from 'sonner';

export default function PerangkatAjarPage() {
  const queryClient = useQueryClient();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPerangkatId, setSelectedPerangkatId] = useState<string | null>(null);

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('');

  // Form State Upload
  const [uploadForm, setUploadForm] = useState({
    judul: '',
    jenis: 'RPP',
    mapel_id: '',
    guru_id: '',
    file_url: ''
  });

  // Form State Review
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    catatan_reviewer: ''
  });

  // Fetch Metadata
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });
  const activeYear = useMemo(() => (years?.data ?? []).find(y => y.is_active), [years]);
  const activeSemester = useMemo(() => activeYear?.Semester?.find((s: any) => s.is_active), [activeYear]);

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => guruApi.getAll()
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => mapelApi.getAll()
  });

  // Fetch Perangkat Ajar List
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

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: kurikulumApi.uploadPerangkatAjar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success('Perangkat ajar berhasil diunggah');
      setIsUploadModalOpen(false);
      setUploadForm({ judul: '', jenis: 'RPP', mapel_id: '', guru_id: '', file_url: '' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengunggah berkas');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => kurikulumApi.reviewPerangkatAjar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success('Hasil verifikasi berhasil disimpan');
      setIsReviewModalOpen(false);
      setReviewForm({ status: 'APPROVED', catatan_reviewer: '' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan verifikasi');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: kurikulumApi.deletePerangkatAjar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success('Berkas berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus berkas');
    }
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.judul || !uploadForm.mapel_id || !uploadForm.guru_id || !uploadForm.file_url) {
      toast.error('Harap isi semua kolom formulir');
      return;
    }
    uploadMutation.mutate({
      ...uploadForm,
      tahun_pelajaran_id: activeYear!.id,
      semester_id: activeSemester!.id
    });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerangkatId) return;
    reviewMutation.mutate({
      id: selectedPerangkatId,
      data: reviewForm
    });
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', href: '/kurikulum/dashboard' },
    { label: 'Perangkat Ajar' }
  ], []);

  return (
    <AcademicPageLayout
      title="Perangkat Ajar Guru"
      description="Manajemen pengunggahan dan verifikasi berkas administrasi KBM guru."
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Header toolbar */}
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

        {/* Filter bar */}
        <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 flex flex-wrap gap-4 items-center">
          <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
            <Filter size={16} className="mr-1.5" />
            Filter Data
          </div>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2.5 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Status Review</option>
            <option value="PENDING">PENDING (Belum Diverifikasi)</option>
            <option value="APPROVED">APPROVED (Disetujui)</option>
            <option value="REJECTED">REJECTED (Ditolak)</option>
          </select>

          <select 
            value={filterJenis} 
            onChange={(e) => setFilterJenis(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2.5 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Jenis Berkas</option>
            <option value="RPP">RPP / Modul Ajar</option>
            <option value="SILABUS">Silabus</option>
            <option value="PROTA">Program Tahunan (PROTA)</option>
            <option value="PROMES">Program Semester (PROMES)</option>
          </select>

          <select 
            value={filterMapel} 
            onChange={(e) => setFilterMapel(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2.5 text-slate-700 dark:text-slate-300 max-w-[200px] focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Mata Pelajaran</option>
            {subjects?.data?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.nama_mapel}</option>
            ))}
          </select>
        </Card>

        {/* List Perangkat Ajar */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-xs italic">Memuat berkas perangkat ajar...</div>
        ) : !listPerangkat?.data || listPerangkat.data.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3">
            <FileText size={48} className="text-slate-300" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Dokumen</h4>
            <p className="text-xs text-slate-450 max-w-sm">Guru belum mengunggah perangkat ajar di tahun pelajaran atau semester aktif ini.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listPerangkat.data.map((item: any) => (
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
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin menghapus berkas ini?')) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 p-2"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Upload */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Unggah Perangkat Ajar</h3>
                <p className="text-xs text-slate-400">Silakan lengkapi data administrasi mengajar Anda di bawah ini.</p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Judul Dokumen</label>
                  <input
                    type="text"
                    placeholder="Contoh: RPP Matematika Kelas X Trigonometri"
                    value={uploadForm.judul}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, judul: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Jenis Perangkat</label>
                    <select
                      value={uploadForm.jenis}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, jenis: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="RPP">RPP / Modul Ajar</option>
                      <option value="SILABUS">Silabus</option>
                      <option value="PROTA">PROTA</option>
                      <option value="PROMES">PROMES</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Mata Pelajaran</label>
                    <select
                      value={uploadForm.mapel_id}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, mapel_id: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Pilih Mapel</option>
                      {subjects?.data?.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Guru Pengajar</label>
                  <select
                    value={uploadForm.guru_id}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, guru_id: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Guru</option>
                    {teachers?.data?.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.nama_guru}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">URL Tautan Berkas (PDF/Drive)</label>
                  <input
                    type="url"
                    placeholder="https://storage.absenta.id/rpp/... atau Google Drive Link"
                    value={uploadForm.file_url}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, file_url: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)} className="rounded-xl font-bold">BATAL</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">UNGGAH</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal Review */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Verifikasi Perangkat Ajar</h3>
                <p className="text-xs text-slate-400">Berikan penilaian kelayakan administrasi berkas guru.</p>
              </div>

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
                  <label className="text-xs font-bold text-slate-500">Catatan Umpan Balik (Feedback Reviewer)</label>
                  <textarea
                    placeholder="Berikan saran/rekomendasi perbaikan RPP bila ada..."
                    rows={4}
                    value={reviewForm.catatan_reviewer}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, catatan_reviewer: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsReviewModalOpen(false)} className="rounded-xl font-bold">BATAL</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">SIMPAN VERIFIKASI</Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </AcademicPageLayout>
  );
}
