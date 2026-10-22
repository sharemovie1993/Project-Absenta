import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Cloud,
  Search,
  Layers,
  CheckCircle2,
  BookOpen,
  Award,
  ChevronRight,
  Sparkles,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { raporApi } from '@/api/rapor.api';
import { type UkkUnitKompetensi } from '@/utils/print/modules/pdfSertifikatUkk';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface AdoptedSkkniData {
  skemaSertifikasi: string;
  judulPenugasanId: string;
  judulPenugasanEn: string;
  units: UkkUnitKompetensi[];
}

export interface UkkSkkniCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanNama?: string;
  onAdopt: (data: AdoptedSkkniData) => void;
}

export const UkkSkkniCloudModal: React.FC<UkkSkkniCloudModalProps> = ({
  isOpen,
  onClose,
  jurusanNama = 'Kejuruan',
  onAdopt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRumpun, setSelectedRumpun] = useState<string>('ALL');
  const [activeKatalogId, setActiveKatalogId] = useState<string | null>(null);
  const [selectedUnitCodes, setSelectedUnitCodes] = useState<Set<string>>(new Set());

  // 1. Fetch Rumpun Categories from Cloud
  const { data: rumpunRes } = useQuery({
    queryKey: ['skkni-cloud-rumpun'],
    queryFn: () => raporApi.getCloudSkkniRumpun().catch(() => ({ data: [] })),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const rumpunList: string[] = useMemo(() => {
    const d = rumpunRes?.data || rumpunRes || [];
    return Array.isArray(d) ? d : [];
  }, [rumpunRes]);

  // 2. Fetch SKKNI Katalog from License Server Cloud
  const {
    data: katalogRes,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['skkni-cloud-katalog', searchQuery, selectedRumpun],
    queryFn: () =>
      raporApi.getCloudSkkniKatalog({
        search: searchQuery || undefined,
        rumpun: selectedRumpun !== 'ALL' ? selectedRumpun : undefined,
      }).catch(() => ({ data: [] })),
    enabled: isOpen,
    staleTime: 2 * 60 * 1000,
  });

  const rawKatalog = useMemo(() => {
    const d = katalogRes?.data?.data || katalogRes?.data || katalogRes || [];
    return Array.isArray(d) ? d : [];
  }, [katalogRes]);

  // Set default active scheme on load or change
  const activeKatalog = useMemo(() => {
    if (!rawKatalog || rawKatalog.length === 0) return null;
    if (activeKatalogId) {
      const found = rawKatalog.find((k: any) => k.id === activeKatalogId);
      if (found) return found;
    }
    // Auto-match by jurusan name if available
    const matched = rawKatalog.find((k: any) =>
      k.namaSkema.toLowerCase().includes(jurusanNama.toLowerCase()) ||
      k.kodeSkema.toLowerCase().includes(jurusanNama.toLowerCase())
    );
    return matched || rawKatalog[0];
  }, [rawKatalog, activeKatalogId, jurusanNama]);

  // Sync selected units when active schema changes
  React.useEffect(() => {
    if (activeKatalog && activeKatalog.units) {
      const allCodes = new Set<string>(activeKatalog.units.map((u: any) => u.kodeUnit));
      setSelectedUnitCodes(allCodes);
    }
  }, [activeKatalog?.id]);

  const toggleUnit = (kode: string) => {
    setSelectedUnitCodes((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) {
        next.delete(kode);
      } else {
        next.add(kode);
      }
      return next;
    });
  };

  const selectAllUnits = () => {
    if (!activeKatalog?.units) return;
    const all = new Set<string>(activeKatalog.units.map((u: any) => u.kodeUnit));
    setSelectedUnitCodes(all);
  };

  const deselectAllUnits = () => {
    setSelectedUnitCodes(new Set());
  };

  // Handler for adopting selected units into current jurusan configuration
  const handleConfirmAdopt = () => {
    if (!activeKatalog) return;
    if (selectedUnitCodes.size === 0) {
      toast.error('Pilih minimal 1 unit kompetensi untuk diadopsi.');
      return;
    }

    const filteredUnits: UkkUnitKompetensi[] = (activeKatalog.units || [])
      .filter((u: any) => selectedUnitCodes.has(u.kodeUnit))
      .map((u: any) => ({
        kode_unit: u.kodeUnit,
        judul_unit: u.judulUnitId,
      }));

    onAdopt({
      skemaSertifikasi: activeKatalog.namaSkema,
      judulPenugasanId: activeKatalog.defaultJudulId || '',
      judulPenugasanEn: activeKatalog.defaultJudulEn || '',
      units: filteredUnits,
    });

    toast.success(`Berhasil mengadopsi ${filteredUnits.length} unit SKKNI dari ${activeKatalog.kodeSkema}!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Katalog SKKNI Terpusat (License Cloud Master)"
      size="5xl"
    >
      <div className="space-y-4">
        {/* Banner Cloud Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Cloud className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                Master Data SKKNI Terpusat (Server Lisensi):
              </span>{' '}
              Data unit kompetensi diambil langsung dari server pusat sebagai standar baku nasional.
              Pilih skema yang sesuai dengan jurusan Anda, sesuaikan unit yang diujikan, lalu klik tombol adopsi.
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs shrink-0 gap-1 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
            title="Refresh katalog dari server lisensi"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
            Segarkan
          </Button>
        </div>

        {/* Filter Bar: Pencarian & Rumpun Kejuruan */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
          <div className="sm:col-span-7 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari skema kejuruan atau unit kompetensi (misal: TKJ, Jaringan, Otomotif, Akuntansi)..."
              className="w-full pl-8 pr-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-xs"
            />
          </div>

          <div className="sm:col-span-5">
            <select
              value={selectedRumpun}
              onChange={(e) => setSelectedRumpun(e.target.value)}
              className="w-full px-3 py-2 bg-background border rounded-lg font-medium cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none text-xs"
            >
              <option value="ALL">Semua Rumpun Keahlian</option>
              {rumpunList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content: 2-Column Split (Skema List kiri, Detail Unit kanan) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
            Menghubungi Server Lisensi & Mengunduh Katalog SKKNI...
          </div>
        ) : rawKatalog.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-muted/20 space-y-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <div className="text-xs font-semibold text-foreground">Tidak Ada Skema yang Cocok</div>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Cobalah ubah kata kunci pencarian atau pilih rumpun keahlian "Semua Rumpun Keahlian".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 max-h-[440px] overflow-hidden">
            {/* Kolom Kiri: Daftar Skema (4 cols) */}
            <div className="lg:col-span-5 border rounded-xl p-2 overflow-y-auto space-y-1.5 bg-muted/20 max-h-[220px] lg:max-h-[440px]">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Daftar Skema ({rawKatalog.length})</span>
                <span className="text-[10px]">Klik untuk melihat unit</span>
              </div>
              {rawKatalog.map((k: any) => {
                const isSelected = activeKatalog?.id === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      setActiveKatalogId(k.id);
                    }}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg border transition-all text-xs space-y-1 group',
                      isSelected
                        ? 'bg-background border-primary shadow-sm ring-1 ring-primary/30'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                        {k.kodeSkema}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {k.units?.length || 0} Unit
                      </span>
                    </div>
                    <div className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                      {k.namaSkema}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
                      <span>{k.rumpun}</span>
                      <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', isSelected && 'text-primary translate-x-0.5')} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Kolom Kanan: Preview Detail & Checklist Unit (7 cols) */}
            <div className="lg:col-span-7 border rounded-xl p-3.5 overflow-y-auto space-y-3.5 bg-card flex flex-col justify-between max-h-[380px] lg:max-h-[440px]">
              {activeKatalog ? (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {/* Skema Header Card */}
                  <div className="p-3 bg-muted/40 rounded-xl border space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-primary font-bold">
                      <Award className="w-4 h-4 shrink-0" />
                      <span>{activeKatalog.namaSkema}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {activeKatalog.deskripsi || 'Standar kompetensi keahlian resmi sesuai pedoman juknis & SKKNI.'}
                    </p>
                    {activeKatalog.defaultJudulId && (
                      <div className="pt-1.5 border-t border-border/50 text-[11px] space-y-0.5">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-sky-500" /> Rekomendasi Judul Penugasan:
                        </span>
                        <div className="text-muted-foreground italic pl-4 font-normal">
                          "{activeKatalog.defaultJudulId}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist Header */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-b pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-foreground">
                        Daftar Unit SKKNI
                      </span>
                      <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 px-2 py-0.2 rounded-full font-bold">
                        {selectedUnitCodes.size} / {activeKatalog.units?.length || 0} Terpilih
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={selectAllUnits}
                        className="text-primary hover:underline font-semibold"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-muted-foreground">•</span>
                      <button
                        type="button"
                        onClick={deselectAllUnits}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Batal Semua
                      </button>
                    </div>
                  </div>

                  {/* Unit List Items */}
                  <div className="space-y-1.5">
                    {(activeKatalog.units || []).map((u: any, idx: number) => {
                      const isChecked = selectedUnitCodes.has(u.kodeUnit);
                      return (
                        <div
                          key={u.id || u.kodeUnit}
                          onClick={() => toggleUnit(u.kodeUnit)}
                          className={cn(
                            'flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none',
                            isChecked
                              ? 'bg-primary/5 border-primary/40'
                              : 'bg-muted/10 border-border hover:bg-muted/30 opacity-70'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleUnit(u.kodeUnit)}
                            className="mt-0.5 rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer shrink-0"
                          />
                          <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0 w-5 text-center">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[10px] font-semibold text-primary">
                              {u.kodeUnit}
                            </div>
                            <div className="text-[11px] text-foreground font-medium leading-snug">
                              {u.judulUnitId}
                            </div>
                            {u.judulUnitEn && (
                              <div className="text-[10px] text-muted-foreground italic font-normal">
                                {u.judulUnitEn}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-xs text-muted-foreground">
                  Pilih skema di sebelah kiri untuk melihat daftar unit kompetensi.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-[11px] text-muted-foreground">
            {activeKatalog && (
              <span>
                Unit terpilih akan disalin ke lembar belakang konfigurasi jurusan <b>{jurusanNama}</b>.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAdopt}
              disabled={!activeKatalog || selectedUnitCodes.size === 0}
              className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Adopsi {selectedUnitCodes.size} Unit ke Jurusan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
