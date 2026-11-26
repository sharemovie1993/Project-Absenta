import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Sparkles,
  Users,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  HelpCircle,
  Wifi,
  WifiOff,
  LogOut,
  Send,
  Eye,
  RefreshCw,
  CloudOff,
  Check,
  RotateCcw,
  LayoutGrid,
  Flag,
  Trophy,
  Copy,
  Printer,
  Home,
  ShieldCheck,
  Award,
  FileText,
  BookOpen,
} from 'lucide-react';
import { cbtApi } from '@/api/cbt.api';
import { cbtOfflineStorage, LocalAnswerRecord } from '@/utils/cbtOfflineStorage';
import type { CbtSoal, CbtStudentAnswerItem } from '@/types/cbt.types';
import { CbtContentRenderer } from '@/components/cbt/common/CbtContentRenderer';
import { CbtOptionsRenderer } from '@/components/cbt/common/CbtOptionsRenderer';
import { UniversalStudentIdentity } from '@/components/common/UniversalStudentIdentity';
import { ErrorBoundary as InfraErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const CBT_SESSION_STORAGE_KEY = 'cbt_active_exam_session_v1';

interface PersistedExamSession {
  jadwalId: string;
  token: string;
  signature: string;
  lastSavedIdx: number;
  savedAt: number;
}

const saveSessionToStorage = (data: PersistedExamSession) => {
  try {
    sessionStorage.setItem(CBT_SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

const getSessionFromStorage = (): PersistedExamSession | null => {
  try {
    const raw = sessionStorage.getItem(CBT_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearSessionStorage = () => {
  try {
    sessionStorage.removeItem(CBT_SESSION_STORAGE_KEY);
  } catch {}
};

export default function CbtExamRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const studentId = user?.siswa_id || (user as any)?.siswa?.id || user?.id;

  // States
  const [step, setStep] = useState<'TOKEN_GATE' | 'CONFIRMATION' | 'EXAM_ROOM' | 'COMPLETED'>('TOKEN_GATE');
  const [tokenInput, setTokenInput] = useState('');
  const [examOverview, setExamOverview] = useState<any>(null);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    const persisted = getSessionFromStorage();
    return Boolean(persisted?.jadwalId && persisted?.token && persisted?.signature);
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errorDiagnosis, setErrorDiagnosis] = useState<{
    code: string;
    message: string;
    hint?: string;
    details?: any;
  } | null>(null);

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
  const [examStartTime, setExamStartTime] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('cbt_exam_start_time');
    return saved ? parseInt(saved, 10) : null;
  });
  const [completedDurationMinutes, setCompletedDurationMinutes] = useState<number | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Modals
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isMobileQuestionDrawerOpen, setIsMobileQuestionDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showManualToken, setShowManualToken] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Network listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus((prev) => (prev === 'offline' ? 'synced' : prev));
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 0. Auto-Restore & Auto-Fill URL Params pada Mounting
  useEffect(() => {
    let isMounted = true;

    const restoreOrInitialize = async () => {
      try {
        const persisted = getSessionFromStorage();
        const urlJadwalId = searchParams.get('jadwal_id');
        const urlToken = searchParams.get('token');

        // ── SKENARIO 1: PEMULIHAN SESI AKTIF (RELOAD / F5 / RECONNECT) ──
        if (persisted?.jadwalId && persisted?.token && persisted?.signature) {
          try {
            setIsRestoringSession(true);
            if (!isMounted) return;
            setJadwalId(persisted.jadwalId);
            setTokenInput(persisted.token);
            setSignature(persisted.signature);

            const res = await cbtApi.startExamSession({
              jadwal_ujian_id: persisted.jadwalId,
              token_masuk: persisted.token,
              metadata_perangkat: {
                userAgent: navigator.userAgent,
                reconnected: true,
                waktu_reconnect: new Date().toISOString(),
              },
            });

            if (!isMounted) return;

            const loadedSoal = res.soal || [];
            setSoalList(loadedSoal);
            setSisaWaktuDetik(res.sisa_waktu_detik || res.durasi_menit * 60);
            setMaxViolations(res.setting_keamanan?.max_tab_switches || 3);

            // Muat jawaban lokal & server
            const localAnswers = await cbtOfflineStorage.getAllAnswers(persisted.jadwalId, studentId || 'siswa');
            const mergedMap: Record<string, { jawaban: string; isRagu: boolean }> = {};
            if (Array.isArray(res.jawaban_tersimpan)) {
              res.jawaban_tersimpan.forEach((item) => {
                mergedMap[item.soal_id] = { jawaban: item.jawaban_siswa, isRagu: item.is_ragu };
              });
            }
            localAnswers.forEach((item) => {
              mergedMap[item.soal_id] = { jawaban: item.jawaban_siswa, isRagu: item.is_ragu };
            });
            setAnswersMap(mergedMap);

            if (persisted.lastSavedIdx >= 0 && persisted.lastSavedIdx < loadedSoal.length) {
              setCurrentIdx(persisted.lastSavedIdx);
            }

            setStep('EXAM_ROOM');
            const nowTime = Date.now();
            setExamStartTime((prev) => {
              const val = prev || nowTime;
              sessionStorage.setItem('cbt_exam_start_time', String(val));
              return val;
            });
            toast.success('Sesi ujian Anda berhasil dipulihkan!');
            return;
          } catch (err: any) {
            console.warn('[CBT Session Restore Failed]', err?.message);
            clearSessionStorage();
          } finally {
            if (isMounted) setIsRestoringSession(false);
          }
        }

        // ── SKENARIO 2: MASUK DARI DASHBOARD SISWA (URL QUERY PARAMS) ──
        if (urlJadwalId) {
          const tokenToVerify = urlToken ? urlToken.trim().toUpperCase() : 'TOKENLESS';
          try {
            setLoadingVerify(true);
            const res = await cbtApi.verifyToken(tokenToVerify, urlJadwalId);
            if (isMounted) {
              setTokenInput(tokenToVerify);
              setExamOverview(res);
              setJadwalId(res.jadwal_id);
              setStep('CONFIRMATION');
              return;
            }
          } catch (err: any) {
            if (isMounted && !urlToken) {
              setTokenInput('');
            }
            console.warn('[CBT Auto verify with urlJadwalId failed, fallback to TOKEN_GATE]', err?.message);
          } finally {
            if (isMounted) setLoadingVerify(false);
          }
        } else if (urlToken) {
          setTokenInput(urlToken.toUpperCase());
        }
      } finally {
        if (isMounted) setIsRestoringSession(false);
      }
    };

    restoreOrInitialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Remedial 1-Click Access for whitelisted students (jitter 45-60s agar anti-stampede)
  const tokenGatePollingMs = useMemo(() => 45000 + Math.floor(Math.random() * 15000), []);
  const { data: myExams = [] } = useQuery({
    queryKey: ['cbt-my-exams-remedial'],
    queryFn: () => cbtApi.getMyExams(),
    enabled: step === 'TOKEN_GATE',
    staleTime: 30000,
    refetchInterval: tokenGatePollingMs,
    refetchOnWindowFocus: false,
  });

  const activeRemedial = useMemo(() => {
    return (myExams || []).find(
      (e) => Boolean(e.is_remedial) && e.status_peserta !== 'FINISHED'
    );
  }, [myExams]);

  const handleStartDirectRemedial = async (remedial: typeof activeRemedial) => {
    if (!remedial) return;
    try {
      setLoadingVerify(true);
      setErrorDiagnosis(null);
      const token = remedial.token_ujian || 'TOKENLESS';
      setTokenInput(token);
      const res = await cbtApi.verifyToken(token, remedial.id);
      setExamOverview(res);
      setJadwalId(res.jadwal_id);
      setStep('CONFIRMATION');
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.message || 'Gagal masuk sesi remedial';
      const code = data?.code || 'REMEDIAL_ENTRY_FAILED';
      const hint = data?.details?.hint;
      setErrorDiagnosis({
        code,
        message: msg,
        hint,
        details: data?.details,
      });
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoadingVerify(false);
    }
  };

  // 1. Verifikasi Token Ujian
  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error('Masukkan token ujian yang diberikan pengawas');
      return;
    }

    try {
      setLoadingVerify(true);
      setErrorDiagnosis(null);
      const res = await cbtApi.verifyToken(tokenInput.trim().toUpperCase());
      setExamOverview(res);
      setJadwalId(res.jadwal_id);
      setStep('CONFIRMATION');
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.message || 'Token ujian tidak valid atau sesi belum dimulai';
      const code = data?.code || 'TOKEN_INVALID';
      const hint = data?.details?.hint;
      setErrorDiagnosis({
        code,
        message: msg,
        hint,
        details: data?.details,
      });
      toast.error(msg, { duration: 5000 });
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

      const loadedSoal = res.soal || [];
      setSoalList(loadedSoal);
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
      const nowTime = Date.now();
      setExamStartTime((prev) => {
        const val = prev || nowTime;
        sessionStorage.setItem('cbt_exam_start_time', String(val));
        return val;
      });

      // Simpan sesi aktif ke session storage
      saveSessionToStorage({
        jadwalId,
        token: tokenInput.trim().toUpperCase(),
        signature,
        lastSavedIdx: 0,
        savedAt: Date.now(),
      });

      toast.success('Selamat mengerjakan! Layar terkunci ke mode ujian.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memulai sesi ujian');
    } finally {
      setLoadingVerify(false);
    }
  };

  // 2b. Fungsi Recovery Darurat jika soal gagal termuat
  const handleRecoverExamSession = async () => {
    try {
      setLoadingVerify(true);
      const res = await cbtApi.startExamSession({
        jadwal_ujian_id: jadwalId,
        token_masuk: tokenInput.trim().toUpperCase(),
        metadata_perangkat: {
          userAgent: navigator.userAgent,
          recovery: true,
          waktu_recovery: new Date().toISOString(),
        },
      });

      const loadedSoal = res.soal || [];
      setSoalList(loadedSoal);
      setSisaWaktuDetik(res.sisa_waktu_detik || res.durasi_menit * 60);
      setCurrentIdx(0);
      toast.success('Soal berhasil dimuat ulang!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat ulang soal. Hubungi pengawas.');
    } finally {
      setLoadingVerify(false);
    }
  };

  // 3. Countdown Timer Interval (Aman dari infinite re-trigger)
  useEffect(() => {
    if (step !== 'EXAM_ROOM' || sisaWaktuDetik <= 0) return;

    const interval = setInterval(() => {
      setSisaWaktuDetik((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!isSubmittingRef.current) {
            handleForceAutoSubmit();
          }
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

  // Ref stabil untuk menampung jawaban & sisa waktu tanpa memicu reset interval
  const answersMapRef = useRef(answersMap);
  answersMapRef.current = answersMap;

  const sisaWaktuDetikRef = useRef(sisaWaktuDetik);
  sisaWaktuDetikRef.current = sisaWaktuDetik;

  // ── Tracking Durasi per Butir Soal & Revisit Count (Zero Overhead, RAM Murni) ──
  const questionTimingRef = useRef<Record<string, { durasiDetik: number; revisitCount: number }>>({});
  const activeSoalEnterTimeRef = useRef<number>(Date.now());
  const activeSoalIdRef = useRef<string | null>(null);

  // Akumulasikan waktu yang dihabiskan siswa pada butir soal yang sedang aktif
  const flushCurrentQuestionTime = useCallback(() => {
    const activeId = activeSoalIdRef.current;
    if (!activeId) return;
    const now = Date.now();
    const elapsed = Math.max(0, Math.round((now - activeSoalEnterTimeRef.current) / 1000));
    const safeElapsed = Math.min(3600, elapsed); // Lindungi dari anomali jika laptop/HP sleep

    const existing = questionTimingRef.current[activeId] || { durasiDetik: 0, revisitCount: 1 };
    questionTimingRef.current[activeId] = {
      ...existing,
      durasiDetik: existing.durasiDetik + safeElapsed,
    };
    activeSoalEnterTimeRef.current = now;
  }, []);

  // Catat perpindahan nomor butir soal (currentIdx)
  useEffect(() => {
    if (step !== 'EXAM_ROOM' || !soalList.length) return;
    const activeSoal = soalList[currentIdx];
    if (!activeSoal) return;

    // Catat waktu butir sebelumnya
    flushCurrentQuestionTime();

    // Inisiasi timer soal baru & tambahkan counter bolak-balik (revisit)
    const targetId = activeSoal.id;
    const existing = questionTimingRef.current[targetId] || { durasiDetik: 0, revisitCount: 0 };
    questionTimingRef.current[targetId] = {
      ...existing,
      revisitCount: existing.revisitCount + 1,
    };
    activeSoalIdRef.current = targetId;
    activeSoalEnterTimeRef.current = Date.now();
  }, [currentIdx, step, soalList, flushCurrentQuestionTime]);

  // 4a. Debounced Autosave Realtime (1.2 detik setelah memilih jawaban)
  const triggerDebouncedSync = useCallback(() => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSyncStatus('syncing');

    debounceTimerRef.current = setTimeout(async () => {
      flushCurrentQuestionTime();
      const currentAnswers = answersMapRef.current;
      const currentSisaWaktu = sisaWaktuDetikRef.current;
      const currentTiming = questionTimingRef.current;

      const answersArray: CbtStudentAnswerItem[] = Object.entries(currentAnswers).map(
        ([soalId, val]) => ({
          soal_id: soalId,
          jawaban_siswa: val.jawaban,
          is_ragu: val.isRagu,
          timestamp: Date.now(),
          durasi_detik: currentTiming[soalId]?.durasiDetik ?? 0,
          revisit_count: currentTiming[soalId]?.revisitCount ?? 1,
        })
      );

      if (answersArray.length > 0 && jadwalId && navigator.onLine) {
        try {
          await cbtApi.syncAnswers(jadwalId, {
            jawaban: answersArray,
            sisa_waktu_detik: currentSisaWaktu,
          });
          await cbtOfflineStorage.markAnswersSynced(jadwalId, studentId || 'siswa');
          setSyncStatus('synced');
        } catch {
          setSyncStatus('error');
        }
      } else {
        setSyncStatus('synced');
      }
    }, 1200);
  }, [jadwalId, studentId, flushCurrentQuestionTime]);

  // 4b. Background Safety Sync Heartbeat ke Redis setiap 20 detik
  useEffect(() => {
    if (step !== 'EXAM_ROOM' || !jadwalId) return;

    const syncInterval = setInterval(async () => {
      flushCurrentQuestionTime();
      const currentAnswers = answersMapRef.current;
      const currentSisaWaktu = sisaWaktuDetikRef.current;
      const currentTiming = questionTimingRef.current;

      const answersArray: CbtStudentAnswerItem[] = Object.entries(currentAnswers).map(
        ([soalId, val]) => ({
          soal_id: soalId,
          jawaban_siswa: val.jawaban,
          is_ragu: val.isRagu,
          timestamp: Date.now(),
          durasi_detik: currentTiming[soalId]?.durasiDetik ?? 0,
          revisit_count: currentTiming[soalId]?.revisitCount ?? 1,
        })
      );

      if (answersArray.length > 0 && navigator.onLine) {
        try {
          await cbtApi.syncAnswers(jadwalId, {
            jawaban: answersArray,
            sisa_waktu_detik: currentSisaWaktu,
          });
          await cbtOfflineStorage.markAnswersSynced(jadwalId, studentId || 'siswa');
          setSyncStatus('synced');
        } catch {
          // Gagal sync sementara tidak masalah karena IndexedDB sudah memegang data secara aman
        }
      }
    }, 20000);

    return () => clearInterval(syncInterval);
  }, [step, jadwalId, studentId, flushCurrentQuestionTime]);

  // 5. Anti-Cheat Security Watchers (Tab Switch & Fullscreen Exit)
  useEffect(() => {
    if (step !== 'EXAM_ROOM') return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await triggerViolation('TAB_SWITCH', 'Terdeteksi berpindah tab atau meminimalkan browser');
      }
    };

    const handleWindowBlur = async () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (!isTouchDevice) {
        await triggerViolation('BLUR_WINDOW', 'Kursor keluar dari jendela aplikasi ujian');
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        await triggerViolation('FULLSCREEN_EXIT', 'Siswa keluar dari mode fullscreen');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // ── 5b. Anti-Stampede Keyboard & Navigation Interceptor (Cegah Ledakan F5 / Hot Reload) ──
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tangkap F5, Ctrl+R, Cmd+R, Ctrl+F5
      const isF5 = e.key === 'F5' || e.keyCode === 116;
      const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.keyCode === 82);

      if (isF5 || isCtrlR) {
        e.preventDefault();
        e.stopPropagation();

        // Ganti Hard Reload dengan Soft In-App Re-Sync (0ms Network Overload)
        toast('Halaman tidak perlu di-refresh. Seluruh jawaban Anda aman di perangkat!', {
          icon: '🛡️',
          duration: 3500,
        });

        // Trigger safe lightweight sync
        triggerDebouncedSync();
        return false;
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sesi ujian sedang berlangsung. Jawaban Anda tersimpan otomatis. Tetap di halaman ini?';
      return e.returnValue;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, violationsCount, maxViolations, triggerDebouncedSync]);

  const triggerViolation = async (tipe: string, detail: string) => {
    const nextCount = violationsCount + 1;
    setViolationsCount(nextCount);
    const nomorSoalAktif = currentIdx + 1;
    setWarningMessage(
      `PERINGATAN: ${detail}! (Pelanggaran ${nextCount} dari ${maxViolations} - Terjadi pada Soal No. ${nomorSoalAktif})`
    );
    setIsWarningModalOpen(true);

    try {
      const currentSoal = soalList[currentIdx];
      await cbtApi.recordViolation(jadwalId, {
        tipe_pelanggaran: tipe,
        detail: `${detail} (Saat membuka Soal No. ${nomorSoalAktif})`,
        soal_nomor: nomorSoalAktif,
        soal_id: currentSoal?.id,
      });
    } catch {}

    if (nextCount >= maxViolations) {
      toast.error('Batas pelanggaran terlampaui. Ujian Anda didiskualifikasi secara otomatis.');
      handleForceAutoSubmit();
    }
  };

  // 6. Pilih Jawaban Siswa (Instan ke IndexedDB + Debounced Cloud Sync)
  const handleSelectAnswer = async (soalId: string, kodeOpsi: string) => {
    const currentRagu = answersMap[soalId]?.isRagu || false;
    setAnswersMap((prev) => ({
      ...prev,
      [soalId]: { jawaban: kodeOpsi, isRagu: currentRagu },
    }));

    // Simpan instan ke IndexedDB lokal (<1ms)
    flushCurrentQuestionTime();
    const currentTiming = questionTimingRef.current[soalId];
    await cbtOfflineStorage.saveAnswer(
      jadwalId,
      user?.id || 'siswa',
      soalId,
      kodeOpsi,
      currentRagu,
      currentTiming?.durasiDetik ?? 0,
      currentTiming?.revisitCount ?? 1
    );

    // Update session storage index
    if (signature) {
      saveSessionToStorage({
        jadwalId,
        token: tokenInput.trim().toUpperCase(),
        signature,
        lastSavedIdx: currentIdx,
        savedAt: Date.now(),
      });
    }

    // Panggil sync asinkron ke server
    triggerDebouncedSync();
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

    triggerDebouncedSync();
  };

  // 7. Submit Final Ujian
  const handleForceAutoSubmit = async () => {
    await executeFinalSubmit();
  };

  const executeFinalSubmit = async () => {
    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setSubmitError(null);

      flushCurrentQuestionTime();
      const currentTiming = questionTimingRef.current;

      const answersArray: CbtStudentAnswerItem[] = (soalList || []).map((s) => ({
        soal_id: s.id,
        jawaban_siswa: answersMap[s.id]?.jawaban || '',
        is_ragu: answersMap[s.id]?.isRagu || false,
        timestamp: Date.now(),
        durasi_detik: currentTiming[s.id]?.durasiDetik ?? 0,
        revisit_count: currentTiming[s.id]?.revisitCount ?? 1,
      }));

      const res = await cbtApi.submitFinal(jadwalId, {
        jawaban_final: answersArray,
      });

      // Bersihkan IndexedDB lokal dan Session Storage
      const elapsedMins = examStartTime
        ? Math.max(1, Math.round((Date.now() - examStartTime) / 60000))
        : (examOverview?.durasi_menit ? Math.round(examOverview.durasi_menit * 0.5) : 35);
      setCompletedDurationMinutes(elapsedMins);
      sessionStorage.removeItem('cbt_exam_start_time');

      await cbtOfflineStorage.clearSession(jadwalId, user?.id || 'siswa');
      clearSessionStorage();

      // Keluar dari Fullscreen
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => null);
      }

      setFinalResult(res);
      setStep('COMPLETED');
      setIsSubmitConfirmOpen(false);
      toast.success('Ujian berhasil diserahkan!');
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        'Gagal menyerahkan ujian ke server institusi. Periksa koneksi WiFi/Data Anda.';
      setSubmitError(errMsg);
      toast.error(errMsg, { duration: 6000 });
      // Tetap buka modal konfirmasi submit agar siswa memiliki tombol coba lagi yang jelas
      setIsSubmitConfirmOpen(true);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
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

  // Shortcut Keyboard: Tekan A-E untuk memilih jawaban, ArrowLeft/ArrowRight untuk pindah soal
  useEffect(() => {
    if (step !== 'EXAM' || !currentSoal) return;

    const onExamAnswerKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const keyUpper = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(keyUpper)) {
        const matchedOpt = (currentSoal.opsi_jawaban_json || []).find(
          (opt) => (opt.kode || '').toUpperCase().trim() === keyUpper
        );
        if (matchedOpt) {
          e.preventDefault();
          handleSelectAnswer(currentSoal.id, matchedOpt.kode);
        }
        return;
      }

      if (e.key === 'ArrowLeft' && currentIdx > 0) {
        e.preventDefault();
        setCurrentIdx((idx) => Math.max(0, idx - 1));
      } else if (e.key === 'ArrowRight' && currentIdx < soalList.length - 1) {
        e.preventDefault();
        setCurrentIdx((idx) => Math.min(soalList.length - 1, idx + 1));
      }
    };

    window.addEventListener('keydown', onExamAnswerKeyDown);
    return () => window.removeEventListener('keydown', onExamAnswerKeyDown);
  }, [step, currentSoal, currentIdx, soalList.length]);

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
    // ─── RENDER 0: RESTORING ACTIVE SESSION (SEAMLESS RELOAD) ───────────────────
    if (isRestoringSession) {
      return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/40">
              <RefreshCw size={24} className="animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Memulihkan Sesi Ujian</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Menghubungkan kembali ke lembar soal dan menyinkronkan jawaban Anda...
              </p>
            </div>
          </Card>
        </div>
      );
    }

    // ─── RENDER 1: TOKEN GATEKEEPER ─────────────────────────────────────────────
    if (step === 'TOKEN_GATE') {
      return (
        <div
          className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
          }}
        >
          <Card className="w-full max-w-md p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
              <Maximize2 size={28} />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeRemedial && !showManualToken ? 'Sesi Ujian CBT Tersedia' : 'Masuk Ruang Ujian CBT'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeRemedial && !showManualToken
                  ? 'Sesi ujian Anda telah disiapkan oleh guru dan siap untuk dikerjakan'
                  : 'Masukkan 6 digit token ujian resmi dari pengawas ruangan'}
              </p>
            </div>

            {/* 1-Click Remedial Entry Card (Bebas Token) */}
            {activeRemedial && !showManualToken && (
              <div className="text-left p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Sesi Siap Dikerjakan</span>
                  </div>
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    {activeRemedial.is_tokenless ? 'Bebas Token' : `Token: ${activeRemedial.token_ujian || '-'}`}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-base text-slate-900 dark:text-white">
                    {activeRemedial.mapel || activeRemedial.judul_bank}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>Guru: {activeRemedial.guru || 'Guru Mapel'}</span>
                    <span>•</span>
                    <span>{activeRemedial.total_soal} Butir Soal ({activeRemedial.durasi_menit} Menit)</span>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => handleStartDirectRemedial(activeRemedial)}
                  disabled={loadingVerify}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Sparkles size={16} />
                  <span>{loadingVerify ? 'Menghubungkan...' : 'Mulai Ujian Sekarang →'}</span>
                </Button>
              </div>
            )}

            {activeRemedial && !showManualToken && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualToken(true)}
                  className="text-xs font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Punya token sesi ujian lain? Masukkan token manual
                </button>
              </div>
            )}

            {(!activeRemedial || showManualToken) && (
              <form onSubmit={handleVerifyToken} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value.toUpperCase());
                      if (errorDiagnosis) setErrorDiagnosis(null);
                    }}
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
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {loadingVerify ? 'Memeriksa Token...' : 'Verifikasi Token'}
                </Button>

                {activeRemedial && showManualToken && (
                  <button
                    type="button"
                    onClick={() => setShowManualToken(false)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline block mx-auto pt-1 cursor-pointer"
                  >
                    ← Kembali ke Sesi Siap Dikerjakan
                  </button>
                )}
              </form>
            )}

            {/* Structured Real-Time Diagnostic Box */}
            {errorDiagnosis && (
              <div
                className={cn(
                  'text-left p-3.5 rounded-xl border space-y-2 text-xs transition-all animate-in fade-in zoom-in-95',
                  errorDiagnosis.code === 'SESSION_DRAFT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200'
                    : errorDiagnosis.code === 'SCHEDULE_NOT_STARTED'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 text-blue-900 dark:text-blue-200'
                      : errorDiagnosis.code === 'LATE_ENTRY_REJECTED'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200'
                        : errorDiagnosis.code === 'WRONG_CLASS'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700/60 text-purple-900 dark:text-purple-200'
                          : errorDiagnosis.code === 'REMEDIAL_RESTRICTED'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/60 text-indigo-900 dark:text-indigo-200'
                            : errorDiagnosis.code === 'ALREADY_FINISHED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200'
                              : errorDiagnosis.code === 'SESSION_PAUSED'
                                ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700/60 text-yellow-900 dark:text-yellow-200'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    {errorDiagnosis.code === 'SESSION_DRAFT' ? (
                      <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                    ) : errorDiagnosis.code === 'SCHEDULE_NOT_STARTED' ? (
                      <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                    ) : errorDiagnosis.code === 'LATE_ENTRY_REJECTED' ? (
                      <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
                    ) : errorDiagnosis.code === 'WRONG_CLASS' ? (
                      <Users size={16} className="text-purple-600 dark:text-purple-400" />
                    ) : errorDiagnosis.code === 'REMEDIAL_RESTRICTED' ? (
                      <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                    ) : errorDiagnosis.code === 'ALREADY_FINISHED' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-black text-xs uppercase tracking-wide">
                      {errorDiagnosis.code === 'SESSION_DRAFT'
                        ? 'Sesi Ujian Masih DRAFT'
                        : errorDiagnosis.code === 'SCHEDULE_NOT_STARTED'
                          ? 'Ujian Belum Dimulai'
                          : errorDiagnosis.code === 'LATE_ENTRY_REJECTED'
                            ? 'Terlambat Masuk Ujian'
                            : errorDiagnosis.code === 'WRONG_CLASS'
                              ? 'Salah Masuk Ruang / Kelas'
                              : errorDiagnosis.code === 'REMEDIAL_RESTRICTED'
                                ? 'Sesi Khusus Remedial'
                                : errorDiagnosis.code === 'ALREADY_FINISHED'
                                  ? 'Ujian Sudah Diserahkan'
                                  : errorDiagnosis.code === 'SESSION_PAUSED'
                                    ? 'Sesi Sedang Dijeda'
                                    : errorDiagnosis.code === 'SCHEDULE_EXPIRED'
                                      ? 'Jadwal Ujian Telah Berakhir'
                                      : errorDiagnosis.code === 'TOKEN_NOT_FOUND'
                                        ? 'Token Tidak Ditemukan'
                                        : 'Akses Ujian Ditolak'}
                    </div>
                    <p className="leading-relaxed font-medium text-[11px] sm:text-xs">
                      {errorDiagnosis.message}
                    </p>
                    {errorDiagnosis.hint && (
                      <div className="pt-1.5 border-t border-current/15 text-[11px] font-bold flex items-start gap-1">
                        <span className="shrink-0">💡 Solusi:</span>
                        <span>{errorDiagnosis.hint}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>Anti-Cheat Guard & Offline-First Active</span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => (window.location.href = '/dashboard?tab=cbt')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                ← Kembali ke Dashboard
              </button>
            </div>
          </Card>
        </div>
      );
    }

    // ─── RENDER 2: KONFIRMASI SESI SEBELUM MULAI ────────────────────────────────
    if (step === 'CONFIRMATION') {
      return (
        <div
          className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
          }}
        >
          <Card className="w-full max-w-md p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl space-y-4">
            {/* Header Sesi Ujian */}
            <div className="text-center space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 size={13} className="stroke-[2.5]" />
                <span>{tokenInput === 'TOKENLESS' ? 'Remedial Terverifikasi' : 'Token Valid'}</span>
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
                {examOverview?.guru && (
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Guru Pengampu: <span className="font-bold text-slate-700 dark:text-slate-200">{examOverview.guru}</span>
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

    // ─── RENDER 3: SELESAI / COMPLETED SCREEN (RICH SUBMISSION RECEIPT) ─────────
    if (step === 'COMPLETED') {
      const studentFullName =
        user?.full_name ||
        (user as any)?.nama_lengkap ||
        (user as any)?.name ||
        (user as any)?.siswa_profile?.nama_lengkap ||
        (user as any)?.siswa?.nama_lengkap ||
        (user as any)?.nama ||
        'Siswa';
      const rawFirstName = studentFullName.trim().split(' ')[0] || 'Siswa';
      const studentFirstName =
        rawFirstName.length > 1
          ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
          : rawFirstName.toUpperCase();

      const mapelName = examOverview?.mapel || examOverview?.judul_bank || 'Ujian CBT';
      const totalSoalCount = finalResult?.total_soal || soalList.length || examOverview?.total_soal || 0;
      const terjawabCount = finalResult?.jumlah_terjawab ?? Object.keys(answersMap).filter((k) => Boolean(answersMap[k]?.jawaban)).length;
      const percentAnswered = totalSoalCount > 0 ? Math.round((terjawabCount / totalSoalCount) * 100) : 100;
      const durationMins = completedDurationMinutes || (examOverview?.durasi_menit ? Math.round(examOverview.durasi_menit * 0.5) : 35);
      const receiptNo = finalResult?.receipt_number || `ABST-REC-${(studentId || 'SIS').slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const submitDate = finalResult?.submitted_at ? new Date(finalResult.submitted_at) : new Date();
      const formattedSubmitTime = submitDate.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
      const isSusulan = Boolean(
        finalResult?.is_susulan ||
        finalResult?.tipe_peserta === 'SUSULAN' ||
        finalResult?.remedial_audit?.is_susulan
      );
      const isRemedialSession = !isSusulan && Boolean(
        finalResult?.is_remedial || (examOverview?.nama_sesi || '').toLowerCase().includes('remedial')
      );
      const kktpTarget = finalResult?.kktp_threshold || 75;
      const hasScore = finalResult?.nilai_akhir != null;
      const isTuntas = hasScore && finalResult.nilai_akhir >= kktpTarget;

      const handleCopyReceipt = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(receiptNo);
        }
        setCopiedReceipt(true);
        toast.success('Nomor bukti penyerahan berhasil disalin!');
        setTimeout(() => setCopiedReceipt(false), 3000);
      };

      const handlePrint = () => {
        window.print();
      };

      return (
        <div
          className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 md:p-6 print:p-0 print:bg-white print:text-black"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
          }}
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden print:border-none print:shadow-none space-y-6">
            
            {/* Top Accent Gradient Bar */}
            <div className="h-2.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 print:hidden" />

            <div className="p-6 md:p-8 space-y-6">
              {/* Header Hero Apresiasi */}
              <div className="text-center space-y-3">
                <div className="inline-flex relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-100 dark:border-emerald-800 shadow-sm">
                    <CheckCircle2 size={40} className="stroke-[2.5]" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-white dark:ring-slate-900">
                    <Sparkles size={14} />
                  </span>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Kerja Hebat, {studentFirstName}! 🎉
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Lembar jawaban Anda telah diterima secara utuh, terenkripsi, dan tersimpan aman di server sekolah.
                  </p>
                </div>
              </div>

              {/* Status Penyerahan Lembar Jawaban (Sesuai SOP: Nilai Akhir Diolah Guru ke e-Rapor) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-emerald-950/30 border border-indigo-100 dark:border-indigo-900/60 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={18} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Status Penyerahan Lembar Jawaban
                    </span>
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>SUKSES TERSIMPAN</span>
                  </span>
                </div>

                <div className="flex items-start gap-3 pt-0.5">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <BookOpen size={18} />
                  </div>
                  <div className="space-y-1 text-left">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Pengolahan Nilai oleh Guru Pengampu
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Seluruh lembar jawaban Anda telah diterima lengkap dan tersimpan aman di server sekolah. Nilai ujian CBT merupakan nilai mentah yang akan diolah oleh Guru Pengampu bersama komponen penilaian lain (tugas harian, sikap, dan portofolio) pada <strong>Buku Nilai &amp; e-Rapor resmi sekolah</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 4 Kolom: Ringkasan Aktivitas Pengerjaan */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                    <FileText size={13} className="text-indigo-500" />
                    <span>Mata Pelajaran</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={mapelName}>
                    {mapelName}
                  </div>
                  {examOverview?.guru && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {examOverview.guru}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Keterisian Soal</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {terjawabCount} / {totalSoalCount} Butir
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {percentAnswered}% Terjawab
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                    <Clock size={13} className="text-blue-500" />
                    <span>Durasi Selesai</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {durationMins} Menit
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Alokasi {examOverview?.durasi_menit || 90}m
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                    <ShieldAlert size={13} className="text-amber-500" />
                    <span>Integritas Tes</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {violationsCount === 0 ? 'Tertib Penuh' : `${violationsCount} Catatan`}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {violationsCount === 0 ? '🌟 Disiplin 100%' : 'Terekam Forensik'}
                  </div>
                </div>
              </div>

              {/* Tanda Bukti Serah Terima Digital Resmi (Receipt Card) */}
              <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-3 text-left">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                    Tanda Bukti Penyerahan Digital CBT
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Cloud Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Nomor Tanda Terima:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                        {receiptNo}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyReceipt}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                        title="Salin Nomor Bukti"
                      >
                        {copiedReceipt ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Waktu Penyerahan:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mt-0.5 block">
                      {formattedSubmitTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Nama Peserta:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mt-0.5 block truncate">
                      {studentFullName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Sesi Ujian:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mt-0.5 block truncate">
                      {examOverview?.nama_sesi || 'Sesi Ujian CBT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="w-full sm:w-auto flex-1 h-11 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Printer size={16} />
                  <span>Cetak / Simpan Bukti</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => (window.location.href = '/dashboard?tab=cbt')}
                  className="w-full sm:w-auto flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 text-sm font-bold transition-all"
                >
                  <Home size={16} />
                  <span>Kembali ke Dashboard</span>
                </Button>
              </div>

            </div>
          </div>
        </div>
      );
    }

    // ─── RENDER 4: LIVE EXAM ROOM (HIGH-CONCURRENCY DESKTOP & MOBILE) ───────────
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 h-[100dvh] max-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col select-none overflow-hidden"
      >
        {/* Top Bar Pengawasan & Timer dengan Proteksi Kamera Notch / Punch Hole Depan */}
        <header
          className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
            paddingLeft: 'max(env(safe-area-inset-left, 0px), 0.75rem)',
            paddingRight: 'max(env(safe-area-inset-right, 0px), 0.75rem)',
            minHeight: 'calc(3.5rem + max(env(safe-area-inset-top, 0px), 16px))',
          }}
        >
          {/* Sisi Kiri: CBT Badge & Identitas Sesi (Aman dari Kamera Tengah) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Badge variant="default" className="bg-indigo-600 text-white font-mono text-xs font-bold">
              CBT
            </Badge>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px]">
              {examOverview?.nama_sesi || 'UAS Semester'}
            </span>
          </div>

          {/* Area Tengah: Buffer Kosong Aman Kamera Punch Hole HP */}
          <div className="flex-1 min-w-[12px] sm:min-w-[24px]" />

          {/* Sisi Kanan: Status Sinkronisasi, Timer, & Tombol Aksi */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Status Jaringan Offline/Online */}
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 animate-pulse'
              }`}
              title={isOnline ? 'Terhubung ke jaringan' : 'Mode Offline: Jawaban tersimpan lokal di IndexedDB'}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Status Sinkronisasi Server / Cloud SSoT */}
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all border',
                syncStatus === 'synced' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                syncStatus === 'syncing' && 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 animate-pulse',
                syncStatus === 'offline' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                syncStatus === 'error' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              )}
              title={
                syncStatus === 'synced'
                  ? 'Seluruh jawaban tersinkronisasi aman ke server'
                  : syncStatus === 'syncing'
                  ? 'Sedang menyinkronkan jawaban ke server...'
                  : syncStatus === 'offline'
                  ? 'Koneksi offline: Jawaban aman di penyimpanan lokal perangkat'
                  : 'Koneksi server tersendat: Jawaban aman di penyimpanan lokal'
              }
            >
              {syncStatus === 'synced' ? (
                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw size={12} className="animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <CloudOff size={12} className="text-amber-600 dark:text-amber-400" />
              )}
              <span className="hidden lg:inline">
                {syncStatus === 'synced'
                  ? 'Tersimpan'
                  : syncStatus === 'syncing'
                  ? 'Menyimpan...'
                  : 'Buffer Lokal'}
              </span>
            </div>

            {/* Timer Display */}
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl font-mono text-xs sm:text-sm font-bold border transition-colors ${
                sisaWaktuDetik < 300
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-600 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-indigo-300'
              }`}
            >
              <Clock size={13} />
              <span>{formatTimer(sisaWaktuDetik)}</span>
            </div>

            {/* Tombol Kumpulkan Header (Khusus Layar Desktop / Tablet Lebar) */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setSubmitError(null);
                setIsSubmitConfirmOpen(true);
              }}
              className="hidden md:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 shadow-xs shrink-0"
            >
              <Send size={13} className="mr-1.5" />
              <span>Kumpulkan</span>
            </Button>
          </div>
        </header>

        {/* Main Workspace Layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          {/* Kolom Soal Aktif (75%) */}
          <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 space-y-5 pb-24 md:pb-8">
            {currentSoal ? (
              <div className="max-w-3xl mx-auto space-y-5">
                {/* Soal Header dengan Badge Nomor Segar */}
                <div className="flex items-center justify-between gap-2 pb-1">
                  <div className="inline-flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white font-black text-xs sm:text-sm tracking-wide shadow-xs flex items-center gap-1.5">
                      <span>NOMOR {currentIdx + 1}</span>
                    </span>
                    {currentIsRagu && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs animate-in fade-in">
                        <Flag size={11} className="fill-white" />
                        <span>Ragu-Ragu</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shrink-0">
                    Bobot: {currentSoal.bobot} Poin
                  </span>
                </div>

                {/* Konten Pertanyaan & Stimulus Soal dengan Blok Warna Segar (Eye-Comfort & Anti-Jenuh) */}
                <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/70 shadow-sm border-l-4 border-l-indigo-600">
                  <CbtContentRenderer
                    content={currentSoal.konten_pertanyaan}
                    imageUrl={currentSoal.gambar_stimulus_url}
                    imageAlt={`Stimulus Soal Nomor ${currentIdx + 1}`}
                    className="text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed"
                  />
                </div>

                {/* Pilihan Jawaban A-E dengan Blok Warna Menarik */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      PILIHAN JAWABAN:
                    </span>
                    <span className="hidden md:inline-block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      ⌨️ Tekan <strong>A–E</strong> untuk menjawab • <strong>← / →</strong> pindah soal
                    </span>
                  </div>

                  <CbtOptionsRenderer
                    options={currentSoal.opsi_jawaban_json}
                    selectedAnswer={currentAnswer}
                    onSelectAnswer={(kode) => handleSelectAnswer(currentSoal.id, kode)}
                    modeContext="exam"
                    readOnly={false}
                  />
                </div>

                {/* Desktop-Only Bottom Navigation Buttons (Untuk Pengguna Mouse di Komputer) */}
                <div className="hidden md:flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
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
            ) : soalList.length === 0 ? (
              /* Fallback Cerdas: Bebas Infinite Loading */
              <div className="max-w-md mx-auto my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200/80 dark:border-amber-900/60">
                  <AlertTriangle size={28} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Naskah Soal Belum Siap / Kosong
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Butir soal belum terunduh sempurna ke peramban atau paket bank soal belum diterbitkan. Silakan coba muat ulang atau laporkan kepada pengawas ruang.
                  </p>
                </div>
                <div className="flex gap-2.5 justify-center pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleRecoverExamSession}
                    disabled={loadingVerify}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    <RefreshCw size={13} className={cn('mr-1.5', loadingVerify && 'animate-spin')} />
                    <span>{loadingVerify ? 'Memuat...' : 'Muat Ulang Soal'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearSessionStorage();
                      setStep('TOKEN_GATE');
                    }}
                    className="text-xs font-bold"
                  >
                    Kembali ke Depan
                  </Button>
                </div>
              </div>
            ) : (
              /* Recovery jika currentIdx melebihi daftar soal */
              <div className="py-20 text-center space-y-3">
                <Loader size="lg" />
                <p className="text-xs text-slate-400 font-medium">Menyiapkan lembar soal...</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIdx(0)}
                  className="text-xs"
                >
                  Buka Soal Nomor 1
                </Button>
              </div>
            )}
          </main>

          {/* Sidebar Navigasi Nomor Soal (25%) - Desktop Layar Lebar */}
          <aside className="hidden md:flex w-80 bg-slate-50/80 dark:bg-slate-900/80 border-l border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex-col justify-between shrink-0">
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
                          {(() => {
                            if (Array.isArray(soal.opsi_jawaban_json) && ans?.jawaban) {
                              const optIdx = soal.opsi_jawaban_json.findIndex((o: any) => o.kode === ans.jawaban);
                              if (optIdx !== -1) {
                                return String.fromCharCode(65 + optIdx);
                              }
                            }
                            return ans.jawaban;
                          })()}
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
                onClick={() => {
                  setSubmitError(null);
                  setIsSubmitConfirmOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md"
              >
                Kumpulkan Ujian Sekarang
              </Button>
            </div>
          </aside>
        </div>

        {/* ── STICKY MOBILE BOTTOM BAR (SLIM & BEBAS TUMPANG TINDIH TOMBOL NAVIGASI HP) ── */}
        <nav
          aria-label="Navigasi Soal Ponsel"
          className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2.5 pt-2 shrink-0 z-40 shadow-md"
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 10px)',
            paddingLeft: 'max(env(safe-area-inset-left, 0px), 0.5rem)',
            paddingRight: 'max(env(safe-area-inset-right, 0px), 0.5rem)',
          }}
        >
          <div className="flex items-center justify-between gap-1.5 max-w-lg mx-auto">
            {/* Tombol Sebelumnya (Slim) */}
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <ArrowLeft size={13} />
              <span className="text-[11px]">Sebelum</span>
            </button>

            {/* Tombol Ragu-Ragu (Slim) */}
            {currentSoal && (
              <button
                type="button"
                onClick={() => handleToggleRagu(currentSoal.id)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs ${
                  currentIsRagu
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-amber-400/80 text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30'
                }`}
              >
                <Flag size={12} className={currentIsRagu ? 'fill-white' : ''} />
                <span className="text-[11px]">{currentIsRagu ? 'Ragu' : 'Tandai'}</span>
              </button>
            )}

            {/* Tombol Buka Daftar Nomor Soal (Drawer Pop-up Slim Pill) */}
            <button
              type="button"
              onClick={() => setIsMobileQuestionDrawerOpen(true)}
              className="h-8 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-2xs"
              title="Buka Daftar Nomor Soal"
            >
              <LayoutGrid size={12} />
              <span className="text-[11px]">No. {currentIdx + 1}/{soalList.length} ▾</span>
            </button>

            {/* Tombol Selanjutnya ATAU Kumpulkan pada butir terakhir (Slim) */}
            {currentIdx === soalList.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setIsSubmitConfirmOpen(true);
                }}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
              >
                <Send size={12} />
                <span className="text-[11px]">Kumpul</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.min(soalList.length - 1, prev + 1))}
                className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
              >
                <span className="text-[11px]">Lanjut</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </nav>

        {/* ── MOBILE MODAL DAFTAR NOMOR SOAL (AKSES INSTAN TANPA SCROLLING) ── */}
        <Modal
          isOpen={isMobileQuestionDrawerOpen}
          onClose={() => setIsMobileQuestionDrawerOpen(false)}
          title={`Daftar Soal (${soalList.length} Butir)`}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Terjawab: <strong className="text-indigo-600 dark:text-indigo-400">{totalTerjawab}</strong> / {soalList.length}</span>
              <span>Ragu-ragu: <strong className="text-amber-500">{totalRagu}</strong></span>
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
            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {(soalList || []).map((soal, idx) => {
                const ans = answersMap[soal.id];
                const hasAnswer = Boolean(ans?.jawaban);
                const isRagu = Boolean(ans?.isRagu);
                const isCurrent = idx === currentIdx;

                return (
                  <button
                    key={soal.id}
                    type="button"
                    onClick={() => {
                      setCurrentIdx(idx);
                      setIsMobileQuestionDrawerOpen(false);
                    }}
                    className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
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
                        {(() => {
                          if (Array.isArray(soal.opsi_jawaban_json) && ans?.jawaban) {
                            const optIdx = soal.opsi_jawaban_json.findIndex((o: any) => o.kode === ans.jawaban);
                            if (optIdx !== -1) {
                              return String.fromCharCode(65 + optIdx);
                            }
                          }
                          return ans.jawaban;
                        })()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setIsMobileQuestionDrawerOpen(false);
                  setSubmitError(null);
                  setIsSubmitConfirmOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md"
              >
                Kumpulkan Ujian Sekarang
              </Button>
            </div>
          </div>
        </Modal>

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

      {/* Modal Konfirmasi & Pemulihan Submit Final (Resilient & Anti-Data Loss) */}
      <Modal
        isOpen={isSubmitConfirmOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsSubmitConfirmOpen(false);
          }
        }}
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

          {/* Banner Peringatan Gagal Submit (Jika Jaringan Terputus) */}
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>Gagal Mengirim ke Server</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                {submitError}
              </p>
              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1 border-t border-rose-200 dark:border-rose-800/60">
                ✓ Seluruh jawaban Anda ({totalTerjawab} butir) tersimpan aman di IndexedDB perangkat ini. Jangan tutup peramban Anda dan tekan tombol di bawah untuk kirim ulang.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400">
            {sisaWaktuDetik <= 0
              ? 'Waktu pengerjaan ujian telah berakhir. Lembar jawaban Anda harus diserahkan ke server institusi.'
              : 'Apakah Anda yakin ingin menyelesaikan dan mengumpulkan ujian ini? Tindakan ini bersifat final dan tidak dapat dibatalkan.'}
          </p>

          <div className="flex items-center gap-2 pt-2">
            {sisaWaktuDetik > 0 && !submitError && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="flex-1 text-xs"
              >
                Lanjutkan Mengerjakan
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={executeFinalSubmit}
              disabled={isSubmitting}
              className={cn(
                'flex-1 font-bold text-white text-xs',
                submitError ? 'bg-rose-600 hover:bg-rose-700 w-full' : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Mengirimkan...</span>
                </span>
              ) : submitError ? (
                <span className="flex items-center justify-center gap-1.5">
                  <RefreshCw size={13} />
                  <span>Coba Kirim Ulang</span>
                </span>
              ) : (
                'Ya, Kumpulkan'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

return <InfraErrorBoundary>{renderContent()}</InfraErrorBoundary>;
}
