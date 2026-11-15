import React, { useState, useMemo } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import {
  Layers,
  Wand2,
  Save,
  Search,
  School,
  DoorOpen,
  CheckCircle2,
  Printer,
  CreditCard,
  ArrowRight,
  Filter,
  Map,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useJenjang } from '@/hooks/useJenjang';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import {
  KelasRoomMapping,
  generateClassRoomMappings,
  savePersistedRoomMappings,
  swapRoomSlotBetweenClasses,
  moveRoomMappingOrder,
} from './cbtOrchestratorHelper';
import { CbtLabelRuangPrintModal } from './CbtLabelRuangPrintModal';
import { CbtKartuUjianPrintModal } from './CbtKartuUjianPrintModal';
import { CbtDenahModal } from './CbtDenahModal';
import type { CbtEventItem } from '@/types/cbt.types';

interface CbtKelasRoomTreePanelProps {
  topFlightDeck?: React.ReactNode;
  kelasList: any[];
  roomMappings: KelasRoomMapping[];
  onUpdateRoomMappings: (mappings: KelasRoomMapping[]) => void;
  tenantId?: string;
  eventId?: string;
  eventName?: string;
  activeTpName?: string;
  semester?: string;
  activeEvent?: CbtEventItem | null;
  targetTingkat?: number[];
  onProceedToNextPhase?: () => void;
}

