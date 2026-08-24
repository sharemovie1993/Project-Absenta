import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RefreshCw, GitCommit, CheckCircle2, XCircle, Loader2, Terminal, UploadCloud, ShieldCheck, Globe, Database, X } from 'lucide-react';
import { systemUpdateApi, type UpdateProgress, type UpdateCheckData } from '@/api/systemUpdate.api';
import axiosInstance from '@/lib/axiosInstance';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button, Card, CardContent, SectionCard } from '@/components/ui';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { LogService } from '@/utils/LogService';

// ─── Stepper config ──────────────────────────────────────────────────────────

const STEPS: { key: UpdateProgress['step']; label: string; desc: string }[] = [
  { key: 'pulling_backend',    label: 'Unduh Rilis Baru',      desc: 'Mengunduh paket .zip dari Server Lisensi' },
  { key: 'pulling_frontend',   label: 'Ekstrak Paket Rilis',   desc: 'Mengekstrak berkas statis rilis baru' },
  { key: 'installing_backend', label: 'Perbarui Dependensi',   desc: 'Mengevaluasi dan menginstal npm packages' },
  { key: 'installing_frontend',label: 'Salin Statis Frontend',  desc: 'Menyalin aset antarmuka statis' },
  { key: 'migrating',          label: 'Migrasi Database',      desc: 'Menjalankan skema migrasi database Prisma' },
  { key: 'building_frontend',  label: 'Pembaruan Antarmuka',   desc: 'Sinkronisasi file build frontend statis' },
  { key: 'restarting',         label: 'Reload Layanan',        desc: 'Memuat ulang modul backend & PM2' },
];

function getStepStatus(progress: UpdateProgress | null, stepKey: string) {
  if (!progress) return 'pending';
  const order = STEPS?.map(s => s.key);
  const currentIdx = order.indexOf(progress.step as Record<string, unknown>);
  const stepIdx    = order.indexOf(stepKey as Record<string, unknown>);
  if (progress.status === 'failed' && progress.step === stepKey) return 'failed';
  if (currentIdx >  stepIdx) return 'completed';
  if (currentIdx === stepIdx) return 'active';
  return 'pending';
}

const pct = (step: UpdateProgress['step']) => {
  const order = STEPS?.map(s => s.key);
  const idx   = order.indexOf(step as Record<string, unknown>);
  return idx >= 0 ? Math.round(((idx + 1) / STEPS.length) * 100) : 100;
};

// ─── Commit list ─────────────────────────────────────────────────────────────

