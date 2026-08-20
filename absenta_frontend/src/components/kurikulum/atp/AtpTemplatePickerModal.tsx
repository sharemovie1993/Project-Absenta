import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Tag,
  Layers,
  Clock,
  Search,
  ArrowRight
} from 'lucide-react';
import { Button, Input } from '../../ui';
import { getAtpTemplates, AtpTemplateData } from '../../../api/atp-template.api';

interface AtpTemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFase?: string;
  defaultMapelName?: string;
  onSelectTemplate: (template: AtpTemplateData) => void;
}

export const AtpTemplatePickerModal: React.FC<AtpTemplatePickerModalProps> = ({
  isOpen,
  onClose,
  defaultFase,
  defaultMapelName,
  onSelectTemplate
}) => {
  const [selectedFase, setSelectedFase] = useState<string>(defaultFase || '');
  const [search, setSearch] = useState<string>('');
  const [previewTemplate, setPreviewTemplate] = useState<AtpTemplateData | null>(null);

  React.useEffect(() => {
    if (isOpen && defaultFase) {
      setSelectedFase(defaultFase);
    }
  }, [isOpen, defaultFase]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['atpTemplates', selectedFase, search],
    queryFn: () => getAtpTemplates({
      fase: selectedFase || undefined,
      search: search || undefined
    }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Database Template ATP Siap Pakai
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Global Preset
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih template resmi Kurikulum Merdeka untuk mengisi instan daftar TP Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari mapel, materi, sumber..."
                className="pl-9 h-10 rounded-xl text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <select
              value={selectedFase}
              onChange={(e) => setSelectedFase(e.target.value)}
              className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Fase</option>
              <option value="A">Fase A (Kelas 1-2 SD)</option>
              <option value="B">Fase B (Kelas 3-4 SD)</option>
              <option value="C">Fase C (Kelas 5-6 SD)</option>
              <option value="D">Fase D (Kelas 7-9 SMP)</option>
              <option value="E">Fase E (Kelas 10 SMA/SMK)</option>
              <option value="F">Fase F (Kelas 11-12 SMA/SMK)</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-end sm:self-center">
            Ditemukan <span className="font-bold text-blue-600 dark:text-blue-400">{templates.length}</span> template
          </div>
        </div>

        {/* Content Area (Grid + Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Templates Grid / List */}
          <div className={`${previewTemplate ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <BookOpen size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada template yang cocok</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Coba ubah kata kunci pencarian atau pilih filter fase yang berbeda.
                </p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${previewTemplate ? 'sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-3.5`}>
                {templates.map((tpl) => {
                  const isSelected = previewTemplate?.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setPreviewTemplate(tpl)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Tags & Fase */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            Fase {tpl.fase}
                          </span>
                          {tpl.sumber && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={tpl.sumber}>
                              {tpl.sumber}
                            </span>
                          )}
                        </div>

                        {/* Title & Mapel */}
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">
                            {tpl.nama_template}
                          </h4>
                          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                            {tpl.nama_mapel_ref}
                          </p>
                        </div>

                        {/* Description */}
                        {tpl.deskripsi && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {tpl.deskripsi}
                          </p>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                          <Layers size={12} className="text-indigo-500" />
                          {tpl.TpTemplate?.length || 0} TP
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                          <Clock size={12} className="text-amber-500" />
                          {tpl.total_alokasi_jp} JP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel (Side-by-side) */}
          {previewTemplate && (
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                {/* Header Preview */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Fase {previewTemplate.fase} • {previewTemplate.nama_mapel_ref}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {previewTemplate.nama_template}
                    </h3>
                    {previewTemplate.sumber && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Sumber: <span className="font-semibold">{previewTemplate.sumber}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
                  >
                    Tutup Preview
                  </button>
                </div>

                {/* TP Items List in Template */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Rincian Tujuan Pembelajaran ({previewTemplate.TpTemplate?.length || 0} TP • {previewTemplate.total_alokasi_jp} JP)
                  </p>
                  
                  <div className="space-y-2">
                    {previewTemplate.TpTemplate?.map((tp, idx) => (
                      <div
                        key={tp.id || idx}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-blue-600 dark:text-blue-400 font-mono">
                            {tp.kode_tp}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tp.alokasi_jp} JP
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {tp.judul_materi}
                        </p>
                        {tp.deskripsi_tp && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                            {tp.deskripsi_tp}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button: Apply / Select */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  TP akan disalin ke form dan bebas Anda modifikasi.
                </p>
                <Button
                  onClick={() => {
                    onSelectTemplate(previewTemplate);
                    onClose();
                  }}
                  className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-2 shrink-0"
                >
                  <CheckCircle2 size={15} />
                  <span>Gunakan Template Ini</span>
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
