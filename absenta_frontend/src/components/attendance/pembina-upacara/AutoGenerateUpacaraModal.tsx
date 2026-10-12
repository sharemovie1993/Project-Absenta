import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  GraduationCap,
  ShieldCheck,
  Check,
  Users,
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

const STEP_TITLES = [
  { step: 1, label: 'Pimpinan & Struktural' },
  { step: 2, label: 'Para Wali Kelas' },
  { step: 3, label: 'Guru Mapel' },
  { step: 4, label: 'Simulasi & Selesai' },
];

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

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  // Load candidate groups
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
      role_label: 'Guru Mapel',
      role_type: 'GURU_BIASA',
      kelas_id: null,
      nama_kelas: null,
    }));

    if (rotationStrategy === 'WAKA_FIRST') {
      return [...wakaPairs, ...waliPairs, ...biasaPairs];
    } else if (rotationStrategy === 'WALI_FIRST') {
      return [...waliPairs, ...wakaPairs, ...biasaPairs];
    }
    return [...wakaPairs, ...waliPairs, ...biasaPairs];
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

  // Map guru_id -> CandidateWakaItem untuk referensi status terpilih di Waka
  const selectedWakaMap = useMemo(() => {
    const map = new Map<string, CandidateWakaItem>();
    if (!includeWaka) return map;
    for (const w of wakaList) {
      if (selectedWakaIds.includes(w.guru_id)) {
        map.set(w.guru_id, w);
      }
    }
    return map;
  }, [includeWaka, wakaList, selectedWakaIds]);

  // Map guru_id -> CandidateWaliItem untuk referensi status terpilih di Wali Kelas
  const selectedWaliMap = useMemo(() => {
    const map = new Map<string, CandidateWaliItem>();
    if (!includeWaliKelas) return map;
    for (const w of waliList) {
      if (selectedWaliIds.includes(w.guru_id)) {
        map.set(w.guru_id, w);
      }
    }
    return map;
  }, [includeWaliKelas, waliList, selectedWaliIds]);

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
    // Utamakan memilih guru yang murni belum terpilih di Waka maupun Wali Kelas
    const availableGurus = guruBiasaList.filter(
      (g) => !selectedWakaMap.has(g.guru_id) && !selectedWaliMap.has(g.guru_id)
    );
    const targetList = availableGurus.length > 0 ? availableGurus : guruBiasaList;
    const allTargetSelected = targetList.every((g) => selectedGuruBiasaIds.includes(g.guru_id));

    if (allTargetSelected) {
      setSelectedGuruBiasaIds([]);
    } else {
      setSelectedGuruBiasaIds(targetList.map((g) => g.guru_id));
    }
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
      title="Auto-Generate Pembina Upacara"
      description={academicContextLabel ? `Konteks: ${academicContextLabel}` : 'Susun jadwal giliran pembina upacara 1 semester'}
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
        {/* ── STEPPER MINIMALIS ────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:gap-4 w-full">
            {STEP_TITLES.map((s, idx) => {
              const isCurrent = currentStep === s.step;
              const isDone = currentStep > s.step;

              return (
                <React.Fragment key={s.step}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(s.step)}
                    className="flex items-center gap-2 text-left group focus:outline-hidden"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition shrink-0 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden md:inline truncate ${
                        isCurrent
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : isDone
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>

                  {idx < STEP_TITLES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 rounded transition ${
                        isDone ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── STEP 1: PIMPINAN & STRUKTURAL ────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-3">
            {/* Control Bar Ringkas */}
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={includeWaka}
                  onChange={(e) => setIncludeWaka(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Libatkan Jajaran Pimpinan & Struktural ({wakaList.length})</span>
              </label>

              {includeWaka && wakaList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">
                    {selectedWakaIds.length} dipilih
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAllWaka}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {selectedWakaIds.length === wakaList.length ? 'Batal' : 'Pilih Semua'}
                  </button>
                </div>
              )}
            </div>

            {/* List Personil Struktural */}
            {loadingCandidates ? (
              <div className="p-12 text-center text-xs text-slate-400">Memuat data struktural...</div>
            ) : wakaList.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Belum ada penugasan pimpinan/struktural (Kepsek, Waka, Kaprog, BPBK) pada Struktur Organisasi.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 p-1">
                {wakaList.map((item) => {
                  const isSelected = selectedWakaIds.includes(item.guru_id) && includeWaka;
                  return (
                    <div
                      key={item.id}
                      onClick={() => includeWaka && handleToggleWaka(item.guru_id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 font-semibold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-slate-800 dark:text-slate-100 font-bold">
                            {item.nama_guru}
                          </p>
                          {item.nip && <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shrink-0 border border-purple-200 dark:border-purple-800">
                        {item.jabatan}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: PARA WALI KELAS ──────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {/* Control Bar Ringkas */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={includeWaliKelas}
                  onChange={(e) => setIncludeWaliKelas(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Libatkan Para Wali Kelas ({waliList.length})</span>
              </label>

              {includeWaliKelas && waliList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">
                    {selectedWaliIds.length} dipilih
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAllWali}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {selectedWaliIds.length === waliList.length ? 'Batal' : 'Pilih Semua'}
                  </button>
                </div>
              )}
            </div>

            {/* Opsi Auto-pair & Sorting Ringkas */}
            {includeWaliKelas && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoPairKelasPetugas}
                    onChange={(e) => setAutoPairKelasPetugas(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Otomatis rombel binaan jadi petugas upacara</span>
                </label>

                <div className="flex items-center gap-1.5 text-slate-500">
                  <SlidersHorizontal className="w-3 h-3" />
                  <select
                    value={waliSortOrder}
                    onChange={(e) => setWaliSortOrder(e.target.value as WaliSortOrder)}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
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
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Belum ada data penugasan Wali Kelas pada tahun pelajaran ini.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 p-1">
                {sortedWaliItems.map((item) => {
                  const isSelected = selectedWaliIds.includes(item.guru_id) && includeWaliKelas;
                  const wakaInfo = selectedWakaMap.get(item.guru_id);
                  const isCheckedInWaka = Boolean(wakaInfo);

                  return (
                    <div
                      key={item.id}
                      onClick={() => includeWaliKelas && handleToggleWali(item.guru_id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-100 font-semibold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="truncate text-slate-800 dark:text-slate-100 font-bold">
                              {item.nama_guru}
                            </p>
                            {isCheckedInWaka && (
                              <span
                                title={`Guru ini telah diceklis di langkah Waka/Struktural (${wakaInfo?.jabatan})`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0"
                              >
                                <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                Terpilih di Waka {wakaInfo?.jabatan ? `(${wakaInfo.jabatan})` : ''}
                              </span>
                            )}
                          </div>
                          {item.nip && <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shrink-0 border border-blue-200 dark:border-blue-800">
                        {item.nama_kelas}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: GURU MATA PELAJARAN ──────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-3">
            {/* Control Bar Ringkas */}
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={includeGuruBiasa}
                  onChange={(e) => setIncludeGuruBiasa(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-700 focus:ring-slate-500"
                />
                <span>Libatkan Guru Mapel / Pelengkap ({guruBiasaList.length})</span>
              </label>

              {includeGuruBiasa && guruBiasaList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">
                    {selectedGuruBiasaIds.length} dipilih
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAllGuruBiasa}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {selectedGuruBiasaIds.length > 0 ? 'Batal' : 'Pilih Semua'}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 px-1">
              Pilih guru pengajar tambahan jika kuota pekan upacara 1 semester belum mencukupi hanya dari pimpinan & wali kelas.
            </p>

            {guruBiasaList.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Belum ada data guru lain yang terdaftar.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 p-1">
                {guruBiasaList.map((item) => {
                  const isSelected = selectedGuruBiasaIds.includes(item.guru_id) && includeGuruBiasa;
                  const wakaInfo = selectedWakaMap.get(item.guru_id);
                  const waliInfo = selectedWaliMap.get(item.guru_id);
                  const isCheckedInWaka = Boolean(wakaInfo);
                  const isCheckedInWali = Boolean(waliInfo);

                  return (
                    <div
                      key={item.guru_id}
                      onClick={() => includeGuruBiasa && handleToggleGuruBiasa(item.guru_id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="truncate text-slate-800 dark:text-slate-100 font-bold">
                              {item.nama_guru}
                            </p>
                            {isCheckedInWaka && (
                              <span
                                title={`Guru ini telah diceklis di langkah Waka/Struktural (${wakaInfo?.jabatan})`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0"
                              >
                                <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                Terpilih di Waka {wakaInfo?.jabatan ? `(${wakaInfo.jabatan})` : ''}
                              </span>
                            )}
                            {isCheckedInWali && (
                              <span
                                title={`Guru ini telah diceklis di langkah Wali Kelas (${waliInfo?.nama_kelas})`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0"
                              >
                                <GraduationCap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                Terpilih di Wali Kelas ({waliInfo?.nama_kelas})
                              </span>
                            )}
                          </div>
                          {item.nip && <p className="text-[10px] text-slate-400">NIP: {item.nip}</p>}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        Guru Mapel
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: PERIODE & SIMULASI KALENDER FINAL ─────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {/* Form Periode & Urutan Ramping */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alur Urutan Pembina
                </label>
                <select
                  value={rotationStrategy}
                  onChange={(e) => setRotationStrategy(e.target.value as RotationStrategy)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="WAKA_FIRST">Pimpinan (Awal) ➔ Wali Kelas ➔ Mapel</option>
                  <option value="WALI_FIRST">Wali Kelas (Awal) ➔ Pimpinan ➔ Mapel</option>
                  <option value="COMBINED">Campuran Proporsional</option>
                </select>
              </div>
            </div>

            {/* List Simulasi Hasil Jadwal Mingguan */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 px-1">
                <span>
                  Hasil Simulasi Giliran:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {previewSchedule.length} Pekan Hari Senin
                  </strong>
                </span>
                <span className="text-[11px] text-slate-400">
                  {orderedCandidatePairs.length} Pembina Terpilih
                </span>
              </div>

              {previewSchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Belum ada pembina yang dipilih. Silakan kembali ke langkah sebelumnya.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 p-1">
                  {previewSchedule.map((item) => (
                    <div
                      key={item.pekan}
                      className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-12 text-center py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold text-[10px] shrink-0">
                          Pekan {item.pekan}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.nama_guru}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.tanggalStr} • {item.role_label}
                          </p>
                        </div>
                      </div>

                      {item.nama_kelas && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                          Petugas: {item.nama_kelas}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER WIZARD NAVIGATION ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="rounded-xl flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Sebelumnya
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
            )}
          </div>

          <span className="text-[11px] text-slate-400">
            Langkah {currentStep} dari 4
          </span>

          <div>
            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                className="rounded-xl flex items-center gap-1.5 text-xs shadow-xs"
              >
                Lanjut
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || previewSchedule.length === 0}
                className="rounded-xl flex items-center gap-1.5 text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {submitting ? 'Mengenerate...' : `Simpan ${previewSchedule.length} Jadwal`}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
