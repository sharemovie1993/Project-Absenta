import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  Users,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  GraduationCap,
  ShieldCheck,
  Check,
  RotateCcw,
  Clock,
  Layers,
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

type WaliSortOrder = 'TINGKAT_ASC' | 'TINGKAT_DESC' | 'KELAS_ALPHA';
type RotationStrategy = 'WAKA_FIRST' | 'WALI_FIRST' | 'COMBINED';

interface StepDef {
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ReactNode;
}

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
  // Wizard Step State (1 s/d 4)
  const [currentStep, setCurrentStep] = useState<number>(1);

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

  // Reset step ke 1 saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

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
    const activeWakas = includeWaka
      ? wakaList.filter((w) => selectedWakaIds.includes(w.guru_id))
      : [];
    const activeWalis = includeWaliKelas
      ? sortedWaliItems.filter((w) => selectedWaliIds.includes(w.guru_id))
      : [];
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

  // Simulasi Jadwal Per Pekan
  const previewSchedule = useMemo(() => {
    if (orderedCandidatePairs.length === 0 || simulatedMondays.length === 0) return [];

    const availableClasses = classList.map((c) => ({ id: c.id, nama_kelas: c.nama_kelas }));

    return simulatedMondays.map((monday, index) => {
      const candidate = orderedCandidatePairs[index % orderedCandidatePairs.length];
      let assignedKelasId = candidate.kelas_id;
      let assignedKelasNama = candidate.nama_kelas;

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

  // Total Kandidat Aktif Terpilih
  const totalSelectedGuruCount = useMemo(() => {
    return (
      (includeWaka ? selectedWakaIds.length : 0) +
      (includeWaliKelas ? selectedWaliIds.length : 0) +
      (includeGuruBiasa ? selectedGuruBiasaIds.length : 0)
    );
  }, [includeWaka, selectedWakaIds, includeWaliKelas, selectedWaliIds, includeGuruBiasa, selectedGuruBiasaIds]);

  // Definisi Langkah Wizard
  const steps: StepDef[] = useMemo(
    () => [
      {
        number: 1,
        title: 'Jajaran Pimpinan & Struktural',
        shortTitle: 'Struktural',
        description: 'Kepsek, Waka, Kaprog, BP/BK',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
      {
        number: 2,
        title: 'Para Wali Kelas & Rombel',
        shortTitle: 'Wali Kelas',
        description: 'Rotasi kelas binaan',
        icon: <GraduationCap className="w-4 h-4" />,
      },
      {
        number: 3,
        title: 'Guru Mata Pelajaran',
        shortTitle: 'Guru Mapel',
        description: 'Pelengkap sisa pekan',
        icon: <Users className="w-4 h-4" />,
      },
      {
        number: 4,
        title: 'Periode & Simulasi Kalender',
        shortTitle: 'Simulasi Final',
        description: 'Review jadwal & eksekusi',
        icon: <Calendar className="w-4 h-4" />,
      },
    ],
    []
  );

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
      title="Wizard Auto-Generate Giliran Pembina Upacara"
      size="full"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── STEPPER HEADER WIZARD ────────────────────────────────────── */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-4 gap-2 relative">
            {steps.map((step) => {
              const isCurrent = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`text-left p-2 rounded-xl transition flex flex-col sm:flex-row items-center sm:items-start gap-2.5 ${
                    isCurrent
                      ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-200 dark:border-indigo-800'
                      : isCompleted
                      ? 'bg-slate-100/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>

                  <div className="min-w-0 hidden sm:block">
                    <p
                      className={`text-xs font-bold truncate leading-tight ${
                        isCurrent
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : isCompleted
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.shortTitle}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── KONTEN STEP 1: JAJARAN PIMPINAN & STRUKTURAL ───────────────── */}
        {currentStep === 1 && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Header Deskripsi Step */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-purple-950 dark:text-purple-200">
                    Langkah 1: Jajaran Pimpinan & Struktural Sekolah
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Mencakup <strong>Kepala Sekolah</strong>, <strong>Para Waka</strong> (Kurikulum, Kesiswaan, Sarpras, Hubin), <strong>Kaprog</strong>, dan <strong>BP/BK</strong> untuk giliran di pekan-pekan awal semester.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <input
                    type="checkbox"
                    checked={includeWaka}
                    onChange={(e) => setIncludeWaka(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Aktifkan Kelompok Ini
                  </span>
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
            </div>

            {/* List Kandidat Struktural */}
            {loadingCandidates ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat data jajaran struktural...</div>
            ) : wakaList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Belum ada guru dengan penugasan Struktural (Kepsek, Waka, Kaprog, BPBK) pada Struktur Organisasi sekolah.
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>
                    Kandidat Terpilih:{' '}
                    <strong className="text-purple-700 dark:text-purple-300">
                      {includeWaka ? selectedWakaIds.length : 0} dari {wakaList.length} personil
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-400">Klik baris untuk memilih/membatalkan</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
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
                            <ShieldCheck className="w-3 h-3 text-purple-500" />
                            {item.jabatan}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KONTEN STEP 2: PARA WALI KELAS & ROMBEL ────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Header Deskripsi Step */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                    Langkah 2: Para Wali Kelas & Rombel Petugas
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Setiap hari Senin giliran Wali Kelas, rombel binaannya otomatis bertugas sebagai pengibar bendera, paduan suara, & MC.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <input
                    type="checkbox"
                    checked={includeWaliKelas}
                    onChange={(e) => setIncludeWaliKelas(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Aktifkan Kelompok Ini
                  </span>
                </label>

                {includeWaliKelas && waliList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllWali}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0"
                  >
                    {selectedWaliIds.length === waliList.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>
            </div>

            {/* Opsi Tambahan Wali Kelas */}
            {includeWaliKelas && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPairKelasPetugas}
                    onChange={(e) => setAutoPairKelasPetugas(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Otomatis Pasangkan Rombel Binaan sebagai Petugas Upacara
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium">Urutkan Tingkat:</span>
                  <select
                    value={waliSortOrder}
                    onChange={(e) => setWaliSortOrder(e.target.value as WaliSortOrder)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    <option value="TINGKAT_ASC">Tingkat X ➔ XII</option>
                    <option value="TINGKAT_DESC">Tingkat XII ➔ X</option>
                    <option value="KELAS_ALPHA">Abjad Nama Kelas</option>
                  </select>
                </div>
              </div>
            )}

            {/* List Wali Kelas */}
            {waliList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Belum ada data penugasan Wali Kelas pada tahun pelajaran ini.
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>
                    Wali Kelas Terpilih:{' '}
                    <strong className="text-indigo-700 dark:text-indigo-300">
                      {includeWaliKelas ? selectedWaliIds.length : 0} dari {waliList.length} rombel
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-400">Klik baris untuk memilih/membatalkan</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
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
                            Rombel: {item.nama_kelas}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KONTEN STEP 3: GURU MATA PELAJARAN (PELENGKAP) ──────────────── */}
        {currentStep === 3 && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Header Deskripsi Step */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-slate-100 to-slate-200/60 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    Langkah 3: Guru Mata Pelajaran / Guru Biasa
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Guru-guru yang bukan pimpinan struktural dan bukan wali kelas untuk melengkapi sisa pekan upacara jika diperlukan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600">
                  <input
                    type="checkbox"
                    checked={includeGuruBiasa}
                    onChange={(e) => setIncludeGuruBiasa(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-700 focus:ring-slate-500"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Aktifkan Kelompok Ini
                  </span>
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
            </div>

            {/* List Guru Mapel */}
            {guruBiasaList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Semua guru aktif di sekolah telah terdaftar sebagai Pimpinan Struktural atau Wali Kelas.
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>
                    Guru Mapel Terpilih:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {includeGuruBiasa ? selectedGuruBiasaIds.length : 0} dari {guruBiasaList.length} guru
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {includeGuruBiasa ? 'Klik baris untuk memilih' : 'Centang kotak "Aktifkan" di atas untuk menyertakan'}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
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
                            Guru Mata Pelajaran
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── KONTEN STEP 4: PERIODE & SIMULASI KALENDER FINAL ───────────── */}
        {currentStep === 4 && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Header Pengaturan Periode & Alur */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-blue-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                      Langkah 4: Periode & Simulasi Kalender Upacara
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Tinjau rentang tanggal dan simulasi giliran mingguan sebelum dieksekusi.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                    🎯 {simulatedMondays.length} Pekan Hari Senin
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {totalSelectedGuruCount} Pembina Terpilih
                  </span>
                </div>
              </div>

              {/* Form Input Rentang Tanggal & Strategi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas Alur Urutan
                  </label>
                  <select
                    value={rotationStrategy}
                    onChange={(e) => setRotationStrategy(e.target.value as RotationStrategy)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="WAKA_FIRST">Pimpinan & Struktural (Awal) ➔ Wali Kelas ➔ Mapel</option>
                    <option value="WALI_FIRST">Wali Kelas (Awal) ➔ Pimpinan & Struktural ➔ Mapel</option>
                    <option value="COMBINED">Campuran Proporsional</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabel Preview Jadwal Per Pekan */}
            {previewSchedule.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                Tidak ada guru pembina yang terpilih. Silakan kembali ke Langkah 1, 2, atau 3 untuk memilih minimal 1 guru pembina.
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-slate-500 mb-1.5 font-medium flex items-center justify-between">
                  <span>Hasil Simulasi Kalender Upacara:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Siap dibuat untuk {previewSchedule.length} pekan
                  </span>
                </p>

                <div className="max-h-72 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30">
                  {previewSchedule.map((item) => (
                    <div
                      key={item.pekan}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shadow-2xs hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[11px] shrink-0 text-center w-14">
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
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER WIZARD NAVIGATION ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="rounded-xl flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Sebelumnya
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Batal
              </Button>
            )}
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Langkah <strong>{currentStep}</strong> dari <strong>4</strong> •{' '}
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {totalSelectedGuruCount} Pembina Terpilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                className="rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                Lanjut
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || previewSchedule.length === 0}
                className="rounded-xl shadow-md flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Sparkles className="w-4 h-4" />
                {submitting ? 'Mengenerate...' : `Generate ${previewSchedule.length} Jadwal Upacara`}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
