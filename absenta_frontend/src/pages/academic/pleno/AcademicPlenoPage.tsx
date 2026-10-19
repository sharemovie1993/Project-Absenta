import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gavel,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Award,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  FileText,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Search,
  MessageSquare,
  Send,
  Printer,
  Sparkles,
  ShieldAlert,
  ArrowRightCircle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  listPlenoSessions,
  createPlenoSession,
  getPlenoSessionDetail,
  startPlenoSession,
  pausePlenoSession,
  finalizePlenoSession,
  listPlenoAttendance,
  tapPlenoAttendance,
  bulkInvitePlenoAttendance,
  listPlenoRombels,
  calculatePlenoTriage,
  getPlenoRombelCandidates,
  batchApproveGreenCandidates,
  getStudentDossier360,
  decideStudentCandidate,
  listPlenoMinutes,
  createPlenoMinute,
  syncPlenoToTransition,
  PlenoSession,
  PlenoAttendance,
  PlenoRombel,
  PlenoCandidate,
  StudentDossier360,
  PlenoMinute,
  DecisionType,
} from '../../../api/academic/pleno.api';
import { getTahunPelajaranList, TahunPelajaran } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList, Semester } from '../../../api/academic/semester.api';
import { getKelasList, Kelas } from '../../../api/academic/kelas.api';

