import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { Button, Input, EnhancedAlert } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Switch } from '../../components/ui/Switch';
import { HelpCircle } from 'lucide-react';
import { formatCurrency as formatCurrencyPlan } from '../../api/plans.api';
import { formatCurrency as formatCurrencyUI } from '../../utils/layoutUtils';
import {
  getSubscriptionsByTenant,
  getActiveSubscription,
  createSubscription,
  updateSubscription,
} from '../../api/subscription.api';
import type { FilteredSubscriptionItem } from '../../api/subscription.api';
import type { Plan } from '../../types/billing';
import type { CreateSubscriptionRequest } from '../../types/subscription';
import { mapSubscriptionToUI } from '../../utils/subscriptionMapper';

interface SubscriptionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSA: boolean;
  userId?: string;
  userTenantId?: string;
  planOptions: Array<{ id: string; name: string }>;
  planDetails: Record<string, Plan>;
  tenantOptions: Array<{ id: string; name: string }>;
  plansLoading: boolean;
  tenantsLoading: boolean;
  getCurrentTenantId: () => string | null | undefined;
  isSuperAdmin: () => boolean;
  loadSubscriptions: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const SubscriptionCreateModal: React.FC<SubscriptionCreateModalProps> = ({
  isOpen,
  onClose,
  isSA,
  userId,
  userTenantId,
  planOptions,
  planDetails,
  tenantOptions,
  plansLoading,
  tenantsLoading,
  getCurrentTenantId,
  isSuperAdmin,
  loadSubscriptions,
  onSuccess,
  onError,
}) => {
  const [createTenantId, setCreateTenantId] = useState<string>('');
  const [createPlanId, setCreatePlanId] = useState<string>('');
  const [createStartDate, setCreateStartDate] = useState<string>('');
  const [createEndDate, setCreateEndDate] = useState<string>('');
  const [createStatus, setCreateStatus] = useState<string>('ACTIVE');
  const [createAutoRenew, setCreateAutoRenew] = useState<boolean>(true);
  const [createGenerateInvoice, setCreateGenerateInvoice] = useState<boolean>(true);
  const [createPaymentMethod, setCreatePaymentMethod] = useState<string>('');
  const [trialEnabled, setTrialEnabled] = useState<boolean>(false);
  const [trialDays, setTrialDays] = useState<number>(0);
  const [nextBillingDate, setNextBillingDate] = useState<string>('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const next30 = new Date();
      next30.setDate(today.getDate() + 30);
      setCreateStartDate(today.toISOString().slice(0, 10));
      setCreateEndDate(next30.toISOString().slice(0, 10));
      setCreatePlanId('');
      setCreateTenantId(userTenantId || '');
      setCreateStatus('ACTIVE');
      setCreateAutoRenew(true);
      setCreateGenerateInvoice(true);
      setCreatePaymentMethod('');
      setTrialEnabled(false);
      setTrialDays(0);
      setNextBillingDate('');
      setFormErrors([]);
    }
  }, [isOpen, userTenantId]);

  const computeEndDate = useCallback((start: string, planId?: string) => {
    if (!start) return '';
    const startDt = new Date(start);
    const plan = planId ? planDetails[planId] : undefined;
    const isYearly = (plan?.billing_cycle === 'YEARLY') || !!plan?.price_yearly;
    const end = new Date(startDt);
    end.setDate(end.getDate() + (isYearly ? 365 : 30));
    return end.toISOString().slice(0, 10);
  }, [planDetails]);

  const computeNextBillingDate = useCallback((start: string, planId?: string) => {
    if (!start) return '';
    const startDt = new Date(start);
    const plan = planId ? planDetails[planId] : undefined;
    const isYearly = (plan?.billing_cycle === 'YEARLY') || !!plan?.price_yearly;
    const next = new Date(startDt);
    next.setDate(next.getDate() + (isYearly ? 365 : 30));
    return next.toISOString().slice(0, 10);
  }, [planDetails]);

  // Reaktif: update tanggal berakhir & next billing saat start_date/plan berubah
  useEffect(() => {
    if (createStartDate) {
      const autoEnd = computeEndDate(createStartDate, createPlanId);
      setCreateEndDate(prev => prev || autoEnd);
      setNextBillingDate(computeNextBillingDate(createStartDate, createPlanId));
    }
    setCreateStatus(trialEnabled ? 'TRIAL' : 'ACTIVE');
  }, [createStartDate, createPlanId, trialEnabled, computeEndDate, computeNextBillingDate]);

  // Ketika plan dipilih, tentukan apakah trial tersedia
  useEffect(() => {
    if (createPlanId) {
      const plan = planDetails[createPlanId];
      const featuresStr: string = plan?.features || '';
      const supportsTrial = !!plan?.trial_days || /trial/i.test(featuresStr);
      setTrialEnabled(supportsTrial);
      setTrialDays(plan?.trial_days || (supportsTrial ? 14 : 0));
      if (createStartDate) {
        setCreateEndDate(computeEndDate(createStartDate, createPlanId));
        setNextBillingDate(computeNextBillingDate(createStartDate, createPlanId));
      }
    }
  }, [createPlanId, planDetails, createStartDate, computeEndDate, computeNextBillingDate]);

  const selectedPlan = useMemo(() => (createPlanId ? planDetails[createPlanId] : null), [createPlanId, planDetails]);

  const prorationInfo = useMemo(() => {
    const cycleDays = selectedPlan?.billing_cycle === 'YEARLY' ? 365 : 30;
    const basePrice = selectedPlan?.price_monthly || 0;
    if (!createStartDate || !createEndDate) {
      return { prorateAmount: basePrice, cycleDays, usedDays: cycleDays };
    }
    const sd = new Date(createStartDate);
    const ed = new Date(createEndDate);
    const usedDays = Math.max(1, Math.round((ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24)));
    const ratio = Math.min(1, usedDays / cycleDays);
    const prorateAmount = Math.round(basePrice * ratio);
    return { prorateAmount, cycleDays, usedDays };
  }, [createStartDate, createEndDate, selectedPlan]);

  const setupFee = 0;
  const taxAmount = 0;
  const currencyCode = selectedPlan?.currency || 'IDR';
  const baseCharge = useMemo(() => (createStatus === 'TRIAL' ? 0 : prorationInfo.prorateAmount), [createStatus, prorationInfo]);
  const totalEstimate = useMemo(() => baseCharge + setupFee + taxAmount, [baseCharge]);

  const validateCreateForm = async (): Promise<string[]> => {
    const errs: string[] = [];
    const tenantIdToUse = isSuperAdmin() ? createTenantId : (userTenantId || getCurrentTenantId() || '');
    if (!tenantIdToUse) errs.push('Tenant harus dipilih');
    if (!createPlanId) errs.push('Plan harus dipilih');
    if (!createStartDate) errs.push('Tanggal mulai harus diisi');
    if (!createEndDate) errs.push('Tanggal berakhir harus diisi');
    if (createStartDate && createEndDate) {
      if (new Date(createEndDate) < new Date(createStartDate))
        errs.push('Tanggal berakhir tidak boleh sebelum tanggal mulai');
    }
    if (createAutoRenew && createGenerateInvoice && !createPaymentMethod) {
      errs.push('Metode pembayaran diperlukan saat Auto Renew ON dan Generate invoice aktif');
    }
    try {
      let list: FilteredSubscriptionItem[] = [];
      try {
        const res = await getSubscriptionsByTenant(tenantIdToUse, true);
        list = (res?.data?.subscriptions || (res as unknown as { data?: FilteredSubscriptionItem[] }).data || []) as FilteredSubscriptionItem[];
      } catch (err: unknown) {
        const has403 = typeof err === 'object' && err !== null && 'response' in err &&
          ((err as { response?: { status?: number } }).response?.status === 403);
        const msgStr = typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message) : '';
        if (has403 || /status code 403/i.test(msgStr)) {
          const resActive = await getActiveSubscription();
          const activeItem = (resActive?.data || null) as FilteredSubscriptionItem | null;
          list = activeItem ? [activeItem] : [];
        }
      }
      const overlaps = list.filter(s => (
        (s.tenant_id === tenantIdToUse) &&
        ((s.plan_id === createPlanId) || (s.Plan?.id === createPlanId)) &&
        (s.status === 'ACTIVE' || s.status === 'TRIAL' || s.status === 'PENDING_PAYMENT')
      )).some(s => {
        const aStart = new Date(s.start_date);
        const aEnd = new Date(s.end_date);
        const bStart = new Date(createStartDate);
        const bEnd = new Date(createEndDate);
        return (aStart <= bEnd) && (bStart <= aEnd);
      });
      if (overlaps) errs.push('Terdapat subscription aktif yang tumpang tindih untuk plan yang sama');
    } catch {
      // Abaikan error validasi overlap
    }
    return errs;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const tenantIdToUse = isSuperAdmin() ? createTenantId : (userTenantId || getCurrentTenantId() || '');
      const errs = await validateCreateForm();
      if (errs.length > 0) {
        setFormErrors(errs);
        onError('Validasi gagal');
        return;
      }
      await createSubscription({
        tenant_id: tenantIdToUse,
        plan_id: createPlanId,
        start_date: createStartDate,
        end_date: createEndDate,
        status: (trialEnabled ? 'TRIAL' : 'ACTIVE'),
        auto_renew: createAutoRenew,
      } as CreateSubscriptionRequest);
      try {
        let created: FilteredSubscriptionItem | null = null;
        try {
          const res = await getSubscriptionsByTenant(tenantIdToUse, true);
          const list = (res?.data?.subscriptions || (res as unknown as { data?: FilteredSubscriptionItem[] }).data || []) as FilteredSubscriptionItem[];
          created = list.find((s) => (
            s.tenant_id === tenantIdToUse &&
            (s.plan_id === createPlanId || s.Plan?.id === createPlanId)
          )) || null;
        } catch (err: unknown) {
          const has403 = typeof err === 'object' && err !== null && 'response' in err &&
            ((err as { response?: { status?: number } }).response?.status === 403);
          const msgStr = typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message) : '';
          if (has403 || /status code 403/i.test(msgStr)) {
            const resActive = await getActiveSubscription();
            const activeItem = (resActive?.data || null) as FilteredSubscriptionItem | null;
            if (activeItem && (activeItem.tenant_id === tenantIdToUse) &&
              (activeItem.plan_id === createPlanId || activeItem?.Plan?.id === createPlanId)) {
              created = activeItem;
            }
          }
        }
        if (created?.id) {
          const targetStatus = createGenerateInvoice ? 'PENDING_PAYMENT' : (trialEnabled ? 'TRIAL' : 'ACTIVE');
          await updateSubscription(created.id, { status: targetStatus });
        }
      } catch {
        // Abaikan error post-create update
      }
      onSuccess('Subscription berhasil dibuat');
      onClose();
      setCreatePlanId('');
      setFormErrors([]);
      await loadSubscriptions();
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e !== null && 'message' in e
        ? String((e as { message?: unknown }).message) : 'Gagal membuat subscription';
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Subscription Baru"
      size="md"
    >
      <div className="space-y-4">
        {/* Tenant */}
        {isSA ? (
          <div>
            <label
              htmlFor="create-tenant-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tenant
            </label>
            <div className="mb-2">
              <SearchableSelect
                value={createTenantId}
                onValueChange={setCreateTenantId}
                options={[
                  { value: '', label: 'Pilih Tenant' },
                  ...tenantOptions?.map(t => ({ value: t.id, label: t.name }))
                ]}
                placeholder="Pilih Tenant"
                searchPlaceholder="Cari tenant..."
                triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            {tenantsLoading && (
              <div className="text-xs text-gray-500 mb-1">Memuat daftar tenant...</div>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="create-tenant-readonly"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tenant
            </label>
            <input
              id="create-tenant-readonly"
              type="text"
              value={userTenantId ? `Tenant ID: ${userTenantId}` : 'Tenant tidak tersedia'}
              readOnly
              aria-label="Tenant ID (readonly)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>
        )}

        {/* Plan */}
        <div>
          <label
            htmlFor="create-plan-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Plan
          </label>
          {plansLoading && (
            <div className="text-xs text-gray-500 mb-1">Memuat daftar plan...</div>
          )}
          <SearchableSelect
            value={createPlanId}
            onValueChange={setCreatePlanId}
            options={planOptions?.map(p => ({ value: p.id, label: p.name }))}
            placeholder="Pilih Plan"
            searchPlaceholder="Cari plan..."
            triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          {createPlanId && planDetails[createPlanId] && (
            <div className="mt-3 p-3 rounded-md border border-blue-200 bg-blue-50 text-sm">
              <div className="font-medium">Ringkasan Plan</div>
              <div>
                Harga: <strong>{formatCurrencyPlan(planDetails[createPlanId].price_monthly || 0, planDetails[createPlanId].currency || 'IDR')}</strong>
              </div>
              {planDetails[createPlanId].max_user != null && (
                <div>Maks. User: <strong>{planDetails[createPlanId].max_user}</strong></div>
              )}
              {planDetails[createPlanId].features && (
                <div>Fitur: <span>{planDetails[createPlanId].features}</span></div>
              )}
            </div>
          )}
        </div>

        {/* Tanggal Mulai & Berakhir */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="create-start-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tanggal Mulai
            </label>
            <input
              id="create-start-date"
              type="date"
              value={createStartDate}
              onChange={(e) => {
                const v = e.target.value;
                setCreateStartDate(v);
                setCreateEndDate(computeEndDate(v, createPlanId));
              }}
              aria-label="Tanggal mulai subscription"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="create-end-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Tanggal Berakhir
            </label>
            <input
              id="create-end-date"
              type="date"
              value={createEndDate}
              onChange={(e) => setCreateEndDate(e.target.value)}
              aria-label="Tanggal berakhir subscription"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Status & Trial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="create-status-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Status
            </label>
            <SearchableSelect
              value={createStatus}
              onValueChange={setCreateStatus}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                ...(trialEnabled ? [{ value: 'TRIAL', label: 'TRIAL' }] : []),
                { value: 'PENDING_PAYMENT', label: 'PENDING_PAYMENT' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
              placeholder="Pilih Status"
              searchPlaceholder="Cari Status..."
              triggerClassName="w-full"
            />
          </div>
          {trialEnabled && (
            <div>
              <label
                htmlFor="create-trial-days"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Trial Days
                <span title="Jumlah hari trial. Saat TRIAL aktif, biaya awal = 0 hingga trial berakhir.">
                  <HelpCircle className="inline w-3 h-3 text-gray-400 ml-1" />
                </span>
              </label>
              <Input
                id="create-trial-days"
                type="number"
                min={0}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value || '0', 10))}
                aria-label="Jumlah hari trial"
              />
            </div>
          )}
        </div>

        {/* Auto Renew */}
        <div className="flex items-center gap-3">
          <Switch
            id="create-auto-renew"
            checked={createAutoRenew}
            onCheckedChange={setCreateAutoRenew}
            aria-label="Toggle Auto Renew"
          />
          <label htmlFor="create-auto-renew" className="text-sm cursor-pointer">
            Auto Renew
          </label>
          <span title="Jika aktif, sistem otomatis membuat tagihan pada Next Billing Date.">
            <HelpCircle className="inline w-3 h-3 text-gray-400" />
          </span>
        </div>

        {/* Auto Renew Details */}
        {createAutoRenew && (
          <div className="space-y-2 p-3 rounded-md border border-yellow-200 bg-yellow-50 text-sm">
            <div className="text-yellow-800">
              Auto Renew aktif. Mohon tentukan metode pembayaran atau status akan disetel ke PENDING_PAYMENT.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="create-payment-method"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Metode Pembayaran
                </label>
                <SearchableSelect
                  value={createPaymentMethod}
                  onValueChange={setCreatePaymentMethod}
                  options={[
                    { value: '', label: 'Pilih Metode' },
                    { value: 'BANK_TRANSFER', label: 'BANK_TRANSFER' },
                    { value: 'QRIS', label: 'QRIS' },
                    { value: 'CREDIT_CARD', label: 'CREDIT_CARD' },
                    { value: 'E_WALLET', label: 'E_WALLET' },
                    { value: 'CASH', label: 'CASH' },
                  ]}
                  placeholder="Pilih Metode"
                  searchPlaceholder="Cari metode..."
                  triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="create-next-billing"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Next Billing Date
                </label>
                <input
                  id="create-next-billing"
                  type="date"
                  value={nextBillingDate}
                  readOnly
                  aria-label="Tanggal penagihan berikutnya (otomatis)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Switch
                id="create-generate-invoice"
                checked={createGenerateInvoice}
                onCheckedChange={setCreateGenerateInvoice}
                aria-label="Generate first invoice"
              />
              <label htmlFor="create-generate-invoice" className="text-sm cursor-pointer">
                Generate first invoice
              </label>
            </div>
          </div>
        )}

        {/* Ringkasan Biaya Awal */}
        {createPlanId && selectedPlan && (
          <div className="space-y-2 p-3 rounded-md border border-blue-200 bg-blue-50 text-sm mt-2">
            <div className="font-medium">Ringkasan Biaya Awal</div>
            {createStatus === 'TRIAL' ? (
              <div>Langganan dalam masa trial. Tidak ada biaya awal hingga masa trial berakhir.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    Harga Bulanan: <strong>{formatCurrencyPlan(selectedPlan.price_monthly || 0, currencyCode)}</strong>
                  </div>
                  <div>
                    Prorata ({prorationInfo.usedDays}/{prorationInfo.cycleDays} hari): <strong>{formatCurrencyUI(baseCharge)}</strong>
                  </div>
                  <div>Biaya Setup: <strong>{formatCurrencyUI(setupFee)}</strong></div>
                  <div>Pajak: <strong>{formatCurrencyUI(taxAmount)}</strong></div>
                </div>
                <div className="mt-2">Total Estimasi: <strong>{formatCurrencyUI(totalEstimate)}</strong></div>
                <div className="text-xs text-gray-600 mt-1">
                  Catatan: Prorata dan pajak mengikuti dukungan backend. Nilai dapat berubah saat invoice dibuat.
                </div>
              </>
            )}
          </div>
        )}

        {/* Form Errors */}
        {formErrors.length > 0 && (
          <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-800">
            {formErrors?.map((err, idx) => <div key={idx}>{err}</div>)}
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting}>Batal</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
