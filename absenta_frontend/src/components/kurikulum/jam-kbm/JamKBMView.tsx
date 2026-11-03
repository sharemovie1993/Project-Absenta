import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Button, SectionCard } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { Save, RefreshCw, Clock, Users, Zap, Sliders, Printer } from 'lucide-react';
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
const DistribusiJamPelajaranPrintModal = lazy(() => import('./DistribusiJamPelajaranPrintModal'));

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
  const [activeSelectedShiftId, setActiveSelectedShiftId] = useState<string>('pagi');
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig>(DEFAULT_SHIFT_CONFIG);

  // ── Modal States ──
  const [showDailyMaxJpModal, setShowDailyMaxJpModal] = useState(false);
  const [showClassAssignmentModal, setShowClassAssignmentModal] = useState(false);
  const [showShiftConfigModal, setShowShiftConfigModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // ── useKelasOptions & useQuery ──────────────────────────────────────────────
  const { rawList: kelasRawList } = useKelasOptions();
  const kelasList = useMemo<KelasOption[]>(() => {
    return (kelasRawList || []).map(k => {
      let t = k.tingkat ? Number(k.tingkat) : 0;
      if (!t && k.nama_kelas) {
        const matchRoman = k.nama_kelas.match(/^(XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)\b/i);
        if (matchRoman) {
          const r = matchRoman[1].toUpperCase();
          const romanMap: Record<string, number> = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
            'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13
          };
          t = romanMap[r] || 0;
        } else {
          const matchNum = k.nama_kelas.match(/^(\d+)\b/);
          if (matchNum) t = Number(matchNum[1]);
        }
      }
      return {
        value: k.id,
        label: k.nama_kelas,
        tingkat: t || undefined,
      };
    });
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

  // Handler Beralih Mode Shift Operasional Sekolah (Murni Toggle Flag Saja)
  const handleModeChange = useCallback((mode: 'SINGLE' | 'MULTI') => {
    setShiftConfig(prev => ({
      ...prev,
      operational_mode: mode,
    }));
  }, []);

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

  // ── Breadcrumbs & Instructions for Standalone Mode ──
  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', path: '/kurikulum/jam-kbm' },
    { label: isMultiShift ? 'Distribusi Jam Pelajaran & Shift' : 'Distribusi Jam Pelajaran' },
  ], [isMultiShift]);

  const instruction = useMemo(() => ({
    title: isMultiShift ? 'Panduan Distribusi Jam Pelajaran & Shift' : 'Panduan Distribusi Jam Pelajaran',
    description: isMultiShift
      ? 'Pedoman alokasi slot jam pelajaran harian (Senin – Jumat/Sabtu), jeda istirahat, serta alokasi shift kelas.'
      : 'Pedoman alokasi slot waktu jam pelajaran harian (Senin – Jumat/Sabtu), durasi per JP, dan jeda istirahat sekolah.',
    items: [
      { text: 'Tentukan jam mulai (JP ke-1) dan durasi menit per JP pada tabel pedoman distribusi jam pelajaran.' },
      { text: 'Gunakan tombol "+ Sisipkan Istirahat" untuk menambahkan jeda antar jam pelajaran.' },
      { text: 'Akses konfigurasi Batas Beban Guru, Penugasan Shift Kelas, dan Mode Operasional Shift lewat tombol modal di toolbar.' },
      { text: 'Klik "Simpan" untuk memberlakukan perubahan ke seluruh sistem jadwal dan presensi KBM.' },
    ],
  }), [isMultiShift]);

  // Tombol navigasi toolbar untuk modal
  const renderNavButtons = () => (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDailyMaxJpModal(true)}
        className="flex items-center gap-1.5 rounded-xl h-8 text-xs font-semibold cursor-pointer"
      >
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span>Beban Guru</span>
      </Button>

      {isMultiShift && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowClassAssignmentModal(true)}
          className="flex items-center gap-1.5 rounded-xl h-8 text-xs font-semibold cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Shift Rombel</span>
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowShiftConfigModal(true)}
        className="flex items-center gap-1.5 rounded-xl h-8 text-xs font-semibold cursor-pointer"
      >
        <Sliders className="w-3.5 h-3.5 text-slate-500" />
        <span>Shift</span>
        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          {isMultiShift ? '2 Shift' : '1 Shift'}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPrintModal(true)}
        className="flex items-center gap-1.5 rounded-xl h-8 text-xs font-semibold cursor-pointer border-indigo-200 hover:border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30"
      >
        <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Cetak</span>
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-xl px-3.5 h-8 text-xs font-bold cursor-pointer"
      >
        {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        <span>Simpan</span>
      </Button>
    </>
  );

  const content = (
    <div className="w-full space-y-3">
      {/* Action Bar saat di dalam Dashboard Tab atau Modal (hideLayout = true) */}
      {hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Distribusi JP
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                Pedoman alokasi slot jam pelajaran harian &amp; jeda istirahat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {jenjang && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                {jenjang}
              </div>
            )}
            {canManage && renderNavButtons()}
          </div>
        </div>
      )}

      {/* ── Main Timetable Workspace (Fokus 100% ke Pengaturan Waktu Distribusi Jam Pelajaran) ── */}
      <SectionCard fullWidth noPadding>
        <div className="p-3 sm:p-4">
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
        </div>
      </SectionCard>

      {/* ── Modal 1: Pengaturan Model Operasional Shift ── */}
      <Modal
        isOpen={showShiftConfigModal}
        onClose={() => setShowShiftConfigModal(false)}
        title="Pengaturan Model Operasional Shift"
        description="Tentukan apakah sekolah menjalankan sistem 1 Shift (Reguler) atau 2 Shift (Pagi & Siang)."
        size="md"
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleModeChange('SINGLE')}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between",
                !isMultiShift
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">1 Shift (Reguler)</span>
                  {!isMultiShift && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Seluruh kelas masuk pada jadwal yang sama (pagi hingga siang/sore).
                </p>
              </div>
              <span className="mt-3 text-[10px] font-black tracking-wider text-slate-400 uppercase">STANDAR</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('MULTI')}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between",
                isMultiShift
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">2 Shift (Pagi &amp; Siang)</span>
                  {isMultiShift && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sekolah membagi rombel kelas menjadi Shift Pagi dan Shift Siang bergantian.
                </p>
              </div>
              <span className="mt-3 text-[10px] font-black tracking-wider text-purple-500 uppercase">PARALEL</span>
            </button>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowShiftConfigModal(false)}
              className="rounded-xl px-4 text-xs font-bold"
            >
              Selesai
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal 2: Penugasan Shift Kelas ── */}
      {isMultiShift && (
        <Modal
          isOpen={showClassAssignmentModal}
          onClose={() => setShowClassAssignmentModal(false)}
          title="Penugasan Shift Kelas"
          description="Alokasikan setiap rombel/kelas ke Shift Pagi atau Shift Siang berdasarkan struktur pohon per tingkat."
          size="5xl"
        >
          <div className="py-2 space-y-4">
            <Suspense fallback={<PanelLoader />}>
              <JamKBMClassAssignmentPanel
                shiftConfig={shiftConfig}
                kelasList={kelasList}
                onShiftConfigChange={setShiftConfig}
                readOnly={!canManage}
              />
            </Suspense>
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowClassAssignmentModal(false)}
                className="rounded-xl px-4 text-xs font-bold"
              >
                Tutup &amp; Selesai
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal 3: Batas Beban Harian Guru ── */}
      <Modal
        isOpen={showDailyMaxJpModal}
        onClose={() => setShowDailyMaxJpModal(false)}
        title="Batas Beban Harian Guru"
        description="Tentukan batas maksimal beban JP mengajar guru per hari sebagai validasi overload jadwal builder."
        size="lg"
      >
        <div className="py-2 space-y-4">
          <Suspense fallback={<PanelLoader />}>
            <JamKBMDailyMaxJpPanel
              dailyMaxJp={shiftConfig.daily_max_jp}
              onChange={handleDailyMaxJpChange}
              readOnly={!canManage}
            />
          </Suspense>
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowDailyMaxJpModal(false)}
              className="rounded-xl px-4 text-xs font-bold"
            >
              Tutup &amp; Selesai
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal 4: Cetak Distribusi Jam Pelajaran (Dokumen Resmi) ── */}
      {showPrintModal && (
        <Suspense fallback={<PanelLoader />}>
          <DistribusiJamPelajaranPrintModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            shiftConfig={shiftConfig}
            jenjang={jenjang ?? ''}
          />
        </Suspense>
      )}
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      title="Distribusi JP"
      description="Pedoman alokasi slot waktu jam pelajaran harian dan jeda istirahat sekolah."
      hardeningModuleKey={HARDENING_KEY}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      toolbar={
        canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {renderNavButtons()}
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
