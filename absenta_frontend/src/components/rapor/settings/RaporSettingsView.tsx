import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Sparkles,
  Users,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Printer,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { raporApi, type RaporSettingSummaryRow } from '@/api/rapor.api';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Button } from '@/components/ui/Button';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { RaporSettingsRekapTable } from './RaporSettingsRekapTable';
import { RaporYearConfigModal } from './RaporYearConfigModal';
import { RaporMapelOrderingPanel } from './RaporMapelOrderingPanel';
import { P5FacilitatorSettingsTab } from '../p5/P5FacilitatorSettingsTab';

export interface UniversalRaporSettingsViewProps {
  // 1. Context & Scope Injections
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;

  // 2. Display Modifiers
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;

  // 3. Event Callbacks
  onClose?: () => void;
  defaultTab?: 'slot_titimangsa' | 'tim_p5' | 'urutan_mapel';
}

export const RaporSettingsView: React.FC<UniversalRaporSettingsViewProps> = React.memo(({
  tahunPelajaranId,
  semesterId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  onClose,
  defaultTab = 'slot_titimangsa',
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Guard: In dashboard context (hideLayout = true), 'tab' is the dashboard role/category (e.g. 'kurikulum').
  // Therefore, inner subtab must use 'rapor_tab' to avoid clobbering the dashboard route!
  const urlTab = searchParams.get(hideLayout ? 'rapor_tab' : 'tab');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab && ['slot_titimangsa', 'tim_p5', 'p5', 'urutan_mapel'].includes(urlTab)) {
      return urlTab === 'p5' ? 'tim_p5' : urlTab;
    }
    return defaultTab;
  });

  useEffect(() => {
    if (!isModal && urlTab && ['slot_titimangsa', 'tim_p5', 'p5', 'urutan_mapel'].includes(urlTab)) {
      setActiveTab(urlTab === 'p5' ? 'tim_p5' : urlTab);
    }
  }, [urlTab, isModal]);

  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    if (!isModal) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (hideLayout) {
          next.set('rapor_tab', newTab);
        } else {
          next.set('tab', newTab);
        }
        return next;
      }, { replace: true });
    }
  }, [isModal, hideLayout, setSearchParams]);

  // Capabilities Guard
  const { isAdmin, isKurikulum, isKepsek, isTuHead, can } = useCapabilities();
  const canManage = !readOnly && Boolean(
    isAdmin ||
    isKurikulum ||
    isKepsek ||
    isTuHead ||
    can('academic.manage.academic') ||
    can('dashboard.view.kepsek') ||
    can('core.sekolah.update.profile')
  );

  // Academic Year options
  const { options: tpOptions, activeYear } = useTahunPelajaranOptions();

  // Query Rapor Settings Summary per Academic Year
  const {
    data: rawSummary = [],
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['rapor-settings-summary'],
    queryFn: () => raporApi.getSettingsSummary(),
  });

  // Merge with tpOptions in case of missing rows
  const summaryRows: RaporSettingSummaryRow[] = useMemo(() => {
    const list = Array.isArray(rawSummary) ? rawSummary : (rawSummary as any)?.data || [];
    if (list && list.length > 0) {
      return list;
    }
    return (tpOptions || []).map((tp) => ({
      tahun_pelajaran_id: tp.value,
      tahun_ajaran: tp.label,
      is_active: tp.value === (tahunPelajaranId || activeYear?.id),
      is_configured: false,
    }));
  }, [rawSummary, tpOptions, activeYear, tahunPelajaranId]);

  // Modal Editing State
  const [selectedYearRow, setSelectedYearRow] = useState<RaporSettingSummaryRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditSlot = useCallback((row: RaporSettingSummaryRow) => {
    setSelectedYearRow(row);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditSlot = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedYearRow(null);
  }, []);

  const [selectedOrderingYearId, setSelectedOrderingYearId] = useState<string>('');

  const effectiveOrderingYearId = useMemo(() => {
    return selectedOrderingYearId || tahunPelajaranId || activeYear?.id || tpOptions[0]?.value || '';
  }, [selectedOrderingYearId, tahunPelajaranId, activeYear, tpOptions]);

  // Tabs for TabSwitcher
  const tabs = useMemo(() => [
    {
      id: 'slot_titimangsa',
      label: isMobile ? '📅 Titimangsa Slot' : '📅 Slot Titimangsa per Tahun Pelajaran',
    },
    {
      id: 'urutan_mapel',
      label: isMobile ? '📚 Urutan Mapel' : '📚 Urutan & Kelompok Mapel Rapor',
    },
    {
      id: 'tim_p5',
      label: isMobile ? '👥 Tim P5' : '👥 Tim Fasilitator Projek P5',
    },
  ], [isMobile]);

  // Calculated Stats
  const totalSlots = summaryRows.length;
  const configuredSlots = summaryRows.filter((r) => r.is_configured).length;

  return (
    <div className={cn('w-full space-y-4', isModal && 'p-2 sm:p-4')}>
      {/* 1. Header (Hanya jika BUKAN tab dashboard / hideLayout=false) */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Pengaturan Dokumen &amp; Titimangsa Rapor</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pusat konfigurasi resmi tempat terbit, titimangsa semester ganjil/genap, pejabat penandatangan, dan format blanko rapor per tahun pelajaran.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchSummary()}
              disabled={isFetchingSummary}
              className="h-8 px-3 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-800"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetchingSummary && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
            {isModal && onClose && (
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 px-2.5 rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 2. Sub-Toolbar & Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl">
        <TabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          variant="pill"
        />

        <div className="flex items-center justify-between sm:justify-end gap-3 px-2">
          {activeTab === 'slot_titimangsa' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Status Konfigurasi:</span>
              <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>{configuredSlots} / {totalSlots} Slot Siap</span>
              </span>
            </div>
          )}

          {hideLayout && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => refetchSummary()}
              disabled={isFetchingSummary}
              className="h-7 px-2 text-xs rounded-lg text-slate-500 hover:text-slate-800"
              title="Segarkan data slot rapor"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetchingSummary && 'animate-spin')} />
            </Button>
          )}
        </div>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'slot_titimangsa' && (
        <div className="space-y-4">
          {/* Petunjuk Penggunaan Cepat */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white">Arsitektur Slot per Tahun Ajaran: </span>
              Setiap tahun pelajaran memiliki slot tanggal rapor resmi tersendiri. Klik tombol <span className="font-bold text-indigo-600 dark:text-indigo-400">`[Atur Slot]`</span> pada baris angkatan untuk memperbarui titimangsa Ganjil/Genap, nama kepala sekolah, atau format cetak tanpa harus mengubah filter global sekolah.
            </div>
          </div>

          {/* Tabel Rekapitulasi Slot */}
          <RaporSettingsRekapTable
            rows={summaryRows}
            isLoading={isLoadingSummary}
            activeTahunAjaran={activeYear?.nama}
            onEditSlot={handleOpenEditSlot}
            canManage={canManage}
          />
        </div>
      )}

      {activeTab === 'urutan_mapel' && (
        <div className="space-y-4">
          {/* Selector Tahun Pelajaran */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Periode Tahun Pelajaran:
              </span>
            </div>
            <select
              value={effectiveOrderingYearId}
              onChange={(e) => setSelectedOrderingYearId(e.target.value)}
              className="text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {tpOptions.map((tp) => (
                <option key={tp.value} value={tp.value}>
                  {tp.label}
                </option>
              ))}
            </select>
          </div>

          <RaporMapelOrderingPanel
            tahunPelajaranId={effectiveOrderingYearId}
            tahunAjaran={tpOptions.find((tp) => tp.value === effectiveOrderingYearId)?.label}
          />
        </div>
      )}

      {activeTab === 'tim_p5' && (
        <div className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs">
          <P5FacilitatorSettingsTab
            tahunPelajaranId={tahunPelajaranId || activeYear?.id}
            semesterId={semesterId}
            canManage={canManage}
          />
        </div>
      )}

      {/* 4. Modal Konfigurasi Slot Terpilih */}
      <RaporYearConfigModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditSlot}
        yearRow={selectedYearRow}
        onSuccess={() => refetchSummary()}
      />
    </div>
  );
});

RaporSettingsView.displayName = 'RaporSettingsView';
