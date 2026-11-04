import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import {
  Layers,
  Wand2,
  Save,
  Search,
  ChevronDown,
  ChevronRight,
  School,
  DoorOpen,
  Users,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useJenjang } from '@/hooks/useJenjang';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import {
  KelasRoomMapping,
  generateClassRoomMappings,
  groupMappingsByTingkat,
  savePersistedRoomMappings,
} from './cbtOrchestratorHelper';

interface CbtKelasRoomTreePanelProps {
  kelasList: any[];
  roomMappings: KelasRoomMapping[];
  onUpdateRoomMappings: (mappings: KelasRoomMapping[]) => void;
  tenantId?: string;
}

export const CbtKelasRoomTreePanel: React.FC<CbtKelasRoomTreePanelProps> = ({
  kelasList,
  roomMappings,
  onUpdateRoomMappings,
  tenantId,
}) => {
  const { jenjang } = useJenjang();
  const [searchQuery, setSearchQuery] = useState('');
  const [roomPrefix, setRoomPrefix] = useState('R.');
  const [openTingkatMap, setOpenTingkatMap] = useState<Record<number, boolean>>({});

  // Auto-generate sequential room slots R.01 s/d R.n
  const handleAutoPlottingRooms = () => {
    if (!kelasList.length) {
      toast.error('Data kelas belum tersedia');
      return;
    }
    const generated = generateClassRoomMappings(kelasList, roomPrefix);
    onUpdateRoomMappings(generated);
    savePersistedRoomMappings(generated, tenantId);
    toast.success(`Berhasil memetakan slot ${roomPrefix}01 s/d ${roomPrefix}${String(kelasList.length).padStart(2, '0')} untuk ${kelasList.length} rombel!`);
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
    toast.success(`Konfigurasi ploting ruang ke kelas berhasil disimpan!`);
  };

  // Group mappings by tingkat
  const groupedByTingkat = useMemo(() => {
    return groupMappingsByTingkat(roomMappings);
  }, [roomMappings]);

  const tingkatKeys = useMemo(() => {
    return Array.from(groupedByTingkat.keys()).sort((a, b) => a - b);
  }, [groupedByTingkat]);

  // Filter items by search
  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return groupedByTingkat;
    const q = searchQuery.toLowerCase();
    const map = new Map<number, KelasRoomMapping[]>();

    groupedByTingkat.forEach((list, tingkat) => {
      const filtered = list.filter((item) => {
        return (
          item.nama_kelas.toLowerCase().includes(q) ||
          item.slot_ruang.toLowerCase().includes(q) ||
          item.nama_ruang.toLowerCase().includes(q) ||
          (item.kode_jurusan || '').toLowerCase().includes(q)
        );
      });
      if (filtered.length > 0) {
        map.set(tingkat, filtered);
      }
    });

    return map;
  }, [groupedByTingkat, searchQuery]);

  const toggleTingkat = (tingkat: number) => {
    setOpenTingkatMap((prev) => ({
      ...prev,
      [tingkat]: prev[tingkat] === undefined ? false : !prev[tingkat],
    }));
  };

  const totalClasses = kelasList.length;
  const mappedCount = roomMappings.filter((m) => Boolean(m.slot_ruang.trim())).length;

  return (
    <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-4">
      {/* Overview & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              <DoorOpen size={18} />
            </span>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Struktur Ploting Ruang Ujian Kelas-Centrik
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Alokasikan slot ruang fisik (R.01 s/d R.n) untuk setiap rombel per tingkat jenjang {jenjang}.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-violet-200 bg-violet-50 text-violet-700">
            <School size={13} className="mr-1" />
            <span>{totalClasses} Rombel</span>
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={13} className="mr-1" />
            <span>{mappedCount}/{totalClasses} Ruang Terpetakan</span>
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
            <Layers size={13} className="mr-1" />
            <span>{tingkatKeys.length} Tingkat</span>
          </Badge>
        </div>
      </div>

      {/* Action Controls & Prefix Config */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Format Prefix Ruang:
          </label>
          <div className="flex items-center gap-1.5">
            {['R.', 'Ruang ', 'R-LAB-'].map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setRoomPrefix(pf)}
                className={cn(
                  'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                  roomPrefix === pf
                    ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'
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
            className="text-xs h-9 px-3.5 font-bold text-violet-700 border-violet-300 bg-white dark:bg-slate-900 hover:bg-violet-50"
            title="Generate otomatis urutan slot R.01 s/d R.n sesuai struktur kelas"
          >
            <Wand2 size={14} className="mr-1.5 text-violet-600" />
            <span>Ploting Ruang ke Kelas</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveToStorage}
            className="text-xs h-9 px-4 font-bold bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Save size={14} className="mr-1.5" />
            <span>Simpan Ploting Ruang</span>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari kelas, kode ruang (R.01), atau jurusan..."
          aria-label="Cari rombel atau ruang"
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Hierarchical Tree per Tingkat */}
      {filteredGrouped.size === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
          <p>Belum ada slot ruang yang sesuai pencarian atau belum di-generate.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoPlottingRooms}
            className="text-xs font-bold"
          >
            <Wand2 size={13} className="mr-1.5" />
            <span>Klik di sini untuk Ploting Ruang Otomatis</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(filteredGrouped.entries()).map(([tingkat, classes]) => {
            const isOpen = openTingkatMap[tingkat] !== false; // default open
            const labelRomawi = formatTingkatRomawi(tingkat);

            return (
              <div
                key={tingkat}
                className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/30"
              >
                {/* Node Header Tingkat */}
                <button
                  type="button"
                  onClick={() => toggleTingkat(tingkat)}
                  className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Tingkat {labelRomawi} (Kelas {tingkat})
                    </span>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold bg-white dark:bg-slate-900 border-slate-300">
                      {classes.length} Rombel
                    </Badge>
                  </div>

                  <div className="text-[11px] font-bold text-violet-700 dark:text-violet-400">
                    Slot: {classes[0]?.slot_ruang || '-'} s/d {classes[classes.length - 1]?.slot_ruang || '-'}
                  </div>
                </button>

                {/* Node Body: Classes List */}
                {isOpen && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900">
                    {classes.map((cls) => (
                      <div
                        key={cls.kelas_id}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 bg-slate-50/50 dark:bg-slate-800/30 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                            <span title={cls.nama_kelas}>{cls.nama_kelas}</span>
                          </div>
                          {cls.kode_jurusan && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold text-slate-500">
                              {cls.kode_jurusan}
                            </Badge>
                          )}
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
                              className="w-full mt-0.5 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Nama Ruang
                            </label>
                            <input
                              type="text"
                              value={cls.nama_ruang}
                              onChange={(e) => handleUpdateSingleRoom(cls.kelas_id, 'nama_ruang', e.target.value)}
                              aria-label={`Nama ruang untuk ${cls.nama_kelas}`}
                              className="w-full mt-0.5 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
