import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button, SectionCard } from '@/components/ui';
import { Save, RefreshCw, Clock, Users } from 'lucide-react';
import { getTenantById, updateTenant, type Tenant } from '@/api/tenants.api';
import { getKelasForDropdown } from '@/api/dropdown.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useJenjang } from '@/hooks/useJenjang';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';
import {
  type ShiftConfig,
  type KelasOption,
  shiftConfigSchema,
  getPresetSlotsForJenjang,
} from '@/components/kurikulum/jam-kbm/JamKBMTypes';

// ─── Lazy-loaded heavy subcomponents (Point #6: Lazy + Suspense) ─────────────
const JamKBMShiftPanel = lazy(() => import('@/components/kurikulum/jam-kbm/JamKBMShiftPanel'));
const JamKBMClassAssignmentPanel = lazy(() => import('@/components/kurikulum/jam-kbm/JamKBMClassAssignmentPanel'));

// ─── Constants ───────────────────────────────────────────────────────────────
const HARDENING_KEY = 'jam_kbm_page';

const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  shifts: [
    {
      id: 'pagi',
      name: 'Shift Pagi',
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
      ],
    },
  ],
  class_assignments: {},
};

// ─── Panel fallback loader ────────────────────────────────────────────────────
function PanelLoader() {
  return (
    <div className="flex justify-center items-center py-16">
      <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JamKBMPage() {
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const { jenjang } = useJenjang();
  const canManage = can('academic.schedules.manage') || can('academic.manage.academic');

  // ── State ──
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [activeShiftTab, setActiveShiftTab] = useState<'SHIFTS' | 'CLASSES'>('SHIFTS');
  const [activeSelectedShiftId, setActiveSelectedShiftId] = useState<string>('pagi');
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig>(DEFAULT_SHIFT_CONFIG);

  // ── Fetch ──
  const fetchTenant = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      setLoading(true);
      const [response, kelasRes] = await Promise.all([
        getTenantById(user.tenant_id),
        getKelasForDropdown().catch(() => null),
      ]);

      if (kelasRes) setKelasList(kelasRes as KelasOption[]);

      if (response.success) {
        const data = response.data;
        setTenant(data);

        if (data.shift_jam_pelajaran) {
          setShiftConfig(data.shift_jam_pelajaran as ShiftConfig);
          if (data.shift_jam_pelajaran.shifts?.length > 0) {
            setActiveSelectedShiftId(data.shift_jam_pelajaran.shifts[0].id);
          }
        } else {
          const slots = getPresetSlotsForJenjang(data.jenjang ?? '');
          const preset: ShiftConfig = {
            shifts: [{ id: 'pagi', name: 'Shift Pagi', slots }],
            class_assignments: {},
          };
          setShiftConfig(preset);
          setActiveSelectedShiftId('pagi');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data konfigurasi KBM';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  useEffect(() => {
    if ((shiftConfig.shifts?.length || 0) <= 1 && activeShiftTab === 'CLASSES') {
      setActiveShiftTab('SHIFTS');
    }
  }, [shiftConfig.shifts, activeShiftTab]);

  // ── Save with Zod validation (Point #3) ──
  const handleSave = useCallback(async () => {
    if (!tenant) return;

    // Zod validation before sending to API (defense-in-depth)
    const parsed = shiftConfigSchema.safeParse(shiftConfig);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      toast.error(`Validasi gagal: ${firstError.message} (${firstError.path.join('.')})`);
      return;
    }

    const ok = await confirm({
      title: 'Simpan Konfigurasi Shift KBM',
      description: 'Apakah Anda yakin ingin menyimpan perubahan pada konfigurasi shift dan pembagian kelas ini?',
      confirmText: 'Ya, Simpan',
      cancelText: 'Batal',
      style: 'info',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const response = await updateTenant(tenant.id, { shift_jam_pelajaran: parsed.data });
      if (response.success) {
        toast.success('Konfigurasi Shift & Waktu KBM berhasil disimpan!');
        fetchTenant();
      } else {
        toast.error(response.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [tenant, shiftConfig, confirm, fetchTenant]);

  // ── Layout config (memoized) ──
  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', path: '/kurikulum/dashboard' },
    { label: 'Atur JP/Shift' },
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Atur JP/Shift',
    description: 'Menu ini memungkinkan kurikulum untuk membagi waktu sekolah menjadi beberapa shift (misal Pagi & Siang) agar tidak memicu deteksi bentrok mengajar lintas shift.',
    items: [
      { text: 'Tambahkan shift baru jika sekolah Anda menyelenggarakan shift siang.' },
      { text: 'Sesuaikan jam mulai dan jam selesai untuk masing-masing slot jam pelajaran.' },
      { text: 'Petakan rombongan belajar (kelas) ke shift masing-masing di tab Penugasan Shift Kelas.' },
      { text: 'Klik tombol Simpan Perubahan di kanan atas setelah selesai menyunting.' },
    ],
  }), []);

  // ── Confirm wrapper (typed) ──
  const handleConfirm = useCallback((opts: {
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    style: string;
  }) => confirm(opts as Parameters<typeof confirm>[0]), [confirm]);

  // ── Loading state ──
  if (loading) {
    return (
      <AcademicPageLayout
        hardeningModuleKey={HARDENING_KEY}
        title="Atur JP/Shift"
        description="Atur durasi jam pelajaran KBM per shift dan petakan kelas masing-masing."
        breadcrumbs={breadcrumbs}
      >
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Memuat konfigurasi KBM...
          </p>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      hardeningModuleKey={HARDENING_KEY}
      title="Atur JP/Shift"
      description="Atur durasi jam pelajaran KBM per shift dan petakan kelas masing-masing."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      toolbar={
        canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Perubahan
          </Button>
        )
      }
    >
      <div className="max-w-5xl">
        <SectionCard
          fullWidth
          noPadding
        >
          {/* Tab pills + jenjang badge */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit" role="tablist">
              <button
                id="tab-btn-shifts"
                type="button"
                aria-selected={activeShiftTab === 'SHIFTS'}
                role="tab"
                onClick={() => setActiveShiftTab('SHIFTS')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeShiftTab === 'SHIFTS'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pengaturan Waktu Shift
              </button>
              {(shiftConfig.shifts?.length || 0) > 1 && (
                <button
                  id="tab-btn-classes"
                  type="button"
                  aria-selected={activeShiftTab === 'CLASSES'}
                  role="tab"
                  onClick={() => setActiveShiftTab('CLASSES')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeShiftTab === 'CLASSES'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Penugasan Shift Kelas
                </button>
              )}
            </div>
            {jenjang && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{jenjang}</span>
              </div>
            )}
          </div>

          <div className="p-6">
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
                />
              </Suspense>
            ) : (
              <Suspense fallback={<PanelLoader />}>
                <JamKBMClassAssignmentPanel
                  shiftConfig={shiftConfig}
                  kelasList={kelasList}
                  onShiftConfigChange={setShiftConfig}
                  readOnly={!canManage}
                />
              </Suspense>
            )}
          </div>
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
}
