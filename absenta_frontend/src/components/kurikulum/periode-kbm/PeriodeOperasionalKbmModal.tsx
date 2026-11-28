import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  Briefcase,
  Layers,
  CalendarOff,
  Check,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import type { Kelas } from '@/types/academic';
import type {
  PeriodeOperasionalKbmItem,
  PeriodeKbmTipe,
  KelompokMapelBlok,
  SavePeriodeOperasionalKbmPayload,
} from '@/api/kurikulum/periodeKbm.api';
import toast from 'react-hot-toast';

interface PeriodeOperasionalKbmModalProps {
  editingItem: PeriodeOperasionalKbmItem | null;
  lockedScope?: 'ALL' | 'PKL' | 'KBM_BLOK';
  tahunPelajaranId?: string;
  tahunPelajaranName?: string;
  semesterId?: string;
  onClose: () => void;
  onSubmit: (payload: SavePeriodeOperasionalKbmPayload) => Promise<void>;
}

function toDateStr(d?: string | Date | null): string {
  if (!d) return '';
  return String(d).slice(0, 10);
}

export const PeriodeOperasionalKbmModal: React.FC<PeriodeOperasionalKbmModalProps> = React.memo(({
  editingItem,
  lockedScope = 'ALL',
  tahunPelajaranId,
  tahunPelajaranName,
  semesterId,
  onClose,
  onSubmit,
}) => {
  const { rawList: classes = [] } = useKelasOptions();

  const defaultTipe: PeriodeKbmTipe =
    lockedScope === 'PKL' ? 'PKL' : lockedScope === 'KBM_BLOK' ? 'KBM_BLOK' : 'PKL';

  const [tipe, setTipe] = useState<PeriodeKbmTipe>(defaultTipe);
  const [kelompokAktif, setKelompokAktif] = useState<KelompokMapelBlok>('PRODUKTIF');
  const [nama, setNama] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [targetSemuaKelas, setTargetSemuaKelas] = useState(false);
  const [targetKelasIds, setTargetKelasIds] = useState<string[]>([]);
  const [expandedTingkatKey, setExpandedTingkatKey] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hitung tahun dari nama Tahun Pelajaran (mis. "2026/2027")
  const tpYears = useMemo(() => {
    const nowY = new Date().getFullYear();
    if (tahunPelajaranName && tahunPelajaranName.includes('/')) {
      const [s, e] = tahunPelajaranName.split('/').map(Number);
      if (Number.isFinite(s) && Number.isFinite(e)) return { startYear: s, endYear: e };
    }
    return { startYear: nowY, endYear: nowY + 1 };
  }, [tahunPelajaranName]);

  useEffect(() => {
    if (editingItem) {
      setTipe(editingItem.tipe || defaultTipe);
      setKelompokAktif((editingItem.kelompok_aktif as KelompokMapelBlok) || 'PRODUKTIF');
      setNama(editingItem.nama || '');
      setTanggalMulai(toDateStr(editingItem.tanggal_mulai));
      setTanggalSelesai(toDateStr(editingItem.tanggal_selesai));
      setTargetSemuaKelas(Boolean(editingItem.target_semua_kelas));
      setTargetKelasIds(Array.isArray(editingItem.target_kelas_ids) ? editingItem.target_kelas_ids : []);
      setKeterangan(editingItem.keterangan || '');
    } else {
      setTipe(defaultTipe);
      setKelompokAktif('PRODUKTIF');
      setNama(defaultTipe === 'PKL' ? 'PKL Kelas XII Semester Ganjil' : '');
      setTanggalMulai(`${tpYears.startYear}-07-01`);
      setTanggalSelesai(`${tpYears.startYear}-12-31`);
      setTargetSemuaKelas(false);
      setTargetKelasIds([]);
      setKeterangan('');
    }
    setExpandedTingkatKey(null);
  }, [editingItem, defaultTipe, tpYears]);

  // Grupkan kelas berdasarkan tingkat (Tier 1)
  const groupedClasses = useMemo(() => {
    const map = new Map<string | number, { label: string; items: Kelas[] }>();
    classes.forEach((c: Kelas) => {
      const key = c.tingkat ?? 'Lainnya';
      const label = typeof key === 'number' || !isNaN(Number(key)) ? `Tingkat ${key}` : String(key);
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(c);
    });

    return Array.from(map.entries()).sort(([a], [b]) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }, [classes]);

  const handleToggleClass = useCallback((classId: string) => {
    setTargetKelasIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  }, []);

  const handleToggleTingkat = useCallback((items: Kelas[]) => {
    const itemIds = items.map((c) => c.id);
    setTargetKelasIds((prev) => {
      const allSelected = itemIds.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !itemIds.includes(id));
      return Array.from(new Set([...prev, ...itemIds]));
    });
  }, []);

  const applyDatePreset = useCallback(
    (preset: 'GANJIL' | 'GENAP' | 'TRIWULAN_1' | 'TRIWULAN_2') => {
      if (preset === 'GANJIL') {
        setTanggalMulai(`${tpYears.startYear}-07-01`);
        setTanggalSelesai(`${tpYears.startYear}-12-31`);
      } else if (preset === 'GENAP') {
        setTanggalMulai(`${tpYears.endYear}-01-01`);
        setTanggalSelesai(`${tpYears.endYear}-06-30`);
      } else if (preset === 'TRIWULAN_1') {
        setTanggalMulai(`${tpYears.startYear}-07-01`);
        setTanggalSelesai(`${tpYears.startYear}-09-30`);
      } else if (preset === 'TRIWULAN_2') {
        setTanggalMulai(`${tpYears.startYear}-10-01`);
        setTanggalSelesai(`${tpYears.startYear}-12-31`);
      }
    },
    [tpYears]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error('Nama periode wajib diisi');
      return;
    }
    if (!tanggalMulai || !tanggalSelesai) {
      toast.error('Tanggal mulai dan selesai wajib diisi');
      return;
    }
    if (tanggalSelesai < tanggalMulai) {
      toast.error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
      return;
    }
    if (!targetSemuaKelas && targetKelasIds.length === 0) {
      toast.error('Centang minimal satu tingkat atau kelas peserta');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        tahun_pelajaran_id: editingItem?.tahun_pelajaran_id || tahunPelajaranId,
        semester_id: editingItem?.semester_id ?? semesterId ?? null,
        nama: nama.trim(),
        tipe,
        kelompok_aktif: tipe === 'KBM_BLOK' ? kelompokAktif : null,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        target_semua_kelas: targetSemuaKelas,
        target_kelas_ids: targetSemuaKelas ? [] : targetKelasIds,
        keterangan: keterangan.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex-none px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight truncate">
                {editingItem ? 'Edit Periode Operasional KBM' : 'Tambah Periode PKL / KBM Blok'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Kartu virtual KBM yang terdampak otomatis disembunyikan &amp; bebas vonis alpa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="periode-kbm-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* 1. Jenis Periode */}
          {lockedScope === 'ALL' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Jenis Periode
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'PKL' as const,
                    label: 'PKL / Prakerin',
                    desc: 'Bebas seluruh KBM (Prioritas 1)',
                    icon: Briefcase,
                  },
                  {
                    id: 'KBM_BLOK' as const,
                    label: 'KBM Sistem Blok',
                    desc: 'Aktif per kelompok mapel',
                    icon: Layers,
                  },
                  {
                    id: 'NON_KBM' as const,
                    label: 'Agenda Non-KBM',
                    desc: 'P5 / Ujian / UKK',
                    icon: CalendarOff,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = tipe === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setTipe(opt.id);
                        if (!editingItem && (!nama.trim() || nama.startsWith('PKL ') || nama.startsWith('Blok '))) {
                          setNama(
                            opt.id === 'PKL'
                              ? 'PKL Kelas XII Semester Ganjil'
                              : opt.id === 'KBM_BLOK'
                              ? 'Blok Produktif Triwulan 1'
                              : 'Pekan P5 / Ujian'
                          );
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-100'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                        <span className="text-xs font-bold">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pilihan Kelompok Aktif (Khusus KBM Blok) */}
          {tipe === 'KBM_BLOK' && (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Kelompok Mapel yang Sedang Masuk / Aktif Belajar
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKelompokAktif('PRODUKTIF')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    kelompokAktif === 'PRODUKTIF'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">Blok Produktif / Kejuruan</span>
                  <span className={`text-[10px] block mt-0.5 ${kelompokAktif === 'PRODUKTIF' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    Mapel Umum disembunyikan sementara
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setKelompokAktif('UMUM')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    kelompokAktif === 'UMUM'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">Blok Umum (Normatif &amp; Adaptif)</span>
                  <span className={`text-[10px] block mt-0.5 ${kelompokAktif === 'UMUM' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    Mapel Produktif disembunyikan sementara
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Nama Periode */}
          <div>
            <Label htmlFor="periode-nama" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Nama Periode <span className="text-rose-500">*</span>
            </Label>
            <input
              id="periode-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={
                tipe === 'PKL'
                  ? 'Contoh: PKL Kelas XII Semester Ganjil'
                  : tipe === 'KBM_BLOK'
                  ? 'Contoh: Blok Produktif Kelas XI (3 Bulan)'
                  : 'Contoh: Pekan P5 / Sumatif Akhir Semester'
              }
              className="mt-1.5 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm"
            />
          </div>

          {/* 3. Rentang Tanggal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Rentang Tanggal <span className="text-rose-500">*</span>
              </Label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => applyDatePreset('GANJIL')}
                  className="px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium cursor-pointer"
                >
                  Sem. Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('GENAP')}
                  className="px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium cursor-pointer"
                >
                  Sem. Genap
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TRIWULAN_1')}
                  className="px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium cursor-pointer"
                >
                  Jul–Sep (3 Bln)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TRIWULAN_2')}
                  className="px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium cursor-pointer"
                >
                  Okt–Des (3 Bln)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="periode-mulai" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Mulai
                </Label>
                <input
                  id="periode-mulai"
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="periode-selesai" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Selesai
                </Label>
                <input
                  id="periode-selesai"
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* 4. Peserta Kelas (2-Tier Checkbox Tingkat — Anti Human Error) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Tingkat / Kelas yang Terdampak
              </Label>
              {!targetSemuaKelas && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {targetKelasIds.length} / {classes.length} kelas dipilih
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setTargetSemuaKelas(false)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !targetSemuaKelas
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Pilih per Tingkat / Kelas
              </button>
              <button
                type="button"
                onClick={() => setTargetSemuaKelas(true)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetSemuaKelas
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Seluruh Kelas
              </button>
            </div>

            {!targetSemuaKelas && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {groupedClasses.map(([tingkatKey, group]) => {
                    const keyStr = String(tingkatKey);
                    const groupItemIds = group.items.map((c) => c.id);
                    const selectedCount = groupItemIds.filter((id) => targetKelasIds.includes(id)).length;
                    const isAllSelected = groupItemIds.length > 0 && selectedCount === groupItemIds.length;
                    const isPartial = selectedCount > 0 && selectedCount < groupItemIds.length;
                    const isExpanded = expandedTingkatKey === keyStr;

                    return (
                      <div
                        key={keyStr}
                        className={`rounded-xl border transition-all flex items-center justify-between gap-1.5 px-3 py-2.5 ${
                          isAllSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/35 border-indigo-400 dark:border-indigo-700'
                            : isPartial
                            ? 'bg-indigo-50/30 dark:bg-indigo-950/15 border-indigo-200 dark:border-indigo-800/80'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isAllSelected ? true : isPartial ? 'mixed' : false}
                          onClick={() => handleToggleTingkat(group.items)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isAllSelected || isPartial
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isAllSelected ? (
                              <Check size={11} strokeWidth={3} />
                            ) : isPartial ? (
                              <Minus size={11} strokeWidth={3} />
                            ) : null}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight truncate">
                              {group.label}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                              {selectedCount}/{group.items.length} kelas
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedTingkatKey((prev) => (prev === keyStr ? null : keyStr))}
                          className={`p-1 rounded-lg text-[10px] font-semibold flex items-center gap-0.5 shrink-0 cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Rinci</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {expandedTingkatKey && (() => {
                  const found = groupedClasses.find(([k]) => String(k) === expandedTingkatKey);
                  if (!found) return null;
                  const [, group] = found;
                  const groupItemIds = group.items.map((c) => c.id);
                  const selectedInGroup = groupItemIds.filter((id) => targetKelasIds.includes(id));
                  const isAllInGroupSelected = groupItemIds.length > 0 && selectedInGroup.length === groupItemIds.length;

                  return (
                    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Rincian {group.label} ({selectedInGroup.length}/{group.items.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleTingkat(group.items)}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                          >
                            {isAllInGroupSelected ? 'Batal Semua' : 'Pilih Semua'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedTingkatKey(null)}
                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                        {group.items.map((cls) => {
                          const selected = targetKelasIds.includes(cls.id);
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => handleToggleClass(cls.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all truncate flex items-center justify-between gap-1 cursor-pointer ${
                                selected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate">{cls.nama_kelas}</span>
                              {selected && <Check size={11} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex-none px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 rounded-xl text-xs font-semibold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="periode-kbm-form"
            variant="primary"
            disabled={submitting}
            className="h-9 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan Periode'}
          </Button>
        </div>
      </div>
    </div>
  );
});

export default PeriodeOperasionalKbmModal;
