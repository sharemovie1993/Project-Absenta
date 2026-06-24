import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { getTenantById, updateTenant, type UpdateTenantRequest } from '../../../api/tenants.api';
import { Button, Input, Label, ModalFooter, Loader, Alert } from '../../ui';
import { useToast } from '../../../hooks/useToast';
import { Clock, Settings2, Save, RefreshCw } from 'lucide-react';

const TenantAttendanceFormComponent: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    jam_masuk_default: '07:00',
    jam_pulang_default: '14:00',
    toleransi_keterlambatan_menit: 15
  });

  const loadTenantData = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      setLoadingData(true);
      setError(null);
      const response = await getTenantById(user.tenant_id);
      const tenant = response.data;
      setFormData({
        jam_masuk_default: tenant.jam_masuk_default || '07:00',
        jam_pulang_default: tenant.jam_pulang_default || '14:00',
        toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit || 15
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
        toleransi_keterlambatan_menit: Number(formData.toleransi_keterlambatan_menit)
      };
      
      const response = await updateTenant(user.tenant_id, updateData);
      if (response.success) {
        showToast('Pengaturan berhasil disimpan', 'success');
      } else {
        showToast(response.message || 'Gagal menyimpan pengaturan', 'error');
      }
    } catch (err: unknown) {
      console.error('Failed to update settings', err);
      const errObj = err as { response?: { data?: { message?: string } } };
      showToast(errObj.response?.data?.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id, formData, showToast]);

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

        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Konfigurasi Waktu</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Default Absensi Harian</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 group">
              <Label htmlFor="jam-masuk-default-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Masuk Default <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="jam-masuk-default-field"
                type="time"
                value={formData.jam_masuk_default}
                onChange={(e) => setFormData(prev => ({ ...prev, jam_masuk_default: e.target.value }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="jam-pulang-default-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jam Pulang Default <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="jam-pulang-default-field"
                type="time"
                value={formData.jam_pulang_default}
                onChange={(e) => setFormData(prev => ({ ...prev, jam_pulang_default: e.target.value }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="toleransi-field" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Toleransi (Menit) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="toleransi-field"
                type="number"
                min="0"
                value={formData.toleransi_keterlambatan_menit}
                onChange={(e) => setFormData(prev => ({ ...prev, toleransi_keterlambatan_menit: Number(e.target.value) }))}
                required
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2 p-3 bg-amber-50/50 dark:bg-amber-955/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl">
              <Settings2 size={16} className="text-amber-600 dark:text-amber-500" />
              <p className="text-[10px] font-medium text-amber-800/80 dark:text-amber-400/80 tracking-tight leading-relaxed">
                Pengaturan ini akan menjadi acuan dasar untuk semua jadwal yang tidak memiliki ketentuan waktu khusus.
              </p>
            </div>
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
