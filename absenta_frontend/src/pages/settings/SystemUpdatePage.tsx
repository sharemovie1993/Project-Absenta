import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, GitCommit, CheckCircle2, XCircle, Loader2, Terminal, UploadCloud, ShieldCheck } from 'lucide-react';
import { systemUpdateApi, type UpdateProgress, type UpdateCheckData } from '@/api/systemUpdate.api';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

// ─── Stepper config ──────────────────────────────────────────────────────────

const STEPS: { key: UpdateProgress['step']; label: string; desc: string }[] = [
  { key: 'pulling_backend',    label: 'Tarik Kode Backend',    desc: 'git fetch + reset --hard (absenta_backend)' },
  { key: 'pulling_frontend',   label: 'Tarik Kode Frontend',   desc: 'git fetch + reset --hard (absenta_frontend)' },
  { key: 'installing_backend', label: 'Install Deps Backend',  desc: 'npm ci --omit=dev' },
  { key: 'installing_frontend',label: 'Install Deps Frontend', desc: 'npm ci' },
  { key: 'migrating',          label: 'Migrasi Database',      desc: 'prisma generate + migrate deploy' },
  { key: 'building_frontend',  label: 'Build Frontend',        desc: 'vite build' },
  { key: 'restarting',         label: 'Build & Reload Layanan',desc: 'tsc build + pm2 reload' },
];

function getStepStatus(progress: UpdateProgress | null, stepKey: string) {
  if (!progress) return 'pending';
  const order = STEPS.map(s => s.key);
  const currentIdx = order.indexOf(progress.step as any);
  const stepIdx    = order.indexOf(stepKey as any);
  if (progress.status === 'failed' && progress.step === stepKey) return 'failed';
  if (currentIdx >  stepIdx) return 'completed';
  if (currentIdx === stepIdx) return 'active';
  return 'pending';
}

const pct = (step: UpdateProgress['step']) => {
  const order = STEPS.map(s => s.key);
  const idx   = order.indexOf(step as any);
  return idx >= 0 ? Math.round(((idx + 1) / STEPS.length) * 100) : 100;
};

// ─── Commit list ─────────────────────────────────────────────────────────────

function CommitList({ title, commits }: { title: string; commits: { hash: string; message: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {commits.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 italic py-2">
          <CheckCircle2 size={14} className="text-green-500" /> Sudah sinkron
        </div>
      ) : (
        <ul className="space-y-1.5">
          {commits.map((c, i) => (
            <li key={c.hash || i} className="flex items-start gap-2 text-sm">
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                {c.hash.slice(0, 7)}
              </span>
              <span className="text-gray-700 dark:text-gray-300 leading-snug">{c.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SystemUpdatePage: React.FC = () => {
  const [checking,  setChecking]  = useState(false);
  const [updating,  setUpdating]  = useState(false);
  const [restarting,setRestarting]= useState(false);
  const [checkData, setCheckData] = useState<UpdateCheckData | null>(null);
  const [progress,  setProgress]  = useState<UpdateProgress | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [error,     setError]     = useState('');

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
      if (c <= 0) { stopCountdown(); window.location.reload(); }
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
    } catch (e: any) {
      setError(e?.message || 'Gagal menghubungi GitHub');
    } finally {
      if (!silent) setChecking(false);
    }
  }

  async function doUpdate() {
    if (!window.confirm('Mulai pembaruan aplikasi?\n\nProses ini akan menarik kode terbaru dari GitHub, migrasi database, build ulang, dan reload layanan PM2.')) return;
    setUpdating(true); setError('');
    setProgress({ status: 'running', step: 'pulling_backend', message: 'Memulai pembaruan...' });
    try {
      const res = await systemUpdateApi.execute();
      if (res.success) startPoll();
      else { setUpdating(false); setError(res.message || 'Gagal memulai pembaruan.'); }
    } catch (e: any) { setUpdating(false); setError(e?.message || 'Kesalahan koneksi.'); }
  }

  async function doRestart() {
    if (!window.confirm('Paksa restart semua layanan PM2?\n\nKoneksi akan terputus beberapa detik.')) return;
    setRestarting(true);
    try {
      await systemUpdateApi.restart();
      startCountdown();
    } catch (e: any) {
      alert('Gagal: ' + (e?.message || 'Kesalahan koneksi'));
      setRestarting(false);
    }
  }

  const totalNew = (checkData?.backendCommits.length ?? 0) + (checkData?.frontendCommits.length ?? 0);
  const isBehind = !!checkData?.isBehind;

  return (
    <AcademicPageLayout
      title="Pembaruan Sistem"
      description="Kelola sinkronisasi kode dan fitur terbaru langsung dari GitHub."
      hardeningModuleKey="systemupdate"
    >
      <div className="max-w-5xl mx-auto space-y-6 pb-20">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GitCommit size={16} />
            <span>GitHub Auto-Update — Backend &amp; Frontend</span>
          </div>
          <button
            onClick={() => doCheck()}
            disabled={checking || updating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Memeriksa...' : 'Cek Pembaruan'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* ── LEFT: Status / Stepper ── */}
          <div className="lg:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-6">

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
                  {STEPS.map(s => {
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
                <p className="text-sm">Menghubungi GitHub...</p>
              </div>
            ) : isBehind ? (
              /* Ada update */
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                  <UploadCloud size={22} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Versi Baru Tersedia!</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                      Ditemukan <strong>{totalNew}</strong> commit baru di GitHub. Lakukan pembaruan sekarang.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={doUpdate}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm"
                  >
                    <UploadCloud size={16} /> Mulai Update Sekarang
                  </button>
                  <button
                    onClick={() => doCheck()}
                    className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <RefreshCw size={15} />
                  </button>
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
                  Backend dan Frontend sinkron dengan commit terbaru di GitHub.
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

          {/* ── RIGHT: Commit list + tools ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Changelog */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Changelog GitHub</h3>
                <p className="text-xs text-gray-400 mt-0.5">Commit yang belum ditarik ke server</p>
              </div>
              {checkData ? (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  <CommitList title="Backend" commits={checkData.backendCommits} />
                  <CommitList title="Frontend" commits={checkData.frontendCommits} />
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Belum ada data — klik Cek Pembaruan</p>
              )}
            </div>

            {/* System tools */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2"><Terminal size={14} /> Peralatan Sistem</h3>
                <p className="text-xs text-gray-400 mt-0.5">Aksi darurat untuk pemeliharaan</p>
              </div>
              <button
                onClick={doRestart}
                disabled={restarting || updating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
              >
                {restarting
                  ? <><Loader2 size={14} className="animate-spin" /> Merestart...</>
                  : <><Terminal size={14} /> Paksa Restart Layanan (PM2)</>
                }
              </button>
              <p className="text-xs text-gray-400">
                Gunakan jika aplikasi tidak merespon tanpa perlu update kode.
              </p>
              {(restarting) && (
                <p className="text-xs text-amber-600 font-medium text-center">
                  Halaman akan dimuat ulang dalam {countdown} detik...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default SystemUpdatePage;
