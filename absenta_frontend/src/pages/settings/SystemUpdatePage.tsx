import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Terminal, UploadCloud, Globe, X, CheckCircle2, Loader2, Server } from 'lucide-react';
import { systemUpdateApi } from '@/api/systemUpdate.api';
import axiosInstance from '@/lib/axiosInstance';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button } from '@/components/ui';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';

const SystemUpdatePage: React.FC<{ isTab?: boolean }> = ({ isTab = false }) => {
  const confirm = useConfirm();

  const [restarting, setRestarting] = useState(false);
  const [showWilayahModal, setShowWilayahModal] = useState(false);
  const [syncingWilayah, setSyncingWilayah] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem' },
    { label: 'Peralatan Sistem' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Peralatan Sistem',
    description: 'Pusat utilitas pemeliharaan database lokal dan pengendalian layanan aplikasi.',
    items: [
      { text: 'Gunakan "Sinkronisasi Wilayah Indonesia" untuk menarik master data administratif Kemendagri ke database lokal.' },
      { text: 'Gunakan "Paksa Restart Layanan" jika aplikasi membutuhkan reload proses daemon tanpa intervensi terminal Linux.' }
    ]
  }), []);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = () => { 
    if (countdownRef.current) { 
      clearInterval(countdownRef.current); 
      countdownRef.current = null; 
    } 
  };

  const startCountdown = useCallback(() => {
    stopCountdown();
    let c = 5;
    setCountdown(c);
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) { 
        stopCountdown(); 
        window.location.reload();
      }
    }, 1000);
  }, []);

  async function doRestart() {
    const ok = await confirm({
      title: 'Paksa Restart Layanan?',
      description: 'Apakah Anda yakin ingin memuat ulang semua proses aplikasi (PM2)? Koneksi ke sistem akan terputus sesaat selama 2-3 detik.',
      confirmText: 'Ya, Restart Layanan',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    setRestarting(true);
    try {
      await systemUpdateApi.restart();
      toast.success('Perintah restart telah dikirim ke PM2.');
      startCountdown();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kesalahan koneksi';
      toast.error('Gagal merestart layanan: ' + msg);
      setRestarting(false);
    }
  }

  const content = (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

        {/* ── KARTU 1: MASTER DATA WILAYAH INDONESIA ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Master Data Wilayah Indonesia</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sinkronisasi Database Kemendagri RI</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                ~91.600 Data
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tarik seluruh data administratif wilayah (Provinsi, Kabupaten/Kota, Kecamatan, dan Desa) ke dalam database lokal PostgreSQL. Mendukung pencarian alamat cepat secara offline tanpa bergantung pada API eksternal.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Provinsi</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">38</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Kab / Kota</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">514</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Kecamatan</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">7.288</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Desa / Kel</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">83.763</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={() => setShowWilayahModal(true)}
              disabled={restarting}
              className="w-full h-10 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <UploadCloud size={14} className="mr-2" />
              Tarik & Sinkronkan Wilayah (Se-Indonesia)
            </Button>
          </div>
        </div>

        {/* ── KARTU 2: PEMELIHARAAN LAYANAN APLIKASI (PM2) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Pemeliharaan Layanan Aplikasi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kontrol Daemon Proses PM2</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                Online
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Kirim sinyal muat ulang (*graceful reload*) ke seluruh worker proses backend dan frontend tanpa perlu membuka terminal Linux. Sangat berguna jika sistem mengalami kendala performa atau kebutuhan refresh cache memory.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Metode Muat Ulang:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">pm2 reload / restart all</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Integritas Data:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Aman (Tanpa Data Loss)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={doRestart}
              disabled={restarting}
              variant="outline"
              className="w-full h-10 rounded-xl text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30 transition-all"
            >
              {restarting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Memuat Ulang Sistem ({countdown}s)...
                </>
              ) : (
                <>
                  <Terminal size={14} className="mr-2" />
                  Paksa Restart Layanan (PM2)
                </>
              )}
            </Button>
            {restarting && (
              <p className="text-[11px] text-amber-600 font-medium text-center mt-2">
                Koneksi akan kembali otomatis dalam {countdown} detik...
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── MODAL SINKRONISASI WILAYAH INDONESIA ── */}
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
                  } catch (err: any) {
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
      title="Peralatan Sistem"
      description="Pusat utilitas pemeliharaan database lokal dan pengendalian layanan aplikasi."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="systemupdate"
    >
      {content}
    </AcademicPageLayout>
  );
};

export default SystemUpdatePage;
