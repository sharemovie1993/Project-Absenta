import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  SearchableSelect,
} from '@/components/ui';
import { useGuruOptions, useMapelOptions } from '@/components/common';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { kurikulumApi } from '@/api/kurikulum.api';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CbtBankSoal } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Layers, User, Sparkles } from 'lucide-react';

export type CbtBankSoalScope = 'TERPUSAT_MASSAL' | 'MANDIRI_GURU';

export interface OfficialAsesmenType {
  key: string;
  singkatan: string;
  namaResmi: string;
  keterangan: string;
  defaultPrefix: string;
}

export const OFFICIAL_ASESMEN_TYPES: OfficialAsesmenType[] = [
  {
    key: 'SAS',
    singkatan: 'SAS',
    namaResmi: 'Sumatif Akhir Semester',
    keterangan: 'Resmi Kurikulum Merdeka pengganti PAS (Semester Ganjil)',
    defaultPrefix: 'SAS',
  },
  {
    key: 'SAT',
    singkatan: 'SAT',
    namaResmi: 'Sumatif Akhir Tahun',
    keterangan: 'Resmi Kurikulum Merdeka pengganti PAT / Kenaikan Kelas (Semester Genap)',
    defaultPrefix: 'SAT',
  },
  {
    key: 'STS',
    singkatan: 'STS',
    namaResmi: 'Sumatif Tengah Semester',
    keterangan: 'Resmi evaluasi progres tengah semester pengganti PTS',
    defaultPrefix: 'STS',
  },
  {
    key: 'PSAJ',
    singkatan: 'PSAJ',
    namaResmi: 'Penilaian Sumatif Akhir Jenjang',
    keterangan: 'Resmi kelulusan tingkat akhir kelas XII / IX pengganti Ujian Sekolah (US)',
    defaultPrefix: 'PSAJ',
  },
  {
    key: 'SLM',
    singkatan: 'SLM',
    namaResmi: 'Sumatif Lingkup Materi',
    keterangan: 'Resmi evaluasi Tujuan Pembelajaran (TP) / Ulangan Bab',
    defaultPrefix: 'SLM',
  },
  {
    key: 'TRYOUT',
    singkatan: 'Simulasi',
    namaResmi: 'Simulasi / Try Out Asesmen',
    keterangan: 'Uji coba asesmen terstandar & persiapan ANBK / TKA',
    defaultPrefix: 'TRYOUT',
  },
];

interface CbtBankSoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSoalToEdit?: CbtBankSoal | null;
  onSuccess: () => void;
  defaultGuruId?: string;
  defaultMapelId?: string;
  roleContext?: 'GURU' | 'KURIKULUM' | 'ADMIN';
}

