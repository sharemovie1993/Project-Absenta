import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  Users,
  Award,
  ArrowRight,
  SlidersHorizontal,
  GraduationCap,
  Info,
  ShieldCheck,
  Layers,
  Eye,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  pembinaUpacaraApi,
  AutoGenerateUpacaraPayload,
  CandidateWakaItem,
  CandidateWaliItem,
  CandidateGuruBiasaItem,
} from '@/api/attendance/pembinaUpacara.api';
import type { WaliKelasStrukturAssignment } from '@/types/academic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AutoGenerateUpacaraPayload) => Promise<void>;
  waliKelasList?: WaliKelasStrukturAssignment[];
  guruList: Array<{ id: string; nama_guru: string; nip?: string | null }>;
  classList: Array<{ id: string; nama_kelas: string }>;
  tahunPelajaranId: string;
  semesterId?: string;
  academicContextLabel?: string;
}

type ActiveTab = 'WAKA' | 'WALIKELAS' | 'GURU_BIASA' | 'PREVIEW';
type WaliSortOrder = 'TINGKAT_ASC' | 'TINGKAT_DESC' | 'KELAS_ALPHA';
type RotationStrategy = 'WAKA_FIRST' | 'WALI_FIRST' | 'COMBINED';

export const AutoGenerateUpacaraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  waliKelasList: propWaliList = [],
  guruList,
  classList,
  tahunPelajaranId,
  semesterId,
  academicContextLabel,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('WAKA');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tanggal
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  // 3 Kelompok Kandidat
  const [wakaList, setWakaList] = useState<CandidateWakaItem[]>([]);
  const [waliList, setWaliList] = useState<CandidateWaliItem[]>([]);
  const [guruBiasaList, setGuruBiasaList] = useState<CandidateGuruBiasaItem[]>([]);

  // Selection State
  const [selectedWakaIds, setSelectedWakaIds] = useState<string[]>([]);
  const [selectedWaliIds, setSelectedWaliIds] = useState<string[]>([]);
  const [selectedGuruBiasaIds, setSelectedGuruBiasaIds] = useState<string[]>([]);

  // Toggles Kelompok
  const [includeWaka, setIncludeWaka] = useState(true);
  const [includeWaliKelas, setIncludeWaliKelas] = useState(true);
  const [includeGuruBiasa, setIncludeGuruBiasa] = useState(false);

  // Strategi Urutan & Pasangan
  const [rotationStrategy, setRotationStrategy] = useState<RotationStrategy>('WAKA_FIRST');
  const [waliSortOrder, setWaliSortOrder] = useState<WaliSortOrder>('TINGKAT_ASC');
  const [autoPairKelasPetugas, setAutoPairKelasPetugas] = useState(true);

  // Load candidate groups saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingCandidates(true);

    pembinaUpacaraApi
      .getCandidateGroups({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const { waka, waliKelas, guruBiasa } = res.data;
          setWakaList(waka || []);
          setSelectedWakaIds((waka || []).map((w) => w.guru_id));

          // Wali Kelas
          if (waliKelas && waliKelas.length > 0) {
            setWaliList(waliKelas);
            setSelectedWaliIds(waliKelas.map((w) => w.guru_id));
          } else {
            // Fallback dari props jika data dari server kosong
            const fallbackWali: CandidateWaliItem[] = propWaliList
              .filter((w) => Boolean(w.guru_id))
              .map((w) => ({
                id: w.id,
                guru_id: w.guru_id,
                nama_guru: w.Guru?.nama_guru || 'Guru Belum Terdaftar',
                nip: w.Guru?.nip || null,
                no_hp: w.Guru?.no_hp || null,
                kelas_id: w.StrukturOrganisasi?.kelas_id || w.StrukturOrganisasi?.Kelas?.id || null,
                nama_kelas: w.StrukturOrganisasi?.Kelas?.nama_kelas || 'Kelas Binaan',
                tingkat: w.StrukturOrganisasi?.Kelas?.tingkat || 10,
              }));
            setWaliList(fallbackWali);
            setSelectedWaliIds(fallbackWali.map((w) => w.guru_id));
          }

          // Guru Biasa
          if (guruBiasa && guruBiasa.length > 0) {
            setGuruBiasaList(guruBiasa);
            setSelectedGuruBiasaIds([]);
          } else {
            // Fallback: semua guru di luar wali
            const waliGuruIds = new Set(waliKelas.map((w) => w.guru_id));
            const fallbackBiasa = guruList
              .filter((g) => !waliGuruIds.has(g.id))
              .map((g) => ({
                guru_id: g.id,
                nama_guru: g.nama_guru,
                nip: g.nip || null,
                no_hp: null,
              }));
            setGuruBiasaList(fallbackBiasa);
            setSelectedGuruBiasaIds([]);
          }
        }
      })
      .catch(() => {
        // Fallback jika API gagal
        if (!isMounted) return;
        const fallbackWali: CandidateWaliItem[] = propWaliList
          .filter((w) => Boolean(w.guru_id))
          .map((w) => ({
            id: w.id,
            guru_id: w.guru_id,
            nama_guru: w.Guru?.nama_guru || 'Guru Belum Terdaftar',
            nip: w.Guru?.nip || null,
            no_hp: null,
            kelas_id: w.StrukturOrganisasi?.kelas_id || null,
            nama_kelas: w.StrukturOrganisasi?.Kelas?.nama_kelas || 'Kelas Binaan',
            tingkat: w.StrukturOrganisasi?.Kelas?.tingkat || 10,
          }));
        setWaliList(fallbackWali);
        setSelectedWaliIds(fallbackWali.map((w) => w.guru_id));

        const waliGuruIds = new Set(fallbackWali.map((w) => w.guru_id));
        const fallbackBiasa = guruList
          .filter((g) => !waliGuruIds.has(g.id))
          .map((g) => ({
            guru_id: g.id,
            nama_guru: g.nama_guru,
            nip: g.nip || null,
            no_hp: null,
          }));
        setGuruBiasaList(fallbackBiasa);
      })
      .finally(() => {
        if (isMounted) setLoadingCandidates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tahunPelajaranId, semesterId, propWaliList, guruList]);

  // Sorted Wali Items
  const sortedWaliItems = useMemo(() => {
    const list = [...waliList];
    if (waliSortOrder === 'TINGKAT_ASC') {
      list.sort((a, b) => a.tingkat - b.tingkat || a.nama_kelas.localeCompare(b.nama_kelas));
    } else if (waliSortOrder === 'TINGKAT_DESC') {
      list.sort((a, b) => b.tingkat - a.tingkat || a.nama_kelas.localeCompare(b.nama_kelas));
    } else if (waliSortOrder === 'KELAS_ALPHA') {
      list.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));
    }
    return list;
  }, [waliList, waliSortOrder]);

  // List Hari Senin dalam rentang semester
  const simulatedMondays = useMemo(() => {
    let start = tanggalMulai ? new Date(tanggalMulai) : new Date();
    let end: Date;
    if (tanggalSelesai) {
      end = new Date(tanggalSelesai);
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + 5);
    }

    const mondays: Date[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      if (current.getDay() === 1) {
        mondays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return mondays;
  }, [tanggalMulai, tanggalSelesai]);

  // Susunan Pembina Berdasarkan 3 Kelompok & Strategi Rotasi
  const orderedCandidatePairs = useMemo(() => {
    // 1. Ambil Waka Terpilih
    const activeWakas = includeWaka
      ? wakaList.filter((w) => selectedWakaIds.includes(w.guru_id))
      : [];
    // 2. Ambil Wali Kelas Terpilih
    const activeWalis = includeWaliKelas
      ? sortedWaliItems.filter((w) => selectedWaliIds.includes(w.guru_id))
      : [];
    // 3. Ambil Guru Biasa Terpilih
    const activeGuruBiasa = includeGuruBiasa
      ? guruBiasaList.filter((g) => selectedGuruBiasaIds.includes(g.guru_id))
      : [];

    type CandidatePair = {
      guru_id: string;
      nama_guru: string;
      nip: string | null;
      role_label: string;
      role_type: 'WAKA' | 'WALIKELAS' | 'GURU_BIASA';
      kelas_id: string | null;
      nama_kelas: string | null;
    };

    const wakaPairs: CandidatePair[] = activeWakas.map((w) => ({
      guru_id: w.guru_id,
      nama_guru: w.nama_guru,
      nip: w.nip,
      role_label: w.jabatan,
      role_type: 'WAKA',
      kelas_id: null,
      nama_kelas: null,
    }));

    const waliPairs: CandidatePair[] = activeWalis.map((w) => ({
      guru_id: w.guru_id,
      nama_guru: w.nama_guru,
      nip: w.nip,
      role_label: `Wali Kelas ${w.nama_kelas}`,
      role_type: 'WALIKELAS',
      kelas_id: autoPairKelasPetugas ? w.kelas_id : null,
      nama_kelas: autoPairKelasPetugas ? w.nama_kelas : null,
    }));

    const biasaPairs: CandidatePair[] = activeGuruBiasa.map((g) => ({
      guru_id: g.guru_id,
      nama_guru: g.nama_guru,
      nip: g.nip,
      role_label: 'Guru Mata Pelajaran',
      role_type: 'GURU_BIASA',
      kelas_id: null,
      nama_kelas: null,
    }));

    let result: CandidatePair[] = [];
    if (rotationStrategy === 'WAKA_FIRST') {
      result = [...wakaPairs, ...waliPairs, ...biasaPairs];
    } else if (rotationStrategy === 'WALI_FIRST') {
      result = [...waliPairs, ...wakaPairs, ...biasaPairs];
    } else {
      // COMBINED / Campuran
      result = [...wakaPairs, ...waliPairs, ...biasaPairs];
    }

    return result;
  }, [
    includeWaka,
    includeWaliKelas,
    includeGuruBiasa,
    wakaList,
    sortedWaliItems,
    guruBiasaList,
    selectedWakaIds,
    selectedWaliIds,
    selectedGuruBiasaIds,
    rotationStrategy,
    autoPairKelasPetugas,
  ]);

  // Simulasi Jadwal Per Pekan (Mapping Hari Senin ke Candidate Pairs)
  const previewSchedule = useMemo(() => {
    if (orderedCandidatePairs.length === 0 || simulatedMondays.length === 0) return [];

    // Daftar kelas untuk fallback jika waka / guru biasa butuh petugas
    const availableClasses = classList.map((c) => ({ id: c.id, nama_kelas: c.nama_kelas }));

    return simulatedMondays.map((monday, index) => {
      const candidate = orderedCandidatePairs[index % orderedCandidatePairs.length];
      let assignedKelasId = candidate.kelas_id;
      let assignedKelasNama = candidate.nama_kelas;

      // Jika candidate tidak punya kelas langsung (Waka / Guru Biasa), rotasi kelas sekolah
      if (!assignedKelasId && availableClasses.length > 0) {
        const classPick = availableClasses[index % availableClasses.length];
        assignedKelasId = classPick.id;
        assignedKelasNama = classPick.nama_kelas;
      }

      return {
        pekan: index + 1,
        tanggal: monday,
        tanggalStr: monday.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        guru_id: candidate.guru_id,
        nama_guru: candidate.nama_guru,
        role_label: candidate.role_label,
        role_type: candidate.role_type,
        kelas_id: assignedKelasId,
        nama_kelas: assignedKelasNama,
      };
    });
  }, [simulatedMondays, orderedCandidatePairs, classList]);

  // Handlers Checkbox
  const handleToggleWaka = (id: string) => {
    setSelectedWakaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const handleToggleAllWaka = () => {
    if (selectedWakaIds.length === wakaList.length) setSelectedWakaIds([]);
    else setSelectedWakaIds(wakaList.map((w) => w.guru_id));
  };

  const handleToggleWali = (id: string) => {
    setSelectedWaliIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const handleToggleAllWali = () => {
    if (selectedWaliIds.length === waliList.length) setSelectedWaliIds([]);
    else setSelectedWaliIds(waliList.map((w) => w.guru_id));
  };

  const handleToggleGuruBiasa = (id: string) => {
    setSelectedGuruBiasaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const handleToggleAllGuruBiasa = () => {
    if (selectedGuruBiasaIds.length === guruBiasaList.length) setSelectedGuruBiasaIds([]);
    else setSelectedGuruBiasaIds(guruBiasaList.map((g) => g.guru_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewSchedule.length === 0) return;

    setSubmitting(true);
    try {
      const rotasiPairs = previewSchedule.map((p) => ({
        guru_id: p.guru_id,
        kelas_id: p.kelas_id,
      }));

      await onSubmit({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId || null,
        tanggal_mulai: tanggalMulai || undefined,
        tanggal_selesai: tanggalSelesai || undefined,
        rotasi_pairs: rotasiPairs,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Generate Giliran Pembina Upacara 1 Semester"
      size="full"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Penjelasan */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-blue-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <p className="font-bold">Generator Cerdas Multi-Kelompok (Waka ➔ Wali Kelas ➔ Guru Biasa)</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Susun giliran pembina upacara bendera semester ini dengan memprioritaskan <strong>Jajaran Waka</strong> di awal semester, dilanjutkan <strong>Wali Kelas</strong> bersama rombel binaannya, serta <strong>Guru Mata Pelajaran</strong> untuk memenuhi seluruh pekan.
              {academicContextLabel && (
                <span className="block mt-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  📍 Konteks Akademik: {academicContextLabel}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Baris Pengaturan Waktu & Strategi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Mulai (Opsional)
            </label>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400">Default: Hari ini / awal semester</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Selesai (Opsional)
            </label>
            <input
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400">Default: Rentang 1 semester (~5 bulan)</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alur Urutan Pembina
            </label>
            <select
              value={rotationStrategy}
              onChange={(e) => setRotationStrategy(e.target.value as RotationStrategy)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="WAKA_FIRST">Waka (Awal) ➔ Wali Kelas ➔ Guru Biasa</option>
              <option value="WALI_FIRST">Wali Kelas (Awal) ➔ Waka ➔ Guru Biasa</option>
              <option value="COMBINED">Campuran Proporsional</option>
            </select>
            <span className="text-[10px] text-indigo-500 font-semibold">
              🎯 Terdeteksi {simulatedMondays.length} hari Senin
            </span>
          </div>
        </div>

        {/* Navigasi Tab 3 Kelompok + Live Preview */}
        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('WAKA')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'WAKA'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>1. Para Waka</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              {includeWaka ? selectedWakaIds.length : 0}/{wakaList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WALIKELAS')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'WALIKELAS'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>2. Para Wali Kelas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {includeWaliKelas ? selectedWaliIds.length : 0}/{waliList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GURU_BIASA')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'GURU_BIASA'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span>3. Guru Biasa</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {includeGuruBiasa ? selectedGuruBiasaIds.length : 0}/{guruBiasaList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PREVIEW')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'PREVIEW'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preview Kalender ({previewSchedule.length} Pekan)</span>
          </button>
        </div>

        {/* ── TAB 1: KELOMPOK PARA WAKA ───────────────────────────────── */}
        {activeTab === 'WAKA' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100/60 dark:border-purple-900/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWaka}
                  onChange={(e) => setIncludeWaka(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="font-bold text-xs text-purple-900 dark:text-purple-200">
                    Sertakan Kelompok Para Waka dalam Giliran Pembina
                  </span>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                    Wakil Kepala Sekolah (Kurikulum, Kesiswaan, Sarpras, Hubin) bertugas di pekan-pekan awal semester.
                  </p>
                </div>
              </label>

              {includeWaka && wakaList.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllWaka}
                  className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline shrink-0"
                >
                  {selectedWakaIds.length === wakaList.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            {loadingCandidates ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat data Waka...</div>
            ) : wakaList.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Belum ada guru dengan penugasan Waka di Struktur Organisasi sekolah. Guru Waka dapat ditugaskan pada modul Struktur Organisasi.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
                {wakaList.map((item, idx) => {
                  const isSelected = selectedWakaIds.includes(item.guru_id) && includeWaka;
                  return (
                    <div
                      key={item.id}
                      onClick={() => includeWaka && handleToggleWaka(item.guru_id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs border transition cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800 shadow-2xs text-slate-800 dark:text-slate-100'
                          : 'border-transparent text-slate-400 opacity-60 hover:opacity-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="w-5 text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.nama_guru}
                          </p>
                          {item.nip && <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>}
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-full font-bold text-[11px] flex items-center gap-1">
                          <Award className="w-3 h-3 text-purple-500" />
                          {item.jabatan}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: KELOMPOK PARA WALI KELAS ──────────────────────────── */}
        {activeTab === 'WALIKELAS' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWaliKelas}
                  onChange={(e) => setIncludeWaliKelas(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                    Sertakan Kelompok Para Wali Kelas
                  </span>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                    Membina upacara bergiliran bersama kelas binaan masing-masing.
                  </p>
                </div>
              </label>

              {includeWaliKelas && waliList.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={waliSortOrder}
                      onChange={(e) => setWaliSortOrder(e.target.value as WaliSortOrder)}
                      className="px-2 py-0.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <option value="TINGKAT_ASC">Tingkat X ➔ XII</option>
                      <option value="TINGKAT_DESC">Tingkat XII ➔ X</option>
                      <option value="KELAS_ALPHA">Abjad Nama Kelas</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAllWali}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0"
                  >
                    {selectedWaliIds.length === waliList.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>
              )}
            </div>

            {/* Toggle Otomatis Pasangkan Kelas Binaan */}
            {includeWaliKelas && (
              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPairKelasPetugas}
                  onChange={(e) => setAutoPairKelasPetugas(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Otomatis Pasangkan Kelas Binaan Wali Kelas sebagai Petugas Upacara (Pengibar/MC/Padus)
                </span>
              </label>
            )}

            {waliList.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Belum ada data penugasan Wali Kelas pada tahun pelajaran ini.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
                {sortedWaliItems.map((item, idx) => {
                  const isSelected = selectedWaliIds.includes(item.guru_id) && includeWaliKelas;
                  return (
                    <div
                      key={item.id}
                      onClick={() => includeWaliKelas && handleToggleWali(item.guru_id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs border transition cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 shadow-2xs text-slate-800 dark:text-slate-100'
                          : 'border-transparent text-slate-400 opacity-60 hover:opacity-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="w-5 text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.nama_guru}
                          </p>
                          {item.nip && <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>}
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded font-bold text-[11px]">
                          Wali Kelas: {item.nama_kelas}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: KELOMPOK GURU BIASA ──────────────────────────────── */}
        {activeTab === 'GURU_BIASA' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGuruBiasa}
                  onChange={(e) => setIncludeGuruBiasa(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-700 focus:ring-slate-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Sertakan Kelompok Guru Mata Pelajaran / Guru Biasa
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Guru-guru yang bukan Waka dan bukan Wali Kelas untuk melengkapi sisa pekan upacara.
                  </p>
                </div>
              </label>

              {includeGuruBiasa && guruBiasaList.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllGuruBiasa}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0"
                >
                  {selectedGuruBiasaIds.length === guruBiasaList.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            {guruBiasaList.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Semua guru aktif telah terdaftar sebagai Waka atau Wali Kelas.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
                {guruBiasaList.map((item, idx) => {
                  const isSelected = selectedGuruBiasaIds.includes(item.guru_id) && includeGuruBiasa;
                  return (
                    <div
                      key={item.guru_id}
                      onClick={() => includeGuruBiasa && handleToggleGuruBiasa(item.guru_id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs border transition cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-2xs text-slate-800 dark:text-slate-100 font-medium'
                          : 'border-transparent text-slate-400 opacity-60 hover:opacity-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="w-5 text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {item.nama_guru}
                          </p>
                          {item.nip && <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>}
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded text-[10px]">
                          Guru Mapel
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: PREVIEW KALENDER UPACARA ──────────────────────────── */}
        {activeTab === 'PREVIEW' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/60 dark:border-emerald-900/30 text-xs">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Simulasi Distribusi Jadwal ({previewSchedule.length} Pekan Hari Senin)
                </span>
              </div>
              <span className="text-slate-500 text-[11px]">
                Rotasi:{' '}
                <strong>
                  {includeWaka ? selectedWakaIds.length : 0} Waka +{' '}
                  {includeWaliKelas ? selectedWaliIds.length : 0} Wali Kelas +{' '}
                  {includeGuruBiasa ? selectedGuruBiasaIds.length : 0} Guru Biasa
                </strong>
              </span>
            </div>

            {previewSchedule.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Pilih minimal satu guru pembina di tab Waka, Wali Kelas, atau Guru Biasa untuk melihat simulasi.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
                {previewSchedule.map((item) => (
                  <div
                    key={item.pekan}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[11px] shrink-0 text-center w-12">
                        Pekan {item.pekan}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.nama_guru}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{item.tanggalStr}</span>
                          <span>•</span>
                          <span
                            className={
                              item.role_type === 'WAKA'
                                ? 'text-purple-600 dark:text-purple-400 font-semibold'
                                : item.role_type === 'WALIKELAS'
                                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                : 'text-slate-500 font-medium'
                            }
                          >
                            {item.role_label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {item.nama_kelas && (
                      <div className="shrink-0 pl-2">
                        <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[11px]">
                          Petugas: {item.nama_kelas}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            Total Pembina Terpilih:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {(includeWaka ? selectedWakaIds.length : 0) +
                (includeWaliKelas ? selectedWaliIds.length : 0) +
                (includeGuruBiasa ? selectedGuruBiasaIds.length : 0)}{' '}
              Guru
            </strong>{' '}
            untuk <strong>{previewSchedule.length} pekan</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || previewSchedule.length === 0}
              className="rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Mengenerate...' : 'Mulai Generate Jadwal'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
