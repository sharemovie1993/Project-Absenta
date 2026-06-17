import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText, CreditCard, AlertCircle } from 'lucide-react';
import type { Subscription } from '../../types/subscription';
import { createBilling, generateMonthlyBilling } from '../../api/billing.api';
import { getAllSubscriptions } from '../../api/subscription.api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/layoutUtils';
import { LogService } from '../../utils/LogService';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { SearchableSelect, Button, Input, Label, Modal } from '../../components/ui';

interface BillingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type BillingMode = 'auto-generate' | 'manual';

interface BillingFormData {
  mode: BillingMode;
  subscription_id: string;
  
  // Auto-generate specific
  month?: string;
  year?: number;
  
  // Manual specific
  amount?: number;
  billing_date?: string;
  due_date?: string;
  payment_method?: string;
  payment_reference?: string;
  description?: string;
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
  { value: 'CREDIT_CARD', label: 'Kartu Kredit' },
  { value: 'E_WALLET', label: 'E-Wallet' },
  { value: 'CASH', label: 'Tunai' }
];

export const BillingFormModal: React.FC<BillingFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState<BillingFormData>({
    mode: 'auto-generate',
    subscription_id: '',
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear()
  });
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Check if user has permission to create billing (SUPERADMIN global)
  const isSuperAdmin = isSystemSuperAdmin(user?.role?.name, (user as any)?.tenant_id);

  // Load subscriptions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSubscriptions();
    }
  }, [isOpen]);

  const loadSubscriptions = async () => {
    try {
      const response = await getAllSubscriptions();
      setSubscriptions(response.data?.subscriptions || []);
    } catch (error) {
      LogService.error('Error loading subscriptions:', error);
    }
  };

  const selectedSubscription = subscriptions.find(s => s.id === formData.subscription_id);

  // Helper functions

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const generateBillingDate = () => {
    if (formData.month && formData.year) {
      return `${formData.year}-${formData.month.padStart(2, '0')}-01`;
    }
    return '';
  };

  const generateDueDate = () => {
    if (formData.month && formData.year) {
      const billingDate = new Date(`${formData.year}-${formData.month.padStart(2, '0')}-01`);
      return addDays(billingDate, 14).toISOString().split('T')[0];
    }
    return '';
  };

  const getMonthName = (month: string) => {
    return MONTHS.find(m => m.value === parseInt(month))?.label || '';
  };

  // Form handlers
  const handleModeChange = (mode: BillingMode) => {
    setFormData(prev => ({
      ...prev,
      mode,
      // Reset mode-specific fields
      month: mode === 'auto-generate' ? (new Date().getMonth() + 1).toString() : undefined,
      year: mode === 'auto-generate' ? new Date().getFullYear() : undefined,
      amount: undefined,
      billing_date: undefined,
      due_date: undefined,
      payment_method: undefined,
      payment_reference: undefined,
      description: undefined
    }));
    setErrors([]);
  };

  const handleSubscriptionChange = (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    
    setFormData(prev => ({
      ...prev,
      subscription_id: subscriptionId,
      // Auto-fill for manual mode
      ...(prev.mode === 'manual' && subscription ? {
        amount: subscription.plan?.price_monthly ?? (subscription as any).Plan?.price_monthly ?? 0,
        billing_date: new Date().toISOString().split('T')[0],
        due_date: addDays(new Date(), 14).toISOString().split('T')[0]
      } : {})
    }));
  };

  const handleInputChange = (field: keyof BillingFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validation
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.subscription_id) {
      errors.push('Subscription harus dipilih');
    }
    
    if (formData.mode === 'auto-generate') {
      if (!formData.month || !formData.year) {
        errors.push('Bulan dan tahun harus dipilih');
      }
    } else {
      if (!formData.amount || formData.amount <= 0) {
        errors.push('Jumlah harus lebih dari 0');
      }
      if (!formData.billing_date) {
        errors.push('Tanggal tagihan harus diisi');
      }
      if (!formData.due_date) {
        errors.push('Tanggal jatuh tempo harus diisi');
      }
      if (formData.billing_date && formData.due_date && 
          new Date(formData.billing_date) >= new Date(formData.due_date)) {
        errors.push('Tanggal jatuh tempo harus setelah tanggal tagihan');
      }
    }
    
    return errors;
  };

  const isFormValid = () => {
    return validateForm().length === 0;
  };

  // Submit handlers
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      if (formData.mode === 'auto-generate') {
        await generateMonthlyBilling({
          subscription_id: formData.subscription_id,
          month: parseInt(formData.month!),
          year: formData.year!
        });
      } else {
        await createBilling({
          subscription_id: formData.subscription_id,
          amount: formData.amount!,
          billing_date: formData.billing_date!,
          due_date: formData.due_date!,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference
        });
      }
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      setErrors([error.response?.data?.message || 'Terjadi kesalahan saat membuat tagihan']);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      mode: 'auto-generate',
      subscription_id: '',
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear()
    });
    setErrors([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Buat Tagihan Baru"
      size="2xl"
    >
      <div>
        {/* Permission Error */}
        {!isSuperAdmin && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="text-yellow-600 mr-3" size={20} />
              <div>
                <h3 className="text-yellow-800 font-medium">Akses Terbatas</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Hanya SUPERADMIN yang dapat membuat tagihan baru. Anda saat ini login sebagai {user?.role?.name || 'Unknown'}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ul className="text-red-600 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Mode Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Mode Pembuatan Tagihan
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleModeChange('auto-generate')}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                formData.mode === 'auto-generate'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <Calendar size={24} />
              </div>
              <div className="font-medium">Auto Generate</div>
              <div className="text-sm text-gray-500">Tagihan bulanan rutin</div>
            </button>
            
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                formData.mode === 'manual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <FileText size={24} />
              </div>
              <div className="font-medium">Manual</div>
              <div className="text-sm text-gray-500">Tagihan custom</div>
            </button>
          </div>
        </div>

        {/* Common Fields */}
        <div className="space-y-4">
          {/* Subscription Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription *
            </label>
            <SearchableSelect
              value={formData.subscription_id}
              onValueChange={(val) => handleSubscriptionChange(val)}
              options={[
                { label: 'Pilih Subscription', value: '' },
                ...subscriptions.map(subscription => ({
                  label: `${
                    subscription.Tenant?.name ||
                    // beberapa API mengembalikan lowercase tenant
                    (subscription as any).tenant?.name ||
                    subscription.Tenant?.email ||
                    (subscription as any).tenant?.email ||
                    'Unknown Tenant'
                  } - ${
                    subscription.plan?.name ||
                    // beberapa API mengembalikan Plan uppercase
                    (subscription as any).Plan?.name ||
                    'Unknown Plan'
                  } (${
                    formatCurrency(
                      subscription.plan?.price_monthly ||
                      (subscription as any).Plan?.price_monthly ||
                      0
                    )
                  })`,
                  value: subscription.id
                }))
              ]}
              placeholder="Pilih Subscription"
              searchPlaceholder="Cari subscription..."
              triggerClassName="w-full"
            />
          </div>

          {/* Auto-Generate Mode Fields */}
          {formData.mode === 'auto-generate' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bulan *
                  </label>
                  <SearchableSelect
                    value={formData.month || ''}
                    onValueChange={(val) => handleInputChange('month', val)}
                    options={MONTHS.map(month => ({
                      label: month.label,
                      value: month.value.toString()
                    }))}
                    placeholder="Pilih Bulan"
                    searchPlaceholder="Cari bulan..."
                    triggerClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tahun *
                  </label>
                  <SearchableSelect
                    value={formData.year?.toString() || ''}
                    onValueChange={(val) => handleInputChange('year', val ? parseInt(val) : undefined)}
                    options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => ({
                      label: year.toString(),
                      value: year.toString()
                    }))}
                    placeholder="Pilih Tahun"
                    searchPlaceholder="Cari tahun..."
                    triggerClassName="w-full"
                  />
                </div>
              </div>

              {/* Preview Auto-Generated Data */}
              {selectedSubscription && formData.month && formData.year && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Preview Tagihan:</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>Jumlah: <strong>{formatCurrency(selectedSubscription.plan?.price_monthly ?? (selectedSubscription as any).Plan?.price_monthly ?? 0)}</strong></p>
                    <p>Tanggal Tagihan: <strong>{generateBillingDate()}</strong></p>
                    <p>Jatuh Tempo: <strong>{generateDueDate()}</strong></p>
                    <p>Invoice: <strong>Auto-generated</strong></p>
                    <p>Deskripsi: <strong>Tagihan bulanan {getMonthName(formData.month)} {formData.year}</strong></p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Manual Mode Fields */}
          {formData.mode === 'manual' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah (Rp) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="Masukkan jumlah tagihan"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {selectedSubscription && (
                  <p className="text-sm text-gray-500 mt-1">
                    Harga paket: {formatCurrency(selectedSubscription.plan?.price_monthly ?? (selectedSubscription as any).Plan?.price_monthly ?? 0)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Tagihan *
                  </label>
                  <input
                    type="date"
                    value={formData.billing_date || ''}
                    onChange={(e) => handleInputChange('billing_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Jatuh Tempo *
                  </label>
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metode Pembayaran
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
                  <SearchableSelect
                    value={formData.payment_method || ''}
                    onValueChange={(val) => handleInputChange('payment_method', val)}
                    options={[
                      { label: 'Pilih Metode Pembayaran', value: '' },
                      ...PAYMENT_METHODS.map(method => ({
                        label: method.label,
                        value: method.value
                      }))
                    ]}
                    placeholder="Pilih Metode Pembayaran"
                    searchPlaceholder="Cari metode..."
                    triggerClassName="w-full pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referensi Pembayaran
                </label>
                <input
                  type="text"
                  value={formData.payment_reference || ''}
                  onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                  placeholder="Nomor referensi (opsional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Deskripsi tagihan (opsional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-6 border-t mt-6">
        <Button
          type="button"
          onClick={handleClose}
          disabled={loading}
          variant="outline"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isSuperAdmin || !isFormValid() || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Memproses...' : (formData.mode === 'auto-generate' ? 'Generate Tagihan' : 'Buat Tagihan')}
        </Button>
      </div>
    </Modal>
  );
};
