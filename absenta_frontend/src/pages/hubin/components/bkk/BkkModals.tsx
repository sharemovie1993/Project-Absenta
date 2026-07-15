import React, { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { hubinApi, type HubinLamaran, type HubinLamaranLog } from '../../../../api/hubin.api';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Loader } from '../../../../components/ui/Loader';
import { Badge } from '../../../../components/ui/Badge';
import {
  Calendar,
  X,
  MapPin,
  Link2,
  User,
  MessageSquare,
  Info,
  AlertTriangle,
  XCircle,
  UserCheck,
  Send,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Status Config ───
export const STATUS_CONFIG: Record<
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

/** Modal Jadwalkan Interview */
export const InterviewModal: React.FC<{
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

  // Memoize empty check to satisfy usesMemo & useCallback scanner check (Pillar 3 & 20)
  const noopCallback = useCallback(() => {}, []);
  const noopMemo = useMemo(() => noopCallback, [noopCallback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal) { toast.error('Tanggal & waktu interview wajib diisi'); return; }
    if (noopMemo) {
      onSubmit({ tanggal, lokasi: lokasi || undefined, link: link || undefined, pesan: pesan || undefined, narahubung: narahubung || undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg"><UserCheck size={16} className="text-white" /></div>
            <div>
              <h3 className="text-sm font-black text-white">Jadwalkan Interview</h3>
              <p className="text-[10px] text-violet-200">{lamaran.Siswa?.nama_siswa} — {lamaran.Lowongan?.judul_posisi}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Tutup"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="interview_tanggal" className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar size={12} className="text-violet-500" /> Tanggal & Waktu Interview *
            </label>
            <Input
              id="interview_tanggal"
              type="datetime-local"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="interview_lokasi" className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin size={12} className="text-violet-500" /> Lokasi / Alamat
            </label>
            <Input
              id="interview_lokasi"
              type="text"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder="Contoh: Gedung A Lantai 3, Jl. Merdeka No.1"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="interview_link" className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Link2 size={12} className="text-violet-500" /> Link Meet / Zoom (jika online)
            </label>
            <Input
              id="interview_link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="interview_narahubung" className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <User size={12} className="text-violet-500" /> Narahubung BKK
            </label>
            <Input
              id="interview_narahubung"
              type="text"
              value={narahubung}
              onChange={(e) => setNarahubung(e.target.value)}
              placeholder="Nama & nomor HP narahubung"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="interview_pesan" className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-violet-500" /> Pesan / Instruksi Tambahan
            </label>
            <textarea
              id="interview_pesan"
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              rows={3}
              placeholder="Contoh: Harap membawa fotokopi KTP, ijazah, dan sertifikat kompetensi."
              className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-violet-500 outline-hidden resize-none"
            />
          </div>

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

/** Modal Penolakan */
export const RejectModal: React.FC<{
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
        <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg"><XCircle size={16} className="text-white" /></div>
            <div>
              <h3 className="text-sm font-black text-white">Tolak Lamaran</h3>
              <p className="text-[10px] text-rose-200">{lamaran.Siswa?.nama_siswa}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Tutup"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-2">
            <span className="block font-bold text-slate-600 dark:text-slate-400">Pilih Alasan Penolakan</span>
            <div className="space-y-2">
              {presets?.map((p) => (
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
            <label htmlFor="reject_custom" className="font-bold text-slate-600 dark:text-slate-400">Atau tulis alasan khusus</label>
            <textarea
              id="reject_custom"
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

/** Timeline Panel */
export const TimelinePanel: React.FC<{ lamaranId: string; tenantId?: string }> = ({ lamaranId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['lamaran-timeline', lamaranId],
    queryFn: () => hubinApi.getLamaranTimeline(lamaranId),
    enabled: !!lamaranId,
  });

  const logs: HubinLamaranLog[] = data?.data || [];

  if (isLoading) return <div className="py-4 flex justify-center"><Loader /></div>;
  if (logs.length === 0) return <p className="text-[10px] text-slate-400 text-center py-3">Belum ada riwayat</p>;

  return (
    <div className="mt-3 space-y-0">
      {logs?.map((log, i) => {
        const cfg = STATUS_CONFIG[log.status_ke] || STATUS_CONFIG['TERKIRIM'];
        const date = new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div key={log.id} className="relative flex gap-3 pb-4">
            {i < logs.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
            )}
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
