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
  ArrowRight,
  Filter,
  Map,
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
} from './cbtOrchestratorHelper';
import { CbtLabelRuangPrintModal } from './CbtLabelRuangPrintModal';
import { CbtDenahModal } from './CbtDenahModal';

interface CbtKelasRoomTreePanelProps {
  kelasList: any[];
  roomMappings: KelasRoomMapping[];
  onUpdateRoomMappings: (mappings: KelasRoomMapping[]) => void;
  tenantId?: string;
  eventName?: string;
  onProceedToNextPhase?: () => void;
}

export const CbtKelasRoomTreePanel: React.FC<CbtKelasRoomTreePanelProps> = ({
  kelasList,
  roomMappings,
  onUpdateRoomMappings,
  tenantId,
  eventName,
  onProceedToNextPhase,
}) => {
  const isMobile = useIsMobile(768);
  const { jenjang, tingkatList } = useJenjang();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [roomPrefix, setRoomPrefix] = useState('R.');

  // Modal Cetak Label Ruang State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [targetKelasIdForPrint, setTargetKelasIdForPrint] = useState<string | null>(null);

  // Modal Studio Denah Spasial State
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);

  // Auto-generate sequential room slots R.01 s/d R.n
  const handleAutoPlottingRooms = () => {
    if (!kelasList.length) {
      toast.error('Data kelas belum tersedia');
      return;
    }
    const generated = generateClassRoomMappings(kelasList, roomPrefix);
    onUpdateRoomMappings(generated);
    savePersistedRoomMappings(generated, tenantId);
    toast.success(
      `Berhasil memetakan slot ${roomPrefix}01 s/d ${roomPrefix}${String(kelasList.length).padStart(2, '0')} untuk ${kelasList.length} rombel!`
    );
  };

  const handleUpdateSingleRoom = (kelasId: string, field: 'slot_ruang' | 'nama_ruang', value: string) => {
    const next = roomMappings.map((m) => {
      if (m.kelas_id !== kelasId) return m;
      return { ...m, [field]: value };
    });
    onUpdateRoomMappings(next);
  };

  const handleSaveToStorage = () => {
    savePersistedRoomMappings(roomMappings, tenantId);
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
    <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-4 w-full max-w-full min-w-0">
      {/* ── 1. Overview & Action Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              <DoorOpen size={18} />
            </span>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Ploting Ruang Ujian
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Atur penempatan kode ruang fisik untuk setiap rombel.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
            <School size={13} className="mr-1" />
            <span>{totalClasses} Rombel</span>
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={13} className="mr-1" />
            <span>{mappedCount}/{totalClasses} Ruang Terpetakan</span>
          </Badge>
        </div>
      </div>

      {/* ── 2. Action Controls & Prefix Config ── */}
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Format:
          </span>
          <div className="flex items-center gap-1">
            {['R.', 'Ruang ', 'R-LAB-'].map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setRoomPrefix(pf)}
                className={cn(
                  'px-2 py-0.5 text-xs font-bold rounded-md border transition-all cursor-pointer',
                  roomPrefix === pf
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                )}
              >
                {pf}xx
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoPlottingRooms}
            className="text-xs h-8 px-3 font-bold text-indigo-700 border-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 cursor-pointer"
            title="Generate otomatis urutan slot R.01 s/d R.n sesuai urutan kelas"
          >
            <Wand2 size={13} className="mr-1.5 text-indigo-600" />
            <span>Plot Otomatis</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveToStorage}
            className="text-xs h-8 px-3.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-2xs"
            title="Simpan ploting ruang"
          >
            <Save size={13} className="mr-1.5" />
            <span>Simpan</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintAllLabels}
            className="text-xs h-8 px-3 font-bold text-emerald-700 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 cursor-pointer"
            title="Cetak label ruang ujian seluruh rombel (A4 Landscape)"
          >
            <Printer size={13} className="mr-1.5" />
            <span>Cetak Label</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDenahModalOpen(true)}
            className="text-xs h-8 px-3 font-bold text-indigo-700 border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer shadow-2xs"
            title="Buka denah interaktif lokasi ujian dan kampus"
          >
            <Map size={13} className="mr-1.5 text-indigo-600" />
            <span>Denah Ujian</span>
          </Button>
        </div>
      </div>

      {/* ── 3. Toolbar Pencarian & Filter Tingkat ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari rombel, slot ruang (R.01), atau jurusan..."
            aria-label="Cari rombel atau ruang"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterTingkat('ALL')}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap',
              filterTingkat === 'ALL'
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
            )}
          >
            Semua Tingkat ({roomMappings.length})
          </button>
          {tingkatList.map((t) => {
            const count = roomMappings.filter((m) => m.tingkat === t).length;
            const isSelected = filterTingkat === t;
            const activeBg =
              t === 10
                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                : t === 11
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : t === 12
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-purple-600 text-white border-purple-600 shadow-2xs';

            const dotColor =
              t === 10
                ? 'bg-sky-400'
                : t === 11
                ? 'bg-emerald-400'
                : t === 12
                ? 'bg-amber-400'
                : 'bg-purple-400';

            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTingkat(t)}
                className={cn(
                  'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                  isSelected
                    ? activeBg
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', isSelected ? 'bg-white' : dotColor)} />
                <span>Tingkat {formatTingkatRomawi(t)} ({count})</span>
              </button>
            );
          })}
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
                      Slot Ruang
                    </label>
                    <input
                      type="text"
                      value={cls.slot_ruang}
                      onChange={(e) => handleUpdateSingleRoom(cls.kelas_id, 'slot_ruang', e.target.value)}
                      aria-label={`Slot ruang untuk ${cls.nama_kelas}`}
                      className="w-full mt-0.5 px-2.5 py-1.5 text-xs font-mono font-black rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nama Ruang Fisik
                    </label>
                    <input
                      type="text"
                      value={cls.nama_ruang}
                      onChange={(e) => handleUpdateSingleRoom(cls.kelas_id, 'nama_ruang', e.target.value)}
                      aria-label={`Nama ruang untuk ${cls.nama_kelas}`}
                      className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handlePrintSingleLabel(cls.kelas_id)}
                    aria-label={`Cetak label ruang ${cls.nama_kelas}`}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Cetak Label ({cls.slot_ruang || 'Slot'})</span>
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
                  <th scope="col" className="py-2.5 px-3 w-40">Slot Kode Ruang</th>
                  <th scope="col" className="py-2.5 px-3">Nama Ruang Fisik</th>
                  <th scope="col" className="py-2.5 px-3 w-36 text-right">Label Ruang</th>
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

                    {/* 5. Slot Kode Ruang */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={cls.slot_ruang}
                        onChange={(e) => handleUpdateSingleRoom(cls.kelas_id, 'slot_ruang', e.target.value)}
                        aria-label={`Slot ruang untuk ${cls.nama_kelas}`}
                        className="w-full px-2.5 py-1 text-xs font-mono font-black rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* 6. Nama Ruang Fisik */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={cls.nama_ruang}
                        onChange={(e) => handleUpdateSingleRoom(cls.kelas_id, 'nama_ruang', e.target.value)}
                        aria-label={`Nama ruang untuk ${cls.nama_kelas}`}
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden"
                      />
                    </td>

                    {/* 7. Label Ruang Aksi */}
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handlePrintSingleLabel(cls.kelas_id)}
                        aria-label={`Cetak label ruang ${cls.nama_kelas}`}
                        className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title={`Cetak banner pintu A4 Landscape untuk ${cls.slot_ruang || 'Slot'} (${cls.nama_kelas})`}
                      >
                        <Printer size={12} />
                        <span>Cetak</span>
                      </button>
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
      {onProceedToNextPhase && (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Pastikan seluruh kode slot ruang (R.01 s/d R.n) sudah sesuai sebelum masuk ke penjadwalan.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={onProceedToNextPhase}
            className="flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs px-4 py-2 shadow-2xs"
          >
            <span>Lanjut ke Fase 3: Matriks Hari &amp; Sesi</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

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
        />
      )}

      {/* ── 7. Modal Studio Denah Spasial (Interactive Puzzle Canvas) ── */}
      {isDenahModalOpen && (
        <CbtDenahModal
          isOpen={isDenahModalOpen}
          onClose={() => setIsDenahModalOpen(false)}
          roomMappings={roomMappings}
          eventName={eventName}
          isReadOnly={false}
        />
      )}
    </Card>
  );
};
