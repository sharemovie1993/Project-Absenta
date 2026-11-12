import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Wand2,
  RotateCcw,
  BookOpen,
  Layers,
} from 'lucide-react';
import type { MultiJurusanSlotConfig } from './cbtOrchestratorHelper';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface JurusanItem {
  id: string;
  kode: string;
  nama: string;
  rombelCount: number;
  rombelNames: string[];
}

export interface SubjectOptionItem {
  id: string;
  mapelId: string;
  tingkat: number;
  namaMapel: string;
  namaGuru?: string;
  soalCount: number;
  isAutoDraft: boolean;
  label: string;
  jurusan?: string | null;
}

export interface CbtMultiJurusanModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  dayName: string;
  sessionIndex: number;
  sessionName: string;
  tingkat: number;
  jurusans: JurusanItem[];
  subjectOptions: SubjectOptionItem[];
  initialConfig?: MultiJurusanSlotConfig | null;
  onSave: (config: MultiJurusanSlotConfig) => void;
}

const JURUSAN_ALIASES: Record<string, string[]> = {
  AKL: ['akl', 'ak', 'akuntansi'],
  PHT: ['pht', 'htl', 'hotel', 'perhotelan'],
  KUL: ['kul', 'tata boga', 'kuliner', 'boga'],
  TAV: ['tav', 'audio video', 'elektronika', 'te'],
  TOI: ['toi', 'otomasi industri', 'otomasi'],
  TKJ: ['tkj', 'tjkt', 'komputer', 'jaringan'],
  TKR: ['tkr', 'kendaraan ringan', 'otomotif'],
  TSM: ['tsm', 'sepeda motor', 'motor'],
  TP: ['tp', 'tm', 'pemesinan', 'mesin', 'teknik mesin'],
};

