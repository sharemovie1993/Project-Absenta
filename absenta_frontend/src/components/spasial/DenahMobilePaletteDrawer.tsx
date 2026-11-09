import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  School,
  Building2,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { DenahElementNode, KategoriRuang } from '../../types/spasial.types';
import type { UnassignedRoomItem } from './DenahPaletteSidebar';
import { detectNodeTingkat, TINGKAT_STYLES } from './denahTingkatHelper';

interface DenahMobilePaletteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unassignedRooms: UnassignedRoomItem[];
  placedKelasIds: Set<string>;
  onAddRoomNode: (item: UnassignedRoomItem) => void;
  onAddVirtualNode: (node: Omit<DenahElementNode, 'id' | 'x' | 'y'>) => void;
  isLightMode?: boolean;
}

const VIRTUAL_PRESETS: Array<{
  label: string;
  sub?: string;
  kategori: KategoriRuang;
  width: number;
  height: number;
}> = [
  { label: 'LAB KOMPUTER 1', sub: 'Server & Lab CBT', kategori: 'LAB', width: 120, height: 80 },
  { label: 'LAB IPA / SAINS', sub: 'Fisika & Kimia', kategori: 'LAB', width: 120, height: 80 },
  { label: 'BENGKEL / TEFA', sub: 'Praktik Kejuruan', kategori: 'LAB', width: 140, height: 80 },
  { label: 'RUANG GURU', sub: 'Kantor Pengajar', kategori: 'KANTOR', width: 120, height: 80 },
  { label: 'RUANG TU / KEPSEK', sub: 'Administrasi', kategori: 'KANTOR', width: 120, height: 70 },
  { label: 'PERPUSTAKAAN', sub: 'Ruang Baca & Arsip', kategori: 'PERPUSTAKAAN', width: 130, height: 80 },
  { label: 'TOILET SISWA', sub: 'Pria & Wanita', kategori: 'TOILET', width: 80, height: 60 },
  { label: 'TOILET GURU', sub: 'Fasilitas Pendidik', kategori: 'TOILET', width: 80, height: 60 },
  { label: 'MUSHOLA', sub: 'Sarana Ibadah', kategori: 'LAINNYA', width: 100, height: 70 },
  { label: 'KANTIN SEKOLAH', sub: 'Pujasera Kampus', kategori: 'LAINNYA', width: 140, height: 80 },
  { label: 'LAPANGAN UTAMA', sub: 'Upacara & Olahraga', kategori: 'LAPANGAN', width: 220, height: 120 },
  { label: 'KORIDOR / SELASAR', sub: 'Jalur Penghubung', kategori: 'KORIDOR', width: 200, height: 40 },
  { label: 'TANGGA LANTAI', sub: 'Akses Bertingkat', kategori: 'KORIDOR', width: 80, height: 60 },
];

