import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi, type HubinLowongan, type HubinLamaran } from '../../../api/hubin.api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { useAuthStore } from '../../../store/authStore';
import { 
  Briefcase, 
  Building, 
  Calendar, 
  Plus, 
  Search, 
  ExternalLink,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const BkkSection: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'lowongan' | 'pelamar'>('lowongan');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedLowongan, setSelectedLowongan] = useState<HubinLowongan | null>(null);
  
  // Apply Form State
  const [cvUrl, setCvUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Lowongan Form State
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [quota, setQuota] = useState(1);
  const [closingDate, setClosingDate] = useState('');

  const canManageBkk = useMemo(() => {
    const roleName = user?.role?.name?.toUpperCase() || '';
    return roleName === 'HUBIN' || 
           roleName === 'SUPERADMIN' || 
           roleName === 'ADMIN' ||
           user?.position_codes?.includes('HUBIN') ||
           user?.position_codes?.includes('BKK') ||
           user?.capabilities?.includes('hubin.bkk.manage') ||
           user?.capabilities?.includes('hubin.partners.manage');
  }, [user]);

  // Queries
  const { data: lowonganData, isLoading: loadingJobs } = useQuery({
    queryKey: ['hubin-lowongan', searchTerm],
    queryFn: () => hubinApi.getLowongan({ search: searchTerm }),
  });

  const { data: lamaranData, isLoading: loadingApplicants } = useQuery({
    queryKey: ['hubin-lamaran'],
    queryFn: () => hubinApi.getLamaran(),
    enabled: canManageBkk || activeSubTab === 'pelamar'
  });

  const myLamaranData = useQuery({
    queryKey: ['my-lamaran', user?.id],
    queryFn: () => hubinApi.getLamaran({ siswaId: user?.id }),
    enabled: !canManageBkk && !!user?.id
  });

  const resetForm = useCallback(() => {
    setJobTitle('');
    setCompanyName('');
    setDescription('');
    setRequirements('');
    setQuota(1);
    setClosingDate('');
  }, []);

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: (data: Partial<HubinLowongan>) => hubinApi.createLowongan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-lowongan'] });
      toast.success('Lowongan kerja berhasil diterbitkan!');
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal membuat lowongan';
      toast.error(errMsg);
    }
  });

  const applyJobMutation = useMutation({
    mutationFn: (data: Partial<HubinLamaran>) => hubinApi.createLamaran(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lamaran'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-lamaran'] });
      toast.success('Lamaran Anda berhasil dikirim!');
      setIsApplyOpen(false);
      setCvUrl('');
      setNotes('');
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal mengirim lamaran';
      toast.error(errMsg);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: string; catatan?: string }) => 
      hubinApi.updateLamaranStatus(id, status, catatan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-lamaran'] });
      toast.success('Status lamaran berhasil diperbarui!');
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal memperbarui status';
      toast.error(errMsg);
    }
  });

  const handleCreateJob = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !companyName || !description || !closingDate) {
      toast.error('Mohon isi semua field wajib');
      return;
    }
    createJobMutation.mutate({
      judul_posisi: jobTitle,
      perusahaan_nama: companyName,
      deskripsi: description,
      persyaratan: requirements,
      kuota: quota,
      tanggal_tutup: closingDate,
      status: 'BUKA'
    });
  }, [jobTitle, companyName, description, requirements, quota, closingDate, createJobMutation]);

  const handleApplyJob = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLowongan) return;
    applyJobMutation.mutate({
      lowongan_id: selectedLowongan.id,
      cv_url: cvUrl,
      catatan: notes,
      status_seleksi: 'TERKIRIM'
    });
  }, [selectedLowongan, cvUrl, notes, applyJobMutation]);

  const handleUpdateStatus = useCallback((id: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      'TERKIRIM': 'PROSES',
      'PROSES': 'INTERVIEW',
      'INTERVIEW': 'DITERIMA'
    };
    const next = nextStatusMap[currentStatus];
    if (next) {
      updateStatusMutation.mutate({ id, status: next });
    }
  }, [updateStatusMutation]);

  const handleReject = useCallback((id: string) => {
    const catatan = prompt('Masukkan alasan penolakan (opsional):') || undefined;
    updateStatusMutation.mutate({ id, status: 'DITOLAK', catatan });
  }, [updateStatusMutation]);

  const jobsList = useMemo(() => lowonganData?.data || [], [lowonganData]);
  const applicantsList = useMemo(() => lamaranData?.data || [], [lamaranData]);
  const myApplications = useMemo(() => myLamaranData?.data || [], [myLamaranData]);

  return (
    <div className="space-y-6">
      {canManageBkk && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-4">
          <button
            onClick={() => setActiveSubTab('lowongan')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 ${activeSubTab === 'lowongan' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Daftar Lowongan Pekerjaan
          </button>
          <button
            onClick={() => setActiveSubTab('pelamar')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 ${activeSubTab === 'pelamar' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Kelola Pelamar BKK ({applicantsList?.length || 0})
          </button>
        </div>
      )}

      {activeSubTab === 'lowongan' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari lowongan posisi / perusahaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Cari lowongan posisi atau perusahaan"
                className="pl-9 text-xs rounded-xl"
              />
            </div>
            {canManageBkk && (
              <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto flex items-center gap-1.5 text-xs py-2 rounded-xl">
                <Plus size={14} /> Terbitkan Lowongan BKK
              </Button>
            )}
          </div>

          {loadingJobs ? (
            <div className="py-12 flex justify-center"><Loader /></div>
          ) : jobsList?.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-bold bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              Tidak ada lowongan BKK yang tersedia saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobsList?.map((job: HubinLowongan) => {
                const isClosed = new Date(job.tanggal_tutup) < new Date() || job.status === 'TUTUP';
                const hasApplied = myApplications?.some((app: HubinLamaran) => app.lowongan_id === job.id);
                return (
                  <Card key={job.id} className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{job.judul_posisi}</h3>
                          <Badge variant={isClosed ? 'secondary' : 'success'}>{isClosed ? 'TUTUP' : 'BUKA'}</Badge>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building size={12} className="text-slate-400" /> {job.perusahaan_nama}
                        </p>
                      </div>
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl"><Briefcase size={16} /></div>
                    </div>
                    <div className="my-4 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                      <p className="font-bold mb-1">Kualifikasi / Persyaratan:</p>
                      <p className="whitespace-pre-line">{job.persyaratan || job.deskripsi}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold gap-2">
                      <span className="flex items-center gap-1"><Calendar size={12} /> Batas Akhir: {new Date(job.tanggal_tutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span>Kuota: {job.kuota} orang</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {!canManageBkk && (
                        <Button 
                          onClick={() => { setSelectedLowongan(job); setIsApplyOpen(true); }}
                          disabled={isClosed || hasApplied}
                          className="w-full text-xs rounded-xl"
                          variant={hasApplied ? 'secondary' : 'primary'}
                        >
                          {hasApplied ? 'Sudah Dilamar' : 'Lamar Sekarang'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!canManageBkk && myApplications?.length > 0 && (
            <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl mt-6">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Riwayat Lamaran Pekerjaan Anda</span>
              <div className="space-y-3">
                {myApplications?.map((app: HubinLamaran) => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{app.Lowongan?.judul_posisi}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{app.Lowongan?.perusahaan_nama}</p>
                    </div>
                    <Badge variant={app.status_seleksi === 'DITERIMA' ? 'success' : app.status_seleksi === 'DITOLAK' ? 'destructive' : app.status_seleksi === 'TERKIRIM' ? 'secondary' : 'info'} className="font-bold text-[9px]">{app.status_seleksi}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Data Lamaran Kerja Masuk (BKK)</span>
          {loadingApplicants ? (
            <div className="py-12 flex justify-center"><Loader /></div>
          ) : applicantsList?.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold">Belum ada lamaran masuk dari alumni.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                    <th className="py-3 px-3">Pelamar (Alumni)</th>
                    <th className="py-3 px-3">NIS</th>
                    <th className="py-3 px-3">Posisi Dilamar</th>
                    <th className="py-3 px-3">CV & Portofolio</th>
                    <th className="py-3 px-3">Status Seleksi</th>
                    <th className="py-3 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {applicantsList?.map((app: HubinLamaran) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200">{app.Siswa?.nama_siswa}</td>
                      <td className="py-3.5 px-3 text-slate-555">{app.Siswa?.nis}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-350">{app.Lowongan?.judul_posisi}</div>
                        <div className="text-[10px] text-slate-400">{app.Lowongan?.perusahaan_nama}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        {app.cv_url ? (
                          <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold hover:underline">
                            Buka CV <ExternalLink size={10} />
                          </a>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={app.status_seleksi === 'DITERIMA' ? 'success' : app.status_seleksi === 'DITOLAK' ? 'destructive' : app.status_seleksi === 'TERKIRIM' ? 'secondary' : 'info'} className="font-bold text-[9px]">{app.status_seleksi}</Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-1">
                        {app.status_seleksi !== 'DITERIMA' && app.status_seleksi !== 'DITOLAK' && (
                          <>
                            <button onClick={() => handleUpdateStatus(app.id, app.status_seleksi)} className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded-lg font-bold text-[10px] transition-colors border border-indigo-100 dark:border-indigo-900">
                              {app.status_seleksi === 'TERKIRIM' ? 'Proses Administrasi' : app.status_seleksi === 'PROSES' ? 'Jadwalkan Interview' : 'Terima Pekerja'}
                            </button>
                            <button onClick={() => handleReject(app.id)} className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-lg font-bold text-[10px] transition-colors border border-rose-100 dark:border-rose-900">Tolak</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Briefcase size={16} className="text-indigo-600" /> Form Terbitkan Lowongan Kerja BKK</h3>
            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="jobTitle" className="font-bold text-slate-600 dark:text-slate-400">Judul Posisi Pekerjaan *</label>
                <Input id="jobTitle" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Junior Web Developer" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="companyName" className="font-bold text-slate-600 dark:text-slate-400">Nama Perusahaan / DU-DI *</label>
                <Input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. PT Astra Honda Motor" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="quota" className="font-bold text-slate-600 dark:text-slate-400">Kuota Penerimaan</label>
                  <Input id="quota" type="number" value={quota} onChange={(e) => setQuota(parseInt(e.target.value))} min={1} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="closingDate" className="font-bold text-slate-600 dark:text-slate-400">Batas Tanggal Tutup *</label>
                  <Input id="closingDate" type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="requirements" className="font-bold text-slate-600 dark:text-slate-400">Kualifikasi & Persyaratan *</label>
                <textarea id="requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="e.g. Lulusan Jurusan RPL, Menguasai React & NodeJS..." className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="description" className="font-bold text-slate-600 dark:text-slate-400">Deskripsi Pekerjaan / Job Desc</label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Tuliskan gambaran pekerjaan secara garis besar..." className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); resetForm(); }} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={createJobMutation.isPending} className="rounded-xl">{createJobMutation.isPending ? 'Menerbitkan...' : 'Terbitkan Lowongan'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {isApplyOpen && selectedLowongan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><ClipboardCheck size={16} className="text-indigo-600" /> Lamar Posisi: {selectedLowongan.judul_posisi}</h3>
            <form onSubmit={handleApplyJob} className="space-y-4 text-xs">
              <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">Anda melamar di <strong>{selectedLowongan.perusahaan_nama}</strong>.</p>
              <div className="space-y-1">
                <label htmlFor="cvUrl" className="font-bold text-slate-600 dark:text-slate-400">Tautan CV Digital / Portofolio (URL Drive/PDF) *</label>
                <Input id="cvUrl" type="url" value={cvUrl} onChange={(e) => setCvUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." required />
              </div>
              <div className="space-y-1">
                <label htmlFor="notes" className="font-bold text-slate-600 dark:text-slate-400">Catatan Tambahan / Cover Letter</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Tulis salam pengantar singkat..." className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setIsApplyOpen(false); setCvUrl(''); setNotes(''); }} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={applyJobMutation.isPending} className="rounded-xl">{applyJobMutation.isPending ? 'Mengirim...' : 'Kirim Lamaran'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

