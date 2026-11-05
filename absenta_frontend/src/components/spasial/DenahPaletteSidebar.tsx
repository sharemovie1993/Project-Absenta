import React, { useState } from 'react';
import {
  Search,
  Plus,
  Layers,
  Sparkles,
  Building2,
  CheckCircle2,
  School,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DenahElementNode, KategoriRuang } from '../../types/spasial.types';

export interface UnassignedRoomItem {
  slot_ruang: string; // e.g. "R.01" or "LAB-1"
  nama_ruang: string; // e.g. "Ruang 01"
  kelas_nama: string; // e.g. "X TJKT 1"
  kelas_id: string;
}

interface DenahPaletteSidebarProps {
  unassignedRooms: UnassignedRoomItem[];
  placedKelasIds: Set<string>;
  onAddRoomNode: (item: UnassignedRoomItem) => void;
  onAddVirtualNode: (node: Omit<DenahElementNode, 'id' | 'x' | 'y'>) => void;
  isLightMode?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const VIRTUAL_PRESETS: Array<{
  label: string;
  sub?: string;
  kategori: KategoriRuang;
  width: number;
  height: number;
}> = [
  { label: 'RUANG KELAS', sub: 'Kelas Standar 36 Siswa', kategori: 'RUANG_UJIAN', width: 100, height: 60 },
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

export const DenahPaletteSidebar: React.FC<DenahPaletteSidebarProps> = ({
  unassignedRooms,
  placedKelasIds,
  onAddRoomNode,
  onAddVirtualNode,
  isLightMode = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // If no exam rooms passed, start on 'virtual' tab automatically
  const [activeTab, setActiveTab] = useState<'ruang_sekolah' | 'virtual'>(() =>
    unassignedRooms.length > 0 ? 'ruang_sekolah' : 'virtual'
  );
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
      width: 100,
      height: 60,
      rotation: 0,
    });
    setCustomLabel('');
    setCustomSub('');
  };

  // Tampilan Ciut (Collapsed Minimal Rail)
  if (isCollapsed) {
    const unplacedCount = unassignedRooms.filter((r) => !placedKelasIds.has(r.kelas_id)).length;
    return (
      <aside
        className={`w-12 flex-shrink-0 border-r flex flex-col items-center py-3 justify-between shadow-xs z-20 transition-all ${
          isLightMode
            ? 'bg-slate-50 border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLightMode
                ? 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 shadow-xs'
                : 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-750 shadow-xs'
            }`}
            title="Buka Panel Palet Ruangan (Sidebar Kiri)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleCollapse?.();
              setActiveTab('ruang_sekolah');
            }}
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              isLightMode ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title={`Ruang Ujian Belum Ditempatkan (${unplacedCount})`}
          >
            <School className="w-4 h-4" />
            {unplacedCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 text-[9px] bg-amber-500 text-white font-black rounded-full flex items-center justify-center shadow-xs">
                {unplacedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleCollapse?.();
              setActiveTab('virtual');
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isLightMode ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title={`Fasilitas Gedung (${VIRTUAL_PRESETS.length})`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-[9px] font-bold text-slate-400 hover:text-indigo-500 tracking-wider uppercase select-none pb-1 transition-colors cursor-pointer"
          title="Klik untuk membuka palet"
        >
          Palet
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`w-80 flex-shrink-0 border-r flex flex-col h-full shadow-sm z-20 transition-all ${
        isLightMode
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Header Tabs */}
      <div
        className={`p-3 border-b space-y-2 ${
          isLightMode ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-850'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div
            className={`flex-1 flex items-center gap-1 p-0.5 rounded-xl ${
              isLightMode ? 'bg-slate-200/80' : 'bg-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('ruang_sekolah')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'ruang_sekolah'
                  ? isLightMode
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'bg-slate-700 text-indigo-300 shadow-xs'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              Ruang ({unassignedRooms.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('virtual')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'virtual'
                  ? isLightMode
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'bg-slate-700 text-indigo-300 shadow-xs'
                  : isLightMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fasilitas ({VIRTUAL_PRESETS.length})
            </button>
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isLightMode
                  ? 'border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  : 'border-slate-750 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title="Ciutkan Panel (Maksimalkan Ruang Kanvas)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'ruang_sekolah'
                ? 'Cari nama kelas / ruang...'
                : 'Cari preset fasilitas...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-hidden ${
              isLightMode
                ? 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'
                : 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500'
            }`}
          />
        </div>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'ruang_sekolah' ? (
          filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
              <p>Belum ada data ruang kelas terdaftar.</p>
              <button
                type="button"
                onClick={() => setActiveTab('virtual')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold underline cursor-pointer"
              >
                Gunakan Preset Fasilitas &rarr;
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isPlaced = placedKelasIds.has(room.kelas_id);
              return (
                <div
                  key={room.kelas_id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    isPlaced
                      ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : isLightMode
                      ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xs'
                      : 'bg-slate-850 border-slate-700 hover:border-indigo-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md text-xs shrink-0">
                      {room.slot_ruang || 'R.XX'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold truncate">
                        {room.kelas_nama}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {room.nama_ruang}
                      </div>
                    </div>
                  </div>

                  {isPlaced ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terpasang
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddRoomNode(room)}
                      className="px-2.5 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Preset Bangunan &amp; Ruangan
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
                    className={`p-2.5 text-left rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isLightMode
                        ? 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xs'
                        : 'bg-slate-850 border-slate-700 hover:border-indigo-400 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{preset.label}</div>
                      {preset.sub && (
                        <div className="text-[10px] text-slate-400">
                          {preset.sub}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                      <Plus className="w-3.5 h-3.5" />
                      Tambah
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Buat Ruang Virtual Kustom */}
            <form
              onSubmit={handleCreateCustomVirtual}
              className={`p-3 rounded-2xl border border-dashed space-y-2 mt-2 ${
                isLightMode
                  ? 'bg-slate-50 border-slate-300'
                  : 'bg-slate-850 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                Buat Ruang Kustom
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Nama / Label Utama</label>
                <input
                  type="text"
                  placeholder="Contoh: GUDANG ARSIP"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className={`w-full px-2.5 py-1 text-xs rounded-lg border focus:outline-hidden ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Sub Label (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Gedung C Lantai 1"
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                  className={`w-full px-2.5 py-1 text-xs rounded-lg border focus:outline-hidden ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Kategori</label>
                <select
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value as KategoriRuang)}
                  className={`w-full px-2.5 py-1 text-xs rounded-lg border focus:outline-hidden ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <option value="RUANG_UJIAN">Ruang Kelas / Ujian</option>
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
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
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
