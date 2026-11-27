import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from 'react';
import {
  FileText,
  Printer,
  Award,
  Users,
  Search,
  Filter,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  X,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { HubCard } from '@/components/ui/hub';
import { ScoreRow, evaluateSidangCompleteness } from './types';
import { PklSidangCetakModal, PklDocType } from './PklSidangCetakModal';
import { useJurusanOptions } from '@/hooks/useJurusanOptions';
import { useAuthStore } from '@/store/authStore';
import { UniversalSendWaModal } from '@/components/ui/UniversalSendWaModal';
import { getWaDocumentRecipients } from '@/api/whatsapp.api';
import { cn } from '@/lib/utils';

export interface PklMonitoringSidangTabProps {
  scores: ScoreRow[];
  totalRawScores: number;
  isLoadingRekap: boolean;
  selectedTp: string;
  selectedSemester: string;
  tpOptions: { value: string; label: string }[];
  semesterOptions: { value: string; label: string }[];
  isKaprog: boolean;
  canManageAll: boolean;
  isHubin: boolean;
  jurusanId?: string;
  jurusanNama?: string;
  activeGuruId?: string;
  isMobile: boolean;
  smartClassOptions: { value: string; label: string }[];
  selectedKelas?: string;
  setSelectedKelas?: (kelasId: string) => void;
  onNavigateCetakRapor?: () => void;
}

export const PklMonitoringSidangTab: React.FC<PklMonitoringSidangTabProps> = React.memo(({
  scores,
  totalRawScores,
  isLoadingRekap,
  selectedTp,
  selectedSemester,
  tpOptions,
  semesterOptions,
  isKaprog,
  canManageAll,
  isHubin,
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  activeGuruId,
  isMobile,
  smartClassOptions,
  selectedKelas: propSelectedKelas,
  setSelectedKelas: propSetSelectedKelas,
  onNavigateCetakRapor,
}) => {
  const { options: jurusanOptions, rawList: rawJurusanList } = useJurusanOptions();

  // ───────────────────────────────────────────────────────────────────────────
  // 1. FILTER & SCOPE STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [selectedJurusan, setSelectedJurusan] = useState<string>(() => {
    if (propJurusanId) return propJurusanId;
    return 'ALL';
  });

  const [selectedPenguji, setSelectedPenguji] = useState<string>('ALL');

  // Filter Kelas (Terkontrol & Terhubung ke Toolbar Utama)
  const [internalKelas, setInternalKelas] = useState<string>('');
  const activeSelectedKelas = propSelectedKelas !== undefined ? propSelectedKelas : internalKelas;
  const handleKelasChange = useCallback((k: string) => {
    if (propSetSelectedKelas) propSetSelectedKelas(k);
    else setInternalKelas(k);
  }, [propSetSelectedKelas]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LENGKAP' | 'BELUM' | 'TTD_SUDAH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Paginasi
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Dropdown Cetak Terpusat
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState<boolean>(false);
  const [cardMenuPenguji, setCardMenuPenguji] = useState<string | null>(null);
  const printDropdownRef = useRef<HTMLDivElement>(null);

  // Modal Cetak Berkas Resmi
  const [showCetakModal, setShowCetakModal] = useState<boolean>(false);
  const [cetakDocType, setCetakDocType] = useState<PklDocType>('BERITA_ACARA');
  const [targetPengujiNama, setTargetPengujiNama] = useState<string>('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setIsPrintDropdownOpen(false);
      }
      setCardMenuPenguji(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sinkronisasi propJurusanId jika berubah dari luar (khusus mode Kaprog)
  useEffect(() => {
    if (propJurusanId) {
      setSelectedJurusan(propJurusanId);
    }
  }, [propJurusanId]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedJurusan, selectedPenguji, activeSelectedKelas, statusFilter, deferredSearchQuery]);

  // Label TP dan Semester aktif
  const selectedTpNama = useMemo(() => {
    return tpOptions.find((t) => t.value === selectedTp)?.label || '';
  }, [tpOptions, selectedTp]);

  const selectedSemesterNama = useMemo(() => {
    return semesterOptions.find((s) => s.value === selectedSemester)?.label || '';
  }, [semesterOptions, selectedSemester]);

  // Jurusan Terpilih Object
  const activeJurusanObj = useMemo(() => {
    if (selectedJurusan === 'ALL') return null;
    return rawJurusanList.find((j) => j.id === selectedJurusan) || null;
  }, [selectedJurusan, rawJurusanList]);

  const activeJurusanNama = useMemo(() => {
    if (activeJurusanObj) {
      const nama = activeJurusanObj.nama || (activeJurusanObj as any).nama_jurusan || '';
      const kode = activeJurusanObj.singkatan || activeJurusanObj.kode || '';
      return `${nama}${kode ? ` (${kode})` : ''}`;
    }
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian') {
      return propJurusanNama;
    }
    return 'Semua Program Keahlian';
  }, [activeJurusanObj, propJurusanNama]);

  // Options Lengkap Jurusan untuk Step 1 Filter
  const allJurusanOptions = useMemo(() => {
    if (jurusanOptions.length > 0) {
      return [
        { value: 'ALL', label: 'Semua Program Keahlian (Seluruh Sekolah)' },
        ...jurusanOptions,
      ];
    }
    const map = new Map<string, string>();
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      if (s.jurusan_id) {
        map.set(s.jurusan_id, s.nama_jurusan || s.singkatan_jurusan || 'Jurusan');
      }
    }
    const fallbackList = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    return [
      { value: 'ALL', label: 'Semua Program Keahlian (Seluruh Sekolah)' },
      ...fallbackList,
    ];
  }, [jurusanOptions, scores]);

  // Handler Step 1 Jurusan (Reset Penguji ke ALL agar data selalu sinkron)
  const handleJurusanChange = useCallback((val: string) => {
    setSelectedJurusan(val);
    setSelectedPenguji('ALL');
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FILTERING DATA SECARA BERJENJANG (HIERARCHICAL ENGINE)
  // ───────────────────────────────────────────────────────────────────────────
  const targetJurusanSingkatan = useMemo(() => {
    if (selectedJurusan === 'ALL') return '';
    const j = rawJurusanList.find((item) => item.id === selectedJurusan);
    return (j?.singkatan || j?.kode || '').toLowerCase();
  }, [selectedJurusan, rawJurusanList]);

  const jurusanFilteredScores = useMemo(() => {
    if (selectedJurusan === 'ALL') return scores;

    return scores.filter((s) => {
      if (s.jurusan_id === selectedJurusan) return true;
      if (activeJurusanObj) {
        const jNama = (activeJurusanObj.nama || (activeJurusanObj as any).nama_jurusan || '').toLowerCase();
        if (s.nama_jurusan && s.nama_jurusan.toLowerCase() === jNama) return true;
      }
      if (targetJurusanSingkatan) {
        if (s.singkatan_jurusan && s.singkatan_jurusan.toLowerCase() === targetJurusanSingkatan) return true;
        if (s.nama_kelas && s.nama_kelas.toLowerCase().includes(targetJurusanSingkatan)) return true;
      }
      return false;
    });
  }, [scores, selectedJurusan, targetJurusanSingkatan, activeJurusanObj]);

  // Ekstraksi Daftar Penguji Unik dari Jurusan yang terpilih (O(N) Single-Pass)
  const pengujiSummaryList = useMemo(() => {
    const map = new Map<string, {
      nama: string;
      id?: string | null;
      totalSiswa: number;
      sudahDinilai: number;
      belumDinilai: number;
      scoredCount: number;
      sudahTtd: number;
      totalNilai: number;
    }>();

    for (let i = 0; i < jurusanFilteredScores.length; i++) {
      const s = jurusanFilteredScores[i];
      const nama = s.penguji_nama ? s.penguji_nama.trim() : 'Belum Diploting';
      let existing = map.get(nama);
      if (!existing) {
        existing = {
          nama,
          id: s.penguji_id,
          totalSiswa: 0,
          sudahDinilai: 0,
          belumDinilai: 0,
          scoredCount: 0,
          sudahTtd: 0,
          totalNilai: 0,
        };
        map.set(nama, existing);
      }

      existing.totalSiswa += 1;

      // Wajib mengecek keterisian seluruh 4 komponen nilai sidang (Laporan, Materi, Komunikasi, Sikap)
      const sidangCheck = evaluateSidangCompleteness(s);
      if (sidangCheck.computedScore !== null) {
        existing.scoredCount += 1;
        existing.totalNilai += sidangCheck.computedScore;
      }
      if (sidangCheck.isComplete) {
        existing.sudahDinilai += 1;
      } else {
        existing.belumDinilai += 1;
      }

      if (s.ttd_siswa) {
        existing.sudahTtd += 1;
      }
    }

    return Array.from(map.values()).map((p) => {
      const persentase = p.totalSiswa > 0 ? Math.round((p.sudahDinilai / p.totalSiswa) * 100) : 0;
      const avgNilai = p.scoredCount > 0 ? (p.totalNilai / p.scoredCount).toFixed(1) : '-';
      return {
        ...p,
        persentase,
        avgNilai,
        isComplete: p.totalSiswa > 0 && p.sudahDinilai === p.totalSiswa,
      };
    }).sort((a, b) => {
      if (a.nama === 'Belum Diploting') return 1;
      if (b.nama === 'Belum Diploting') return -1;
      return a.nama.localeCompare(b.nama);
    });
  }, [jurusanFilteredScores]);

  // Options Penguji untuk Dropdown
  const pengujiDropdownOptions = useMemo(() => {
    const opts = [
      { value: 'ALL', label: `Semua Penguji (${pengujiSummaryList.length})` },
    ];
    for (let i = 0; i < pengujiSummaryList.length; i++) {
      const p = pengujiSummaryList[i];
      opts.push({
        value: p.nama,
        label: `${p.nama} (${p.sudahDinilai}/${p.totalSiswa}${p.isComplete ? ' ✓' : ''})`,
      });
    }
    return opts;
  }, [pengujiSummaryList]);

  // ───────────────────────────────────────────────────────────────────────────
  // 2B. DIREKTORI NOMOR WA GURU & ENGINE COLEK WHATSAPP (KAPROG)
  // ───────────────────────────────────────────────────────────────────────────
  const { user } = useAuthStore();

  const { data: guruRecipients = [] } = useQuery({
    queryKey: ['wa-document-recipients-guru'],
    queryFn: () => getWaDocumentRecipients({ type: 'GURU', limit: 300 }),
    staleTime: 10 * 60 * 1000,
  });

  const guruPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of guruRecipients) {
      const phone = (g as any).normalizedPhone || (g.phone ? g.phone.replace(/\D/g, '') : '');
      if (phone) {
        if (g.name) map.set(g.name.trim().toLowerCase(), phone);
        if (g.id) map.set(g.id, phone);
      }
    }
    return map;
  }, [guruRecipients]);

  const [waModalConfig, setWaModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    defaultMessage: string;
    defaultRecipientType: 'GROUP' | 'GURU' | 'MANUAL';
    defaultRecipientTarget?: string;
    defaultRecipientLabel?: string;
  }>({
    isOpen: false,
    title: 'Colek WhatsApp Guru Penguji Sidang',
    subtitle: 'Kirim pesan pengingat pengisian nilai sidang PKL',
    defaultMessage: '',
    defaultRecipientType: 'GURU',
  });

  // Handler: Colek Single Penguji Sidang
  const handleColekPenguji = useCallback((penguji: {
    nama: string;
    id?: string | null;
    totalSiswa: number;
    sudahDinilai: number;
    belumDinilai: number;
  }) => {
    const rawTargetPhone = penguji.id ? guruPhoneMap.get(penguji.id) : undefined;
    const phone = rawTargetPhone || guruPhoneMap.get(penguji.nama.trim().toLowerCase()) || '';
    const senderName = user?.full_name || 'Ketua Program Keahlian';
    const deptName = activeJurusanNama || 'Kejuruan';

    // Cari siswa uji sidang dari penguji ini yang belum lengkap 4 komponen nilai sidang
    const unassessedStudents = jurusanFilteredScores.filter((s) => {
      const nama = s.penguji_nama ? s.penguji_nama.trim() : 'Belum Diploting';
      if (nama !== penguji.nama) return false;
      return !evaluateSidangCompleteness(s).isComplete;
    });

    const studentListFormatted = unassessedStudents
      .map((s, idx) => {
        const check = evaluateSidangCompleteness(s);
        const missingNote = check.missingItems.length > 0 ? ` — _Kurang: ${check.missingItems.join(', ')}_` : '';
        return `  ${idx + 1}. *${s.nama_siswa}* (${s.nama_kelas || '-'} • ${s.mitra_nama || '-'})${missingNote}`;
      })
      .join('\n');

    const studentListSection = studentListFormatted
      ? `\n\n*Daftar Siswa Uji Sidang yang Belum Dinilai (${unassessedStudents.length} siswa):*\n${studentListFormatted}\n`
      : '';

    const message = `Yth. Bapak/Ibu *${penguji.nama}*,

Mengingatkan perihal penginputan *Nilai Sidang PKL* peserta didik Jurusan *${deptName}*.
Saat ini tercatat masih ada *${penguji.belumDinilai} dari ${penguji.totalSiswa} siswa* uji sidang Anda yang belum tuntas dinilai.${studentListSection}
Mohon kesediaannya untuk segera melengkapi penilaian melalui Meja Penguji / Menu Sidang PKL pada aplikasi Absenta:
${window.location.origin}/dashboard?tab=penguji_pkl

Atas perhatian dan kerjasamanya, kami sampaikan terima kasih.
— _Ketua Program Keahlian ${deptName} (${senderName})_`;

    setWaModalConfig({
      isOpen: true,
      title: `Colek WhatsApp: ${penguji.nama}`,
      subtitle: `Kirim pengingat nilai sidang PKL (${penguji.belumDinilai} siswa belum dinilai)`,
      defaultMessage: message,
      defaultRecipientType: phone ? 'GURU' : 'MANUAL',
      defaultRecipientTarget: phone,
      defaultRecipientLabel: penguji.nama,
    });
  }, [guruPhoneMap, user, activeJurusanNama, jurusanFilteredScores]);

  // Handler: Colek Semua Penguji via Grup WA
  const handleColekSemuaPengujiGrup = useCallback(() => {
    const belumLengkapList = pengujiSummaryList.filter(
      (p) => p.nama !== 'Belum Diploting' && p.belumDinilai > 0
    );
    const senderName = user?.full_name || 'Ketua Program Keahlian';
    const deptName = activeJurusanNama || 'Kejuruan';

    let rincianPenguji = '';
    if (belumLengkapList.length > 0) {
      rincianPenguji = belumLengkapList
        .map((p, idx) => `${idx + 1}. *${p.nama}* (${p.belumDinilai} siswa belum dinilai)`)
        .join('\n');
    } else {
      rincianPenguji = '_Semua penguji telah menuntaskan penilaian sidang._';
    }

    const message = `📢 *PENGINGAT PENYELESAIAN NILAI SIDANG PKL*
Jurusan: *${deptName}*
Tahun Pelajaran: *${selectedTpNama || '-'}* (${selectedSemesterNama || '-'})

Yth. Bapak/Ibu Guru Penguji Sidang PKL,
Mengingatkan untuk segera merampungkan pengisian nilai sidang PKL bagi siswa berikut:

${rincianPenguji}

Akses penilaian dapat dibuka pada link berikut:
${window.location.origin}/dashboard?tab=penguji_pkl

Terima kasih atas dedikasi dan kerjasamanya.
— _Ketua Program Keahlian ${deptName} (${senderName})_`;

    setWaModalConfig({
      isOpen: true,
      title: 'Colek Semua Penguji Sidang (Grup WA)',
      subtitle: `Siarkan pengingat ke Grup WhatsApp (${belumLengkapList.length} penguji belum tuntas)`,
      defaultMessage: message,
      defaultRecipientType: 'GROUP',
      defaultRecipientTarget: '',
      defaultRecipientLabel: 'Grup WhatsApp Guru Penguji',
    });
  }, [pengujiSummaryList, user, activeJurusanNama, selectedTpNama, selectedSemesterNama]);

  // Handler: Colek Penguji untuk Siswa Tertentu
  const handleColekSingleStudentSidang = useCallback((score: ScoreRow) => {
    const pengujiNama = score.penguji_nama || 'Bapak/Ibu Penguji';
    const rawTargetPhone = score.penguji_id ? guruPhoneMap.get(score.penguji_id) : undefined;
    const phone = rawTargetPhone || (score.penguji_nama ? guruPhoneMap.get(score.penguji_nama.trim().toLowerCase()) : undefined) || '';
    const senderName = user?.full_name || 'Ketua Program Keahlian';
    const deptName = activeJurusanNama || 'Kejuruan';

    const message = `Yth. Bapak/Ibu *${pengujiNama}*,

Mohon bantuannya untuk menginputkan *Nilai Sidang PKL* bagi peserta didik berikut:
- *Nama*: ${score.nama_siswa}
- *NIS*: ${score.nis || '-'}
- *Kelas*: ${score.nama_kelas || '-'}
- *Mitra*: ${score.mitra_nama || '-'}

Penilaian dapat diisi langsung pada aplikasi Absenta:
${window.location.origin}/dashboard?tab=penguji_pkl

Terima kasih.
— _Ketua Program Keahlian ${deptName} (${senderName})_`;

    setWaModalConfig({
      isOpen: true,
      title: `Colek Penguji: ${pengujiNama}`,
      subtitle: `Pengingat nilai sidang untuk siswa ${score.nama_siswa}`,
      defaultMessage: message,
      defaultRecipientType: phone ? 'GURU' : 'MANUAL',
      defaultRecipientTarget: phone,
      defaultRecipientLabel: pengujiNama,
    });
  }, [guruPhoneMap, user, activeJurusanNama]);

  // Filter Lengkap
  const fullyFilteredScores = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();

    return jurusanFilteredScores.filter((s) => {
      // Filter Penguji
      if (selectedPenguji !== 'ALL') {
        const pNama = s.penguji_nama ? s.penguji_nama.trim() : 'Belum Diploting';
        if (pNama !== selectedPenguji) return false;
      }

      // Filter Kelas
      if (activeSelectedKelas && s.kelas_id !== activeSelectedKelas && s.nama_kelas !== activeSelectedKelas) {
        return false;
      }

      // Filter Status Nilai & Presensi (Wajib Lengkap 4 Komponen Nilai Sidang)
      const sidangCheck = evaluateSidangCompleteness(s);
      if (statusFilter === 'LENGKAP' && !sidangCheck.isComplete) return false;
      if (statusFilter === 'BELUM' && sidangCheck.isComplete) return false;
      if (statusFilter === 'TTD_SUDAH' && !s.ttd_siswa) return false;

      // Filter Search
      if (q) {
        const matchNama = s.nama_siswa?.toLowerCase().includes(q);
        const matchNis = s.nis?.toLowerCase().includes(q);
        const matchKelas = s.nama_kelas?.toLowerCase().includes(q);
        const matchMitra = s.mitra_nama?.toLowerCase().includes(q);
        const matchPenguji = s.penguji_nama?.toLowerCase().includes(q);
        if (!matchNama && !matchNis && !matchKelas && !matchMitra && !matchPenguji) return false;
      }

      return true;
    });
  }, [jurusanFilteredScores, selectedPenguji, activeSelectedKelas, statusFilter, deferredSearchQuery]);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. STATISTIK KPI
  // ───────────────────────────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const list = fullyFilteredScores;
    const total = list.length;
    let lengkap = 0;
    let belum = 0;
    let scoredCount = 0;
    let sudahTtd = 0;
    let totalScore = 0;

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const sidangCheck = evaluateSidangCompleteness(s);
      if (sidangCheck.computedScore !== null) {
        scoredCount += 1;
        totalScore += sidangCheck.computedScore;
      }
      if (sidangCheck.isComplete) {
        lengkap += 1;
      } else {
        belum += 1;
      }

      if (s.ttd_siswa) sudahTtd += 1;
    }

    const persentase = total > 0 ? Math.round((lengkap / total) * 100) : 0;
    const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : '-';
    const ttdPersentase = total > 0 ? Math.round((sudahTtd / total) * 100) : 0;

    return {
      total,
      lengkap,
      belum,
      sudahTtd,
      persentase,
      avgScore,
      ttdPersentase,
    };
  }, [fullyFilteredScores]);

  // Paginasi Data Siswa
  const totalPages = Math.max(1, Math.ceil(fullyFilteredScores.length / itemsPerPage));
  const paginatedScores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return fullyFilteredScores.slice(start, start + itemsPerPage);
  }, [fullyFilteredScores, currentPage, itemsPerPage]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CETAK HANDLER & SCOPE RESOLUTION
  // ───────────────────────────────────────────────────────────────────────────
  const handleOpenCetak = useCallback((type: PklDocType, specificPenguji?: string) => {
    setCetakDocType(type);
    setTargetPengujiNama(specificPenguji || (selectedPenguji !== 'ALL' ? selectedPenguji : ''));
    setShowCetakModal(true);
  }, [selectedPenguji]);

  const modalScores = useMemo(() => {
    if (targetPengujiNama) {
      return jurusanFilteredScores.filter((s) => s.penguji_nama === targetPengujiNama);
    }
    return fullyFilteredScores;
  }, [targetPengujiNama, jurusanFilteredScores, fullyFilteredScores]);

  return (
    <div className="space-y-3">
      {/* ── ALUR FILTER BERJENJANG (Step 1: Jurusan -> Step 2: Penguji) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-center">
          {/* STEP 1: FILTER JURUSAN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                  1
                </span>
                <span>Program Keahlian / Jurusan</span>
              </label>
              {selectedJurusan !== 'ALL' && !isKaprog && (
                <button
                  type="button"
                  onClick={() => handleJurusanChange('ALL')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset Jurusan
                </button>
              )}
            </div>

            {isKaprog && propJurusanId ? (
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="truncate">{activeJurusanNama}</span>
                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  Jurusan Anda
                </span>
              </div>
            ) : (
              <SearchableSelect
                value={selectedJurusan}
                onChange={handleJurusanChange}
                options={allJurusanOptions}
                placeholder="Pilih Jurusan..."
                className="w-full text-xs"
              />
            )}
          </div>

          {/* STEP 2: FILTER PENGUJI */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                  2
                </span>
                <span>Guru Penguji Sidang</span>
              </label>
              {selectedPenguji !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedPenguji('ALL')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Semua Penguji
                </button>
              )}
            </div>

            <SearchableSelect
              value={selectedPenguji}
              onChange={(val) => setSelectedPenguji(val)}
              options={pengujiDropdownOptions}
              placeholder="Pilih Penguji..."
              className="w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards (Murni Statistik Bersih Tanpa Clutter Tombol) ── */}
      <HubCard noPadding className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800/80 py-2 sm:py-2.5 text-center">
          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
              {kpiStats.total}
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Peserta Sidang
            </div>
          </div>

          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {kpiStats.lengkap}
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({kpiStats.persentase}%)
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Sudah Ujian (Avg: {kpiStats.avgScore})
            </div>
          </div>

          <div className="px-2 min-w-0">
            <div className={cn(
              "text-base sm:text-lg font-black leading-none",
              kpiStats.belum > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
            )}>
              {kpiStats.belum}
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Menunggu Nilai
            </div>
          </div>

          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {kpiStats.sudahTtd}
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({kpiStats.ttdPersentase}%)
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Presensi TTD
            </div>
          </div>
        </div>
      </HubCard>

      {/* ── Matriks Penguji Bersih (Klik Kartu Untuk Filter Penguji) ── */}
      <HubCard
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Progres Guru Penguji Sidang ({pengujiSummaryList.length})
                {selectedJurusan !== 'ALL' && (
                  <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5 hidden sm:inline">
                    • {activeJurusanNama}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pengujiSummaryList.some((p) => p.nama !== 'Belum Diploting' && p.belumDinilai > 0) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleColekSemuaPengujiGrup}
                  className="h-7 px-2.5 text-[11px] font-bold gap-1.5 border-indigo-300 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-2xs cursor-pointer"
                  title="Kirim pengingat input nilai sidang PKL ke penguji yang belum tuntas via Grup WhatsApp"
                >
                  <MessageSquare size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Colek Semua Penguji (Grup WA)</span>
                  <span className="sm:hidden">Colek Grup</span>
                </Button>
              ) : (
                <div className="h-7 px-2.5 text-[11px] font-bold gap-1.5 rounded-lg border border-indigo-300/80 bg-indigo-100/50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 flex items-center shadow-2xs select-none">
                  <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Semua Penguji Tuntas ✓</span>
                </div>
              )}

              {selectedPenguji !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedPenguji('ALL')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Tampilkan Semua Siswa</span>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        }
        noPadding
      >
        <div className="p-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {pengujiSummaryList.map((penguji) => {
              const isSelected = selectedPenguji === penguji.nama;
              return (
                <div
                  key={penguji.nama}
                  onClick={() => setSelectedPenguji(isSelected ? 'ALL' : penguji.nama)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer relative select-none",
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20"
                      : "bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 hover:bg-slate-50/50"
                  )}
                  title={`Klik untuk memfilter daftar siswa khusus ${penguji.nama}`}
                >
                  {/* Nama Penguji & Status Selesai */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "font-bold text-xs truncate",
                        isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-900 dark:text-slate-100"
                      )}>
                        {penguji.nama}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {penguji.sudahDinilai} dari {penguji.totalSiswa} siswa dinilai
                      </div>
                    </div>

                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0",
                      penguji.isComplete
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : penguji.sudahDinilai > 0
                        ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    )}>
                      {penguji.persentase}%
                    </span>
                  </div>

                  {/* Progress Bar Ramping */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        penguji.isComplete ? "bg-emerald-500" : "bg-indigo-600"
                      )}
                      style={{ width: `${penguji.persentase}%` }}
                    />
                  </div>

                  {/* Mini Stats: Rata-rata Nilai & Presensi & Colek WA */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-750">
                    <div className="flex items-center gap-1.5">
                      <span>Avg: <strong className="text-slate-700 dark:text-slate-200">{penguji.avgNilai}</strong></span>
                      <span>TTD: <strong className="text-slate-700 dark:text-slate-200">{penguji.sudahTtd}/{penguji.totalSiswa}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      {penguji.nama !== 'Belum Diploting' && (
                        penguji.belumDinilai > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleColekPenguji(penguji);
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title={`Colek WhatsApp ${penguji.nama} untuk ${penguji.belumDinilai} siswa yang belum dinilai sidang`}
                          >
                            <MessageCircle size={10} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Colek WA ({penguji.belumDinilai})</span>
                          </button>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700 text-[9px] font-bold flex items-center gap-1 cursor-default select-none shadow-2xs"
                            title={`Luar biasa! Seluruh ${penguji.totalSiswa} siswa sidang telah tuntas dinilai.`}
                          >
                            <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Tuntas ✓</span>
                          </span>
                        )
                      )}
                      {isSelected && (
                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HubCard>

      {/* ── Tabel Detail Peserta Sidang PKL dengan Aksi Cetak di Header ── */}
      <HubCard noPadding className="w-full">
        {/* Header Tabel & Aksi Cetak Terpusat */}
        <div className="p-3 sm:px-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/50">
          {/* Sisi Kiri: Judul Tabel & Scope Aktif */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Daftar Siswa Sidang ({fullyFilteredScores.length})
              </span>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/80 dark:border-slate-700/80">
              {selectedJurusan !== 'ALL' ? activeJurusanNama : 'Semua Jurusan'}
              {selectedPenguji !== 'ALL' ? ` • ${selectedPenguji}` : ''}
            </span>
          </div>

          {/* Sisi Kanan: AKSI CETAK RESMI DI HEADER TABEL */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <div className="relative" ref={printDropdownRef}>
              <Button
                type="button"
                onClick={() => setIsPrintDropdownOpen((prev) => !prev)}
                disabled={fullyFilteredScores.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-8 px-3.5 flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer size={13} />
                <span>
                  {selectedPenguji !== 'ALL' ? `Cetak (${selectedPenguji})` : 'Cetak Berkas Sidang'}
                </span>
                <ChevronDown size={13} className={cn("transition-transform duration-200", isPrintDropdownOpen ? "rotate-180" : "")} />
              </Button>

              {/* Menu Dropdown Cetak Dokumen Resmi */}
              {isPrintDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold truncate">
                    Scope: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedPenguji !== 'ALL' ? selectedPenguji : (selectedJurusan !== 'ALL' ? activeJurusanNama : 'Seluruh Sekolah')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      handleOpenCetak('BERITA_ACARA');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <FileText size={14} className="text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold">Berita Acara Sidang</div>
                      <div className="text-[10px] text-slate-400">Naskah narasi & lembar kelulusan</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      handleOpenCetak('DAFTAR_HADIR');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <UserCheck size={14} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Daftar Hadir Peserta</div>
                      <div className="text-[10px] text-slate-400">Presensi & TTD digital siswa</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      handleOpenCetak(selectedPenguji !== 'ALL' ? 'REKAP_PENGUJI' : 'REKAP_JURUSAN');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <Award size={14} className="text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold">Rekapitulasi Nilai</div>
                      <div className="text-[10px] text-slate-400">Format rekap 4 aspek sidang</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {onNavigateCetakRapor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNavigateCetakRapor}
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-8 px-2.5 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Buka Lembar Cetak Rapor & Sertifikat PKL"
              >
                <Printer size={12} className="text-slate-500 shrink-0" />
                <span>Rapor</span>
              </Button>
            )}
          </div>
        </div>

        {/* Sub-toolbar Tabel: Filter Status & Search Box */}
        <div className="p-2.5 sm:px-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                  statusFilter === 'ALL'
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Semua ({fullyFilteredScores.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LENGKAP')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                  statusFilter === 'LENGKAP'
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700"
                )}
              >
                Sudah Ujian
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('BELUM')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                  statusFilter === 'BELUM'
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700"
                )}
              >
                Belum Ujian
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari siswa / NIS / mitra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>
        {fullyFilteredScores.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Tidak ada siswa sidang yang sesuai dengan filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Siswa &amp; Kelas</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Mitra DUDI</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Penguji Sidang</th>
                  <th className="py-2.5 px-2 text-center w-14" title="Sistematika Laporan">Laporan</th>
                  <th className="py-2.5 px-2 text-center w-14" title="Penguasaan Materi">Materi</th>
                  <th className="py-2.5 px-2 text-center w-14" title="Presentasi / Tanya Jawab">Tanya Jwb</th>
                  <th className="py-2.5 px-2 text-center w-14" title="Sikap & Etika">Sikap</th>
                  <th className="py-2.5 px-2 text-center w-16 bg-indigo-50/50 dark:bg-indigo-950/20">Nilai</th>
                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                  <th className="py-2.5 px-3 text-center w-24">Presensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedScores.map((score, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const sidangCheck = evaluateSidangCompleteness(score);
                  const isFullyComplete = sidangCheck.isComplete;
                  const numScore = sidangCheck.computedScore ?? 0;
                  const isPassed = numScore >= 70;

                  return (
                    <tr
                      key={score.siswa_pkl_id || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-400">
                        {globalIdx}
                      </td>

                      {/* Identitas Siswa */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {score.nama_siswa}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>NIS: {score.nis || '-'}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {score.nama_kelas || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Mitra DUDI */}
                      <td className="py-2 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[160px]" title={score.mitra_nama}>
                          {score.mitra_nama || '-'}
                        </div>
                      </td>

                      {/* Penguji */}
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={score.penguji_nama}>
                            {score.penguji_nama || <span className="text-amber-500 italic">Belum Diploting</span>}
                          </div>
                          {score.penguji_nama && !isFullyComplete && (
                            <button
                              type="button"
                              onClick={() => handleColekSingleStudentSidang(score)}
                              className="p-1 rounded-md text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0 transition-colors cursor-pointer"
                              title={`Colek Penguji (${score.penguji_nama}) via WhatsApp untuk melengkapi ${sidangCheck.missingItems.join(', ')}`}
                            >
                              <MessageCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 4 Aspek Nilai */}
                      <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_portofolio && Number(score.sidang_portofolio) > 0 ? score.sidang_portofolio : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_materi && Number(score.sidang_materi) > 0 ? score.sidang_materi : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_komunikasi && Number(score.sidang_komunikasi) > 0 ? score.sidang_komunikasi : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_sikap && Number(score.sidang_sikap) > 0 ? score.sidang_sikap : '-'}
                      </td>

                      {/* Nilai Akhir Sidang */}
                      <td className="py-2 px-2 text-center font-bold font-mono text-xs bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                        {sidangCheck.computedScore !== null ? sidangCheck.computedScore : '-'}
                      </td>

                      {/* Status Kelulusan */}
                      <td className="py-2 px-3 text-center">
                        {isFullyComplete ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold inline-block",
                            isPassed
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          )}>
                            {isPassed ? 'Lulus' : 'Revisi'}
                          </span>
                        ) : sidangCheck.isPartial ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 inline-block"
                            title={`Belum lengkap: ${sidangCheck.missingItems.join(', ')}`}
                          >
                            Belum Lengkap ({sidangCheck.filledAspectsCount}/4)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-750 text-slate-500 inline-block">
                            Belum Ujian
                          </span>
                        )}
                      </td>

                      {/* Status Presensi Siswa */}
                      <td className="py-2 px-3 text-center">
                        {score.ttd_siswa ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                            <Check size={10} />
                            <span>Sudah TTD</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                            <Clock size={10} />
                            <span>Belum</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginasi Footer */}
        {fullyFilteredScores.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
              <span>Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>dari <strong>{fullyFilteredScores.length}</strong> siswa</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-6 px-2 text-[11px] font-bold cursor-pointer"
              >
                Prev
              </Button>
              <span className="px-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-6 px-2 text-[11px] font-bold cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </HubCard>

      {/* ── Modal Cetak Berita Acara, Daftar Hadir, & Rekap Nilai ── */}
      {showCetakModal && (
        <PklSidangCetakModal
          isOpen={showCetakModal}
          onClose={() => setShowCetakModal(false)}
          initialDocType={cetakDocType}
          scores={modalScores}
          jurusanId={selectedJurusan !== 'ALL' ? selectedJurusan : propJurusanId}
          jurusanNama={selectedJurusan !== 'ALL' ? activeJurusanNama : propJurusanNama}
          selectedTpNama={selectedTpNama}
          selectedSemesterNama={selectedSemesterNama}
          activePengujiNama={targetPengujiNama || (selectedPenguji !== 'ALL' ? selectedPenguji : '')}
          isKaprog={isKaprog}
        />
      )}

      {/* ── Modal Colek WhatsApp Kaprog ── */}
      {waModalConfig.isOpen && (
        <UniversalSendWaModal
          isOpen={waModalConfig.isOpen}
          onClose={() => setWaModalConfig((prev) => ({ ...prev, isOpen: false }))}
          title={waModalConfig.title}
          subtitle={waModalConfig.subtitle}
          defaultMessage={waModalConfig.defaultMessage}
          defaultRecipientType={waModalConfig.defaultRecipientType}
          defaultRecipientTarget={waModalConfig.defaultRecipientTarget}
          defaultRecipientLabel={waModalConfig.defaultRecipientLabel}
          onSuccess={(details) => {
            toast.success(`Colek WhatsApp berhasil dikirim ke ${details.targetLabel}!`);
          }}
        />
      )}
    </div>
  );
});

PklMonitoringSidangTab.displayName = 'PklMonitoringSidangTab';
export default PklMonitoringSidangTab;
