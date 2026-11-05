import React, { useState } from 'react';
import {
  Search,
  Plus,
  Layers,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import type { DenahElementNode, KategoriRuang } from '../../types/spasial.types';

export interface UnassignedRoomItem {
  slot_ruang: string; // e.g. "R.01"
  nama_ruang: string; // e.g. "Ruang 01"
  kelas_nama: string; // e.g. "X TJKT 1"
  kelas_id: string;
}

interface DenahPaletteSidebarProps {
  unassignedRooms: UnassignedRoomItem[];
  placedKelasIds: Set<string>;
  onAddRoomNode: (item: UnassignedRoomItem) => void;
  onAddVirtualNode: (node: Omit<DenahElementNode, 'id' | 'x' | 'y'>) => void;
}

const VIRTUAL_PRESETS: Array<{
  label: string;
  sub?: string;
  kategori: KategoriRuang;
  warna_bg?: string;
  warna_border?: string;
  warna_teks?: string;
  width: number;
  height: number;
}> = [
  {
    label: 'LAB KOMPUTER 1',
    sub: 'Server Utama',
    kategori: 'LAB',
    width: 200,
    height: 120,
  },
  {
    label: 'LAB KOMPUTER 2',
    sub: 'Lab CBT',
    kategori: 'LAB',
    width: 200,
    height: 120,
  },
  {
    label: 'RUANG PANITIA',
    sub: 'Posko Asesmen',
    kategori: 'KANTOR',
    width: 180,
    height: 100,
  },
  {
    label: 'RUANG GURU',
    sub: 'Gedung Utama',
    kategori: 'KANTOR',
    width: 220,
    height: 120,
  },
  {
    label: 'TOILET SISWA',
    sub: 'Pria & Wanita',
    kategori: 'TOILET',
    width: 120,
    height: 80,
  },
  {
    label: 'PERPUSTAKAAN',
    sub: 'Lantai 1',
    kategori: 'PERPUSTAKAAN',
    width: 220,
    height: 140,
  },
  {
    label: 'LAPANGAN',
    sub: 'Area Terbuka',
    kategori: 'LAPANGAN',
    width: 320,
    height: 180,
  },
  {
    label: 'KORIDOR UTAMA',
    sub: 'Selasar Gedung',
    kategori: 'KORIDOR',
    width: 260,
    height: 60,
  },
];

export const DenahPaletteSidebar: React.FC<DenahPaletteSidebarProps> = ({
  unassignedRooms,
  placedKelasIds,
  onAddRoomNode,
  onAddVirtualNode,
}) => {
  const [activeTab, setActiveTab] = useState<'ruang_ujian' | 'virtual'>('ruang_ujian');
  const [search, setSearch] = useState('');

  // Custom virtual room form state
  const [customLabel, setCustomLabel] = useState('');
  const [customSub, setCustomSub] = useState('');
  const [customCat, setCustomCat] = useState<KategoriRuang>('LAINNYA');

  const filteredRooms = unassignedRooms.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.slot_ruang.toLowerCase().includes(q) ||
      r.kelas_nama.toLowerCase().includes(q) ||
      r.nama_ruang.toLowerCase().includes(q)
    );
  });

  const handleCreateCustomVirtual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;
    onAddVirtualNode({
      label_utama: customLabel.trim().toUpperCase(),
      label_sub: customSub.trim() || undefined,
      kategori_ruang: customCat,
      width: 180,
      height: 100,
      rotation: 0,
    });
    setCustomLabel('');
    setCustomSub('');
  };

  return (
    <aside className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-sm z-20">
      {/* Header Tabs */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('ruang_ujian')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ruang_ujian'
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ruang Ujian ({unassignedRooms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('virtual')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'virtual'
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ruang Virtual
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'ruang_ujian'
                ? 'Cari R.01, X TJKT 1...'
                : 'Cari preset ruang...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'ruang_ujian' ? (
          filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Tidak ada data ruang ujian yang cocok.
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isPlaced = placedKelasIds.has(room.kelas_id);
              return (
                <div
                  key={room.kelas_id}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    isPlaced
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                      {room.slot_ruang}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {room.kelas_nama}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {room.nama_ruang}
                      </div>
                    </div>
                  </div>

                  {isPlaced ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terpasang
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddRoomNode(room)}
                      className="px-2.5 py-1 text-xs font-semibold bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/60 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 rounded flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Pasang
                    </button>
                  )}
                </div>
              );
            })
          )
        ) : (
          <div className="space-y-3">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Preset Ruang Bangunan
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {VIRTUAL_PRESETS.filter((p) =>
                  p.label.toLowerCase().includes(search.toLowerCase())
                ).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onAddVirtualNode({
                        label_utama: preset.label,
                        label_sub: preset.sub,
                        kategori_ruang: preset.kategori,
                        width: preset.width,
                        height: preset.height,
                        rotation: 0,
                      })
                    }
                    className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-slate-800 hover:shadow-xs transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {preset.label}
                      </div>
                      {preset.sub && (
                        <div className="text-[10px] text-slate-400">
                          {preset.sub}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-0.5">
                      <Plus className="w-3 h-3" />
                      Tambah
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Buat Ruang Virtual Kustom */}
            <form
              onSubmit={handleCreateCustomVirtual}
              className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2 mt-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-primary-500" />
                Buat Ruang Kustom
              </div>

              <div>
                <label className="text-[10px] text-slate-500">Nama / Label Utama</label>
                <input
                  type="text"
                  placeholder="Contoh: GUDANG ARSIP"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500">Sub Label (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Gedung C Lantai 1"
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500">Kategori</label>
                <select
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value as KategoriRuang)}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="RUANG_UJIAN">Ruang Ujian</option>
                  <option value="LAB">Lab Komputer / Praktik</option>
                  <option value="TOILET">Toilet</option>
                  <option value="KANTOR">Kantor / Ruang Guru</option>
                  <option value="PERPUSTAKAAN">Perpustakaan</option>
                  <option value="LAPANGAN">Lapangan</option>
                  <option value="KORIDOR">Koridor</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah ke Denah
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
};
