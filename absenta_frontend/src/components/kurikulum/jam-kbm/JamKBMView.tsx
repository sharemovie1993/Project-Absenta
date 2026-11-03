import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Button, SectionCard } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { Save, RefreshCw, Clock, Users, Zap } from 'lucide-react';
import { getTenantById, updateTenant } from '@/api/tenants.api';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { useJenjang } from '@/hooks/useJenjang';
import { useKelasOptions } from '@/components/common';
import { toast } from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import {
  type ShiftConfig,
  type KelasOption,
  shiftConfigSchema,
  getPresetSlotsForJenjang,
  parseSlots,
  regenerateSlots,
} from './JamKBMTypes';

// Lazy-loaded heavy subcomponents
const JamKBMShiftPanel = lazy(() => import('./JamKBMShiftPanel'));
const JamKBMClassAssignmentPanel = lazy(() => import('./JamKBMClassAssignmentPanel'));
const JamKBMDailyMaxJpPanel = lazy(() => import('./JamKBMDailyMaxJpPanel'));

const HARDENING_KEY = 'jam_kbm_page';

const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  operational_mode: 'SINGLE',
  shifts: [
    {
      id: 'pagi',
      name: 'Shift Reguler (Pagi)',
      slots: [
        { slot: 1, start: '07:00', end: '07:45' },
        { slot: 2, start: '07:45', end: '08:30' },
        { slot: 3, start: '08:30', end: '09:15' },
        { slot: 4, start: '09:35', end: '10:20' },
        { slot: 5, start: '10:20', end: '11:05' },
        { slot: 6, start: '11:05', end: '11:50' },
        { slot: 7, start: '12:30', end: '13:15' },
        { slot: 8, start: '13:15', end: '14:00' },
        { slot: 9, start: '14:00', end: '14:45' },
        { slot: 10, start: '14:45', end: '15:30' },
        { slot: 11, start: '15:30', end: '16:15' },
        { slot: 12, start: '16:15', end: '17:00' },
      ],
    },
  ],
  class_assignments: {},
};

function PanelLoader() {
  return (
    <div className="flex justify-center items-center py-16">
      <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
    </div>
  );
}

export interface UniversalJamKBMViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
}

