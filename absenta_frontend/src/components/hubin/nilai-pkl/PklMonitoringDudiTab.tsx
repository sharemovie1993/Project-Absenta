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
  Building2,
  Edit3,
  Lock,
  AlertTriangle,
  Save,
  Loader2,
  RotateCcw,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { HubCard } from '@/components/ui/hub';
import { ScoreRow, evaluateDudiCompleteness } from './types';
import { PklDudiCetakModal, PklDudiDocType } from './PklDudiCetakModal';
import { useJurusanOptions } from '@/hooks/useJurusanOptions';
import { useAuthStore } from '@/store/authStore';
import { UniversalSendWaModal } from '@/components/ui/UniversalSendWaModal';
import { getWaDocumentRecipients } from '@/api/whatsapp.api';
import { hubinApi } from '@/api/hubin.api';
import { cn } from '@/lib/utils';

export interface PklMonitoringDudiTabProps {
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
  canUseModeKoreksi?: boolean;
  jurusanId?: string;
  jurusanNama?: string;
  activeGuruId?: string;
  isMobile: boolean;
  smartClassOptions: { value: string; label: string }[];
  selectedKelas?: string;
  setSelectedKelas?: (kelasId: string) => void;
  onNavigateCetakRapor?: () => void;
}

export const PklMonitoringDudiTab: React.FC<PklMonitoringDudiTabProps> = React.memo(({
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
  canUseModeKoreksi: propCanUseModeKoreksi,
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
  const queryClient = useQueryClient();

  // Mode Koreksi: Khusus Kaprog (Waka Hubin dilarang)
  const isEligibleForKoreksi = Boolean(propCanUseModeKoreksi ?? (isKaprog && !isHubin));
  const [isModeKoreksi, setIsModeKoreksi] = useState<boolean>(false);
  const [editDrafts, setEditDrafts] = useState<Record<string, Record<string, number | string | null>>>({});
  const [isSavingKoreksi, setIsSavingKoreksi] = useState<boolean>(false);

  const unsavedCount = Object.keys(editDrafts).length;
  const hasUnsavedChanges = unsavedCount > 0;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. FILTER & SCOPE STATE (Step 1: Jurusan, Step 2: Pembimbing)
  // ───────────────────────────────────────────────────────────────────────────
  const [selectedJurusan, setSelectedJurusan] = useState<string>(() => {
    if (propJurusanId) return propJurusanId;
    return 'ALL';
  });

  const [selectedPembimbing, setSelectedPembimbing] = useState<string>('ALL');

  // Filter Kelas (Terkontrol & Terhubung ke Toolbar Utama)
  const [internalKelas, setInternalKelas] = useState<string>('');
  const activeSelectedKelas = propSelectedKelas !== undefined ? propSelectedKelas : internalKelas;
  const handleKelasChange = useCallback((k: string) => {
    if (propSetSelectedKelas) propSetSelectedKelas(k);
    else setInternalKelas(k);
  }, [propSetSelectedKelas]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUDAH' | 'BELUM'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Paginasi
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Dropdown Cetak Terpusat
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState<boolean>(false);
  const printDropdownRef = useRef<HTMLDivElement>(null);

  // Modal Cetak Berkas Resmi
  const [showCetakModal, setShowCetakModal] = useState<boolean>(false);
  const [cetakDocType, setCetakDocType] = useState<PklDudiDocType>('REKAP_DUDI');
  const [targetPembimbingNama, setTargetPembimbingNama] = useState<string>('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setIsPrintDropdownOpen(false);
      }
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
  }, [selectedJurusan, selectedPembimbing, activeSelectedKelas, statusFilter, deferredSearchQuery]);

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

  // Handler Step 1 Jurusan (Reset Pembimbing ke ALL)
  const handleJurusanChange = useCallback((val: string) => {
    setSelectedJurusan(val);
    setSelectedPembimbing('ALL');
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

  // Ekstraksi Daftar Pembimbing Unik dari Jurusan yang terpilih (O(N) Single-Pass)
  const pembimbingSummaryList = useMemo(() => {
    const map = new Map<string, {
      nama: string;
      id?: string | null;
      totalSiswa: number;
      sudahDinilai: number;
      belumDinilai: number;
      scoredCount: number;
      totalNilai: number;
    }>();

    for (let i = 0; i < jurusanFilteredScores.length; i++) {
      const s = jurusanFilteredScores[i];
      const nama = s.pembimbing_nama ? s.pembimbing_nama.trim() : 'Belum Diploting';
      let existing = map.get(nama);
      if (!existing) {
        existing = {
          nama,
          id: s.pembimbing_id,
          totalSiswa: 0,
          sudahDinilai: 0,
          belumDinilai: 0,
          scoredCount: 0,
          totalNilai: 0,
        };
        map.set(nama, existing);
      }

      existing.totalSiswa += 1;

      // Status penilaian DUDI wajib memeriksa kelengkapan 8 komponen nilai + Nama Pimpinan + Nama Instruktur
      const dudiCheck = evaluateDudiCompleteness(s);
      if (dudiCheck.avgScore !== null) {
        existing.scoredCount += 1;
        existing.totalNilai += dudiCheck.avgScore;
      }
      if (dudiCheck.isComplete) {
        existing.sudahDinilai += 1;
      } else {
        existing.belumDinilai += 1;
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

  // Options Pembimbing untuk Dropdown
  const pembimbingDropdownOptions = useMemo(() => {
    const opts = [
      { value: 'ALL', label: `Semua Pembimbing (${pembimbingSummaryList.length} Guru)` },
    ];
    for (let i = 0; i < pembimbingSummaryList.length; i++) {
      const p = pembimbingSummaryList[i];
      opts.push({
        value: p.nama,
        label: `${p.nama} (${p.sudahDinilai}/${p.totalSiswa}${p.isComplete ? ' ✓' : ''})`,
      });
    }
    return opts;
  }, [pembimbingSummaryList]);

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
    title: 'Colek WhatsApp Guru Pembimbing',
    subtitle: 'Kirim pesan pengingat pengisian nilai sidang & PKL',
    defaultMessage: '',
    defaultRecipientType: 'GURU',
  });

  // Handler: Colek Single Pembimbing PKL
  const handleColekPembimbing = useCallback((pembimbing: {
    nama: string;
    id?: string | null;
    totalSiswa: number;
    sudahDinilai: number;
    belumDinilai: number;
  }) => {
    const rawTargetPhone = pembimbing.id ? guruPhoneMap.get(pembimbing.id) : undefined;
    const phone = rawTargetPhone || guruPhoneMap.get(pembimbing.nama.trim().toLowerCase()) || '';
    const senderName = user?.full_name || 'Ketua Program Keahlian';
    const deptName = activeJurusanNama || 'Kejuruan';

    // Cari siswa bimbingan dari pembimbing ini yang belum selesai dinilai lengkap (8 aspek + pimpinan + instruktur)
    const unassessedStudents = jurusanFilteredScores.filter((s) => {
      const nama = s.pembimbing_nama ? s.pembimbing_nama.trim() : 'Belum Diploting';
      if (nama !== pembimbing.nama) return false;
      return !evaluateDudiCompleteness(s).isComplete;
    });

    const studentListFormatted = unassessedStudents
      .map((s, idx) => {
        const check = evaluateDudiCompleteness(s);
        const missingNote = check.missingItems.length > 0 ? ` — _Kurang: ${check.missingItems.join(', ')}_` : '';
        return `  ${idx + 1}. *${s.nama_siswa}* (${s.nama_kelas || '-'} • ${s.mitra_nama || '-'})${missingNote}`;
      })
      .join('\n');

    const studentListSection = studentListFormatted
      ? `\n\n*Daftar Siswa Bimbingan yang Belum Dinilai (${unassessedStudents.length} siswa):*\n${studentListFormatted}\n`
      : '';

    const message = `Yth. Bapak/Ibu *${pembimbing.nama}*,

Mengingatkan perihal penginputan *Nilai Sidang & Capaian PKL* peserta didik Jurusan *${deptName}*.
Saat ini tercatat masih ada *${pembimbing.belumDinilai} dari ${pembimbing.totalSiswa} siswa* bimbingan Anda yang belum tuntas dinilai.${studentListSection}
Mohon kesediaannya untuk segera melengkapi penilaian melalui Meja Bimbingan / Menu Penilaian PKL pada aplikasi Absenta:
${window.location.origin}/dashboard?tab=pembimbing_pkl

Atas perhatian dan kerjasamanya, kami sampaikan terima kasih.
— _Ketua Program Keahlian ${deptName} (${senderName})_`;

    setWaModalConfig({
      isOpen: true,
      title: `Colek WhatsApp: ${pembimbing.nama}`,
      subtitle: `Kirim pengingat nilai PKL (${pembimbing.belumDinilai} siswa belum dinilai)`,
      defaultMessage: message,
      defaultRecipientType: phone ? 'GURU' : 'MANUAL',
      defaultRecipientTarget: phone,
      defaultRecipientLabel: pembimbing.nama,
    });
  }, [guruPhoneMap, user, activeJurusanNama, jurusanFilteredScores]);

  // Handler: Colek Semua Pembimbing via Grup WA
  const handleColekSemuaPembimbingGrup = useCallback(() => {
    const belumLengkapList = pembimbingSummaryList.filter(
      (p) => p.nama !== 'Belum Diploting' && p.belumDinilai > 0
    );

    if (belumLengkapList.length === 0) {
      toast.success('Luar biasa! Seluruh guru pembimbing sudah menyelesaikan penilaian PKL.');
      return;
    }

    const senderName = user?.full_name || 'Ketua Program Keahlian';
    const deptName = activeJurusanNama || 'Kejuruan';

    const listText = belumLengkapList
      .map((p, idx) => `${idx + 1}. *${p.nama}* (${p.belumDinilai} dari ${p.totalSiswa} siswa belum dinilai)`)
      .join('\n');

    const message = `*PENGINGAT PENILAIAN & SIDANG PKL*
Jurusan: *${deptName}*

Yth. Bapak/Ibu Guru Pembimbing PKL,
Mengingatkan rekapitulasi progres penilaian sidang & PKL yang saat ini masih perlu dilengkapi:

${listText}

Mohon kesediaan Bapak/Ibu untuk segera menginput nilai melalui sistem Absenta:
${window.location.origin}/dashboard?tab=pembimbing_pkl

Terima kasih atas dedikasi dan kerjasamanya.
— _Ketua Program Keahlian ${deptName} (${senderName})_`;

    setWaModalConfig({
      isOpen: true,
      title: 'Colek Seluruh Pembimbing PKL (Grup WhatsApp)',
      subtitle: `Pilih grup sekolah / grup jurusan untuk menyiarkan rekapitulasi ${belumLengkapList.length} pembimbing belum tuntas`,
      defaultMessage: message,
      defaultRecipientType: 'GROUP',
      defaultRecipientTarget: '',
      defaultRecipientLabel: 'Grup WhatsApp Guru / PKL',
    });
  }, [pembimbingSummaryList, user, activeJurusanNama]);

  // Handler: Colek Single Student (Row Table)
  const handleColekSingleStudent = useCallback((score: ScoreRow) => {
    const pembimbingNama = score.pembimbing_nama || 'Guru Pembimbing';
    const phone = (score.pembimbing_id ? guruPhoneMap.get(score.pembimbing_id) : undefined) || guruPhoneMap.get(pembimbingNama.trim().toLowerCase()) || '';
    const senderName = user?.full_name || 'Ketua Program Keahlian';
    const deptName = activeJurusanNama || score.nama_jurusan || 'Kejuruan';
    const dudiCheck = evaluateDudiCompleteness(score);
    const missingLine = dudiCheck.missingItems.length > 0
      ? `\n• *Komponen Belum Lengkap*: ${dudiCheck.missingItems.join(', ')}`
      : '';

    const message = `Yth. Bapak/Ibu *${pembimbingNama}*,

Mengingatkan penginputan *Nilai & Identitas DUDI PKL* untuk siswa:
• *Nama*: ${score.nama_siswa} (NIS: ${score.nis || '-'})
• *Kelas*: ${score.nama_kelas || '-'}
• *Mitra DUDI*: ${score.mitra_nama || '-'}${missingLine}

Data penilaian untuk siswa tersebut saat ini belum lengkap di sistem Absenta. Mohon kesediaannya untuk melengkapi seluruh 8 aspek nilai DUDI beserta Nama Pimpinan & Nama Instruktur pada menu Meja Bimbingan PKL:
${window.location.origin}/dashboard?tab=pembimbing_pkl

Terima kasih.
— _Ketua Program Keahlian ${deptName} (${senderName})_`;

    setWaModalConfig({
      isOpen: true,
      title: `Colek WhatsApp: ${pembimbingNama}`,
      subtitle: `Kirim pengingat nilai PKL khusus siswa: ${score.nama_siswa}`,
      defaultMessage: message,
      defaultRecipientType: phone ? 'GURU' : 'MANUAL',
      defaultRecipientTarget: phone,
      defaultRecipientLabel: pembimbingNama,
    });
  }, [guruPhoneMap, user, activeJurusanNama]);

  // Filter Lengkap
  const fullyFilteredScores = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();

    return jurusanFilteredScores.filter((s) => {
      // Filter Pembimbing
      if (selectedPembimbing !== 'ALL') {
        const pNama = s.pembimbing_nama ? s.pembimbing_nama.trim() : 'Belum Diploting';
        if (pNama !== selectedPembimbing) return false;
      }

      // Filter Kelas
      if (activeSelectedKelas && s.kelas_id !== activeSelectedKelas && s.nama_kelas !== activeSelectedKelas) {
        return false;
      }

      // Filter Status Nilai DUDI (Wajib Lengkap 8 Komponen Nilai + Pimpinan + Instruktur)
      const dudiCheck = evaluateDudiCompleteness(s);
      if (statusFilter === 'SUDAH' && !dudiCheck.isComplete) return false;
      if (statusFilter === 'BELUM' && dudiCheck.isComplete) return false;

      // Filter Search
      if (q) {
        const matchNama = s.nama_siswa?.toLowerCase().includes(q);
        const matchNis = s.nis?.toLowerCase().includes(q);
        const matchKelas = s.nama_kelas?.toLowerCase().includes(q);
        const matchMitra = s.mitra_nama?.toLowerCase().includes(q);
        const matchPembimbing = s.pembimbing_nama?.toLowerCase().includes(q);
        const matchPimpinan = s.penanggung_jawab_nama?.toLowerCase().includes(q);
        const matchInstruktur = s.instruktur_nama?.toLowerCase().includes(q);
        if (!matchNama && !matchNis && !matchKelas && !matchMitra && !matchPembimbing && !matchPimpinan && !matchInstruktur) return false;
      }

      return true;
    });
  }, [jurusanFilteredScores, selectedPembimbing, activeSelectedKelas, statusFilter, deferredSearchQuery]);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. STATISTIK KPI
  // ───────────────────────────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const list = fullyFilteredScores;
    const total = list.length;
    let lengkap = 0;
    let belum = 0;
    let scoredCount = 0;
    let totalScore = 0;
    let siapCetak = 0;

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const dudiCheck = evaluateDudiCompleteness(s);
      if (dudiCheck.avgScore !== null) {
        scoredCount += 1;
        totalScore += dudiCheck.avgScore;
      }
      if (dudiCheck.isComplete) {
        lengkap += 1;
      } else {
        belum += 1;
      }

      if (dudiCheck.isComplete && s.nilai_akhir_pkl !== null && s.nilai_akhir_pkl !== undefined && Number(s.nilai_akhir_pkl) > 0) {
        siapCetak += 1;
      }
    }

    const persentase = total > 0 ? Math.round((lengkap / total) * 100) : 0;
    const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : '-';
    const siapCetakPersen = total > 0 ? Math.round((siapCetak / total) * 100) : 0;

    return {
      total,
      lengkap,
      belum,
      persentase,
      avgScore,
      siapCetak,
      siapCetakPersen,
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
  const handleOpenCetak = useCallback((type: PklDudiDocType, specificPembimbing?: string) => {
    setCetakDocType(type);
    setTargetPembimbingNama(specificPembimbing || (selectedPembimbing !== 'ALL' ? selectedPembimbing : ''));
    setShowCetakModal(true);
  }, [selectedPembimbing]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. MODE KOREKSI HANDLER (KHUSUS KAPROG - WAKA HUBIN DILARANG)
  // ───────────────────────────────────────────────────────────────────────────
  const handleScoreAspectChange = useCallback((siswaPklId: string, field: string, rawVal: string) => {
    if (!isEligibleForKoreksi || !isModeKoreksi) return;

    if (field === 'penanggung_jawab_nama' || field === 'instruktur_nama') {
      setEditDrafts((prev) => {
        const currentStudentDraft = prev[siswaPklId] || {};
        return {
          ...prev,
          [siswaPklId]: {
            ...currentStudentDraft,
            [field]: rawVal,
          },
        };
      });
      return;
    }

    let val: number | null = null;
    if (rawVal !== '' && rawVal !== null && rawVal !== undefined) {
      const num = parseFloat(rawVal);
      if (!isNaN(num)) {
        val = Math.min(100, Math.max(0, num));
      }
    }

    setEditDrafts((prev) => {
      const currentStudentDraft = prev[siswaPklId] || {};
      return {
        ...prev,
        [siswaPklId]: {
          ...currentStudentDraft,
          [field]: val,
        },
      };
    });
  }, [isEligibleForKoreksi, isModeKoreksi]);

  const handleSaveKoreksiBatch = useCallback(async () => {
    if (!isEligibleForKoreksi || !hasUnsavedChanges || isSavingKoreksi) return;

    setIsSavingKoreksi(true);
    try {
      const dirtyIds = Object.keys(editDrafts);
      const payloadScores = dirtyIds.map((id) => {
        const original = scores.find((s) => s.siswa_pkl_id === id) || ({} as Partial<ScoreRow>);
        const draft = editDrafts[id] || {};
        const merged = { ...original, ...draft };

        return {
          siswa_pkl_id: id,
          hard_kompetensi_teknis: merged.hard_kompetensi_teknis ?? null,
          hard_sop_k3lh: merged.hard_sop_k3lh ?? null,
          hard_alur_bisnis: merged.hard_alur_bisnis ?? null,
          soft_kedisiplinan: merged.soft_kedisiplinan ?? null,
          soft_kerajinan_inisiatif: merged.soft_kerajinan_inisiatif ?? null,
          soft_kerjasama: merged.soft_kerjasama ?? null,
          soft_kejujuran: merged.soft_kejujuran ?? null,
          soft_tanggung_jawab: merged.soft_tanggung_jawab ?? null,
          instruktur_nama: merged.instruktur_nama,
          penanggung_jawab_nama: merged.penanggung_jawab_nama,
          alamat_dudi: merged.alamat_dudi,
          tahun_pelajaran_id: selectedTp || undefined,
          semester_id: selectedSemester || undefined,
        };
      });

      await hubinApi.upsertNilaiPklBatch({
        scores: payloadScores,
        tahun_pelajaran_id: selectedTp || undefined,
        semester_id: selectedSemester || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });

      toast.success(`Berhasil menyimpan koreksi nilai PKL untuk ${dirtyIds.length} siswa!`);
      setEditDrafts({});
    } catch (err: any) {
      console.error('Gagal menyimpan koreksi nilai PKL:', err);
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan koreksi nilai PKL';
      toast.error(msg);
    } finally {
      setIsSavingKoreksi(false);
    }
  }, [isEligibleForKoreksi, hasUnsavedChanges, isSavingKoreksi, editDrafts, scores, selectedTp, selectedSemester, queryClient]);

  const modalScores = useMemo(() => {
    const base = targetPembimbingNama
      ? jurusanFilteredScores.filter((s) => s.pembimbing_nama === targetPembimbingNama)
      : fullyFilteredScores;
    return base.map((s) => {
      const draft = editDrafts[s.siswa_pkl_id];
      return draft ? { ...s, ...draft } : s;
    });
  }, [targetPembimbingNama, jurusanFilteredScores, fullyFilteredScores, editDrafts]);

  return (
    <div className="space-y-3">
      {/* ── ALUR FILTER BERJENJANG (Step 1: Jurusan -> Step 2: Pembimbing) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-center">
          {/* STEP 1: FILTER JURUSAN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                  1
                </span>
                <span>Program Keahlian / Jurusan</span>
              </label>
              {selectedJurusan !== 'ALL' && !isKaprog && (
                <button
                  type="button"
                  onClick={() => handleJurusanChange('ALL')}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Reset Jurusan
                </button>
              )}
            </div>

            {isKaprog && propJurusanId ? (
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="truncate">{activeJurusanNama}</span>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
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

          {/* STEP 2: FILTER PEMBIMBING */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                  2
                </span>
                <span>Guru Pembimbing PKL</span>
              </label>
              {selectedPembimbing !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedPembimbing('ALL')}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Semua Pembimbing
                </button>
              )}
            </div>

            <SearchableSelect
              value={selectedPembimbing}
              onChange={(val) => setSelectedPembimbing(val)}
              options={pembimbingDropdownOptions}
              placeholder="Pilih Guru Pembimbing..."
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
              Peserta PKL
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
              Sudah Dinilai (Avg: {kpiStats.avgScore})
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
              Menunggu Nilai DUDI
            </div>
          </div>

          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 leading-none">
              {kpiStats.siapCetak}
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({kpiStats.siapCetakPersen}%)
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Siap Cetak Rapor
            </div>
          </div>
        </div>
      </HubCard>

      {/* ── Matriks Pembimbing Bersih (Klik Kartu Untuk Filter Pembimbing) ── */}
      <HubCard
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Progres Guru Pembimbing PKL ({pembimbingSummaryList.length})
                {selectedJurusan !== 'ALL' && (
                  <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5 hidden sm:inline">
                    • {activeJurusanNama}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pembimbingSummaryList.some((p) => p.nama !== 'Belum Diploting' && p.belumDinilai > 0) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleColekSemuaPembimbingGrup}
                  className="h-7 px-2.5 text-[11px] font-bold gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs cursor-pointer"
                  title="Kirim pengingat input nilai sidang & PKL ke pembimbing yang belum tuntas via Grup WhatsApp"
                >
                  <MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Colek Semua Pembimbing (Grup WA)</span>
                  <span className="sm:hidden">Colek Grup</span>
                </Button>
              ) : (
                <div className="h-7 px-2.5 text-[11px] font-bold gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-100/50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center shadow-2xs select-none">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Semua Pembimbing Tuntas ✓</span>
                </div>
              )}

              {selectedPembimbing !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedPembimbing('ALL')}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
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
            {pembimbingSummaryList.map((pembimbing) => {
              const isSelected = selectedPembimbing === pembimbing.nama;
              return (
                <div
                  key={pembimbing.nama}
                  onClick={() => setSelectedPembimbing(isSelected ? 'ALL' : pembimbing.nama)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer relative select-none",
                    isSelected
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-2xs ring-2 ring-emerald-500/20"
                      : "bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-300 hover:bg-slate-50/50"
                  )}
                  title={`Klik untuk memfilter daftar siswa khusus pembimbing ${pembimbing.nama}`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "font-bold text-xs truncate",
                        isSelected ? "text-emerald-900 dark:text-emerald-200" : "text-slate-900 dark:text-slate-100"
                      )}>
                        {pembimbing.nama}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {pembimbing.sudahDinilai} dari {pembimbing.totalSiswa} siswa dinilai
                      </div>
                    </div>

                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0",
                      pembimbing.isComplete
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : pembimbing.sudahDinilai > 0
                        ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    )}>
                      {pembimbing.persentase}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        pembimbing.isComplete ? "bg-emerald-500" : "bg-emerald-600"
                      )}
                      style={{ width: `${pembimbing.persentase}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-750">
                    <span>Avg Nilai: <strong className="text-slate-700 dark:text-slate-200">{pembimbing.avgNilai}</strong></span>
                    <div className="flex items-center gap-1.5">
                      {pembimbing.nama !== 'Belum Diploting' && (
                        pembimbing.belumDinilai > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleColekPembimbing(pembimbing);
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title={`Colek WhatsApp ${pembimbing.nama} untuk ${pembimbing.belumDinilai} siswa yang belum dinilai`}
                          >
                            <MessageCircle size={10} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Colek WA ({pembimbing.belumDinilai})</span>
                          </button>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700 text-[9px] font-bold flex items-center gap-1 cursor-default select-none shadow-2xs"
                            title={`Luar biasa! Seluruh ${pembimbing.totalSiswa} siswa bimbingan telah tuntas dinilai.`}
                          >
                            <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Tuntas ✓</span>
                          </span>
                        )
                      )}
                      {isSelected && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ Terpilih
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

      {/* ── Tabel Detail Peserta PKL dengan Aksi Cetak di Header ── */}
      <HubCard noPadding className="w-full">
        {/* Header Tabel & Aksi Cetak Terpusat */}
        <div className="p-3 sm:px-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850/50">
          {/* Sisi Kiri: Judul Tabel & Scope Aktif */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Daftar Siswa PKL ({fullyFilteredScores.length})
              </span>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/80 dark:border-slate-700/80">
              {selectedJurusan !== 'ALL' ? activeJurusanNama : 'Semua Jurusan'}
              {selectedPembimbing !== 'ALL' ? ` • ${selectedPembimbing}` : ''}
            </span>
          </div>

          {/* Sisi Kanan: AKSI CETAK RESMI DI HEADER TABEL & MODE KOREKSI KAPROG */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
            {/* Tombol Simpan Koreksi (muncul jika ada perubahan belum disimpan) */}
            {isEligibleForKoreksi && isModeKoreksi && hasUnsavedChanges && (
              <Button
                type="button"
                onClick={handleSaveKoreksiBatch}
                disabled={isSavingKoreksi}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-8 px-3.5 flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse"
                title="Simpan seluruh perubahan nilai aspek DUDI ke server"
              >
                {isSavingKoreksi ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Simpan Koreksi ({unsavedCount})</span>
              </Button>
            )}

            {/* Tombol Toggle Mode Koreksi (Khusus Kaprog - Waka Hubin Dilarang) */}
            {isEligibleForKoreksi && (
              <Button
                type="button"
                onClick={() => {
                  if (isModeKoreksi && hasUnsavedChanges) {
                    if (window.confirm('Ada perubahan nilai koreksi yang belum disimpan. Yakin ingin keluar? Perubahan belum tersimpan akan dibatalkan.')) {
                      setEditDrafts({});
                      setIsModeKoreksi(false);
                    }
                  } else {
                    setIsModeKoreksi((prev) => !prev);
                  }
                }}
                className={cn(
                  "rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all",
                  isModeKoreksi
                    ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400/40"
                    : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                )}
                title={isModeKoreksi ? "Kunci lembar penilaian (Selesai koreksi)" : "Buka mode koreksi nilai aspek DUDI (Khusus Kaprog)"}
              >
                {isModeKoreksi ? (
                  <>
                    <Lock size={13} />
                    <span>Kunci Koreksi</span>
                  </>
                ) : (
                  <>
                    <Edit3 size={13} />
                    <span>Mode Koreksi</span>
                  </>
                )}
              </Button>
            )}

            <div className="relative" ref={printDropdownRef}>
              <Button
                type="button"
                onClick={() => setIsPrintDropdownOpen((prev) => !prev)}
                disabled={fullyFilteredScores.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-8 px-3.5 flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer size={13} />
                <span>
                  {selectedPembimbing !== 'ALL' ? `Cetak (${selectedPembimbing})` : 'Cetak Berkas DUDI'}
                </span>
                <ChevronDown size={13} className={cn("transition-transform duration-200", isPrintDropdownOpen ? "rotate-180" : "")} />
              </Button>

              {/* Menu Dropdown Cetak Dokumen Resmi */}
              {isPrintDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold truncate">
                    Scope: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedPembimbing !== 'ALL' ? selectedPembimbing : (selectedJurusan !== 'ALL' ? activeJurusanNama : 'Seluruh Sekolah')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      handleOpenCetak('REKAP_DUDI');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <Award size={14} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Rekap Nilai PKL Industri</div>
                      <div className="text-[10px] text-slate-400">Lembar rekapitulasi nilai resmi</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintDropdownOpen(false);
                      handleOpenCetak('BLANKO_PENILAIAN');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <FileText size={14} className="text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold">Blanko Instrumen DUDI</div>
                      <div className="text-[10px] text-slate-400">Format kosong penilaian instruktur</div>
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

        {/* Banner Notifikasi Mode Koreksi Kaprog Aktif */}
        {isEligibleForKoreksi && isModeKoreksi && (
          <div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Mode Koreksi Kaprog Aktif:</strong> Anda berwenang mengoreksi nilai aspek DUDI siswa jurusan <strong>{activeJurusanNama}</strong>. Masukkan nilai (0-100), lalu klik <strong>Simpan Koreksi</strong>.
              </span>
            </div>
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset semua draft koreksi yang belum disimpan?')) {
                    setEditDrafts({});
                  }
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Reset Draft ({unsavedCount})</span>
              </button>
            )}
          </div>
        )}

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
                onClick={() => setStatusFilter('SUDAH')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                  statusFilter === 'SUDAH'
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700"
                )}
              >
                Sudah Dinilai
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
                Belum Dinilai
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari siswa / NIS / mitra / pembimbing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {fullyFilteredScores.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Tidak ada siswa PKL yang sesuai dengan filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[175px]">Siswa &amp; Kelas</th>
                  <th className="py-2.5 px-3 min-w-[145px]">Mitra DU/DI</th>
                  <th className="py-2.5 px-3 min-w-[140px]" title="Nama Pemilik / Pimpinan DUDI">Pimpinan DUDI</th>
                  <th className="py-2.5 px-3 min-w-[140px]" title="Nama Instruktur Lapangan DUDI">Instruktur</th>
                  <th className="py-2.5 px-3 min-w-[145px]">Guru Pembimbing</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Kompetensi Teknis">Teknis</th>
                  <th className="py-2.5 px-2 text-center w-12" title="SOP & K3LH">K3LH</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Alur Bisnis">Bisnis</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Kedisiplinan">Disiplin</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Kerajinan & Inisiatif">Inisiatif</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Kerjasama">K.Sama</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Kejujuran">Jujur</th>
                  <th className="py-2.5 px-2 text-center w-12" title="Tanggung Jawab">T.Jwb</th>
                  <th className="py-2.5 px-2 text-center w-16 bg-emerald-50/50 dark:bg-emerald-950/20">Rata2 DUDI</th>
                  <th className="py-2.5 px-3 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedScores.map((score, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const draft = editDrafts[score.siswa_pkl_id];
                  const mergedScore = (draft ? { ...score, ...draft } : score) as ScoreRow;
                  const isRowEdited = Boolean(draft && Object.keys(draft).length > 0);

                  const dudiCheck = evaluateDudiCompleteness(mergedScore);
                  const studentAvg = dudiCheck.avgScore !== null ? dudiCheck.avgScore.toFixed(1) : '-';
                  const isFullyComplete = dudiCheck.isComplete;

                  const aspectColumns: Array<{ key: keyof ScoreRow; title: string }> = [
                    { key: 'hard_kompetensi_teknis', title: 'Kompetensi Teknis' },
                    { key: 'hard_sop_k3lh', title: 'SOP & K3LH' },
                    { key: 'hard_alur_bisnis', title: 'Alur Bisnis' },
                    { key: 'soft_kedisiplinan', title: 'Kedisiplinan' },
                    { key: 'soft_kerajinan_inisiatif', title: 'Kerajinan & Inisiatif' },
                    { key: 'soft_kerjasama', title: 'Kerjasama' },
                    { key: 'soft_kejujuran', title: 'Kejujuran' },
                    { key: 'soft_tanggung_jawab', title: 'Tanggung Jawab' },
                  ];

                  return (
                    <tr
                      key={score.siswa_pkl_id || idx}
                      className={cn(
                        "transition-colors",
                        isRowEdited
                          ? "bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50/80"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-400">
                        {globalIdx}
                      </td>

                      {/* Identitas Siswa */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{score.nama_siswa}</span>
                          {isRowEdited && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Ada nilai terkoreksi" />
                          )}
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
                        <div className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[155px]" title={score.mitra_nama}>
                          {score.mitra_nama || '-'}
                        </div>
                      </td>

                      {/* Nama Pimpinan DUDI */}
                      <td className="py-2 px-3">
                        {isModeKoreksi && isEligibleForKoreksi ? (
                          <input
                            type="text"
                            value={mergedScore.penanggung_jawab_nama || ''}
                            onChange={(e) => handleScoreAspectChange(score.siswa_pkl_id, 'penanggung_jawab_nama', e.target.value)}
                            placeholder="Nama Pimpinan..."
                            className="w-full h-7 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                          />
                        ) : dudiCheck.hasPimpinan ? (
                          <div className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]" title={mergedScore.penanggung_jawab_nama}>
                            {mergedScore.penanggung_jawab_nama}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 italic">
                            Belum diisi
                          </span>
                        )}
                      </td>

                      {/* Nama Instruktur Lapangan */}
                      <td className="py-2 px-3">
                        {isModeKoreksi && isEligibleForKoreksi ? (
                          <input
                            type="text"
                            value={mergedScore.instruktur_nama || ''}
                            onChange={(e) => handleScoreAspectChange(score.siswa_pkl_id, 'instruktur_nama', e.target.value)}
                            placeholder="Nama Instruktur..."
                            className="w-full h-7 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none"
                          />
                        ) : dudiCheck.hasInstruktur ? (
                          <div className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]" title={mergedScore.instruktur_nama}>
                            {mergedScore.instruktur_nama}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 italic">
                            Belum diisi
                          </span>
                        )}
                      </td>

                      {/* Pembimbing */}
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[135px]" title={score.pembimbing_nama}>
                            {score.pembimbing_nama || <span className="text-amber-500 italic">Belum Diploting</span>}
                          </div>
                          {score.pembimbing_nama && !isFullyComplete && (
                            <button
                              type="button"
                              onClick={() => handleColekSingleStudent(score)}
                              className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0 transition-colors cursor-pointer"
                              title={`Colek Pembimbing (${score.pembimbing_nama}) via WhatsApp untuk melengkapi ${dudiCheck.missingItems.join(', ')}`}
                            >
                              <MessageCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 8 Kolom Aspek DUDI: Normal atau Editable saat Mode Koreksi */}
                      {aspectColumns.map(({ key, title }) => {
                        const currentVal = mergedScore[key] as number | null | undefined;
                        const isFieldEdited = draft && draft[key as string] !== undefined;

                        if (isModeKoreksi && isEligibleForKoreksi) {
                          return (
                            <td key={key as string} className="py-1 px-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={currentVal !== null && currentVal !== undefined ? currentVal : ''}
                                onChange={(e) => handleScoreAspectChange(score.siswa_pkl_id, key as string, e.target.value)}
                                className={cn(
                                  "w-12 h-7 text-center font-mono text-xs font-bold rounded border transition-colors outline-none",
                                  isFieldEdited
                                    ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/40"
                                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                )}
                                placeholder="-"
                                title={`${title}: ${score.nama_siswa}`}
                              />
                            </td>
                          );
                        }

                        return (
                          <td key={key as string} className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                            {currentVal ?? '-'}
                          </td>
                        );
                      })}

                      {/* Rata-rata DUDI */}
                      <td className={cn(
                        "py-2 px-2 text-center font-bold font-mono text-xs",
                        isRowEdited
                          ? "bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                          : "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300"
                      )}>
                        {studentAvg}
                      </td>

                      {/* Status Nilai */}
                      <td className="py-2 px-3 text-center">
                        {isRowEdited ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Terkoreksi
                          </span>
                        ) : isFullyComplete ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 inline-block"
                            title="Seluruh 8 komponen nilai DUDI, Nama Pimpinan, dan Nama Instruktur telah lengkap"
                          >
                            Sudah Dinilai
                          </span>
                        ) : dudiCheck.isPartial ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 inline-block"
                              title={`Belum lengkap: ${dudiCheck.missingItems.join(', ')}`}
                            >
                              Belum Lengkap ({dudiCheck.filledScoresCount}/8)
                            </span>
                            {(!dudiCheck.hasPimpinan || !dudiCheck.hasInstruktur) && (
                              <span className="text-[9px] font-semibold text-rose-500 dark:text-rose-400 leading-tight">
                                {!dudiCheck.hasPimpinan && !dudiCheck.hasInstruktur
                                  ? 'Pimpinan & Instruktur kosong'
                                  : !dudiCheck.hasPimpinan
                                  ? 'Pimpinan kosong'
                                  : 'Instruktur kosong'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 inline-block"
                            title={`Belum diisi: ${dudiCheck.missingItems.join(', ')}`}
                          >
                            Belum Dinilai
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

        {/* Paginasi Ramping */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Halaman {currentPage} dari {totalPages} ({fullyFilteredScores.length} siswa)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </HubCard>

      {/* ── Modal Cetak Berkas DUDI ── */}
      {showCetakModal && (
        <PklDudiCetakModal
          isOpen={showCetakModal}
          onClose={() => setShowCetakModal(false)}
          initialDocType={cetakDocType}
          scores={modalScores}
          jurusanId={selectedJurusan !== 'ALL' ? selectedJurusan : propJurusanId}
          jurusanNama={selectedJurusan !== 'ALL' ? activeJurusanNama : propJurusanNama}
          selectedTpNama={selectedTpNama}
          selectedSemesterNama={selectedSemesterNama}
          activePembimbingNama={targetPembimbingNama || (selectedPembimbing !== 'ALL' ? selectedPembimbing : '')}
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

PklMonitoringDudiTab.displayName = 'PklMonitoringDudiTab';
export default PklMonitoringDudiTab;
