import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Loader,
  Modal,
  DigitalSignatureField,
} from '@/components/ui';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  HelpCircle,
  Wifi,
  WifiOff,
  LogOut,
  Send,
  Eye,
} from 'lucide-react';
import { cbtApi } from '@/api/cbt.api';
import { cbtOfflineStorage, LocalAnswerRecord } from '@/utils/cbtOfflineStorage';
import type { CbtSoal, CbtStudentAnswerItem } from '@/types/cbt.types';
import { CbtContentRenderer } from '@/components/cbt/common/CbtContentRenderer';
import { CbtOptionsRenderer } from '@/components/cbt/common/CbtOptionsRenderer';
import { UniversalStudentIdentity } from '@/components/common/UniversalStudentIdentity';
import { ErrorBoundary as InfraErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function CbtExamRoomPage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.siswa_id || (user as any)?.siswa?.id || user?.id;

  // States
  const [step, setStep] = useState<'TOKEN_GATE' | 'CONFIRMATION' | 'EXAM_ROOM' | 'COMPLETED'>('TOKEN_GATE');
  const [tokenInput, setTokenInput] = useState('');
  const [examOverview, setExamOverview] = useState<any>(null);
  const [loadingVerify, setLoadingVerify] = useState(false);

  // Exam Active Session States
  const [jadwalId, setJadwalId] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [soalList, setSoalList] = useState<CbtSoal[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, { jawaban: string; isRagu: boolean }>>({});
  const [sisaWaktuDetik, setSisaWaktuDetik] = useState(0);
  const [violationsCount, setViolationsCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);

  // Modals
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const containerRef = useRef<HTMLDivElement>(null);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Verifikasi Token Ujian
  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error('Masukkan token ujian yang diberikan pengawas');
      return;
    }

    try {
      setLoadingVerify(true);
      const res = await cbtApi.verifyToken(tokenInput.trim().toUpperCase());
      setExamOverview(res);
      setJadwalId(res.jadwal_id);
      setStep('CONFIRMATION');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Token ujian tidak valid atau sesi belum dimulai');
    } finally {
      setLoadingVerify(false);
    }
  };

  // 2. Mulai Masuk Ruang Ujian & Kunci Fullscreen
  const handleStartExam = async () => {
    if (!signature) {
      toast.error('Harap bubuhkan tanda tangan kehadiran & pakta integritas terlebih dahulu');
      return;
    }

    try {
      setLoadingVerify(true);

      // Minta browser masuk mode Fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => null);
      }

      const res = await cbtApi.startExamSession({
        jadwal_ujian_id: jadwalId,
        token_masuk: tokenInput.trim().toUpperCase(),
        metadata_perangkat: {
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          tanda_tangan: signature,
          waktu_ttd: new Date().toISOString(),
          pakta_integritas: true,
        },
      });

      setSoalList(res.soal || []);
      setSisaWaktuDetik(res.sisa_waktu_detik || res.durasi_menit * 60);
      setMaxViolations(res.setting_keamanan?.max_tab_switches || 3);

      // Muat jawaban yang tersimpan dari IndexedDB lokal atau server
      const localAnswers = await cbtOfflineStorage.getAllAnswers(jadwalId, user?.id || 'siswa');
      const mergedMap: Record<string, { jawaban: string; isRagu: boolean }> = {};

      // Server answers
      if (Array.isArray(res.jawaban_tersimpan)) {
        res.jawaban_tersimpan.forEach((item) => {
          mergedMap[item.soal_id] = { jawaban: item.jawaban_siswa, isRagu: item.is_ragu };
        });
      }

      // Local IndexedDB overrides if more recent
      localAnswers.forEach((item) => {
        mergedMap[item.soal_id] = { jawaban: item.jawaban_siswa, isRagu: item.is_ragu };
      });

      setAnswersMap(mergedMap);
      setStep('EXAM_ROOM');
      toast.success('Selamat mengerjakan! Layar terkunci ke mode ujian.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memulai sesi ujian');
    } finally {
      setLoadingVerify(false);
    }
  };

  // 3. Countdown Timer Interval
  useEffect(() => {
    if (step !== 'EXAM_ROOM' || sisaWaktuDetik <= 0) return;

    const interval = setInterval(() => {
      setSisaWaktuDetik((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleForceAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, sisaWaktuDetik]);

  // 3b. Preload gambar untuk soal berikutnya (agar perpindahan soal 0ms tanpa jeda loading gambar)
  useEffect(() => {
    if (step !== 'EXAM_ROOM' || !soalList?.length) return;
    const nextSoal = soalList[currentIdx + 1];
    if (!nextSoal) return;

    const urlsToPreload: string[] = [];
    if (nextSoal.gambar_stimulus_url) {
      urlsToPreload.push(nextSoal.gambar_stimulus_url);
    }
    (nextSoal.opsi_jawaban_json || []).forEach((opt) => {
      if (opt?.gambar_url) {
        urlsToPreload.push(opt.gambar_url);
      }
    });

    urlsToPreload.forEach((url) => {
      const preloadImg = new Image();
      preloadImg.decoding = 'async';
      preloadImg.src = url;
    });
  }, [step, currentIdx, soalList]);

  // 4. Background Sync ke Redis setiap 20 detik (Debounced Autosave)
  useEffect(() => {
    if (step !== 'EXAM_ROOM' || !jadwalId) return;

    const syncInterval = setInterval(async () => {
      const answersArray: CbtStudentAnswerItem[] = Object.entries(answersMap).map(
        ([soalId, val]) => ({
          soal_id: soalId,
          jawaban_siswa: val.jawaban,
          is_ragu: val.isRagu,
          timestamp: Date.now(),
        })
      );

      if (answersArray.length > 0 && navigator.onLine) {
        try {
          await cbtApi.syncAnswers(jadwalId, {
            jawaban: answersArray,
            sisa_waktu_detik: sisaWaktuDetik,
          });
          await cbtOfflineStorage.markAnswersSynced(jadwalId, user?.id || 'siswa');
        } catch {
          // Gagal sync sementara tidak masalah karena IndexedDB sudah memegang data secara aman
        }
      }
    }, 20000);

    return () => clearInterval(syncInterval);
  }, [step, jadwalId, answersMap, sisaWaktuDetik, user?.id]);

  // 5. Anti-Cheat Security Watchers (Tab Switch & Fullscreen Exit)
  useEffect(() => {
    if (step !== 'EXAM_ROOM') return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await triggerViolation('TAB_SWITCH', 'Terdeteksi berpindah tab atau meminimalkan browser');
      }
    };

    const handleWindowBlur = async () => {
      await triggerViolation('BLUR_WINDOW', 'Kursor keluar dari jendela aplikasi ujian');
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        await triggerViolation('FULLSCREEN_EXIT', 'Siswa keluar dari mode fullscreen');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [step, violationsCount, maxViolations]);

  const triggerViolation = async (tipe: string, detail: string) => {
    const nextCount = violationsCount + 1;
    setViolationsCount(nextCount);
    setWarningMessage(`PERINGATAN: ${detail}! (Pelanggaran ${nextCount} dari ${maxViolations})`);
    setIsWarningModalOpen(true);

    try {
      await cbtApi.recordViolation(jadwalId, { tipe_pelanggaran: tipe, detail });
    } catch {}

    if (nextCount >= maxViolations) {
      toast.error('Batas pelanggaran terlampaui. Ujian Anda didiskualifikasi secara otomatis.');
      handleForceAutoSubmit();
    }
  };

  // 6. Pilih Jawaban Siswa (Instan ke IndexedDB)
  const handleSelectAnswer = async (soalId: string, kodeOpsi: string) => {
    const currentRagu = answersMap[soalId]?.isRagu || false;
    setAnswersMap((prev) => ({
      ...prev,
      [soalId]: { jawaban: kodeOpsi, isRagu: currentRagu },
    }));

    // Simpan instan ke IndexedDB lokal (<1ms)
    await cbtOfflineStorage.saveAnswer(jadwalId, user?.id || 'siswa', soalId, kodeOpsi, currentRagu);
  };

  // Toggle Ragu-ragu
  const handleToggleRagu = async (soalId: string) => {
    const current = answersMap[soalId] || { jawaban: '', isRagu: false };
    const nextRagu = !current.isRagu;

    setAnswersMap((prev) => ({
      ...prev,
      [soalId]: { ...current, isRagu: nextRagu },
    }));

    await cbtOfflineStorage.saveAnswer(
      jadwalId,
      user?.id || 'siswa',
      soalId,
      current.jawaban,
      nextRagu
    );
  };

  // 7. Submit Final Ujian
  const handleForceAutoSubmit = async () => {
    await executeFinalSubmit();
  };

  const executeFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      const answersArray: CbtStudentAnswerItem[] = (soalList || []).map((s) => ({
        soal_id: s.id,
        jawaban_siswa: answersMap[s.id]?.jawaban || '',
        is_ragu: answersMap[s.id]?.isRagu || false,
        timestamp: Date.now(),
      }));

      const res = await cbtApi.submitFinal(jadwalId, {
        jawaban_final: answersArray,
      });

      // Bersihkan IndexedDB lokal
      await cbtOfflineStorage.clearSession(jadwalId, user?.id || 'siswa');

      // Keluar dari Fullscreen
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => null);
      }

      setFinalResult(res);
      setStep('COMPLETED');
      toast.success('Ujian berhasil diserahkan!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyerahkan ujian');
    } finally {
      setIsSubmitting(false);
      setIsSubmitConfirmOpen(false);
    }
  };

  // Format Timer
  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentSoal = soalList[currentIdx];
  const currentAnswer = currentSoal ? answersMap[currentSoal.id]?.jawaban : '';
  const currentIsRagu = currentSoal ? answersMap[currentSoal.id]?.isRagu : false;

  const totalTerjawab = Object.values(answersMap).filter((v) => Boolean(v.jawaban)).length;
  const totalRagu = Object.values(answersMap).filter((v) => v.isRagu).length;

  // Sanitasi subtitle sesi agar tidak mengulang nama mata pelajaran
  const cleanSesiSubtitle = useMemo(() => {
    if (!examOverview?.nama_sesi) return '';
    const mapel = (examOverview?.mapel || '').trim();
    let str = examOverview.nama_sesi;
    if (mapel) {
      str = str.replace(new RegExp(`\\s*[-–•]?\\s*${mapel}\\s*[-–•]?\\s*`, 'gi'), ' ');
    }
    str = str.replace(/\s+/g, ' ').replace(/^\s*[-–•]\s*/, '').replace(/\s*[-–•]\s*$/, '').trim();
    return str || '';
  }, [examOverview]);

  const renderContent = () => {
    // ─── RENDER 1: TOKEN GATEKEEPER ─────────────────────────────────────────────
    if (step === 'TOKEN_GATE') {
      return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
              <Maximize2 size={28} />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Masuk Ruang Ujian CBT</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masukkan 6 digit token ujian resmi dari pengawas ruangan
              </p>
            </div>

            <form onSubmit={handleVerifyToken} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  placeholder="TOKEN"
                  className="w-full text-center tracking-[0.35em] font-mono text-2xl font-bold py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-2xs"
                  aria-label="Input Token Ujian CBT"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loadingVerify || tokenInput.length < 4}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white rounded-xl shadow-md transition-all"
              >
                {loadingVerify ? 'Memeriksa Token...' : 'Verifikasi Token'}
              </Button>
            </form>

            <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>Anti-Cheat Guard & Offline-First Active</span>
            </div>
          </Card>
        </div>
      );
    }

    // ─── RENDER 2: KONFIRMASI SESI SEBELUM MULAI ────────────────────────────────
    if (step === 'CONFIRMATION') {
      return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl space-y-4">
            {/* Header Sesi Ujian */}
            <div className="text-center space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 size={13} className="stroke-[2.5]" />
                <span>Token Valid</span>
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {examOverview?.mapel || examOverview?.nama_sesi}
                </h2>
                {cleanSesiSubtitle && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {cleanSesiSubtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Biodata Peserta Terhubung Universal Academic Identity (SSoT) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Identitas Peserta
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Terverifikasi
                </span>
              </div>
              <UniversalStudentIdentity
                id={studentId}
                data={user?.siswa_profile || (user as any)?.siswa || user}
                variant="card"
                className="bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 shadow-none rounded-xl p-3 sm:p-3.5"
              />
            </div>

            {/* Spesifikasi Ujian Ringkas (Bebas Noise & Redundansi) */}
            <div className="grid grid-cols-2 divide-x divide-slate-200/80 dark:divide-slate-700/60 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block">
                    Durasi
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {examOverview?.durasi_menit} Menit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pl-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block">
                    Soal
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {examOverview?.total_soal} Butir (PG)
                  </span>
                </div>
              </div>
            </div>

            {/* Protokol Keamanan Ringkas */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
              <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Mode <strong>Layar Penuh</strong> aktif saat ujian dimulai. Dilarang berpindah tab browser atau meminimalkan jendela selama ujian.
              </p>
            </div>

            {/* Tanda Tangan Kehadiran & Pakta Integritas (Reusable DigitalSignatureField) */}
            <div className="space-y-1.5 pt-0.5">
              <DigitalSignatureField
                label="Tanda Tangan Kehadiran & Pakta Integritas"
                penName={user?.siswa_profile?.nama_lengkap || user?.full_name || 'Peserta Ujian'}
                value={signature}
                onChange={setSignature}
                className="w-full"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                Dengan menandatangani, Anda menyatakan hadir secara sah dan mematuhi tata tertib ujian CBT.
              </p>
            </div>

            {/* Tombol Aksi Sederhana (Cukup "Mulai" Bebas Teks Bertumpuk) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('TOKEN_GATE')}
                className="h-11 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-xs"
              >
                Ganti Token
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleStartExam}
                disabled={loadingVerify || !signature}
                className="h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md text-sm transition-all"
              >
                {loadingVerify ? 'Memuat...' : 'Mulai'}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    // ─── RENDER 3: SELESAI / COMPLETED SCREEN ───────────────────────────────────
    if (step === 'COMPLETED') {
      return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ujian Berhasil Diserahkan</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lembar jawaban Anda telah diterima dan tersimpan di database institusi.
              </p>
            </div>

            {finalResult?.nilai_akhir != null && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 space-y-1">
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">
                  Nilai Akhir Ujian (PG)
                </span>
                <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {finalResult.nilai_akhir}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-center gap-4 pt-2">
                  <span>Benar: <strong className="text-emerald-600 dark:text-emerald-400">{finalResult.jumlah_benar}</strong></span>
                  <span>Salah: <strong className="text-rose-600 dark:text-rose-400">{finalResult.jumlah_salah}</strong></span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => (window.location.href = '/dashboard?tab=cbt')}
                className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl"
              >
                Kembali ke Beranda
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    // ─── RENDER 4: LIVE EXAM ROOM (HIGH-CONCURRENCY DESKTOP & MOBILE) ───────────
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col select-none overflow-hidden">
        {/* Top Bar Pengawasan & Timer */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-indigo-600 text-white font-mono text-xs font-bold">
              CBT ONLINE
            </Badge>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              {examOverview?.nama_sesi || 'UAS Semester'}
            </span>
          </div>

          {/* Status Network & Countdown Timer */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 animate-pulse'
              }`}
              title={isOnline ? 'Terhubung ke server' : 'Mode Offline (Jawaban tersimpan lokal di IndexedDB)'}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline Buffer'}</span>
            </div>

            {/* Timer Display */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-sm font-bold border transition-colors ${
                sisaWaktuDetik < 300
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-600 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-indigo-300'
              }`}
            >
              <Clock size={16} />
              <span>{formatTimer(sisaWaktuDetik)}</span>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsSubmitConfirmOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-xs"
            >
              <Send size={13} className="mr-1.5" />
              <span>Kumpulkan</span>
            </Button>
          </div>
        </header>

        {/* Main Workspace Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Kolom Soal Aktif (75%) */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {currentSoal ? (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Soal Header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 tracking-wide whitespace-nowrap shrink-0">
                    SOAL NOMOR {currentIdx + 1}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap shrink-0">
                    Bobot: {currentSoal.bobot} Poin
                  </span>
                </div>

                {/* Konten Pertanyaan & Stimulus Soal */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <CbtContentRenderer
                    content={currentSoal.konten_pertanyaan}
                    imageUrl={currentSoal.gambar_stimulus_url}
                    imageAlt={`Stimulus Soal Nomor ${currentIdx + 1}`}
                    className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed"
                  />
                </div>

                {/* Pilihan Jawaban A-E (Auto-Adaptive: Grid 1 Baris, 2 Kolom, atau 1 Kolom Penuh) */}
                <div className="space-y-2.5">
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    PILIHAN JAWABAN:
                  </span>

                  <CbtOptionsRenderer
                    options={currentSoal.opsi_jawaban_json}
                    selectedAnswer={currentAnswer}
                    onSelectAnswer={(kode) => handleSelectAnswer(currentSoal.id, kode)}
                    modeContext="exam"
                    readOnly={false}
                  />
                </div>

                {/* Bottom Navigasi Tombol */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArrowLeft size={16} className="mr-1.5" />
                    <span>Sebelumnya</span>
                  </Button>

                  {/* Tombol Ragu-ragu */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleToggleRagu(currentSoal.id)}
                    className={`border font-bold text-xs h-9 ${
                      currentIsRagu
                        ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                        : 'border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                    }`}
                  >
                    <span>{currentIsRagu ? '✓ Ditandai Ragu' : 'Tandai Ragu-Ragu'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setCurrentIdx((prev) => Math.min(soalList.length - 1, prev + 1))}
                    disabled={currentIdx === soalList.length - 1}
                    className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white"
                  >
                    <span>Selanjutnya</span>
                    <ArrowRight size={16} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center">
                <Loader size="lg" />
              </div>
            )}
          </main>

          {/* Sidebar Navigasi Nomor Soal (25%) */}
          <aside className="w-full md:w-80 bg-slate-50/80 dark:bg-slate-900/80 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Nomor Soal ({soalList.length})
                </h3>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Terjawab: <strong className="text-indigo-600 dark:text-indigo-400">{totalTerjawab}</strong> / {soalList.length}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-600" /> Terjawab
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Ragu
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" /> Belum
                </span>
              </div>

              {/* Grid Butir Soal */}
              <div className="grid grid-cols-5 gap-2 max-h-72 md:max-h-[55vh] overflow-y-auto pr-1">
                {(soalList || []).map((soal, idx) => {
                  const ans = answersMap[soal.id];
                  const hasAnswer = Boolean(ans?.jawaban);
                  const isRagu = Boolean(ans?.isRagu);
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={soal.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                        isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''
                      } ${
                        isRagu
                          ? 'bg-amber-500 text-white font-black'
                          : hasAnswer
                          ? 'bg-indigo-600 text-white font-black'
                          : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-2xs'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {hasAnswer && !isRagu && (
                        <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-indigo-200">
                          {ans.jawaban}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Submit Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md"
              >
                Kumpulkan Ujian Sekarang
              </Button>
            </div>
          </aside>
      </div>

      {/* Modal Peringatan Anti-Curang */}
      <Modal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        title="Peringatan Pelanggaran Anti-Cheat"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>

          <div className="space-y-1 text-xs text-slate-300">
            <p className="font-bold text-rose-400">{warningMessage}</p>
            <p>
              Tetap berada di dalam layar ujian. Sistem akan otomatis mendiskualifikasi ujian jika mencapai batas maksimal.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setIsWarningModalOpen(false);
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => null);
              }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-xs"
          >
            Kembali ke Layar Penuh
          </Button>
        </div>
      </Modal>

      {/* Modal Konfirmasi Submit Final */}
      <Modal
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        title="Konfirmasi Pengumpulan Ujian"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Butir Soal:</span>
              <span className="font-bold">{soalList.length} Soal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Soal Terjawab:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalTerjawab} Soal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ditandai Ragu-Ragu:</span>
              <span className="font-bold text-amber-500">{totalRagu} Soal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Belum Dijawab:</span>
              <span className="font-bold text-rose-500">{soalList.length - totalTerjawab} Soal</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin menyelesaikan dan mengumpulkan ujian ini? Tindakan ini bersifat final dan tidak dapat dibatalkan.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitConfirmOpen(false)}
              className="flex-1"
            >
              Lanjutkan Mengerjakan
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={executeFinalSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
            >
              {isSubmitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

return <InfraErrorBoundary>{renderContent()}</InfraErrorBoundary>;
}