export const JamKBMView: React.FC<UniversalJamKBMViewProps> = React.memo(({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user, isKurikulum, isAdmin, can } = useCapabilities();
  const confirm = useConfirm();
  const { jenjang } = useJenjang();
  const canManage = !readOnly && (isAdmin || isKurikulum || can('academic.schedules.manage') || can('academic.manage.academic'));

  // ── State ──
  const [saving, setSaving] = useState(false);
  const [activeShiftTab, setActiveShiftTab] = useState<'SHIFTS' | 'CLASSES' | 'DAILY_MAX_JP'>('SHIFTS');
  const [activeSelectedShiftId, setActiveSelectedShiftId] = useState<string>('pagi');
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig>(DEFAULT_SHIFT_CONFIG);

  // ── useKelasOptions & useQuery ──────────────────────────────────────────────
  const { rawList: kelasRawList } = useKelasOptions();
  const kelasList = useMemo<KelasOption[]>(() => {
    return (kelasRawList || []).map(k => ({ value: k.id, label: k.nama_kelas }));
  }, [kelasRawList]);

  const { data: tenantRes, isLoading: loading, refetch: fetchTenant } = useQuery({
    queryKey: ['my-tenant-jam-kbm', user?.tenant_id],
    queryFn: () => user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : null,
    enabled: !!user?.tenant_id,
    staleTime: 10 * 60 * 1000,
  });

  const tenant = tenantRes?.data || null;

  useEffect(() => {
    if (!tenant) return;
    if (tenant.shift_jam_pelajaran) {
      const loadedConfig = tenant.shift_jam_pelajaran as ShiftConfig;
      const upgradedShifts = (loadedConfig.shifts || []).map((shift) => {
        const parsedInfo = parseSlots(shift.slots || []);
        const effectiveDuration = shift.slot_duration ?? (parsedInfo.slot_duration > 0 ? parsedInfo.slot_duration : 45);
        const effectiveStartTime = shift.start_time || parsedInfo.start_time || '07:00';
        const effectiveBreaks = shift.breaks || parsedInfo.breaks || [];

        if (shift.slots && shift.slots.length < 12) {
          const newSlots = regenerateSlots(effectiveStartTime, effectiveDuration, effectiveBreaks, 12);
          return { 
            ...shift, 
            start_time: effectiveStartTime, 
            slot_duration: effectiveDuration, 
            breaks: effectiveBreaks, 
            slots: newSlots 
          };
        }

        return {
          ...shift,
          start_time: effectiveStartTime,
          slot_duration: effectiveDuration,
          breaks: effectiveBreaks
        };
      });
      setShiftConfig({ ...loadedConfig, shifts: upgradedShifts });
      if (upgradedShifts.length > 0) {
        setActiveSelectedShiftId(upgradedShifts[0].id);
      }
    } else {
      const slots = getPresetSlotsForJenjang(tenant.jenjang ?? '');
      const preset: ShiftConfig = {
        operational_mode: 'SINGLE',
        shifts: [{ id: 'pagi', name: 'Shift Reguler (Pagi)', slots }],
        class_assignments: {},
      };
      setShiftConfig(preset);
      setActiveSelectedShiftId('pagi');
    }
  }, [tenant]);

  // Mode Operasional Sekolah: 1 Shift vs 2 Shift
  const isMultiShift = useMemo(() => {
    return shiftConfig.operational_mode === 'MULTI' || 
      (shiftConfig.operational_mode !== 'SINGLE' && (shiftConfig.shifts?.length || 0) > 1);
  }, [shiftConfig.operational_mode, shiftConfig.shifts]);

  useEffect(() => {
    if (!isMultiShift && activeShiftTab === 'CLASSES') {
      setActiveShiftTab('SHIFTS');
    }
  }, [isMultiShift, activeShiftTab]);

  // Handler Beralih Mode Shift Operasional Sekolah (Murni Toggle Flag Saja)
  const handleModeChange = useCallback((mode: 'SINGLE' | 'MULTI') => {
    setShiftConfig(prev => ({
      ...prev,
      operational_mode: mode,
    }));

    if (mode === 'SINGLE' && activeShiftTab === 'CLASSES') {
      setActiveShiftTab('SHIFTS');
    }
  }, [activeShiftTab]);

  // Handler Update Batas Maksimal JP Harian Guru
  const handleDailyMaxJpChange = useCallback((dayKey: string, val: number) => {
    setShiftConfig(prev => ({
      ...prev,
      daily_max_jp: {
        ...(prev.daily_max_jp || {}),
        [dayKey]: val,
      },
    }));
  }, []);

  // ── Save with Zod validation ──
  const handleSave = useCallback(async () => {
    const tenantId = tenant?.id || user?.tenant_id;
    if (!tenantId) {
      toast.error('ID Sekolah (Tenant) tidak terdeteksi');
      return;
    }

    const validation = shiftConfigSchema.safeParse(shiftConfig);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Konfigurasi shift tidak valid';
      toast.error(`Validasi gagal: ${firstError}`);
      return;
    }

    setSaving(true);
    try {
      await updateTenant(tenantId, {
        shift_jam_pelajaran: validation.data,
      });

      await queryClient.invalidateQueries({ queryKey: ['my-tenant-jam-kbm'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      await fetchTenant();

      toast.success('Konfigurasi Jam Pelajaran berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan konfigurasi jam pelajaran');
    } finally {
      setSaving(false);
    }
  }, [tenant, user, shiftConfig, queryClient, fetchTenant]);

  const handleConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return confirm({ title, message });
  }, [confirm]);

  // Tab Switcher Options dinamis
  const tabOptions = useMemo(() => {
    if (!isMultiShift) {
      return [
        { id: 'SHIFTS', label: 'Distribusi Jam Pelajaran', icon: Clock, colorClass: 'text-indigo-600 dark:text-indigo-400' },
        { id: 'DAILY_MAX_JP', label: 'Batas Beban Harian Guru', icon: Zap, colorClass: 'text-amber-600 dark:text-amber-400' },
      ];
    }
    return [
      { id: 'SHIFTS', label: 'Distribusi Jam Pelajaran', icon: Clock, colorClass: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'CLASSES', label: 'Penugasan Shift Kelas', icon: Users, colorClass: 'text-purple-600 dark:text-purple-400' },
      { id: 'DAILY_MAX_JP', label: 'Batas Beban Harian Guru', icon: Zap, colorClass: 'text-amber-600 dark:text-amber-400' },
    ];
  }, [isMultiShift]);

  // ── Breadcrumbs & Instructions for Standalone Mode ──
  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', path: '/kurikulum/jam-kbm' },
    { label: isMultiShift ? 'Distribusi JP / Shift' : 'Distribusi Jam Pelajaran' },
  ], [isMultiShift]);

  const instruction = useMemo(() => ({
    title: isMultiShift ? 'Panduan Distribusi Jam Pelajaran & Shift' : 'Panduan Distribusi Jam Pelajaran',
    description: isMultiShift
      ? 'Pedoman alokasi slot jam pelajaran harian (Senin – Jumat/Sabtu), jeda istirahat, serta alokasi shift kelas.'
      : 'Pedoman alokasi slot waktu jam pelajaran harian (Senin – Jumat/Sabtu), jam bel masuk, dan jeda istirahat sekolah.',
    items: [
      { text: 'Atur jam mulai (JP ke-1) dan durasi menit per JP.' },
      { text: 'Gunakan tombol "Sisipkan Istirahat" untuk menambahkan jeda antar jam pelajaran.' },
      { text: 'Konfigurasi batas maksimal JP mengajar guru per hari telah dipisahkan pada tab tersendiri.' },
      { text: 'Klik "Simpan" untuk memberlakukan perubahan ke sistem jadwal dan presensi KBM.' },
    ],
  }), [isMultiShift]);

  const content = (
    <div className="w-full space-y-4">
      {/* Action Bar saat di dalam Dashboard Tab atau Modal (hideLayout = true) */}
      {hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {isMultiShift ? 'Pengaturan Jam KBM & Shift' : 'Pengaturan Jam Pelajaran (JP)'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {isMultiShift 
                  ? 'Atur durasi per JP, alokasi shift rombel, dan jeda istirahat'
                  : 'Atur durasi per JP, jam bel masuk, dan jeda istirahat harian sekolah'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Mode Operasional Selector (1 Shift vs 2 Shift) */}
            {canManage && (
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => handleModeChange('SINGLE')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    !isMultiShift
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  1 Shift (Reguler)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('MULTI')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    isMultiShift
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  2 Shift (Pagi/Siang)
                </button>
              </div>
            )}

            {jenjang && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                {jenjang}
              </div>
            )}

            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-3.5 h-8 text-xs font-bold"
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Simpan</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <SectionCard fullWidth noPadding>
        {/* Tab pills + jenjang badge */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-0 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <TabSwitcher
            options={tabOptions}
            activeTab={activeShiftTab}
            onChange={(id) => setActiveShiftTab(id as 'SHIFTS' | 'CLASSES' | 'DAILY_MAX_JP')}
          />
          {jenjang && !hideLayout && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{jenjang}</span>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          {activeShiftTab === 'SHIFTS' ? (
            <Suspense fallback={<PanelLoader />}>
              <JamKBMShiftPanel
                shiftConfig={shiftConfig}
                activeSelectedShiftId={activeSelectedShiftId}
                jenjang={jenjang ?? ''}
                cascadeEnabled={true}
                onShiftConfigChange={setShiftConfig}
                onActiveShiftChange={setActiveSelectedShiftId}
                onConfirm={handleConfirm}
                readOnly={!canManage}
                isSingleShift={!isMultiShift}
              />
            </Suspense>
          ) : activeShiftTab === 'CLASSES' && isMultiShift ? (
            <Suspense fallback={<PanelLoader />}>
              <JamKBMClassAssignmentPanel
                shiftConfig={shiftConfig}
                kelasList={kelasList}
                onShiftConfigChange={setShiftConfig}
                readOnly={!canManage}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<PanelLoader />}>
              <JamKBMDailyMaxJpPanel
                dailyMaxJp={shiftConfig.daily_max_jp}
                onChange={handleDailyMaxJpChange}
                readOnly={!canManage}
              />
            </Suspense>
          )}
        </div>
      </SectionCard>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      title={isMultiShift ? "Distribusi Jam Pelajaran & Shift" : "Distribusi Jam Pelajaran"}
      description={isMultiShift 
        ? "Pedoman alokasi slot waktu jam pelajaran harian (Senin – Jumat/Sabtu), pembagian shift rombel, dan jeda istirahat."
        : "Pedoman alokasi slot waktu jam pelajaran harian (Senin – Jumat/Sabtu), jam bel masuk, dan jeda istirahat sekolah."
      }
      hardeningModuleKey={HARDENING_KEY}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      toolbar={
        canManage && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {isMultiShift ? '2 Shift' : '1 Shift'}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl px-3.5 h-8 text-xs font-bold"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Simpan</span>
            </Button>
          </div>
        )
      }
    >
      {content}
    </AcademicPageLayout>
  );
});

JamKBMView.displayName = 'JamKBMView';
export default JamKBMView;
