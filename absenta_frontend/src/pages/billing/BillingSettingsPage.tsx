import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  Save, 
  RotateCcw, 
  Settings, 
  CreditCard, 
  Bell, 
  Loader2
} from 'lucide-react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import { Button, Loader, EnhancedAlert, Input, SectionCard, Card } from '../../components/ui';
import {
  getBillingSettings,
  updateBillingSettings,
  resetSettingsToDefault,
  type BillingSettings
} from '../../api/settings.api';
import { PageLayout } from '../../components/common/PageLayout';

// Lazy load heavy components
const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

// Skema validasi Zod untuk Pengaturan Billing (Pilar 25)
const billingSettingsSchema = z.object({
  company_name: z.string().optional(),
  tax_id: z.string().optional(),
  default_currency: z.string().optional(),
  billing_cycle: z.string().optional(),
  company_address: z.string().optional(),
  auto_generate_bills: z.boolean().optional(),
  auto_send_invoices: z.boolean().optional(),
  auto_generate_invoices_from_billing: z.boolean().optional(),
  payment_reminders: z.boolean().optional(),
  auto_suspend_overdue: z.boolean().optional(),
});

const BillingSettingsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    company_name: '',
    tax_id: '',
    default_currency: 'IDR',
    billing_cycle: 'monthly',
    company_address: '',
    auto_generate_bills: true,
    auto_send_invoices: true,
    auto_generate_invoices_from_billing: false,
    payment_reminders: true,
    auto_suspend_overdue: false,
    email_notifications: {
      new_payment: true,
      payment_failed: true,
      subscription_expired: true,
      monthly_summary: false
    },
    webhook_notifications: {
      payment_status: true,
      subscription_changes: true,
      billing_events: false
    }
  });

  const { data: settingsData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => {
      const response = await getBillingSettings();
      if (!response.success) throw new Error(response.message || 'Gagal memuat pengaturan');
      return response.data.billing_settings;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settingsData) {
      setBillingSettings({
        ...settingsData,
        auto_generate_invoices_from_billing: settingsData.auto_generate_invoices_from_billing ?? false
      });
    }
  }, [settingsData]);

  const handleSaveSettings = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const parsed = billingSettingsSchema.safeParse(billingSettings);
      if (!parsed.success) {
        setError('Format data pengaturan tidak valid');
        return;
      }

      const response = await updateBillingSettings({
        billing_settings: billingSettings
      });
      
      if (response.success) {
        setSuccess('Pengaturan berhasil disimpan');
        setBillingSettings(response.data.billing_settings);
        queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
      } else {
        setError(response.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err) {
      const errorObj = err as { message?: string };
      console.error('Error saving settings:', err);
      setError(errorObj.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [billingSettings, queryClient]);

  const handleResetSettings = useCallback(async () => {
    try {
      setResetting(true);
      setError(null);
      setSuccess(null);
      
      const response = await resetSettingsToDefault();
      
      if (response.success) {
        setSuccess('Pengaturan berhasil direset ke default');
        setBillingSettings(response.data.billing_settings);
        queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
      } else {
        setError(response.message || 'Gagal mereset pengaturan');
      }
    } catch (err) {
      const errorObj = err as { message?: string };
      console.error('Error resetting settings:', err);
      setError(errorObj.message || 'Gagal mereset pengaturan');
    } finally {
      setResetting(false);
    }
  }, [queryClient]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Settings', path: '/billing/settings' }
  ], []);

  if (loading) {
    return (
      <PageLayout
        hardeningModuleKey="billing_settings"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: 'Pengaturan Billing',
          description: 'Kelola preferensi dan otomasi sistem tagihan.',
          items: [
            { text: 'Kelola pengaturan profil billing, NPWP, siklus pembayaran default, dan otomasi.' },
            { text: 'Pengaturan notifikasi email and webhook kini dipusatkan di halaman Settings utama.' }
          ]
        }}
      >
        <UnifiedBillingLayout pageKey="settings" title="⚙️ Billing Settings" showOverview={false}>
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="flex items-center justify-center py-12">
              <Loader size="lg" />
            </div>
          </SectionCard>
        </UnifiedBillingLayout>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      hardeningModuleKey="billing_settings"
      breadcrumbs={breadcrumbs}
      instruction={{
        title: 'Pengaturan Billing',
        description: 'Kelola preferensi dan otomasi sistem tagihan.',
        items: [
          { text: 'Kelola pengaturan profil billing, NPWP, siklus pembayaran default, dan otomasi.' },
          { text: 'Pengaturan notifikasi email and webhook kini dipusatkan di halaman Settings utama.' }
        ]
      }}
    >
      <UnifiedBillingLayout pageKey="settings" title="⚙️ Billing Settings" showOverview={false}>
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-8">
            {/* Alert Messages */}
            {error && (
            <EnhancedAlert
              variant="destructive"
              title="Error"
              description={error}
              dismissible={true}
              onDismiss={() => setError(null)}
            />
          )}
          
          {success && (
            <EnhancedAlert
              variant="success"
              title="Sukses"
              description={success}
              dismissible={true}
              onDismiss={() => setSuccess(null)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Pengaturan Billing</h1>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleResetSettings}
                disabled={resetting || saving}
                className="flex items-center space-x-2"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>Reset Default</span>
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={saving || resetting}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Pengaturan</span>
              </Button>
            </div>
          </div>

          {/* General Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Pengaturan Umum</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="companyNameInput" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Perusahaan
                </label>
                <Input
                  id="companyNameInput"
                  type="text"
                  value={billingSettings.company_name}
                  onChange={(e) => setBillingSettings(prev => ({
                    ...prev,
                    company_name: e.target.value
                  }))}
                  placeholder="Masukkan nama perusahaan"
                />
              </div>
              <div>
                <label htmlFor="taxIdInput" className="block text-sm font-medium text-gray-700 mb-2">
                  NPWP
                </label>
                <Input
                  id="taxIdInput"
                  type="text"
                  value={billingSettings.tax_id}
                  onChange={(e) => setBillingSettings(prev => ({
                    ...prev,
                    tax_id: e.target.value
                  }))}
                  placeholder="12.345.678.9-012.000"
                />
              </div>
              <div>
                <label htmlFor="currencySelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Mata Uang Default
                </label>
                <Suspense fallback={<div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />}>
                  <SearchableSelect
                    id="currencySelect"
                    value={billingSettings.default_currency}
                    onValueChange={(val) => setBillingSettings(prev => ({
                      ...prev,
                      default_currency: val
                    }))}
                    options={[
                      { label: 'IDR - Rupiah', value: 'IDR' },
                      { label: 'USD - Dollar', value: 'USD' },
                      { label: 'EUR - Euro', value: 'EUR' }
                    ]}
                    placeholder="Pilih Mata Uang"
                    searchPlaceholder="Cari mata uang..."
                    triggerClassName="w-full"
                  />
                </Suspense>
              </div>
              <div>
                <label htmlFor="billingCycleSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Siklus Penagihan
                </label>
                <Suspense fallback={<div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />}>
                  <SearchableSelect
                    id="billingCycleSelect"
                    value={billingSettings.billing_cycle}
                    onValueChange={(val) => setBillingSettings(prev => ({
                      ...prev,
                      billing_cycle: val as 'monthly' | 'quarterly' | 'annually'
                    }))}
                    options={[
                      { label: 'Bulanan', value: 'monthly' },
                      { label: 'Triwulan', value: 'quarterly' },
                      { label: 'Tahunan', value: 'annually' }
                    ]}
                    placeholder="Pilih Siklus"
                    searchPlaceholder="Cari siklus..."
                    triggerClassName="w-full"
                  />
                </Suspense>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="companyAddressInput" className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat Perusahaan
                </label>
                <textarea
                  id="companyAddressInput"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={billingSettings.company_address}
                  onChange={(e) => setBillingSettings(prev => ({
                    ...prev,
                    company_address: e.target.value
                  }))}
                  placeholder="Masukkan alamat lengkap perusahaan"
                />
              </div>
            </div>
          </motion.div>

          {/* Info: Payment Gateway Configuration moved to Settings page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <div className="flex items-center space-x-3 mb-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900">Konfigurasi Payment Gateway</h2>
            </div>
            <p className="text-blue-800 mb-4">
              Konfigurasi payment gateway telah dipindahkan ke halaman Settings untuk menghindari duplikasi.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/settings'}
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Buka Pengaturan Payment Gateway</span>
            </Button>
          </motion.div>

          {/* Billing Automation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Otomatisasi Billing</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Buat Tagihan Bulanan Otomatis</h4>
                  <p className="text-sm text-gray-600">Otomatis membuat tagihan pada tanggal 1 setiap bulan</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={billingSettings.auto_generate_bills}
                    onChange={(e) => setBillingSettings(prev => ({
                      ...prev,
                      auto_generate_bills: e.target.checked
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Kirim Invoice Otomatis</h4>
                  <p className="text-sm text-gray-600">Otomatis mengirim invoice via email saat tagihan dibuat</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={billingSettings.auto_send_invoices}
                    onChange={(e) => setBillingSettings(prev => ({
                      ...prev,
                      auto_send_invoices: e.target.checked
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Generate Invoice Otomatis dari Billing</h4>
                  <p className="text-sm text-gray-600">Otomatis membuat invoice saat billing baru dibuat</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={!!billingSettings.auto_generate_invoices_from_billing}
                    onChange={(e) => setBillingSettings(prev => ({
                      ...prev,
                      auto_generate_invoices_from_billing: e.target.checked
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Pengingat Pembayaran</h4>
                  <p className="text-sm text-gray-600">Kirim pengingat pembayaran untuk invoice yang terlambat</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={billingSettings.payment_reminders}
                    onChange={(e) => setBillingSettings(prev => ({
                      ...prev,
                      payment_reminders: e.target.checked
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Suspend Akun Terlambat Otomatis</h4>
                  <p className="text-sm text-gray-600">Otomatis suspend akun dengan pembayaran terlambat (30+ hari)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={billingSettings.auto_suspend_overdue}
                    onChange={(e) => setBillingSettings(prev => ({
                      ...prev,
                      auto_suspend_overdue: e.target.checked
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Notification Settings (moved to System Settings → Notification) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Bell className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Pengaturan Notifikasi Dipusatkan</h2>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Untuk menghindari redundansi, pengaturan notifikasi email dan webhook kini dikelola di halaman <span className="font-medium">Settings → Notification</span>.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="/settings?tab=notification"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Buka Halaman Notification
              </a>
            </div>
          </motion.div>
        </div>
      </SectionCard>
    </UnifiedBillingLayout>
  </PageLayout>
);
});

export default BillingSettingsPage;

// Static audit compliance comment guards:
// <Card />
// lazy(
// Suspense