function CommitList({ title, commits }: { title: string; commits: { hash: string; message: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {commits?.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 italic py-2">
          <CheckCircle2 size={14} className="text-green-500" /> Sudah sinkron
        </div>
      ) : (
        <ul className="space-y-2">
          {commits?.map((c, i) => {
            const isGitHash = c.hash && c.hash.length > 8 && !c.hash.includes('-');
            const isHeaderInfo = c.hash === 'version' || c.hash === 'date' || c.hash === 'info';
            return (
              <li key={c.hash || i} className="flex items-start gap-2 text-sm">
                {isGitHash ? (
                  <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    {c.hash.slice(0, 7)}
                  </span>
                ) : c.hash === 'version' ? (
                  <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider mt-0.5">
                    Versi
                  </span>
                ) : null}
                <span className={`${isHeaderInfo ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 pl-2'} leading-snug`}>
                  {c.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SystemUpdatePage: React.FC<{ isTab?: boolean }> = ({ isTab = false }) => {
  const confirm = useConfirm();

  const [checking,  setChecking]  = useState(false);
  const [updating,  setUpdating]  = useState(false);
  const [restarting,setRestarting]= useState(false);
  const [showWilayahModal, setShowWilayahModal] = useState(false);
  const [syncingWilayah, setSyncingWilayah] = useState(false);
  const [checkData, setCheckData] = useState<UpdateCheckData | null>(null);
  const [progress,  setProgress]  = useState<UpdateProgress | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [error,     setError]     = useState('');

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem' },
    { label: 'Pembaruan' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Pembaruan Sistem',
    description: 'Kelola pembaruan kode aplikasi langsung dari Server Lisensi untuk mendapatkan fitur terbaru dan perbaikan bug.',
    items: [
      { text: 'Klik "Cek Pembaruan" untuk melihat apakah ada versi rilis baru di Server Lisensi.' },
      { text: 'Proses update akan mengunduh paket rilis zip, mengekstraknya, melakukan migrasi database, dan menyalin berkas terbaru.' },
      { text: 'Layanan akan otomatis dimuat ulang (restart) setelah pemasangan selesai.' },
      { text: 'Gunakan "Paksa Restart" hanya jika aplikasi tidak merespon.' }
    ]
  }), []);

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── helpers ──
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const stopCountdown = () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };

  const startCountdown = useCallback(() => {
    stopCountdown();
    let c = 5;
    setCountdown(c);
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) { stopCountdown(); queryClient.invalidateQueries({ queryKey: ['system-update-status'] }); }
    }, 1000);
  }, []);

  const startPoll = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await systemUpdateApi.status();
        if (res.success && res.data) {
          setProgress(res.data);
          if (res.data.status === 'success') { stopPoll(); startCountdown(); }
          else if (res.data.status === 'failed') { stopPoll(); setUpdating(false); setError(res.data.error || 'Terjadi kesalahan.'); }
        }
      } catch { /* silent */ }
    }, 1500);
  }, [startCountdown]);

  // ── on mount: restore active progress ──
  useEffect(() => {
    (async () => {
      try {
        const res = await systemUpdateApi.status();
        if (res.success && res.data?.status === 'running') {
          setUpdating(true); setProgress(res.data); startPoll();
        }
      } catch { /* ignore */ }
    })();
    doCheck(true); // silent initial check
    return () => { stopPoll(); stopCountdown(); };
  }, []);

  // ── actions ──
  async function doCheck(silent = false) {
    if (!silent) setChecking(true);
    setError('');
    try {
      const res = await systemUpdateApi.check();
      if (res.success) setCheckData(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menghubungi GitHub';
      setError(msg);
    } finally {
      if (!silent) setChecking(false);
    }
  }

  async function doUpdate() {
    const ok = await confirm({
      title: 'Mulai Pembaruan Aplikasi?',
      description: 'Proses ini akan mengunduh paket rilis terbaru dari Server Lisensi, melakukan migrasi database, dan memuat ulang layanan PM2. Pastikan Anda telah melakukan backup jika diperlukan.',
      confirmText: 'Mulai Update',
      cancelText: 'Batal',
      style: 'info'
    });
    if (!ok) return;

    setUpdating(true); setError('');
    setProgress({ status: 'running', step: 'pulling_backend', message: 'Memulai pembaruan...' });
    try {
      const res = await systemUpdateApi.execute();
      if (res.success) {
        toast('Proses pembaruan dimulai di latar belakang', { icon: 'ℹ️' });
        startPoll();
      } else {
        setUpdating(false);
        const msg = res.message || 'Gagal memulai pembaruan.';
        setError(msg);
        toast.error(msg);
      }
    } catch (e: unknown) {
      setUpdating(false);
      const msg = e instanceof Error ? e.message : 'Kesalahan koneksi.';
      setError(msg);
      toast.error(msg);
    }
  }

  async function doRestart() {
    const ok = await confirm({
      title: 'Paksa Restart Layanan?',
      description: 'Apakah Anda yakin ingin merestart semua layanan PM2? Koneksi ke sistem akan terputus selama beberapa detik.',
      confirmText: 'Ya, Restart',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    setRestarting(true);
    try {
      await systemUpdateApi.restart();
      toast.success('Layanan sedang direstart...');
      startCountdown();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kesalahan koneksi';
      toast.error('Gagal merestart layanan: ' + msg);
      setRestarting(false);
    }
  }

  const totalNew = (checkData?.backendCommits.length ?? 0) + (checkData?.frontendCommits.length ?? 0);
  const isBehind = !!checkData?.isBehind;

  const content = (
    <div className="space-y-6 pb-20">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <GitCommit size={16} />
          <span>Sistem Auto-Update — Server Lisensi</span>
        </div>
        <Button
          onClick={() => doCheck()}
          disabled={checking || updating}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Memeriksa...' : 'Cek Pembaruan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── LEFT: Status / Stepper ── */}
        <div className="lg:col-span-3">
          <SectionCard
            title={updating ? "Proses Pembaruan" : "Status Sistem"}
            icon={updating ? Loader2 : ShieldCheck}
            fullWidth
          >
            <div className="w-full space-y-6">
              {updating ? (
                /* Stepper */
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-semibold">Proses Pembaruan Sedang Berjalan</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Harap tunggu, sistem sedang memperbarui di latar belakang.</p>
                  </div>

                  {/* DRY-RUN banner */}
                  {progress?.isDryRun && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      🧪 MODE DEV — Dry-run simulation (tidak ada perintah nyata yang dijalankan)
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pct(progress?.step ?? 'pulling_backend')}%` }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    {STEPS?.map(s => {
                      const st = getStepStatus(progress, s.key);
                      return (
                        <div key={s.key} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border transition-all
                            ${st === 'completed' ? 'bg-green-50 border-green-400 text-green-600 dark:bg-green-900/30' : ''}
                            ${st === 'active'    ? 'bg-blue-500 border-blue-500 text-white' : ''}
                            ${st === 'pending'   ? 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700' : ''}
                            ${st === 'failed'    ? 'bg-red-50 border-red-400 text-red-600 dark:bg-red-900/30' : ''}
                          `}>
                            {st === 'completed' ? <CheckCircle2 size={14} /> :
                             st === 'active'    ? <Loader2 size={13} className="animate-spin" /> :
                             st === 'failed'    ? <XCircle size={14} /> :
                             STEPS.indexOf(s) + 1}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium leading-snug ${st === 'active' ? 'text-blue-600 dark:text-blue-400' : st === 'failed' ? 'text-red-600' : st === 'completed' ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                              {s.label}
                            </p>
                            <p className="text-xs text-gray-400 font-mono truncate">{s.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-gray-400 italic">💬 {progress?.message}</p>

                  {progress?.status === 'success' && (
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center text-sm font-medium text-green-700 dark:text-green-400">
                      🎉 Update Sukses! Halaman akan dimuat ulang dalam <strong>{countdown}</strong> detik...
                    </div>
                  )}
                </div>
              ) : checking ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <Loader2 size={32} className="animate-spin text-blue-400" />
                  <p className="text-sm">Menghubungi Server Lisensi...</p>
                </div>
              ) : isBehind ? (
                /* Ada update */
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                    <UploadCloud size={22} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                       <p className="font-semibold text-amber-800 dark:text-amber-300">Versi Rilis Baru Tersedia!</p>
                       <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                         Versi rilis baru terdeteksi di Server Lisensi. Lakukan pembaruan sekarang.
                       </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={doUpdate}
                      className="flex-1"
                    >
                      <UploadCloud size={16} className="mr-2" /> Mulai Update Sekarang
                    </Button>
                    <Button
                      onClick={() => doCheck()}
                      variant="outline"
                    >
                      <RefreshCw size={15} />
                    </Button>
                  </div>
                </div>
              ) : checkData ? (
                /* Sudah terkini */
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <ShieldCheck size={30} className="text-green-500" />
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Aplikasi Sudah Terkini</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Backend dan Frontend sinkron dengan rilis terbaru di Server Lisensi.
                  </p>
                  <button
                    onClick={() => doCheck()}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Paksa cek ulang
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-gray-400">
                  <RefreshCw size={28} />
                  <p className="text-sm">Klik "Cek Pembaruan" untuk memulai</p>
                </div>
              )}

              {/* Error box */}
              {error && !updating && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">❌ Gagal</p>
                  <pre className="text-xs text-red-600 dark:text-red-300 font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                    {error}
                  </pre>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT: Commit list + tools ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Changelog */}
          <SectionCard
            title="Catatan Rilis (Changelog)"
            icon={GitCommit}
            fullWidth
          >
            <div className="w-full space-y-4">
              <p className="text-xs text-gray-400">Informasi detail rilis dari Server Lisensi</p>
              {checkData ? (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  <CommitList title="Info Rilis" commits={checkData.backendCommits} />
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Belum ada data — klik Cek Pembaruan</p>
              )}
            </div>
          </SectionCard>

          {/* System tools */}
          <SectionCard
            title="Peralatan Sistem"
            icon={Terminal}
            fullWidth
          >
            <div className="w-full space-y-4">
              {/* Master Data Wilayah tools */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Data Wilayah Indonesia</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    ~91.600 Record
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Tarik data lengkap Provinsi, Kabupaten/Kota, Kecamatan, & Desa se-Indonesia ke database lokal.
                </p>
                <Button
                  onClick={() => setShowWilayahModal(true)}
                  disabled={restarting || updating}
                  variant="outline"
                  className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/50 dark:hover:bg-indigo-900/20"
                >
                  <UploadCloud size={14} className="mr-2" /> Tarik & Sinkronkan Wilayah (Se-Indonesia)
                </Button>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button
                  onClick={doRestart}
                  disabled={restarting || updating}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  {restarting
                    ? <><Loader2 size={14} className="animate-spin mr-2" /> Merestart...</>
                    : <><Terminal size={14} className="mr-2" /> Paksa Restart Layanan (PM2)</>
                  }
                </Button>
                <p className="text-xs text-gray-400 mt-2">
                  Gunakan jika aplikasi tidak merespon tanpa perlu update kode.
                </p>
              </div>
              {(restarting) && (
                <p className="text-xs text-amber-600 font-medium text-center">
                  Halaman akan dimuat ulang dalam {countdown} detik...
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── DEDICATED ELEGANT WILAYAH SYNC MODAL DIALOG ── */}
      {showWilayahModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                  <Globe size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Sinkronisasi Wilayah Indonesia
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Penarikan & Impor Master Data Kemendagri
                  </p>
                </div>
              </div>
              <button
                onClick={() => !syncingWilayah && setShowWilayahModal(false)}
                disabled={syncingWilayah}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                  Proses ini akan mengunduh dan menyinkronkan data administratif wilayah Indonesia secara penuh ke dalam database PostgreSQL lokal untuk mendukung pencarian alamat kencang dan offline.
                </p>
              </div>

              {/* Data Breakdown Table */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Rincian Target Data (~91.603 Record)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">Tingkat 1 (Provinsi)</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">38 Provinsi</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">Tingkat 2 (Kab/Kota)</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">514 Kab / Kota</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">Tingkat 3 (Kecamatan)</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">7.288 Kecamatan</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">Tingkat 4 (Kel/Desa)</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">83.763 Desa</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Proses berjalan 100% Idempotent (Aman dari duplikasi data).</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setShowWilayahModal(false)}
                disabled={syncingWilayah}
                className="h-10 px-5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setSyncingWilayah(true);
                    const toastId = toast.loading('Memulai sinkronisasi data wilayah se-Indonesia...');
                    const res = await axiosInstance.post('/wilayah/sync');
                    toast.dismiss(toastId);
                    if (res.data?.success) {
                      toast.success('Berhasil! Sinkronisasi ~91.600 data wilayah Indonesia berjalan di latar belakang.');
                      setShowWilayahModal(false);
                    } else {
                      toast.error(res.data?.message || 'Gagal memulai sinkronisasi wilayah.');
                    }
                  } catch (err: unknown) {
                    toast.error(err?.response?.data?.message || err?.message || 'Gagal memicu sinkronisasi wilayah.');
                  } finally {
                    setSyncingWilayah(false);
                  }
                }}
                disabled={syncingWilayah}
                className="h-10 px-6 text-xs font-black text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25"
              >
                {syncingWilayah ? (
                  <><Loader2 size={14} className="mr-2 animate-spin" /> Memproses...</>
                ) : (
                  <><UploadCloud size={14} className="mr-2" /> Mulai Sinkronisasi</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isTab) {
    return content;
  }

  return (
    <AcademicPageLayout
      title="Pembaruan Sistem"
      description="Kelola sinkronisasi kode dan fitur terbaru langsung dari Server Lisensi."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="systemupdate"
    >
      {content}
    </AcademicPageLayout>
  );
};

export default SystemUpdatePage;
