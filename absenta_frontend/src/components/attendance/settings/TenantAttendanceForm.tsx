import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { getTenantById, updateTenant, type UpdateTenantRequest } from '../../../api/tenants.api';
import { Button, Input, Label, Loader, Alert, Switch } from '../../ui';
import { toast } from 'react-hot-toast';
import { Settings2, Save, RefreshCw, CalendarDays, GraduationCap, Briefcase, Clock, ShieldCheck } from 'lucide-react';

import { HARI_LIST } from '../../../constants/day.constants';

const TenantAttendanceFormComponent: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // Siswa (Gerbang & KBM)
    jam_masuk_default: '07:00',
    jam_pulang_default: '14:00',
    toleransi_keterlambatan_menit: 15,
    toleransi_kbm_siswa_menit: 10,

    // Guru & Tendik (Gerbang & Inval KBM)
    jam_masuk_guru_default: '06:45',
    jam_pulang_guru_default: '15:30',
    toleransi_keterlambatan_guru_menit: 5,
    toleransi_kbm_guru_inval_menit: 10,

    // Operasional
    hari_sekolah: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'],
    allow_manual_hadir_gate: false
  });

  const DAYS_OPTIONS = HARI_LIST;

  const loadTenantData = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      setLoadingData(true);
      setError(null);
      const response = await getTenantById(user.tenant_id);
      const tenant = response.data as any;
      setFormData({
        jam_masuk_default: tenant.jam_masuk_default || '07:00',
        jam_pulang_default: tenant.jam_pulang_default || '14:00',
        toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit ?? 15,
        toleransi_kbm_siswa_menit: tenant.toleransi_kbm_siswa_menit ?? 10,

        jam_masuk_guru_default: tenant.jam_masuk_guru_default || '06:45',
        jam_pulang_guru_default: tenant.jam_pulang_guru_default || '15:30',
        toleransi_keterlambatan_guru_menit: tenant.toleransi_keterlambatan_guru_menit ?? 5,
        toleransi_kbm_guru_inval_menit: tenant.toleransi_kbm_guru_inval_menit ?? 10,

        hari_sekolah: tenant.hari_sekolah || ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'],
        allow_manual_hadir_gate: !!tenant.allow_manual_hadir_gate
      });
    } catch (err) {
      console.error('Failed to load tenant data', err);
      setError('Gagal memuat pengaturan sekolah');
    } finally {
      setLoadingData(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    if (user?.tenant_id) {
      loadTenantData();
    }
  }, [user?.tenant_id, loadTenantData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenant_id) return;
    try {
      setLoading(true);
      const updateData: UpdateTenantRequest = {
        jam_masuk_default: formData.jam_masuk_default,
        jam_pulang_default: formData.jam_pulang_default,
        toleransi_keterlambatan_menit: Number(formData.toleransi_keterlambatan_menit),
        toleransi_kbm_siswa_menit: Number(formData.toleransi_kbm_siswa_menit),

        jam_masuk_guru_default: formData.jam_masuk_guru_default,
        jam_pulang_guru_default: formData.jam_pulang_guru_default,
        toleransi_keterlambatan_guru_menit: Number(formData.toleransi_keterlambatan_guru_menit),
        toleransi_kbm_guru_inval_menit: Number(formData.toleransi_kbm_guru_inval_menit),

        hari_sekolah: formData.hari_sekolah,
        allow_manual_hadir_gate: formData.allow_manual_hadir_gate
      };
      
      const response = await updateTenant(user.tenant_id, updateData);
      if (response.success) {
        toast.success('Pengaturan aturan absensi berhasil disimpan');
        queryClient.invalidateQueries({ queryKey: ['attendance-config'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-info'] });
        queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
        queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      } else {
        toast.error(response.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err: unknown) {
      console.error('Failed to update settings', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id, formData, queryClient]);

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-32 sm:pb-12 max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* ── CARD 1: ATURAN PRESENSI SISWA ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Aturan Presensi Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jam operasional gerbang dan batas toleransi KBM kelas siswa
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Row 1: Jam Masuk & Jam Pulang Siswa */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jam-masuk-default-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jam Masuk <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="jam-masuk-default-field"
                  type="time"
                  value={formData.jam_masuk_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, jam_masuk_default: e.target.value }))}
                  required
                  className="h-10 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                <p className="text-[11px] text-slate-400">Bel masuk gerbang</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jam-pulang-default-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jam Pulang <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="jam-pulang-default-field"
                  type="time"
                  value={formData.jam_pulang_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, jam_pulang_default: e.target.value }))}
                  required
                  className="h-10 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                <p className="text-[11px] text-slate-400">Tap kepulangan siswa</p>
              </div>
            </div>

            {/* Row 2: Toleransi Gerbang & Toleransi KBM Siswa */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="toleransi-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Toleransi Gerbang <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="toleransi-field"
                    type="number"
                    min="0"
                    value={formData.toleransi_keterlambatan_menit}
                    onChange={(e) => setFormData(prev => ({ ...prev, toleransi_keterlambatan_menit: Number(e.target.value) }))}
                    required
                    className="h-10 pr-14 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    Menit
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Toleransi tap di gerbang</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="toleransi-kbm-siswa-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Toleransi KBM <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="toleransi-kbm-siswa-field"
                    type="number"
                    min="0"
                    value={formData.toleransi_kbm_siswa_menit}
                    onChange={(e) => setFormData(prev => ({ ...prev, toleransi_kbm_siswa_menit: Number(e.target.value) }))}
                    required
                    className="h-10 pr-14 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    Menit
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Batas masuk kelas</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: ATURAN PRESENSI GURU & PEGAWAI ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Aturan Presensi Guru & Pegawai
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jam kedatangan dinas guru dan batas pemicu radar guru inval KBM
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Row 1: Jam Datang Guru & Jam Pulang Guru */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jam-masuk-guru-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jam Datang Guru <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="jam-masuk-guru-field"
                  type="time"
                  value={formData.jam_masuk_guru_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, jam_masuk_guru_default: e.target.value }))}
                  required
                  className="h-10 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                <p className="text-[11px] text-slate-400">Batas kehadiran dinas</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jam-pulang-guru-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jam Pulang Dinas <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="jam-pulang-guru-field"
                  type="time"
                  value={formData.jam_pulang_guru_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, jam_pulang_guru_default: e.target.value }))}
                  required
                  className="h-10 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                <p className="text-[11px] text-slate-400">Akhir jam kerja dinas</p>
              </div>
            </div>

            {/* Row 2: Toleransi Gerbang Guru & Pemicu Radar Inval */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="toleransi-guru-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Toleransi Gerbang <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="toleransi-guru-field"
                    type="number"
                    min="0"
                    value={formData.toleransi_keterlambatan_guru_menit}
                    onChange={(e) => setFormData(prev => ({ ...prev, toleransi_keterlambatan_guru_menit: Number(e.target.value) }))}
                    required
                    className="h-10 pr-14 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    Menit
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Toleransi tap fingerprint</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="toleransi-guru-inval-field" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pemicu Inval KBM <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="toleransi-guru-inval-field"
                    type="number"
                    min="0"
                    value={formData.toleransi_kbm_guru_inval_menit}
                    onChange={(e) => setFormData(prev => ({ ...prev, toleransi_kbm_guru_inval_menit: Number(e.target.value) }))}
                    required
                    className="h-10 pr-14 text-sm font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    Menit
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Batas sebelum guru pengganti</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: HARI SEKOLAH AKTIF ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Hari Sekolah Aktif
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih hari aktif kegiatan belajar mengajar (5 atau 6 hari kerja)
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-2.5">
              {DAYS_OPTIONS.map((day) => {
                const isActive = formData.hari_sekolah.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      setFormData(prev => {
                        const current = [...prev.hari_sekolah];
                        if (current.includes(day.value)) {
                          return { ...prev, hari_sekolah: current.filter(d => d !== day.value) };
                        } else {
                          return { ...prev, hari_sekolah: [...current, day.value] };
                        }
                      });
                    }}
                    className={`px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs active:scale-95' 
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Sesi presensi KBM harian hanya akan dijadwalkan otomatis pada hari-hari aktif di atas.
            </p>
          </div>
        </div>

        {/* ── CARD 4: VALIDASI KEHADIRAN ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-violet-50/50 via-white to-white dark:from-violet-950/20 dark:via-slate-900 dark:to-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Validasi Kehadiran
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aturan scan fisik gerbang vs presensi manual
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <div className="space-y-1 pr-2">
                <Label htmlFor="allow-manual-hadir-field" className="text-xs font-semibold text-slate-900 dark:text-slate-200 cursor-pointer">
                  Izinkan Absensi Manual "Hadir"
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bila diaktifkan, guru/petugas dapat menandai siswa sebagai "Hadir" secara manual di dashboard tanpa scan fisik RFID/Barcode gerbang.
                </p>
              </div>
              <Switch
                id="allow-manual-hadir-field"
                checked={formData.allow_manual_hadir_gate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_manual_hadir_gate: checked }))}
              />
            </div>
          </div>
        </div>

        {/* ── SUBMIT ACTION (CLEAN & VISIBLE) ── */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-2.5 h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>Simpan Pengaturan Absensi</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

TenantAttendanceFormComponent.displayName = 'TenantAttendanceForm';
export const TenantAttendanceForm = React.memo(TenantAttendanceFormComponent);