export const AcademicPlenoPage: React.FC = () => {
  const navigate = useNavigate();

  // Master state
  const [sessions, setSessions] = useState<PlenoSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<PlenoSession | null>(null);
  const [activeTab, setActiveTab] = useState<'navigator' | 'attendance' | 'minutes' | 'transition'>('navigator');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Master References
  const [tahunPelajaranList, setTahunPelajaranList] = useState<TahunPelajaran[]>([]);
  const [semesterList, setSemesterList] = useState<Semester[]>([]);
  const [allKelasList, setAllKelasList] = useState<Kelas[]>([]);

  // Sub data state
  const [attendances, setAttendances] = useState<PlenoAttendance[]>([]);
  const [rombels, setRombels] = useState<PlenoRombel[]>([]);
  const [selectedRombelId, setSelectedRombelId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlenoCandidate[]>([]);
  const [minutes, setMinutes] = useState<PlenoMinute[]>([]);

  // Modals & Dialogs
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [dossierLoading, setDossierLoading] = useState<boolean>(false);
  const [currentDossier, setCurrentDossier] = useState<StudentDossier360 | null>(null);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);

  // Search & Filters
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [triageFilter, setTriageFilter] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED' | 'HANGING' | 'MUTASI'>('ALL');

  // New Session Form State
  const [newTitle, setNewTitle] = useState<string>('Sidang Pleno Kenaikan Kelas & Kelulusan');
  const [newTahunId, setNewTahunId] = useState<string>('');
  const [newSemesterId, setNewSemesterId] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState<string>('08:30');
  const [newLocation, setNewLocation] = useState<string>('Ruang Pertemuan Utama / Aula Sekolah');
  const [newQuorum, setNewQuorum] = useState<number>(0);

  // Decision Form inside Dossier
  const [formDecision, setFormDecision] = useState<DecisionType>('NAIK');
  const [formTargetKelasId, setFormTargetKelasId] = useState<string>('');
  const [formAlasan, setFormAlasan] = useState<string>('');
  const [formPendampingan, setFormPendampingan] = useState<string>('');
  const [formConsensus, setFormConsensus] = useState<boolean>(true);
  const [formVoteYes, setFormVoteYes] = useState<number>(0);
  const [formVoteNo, setFormVoteNo] = useState<number>(0);

  // Form Mutasi & Kasus Administratif
  const [formMutasiSekolah, setFormMutasiSekolah] = useState<string>('');
  const [formMutasiNoSurat, setFormMutasiNoSurat] = useState<string>('');
  const [formMutasiTanggal, setFormMutasiTanggal] = useState<string>(new Date().toISOString().split('T')[0]);

  // Minute Form
  const [newMinuteTopic, setNewMinuteTopic] = useState<string>('');
  const [newMinuteSpeaker, setNewMinuteSpeaker] = useState<string>('');
  const [newMinuteContent, setNewMinuteContent] = useState<string>('');
  const [newMinuteAction, setNewMinuteAction] = useState<string>('');

  // Finalize Form
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [targetTransitionTahunId, setTargetTransitionTahunId] = useState<string>('');

  // 1. Initial Load Reference Data
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [tpRes, semRes, klsRes] = await Promise.all([
          getTahunPelajaranList(),
          getSemesterList(),
          getKelasList(),
        ]);
        if (tpRes?.data) setTahunPelajaranList(tpRes.data);
        if (semRes?.data) setSemesterList(semRes.data);
        if (klsRes?.data) setAllKelasList(klsRes.data);
      } catch (err) {
        console.error('Gagal memuat data referensi:', err);
      }
    };
    fetchReferences();
  }, []);

  // 2. Fetch Sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listPlenoSessions();
      if (res?.data) {
        setSessions(res.data);
        if (res.data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Gagal memuat sesi sidang pleno:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 3. Fetch Detail of Selected Session
  const fetchSessionDetail = useCallback(async (id: string) => {
    try {
      const res = await getPlenoSessionDetail(id);
      if (res?.data) {
        setSessionDetail(res.data);
      }
    } catch (err) {
      console.error('Gagal memuat detail sesi:', err);
    }
  }, []);

  // 4. Fetch Active Tab Data & Rombels
  const fetchRombels = useCallback(async (sessionId: string) => {
    try {
      const rombelRes = await listPlenoRombels(sessionId);
      if (rombelRes?.data) {
        setRombels(rombelRes.data);
        if (rombelRes.data.length > 0) {
          setSelectedRombelId((prev) => prev || rombelRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Gagal memuat rombel:', err);
    }
  }, []);

  const refreshTabData = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    try {
      if (activeTab === 'navigator') {
        await fetchRombels(sessionId);
      } else if (activeTab === 'attendance') {
        const attRes = await listPlenoAttendance(sessionId);
        if (attRes?.data) setAttendances(attRes.data);
      } else if (activeTab === 'minutes') {
        const minRes = await listPlenoMinutes(sessionId);
        if (minRes?.data) setMinutes(minRes.data);
      }
    } catch (err) {
      console.error('Gagal memuat data tab:', err);
    }
  }, [activeTab, fetchRombels]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetail(selectedSessionId);
      fetchRombels(selectedSessionId);
      refreshTabData(selectedSessionId);
    }
  }, [selectedSessionId, activeTab, fetchSessionDetail, fetchRombels, refreshTabData]);

  // 5. Fetch Rombel Candidates when selected rombel changes
  const fetchCandidates = useCallback(async (sessionId: string, rombelId: string) => {
    try {
      setActionLoading(true);
      const res = await getPlenoRombelCandidates(sessionId, rombelId);
      if (res?.data) {
        setCandidates(res.data.candidates || []);
      }
    } catch (err) {
      console.error('Gagal memuat kandidat rombel:', err);
    } finally {
      setActionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId && selectedRombelId) {
      fetchCandidates(selectedSessionId, selectedRombelId);
    }
  }, [selectedSessionId, selectedRombelId, fetchCandidates]);

  // Actions
  const handleStartSession = async () => {
    if (!selectedSessionId) return;
    try {
      setActionLoading(true);
      await startPlenoSession(selectedSessionId);
      await fetchSessionDetail(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Gagal memulai sidang');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseSession = async () => {
    if (!selectedSessionId) return;
    try {
      setActionLoading(true);
      await pausePlenoSession(selectedSessionId);
      await fetchSessionDetail(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Gagal menunda sidang');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateTriage = async () => {
    if (!selectedSessionId) return;
    try {
      setActionLoading(true);
      await calculatePlenoTriage(selectedSessionId);
      await fetchSessionDetail(selectedSessionId);
      await refreshTabData(selectedSessionId);
      if (selectedRombelId) {
        await fetchCandidates(selectedSessionId, selectedRombelId);
      }
      alert('Perhitungan triase otomatis berhasil dijalankan untuk seluruh rombel.');
    } catch (err: any) {
      alert(err.message || 'Gagal menghitung triase');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchApproveGreen = async (rombelId: string) => {
    if (!selectedSessionId) return;
    const ok = window.confirm(
      'Apakah Anda yakin akan mengesahkan AKLAMASI PUTUSAN NAIK untuk seluruh siswa di ZONA HIJAU rombel ini?'
    );
    if (!ok) return;

    try {
      setActionLoading(true);
      const res = await batchApproveGreenCandidates(selectedSessionId, rombelId);
      alert(`Aklamasi sukses: ${res.data.approved_count} siswa zona hijau disahkan NAIK.`);
      await fetchCandidates(selectedSessionId, rombelId);
      await refreshTabData(selectedSessionId);
      await fetchSessionDetail(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Gagal aklamasi zona hijau');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTapAttendance = async (attendanceId: string, currentStatus: boolean) => {
    if (!selectedSessionId) return;
    const target = attendances.find((a) => a.id === attendanceId);
    if (!target) return;

    try {
      await tapPlenoAttendance(selectedSessionId, {
        user_id: target.user_id,
        is_present: !currentStatus,
      });
      setAttendances((prev) =>
        prev.map((a) => (a.id === attendanceId ? { ...a, is_present: !currentStatus } : a))
      );
      await fetchSessionDetail(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui kehadiran');
    }
  };

  const handleBulkInvite = async () => {
    if (!selectedSessionId) return;
    try {
      setActionLoading(true);
      const res = await bulkInvitePlenoAttendance(selectedSessionId);
      alert(`Berhasil menyinkronkan daftar dewan guru. Total ${res.data.total_teachers} guru aktif.`);
      const attRes = await listPlenoAttendance(selectedSessionId);
      if (attRes?.data) setAttendances(attRes.data);
      await fetchSessionDetail(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Gagal mengundang dewan guru');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDossier = async (siswaId: string) => {
    if (!selectedSessionId) return;
    try {
      setSelectedSiswaId(siswaId);
      setDossierLoading(true);
      setShowDossierModal(true);
      const res = await getStudentDossier360(selectedSessionId, siswaId);
      if (res?.data) {
        setCurrentDossier(res.data);
        if (res.data.decision) {
          setFormDecision(res.data.decision.keputusan_akhir);
          setFormTargetKelasId(res.data.decision.target_kelas_id || '');
          setFormAlasan(res.data.decision.alasan_keputusan || '');
          setFormPendampingan(res.data.decision.catatan_pendampingan || '');
          setFormMutasiSekolah((res.data.decision as any)?.mutasi_sekolah_tujuan || '');
          setFormMutasiNoSurat((res.data.decision as any)?.mutasi_no_surat || '');
          setFormMutasiTanggal(
            (res.data.decision as any)?.mutasi_tanggal
              ? new Date((res.data.decision as any).mutasi_tanggal).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0]
          );
          setFormConsensus(res.data.decision.voted_by_consensus);
          setFormVoteYes(res.data.decision.voting_yes || 0);
          setFormVoteNo(res.data.decision.voting_no || 0);
        } else {
          setFormDecision(res.data.triage.rekomendasi_awal);
          setFormTargetKelasId('');
          setFormAlasan(res.data.triage.reasons.join(', '));
          setFormPendampingan('');
          setFormMutasiSekolah('');
          setFormMutasiNoSurat('');
          setFormMutasiTanggal(new Date().toISOString().split('T')[0]);
          setFormConsensus(true);
          setFormVoteYes(0);
          setFormVoteNo(0);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memuat dossier siswa');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!selectedSessionId || !selectedSiswaId) return;
    try {
      setActionLoading(true);
      const isMutasiType = ['MUTASI', 'KELUAR', 'MENINGGAL'].includes(formDecision);
      await decideStudentCandidate(selectedSessionId, selectedSiswaId, {
        keputusan_akhir: formDecision,
        target_kelas_id: isMutasiType ? undefined : formTargetKelasId || undefined,
        alasan_keputusan: formAlasan,
        catatan_pendampingan: formPendampingan,
        mutasi_sekolah_tujuan: isMutasiType ? formMutasiSekolah : undefined,
        mutasi_no_surat: isMutasiType ? formMutasiNoSurat : undefined,
        mutasi_tanggal: isMutasiType ? formMutasiTanggal : undefined,
        voted_by_consensus: formConsensus,
        voting_yes: formConsensus ? undefined : Number(formVoteYes),
        voting_no: formConsensus ? undefined : Number(formVoteNo),
      });

      alert('Putusan sidang pleno untuk siswa berhasil disimpan.');
      setShowDossierModal(false);
      if (selectedRombelId) {
        await fetchCandidates(selectedSessionId, selectedRombelId);
      }
      await fetchSessionDetail(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan putusan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMinute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !newMinuteTopic || !newMinuteContent) return;
    try {
      setActionLoading(true);
      await createPlenoMinute(selectedSessionId, {
        topic: newMinuteTopic,
        speaker_name: newMinuteSpeaker,
        content: newMinuteContent,
        action_item: newMinuteAction,
        rombel_id: selectedRombelId || undefined,
      });

      setNewMinuteTopic('');
      setNewMinuteSpeaker('');
      setNewMinuteContent('');
      setNewMinuteAction('');

      const minRes = await listPlenoMinutes(selectedSessionId);
      if (minRes?.data) setMinutes(minRes.data);
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat risalah');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTahunId || !newSemesterId || !newTitle) {
      alert('Mohon lengkapi data form');
      return;
    }
    try {
      setActionLoading(true);
      const res = await createPlenoSession({
        title: newTitle,
        tahun_pelajaran_id: newTahunId,
        semester_id: newSemesterId,
        date: newDate,
        start_time: newStartTime,
        location: newLocation,
        quorum_target: newQuorum > 0 ? Number(newQuorum) : undefined,
      });
      setShowCreateModal(false);
      alert('Sesi sidang pleno baru berhasil dibuat!');
      await fetchSessions();
      if (res?.data?.id) {
        setSelectedSessionId(res.data.id);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal membuat sesi sidang pleno');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeSession = async () => {
    if (!selectedSessionId) return;
    const ok = window.confirm(
      'PERINGATAN RESMI: Anda akan memfinalisasi Sidang Pleno ini. Seluruh putusan akan dikunci dan Nomor Berita Acara Pleno (BAP) resmi akan diterbitkan. Lanjutkan?'
    );
    if (!ok) return;

    try {
      setActionLoading(true);
      const res = await finalizePlenoSession(selectedSessionId, closingNotes);
      setShowFinalizeModal(false);
      alert(`Sidang Pleno telah resmi DIFINALISASI!\nNomor BAP Resmi: ${res.data.nomor_bap}`);
      await fetchSessionDetail(selectedSessionId);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Gagal memfinalisasi sidang pleno');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncToTransition = async () => {
    if (!selectedSessionId || !targetTransitionTahunId) {
      alert('Pilih Tahun Pelajaran tujuan terlebih dahulu.');
      return;
    }
    const ok = window.confirm(
      'Apakah Anda yakin ingin mengeksekusi sinkronisasi transisi kenaikan kelas ke database siswa?'
    );
    if (!ok) return;

    try {
      setActionLoading(true);
      const res = await syncPlenoToTransition(selectedSessionId, targetTransitionTahunId);
      alert(
        `Sinkronisasi berhasil dieksekusi!\n` +
          `Siswa Naik Kelas: ${res.data.promoted_count}\n` +
          `Siswa Naik Bersyarat: ${res.data.conditional_count}\n` +
          `Siswa Tinggal Kelas: ${res.data.retained_count}`
      );
    } catch (err: any) {
      alert(err.message || 'Gagal menyinkronkan data transisi');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const nama = c.Siswa?.nama_lengkap || c.Siswa?.nama_siswa || '';
      const nis = c.Siswa?.nis || '';
      const matchSearch =
        nama.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        nis.toLowerCase().includes(candidateSearch.toLowerCase());

      let matchTriage = true;
      if (triageFilter === 'ALL') {
        matchTriage = true;
      } else if (triageFilter === 'HANGING') {
        matchTriage = Boolean(c.is_hanging_status);
      } else if (triageFilter === 'MUTASI') {
        matchTriage = ['MUTASI', 'KELUAR', 'MENINGGAL'].includes(c.keputusan_akhir);
      } else {
        matchTriage = c.triage_zone === triageFilter;
      }

      return matchSearch && matchTriage;
    });
  }, [candidates, candidateSearch, triageFilter]);

  const hangingCandidatesCount = useMemo(() => {
    return candidates.filter((c) => c.is_hanging_status).length;
  }, [candidates]);

  // Selected Rombel
  const activeRombel = useMemo(() => {
    return rombels.find((r) => r.id === selectedRombelId);
  }, [rombels, selectedRombelId]);

  // Memoized Triage Metrics with sessionDetail fallback
  const totalGreen = useMemo(() => {
    const sum = rombels.reduce((acc, r) => acc + (r.green_count || 0), 0);
    if (sum > 0) return sum;
    const item = sessionDetail?.triage_breakdown?.find((t: any) => t.triage_zone === 'GREEN');
    return item?._count || 0;
  }, [rombels, sessionDetail]);

  const totalYellow = useMemo(() => {
    const sum = rombels.reduce((acc, r) => acc + (r.yellow_count || 0), 0);
    if (sum > 0) return sum;
    const item = sessionDetail?.triage_breakdown?.find((t: any) => t.triage_zone === 'YELLOW');
    return item?._count || 0;
  }, [rombels, sessionDetail]);

  const totalRed = useMemo(() => {
    const sum = rombels.reduce((acc, r) => acc + (r.red_count || 0), 0);
    if (sum > 0) return sum;
    const item = sessionDetail?.triage_breakdown?.find((t: any) => t.triage_zone === 'RED');
    return item?._count || 0;
  }, [rombels, sessionDetail]);

  if (loading && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-gray-600 font-medium">Memuat Sidang Pleno Kenaikan Kelas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-6">
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & EXECUTIVE ACTION BAR                             */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Gavel className="w-7 h-7" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                  {sessionDetail?.title || 'Rapat Pleno Dewan Guru Kenaikan Kelas'}
                  {sessionDetail && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                        sessionDetail.status === 'FINALIZED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sessionDetail.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : sessionDetail.status === 'PRE_TRIAGE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sessionDetail.status === 'FINALIZED'
                        ? 'Resmi Final'
                        : sessionDetail.status === 'IN_PROGRESS'
                        ? 'Sidang Berlangsung'
                        : sessionDetail.status === 'PRE_TRIAGE'
                        ? 'Pra-Triase'
                        : 'Draft'}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-slate-500">
                  Sidang Resmi Evaluasi Ketuntasan & Keputusan Kenaikan Kelas Berlandaskan Regulasi Kemendikbudristek
                </p>
              </div>
            </div>

            {sessionDetail && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {new Date(sessionDetail.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {sessionDetail.start_time} WIB
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {sessionDetail.location}
                </span>
                {sessionDetail.nomor_bap && (
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Award className="w-3.5 h-3.5" />
                    No. BAP: {sessionDetail.nomor_bap}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Session Switcher & Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.status})
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              Sesi Baru
            </button>

            {sessionDetail && sessionDetail.status !== 'FINALIZED' && (
              <>
                {sessionDetail.status !== 'IN_PROGRESS' ? (
                  <button
                    onClick={handleStartSession}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Buka Sidang
                  </button>
                ) : (
                  <button
                    onClick={handlePauseSession}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Skors Sidang
                  </button>
                )}

                <button
                  onClick={handleCalculateTriage}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  title="Hitung Ulang Triase Otomatis"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  Hitung Triase
                </button>

                <button
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Finalisasi BAP
                </button>
              </>
            )}

            {sessionDetail?.status === 'FINALIZED' && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak BAP
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. QUORUM & TRIAGE SUMMARY INDICATORS                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {sessionDetail && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
            {/* Quorum Progress */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Status Kuorum Dewan Guru
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sessionDetail.is_quorum_reached
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {sessionDetail.is_quorum_reached ? 'KUORUM TERCAPAI' : 'BELUM KUORUM'}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>
                    {sessionDetail.present_count || 0} Hadir
                  </span>
                  <span className="text-slate-500 font-normal">
                    Target: {sessionDetail.quorum_target} dari {sessionDetail.total_eligible_voters} Guru
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      sessionDetail.is_quorum_reached ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((sessionDetail.present_count || 0) / (sessionDetail.quorum_target || 1)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Zona Hijau Metric */}
            <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 flex items-center gap-3">
              <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-wide">
                  🟢 Zona Hijau (Tuntas Prima)
                </p>
                <h3 className="text-xl font-bold text-emerald-950">
                  {totalGreen} Siswa
                </h3>
                <p className="text-[10px] text-emerald-700">Layak aklamasi mufakat pleno</p>
              </div>
            </div>

            {/* Zona Kuning Metric */}
            <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200 flex items-center gap-3">
              <span className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wide">
                  🟡 Zona Kuning (Bersyarat)
                </p>
                <h3 className="text-xl font-bold text-amber-950">
                  {totalYellow} Siswa
                </h3>
                <p className="text-[10px] text-amber-700">Perlu klausul catatan pendampingan</p>
              </div>
            </div>

            {/* Zona Merah Metric */}
            <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-200 flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
                <XCircle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-rose-800 uppercase tracking-wide">
                  🔴 Zona Merah (Kasus Khusus)
                </p>
                <h3 className="text-xl font-bold text-rose-950">
                  {totalRed} Siswa
                </h3>
                <p className="text-[10px] text-rose-700">Musyawarah komprehensif / voting</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('navigator')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'navigator'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Navigator Rombel & Triase Siswa
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Presensi Dewan Guru ({attendances.filter((a) => a.is_present).length}/{attendances.length})
          </button>
          <button
            onClick={() => setActiveTab('minutes')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'minutes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Risalah & Notulensi ({minutes.length})
          </button>
          <button
            onClick={() => setActiveTab('transition')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'transition'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightCircle className="w-4 h-4" />
            Sinkronisasi Transisi Kenaikan Kelas
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 3. TAB CONTENT: NAVIGATOR ROMBEL & TRIASE SISWA                 */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'navigator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Rombel Selector Cards */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Daftar Rombongan Belajar ({rombels.length})</span>
                <span className="text-xs text-slate-400 font-normal">Pilih untuk sidang</span>
              </h2>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {rombels.map((r) => {
                  const isSelected = r.id === selectedRombelId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRombelId(r.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{r.Kelas?.nama_kelas}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Tingkat {r.Kelas?.tingkat}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        Wali Kelas:{' '}
                        {r.wali_kelas ? (
                          <span className="text-slate-700 font-medium">{r.wali_kelas.nama_lengkap}</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditugaskan</span>
                        )}
                      </p>

                      {/* Triage Mini Badges */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-0.5">
                            🟢 {r.green_count}
                          </span>
                          <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-0.5">
                            🟡 {r.yellow_count}
                          </span>
                          <span className="text-rose-700 font-semibold text-[11px] flex items-center gap-0.5">
                            🔴 {r.red_count}
                          </span>
                        </div>

                        {sessionDetail?.status !== 'FINALIZED' && r.green_count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBatchApproveGreen(r.id);
                            }}
                            className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition flex items-center gap-1"
                            title="Aklamasi Pengesahan Masal untuk Zona Hijau"
                          >
                            <Sparkles className="w-3 h-3" />
                            Aklamasi Hijau
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Candidate Student List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              {/* Header and Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Kandidat Evaluasi: {activeRombel?.Kelas?.nama_kelas || 'Pilih Rombel'}
                    <span className="text-xs font-normal text-slate-500">
                      ({filteredCandidates.length} dari {candidates.length} siswa)
                    </span>
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari NIS / Nama Siswa..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-44 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Triage Filter Buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto">
                    {(
                      [
                        { id: 'ALL', label: 'Semua' },
                        { id: 'GREEN', label: '🟢 Hijau' },
                        { id: 'YELLOW', label: '🟡 Kuning' },
                        { id: 'RED', label: '🔴 Merah' },
                        { id: 'HANGING', label: `⚠️ Menggantung (${hangingCandidatesCount})` },
                        { id: 'MUTASI', label: '📤 Mutasi/DO' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTriageFilter(t.id as any)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                          triageFilter === t.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alert: Siswa Indikasi Menggantung */}
              {hangingCandidatesCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950">Perhatian Evaluasi Wali Kelas: </span>
                      <span className="text-amber-800">
                        Terdeteksi <strong>{hangingCandidatesCount} siswa</strong> dengan indikasi status menggantung
                        (alpa tinggi / tidak aktif). Silakan periksa dan usulkan status Mutasi Keluar atau Drop Out.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setTriageFilter(triageFilter === 'HANGING' ? 'ALL' : 'HANGING')}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 text-[11px] transition shadow-sm"
                  >
                    {triageFilter === 'HANGING' ? 'Tampilkan Semua Siswa' : 'Filter Siswa Menggantung'}
                  </button>
                </div>
              )}

              {/* Candidate Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Siswa</th>
                      <th className="py-2.5 px-3">Zona Triase</th>
                      <th className="py-2.5 px-3">Indikator Masalah</th>
                      <th className="py-2.5 px-3">Putusan Akhir</th>
                      <th className="py-2.5 px-3 text-right">Aksi Sidang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((c) => {
                      const isMutasiType = ['MUTASI', 'KELUAR', 'MENINGGAL'].includes(c.keputusan_akhir);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {c.Siswa?.nama_lengkap || c.Siswa?.nama_siswa || 'Siswa'}
                              </span>
                              {c.is_hanging_status && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                  ⚠️ Indikasi Menggantung
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              NIS: {c.Siswa?.nis || '-'} • {c.Siswa?.jenis_kelamin || ''}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                c.triage_zone === 'GREEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.triage_zone === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {c.triage_zone === 'GREEN'
                                ? '🟢 HIJAU'
                                : c.triage_zone === 'YELLOW'
                                ? '🟡 KUNING'
                                : '🔴 MERAH'}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-600">
                            {c.triage_reasons || <span className="text-slate-400">Tidak ada kendala</span>}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-semibold text-xs px-2.5 py-1 rounded-lg ${
                                c.keputusan_akhir === 'NAIK'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : c.keputusan_akhir === 'NAIK_BERSYARAT'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : c.keputusan_akhir === 'TINGGAL_KELAS'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : c.keputusan_akhir === 'MUTASI'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : c.keputusan_akhir === 'KELUAR'
                                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                  : 'bg-slate-200 text-slate-800 border border-slate-300'
                              }`}
                            >
                              {c.keputusan_akhir === 'NAIK'
                                ? 'Naik Tingkat'
                                : c.keputusan_akhir === 'NAIK_BERSYARAT'
                                ? 'Naik Bersyarat'
                                : c.keputusan_akhir === 'TINGGAL_KELAS'
                                ? 'Tinggal Kelas'
                                : c.keputusan_akhir === 'MUTASI'
                                ? 'Mutasi Keluar'
                                : c.keputusan_akhir === 'KELUAR'
                                ? 'Keluar / D.O'
                                : 'Meninggal Dunia'}
                            </span>
                            {c.catatan_pendampingan && (
                              <div className="text-[10px] text-amber-700 mt-1 truncate max-w-[200px]">
                                Pendampingan: {c.catatan_pendampingan}
                              </div>
                            )}
                            {isMutasiType && (c as any).mutasi_sekolah_tujuan && (
                              <div className="text-[10px] text-purple-700 mt-1 truncate max-w-[200px]">
                                Tujuan: {(c as any).mutasi_sekolah_tujuan}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleOpenDossier(c.siswa_id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Dossier 360°
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Belum ada kandidat di rombel ini atau filter tidak cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 4. TAB CONTENT: PRESENSI KUORUM DEWAN GURU                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Daftar Hadir Dewan Guru & Kuorum Sidang
              </h3>
              <p className="text-xs text-slate-500">
                Memastikan keabsahan hukum pengambilan keputusan berdasarkan ketentuan kuorum 2/3 peserta
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkInvite}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sinkronkan Dewan Guru
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Guru / Pegawai</th>
                  <th className="py-2.5 px-3">NIP / Identitas</th>
                  <th className="py-2.5 px-3">Peran Sidang</th>
                  <th className="py-2.5 px-3">Waktu Hadir</th>
                  <th className="py-2.5 px-3 text-center">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{a.User?.nama_lengkap}</div>
                      <div className="text-[11px] text-slate-500">{a.User?.email}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{a.User?.nip || '-'}</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded uppercase">
                        {a.role_in_meeting}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {a.attended_at ? new Date(a.attended_at).toLocaleTimeString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleTapAttendance(a.id, a.is_present)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                          a.is_present
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {a.is_present ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Hadir (Tercatat)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            Belum Hadir
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 5. TAB CONTENT: RISALAH & NOTULENSI SIDANG                       */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'minutes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Catat Risalah */}
          <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Input Notulensi & Dinamika Sidang
            </h3>
            <form onSubmit={handleAddMinute} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Topik / Agenda Bahasan</label>
                <input
                  type="text"
                  placeholder="Misal: Pembahasan Siswa Rawan Kelas X RPL 1"
                  value={newMinuteTopic}
                  onChange={(e) => setNewMinuteTopic(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Pembicara / Pengusul</label>
                <input
                  type="text"
                  placeholder="Misal: Dra. Hj. Siti (Wali Kelas) / Guru BK"
                  value={newMinuteSpeaker}
                  onChange={(e) => setNewMinuteSpeaker(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Isi Masukan / Pendapat Sidang</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan rangkuman argumen, tanggapan, atau pertimbangan dewan guru..."
                  value={newMinuteContent}
                  onChange={(e) => setNewMinuteContent(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tindak Lanjut / Action Item (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Penugasan proyek remedial di semester ganjil berikutnya"
                  value={newMinuteAction}
                  onChange={(e) => setNewMinuteAction(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
              >
                <Send className="w-3.5 h-3.5" />
                Simpan Risalah Sidang
              </button>
            </form>
          </div>

          {/* Right Column: Timeline Risalah */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Kronologi Risalah Sidang Pleno</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {minutes.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">{m.topic}</span>
                    <span className="text-slate-400">{new Date(m.created_at).toLocaleTimeString('id-ID')} WIB</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Pembicara: <span className="text-slate-800">{m.speaker_name || 'Dewan Guru'}</span> ({m.speaker_role})
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-100">
                    {m.content}
                  </p>
                  {m.action_item && (
                    <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Tindak Lanjut: {m.action_item}
                    </div>
                  )}
                </div>
              ))}
              {minutes.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-8">Belum ada risalah sidang tercatat.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 6. TAB CONTENT: SINKRONISASI TRANSISI                           */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 6. TAB CONTENT: SINKRONISASI TRANSISI & KENAIKAN KELAS          */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transition' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Jembatan Integrasi: Sidang Pleno &amp; Kenaikan Kelas
                  </h3>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Sidang Pleno Dewan Guru adalah penetap keputusan yuridis akhir mengenai ketuntasan peserta didik. Hasil
                  putusan sidang ini menjadi landasan primer bagi modul <strong>Kenaikan Kelas (Rollover Akademik)</strong> untuk
                  memindahkan rombel siswa ke Tahun Ajaran Baru.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/academic/transition')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Buka Wizard Kenaikan Kelas
                </button>
              </div>
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa Terdaftar</p>
                <p className="text-xl font-black text-slate-900 mt-1">{totalGreen + totalYellow + totalRed} Siswa</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{rombels.length} Rombongan Belajar</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">🟢 Siap Naik Tingkat</p>
                <p className="text-xl font-black text-emerald-950 mt-1">{totalGreen} Siswa</p>
                <p className="text-[10px] text-emerald-700 mt-0.5">Memenuhi seluruh KKTP</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">🟡 Naik Bersyarat</p>
                <p className="text-xl font-black text-amber-950 mt-1">{totalYellow} Siswa</p>
                <p className="text-[10px] text-amber-700 mt-0.5">Dengan klausul pendampingan</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-200">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">🔴 Tinggal Kelas</p>
                <p className="text-xl font-black text-rose-950 mt-1">{totalRed} Siswa</p>
                <p className="text-[10px] text-rose-700 mt-0.5">Tetap di tingkat rombel lama</p>
              </div>
            </div>
          </div>

          {/* Action Execution Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ArrowRightCircle className="w-4 h-4 text-indigo-600" />
              Eksekusi Transisi Langsung dari Sidang Pleno
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Pilih Tahun Pelajaran Baru untuk mengeksekusi penempatan siswa secara langsung berdasarkan putusan sidang pleno saat ini.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Tahun Pelajaran Tujuan (Tahun Baru)
                </label>
                <select
                  value={targetTransitionTahunId}
                  onChange={(e) => setTargetTransitionTahunId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- Pilih Tahun Pelajaran Baru --</option>
                  {tahunPelajaranList.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.tahun}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Validasi Legalitas Sidang Pleno</h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    {sessionDetail?.status === 'FINALIZED'
                      ? `Sidang Resmi Difinalisasi (No. BAP: ${sessionDetail.nomor_bap || 'Tersedia'}). Transisi aman dieksekusi.`
                      : 'Peringatan: Sidang belum difinalisasi. Disarankan finalisasi sebelum sinkronisasi permanen.'}
                  </p>
                </div>

                <button
                  onClick={handleSyncToTransition}
                  disabled={actionLoading || !targetTransitionTahunId}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl shadow-sm transition shrink-0"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Eksekusi Transisi Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* Rombel Mapping Preview Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Pratinjau Pemetaan Rombel Kenaikan Kelas ({rombels.length} Rombel)
                </h4>
                <p className="text-xs text-slate-500">
                  Proyeksi kenaikan tingkat siswa dari rombel asal ke jenjang tingkat berikutnya pada Tahun Ajaran Baru.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Rombel Asal</th>
                    <th className="py-2.5 px-3">Tingkat</th>
                    <th className="py-2.5 px-3">Wali Kelas</th>
                    <th className="py-2.5 px-3">Total Siswa</th>
                    <th className="py-2.5 px-3">Komposisi Putusan</th>
                    <th className="py-2.5 px-3">Rute Kenaikan Prediksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rombels.map((r) => {
                    const tingkat = Number(r.Kelas?.tingkat || 10);
                    const isGraduating = tingkat >= 12;
                    const nextTingkat = isGraduating ? 'LULUS' : `Tingkat ${tingkat + 1}`;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {r.Kelas?.nama_kelas}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Tingkat {tingkat}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.wali_kelas ? (
                            <span className="font-medium text-slate-800">{r.wali_kelas.nama_lengkap}</span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ditugaskan</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {r.total_students} Siswa
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold">
                            <span className="text-emerald-700">🟢 {r.green_count} Naik</span>
                            <span className="text-amber-700">🟡 {r.yellow_count} Syarat</span>
                            <span className="text-rose-700">🔴 {r.red_count} Tinggal</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              isGraduating
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <ArrowRight className="w-3 h-3" />
                            {isGraduating ? 'Kelulusan (Alumni)' : `Promosi ke ${nextTingkat}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 7. MODAL DOSSIER 360° SISWA & FORM PUTUSAN                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                  <Award className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">Dossier Komprehensif 360° Siswa</h3>
                  <p className="text-xs text-slate-300">
                    Instrumen Evaluasi Akademik, Disiplin, dan Rekomendasi Kenaikan Tingkat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {dossierLoading || !currentDossier ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500">Menghimpun dossier 360° dari 4 pilar data sekolah...</p>
                </div>
              ) : (
                <>
                  {/* Student Identity Card */}
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                      {(currentDossier.siswa.nama_lengkap || currentDossier.siswa.nama_siswa || 'S').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">
                          {currentDossier.siswa.nama_lengkap || currentDossier.siswa.nama_siswa || 'Siswa'}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            currentDossier.triage.zone === 'GREEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : currentDossier.triage.zone === 'YELLOW'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          ZONA {currentDossier.triage.zone}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        NIS: {currentDossier.siswa.nis} • Kelas: {currentDossier.siswa.kelas_nama || '-'} • Gender:{' '}
                        {currentDossier.siswa.jenis_kelamin}
                      </p>
                      {currentDossier.triage.reasons.length > 0 && (
                        <p className="text-xs text-rose-700 font-medium mt-1">
                          Catatan Triase: {currentDossier.triage.reasons.join('; ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 4 Pillar Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pilar 1: Akademik & Nilai */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        Pilar 1: Prestasi Akademik & KKTP
                      </h5>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 py-1 border-b border-slate-200">
                        <span>Rata-rata Nilai: {currentDossier.akademik.rata_rata_nilai}</span>
                        <span>
                          {currentDossier.akademik.mapel_tuntas} Tuntas / {currentDossier.akademik.mapel_belum_tuntas} Belum
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 text-xs pr-1">
                        {currentDossier.akademik.mata_pelajaran.map((m) => (
                          <div key={m.mapel_id} className="flex justify-between items-center text-[11px] py-0.5">
                            <span className="truncate max-w-[180px] text-slate-700">{m.nama_mapel}</span>
                            <span
                              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                                m.is_tuntas ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                              }`}
                            >
                              {m.nilai_akhir} (KKTP {m.kkm})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pilar 2: Kehadiran */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Pilar 2: Presensi & Kedisiplinan
                      </h5>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 py-1 border-b border-slate-200">
                        <span>Kehadiran: {currentDossier.kehadiran.persentase_kehadiran}%</span>
                        <span>Total: {currentDossier.kehadiran.total_hari_efektif} Hari</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Hadir</span>
                          <span className="font-bold text-emerald-700">{currentDossier.kehadiran.hadir}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Sakit</span>
                          <span className="font-bold text-blue-700">{currentDossier.kehadiran.sakit}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Izin</span>
                          <span className="font-bold text-amber-700">{currentDossier.kehadiran.izin}</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">Alpa</span>
                          <span className="font-bold text-rose-700">{currentDossier.kehadiran.alpa}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pilar 3: Kesiswaan & Pelanggaran */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-indigo-600" />
                        Pilar 3: Tata Tertib & Pelanggaran
                      </h5>
                      <div className="text-xs font-semibold text-slate-700 py-1 border-b border-slate-200 flex justify-between">
                        <span>Total Poin: {currentDossier.kesiswaan.total_poin_pelanggaran} Poin</span>
                        <span className="text-slate-500">{currentDossier.kesiswaan.pelanggaran.length} Catatan</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                        {currentDossier.kesiswaan.pelanggaran.map((p, idx) => (
                          <div key={idx} className="text-[11px] text-slate-600 border-b border-slate-100 pb-1">
                            <span className="font-semibold text-rose-700">+{p.poin}</span> {p.kategori}: {p.deskripsi}
                          </div>
                        ))}
                        {currentDossier.kesiswaan.pelanggaran.length === 0 && (
                          <p className="text-[11px] text-slate-400">Tidak ada catatan pelanggaran.</p>
                        )}
                      </div>
                    </div>

                    {/* Pilar 4: Bimbingan Konseling */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Pilar 4: Rekam Bimbingan Konseling (BK)
                      </h5>
                      <div className="text-xs font-semibold text-slate-700 py-1 border-b border-slate-200 flex justify-between">
                        <span>Total Kasus: {currentDossier.bk.total_kasus}</span>
                        <span>Home Visit: {currentDossier.bk.home_visit.length} Kali</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                        {currentDossier.bk.kasus.map((k, idx) => (
                          <div key={idx} className="text-[11px] text-slate-600 border-b border-slate-100 pb-1">
                            <span className="font-semibold text-amber-700">[{k.status}]</span> {k.judul}
                          </div>
                        ))}
                        {currentDossier.bk.kasus.length === 0 && (
                          <p className="text-[11px] text-slate-400">Tidak ada rekam kasus BK aktif.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Putusan Sidang */}
                  <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-200 space-y-4">
                    <h5 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Gavel className="w-4 h-4 text-indigo-600" />
                      Formulir Amar Putusan Sidang Pleno
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Status Amar Keputusan
                        </label>
                        <select
                          value={formDecision}
                          onChange={(e) => setFormDecision(e.target.value as DecisionType)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="NAIK">NAIK KELAS (Tuntas Prima)</option>
                          <option value="NAIK_BERSYARAT">NAIK KELAS BERSYARAT (Dengan Pendampingan)</option>
                          <option value="TINGGAL_KELAS">TINGGAL KELAS (Intervensi Ekstrem)</option>
                          <option value="MUTASI">MUTASI KELUAR (Pindah Sekolah)</option>
                          <option value="KELUAR">DROP OUT / KELUAR (Mengundurkan Diri)</option>
                          <option value="MENINGGAL">MENINGGAL DUNIA</option>
                        </select>
                      </div>

                      {!['MUTASI', 'KELUAR', 'MENINGGAL'].includes(formDecision) ? (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Target Kelas Lanjutan (Jika Naik)
                          </label>
                          <select
                            value={formTargetKelasId}
                            onChange={(e) => setFormTargetKelasId(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">-- Tetapkan Nanti / Otomatis --</option>
                            {allKelasList.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.nama_kelas} (Tingkat {k.tingkat})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-purple-50/70 rounded-lg border border-purple-200 flex flex-col justify-center">
                          <span className="text-[11px] font-bold text-purple-900">
                            ⚙️ Dampak Kenaikan Kelas & Rollover
                          </span>
                          <span className="text-[10px] text-purple-700">
                            Siswa akan dinonaktifkan dari rombel baru. Kapasitas & daya tampung kelas baru akan disesuaikan otomatis tanpa beban input manual TU.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Form Dinamis: Mutasi / Keluar / Meninggal */}
                    {['MUTASI', 'KELUAR', 'MENINGGAL'].includes(formDecision) && (
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                          <AlertTriangle className="w-4 h-4 text-purple-600" />
                          Detail Administrasi Status Keluar / Mutasi
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              {formDecision === 'MUTASI'
                                ? 'Sekolah Tujuan'
                                : formDecision === 'KELUAR'
                                ? 'Alasan Keluar / D.O'
                                : 'Keterangan'}
                            </label>
                            <input
                              type="text"
                              placeholder={
                                formDecision === 'MUTASI'
                                  ? 'Misal: SMAN 1 Bandung'
                                  : formDecision === 'KELUAR'
                                  ? 'Misal: Bekerja / Mengundurkan Diri'
                                  : 'Keterangan Wafat'
                              }
                              value={formMutasiSekolah}
                              onChange={(e) => setFormMutasiSekolah(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Nomor Surat Keterangan / BAP
                            </label>
                            <input
                              type="text"
                              placeholder="Misal: 421/045/Disdik/2026"
                              value={formMutasiNoSurat}
                              onChange={(e) => setFormMutasiNoSurat(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Tanggal Efektif Status
                            </label>
                            <input
                              type="date"
                              value={formMutasiTanggal}
                              onChange={(e) => setFormMutasiTanggal(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {!['MUTASI', 'KELUAR', 'MENINGGAL'].includes(formDecision) && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Catatan Pendampingan Khusus (Kurikulum Merdeka)
                        </label>
                        <input
                          type="text"
                          placeholder="Misal: Penuntasan materi Aljabar & Konseling Kehadiran bersama Guru Kelas XI"
                          value={formPendampingan}
                          onChange={(e) => setFormPendampingan(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Pertimbangan Resmi Sidang (Alasan Hukum)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Tuliskan pertimbangan dewan guru..."
                        value={formAlasan}
                        onChange={(e) => setFormAlasan(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Mekanisme Putusan */}
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formConsensus}
                          onChange={(e) => setFormConsensus(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Aklamasi Mufakat Dewan Guru</span>
                      </label>

                      {!formConsensus && (
                        <div className="flex items-center gap-2">
                          <span>Voting Setuju:</span>
                          <input
                            type="number"
                            value={formVoteYes}
                            onChange={(e) => setFormVoteYes(Number(e.target.value))}
                            className="w-16 p-1 text-xs border rounded bg-white"
                          />
                          <span>Voting Tolak:</span>
                          <input
                            type="number"
                            value={formVoteNo}
                            onChange={(e) => setFormVoteNo(Number(e.target.value))}
                            className="w-16 p-1 text-xs border rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
              >
                Tutup
              </button>
              <button
                onClick={handleSaveDecision}
                disabled={actionLoading || dossierLoading}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow transition ${
                  ['MUTASI', 'KELUAR', 'MENINGGAL'].includes(formDecision)
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {['MUTASI', 'KELUAR', 'MENINGGAL'].includes(formDecision)
                  ? '🔨 Sahkan Status Administratif (Putihkan Siswa)'
                  : 'Simpan Putusan Pleno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 8. MODAL BUAT SESI BARU                                         */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-indigo-600" />
              Buat Sesi Sidang Pleno Baru
            </h3>
            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Sidang Pleno</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tahun Pelajaran</label>
                  <select
                    value={newTahunId}
                    onChange={(e) => setNewTahunId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Pilih TP --</option>
                    {tahunPelajaranList.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.tahun}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Semester</label>
                  <select
                    value={newSemesterId}
                    onChange={(e) => setNewSemesterId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Pilih Semester --</option>
                    {semesterList.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.nama_semester}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Sidang</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Waktu Mulai</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lokasi / Ruang Sidang</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Kuorum (0 = Otomatis 2/3 Dewan Guru)
                </label>
                <input
                  type="number"
                  value={newQuorum}
                  onChange={(e) => setNewQuorum(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                >
                  Buat Sesi Sidang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 9. MODAL FINALISASI SIDANG                                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-indigo-700">
              <Award className="w-8 h-8 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Finalisasi Sidang Pleno</h3>
                <p className="text-xs text-slate-500">Penerbitan Berita Acara Pleno (BAP) Resmi</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              Dengan mengklik tombol finalisasi, sidang akan ditutup secara sah, seluruh putusan kenaikan kelas akan
              dikunci, dan nomor dokumen BAP akan diterbitkan secara otomatis.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Catatan Penutup Pimpinan Sidang (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Misal: Seluruh proses sidang pleno kenaikan kelas telah diselesaikan dengan musyawarah mufakat..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFinalizeSession}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sahkan & Terbitkan BAP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicPlenoPage;
