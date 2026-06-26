import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi, type HubinLowongan, type HubinLamaran, type HubinLamaranLog } from '../../../api/hubin.api';
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
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  UserCheck,
  ChevronRight,
  X,
  MapPin,
  Link2,
  MessageSquare,
  User,
  History,
  AlertTriangle,
  Info,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { variant: 'info' | 'warning' | 'success' | 'error' | 'secondary'; icon: React.ReactNode; label: string; bg: string; dot: string }
> = {
  TERKIRIM: {
    variant: 'info',
    icon: <Send size={9} />,
    label: 'Terkirim',
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50',
    dot: 'bg-blue-400',
  },
  PROSES: {
    variant: 'warning',
    icon: <Clock size={9} />,
    label: 'Proses Adm.',
    bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50',
    dot: 'bg-amber-400',
  },
  INTERVIEW: {
    variant: 'info',
    icon: <UserCheck size={9} />,
    label: 'Interview',
    bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/50',
    dot: 'bg-violet-500',
  },
  DITERIMA: {
    variant: 'success',
    icon: <CheckCircle2 size={9} />,
    label: 'Diterima 🎉',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50',
    dot: 'bg-emerald-500',
  },
  DITOLAK: {
    variant: 'error',
    icon: <XCircle size={9} />,
    label: 'Ditolak',
    bg: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50',
    dot: 'bg-red-400',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Modal Jadwalkan Interview */
const InterviewModal: React.FC<{
  lamaran: HubinLamaran;
  onClose: () => void;
  onSubmit: (data: { tanggal: string; lokasi?: string; link?: string; pesan?: string; narahubung?: string }) => void;
  isPending: boolean;
}> = ({ lamaran, onClose, onSubmit, isPending }) => {
  const [tanggal, setTanggal] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [link, setLink] = useState('');
  const [pesan, setPesan] = useState('');
  const [narahubung, setNarahubung] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal) { toast.error('Tanggal & waktu interview wajib diisi'); return; }
    onSubmit({ tanggal, lokasi: lokasi || undefined, link: link || undefined, pesan: pesan || undefined, narahubung: narahubung || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg"><UserCheck size={16} className="text-white" /></div>
            <div>
              <h3 className="text-sm font-black text-white">Jadwalkan Interview</h3>
              <p className="text-[10px] text-violet-200">{lamaran.Siswa?.nama_siswa} — {lamaran.Lowongan?.judul_posisi}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Date + time */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar size={12} className="text-violet-500" /> Tanggal & Waktu Interview *
            </label>
            <Input
              type="datetime-local"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          {/* Lokasi */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin size={12} className="text-violet-500" /> Lokasi / Alamat
            </label>
            <Input
              type="text"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder="Contoh: Gedung A Lantai 3, Jl. Merdeka No.1"
              className="rounded-xl"
            />
          </div>

          {/* Link Meet/Zoom */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Link2 size={12} className="text-violet-500" /> Link Meet / Zoom (jika online)
            </label>
            <Input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="rounded-xl"
            />
          </div>

          {/* Narahubung */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <User size={12} className="text-violet-500" /> Narahubung BKK
            </label>
            <Input
              type="text"
              value={narahubung}
              onChange={(e) => setNarahubung(e.target.value)}
              placeholder="Nama & nomor HP narahubung"
              className="rounded-xl"
            />
          </div>

          {/* Pesan ke alumni */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-violet-500" /> Pesan / Instruksi Tambahan
            </label>
            <textarea
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              rows={3}
              placeholder="Contoh: Harap membawa fotokopi KTP, ijazah, dan sertifikat kompetensi."
              className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-violet-500 outline-hidden resize-none"
            />
          </div>

          {/* WA note */}
          <div className="flex items-start gap-2 text-[10px] text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/20 p-3 rounded-xl border border-violet-200/50 dark:border-violet-800/50">
            <Info size={12} className="shrink-0 mt-0.5" />
            <span>Notifikasi WA akan otomatis dikirim ke alumni jika Anda telah menghubungkan WhatsApp di Pengaturan Platform.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl text-xs">Batal</Button>
            <Button type="submit" disabled={isPending} className="rounded-xl text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-transparent">
              {isPending ? 'Menjadwalkan...' : '📅 Kirim Jadwal Interview'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

/** Modal Penolakan Profesional */
const RejectModal: React.FC<{
  lamaran: HubinLamaran;
  onClose: () => void;
  onSubmit: (catatan: string) => void;
  isPending: boolean;
}> = ({ lamaran, onClose, onSubmit, isPending }) => {
  const [alasan, setAlasan] = useState('');
  const [custom, setCustom] = useState('');

  const presets = [
    'Kualifikasi tidak sesuai dengan persyaratan posisi',
    'Posisi sudah terisi oleh kandidat lain',
    'Profil tidak cocok dengan budaya perusahaan',
    'Dokumen aplikasi tidak lengkap',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catatan = custom || alasan;
    if (!catatan.trim()) { toast.error('Mohon pilih atau tulis alasan penolakan'); return; }
    onSubmit(catatan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg"><XCircle size={16} className="text-white" /></div>
            <div>
              <h3 className="text-sm font-black text-white">Tolak Lamaran</h3>
              <p className="text-[10px] text-rose-200">{lamaran.Siswa?.nama_siswa}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-2">
            <label className="font-bold text-slate-600 dark:text-slate-400">Pilih Alasan Penolakan</label>
            <div className="space-y-2">
              {presets.map((p) => (
                <label key={p} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  alasan === p && !custom
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-rose-200 hover:bg-rose-50/30'
                }`}>
                  <input
                    type="radio"
                    name="alasan"
                    value={p}
                    checked={alasan === p && !custom}
                    onChange={() => { setAlasan(p); setCustom(''); }}
                    className="accent-rose-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 dark:text-slate-400">Atau tulis alasan khusus</label>
            <textarea
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setAlasan(''); }}
              rows={3}
              placeholder="Tulis pesan penolakan yang sopan dan informatif..."
              className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 outline-hidden resize-none"
            />
          </div>

          <div className="flex items-start gap-2 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/50">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>Alumni akan menerima notifikasi WA berisi alasan penolakan ini (jika WA terhubung). Sampaikan dengan sopan.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl text-xs">Batal</Button>
            <Button type="submit" disabled={isPending} className="rounded-xl text-xs bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-transparent">
              {isPending ? 'Menolak...' : 'Kirim Penolakan'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

/** Timeline per-lamaran */
const TimelinePanel: React.FC<{ lamaranId: string; tenantId?: string }> = ({ lamaranId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['lamaran-timeline', lamaranId],
    queryFn: () => hubinApi.getLamaranTimeline(lamaranId),
    enabled: !!lamaranId,
  });

  const logs: HubinLamaranLog[] = data?.data || [];

  if (isLoading) return <div className="py-4 flex justify-center"><Loader /></div>;
  if (!logs.length) return <p className="text-[10px] text-slate-400 text-center py-3">Belum ada riwayat</p>;

  return (
    <div className="mt-3 space-y-0">
      {logs.map((log, i) => {
        const cfg = STATUS_CONFIG[log.status_ke] || STATUS_CONFIG['TERKIRIM'];
        const date = new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div key={log.id} className="relative flex gap-3 pb-4">
            {/* Vertical line */}
            {i < logs.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
            )}
            {/* Dot */}
            <div className={`mt-0.5 w-6 h-6 rounded-full ${cfg.dot} flex items-center justify-center shrink-0 z-10 ring-2 ring-white dark:ring-slate-900`}>
              <span className="text-white text-[8px]">{cfg.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={cfg.variant} className="text-[8px] font-black flex items-center gap-0.5">
                  {cfg.icon} {cfg.label}
                </Badge>
                <span className="text-[9px] text-slate-400">{date}</span>
              </div>
              {log.catatan && <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">{log.catatan}</p>}
              {log.interview_tanggal && (
                <div className="mt-1.5 text-[9px] space-y-0.5 bg-violet-50 dark:bg-violet-950/20 rounded-lg p-2 border border-violet-100 dark:border-violet-900/50">
                  <p className="flex items-center gap-1 font-semibold text-violet-700 dark:text-violet-300">
                    <Calendar size={9} />
                    {new Date(log.interview_tanggal).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                  {log.interview_lokasi && <p className="flex items-center gap-1 text-slate-500"><MapPin size={9} /> {log.interview_lokasi}</p>}
                  {log.interview_link && (
                    <a href={log.interview_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline">
                      <Link2 size={9} /> {log.interview_link}
                    </a>
                  )}
                  {log.interview_narahubung && <p className="flex items-center gap-1 text-slate-500"><User size={9} /> {log.interview_narahubung}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const BkkSection: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeSubTab, setActiveSubTab] = useState<'lowongan' | 'pelamar'>('lowongan');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedLowongan, setSelectedLowongan] = useState<HubinLowongan | null>(null);

  // Apply Form
  const [cvUrl, setCvUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Lowongan Form
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [quota, setQuota] = useState(1);
  const [closingDate, setClosingDate] = useState('');

  // Modal states
  const [interviewTarget, setInterviewTarget] = useState<HubinLamaran | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HubinLamaran | null>(null);
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);

  // Auto-suggest tracer study banner
  const [showTracerBanner, setShowTracerBanner] = useState(false);

  const isStudent = useMemo(() => user?.role?.name === 'SISWA', [user]);
  const canManageBkk = useMemo(() => {
    const roleName = user?.role?.name?.toUpperCase() || '';
    return (
      roleName === 'HUBIN' || roleName === 'SUPERADMIN' || roleName === 'ADMIN' ||
      user?.position_codes?.includes('HUBIN') || user?.position_codes?.includes('BKK') ||
      user?.capabilities?.includes('hubin.bkk.manage') || user?.capabilities?.includes('hubin.partners.manage')
    );
  }, [user]);

  // ── Queries ──
  const { data: lowonganData, isLoading: loadingJobs } = useQuery({
    queryKey: ['hubin-lowongan', searchTerm],
    queryFn: () => hubinApi.getLowongan({ search: searchTerm }),
  });

  const { data: lamaranData, isLoading: loadingApplicants } = useQuery({
    queryKey: ['hubin-lamaran'],
    queryFn: () => hubinApi.getLamaran(),
    enabled: canManageBkk || activeSubTab === 'pelamar',
  });

  const myLamaranData = useQuery({
    queryKey: ['my-lamaran', user?.id],
    queryFn: () => hubinApi.getLamaran({ siswaId: user?.id }),
    enabled: isStudent && !canManageBkk && !!user?.id,
  });

  // ── Mutations ──
  const createJobMutation = useMutation({
    mutationFn: (data: Partial<HubinLowongan>) => hubinApi.createLowongan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-lowongan'] });
      toast.success('Lowongan kerja berhasil diterbitkan!');
      setIsFormOpen(false);
      setJobTitle(''); setCompanyName(''); setDescription(''); setRequirements(''); setQuota(1); setClosingDate('');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Gagal membuat lowongan'),
  });

  const applyJobMutation = useMutation({
    mutationFn: (data: Partial<HubinLamaran>) => hubinApi.createLamaran(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lamaran'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-lamaran'] });
      toast.success('Lamaran Anda berhasil dikirim! 🚀');
      setIsApplyOpen(false); setCvUrl(''); setNotes('');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Gagal mengirim lamaran'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: string; catatan?: string }) =>
      hubinApi.updateLamaranStatus(id, status, catatan),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['hubin-lamaran'] });
      queryClient.invalidateQueries({ queryKey: ['lamaran-timeline', vars.id] });
      toast.success('Status lamaran berhasil diperbarui!');
      if (vars.status === 'DITERIMA') setShowTracerBanner(true);
      setRejectTarget(null);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Gagal memperbarui status'),
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hubinApi.scheduleInterview(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['hubin-lamaran'] });
      queryClient.invalidateQueries({ queryKey: ['lamaran-timeline', vars.id] });
      toast.success('Jadwal interview berhasil dikirim! 📅');
      setInterviewTarget(null);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Gagal menjadwalkan interview'),
  });

  const deleteLamaranMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deleteLamaran(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-lamaran'] });
      queryClient.invalidateQueries({ queryKey: ['my-lamaran'] });
      toast.success('Lamaran berhasil direset/dihapus! 🔄');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Gagal mereset lamaran'),
  });

  // ── Handlers ──
  const handleCreateJob = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !companyName || !description || !closingDate) { toast.error('Mohon isi semua field wajib'); return; }
    createJobMutation.mutate({ judul_posisi: jobTitle, perusahaan_nama: companyName, deskripsi: description, persyaratan: requirements, kuota: quota, tanggal_tutup: closingDate, status: 'BUKA' });
  }, [jobTitle, companyName, description, requirements, quota, closingDate, createJobMutation]);

  const handleApplyJob = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLowongan) return;
    applyJobMutation.mutate({ lowongan_id: selectedLowongan.id, cv_url: cvUrl, catatan: notes, status_seleksi: 'TERKIRIM' });
  }, [selectedLowongan, cvUrl, notes, applyJobMutation]);

  const handleAdvanceStatus = useCallback((app: HubinLamaran) => {
    const nextStatusMap: Record<string, string> = { TERKIRIM: 'PROSES', PROSES: 'PROSES' };
    const next = nextStatusMap[app.status_seleksi];
    if (next) updateStatusMutation.mutate({ id: app.id, status: next });
    else if (app.status_seleksi === 'INTERVIEW') {
      // "Terima" — move to DITERIMA
      updateStatusMutation.mutate({ id: app.id, status: 'DITERIMA' });
    }
  }, [updateStatusMutation]);

  const jobsList = useMemo(() => lowonganData?.data || [], [lowonganData]);
  const applicantsList = useMemo(() => lamaranData?.data || [], [lamaranData]);
  const myApplications = useMemo(() => myLamaranData?.data?.data || [], [myLamaranData]);

  return (
    <div className="space-y-6">
      {/* Auto-suggest Tracer Study Banner */}
      {showTracerBanner && (
        <div className="relative flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">Alumni Berhasil Diterima Kerja!</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
              Jangan lupa perbarui data Tracer Study alumni tersebut agar statistik penyerapan lulusan tetap akurat.
            </p>
            <button
              onClick={() => { navigate('/hubin/tracer'); setShowTracerBanner(false); }}
              className="mt-2 text-[10px] font-black text-emerald-700 dark:text-emerald-300 underline hover:text-emerald-600"
            >
              → Buka Tracer Study
            </button>
          </div>
          <button onClick={() => setShowTracerBanner(false)} className="text-emerald-400 hover:text-emerald-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sub-tab for managers */}
      {canManageBkk && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 mb-4">
          {(['lowongan', 'pelamar'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${activeSubTab === tab ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'lowongan' ? 'Daftar Lowongan Pekerjaan' : `Kelola Pelamar BKK (${applicantsList?.length || 0})`}
            </button>
          ))}
        </div>
      )}

      {/* ── Lowongan Tab ── */}
      {activeSubTab === 'lowongan' ? (
        <div className="space-y-6">
          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="text" placeholder="Cari lowongan posisi / perusahaan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 text-xs rounded-xl" />
            </div>
            {canManageBkk && (
              <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto flex items-center gap-1.5 text-xs py-2 rounded-xl">
                <Plus size={14} /> Terbitkan Lowongan BKK
              </Button>
            )}
          </div>

          {/* Job cards */}
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
                  <Card key={job.id} className={`relative overflow-hidden rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 group ${
                    hasApplied ? 'border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900/50'
                    : isClosed ? 'border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/40 opacity-75'
                    : 'border-indigo-100 dark:border-slate-800/50 bg-white dark:bg-slate-900/50'
                  }`}>
                    <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${
                      hasApplied ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                      : isClosed ? 'bg-gradient-to-r from-slate-300 to-slate-400'
                      : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    }`} />
                    <div className="p-5 pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{job.judul_posisi}</h3>
                            <Badge variant={isClosed ? 'secondary' : 'success'} className="text-[9px] font-black uppercase tracking-wider">
                              {isClosed ? '⛔ TUTUP' : '✅ BUKA'}
                            </Badge>
                            {hasApplied && (
                              <Badge variant="success" className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300/50">
                                <CheckCircle2 size={9} className="mr-0.5" /> Terlamar
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Building size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{job.perusahaan_nama}</span>
                          </p>
                        </div>
                        <div className={`ml-3 p-2.5 rounded-xl shrink-0 ${
                          hasApplied ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                          : isClosed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500'
                        }`}>
                          {hasApplied ? <CheckCircle2 size={16} /> : <Briefcase size={16} />}
                        </div>
                      </div>

                      <div className="mb-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/30 rounded-xl p-3 line-clamp-3">
                        <p className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px] mb-1">Kualifikasi / Persyaratan</p>
                        <p className="whitespace-pre-line leading-relaxed">{job.persyaratan || job.deskripsi}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold gap-2 mb-4">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(job.tanggal_tutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">👥 {job.kuota} kuota</span>
                      </div>

                      {isStudent && !canManageBkk && (
                        <button
                          onClick={() => { if (!hasApplied && !isClosed) { setSelectedLowongan(job); setIsApplyOpen(true); } }}
                          disabled={isClosed || hasApplied}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                            hasApplied ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-200 dark:border-emerald-800'
                            : isClosed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] border border-transparent'
                          }`}
                        >
                          {hasApplied ? <><CheckCircle2 size={13} /> Sudah Dilamar</>
                           : isClosed ? <><XCircle size={13} /> Lowongan Ditutup</>
                           : <><Send size={13} /> Lamar Sekarang <ChevronRight size={12} /></>}
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* My applications (student) */}
          {isStudent && !canManageBkk && myApplications?.length > 0 && (
            <Card className="border border-indigo-100/60 dark:border-slate-800/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900/60 dark:to-slate-900/40 backdrop-blur-md rounded-2xl mt-6 overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-indigo-100/50 dark:border-slate-800">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg"><ClipboardCheck size={12} className="text-indigo-600 dark:text-indigo-400" /></div>
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Riwayat Lamaran Pekerjaan Anda</span>
                <span className="ml-auto text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{myApplications.length} lamaran</span>
              </div>
              <div className="p-5 space-y-3">
                {myApplications?.map((app: HubinLamaran) => {
                  const cfg = STATUS_CONFIG[app.status_seleksi] || STATUS_CONFIG['TERKIRIM'];
                  const isExpanded = expandedTimeline === app.id;
                  return (
                    <div key={app.id} className={`rounded-xl border ${cfg.bg} transition-all overflow-hidden`}>
                      <div className="flex items-center justify-between p-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{app.Lowongan?.judul_posisi}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building size={9} /> {app.Lowongan?.perusahaan_nama}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <Badge variant={cfg.variant} className="font-black text-[9px] flex items-center gap-1">
                            {cfg.icon} {cfg.label}
                          </Badge>
                          <button
                            onClick={() => setExpandedTimeline(isExpanded ? null : app.id)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Riwayat status"
                          >
                            <History size={12} />
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 border-t border-white/40 dark:border-slate-800/50">
                          <TimelinePanel lamaranId={app.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* ── Pelamar Tab (Admin/BKK) ── */
        <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Data Lamaran Kerja Masuk (BKK)</span>
          {loadingApplicants ? (
            <div className="py-12 flex justify-center"><Loader /></div>
          ) : applicantsList?.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold">Belum ada lamaran masuk dari alumni.</div>
          ) : (
            <div className="space-y-4">
              {applicantsList?.map((app: HubinLamaran) => {
                const cfg = STATUS_CONFIG[app.status_seleksi] || STATUS_CONFIG['TERKIRIM'];
                const isExpanded = expandedTimeline === app.id;
                const isDone = app.status_seleksi === 'DITERIMA' || app.status_seleksi === 'DITOLAK';
                return (
                  <div key={app.id} className={`rounded-xl border ${cfg.bg} overflow-hidden transition-all`}>
                    {/* Main row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                      {/* Pelamar info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100">{app.Siswa?.nama_siswa}</p>
                          <Badge variant="secondary" className="text-[9px] font-bold">NIS: {app.Siswa?.nis}</Badge>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-col gap-0.5 font-medium">
                          {app.Siswa?.no_hp && <span className="flex items-center gap-1">📞 {app.Siswa.no_hp}</span>}
                          {app.Siswa?.User?.email && <span className="flex items-center gap-1">✉️ {app.Siswa.User.email}</span>}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          <span className="font-black">{app.Lowongan?.judul_posisi}</span>
                          <span className="text-slate-400"> @ {app.Lowongan?.perusahaan_nama}</span>
                        </p>
                        {app.cv_url && (
                          <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline font-bold">
                            Lihat CV <ExternalLink size={9} />
                          </a>
                        )}
                      </div>

                      {/* Status + actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={cfg.variant} className="font-black text-[9px] flex items-center gap-1">
                          {cfg.icon} {cfg.label}
                        </Badge>

                        {!isDone && (
                          <div className="flex gap-1.5">
                            {/* Advance / Interview / Accept button */}
                            {app.status_seleksi === 'TERKIRIM' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'PROSES' })}
                                disabled={updateStatusMutation.isPending}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 rounded-lg font-black text-[10px] border border-amber-200 dark:border-amber-900 transition-colors"
                              >
                                ✓ Proses Administrasi
                              </button>
                            )}
                            {app.status_seleksi === 'PROSES' && (
                              <button
                                onClick={() => setInterviewTarget(app)}
                                className="px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 rounded-lg font-black text-[10px] border border-violet-200 dark:border-violet-900 transition-colors"
                              >
                                📅 Jadwalkan Interview
                              </button>
                            )}
                            {app.status_seleksi === 'INTERVIEW' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'DITERIMA' })}
                                disabled={updateStatusMutation.isPending}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg font-black text-[10px] border border-emerald-200 dark:border-emerald-900 transition-colors"
                              >
                                🎉 Terima Pekerja
                              </button>
                            )}
                            {/* Reject */}
                            <button
                              onClick={() => setRejectTarget(app)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-lg font-black text-[10px] border border-rose-200 dark:border-rose-900 transition-colors"
                            >
                              ✕ Tolak
                            </button>
                          </div>
                        )}

                        {isDone && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Apakah Anda yakin ingin mereset lamaran ${app.Siswa?.nama_siswa}? Siswa akan dapat melamar kembali ke lowongan ini.`)) {
                                deleteLamaranMutation.mutate(app.id);
                              }
                            }}
                            disabled={deleteLamaranMutation.isPending}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 rounded-lg font-black text-[9px] border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                          >
                            <RotateCcw size={10} /> Reset Lamaran
                          </button>
                        )}

                        {/* Toggle timeline */}
                        <button
                          onClick={() => setExpandedTimeline(isExpanded ? null : app.id)}
                          className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 font-bold transition-colors"
                        >
                          <History size={10} /> {isExpanded ? 'Tutup Riwayat' : 'Lihat Riwayat'}
                        </button>
                      </div>
                    </div>

                    {/* Timeline */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/40 dark:border-slate-800/50 pt-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Riwayat Status Lamaran</p>
                        <TimelinePanel lamaranId={app.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Modal: Terbitkan Lowongan ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Briefcase size={16} className="text-indigo-600" /> Form Terbitkan Lowongan Kerja BKK</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Judul Posisi Pekerjaan *</label><Input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Junior Web Developer" required /></div>
              <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Nama Perusahaan / DU-DI *</label><Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. PT Astra Honda Motor" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Kuota Penerimaan</label><Input type="number" value={quota} onChange={(e) => setQuota(parseInt(e.target.value))} min={1} /></div>
                <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Batas Tanggal Tutup *</label><Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} required /></div>
              </div>
              <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Kualifikasi & Persyaratan *</label><textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="e.g. Lulusan RPL, menguasai React..." className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden" required /></div>
              <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Deskripsi Pekerjaan</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Gambaran pekerjaan secara umum..." className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={createJobMutation.isPending} className="rounded-xl">{createJobMutation.isPending ? 'Menerbitkan...' : 'Terbitkan Lowongan'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Modal: Lamar Pekerjaan ── */}
      {isApplyOpen && selectedLowongan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ClipboardCheck size={16} className="text-indigo-600" /> Lamar Posisi: {selectedLowongan.judul_posisi}</h3>
              <button onClick={() => setIsApplyOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleApplyJob} className="space-y-4 text-xs">
              <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">Melamar di <strong>{selectedLowongan.perusahaan_nama}</strong>.</p>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/30 font-semibold leading-relaxed">
                ⚠️ Pastikan nomor telepon/WhatsApp di profil Anda aktif agar BKK/Perusahaan dapat menghubungi Anda.
              </div>
              <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Tautan CV Digital / Portofolio (URL) *</label><Input type="url" value={cvUrl} onChange={(e) => setCvUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." required /></div>
              <div className="space-y-1"><label className="font-bold text-slate-600 dark:text-slate-400">Catatan / Cover Letter</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Salam pengantar singkat..." className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setIsApplyOpen(false); setCvUrl(''); setNotes(''); }} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={applyJobMutation.isPending} className="rounded-xl">{applyJobMutation.isPending ? 'Mengirim...' : 'Kirim Lamaran 🚀'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Modal: Jadwalkan Interview ── */}
      {interviewTarget && (
        <InterviewModal
          lamaran={interviewTarget}
          onClose={() => setInterviewTarget(null)}
          onSubmit={(data) => interviewMutation.mutate({ id: interviewTarget.id, data })}
          isPending={interviewMutation.isPending}
        />
      )}

      {/* ── Modal: Tolak Lamaran ── */}
      {rejectTarget && (
        <RejectModal
          lamaran={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSubmit={(catatan) => updateStatusMutation.mutate({ id: rejectTarget.id, status: 'DITOLAK', catatan })}
          isPending={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
};