export const CbtKelasRoomTreePanel: React.FC<CbtKelasRoomTreePanelProps> = ({
  topFlightDeck,
  kelasList,
  roomMappings,
  onUpdateRoomMappings,
  tenantId,
  eventId,
  eventName,
  activeTpName,
  semester,
  activeEvent,
  targetTingkat,
  onProceedToNextPhase,
}) => {
  const isMobile = useIsMobile(768);
  const { jenjang, tingkatList } = useJenjang();

  // Scoped tingkat list strictly adhering to event settings
  const effectiveTingkatList = useMemo(() => {
    if (targetTingkat && targetTingkat.length > 0) {
      return tingkatList.filter((t) => targetTingkat.includes(t));
    }
    const existingTingkat = Array.from(new Set(roomMappings.map((m) => m.tingkat).filter(Boolean)));
    if (existingTingkat.length > 0) {
      return tingkatList.filter((t) => existingTingkat.includes(t));
    }
    return tingkatList;
  }, [targetTingkat, tingkatList, roomMappings]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [roomPrefix, setRoomPrefix] = useState('R.');

  // Modal Cetak Label Ruang State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [targetKelasIdForPrint, setTargetKelasIdForPrint] = useState<string | null>(null);

  // Modal Cetak Kartu Ujian State (A4 Grid 2x2)
  const [isKartuModalOpen, setIsKartuModalOpen] = useState(false);
  const [targetKelasIdForKartu, setTargetKelasIdForKartu] = useState<string | null>(null);

  // Modal Studio Denah Spasial State
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);

  // Daftar seluruh slot kode ruang unik yang tersedia (terurut R.01, R.02, dst)
  const availableSlotOptions = useMemo(() => {
    const slots = Array.from(new Set(roomMappings.map((m) => m.slot_ruang).filter(Boolean)));
    slots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return slots.map((s) => {
      const assigned = roomMappings.find((m) => m.slot_ruang === s);
      return {
        slot: s,
        currentKelasName: assigned?.nama_kelas || '',
        currentKelasId: assigned?.kelas_id || '',
      };
    });
  }, [roomMappings]);

  // Auto-generate sequential room slots R.01 s/d R.n
  const handleAutoPlottingRooms = () => {
    if (!kelasList.length) {
      toast.error('Data kelas belum tersedia');
      return;
    }
    const generated = generateClassRoomMappings(kelasList, roomPrefix);
    onUpdateRoomMappings(generated);
    savePersistedRoomMappings(generated, tenantId, eventId);
    toast.success(
      `Berhasil memetakan slot ${roomPrefix}01 s/d ${roomPrefix}${String(kelasList.length).padStart(2, '0')} untuk ${kelasList.length} rombel!`
    );
  };

  // Menukar slot kode ruang ke rombel lain (SWAP aman tanpa duplikasi)
  const handleSwapSlot = (sourceKelasId: string, targetSlotRuang: string) => {
    const src = roomMappings.find((m) => m.kelas_id === sourceKelasId);
    const other = roomMappings.find((m) => m.slot_ruang === targetSlotRuang);
    const next = swapRoomSlotBetweenClasses(roomMappings, sourceKelasId, targetSlotRuang);
    onUpdateRoomMappings(next);
    savePersistedRoomMappings(next, tenantId, eventId);

    if (other && other.kelas_id !== sourceKelasId) {
      toast.success(`Slot ${targetSlotRuang} ditukar ke ${src?.nama_kelas || 'Kelas'} (bertukar dengan ${other.nama_kelas})`);
    } else {
      toast.success(`Slot berhasil dipindah ke ${targetSlotRuang}`);
    }
  };

  // Menggeser urutan alokasi slot naik / turun
  const handleMoveSlot = (currentFilteredIdx: number, direction: 'UP' | 'DOWN') => {
    const targetItem = filteredList[currentFilteredIdx];
    if (!targetItem) return;

    const realIndex = roomMappings.findIndex((m) => m.kelas_id === targetItem.kelas_id);
    if (realIndex === -1) return;

    const next = moveRoomMappingOrder(roomMappings, realIndex, direction);
    onUpdateRoomMappings(next);
    savePersistedRoomMappings(next, tenantId, eventId);
    toast.success('Urutan slot ruang berhasil digeser!');
  };

  const handleUpdateNamaRuangFisik = (kelasId: string, value: string) => {
    const next = roomMappings.map((m) => {
      if (m.kelas_id !== kelasId) return m;
      return { ...m, nama_ruang: value };
    });
    onUpdateRoomMappings(next);
    savePersistedRoomMappings(next, tenantId, eventId);
  };

  const handleSaveToStorage = () => {
    savePersistedRoomMappings(roomMappings, tenantId, eventId);
    toast.success('Konfigurasi ploting ruang ke kelas berhasil disimpan!');
  };

  // Open modal print for a single room
  const handlePrintSingleLabel = (kelasId: string) => {
    setTargetKelasIdForPrint(kelasId);
    setIsPrintModalOpen(true);
  };

  // Open modal print for all rooms
  const handlePrintAllLabels = () => {
    setTargetKelasIdForPrint(null);
    setIsPrintModalOpen(true);
  };

  // Open modal cetak kartu ujian untuk 1 rombel tertentu
  const handlePrintSingleKartu = (kelasId: string) => {
    setTargetKelasIdForKartu(kelasId);
    setIsKartuModalOpen(true);
  };

  // Filter & Search List
  const filteredList = useMemo(() => {
    return roomMappings.filter((item) => {
      if (filterTingkat !== 'ALL' && item.tingkat !== filterTingkat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.nama_kelas.toLowerCase().includes(q) ||
          item.slot_ruang.toLowerCase().includes(q) ||
          item.nama_ruang.toLowerCase().includes(q) ||
          (item.kode_jurusan || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [roomMappings, filterTingkat, searchQuery]);

  const totalClasses = kelasList.length;
  const mappedCount = roomMappings.filter((m) => Boolean(m.slot_ruang.trim())).length;

  const getTingkatBadgeProps = (tingkat: number) => {
    switch (tingkat) {
      case 10:
        return {
          cardBorder: 'border-l-4 border-l-sky-500',
          badge:
            'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200/90 dark:border-sky-800',
          dot: 'bg-sky-500',
        };
      case 11:
        return {
          cardBorder: 'border-l-4 border-l-emerald-500',
          badge:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 12:
        return {
          cardBorder: 'border-l-4 border-l-amber-500',
          badge:
            'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800',
          dot: 'bg-amber-500',
        };
      default:
        return {
          cardBorder: 'border-l-4 border-l-purple-500',
          badge:
            'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/90 dark:border-purple-800',
          dot: 'bg-purple-500',
        };
    }
  };

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* ── 1 RUANG SEAMLESS FLIGHT DECK + TOOLBAR ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {topFlightDeck}

        {/* ── Single-Row Unified Master Filter & Action Toolbar (1 Ruang, Label Ringkas Maks 2 Kata) ── */}
        <div className="p-2 sm:p-2.5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          {/* Left: Search Box + Tingkat Chips (Label Maks 2 Kata) */}
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
            {/* Search */}
            <div className="relative w-full sm:w-48 lg:w-56 shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari rombel/ruang..."
                aria-label="Cari rombel atau ruang"
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {/* Tingkat Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Tingkat:</span>
              <button
                type="button"
                onClick={() => setFilterTingkat('ALL')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap',
                  filterTingkat === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                Semua ({roomMappings.length})
              </button>
              {effectiveTingkatList.map((t) => {
                const count = roomMappings.filter((m) => m.tingkat === t).length;
                const isSelected = filterTingkat === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterTingkat(t)}
                    className={cn(
                      'px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap',
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    )}
                  >
                    Kelas {t} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Format + Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap justify-between xl:justify-end shrink-0">
            {/* Format Selector */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format:</span>
              {['R.', 'Ruang '].map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setRoomPrefix(pf)}
                  className={cn(
                    'px-1.5 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap',
                    roomPrefix === pf
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  )}
                >
                  {pf}xx
                </button>
              ))}
            </div>

            {/* Action Buttons: Auto, Simpan, Label, Denah, Lanjut */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoPlottingRooms}
              className="text-xs h-7 px-2 font-bold text-indigo-700 border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer shadow-2xs shrink-0"
              title="Plot otomatis urutan slot R.01 s/d R.n"
            >
              <Wand2 size={11} className="mr-1 text-indigo-600" />
              <span>Auto Plot</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveToStorage}
              className="text-xs h-7 px-2 font-bold text-slate-700 dark:text-slate-200 border-slate-300 bg-white hover:bg-slate-100 cursor-pointer shadow-2xs shrink-0"
              title="Simpan ploting ruang"
            >
              <Save size={11} className="mr-1 text-slate-600" />
              <span>Simpan</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintAllLabels}
              className="text-xs h-7 px-2 font-bold text-emerald-700 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer shadow-2xs shrink-0"
              title="Cetak label ruang ujian seluruh rombel"
            >
              <Printer size={11} className="mr-1" />
              <span>Cetak Label</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDenahModalOpen(true)}
              className="text-xs h-7 px-2 font-bold text-indigo-700 border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100 cursor-pointer shadow-2xs shrink-0"
              title="Buka denah interaktif lokasi ujian dan kampus"
            >
              <Map size={11} className="mr-1 text-indigo-600" />
              <span>Denah</span>
            </Button>

            {onProceedToNextPhase && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  savePersistedRoomMappings(roomMappings, tenantId, eventId);
                  if (onProceedToNextPhase) onProceedToNextPhase();
                }}
                className="text-xs h-7 px-2.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Lanjut</span>
                <ArrowRight size={11} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Konten Ploting Ruang: Mode Mobile vs Desktop Tabel ── */}
      {filteredList.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
          <p>Belum ada slot ruang yang sesuai pencarian atau belum di-generate.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoPlottingRooms}
            className="text-xs font-bold cursor-pointer"
          >
            <Wand2 size={13} className="mr-1.5" />
            <span>Klik di sini untuk Ploting Ruang Otomatis</span>
          </Button>
        </div>
      ) : isMobile ? (
        /* Mobile Card Deck (Pilar 30 Anti-Overlapping) */
        <div className="space-y-2.5 w-full max-w-full min-w-0" role="region" aria-label="Daftar Ploting Ruang Seluler">
          {filteredList.map((cls, idx) => {
            const tProps = getTingkatBadgeProps(cls.tingkat);
            return (
              <div
                key={cls.kelas_id}
                className={cn(
                  'p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2.5',
                  tProps.cardBorder
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {cls.nama_kelas}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black', tProps.badge)}>
                      Tingkat {formatTingkatRomawi(cls.tingkat)}
                    </span>
                    {cls.kode_jurusan && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {cls.kode_jurusan}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Slot Kode Ruang (Pindah / Tukar)
                    </label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="relative flex-1">
                        <select
                          value={cls.slot_ruang}
                          onChange={(e) => handleSwapSlot(cls.kelas_id, e.target.value)}
                          aria-label={`Slot kode ruang untuk ${cls.nama_kelas}`}
                          className="w-full pl-2 pr-5 py-1.5 text-xs font-mono font-black rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 focus:bg-white focus:outline-hidden cursor-pointer appearance-none shadow-2xs"
                        >
                          {availableSlotOptions.map((opt) => (
                            <option key={opt.slot} value={opt.slot} className="font-sans font-semibold text-slate-800">
                              {opt.slot} {opt.currentKelasName ? `(${opt.currentKelasName})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSlot(idx, 'UP')}
                          title="Tukar slot dengan rombel atas"
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronUp size={10} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === filteredList.length - 1}
                          onClick={() => handleMoveSlot(idx, 'DOWN')}
                          title="Tukar slot dengan rombel bawah"
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronDown size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nama Ruang Fisik (Ketik Manual)
                    </label>
                    <input
                      type="text"
                      value={cls.nama_ruang}
                      onChange={(e) => handleUpdateNamaRuangFisik(cls.kelas_id, e.target.value)}
                      placeholder="Contoh: Lab Komputer 1..."
                      aria-label={`Nama ruang untuk ${cls.nama_kelas}`}
                      className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintSingleLabel(cls.kelas_id)}
                    aria-label={`Cetak label ruang ${cls.nama_kelas}`}
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Label ({cls.slot_ruang || 'Slot'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintSingleKartu(cls.kelas_id)}
                    aria-label={`Cetak kartu ujian ${cls.nama_kelas}`}
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard size={13} />
                    <span>Kartu ({cls.slot_ruang || 'Slot'})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Tabular Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs w-full max-w-full min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" role="table" aria-label="Tabel Ploting Ruang Ujian ke Rombel">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold">
                  <th scope="col" className="py-2.5 px-3 w-10 text-center">No</th>
                  <th scope="col" className="py-2.5 px-3">Rombel / Kelas</th>
                  <th scope="col" className="py-2.5 px-3 w-28 text-center">Tingkat</th>
                  <th scope="col" className="py-2.5 px-3 w-32">Jurusan</th>
                  <th scope="col" className="py-2.5 px-3 w-48">
                    <span>Slot Kode Ruang</span>
                    <span className="block text-[10px] font-normal text-slate-400">Pilih / Tukar Slot</span>
                  </th>
                  <th scope="col" className="py-2.5 px-3">
                    <span>Nama Ruang Fisik</span>
                    <span className="block text-[10px] font-normal text-slate-400">Ketik Manual (cth: Lab Komputer 1)</span>
                  </th>
                  <th scope="col" className="py-2.5 px-3 w-44 text-right">Aksi Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredList.map((cls, idx) => {
                  const tProps = getTingkatBadgeProps(cls.tingkat);
                  return (
                    <tr key={cls.kelas_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* 1. No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* 2. Rombel / Kelas */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', tProps.dot)} />
                          <span>{cls.nama_kelas}</span>
                        </div>
                      </td>

                      {/* 3. Tingkat */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black', tProps.badge)}>
                          Tingkat {formatTingkatRomawi(cls.tingkat)}
                        </span>
                      </td>

                      {/* 4. Jurusan */}
                      <td className="py-2.5 px-3">
                        {cls.kode_jurusan ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                            {cls.kode_jurusan}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                    {/* 5. Slot Kode Ruang (Slot Tetap / Non-Editable Text, Bisa Dipindah / Ditukar ke Kelas Mana) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="relative min-w-[130px] flex-1">
                          <select
                            value={cls.slot_ruang}
                            onChange={(e) => handleSwapSlot(cls.kelas_id, e.target.value)}
                            aria-label={`Slot kode ruang untuk ${cls.nama_kelas}`}
                            className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono font-black rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 focus:bg-white focus:outline-hidden cursor-pointer shadow-2xs appearance-none transition-colors"
                            title={`Slot saat ini: ${cls.slot_ruang}. Pilih slot lain untuk menukar penugasan ruang`}
                          >
                            {availableSlotOptions.map((opt) => (
                              <option key={opt.slot} value={opt.slot} className="font-sans font-semibold text-slate-800">
                                {opt.slot} {opt.currentKelasName ? `(${opt.currentKelasName})` : ''}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                        </div>

                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSlot(idx, 'UP')}
                            title="Tukar slot dengan rombel atas"
                            className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === filteredList.length - 1}
                            onClick={() => handleMoveSlot(idx, 'DOWN')}
                            title="Tukar slot dengan rombel bawah"
                            className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            <ChevronDown size={11} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* 6. Nama Ruang Fisik (Ketik Manual) */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={cls.nama_ruang}
                        onChange={(e) => handleUpdateNamaRuangFisik(cls.kelas_id, e.target.value)}
                        placeholder="Ketik nama ruang fisik..."
                        aria-label={`Nama ruang untuk ${cls.nama_kelas}`}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      />
                    </td>

                    {/* 7. Label & Kartu Ruang Aksi */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintSingleLabel(cls.kelas_id)}
                          aria-label={`Cetak label ruang ${cls.nama_kelas}`}
                          className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Cetak banner pintu A4 Landscape untuk ${cls.slot_ruang || 'Slot'} (${cls.nama_kelas})`}
                        >
                          <Printer size={12} />
                          <span>Label</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSingleKartu(cls.kelas_id)}
                          aria-label={`Cetak kartu ujian ${cls.nama_kelas}`}
                          className="py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Cetak kartu ujian CBT (A4 Grid 2x2) untuk ${cls.nama_kelas}`}
                        >
                          <CreditCard size={12} />
                          <span>Kartu</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Footer Navigasi Antar-Fase ── */}
      {/* ── 6. Modal Printout Label Ruang (Universal Document Printing) ── */}
      {isPrintModalOpen && (
        <CbtLabelRuangPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setTargetKelasIdForPrint(null);
          }}
          items={roomMappings}
          selectedKelasId={targetKelasIdForPrint}
          eventName={eventName}
          activeTpName={activeTpName}
          semester={semester}
          activeEvent={activeEvent}
        />
      )}

      {/* ── 7. Modal Cetak Kartu Peserta Ujian CBT (A4 Grid 2x2) ── */}
      {isKartuModalOpen && (
        <CbtKartuUjianPrintModal
          isOpen={isKartuModalOpen}
          onClose={() => {
            setIsKartuModalOpen(false);
            setTargetKelasIdForKartu(null);
          }}
          kelasList={kelasList}
          roomMappings={roomMappings}
          selectedKelasId={targetKelasIdForKartu}
          eventName={eventName}
          activeTpName={activeTpName}
          semester={semester}
          activeEvent={activeEvent}
        />
      )}

      {/* ── 8. Modal Studio Denah Spasial (Interactive Puzzle Canvas) ── */}
      {isDenahModalOpen && (
        <CbtDenahModal
          isOpen={isDenahModalOpen}
          onClose={() => setIsDenahModalOpen(false)}
          roomMappings={roomMappings}
          eventName={eventName}
          isReadOnly={false}
        />
      )}
    </div>
  );
};
