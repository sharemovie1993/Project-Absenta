import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, ExternalLink, FileText, Download,
  Search, CheckCircle2, Sparkles, Folder, Presentation,
  Globe, UserCheck, Clock, Layers, ChevronRight
} from 'lucide-react';
import { kurikulumApi } from '../../../../api/kurikulum.api';
import { getBahanAjarPresets, BahanAjarPresetData } from '../../../../api/bahan-ajar.api';
import { Button, Badge } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { BahanAjarReaderModal } from '../../../kurikulum/bahan-ajar/BahanAjarReaderModal';
import { ModulAjarStudioModal } from '../../../kurikulum/bahan-ajar/ModulAjarStudioModal';

interface PerangkatAjarPanelProps {
  guruId?: string;
}

export const PerangkatAjarPanel: React.FC<PerangkatAjarPanelProps> = ({ guruId }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'MY_MODULES' | 'GLOBAL_PRESETS'>('MY_MODULES');

  // Reader & Studio State
  const [readerPerangkatId, setReaderPerangkatId] = useState<string>('');
  const [isReaderOpen, setIsReaderOpen] = useState<boolean>(false);
  const [readerContext, setReaderContext] = useState<{
    mapelNama?: string;
    fase?: string;
    tingkat?: number;
  }>({});

  const [studioPerangkat, setStudioPerangkat] = useState<{
    id: string;
    judul: string;
    mapelNama?: string;
    fase?: string;
    tingkat?: number;
  } | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

  // 1. Fetch Real Teacher's Perangkat Ajar
  const { data: myPerangkatRes, isLoading: isLoadingMyPerangkat } = useQuery({
    queryKey: ['myPerangkatAjarKbm', guruId],
    queryFn: () => kurikulumApi.getPerangkatAjar(guruId ? { guru_id: guruId } : {}),
    staleTime: 1000 * 60 * 5
  });

  const myPerangkatList = myPerangkatRes?.data || [];

  // 2. Fetch Global Platform Presets (National Curriculum Deep Learning Library)
  const { data: globalPresets = [], isLoading: isLoadingPresets } = useQuery({
    queryKey: ['globalBahanAjarPresets'],
    queryFn: () => getBahanAjarPresets(),
    staleTime: 1000 * 60 * 10
  });

  // Filter My Perangkat
  const filteredMyList = useMemo(() => {
    return myPerangkatList.filter((item: any) => {
      const q = searchTerm.toLowerCase();
      return (
        item.judul?.toLowerCase().includes(q) ||
        item.Mapel?.nama_mapel?.toLowerCase().includes(q) ||
        item.jenis?.toLowerCase().includes(q)
      );
    });
  }, [myPerangkatList, searchTerm]);

  // Filter Global Presets
  const filteredPresets = useMemo(() => {
    return globalPresets.filter((preset: BahanAjarPresetData) => {
      const q = searchTerm.toLowerCase();
      return (
        preset.judul_modul?.toLowerCase().includes(q) ||
        preset.nama_mapel_ref?.toLowerCase().includes(q) ||
        preset.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    });
  }, [globalPresets, searchTerm]);

  const handleOpenReader = (id: string, ctx?: { mapelNama?: string; fase?: string; tingkat?: number }) => {
    setReaderPerangkatId(id);
    setReaderContext(ctx || {});
    setIsReaderOpen(true);
  };

  const handleOpenStudio = (item: any) => {
    setStudioPerangkat({
      id: item.id,
      judul: item.judul || item.judul_modul,
      mapelNama: item.Mapel?.nama_mapel || item.nama_mapel_ref,
      fase: item.fase,
      tingkat: item.tingkat
    });
    setIsStudioOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ── HEADER BANNER ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Bank Perangkat Ajar &amp; Asisten Mengajar Digital</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Penyusunan modul ajar bertahap, panduan langkah mengajar di kelas, dan tayangan layar proyektor
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => navigate('/kurikulum/perangkat-ajar')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={14} />
            <span>+ Buat / Kelola Berkas</span>
          </Button>
        </div>
      </div>

      {/* ── FILTER & SUB-TABS ROW ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Sub-tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('MY_MODULES')}
            className={cn(
              "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              activeSubTab === 'MY_MODULES'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Folder size={13} />
            <span>Modul &amp; Berkas Saya ({myPerangkatList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('GLOBAL_PRESETS')}
            className={cn(
              "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              activeSubTab === 'GLOBAL_PRESETS'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Globe size={13} />
            <span>Katalog Nasional ({globalPresets.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari materi, mapel, atau topik..."
            className="w-full pl-8 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* ── TAB 1: MODUL & BERKAS SAYA ── */}
      {activeSubTab === 'MY_MODULES' && (
        <>
          {isLoadingMyPerangkat ? (
            <div className="text-center py-16 text-slate-400 text-xs italic">
              Memuat perangkat ajar tersimpan...
            </div>
          ) : filteredMyList.length === 0 ? (
            <div className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Belum Ada Modul Ajar Tersimpan
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Anda bisa menyusun modul ajar baru di Studio atau mengadopsi dari Katalog Nasional untuk asisten mengajar Anda.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveSubTab('GLOBAL_PRESETS')}
                  variant="outline"
                  className="text-xs font-bold"
                >
                  <Globe size={13} className="mr-1" />
                  Buka Katalog Nasional
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate('/kurikulum/perangkat-ajar')}
                  className="text-xs font-bold bg-indigo-600 text-white"
                >
                  <Plus size={13} className="mr-1" />
                  Buat Dokumen Baru
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyList.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px]">
                        {item.jenis?.replace('_', ' ') || 'MODUL AJAR'}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md font-extrabold text-[10px]",
                        item.status === 'APPROVED' ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" :
                        item.status === 'REJECTED' ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400" :
                        "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                      )}>
                        {item.status || 'DRAF'}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {item.judul}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {item.Mapel?.nama_mapel || 'Mata Pelajaran'} • {item.TahunPelajaran?.tahun || ''}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenStudio(item)}
                      className="h-8 px-2.5 rounded-xl text-[11px] font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer"
                      title="Buka Studio Penyusunan Langkah KBM Per-Pertemuan"
                    >
                      <Sparkles size={12} />
                      <span>Susun</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReader(item.id, { mapelNama: item.Mapel?.nama_mapel })}
                      className="h-8 px-2.5 rounded-xl text-[11px] font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                      title="Buka Mode Panduan Guru & Layar Proyektor"
                    >
                      <Presentation size={12} className="text-amber-500" />
                      <span>Baca / Proyektor</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: KATALOG MODUL NASIONAL PLATFORM ── */}
      {activeSubTab === 'GLOBAL_PRESETS' && (
        <>
          {isLoadingPresets ? (
            <div className="text-center py-16 text-slate-400 text-xs italic">
              Memuat katalog modul nasional...
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
              <p className="text-xs text-slate-400">Tidak ada modul template yang cocok dengan kata kunci.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-[10px]">
                        Fase {preset.fase} (Kelas {preset.tingkat || 10})
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        TEMPLATE NASIONAL
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {preset.judul_modul}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {preset.nama_mapel_ref} • {preset.total_pertemuan} Pertemuan ({preset.total_alokasi_jp} JP)
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      Deep Learning Ready
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenReader(preset.id, { mapelNama: preset.nama_mapel_ref, fase: preset.fase, tingkat: preset.tingkat })}
                      className="h-8 px-3 rounded-xl text-[11px] font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen size={12} />
                      <span>Buka Reader / Proyektor</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODALS: READER & STUDIO ── */}
      {isReaderOpen && (
        <BahanAjarReaderModal
          isOpen={isReaderOpen}
          onClose={() => setIsReaderOpen(false)}
          perangkatId={readerPerangkatId}
          mapelNama={readerContext.mapelNama}
          fase={readerContext.fase}
          tingkat={readerContext.tingkat}
        />
      )}

      {isStudioOpen && studioPerangkat && (
        <ModulAjarStudioModal
          isOpen={isStudioOpen}
          onClose={() => {
            setIsStudioOpen(false);
            setStudioPerangkat(null);
          }}
          perangkatId={studioPerangkat.id}
          perangkatJudul={studioPerangkat.judul}
          mapelNama={studioPerangkat.mapelNama}
          fase={studioPerangkat.fase}
          tingkat={studioPerangkat.tingkat}
        />
      )}
    </div>
  );
};