export const CbtMultiJurusanModal: React.FC<CbtMultiJurusanModalProps> = ({
  isOpen,
  onClose,
  dayIndex,
  dayName,
  sessionIndex,
  sessionName,
  tingkat,
  jurusans,
  subjectOptions,
  initialConfig,
  onSave,
}) => {
  const defaultTitle = tingkat === 10 ? 'DDPK Kejuruan' : 'MPP (Mata Pelajaran Pilihan)';
  const [title, setTitle] = useState(defaultTitle);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialConfig) {
      setTitle(initialConfig.title || defaultTitle);
      setAssignments(initialConfig.assignments || {});
    } else {
      setTitle(defaultTitle);
      setAssignments({});
    }
  }, [initialConfig, defaultTitle, isOpen]);

  // Total terpetakan
  const mappedCount = useMemo(() => {
    return jurusans.filter((j) => Boolean(assignments[j.kode])).length;
  }, [jurusans, assignments]);

  // ⚡ Heuristik Auto-Match Otomatis Cerdas (Mendukung DDPK, MPP, Produktif SMK)
  const handleAutoMatch = () => {
    let matchedCount = 0;
    const nextAssignments: Record<string, string> = { ...assignments };

    jurusans.forEach((jur) => {
      const jurKodeUpper = (jur.kode || '').toUpperCase().trim();
      const jurKodeLower = jurKodeUpper.toLowerCase();
      const jurNamaLower = (jur.nama || '').toLowerCase().trim();
      const aliases = JURUSAN_ALIASES[jurKodeUpper] || [jurKodeLower];

      // Cari mata pelajaran terbaik untuk jurusan ini
      const matched = subjectOptions.find((opt) => {
        const optNameLower = opt.namaMapel.toLowerCase();
        const optLabelLower = opt.label.toLowerCase();
        const optJurLower = (opt.jurusan || '').toLowerCase();

        // 1. Metadata jurusan pada bank soal cocok persis
        if (optJurLower && (optJurLower === jurKodeLower || optJurLower === jurNamaLower)) {
          return true;
        }

        // 2. Cocokkan alias resmi kurikulum (misal "MPP AK" -> AKL, "MPP HTL" -> PHT, "DDPK TM" -> TP)
        const isAliasMatch = aliases.some((a) => {
          const reg = new RegExp(`(^|[^a-z0-9])${a}([^a-z0-9]|$)`, 'i');
          return reg.test(optNameLower) || reg.test(optLabelLower);
        });
        if (isAliasMatch) return true;

        // 3. Nama mapel memuat kata kunci nama jurusan (misal "Akuntansi", "Kuliner", "Perhotelan")
        if (
          jurNamaLower.length >= 4 &&
          (optNameLower.includes(jurNamaLower) || optLabelLower.includes(jurNamaLower))
        ) {
          return true;
        }

        return false;
      });

      if (matched) {
        nextAssignments[jur.kode] = matched.id;
        matchedCount++;
      }
    });

    setAssignments(nextAssignments);
    if (matchedCount > 0) {
      toast.success(`⚡ Berhasil mencocokkan ${matchedCount} dari ${jurusans.length} jurusan secara otomatis!`);
    } else {
      toast('Tidak ditemukan mapel dengan kode/nama jurusan yang cocok secara otomatis.', {
        icon: 'ℹ️',
      });
    }
  };

  const handleSelectMapel = (kodeJurusan: string, bankId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (!bankId) {
        delete next[kodeJurusan];
      } else {
        next[kodeJurusan] = bankId;
      }
      return next;
    });
  };

  const handleResetAll = () => {
    setAssignments({});
    toast.success('Pilihan mapel untuk semua jurusan dikosongkan.');
  };

  const handleSave = () => {
    if (mappedCount === 0) {
      toast.error('Pilihlah minimal 1 mata pelajaran untuk jurusan yang diujikan.');
      return;
    }

    onSave({
      title: title.trim() || defaultTitle,
      assignments,
    });
    onClose();
  };

  const titlePresets = [
    'MPP (Mata Pelajaran Pilihan)',
    'DDPK Kejuruan',
    'Konsentrasi Keahlian',
    'Mapel Produktif',
    'Dasar-Dasar Program Keahlian',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Atur Mapel Kejuruan per Jurusan
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {dayName} (Hari {dayIndex}) • {sessionName} • Kelas {tingkat} (SMK Serentak)
            </p>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Banner Penjelasan Singkat */}
        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-2.5">
          <Layers size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-purple-900 dark:text-purple-200">
              Sesi Ujian Bersama Serentak:
            </span>{' '}
            Seluruh rombel Kelas {tingkat} melaksanakan ujian pada jam sesi yang sama, namun mengerjakan Bank Soal
            yang berbeda sesuai kompetensi keahlian masing-masing jurusan.
          </div>
        </div>

        {/* Baris Konfigurasi Judul Slot & Aksi Cepat */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Label Tampilan Slot Matriks:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Misal: DDPK Kejuruan"
                className="w-full sm:w-80 h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAutoMatch}
                className="text-xs h-8 px-3 font-bold bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-2xs cursor-pointer flex items-center gap-1.5"
                title="Cocokkan otomatis bank soal ke jurusan berdasarkan nama/kode mapel"
              >
                <Wand2 size={13} />
                <span>⚡ Auto-Match Otomatis</span>
              </Button>

              {mappedCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleResetAll}
                  className="text-xs h-8 px-2.5 font-bold text-slate-600 border-slate-300 bg-white hover:bg-slate-100 cursor-pointer"
                  title="Kosongkan seluruh pilihan mapel"
                >
                  <RotateCcw size={12} className="mr-1" />
                  <span>Kosongkan</span>
                </Button>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400 font-semibold">Preset Cepat:</span>
            {titlePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTitle(preset)}
                className={cn(
                  'px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer',
                  title === preset
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Pemetaan Jurusan Excel Grid */}
        <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 uppercase tracking-wider divide-x divide-slate-300 dark:divide-slate-700">
                <th className="py-2 px-2.5 w-10 text-center">No</th>
                <th className="py-2 px-3 w-56">Program / Konsentrasi Keahlian</th>
                <th className="py-2 px-3">Bank Soal / Mata Pelajaran Terpasang</th>
                <th className="py-2 px-2.5 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
              {jurusans.map((jur, idx) => {
                const selectedBankId = assignments[jur.kode] || '';
                const selectedOpt = subjectOptions.find((o) => o.id === selectedBankId);
                const isAutoDraft = Boolean(
                  selectedOpt?.isAutoDraft || (selectedBankId && selectedBankId.startsWith('auto_mapel_'))
                );

                return (
                  <tr
                    key={jur.kode}
                    className={cn(
                      'divide-x divide-slate-200 dark:divide-slate-700 transition-colors',
                      selectedBankId
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/50'
                    )}
                  >
                    {/* No */}
                    <td className="py-2 px-2 text-center align-middle font-bold text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Jurusan & Rombel */}
                    <td className="py-2 px-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {jur.kode}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {jur.nama}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {jur.rombelCount} Rombel: {jur.rombelNames.join(', ')}
                      </div>
                    </td>

                    {/* Dropdown Mapel / Bank Soal */}
                    <td className="py-1.5 px-3 align-middle">
                      <select
                        value={selectedBankId}
                        onChange={(e) => handleSelectMapel(jur.kode, e.target.value)}
                        className={cn(
                          'w-full h-8 px-2 text-xs rounded-md border font-medium transition-all cursor-pointer',
                          selectedBankId
                            ? isAutoDraft
                              ? 'bg-amber-50 text-amber-950 border-amber-400 dark:bg-amber-950/40 dark:text-amber-200 font-semibold'
                              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-indigo-400 font-semibold'
                            : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-700'
                        )}
                      >
                        <option value="">— Pilih Bank Soal / Mapel Kejuruan —</option>
                        {subjectOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2.5 text-center align-middle">
                      {selectedBankId ? (
                        isAutoDraft ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ✨ Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={10} />
                            <span>Siap</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Kosong
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary & Peringatan jika ada yang kosong */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Ringkasan:
            </span>
            <span
              className={cn(
                'font-bold px-2 py-0.5 rounded-full text-xs',
                mappedCount === jurusans.length
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              )}
            >
              {mappedCount} dari {jurusans.length} Jurusan Terpetakan
            </span>
          </div>

          {mappedCount < jurusans.length && (
            <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle size={12} />
              <span>Jurusan yang kosong tidak akan dibuatkan jadwal pada sesi ini.</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8 px-3 font-semibold">
          Batal
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          className="text-xs h-8 px-3.5 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles size={13} />
          <span>Simpan Konfigurasi Paket</span>
        </Button>
      </div>
    </Modal>
  );
};