const bankSoalSchema = z.object({
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  guru_id: z.string().min(1, 'Guru pembuat/penyusun soal wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.enum(['X', 'XI', 'XII', 'SEMUA']),
  alokasi_menit: z.number().int().min(10, 'Alokasi durasi minimal 10 menit').max(300),
});

export const CbtBankSoalFormModal: React.FC<CbtBankSoalFormModalProps> = ({
  isOpen,
  onClose,
  bankSoalToEdit,
  onSuccess,
  defaultGuruId,
  defaultMapelId,
  roleContext,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isAdmin, isKurikulum } = useCapabilities();

  const isPrivilegedRole = isAdmin || isKurikulum || roleContext === 'KURIKULUM' || roleContext === 'ADMIN';

  // 1. Pemisahan Konteks: Mandiri Guru vs Terpusat Massal (UAS/PAS/US/Panitia)
  const initialScope: CbtBankSoalScope = useMemo(() => {
    if (bankSoalToEdit) {
      const code = bankSoalToEdit.kode_bank.toUpperCase();
      if (
        code.startsWith('PAS-') ||
        code.startsWith('UAS-') ||
        code.startsWith('PAT-') ||
        code.startsWith('US-') ||
        code.startsWith('PTS-') ||
        code.startsWith('SAS-') ||
        code.startsWith('SAT-')
      ) {
        return 'TERPUSAT_MASSAL';
      }
      return 'MANDIRI_GURU';
    }
    // Jika dibuka di lingkungan Kurikulum / Admin, default adalah Terpusat Massal
    return isPrivilegedRole && !defaultGuruId ? 'TERPUSAT_MASSAL' : 'MANDIRI_GURU';
  }, [bankSoalToEdit, isPrivilegedRole, defaultGuruId]);

  const [scope, setScope] = useState<CbtBankSoalScope>(initialScope);
  const [jenisKegiatanMassal, setJenisKegiatanMassal] = useState<string>('SAS');

  // Kunci pemilihan guru HANYA jika guru biasa murni di mode mandiri
  const isTeacherLocked = useMemo(() => {
    if (isPrivilegedRole || scope === 'TERPUSAT_MASSAL') return false;
    return Boolean(defaultGuruId || user?.guru_profile?.id);
  }, [isPrivilegedRole, scope, defaultGuruId, user?.guru_profile?.id]);

  const initialGuruId = useMemo(() => {
    return defaultGuruId || user?.guru_profile?.id || '';
  }, [defaultGuruId, user?.guru_profile?.id]);

  const { options: guruOptions, loading: guruLoading } = useGuruOptions();
  const { options: mapelOptions, loading: mapelLoading } = useMapelOptions();

  const [kodeBank, setKodeBank] = useState('');
  const [judul, setJudul] = useState('');
  const [guruId, setGuruId] = useState(initialGuruId);
  const [mapelId, setMapelId] = useState(defaultMapelId || '');
  const [tingkat, setTingkat] = useState<'X' | 'XI' | 'XII' | 'SEMUA'>('X');
  const [alokasiMenit, setAlokasiMenit] = useState<number>(90);
  const [acakSoal, setAcakSoal] = useState(true);
  const [acakOpsi, setAcakOpsi] = useState(true);
  const [isShared, setIsShared] = useState(true);
  // Di mode TERPUSAT_MASSAL, showAllMapels SELALU true (tidak terkunci ke mapel ajar pribadi kurikulum)
  const [showAllMapels, setShowAllMapels] = useState(isPrivilegedRole || initialScope === 'TERPUSAT_MASSAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil data penugasan mapel guru yang sedang dipilih (hanya relevan di mode Mandiri Guru)
  const { data: teacherAssignedMapels, isLoading: isAssignedMapelsLoading } = useQuery({
    queryKey: ['guru-assigned-mapels', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: isOpen && !!guruId && scope === 'MANDIRI_GURU',
  });

  // Ekstrak daftar unik mapel yang diampu guru
  const assignedMapels = useMemo(() => {
    const list = teacherAssignedMapels?.data || [];
    const map = new Map<string, { value: string; label: string }>();
    list.forEach((item: any) => {
      const id = item.mapel_id || item.Mapel?.id;
      if (id && !map.has(id)) {
        const canonical = mapelOptions.find((m) => m.value === id);
        const label = canonical?.label || item.Mapel?.nama_mapel || id;
        map.set(id, { value: id, label });
      }
    });
    return Array.from(map.values());
  }, [teacherAssignedMapels?.data, mapelOptions]);

  // Opsi mapel aktif
  // 🛡️ SOLUSI: Pada mode TERPUSAT_MASSAL atau jika showAllMapels true, seluruh mapel sekolah langsung terbuka
  const activeMapelOptions = useMemo(() => {
    if (scope === 'TERPUSAT_MASSAL' || showAllMapels || assignedMapels.length === 0) {
      return mapelOptions;
    }
    let base = assignedMapels;
    if (mapelId && !base.some((m) => m.value === mapelId)) {
      const canonical = mapelOptions.find((m) => m.value === mapelId);
      if (canonical) base = [canonical, ...base];
    }
    return base;
  }, [scope, showAllMapels, assignedMapels, mapelOptions, mapelId]);

  // Auto-generate judul & kode bank pada mode massal saat mapel atau kegiatan berubah
  const handleAutoFillMassal = (targetMapelId: string, targetTingkat: string, targetKegiatanKey: string) => {
    const selectedMapel = mapelOptions.find((m) => m.value === targetMapelId);
    const mapelName = selectedMapel?.label?.split('(')[0]?.trim() || 'Mata Pelajaran';
    const year = new Date().getFullYear();
    const cleanMapelCode = (selectedMapel?.label || 'MAPEL')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();

    const selectedDef = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === targetKegiatanKey);
    const prefix = selectedDef?.defaultPrefix || targetKegiatanKey;
    const fullOfficialName = selectedDef?.namaResmi || targetKegiatanKey;

    const generatedCode = `${prefix}-${year}-${cleanMapelCode}-${targetTingkat}`;
    const generatedTitle = `${prefix} - ${mapelName} Tingkat ${targetTingkat} (${fullOfficialName})`;

    setKodeBank(generatedCode);
    setJudul(generatedTitle);
  };

  // Inisialisasi form saat buka modal atau ganti mode edit
  useEffect(() => {
    if (bankSoalToEdit) {
      setKodeBank(bankSoalToEdit.kode_bank);
      setJudul(bankSoalToEdit.judul);
      setGuruId(bankSoalToEdit.guru_id);
      setMapelId(bankSoalToEdit.mapel_id);
      setTingkat(bankSoalToEdit.tingkat);
      setAlokasiMenit(bankSoalToEdit.alokasi_menit);
      setAcakSoal(bankSoalToEdit.acak_soal);
      setAcakOpsi(bankSoalToEdit.acak_opsi);
      setIsShared(bankSoalToEdit.status === 'PUBLISHED' || Boolean(bankSoalToEdit.is_shared));
      setShowAllMapels(true);
    } else {
      setScope(initialScope);
      const isMassal = initialScope === 'TERPUSAT_MASSAL';
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);

      setKodeBank(isMassal ? `SAS-${year}-MAPEL-X` : `CBT-${year}-${randomSuffix}`);
      setJudul('');
      setGuruId(initialGuruId);
      setMapelId(defaultMapelId || '');
      setTingkat('X');
      setAlokasiMenit(90);
      setAcakSoal(true);
      setAcakOpsi(true);
      setIsShared(true);
      setShowAllMapels(isPrivilegedRole || isMassal);
    }
  }, [bankSoalToEdit, initialGuruId, defaultMapelId, isOpen, initialScope, isPrivilegedRole]);

  // Handler saat berganti tab Konteks (Mandiri vs Terpusat)
  const handleChangeScope = (newScope: CbtBankSoalScope) => {
    setScope(newScope);
    const year = new Date().getFullYear();
    if (newScope === 'TERPUSAT_MASSAL') {
      setShowAllMapels(true);
      setIsShared(true);
      handleAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal);
    } else {
      // Kembali ke Mandiri Guru
      if (
        kodeBank.startsWith('SAS-') ||
        kodeBank.startsWith('SAT-') ||
        kodeBank.startsWith('STS-') ||
        kodeBank.startsWith('PSAJ-') ||
        kodeBank.startsWith('PAS-') ||
        kodeBank.startsWith('PAT-')
      ) {
        setKodeBank(`SLM-${year}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = bankSoalSchema.safeParse({
      kode_bank: kodeBank.trim().toUpperCase(),
      judul: judul.trim(),
      guru_id: guruId,
      mapel_id: mapelId,
      tingkat,
      alokasi_menit: Number(alokasiMenit),
    });

    if (!validation.success) {
      toast.error(
        validation.error.issues.map((err) => err.message).join(', ') || 'Data bank soal belum lengkap'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        kode_bank: kodeBank.trim().toUpperCase(),
        judul: judul.trim(),
        guru_id: guruId,
        mapel_id: mapelId,
        tingkat,
        alokasi_menit: Number(alokasiMenit),
        acak_soal: acakSoal,
        acak_opsi: acakOpsi,
        status: (scope === 'TERPUSAT_MASSAL' || isShared ? 'PUBLISHED' : 'DRAFT') as 'PUBLISHED' | 'DRAFT',
        is_shared: scope === 'TERPUSAT_MASSAL' ? true : isShared,
      };

      if (bankSoalToEdit) {
        await cbtApi.updateBankSoal(bankSoalToEdit.id, payload);
        toast.success('Bank soal berhasil diperbarui');
      } else {
        await cbtApi.createBankSoal(payload);
        toast.success(
          scope === 'TERPUSAT_MASSAL'
            ? 'Paket bank soal ujian serentak berhasil dibuat & siap dijadwalkan'
            : 'Bank soal mandiri guru berhasil dibuat'
        );
      }

      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.bankSoal(),
        exact: false,
        refetchType: 'all',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan bank soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bankSoalToEdit ? 'Edit Paket Bank Soal' : 'Buat Paket Bank Soal Baru'}
      size="md"
    >
      <div className="-mt-3 sm:-mt-6 -mx-3 sm:-mx-6 mb-3 sm:mb-4 h-1.5 bg-[#673ab7]" />
      
      {/* ── 0. Konteks Switcher Pill: Terpusat Massal vs Mandiri Guru ── */}
      <div className="mb-4 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => handleChangeScope('TERPUSAT_MASSAL')}
            className={cn(
              "py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              scope === 'TERPUSAT_MASSAL'
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Layers size={14} />
            <span>Paket Massal (UAS / PAS / US)</span>
          </button>

          <button
            type="button"
            onClick={() => handleChangeScope('MANDIRI_GURU')}
            className={cn(
              "py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              scope === 'MANDIRI_GURU'
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <User size={14} />
            <span>Mandiri Guru (Ulangan / Kuis)</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1.5 leading-snug">
          {scope === 'TERPUSAT_MASSAL' ? (
            <span className="text-violet-700 dark:text-violet-300 font-medium">
              💡 <strong>Mode Panitia / Kurikulum:</strong> Membuka 100% seluruh mata pelajaran sekolah untuk pembuatan paket soal ujian serentak/bersama.
            </span>
          ) : (
            <span>
              💡 <strong>Mode Mandiri:</strong> Untuk keperluan kuis formatif, latihan, atau ulangan harian kelas guru pengampu.
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Preset Kegiatan jika Mode Terpusat Massal */}
        {scope === 'TERPUSAT_MASSAL' && (
          <div className="space-y-2 p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200/90 dark:border-violet-800/70">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black text-violet-950 dark:text-violet-200 uppercase tracking-wider">
                Nomenklatur Resmi Asesmen Nasional &amp; Dinas Pendidikan:
              </label>
              <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-400">
                Permendikbudristek No. 21 Th. 2022
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OFFICIAL_ASESMEN_TYPES.map((k) => {
                const isSelected = jenisKegiatanMassal === k.key;
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => {
                      setJenisKegiatanMassal(k.key);
                      handleAutoFillMassal(mapelId, tingkat, k.key);
                    }}
                    className={cn(
                      "p-2 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-between gap-1",
                      isSelected
                        ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-violet-300"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-xs">{k.singkatan}</span>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}
                      >
                        Resmi
                      </span>
                    </div>
                    <p className={cn("text-[11px] font-semibold line-clamp-1", isSelected ? "text-violet-100" : "text-slate-800 dark:text-slate-200")}>
                      {k.namaResmi}
                    </p>
                    <p className={cn("text-[10px] line-clamp-1", isSelected ? "text-violet-200" : "text-slate-400")}>
                      {k.keterangan}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pertanyaan 1: Mata Pelajaran */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="form-mapel" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Mata Pelajaran:
            </label>
            {scope === 'MANDIRI_GURU' && assignedMapels.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllMapels((prev) => !prev)}
                className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                {showAllMapels ? 'Mapel Saya' : 'Semua Mapel'}
              </button>
            )}
          </div>

          <SearchableSelect
            id="form-mapel"
            options={activeMapelOptions}
            value={mapelId}
            onChange={(newMapelId) => {
              setMapelId(newMapelId);
              if (scope === 'TERPUSAT_MASSAL') {
                handleAutoFillMassal(newMapelId, tingkat, jenisKegiatanMassal);
              }
            }}
            placeholder={
              isAssignedMapelsLoading || mapelLoading
                ? 'Memuat mata pelajaran...'
                : activeMapelOptions.length === 0
                ? 'Tidak ada mapel tersedia'
                : 'Pilih mata pelajaran sekolah...'
            }
            aria-label="Pilih Mata Pelajaran"
          />
        </div>

        {/* Pertanyaan 2: Tingkat / Jenjang Kelas */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Untuk kelas tingkat berapa?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { value: 'X', label: 'Kelas X' },
                { value: 'XI', label: 'Kelas XI' },
                { value: 'XII', label: 'Kelas XII' },
                { value: 'SEMUA', label: 'Semua' },
              ] as { value: 'X' | 'XI' | 'XII' | 'SEMUA'; label: string }[]
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setTingkat(item.value);
                  if (scope === 'TERPUSAT_MASSAL') {
                    handleAutoFillMassal(mapelId, item.value, jenisKegiatanMassal);
                  }
                }}
                className={cn(
                  'py-2 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                  tingkat === item.value
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pertanyaan 3: Guru Pembuat / Penanggung Jawab Soal */}
        {!isTeacherLocked && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label htmlFor="form-guru" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {scope === 'TERPUSAT_MASSAL' ? 'Koordinator / Penyusun Soal:' : 'Guru Pembuat Soal:'}
              </label>
              {scope === 'TERPUSAT_MASSAL' && (
                <span className="text-[11px] text-slate-400">
                  (Dapat ditugaskan ke Guru Mapel terkait)
                </span>
              )}
            </div>
            <SearchableSelect
              id="form-guru"
              options={guruOptions}
              value={guruId}
              onChange={(newGuruId) => {
                setGuruId(newGuruId);
                if (scope === 'MANDIRI_GURU') {
                  setMapelId('');
                  setShowAllMapels(false);
                }
              }}
              placeholder={guruLoading ? 'Memuat daftar guru...' : 'Pilih koordinator / guru penyusun...'}
              aria-label="Pilih Guru Penyusun Soal"
            />
          </div>
        )}

        {/* Pertanyaan 4: Judul & Kode Bank Soal */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="form-judul-bank" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Judul Paket Soal:
              </label>
              {scope === 'TERPUSAT_MASSAL' && mapelId && (
                <button
                  type="button"
                  onClick={() => handleAutoFillMassal(mapelId, tingkat, jenisKegiatanMassal)}
                  className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline cursor-pointer"
                  title="Generate otomatis nama standar"
                >
                  <Sparkles size={11} />
                  <span>Format Standar</span>
                </button>
              )}
            </div>
            <Input
              id="form-judul-bank"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: PAS Ganjil - Matematika Tingkat X"
              aria-label="Judul Bank Soal"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="form-kode-bank" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kode Paket Bank Soal:
            </label>
            <Input
              id="form-kode-bank"
              value={kodeBank}
              onChange={(e) => setKodeBank(e.target.value.toUpperCase())}
              placeholder="Contoh: PAS-2026-MAT-X"
              aria-label="Kode Bank Soal"
              required
            />
          </div>
        </div>

        {/* Pertanyaan 5: Alokasi Waktu Default */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label htmlFor="form-durasi" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Alokasi Waktu Ujian (Menit):
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[60, 90, 120].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setAlokasiMenit(dur)}
                className={cn(
                  "py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center",
                  alokasiMenit === dur
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300"
                )}
              >
                {dur} Menit
              </button>
            ))}
            <Input
              id="form-durasi"
              type="number"
              value={alokasiMenit}
              onChange={(e) => setAlokasiMenit(Number(e.target.value) || 90)}
              aria-label="Alokasi Durasi Kustom"
              className="text-center font-bold text-xs"
            />
          </div>
        </div>

        {/* Pertanyaan 6: Berbagi Bank Soal (Hanya relevan di mode Mandiri Guru) */}
        {scope === 'MANDIRI_GURU' ? (
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Boleh dipakai guru lain yang se-mapel &amp; setingkat?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsShared(true)}
                className={cn(
                  'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                  isShared
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                Ya, Bagikan
              </button>

              <button
                type="button"
                onClick={() => setIsShared(false)}
                className={cn(
                  'py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center',
                  !isShared
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                Tidak (Pribadi)
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <span className="font-bold">✓ Status Terbit:</span>
              <span>Paket soal massal otomatis berstatus <strong>PUBLISHED</strong> agar dapat langsung dijadwalkan serentak oleh panitia.</span>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold"
          >
            {isSubmitting ? 'Menyimpan...' : scope === 'TERPUSAT_MASSAL' ? 'Terbitkan Paket Massal' : 'Simpan Bank Soal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

