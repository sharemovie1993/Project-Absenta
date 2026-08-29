import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { getTenantById, updateTenant, type UpdateTenantRequest } from '../../../api/tenants.api';
import { Button, Input, Label, ModalFooter, Loader, Alert, Switch } from '../../ui';
import { toast } from 'react-hot-toast';
import { Clock, Settings2, Save, RefreshCw, CalendarDays, GraduationCap, Briefcase, BookOpen, AlertCircle } from 'lucide-react';

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
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* 1. ATURAN PRESENSI SISWA */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Aturan Presensi Siswa</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Jam Masuk Gerbang & Toleransi KBM Siswa</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 group">
              <Label htmlFor="jam-masuk-default-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Masuk Siswa <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="jam-masuk-default-field"
                type="time"
                value={formData.jam_masuk_default}
                onChange={(e) => setFormData(prev => ({ ...prev, jam_masuk_default: e.target.value }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Batas bel masuk gerbang sekolah.</p>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="toleransi-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Toleransi Gerbang (Menit) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="toleransi-field"
                type="number"
                min="0"
                value={formData.toleransi_keterlambatan_menit}
                onChange={(e) => setFormData(prev => ({ ...prev, toleransi_keterlambatan_menit: Number(e.target.value) }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Toleransi tap sebelum masuk catatan piket.</p>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="jam-pulang-default-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Pulang Siswa <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="jam-pulang-default-field"
                type="time"
                value={formData.jam_pulang_default}
                onChange={(e) => setFormData(prev => ({ ...prev, jam_pulang_default: e.target.value }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Waktu tap kepulangan siswa.</p>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="toleransi-kbm-siswa-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Toleransi KBM Kelas (Menit) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="toleransi-kbm-siswa-field"
                type="number"
                min="0"
                value={formData.toleransi_kbm_siswa_menit}
                onChange={(e) => setFormData(prev => ({ ...prev, toleransi_kbm_siswa_menit: Number(e.target.value) }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Batas siswa masuk kelas tanpa surat piket.</p>
            </div>
          </div>
        </div>

        {/* 2. ATURAN PRESENSI GURU & TENDIK */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Briefcase size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Aturan Presensi Guru & Pegawai</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Jam Kedatangan Dinas & Pemicu Radar Inval KBM</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 group">
              <Label htmlFor="jam-masuk-guru-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Datang Guru <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="jam-masuk-guru-field"
                type="time"
                value={formData.jam_masuk_guru_default}
                onChange={(e) => setFormData(prev => ({ ...prev, jam_masuk_guru_default: e.target.value }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Batas kehadiran dinas/piket pagi.</p>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="toleransi-guru-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Toleransi Gerbang Guru (Menit) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="toleransi-guru-field"
                type="number"
                min="0"
                value={formData.toleransi_keterlambatan_guru_menit}
                onChange={(e) => setFormData(prev => ({ ...prev, toleransi_keterlambatan_guru_menit: Number(e.target.value) }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Toleransi kedatangan fingerprint dinas.</p>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="jam-pulang-guru-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Pulang Dinas <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="jam-pulang-guru-field"
                type="time"
                value={formData.jam_pulang_guru_default}
                onChange={(e) => setFormData(prev => ({ ...prev, jam_pulang_guru_default: e.target.value }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Batas akhir jam operasional dinas.</p>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="toleransi-guru-inval-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Pemicu Radar Inval (Menit) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="toleransi-guru-inval-field"
                type="number"
                min="0"
                value={formData.toleransi_kbm_guru_inval_menit}
                onChange={(e) => setFormData(prev => ({ ...prev, toleransi_kbm_guru_inval_menit: Number(e.target.value) }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500/30 transition-all rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">Batas waktu sebelum memicu guru pengganti.</p>
            </div>
          </div>
        </div>

        {/* 3. KEBIJAKAN HARI OPERASIONAL */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Hari Sekolah Aktif</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Tentukan hari operasional sekolah</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 font-medium italic">
            * Sistem hanya akan membuat sesi absensi otomatis pada hari-hari yang dipilih di atas.
          </p>
        </div>

        {/* 4. VALIDASI KEHADIRAN */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Settings2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Validasi Kehadiran</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Aturan Scan Fisik vs Manual</p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
            <div className="space-y-1">
              <Label htmlFor="allow-manual-hadir-field" className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter cursor-pointer">
                Izinkan Absensi Manual "Hadir"
              </Label>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-xl">
                Bila diaktifkan, guru atau petugas kelas dapat menandai siswa sebagai "Hadir" secara manual di dashboard tanpa memerlukan scan alat/kartu gerbang fisik.
              </p>
            </div>
            <Switch
              id="allow-manual-hadir-field"
              checked={formData.allow_manual_hadir_gate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_manual_hadir_gate: checked }))}
            />
          </div>
        </div>

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={loading}
            className="px-8"
          >
            {loading ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
};

TenantAttendanceFormComponent.displayName = 'TenantAttendanceForm';
export const TenantAttendanceForm = React.memo(TenantAttendanceFormComponent);