export const DenahMobilePaletteDrawer: React.FC<DenahMobilePaletteDrawerProps> = React.memo(({
  isOpen,
  onClose,
  unassignedRooms,
  placedKelasIds,
  onAddRoomNode,
  onAddVirtualNode,
  isLightMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'rombel' | 'fasilitas'>('rombel');
  const [search, setSearch] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState<'ALL' | number>('ALL');

  const unplacedCount = useMemo(() => {
    return unassignedRooms.filter((r) => !placedKelasIds.has(r.kelas_id)).length;
  }, [unassignedRooms, placedKelasIds]);

  const filteredRooms = useMemo(() => {
    const q = search.toLowerCase().trim();
    return unassignedRooms.filter((r) => {
      const t = r.tingkat || detectNodeTingkat({ label_sub: r.kelas_nama, catatan: r.nama_ruang });
      if (tingkatFilter !== 'ALL' && t !== tingkatFilter) return false;
      if (!q) return true;
      return (
        r.slot_ruang.toLowerCase().includes(q) ||
        r.kelas_nama.toLowerCase().includes(q) ||
        r.nama_ruang.toLowerCase().includes(q)
      );
    });
  }, [unassignedRooms, search, tingkatFilter]);

  const filteredPresets = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return VIRTUAL_PRESETS;
    return VIRTUAL_PRESETS.filter(
      (p) => p.label.toLowerCase().includes(q) || (p.sub && p.sub.toLowerCase().includes(q))
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150 sm:hidden">
      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Surface */}
      <div
        className={`w-full max-h-[82vh] rounded-t-3xl border-t shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 ${
          isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
        }`}
      >
        {/* Grabber Handle & Header */}
        <div className="pt-2.5 pb-2 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400">
              <School className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black leading-tight flex items-center gap-1.5">
                <span>Katalog Ruang &amp; Fasilitas</span>
                {unplacedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold">
                    {unplacedCount} Belum Ada
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Ketuk untuk meletakkan kotak ke denah</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Tutup Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Rombel vs Fasilitas */}
        <div className="p-2 border-b border-slate-200/80 dark:border-slate-800 shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('rombel')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rombel'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Rombel Kelas ({unassignedRooms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fasilitas')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'fasilitas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Fasilitas &amp; Lab ({VIRTUAL_PRESETS.length})</span>
          </button>
        </div>

        {/* Search Input & Quick Filter */}
        <div className="px-3 pt-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0 space-y-1.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'rombel' ? 'Cari R.01, X TJKT 1, dsb...' : 'Cari Lab, Toilet, Mushola...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {activeTab === 'rombel' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {(['ALL', 10, 11, 12, 13] as const).map((tk) => {
                const isActive = tingkatFilter === tk;
                const label = tk === 'ALL' ? 'Semua' : `Tk. ${tk === 10 ? 'X' : tk === 11 ? 'XI' : tk === 12 ? 'XII' : tk}`;
                return (
                  <button
                    key={tk}
                    type="button"
                    onClick={() => setTingkatFilter(tk)}
                    className={`px-2.5 py-0.8 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Room / Preset Card List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === 'rombel' ? (
            filteredRooms.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada ruangan rombel yang cocok
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isPlaced = placedKelasIds.has(room.kelas_id);
                const t = room.tingkat || detectNodeTingkat({ label_sub: room.kelas_nama, catatan: room.nama_ruang });
                const tStyle = t ? TINGKAT_STYLES[t] : null;

                return (
                  <div
                    key={room.kelas_id}
                    onClick={() => {
                      onAddRoomNode(room);
                      onClose();
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-98 ${
                      isPlaced
                        ? 'bg-slate-50/60 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 opacity-75'
                        : isLightMode
                        ? 'bg-white hover:border-indigo-400 border-slate-200 shadow-xs'
                        : 'bg-slate-800/80 hover:border-indigo-500 border-slate-700/80 shadow-xs'
                    }`}
                  >
                    {/* Sisi Kiri: Badge Ruang & Nama Rombel */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-12 h-10 rounded-xl border flex flex-col items-center justify-center font-mono font-black text-xs shrink-0 ${
                          tStyle
                            ? `${tStyle.bg} ${tStyle.border} ${tStyle.text}`
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        <span>{room.slot_ruang}</span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-black truncate">{room.kelas_nama}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{room.nama_ruang}</p>
                      </div>
                    </div>

                    {/* Sisi Kanan: Action Button / Status */}
                    <div className="shrink-0">
                      {isPlaced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Di Denah</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-black shadow-xs">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Letakkan</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            filteredPresets.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onAddVirtualNode(preset);
                  onClose();
                }}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-98 ${
                  isLightMode
                    ? 'bg-white hover:border-indigo-400 border-slate-200 shadow-xs'
                    : 'bg-slate-800/80 hover:border-indigo-500 border-slate-700/80 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{preset.label}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{preset.sub || preset.kategori}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

DenahMobilePaletteDrawer.displayName = 'DenahMobilePaletteDrawer';
