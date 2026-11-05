import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Layers,
  Copy,
  Trash2,
  Loader2,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InteractiveDenahCanvas } from '@/components/spasial/InteractiveDenahCanvas';
import {
  fetchDenahList,
  createDenah,
  cloneDenah,
  deleteDenah,
} from '@/api/spasial.api';
import type { DenahSpasial, TipeDenah } from '@/types/spasial.types';

export const SarprasDenahTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [denahList, setDenahList] = useState<DenahSpasial[]>([]);
  const [activeDenah, setActiveDenah] = useState<DenahSpasial | null>(null);
  const [filterTipe, setFilterTipe] = useState<TipeDenah | 'ALL'>('MASTER_SARPRAS');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDenahList();
      setDenahList(data);

      // Default active to first master sarpras or first item
      const defaultActive =
        data.find((d) => d.tipe === 'MASTER_SARPRAS') || data[0] || null;
      setActiveDenah(defaultActive);
    } catch (err: any) {
      console.error('Gagal mengambil denah spasial:', err);
      toast.error('Gagal memuat denah spasial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNew = async () => {
    const nama = prompt('Masukkan nama denah master kampus (contoh: Gedung A Lantai 1):');
    if (!nama || !nama.trim()) return;

    try {
      const created = await createDenah({
        nama_denah: nama.trim(),
        tipe: 'MASTER_SARPRAS',
        lantai: denahList.filter((d) => d.tipe === 'MASTER_SARPRAS').length + 1,
        elements: [],
      });
      setDenahList((prev) => [created, ...prev]);
      setActiveDenah(created);
      toast.success('Denah master baru berhasil dibuat');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat denah');
    }
  };

  const handleClone = async () => {
    if (!activeDenah) return;
    const nama = prompt(
      'Masukkan nama untuk hasil salinan denah:',
      `${activeDenah.nama_denah} (Salinan)`
    );
    if (!nama || !nama.trim()) return;

    try {
      const cloned = await cloneDenah(activeDenah.id, {
        nama_denah: nama.trim(),
        tipe: activeDenah.tipe,
      });
      setDenahList((prev) => [cloned, ...prev]);
      setActiveDenah(cloned);
      toast.success('Denah berhasil diduplikasi');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menduplikasi denah');
    }
  };

  const handleDelete = async () => {
    if (!activeDenah) return;
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus "${activeDenah.nama_denah}"? Tindakan ini tidak dapat dibatalkan.`
      )
    )
      return;

    try {
      await deleteDenah(activeDenah.id);
      const remaining = denahList.filter((d) => d.id !== activeDenah.id);
      setDenahList(remaining);
      setActiveDenah(remaining[0] || null);
      toast.success('Denah berhasil dihapus');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus denah');
    }
  };

  const filteredDenah = denahList.filter((d) => {
    if (filterTipe === 'ALL') return true;
    return d.tipe === filterTipe;
  });

  return (
    <div className="space-y-4 w-full">
      {/* 1. Header Toolbar Denah Sarpras */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              <MapPin size={18} />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Master Denah Spasial Kampus &amp; Fasilitas
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Susun dan kelola peta denah fisik sekolah (Lantai, Gedung, Lab, Toilet, Fasilitas) berbasis puzzle drag, rotate 90°, dan flip.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Tipe Denah */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTipe('MASTER_SARPRAS')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterTipe === 'MASTER_SARPRAS'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Master Sarpras
            </button>
            <button
              type="button"
              onClick={() => setFilterTipe('EVENT_UJIAN')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterTipe === 'EVENT_UJIAN'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Event Ujian CBT
            </button>
            <button
              type="button"
              onClick={() => setFilterTipe('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterTipe === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semua ({denahList.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Denah</span>
          </button>

          {activeDenah && (
            <>
              <button
                type="button"
                onClick={handleClone}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Duplikasi denah ini"
              >
                <Copy size={13} />
                <span>Duplikasi</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Hapus denah"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Floor/Building Selector Pills */}
      {filteredDenah.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filteredDenah.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveDenah(item)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeDenah?.id === item.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
              }`}
            >
              <Building size={13} />
              <span>{item.nama_denah}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeDenah?.id === item.id
                    ? 'bg-indigo-700 text-indigo-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                Lt {item.lantai}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 3. Main Canvas Studio Viewport */}
      {loading ? (
        <div className="h-[600px] flex flex-col items-center justify-center bg-slate-900 rounded-2xl text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs">Memuat data denah spasial...</p>
        </div>
      ) : activeDenah ? (
        <InteractiveDenahCanvas
          key={activeDenah.id}
          denah={activeDenah}
          onSaveSuccess={(updated) => {
            setDenahList((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
            setActiveDenah(updated);
          }}
        />
      ) : (
        <div className="h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 p-6 text-center">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Belum Ada Denah Spasial Kampus
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Mulai rancang peta denah fisik sekolah untuk mempermudah inventarisasi ruangan, pengelolaan aset gedung, dan koordinasi lokasi asesmen.
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Buat Denah Master Sekarang</span>
          </button>
        </div>
      )}
    </div>
  );
};
