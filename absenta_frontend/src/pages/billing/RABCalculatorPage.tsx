import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calculator, 
  ArrowLeft, 
  Printer, 
  ShoppingBag,
  Sparkles,
  Plus,
  Trash2,
  Package,
  Cpu
} from 'lucide-react';
import { getPublicPlans } from '@/api/plans.api';
import type { RABProductItem } from '@/components/billing/RABCalculatorModal';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Button, Loader, SectionCard, Card, TabSwitcher } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatCurrency } from '@/utils/layoutUtils';
import toast from 'react-hot-toast';

// Lazy loaded modular subcomponents (Pilar 11)
const RABServerSpecGuide = lazy(() => import('@/components/billing/rab/RABServerSpecGuide').then(m => ({ default: m.RABServerSpecGuide })));
const RABPresetCards = lazy(() => import('@/components/billing/rab/RABPresetCards').then(m => ({ default: m.RABPresetCards })));
const RABPrintableProposalView = lazy(() => import('@/components/billing/RABCalculatorModal').then(m => ({ default: m.RABPrintableProposalView })));

// Zod Schema Validation Guard (Pilar 25)
const rabSlotSchema = z.object({
  planId: z.string().min(1, 'ID item wajib diisi'),
  quantity: z.number().int().min(1, 'Jumlah minimal 1'),
});

interface RABSlotSelection {
  planId: string;
  quantity: number;
  customName?: string;
  customPrice?: number;
}

export const RABCalculatorPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'calculator' | 'specs'>('calculator');

  // React Query Fetching (Pilar 31)
  const { data: plans = [], isLoading } = useQuery<RABProductItem[]>({
    queryKey: ['public-plans-rab'],
    queryFn: async () => {
      const res = await getPublicPlans();
      const rawData = res?.data as { plans?: RABProductItem[] } | RABProductItem[];
      if (rawData && !Array.isArray(rawData) && rawData.plans) {
        return rawData.plans;
      } else if (Array.isArray(res?.data)) {
        return res.data as RABProductItem[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [hardwareSlots, setHardwareSlots] = useState<RABSlotSelection[]>([
    { planId: 'SERVER-DELL-R730', quantity: 1 },
    { planId: 'HW-FACE-320MFX', quantity: 2 },
    { planId: 'HW-OTG-DESKTOP', quantity: 1 }
  ]);

  const [softwareSlots, setSoftwareSlots] = useState<RABSlotSelection[]>([
    { planId: 'PLAN-PRO', quantity: 1 }
  ]);

  const handleApplyPreset = useCallback((presetType: 'mandiri' | 'maju' | 'enterprise') => {
    if (presetType === 'mandiri') {
      setHardwareSlots([]);
      setSoftwareSlots([{ planId: 'PLAN-BASIC', quantity: 1 }]);
      toast.success('Preset Paket Mandiri Cloud diterapkan!');
    } else if (presetType === 'maju') {
      setHardwareSlots([
        { planId: 'HW-FACE-320MFX', quantity: 2 },
        { planId: 'HW-OTG-DESKTOP', quantity: 1 }
      ]);
      setSoftwareSlots([{ planId: 'PLAN-PRO', quantity: 1 }]);
      toast.success('Preset Paket Sekolah Maju diterapkan!');
    } else {
      setHardwareSlots([
        { planId: 'SERVER-DELL-R730', quantity: 1 },
        { planId: 'HW-FACE-320MFX', quantity: 4 },
        { planId: 'HW-OTG-DESKTOP', quantity: 2 }
      ]);
      setSoftwareSlots([{ planId: 'PLAN-ENTERPRISE', quantity: 1 }]);
      toast.success('Preset Paket Enterprise Campus diterapkan!');
    }
  }, []);

  // Price calculations
  const hardwareTotal = useMemo(() => {
    return (hardwareSlots ?? []).reduce((sum, slot) => {
      const p = (plans ?? []).find(x => x.id === slot.planId);
      const unitPrice = slot.customPrice !== undefined ? slot.customPrice : (p?.price_monthly || p?.price || 0);
      return sum + (unitPrice * (slot.quantity || 1));
    }, 0);
  }, [hardwareSlots, plans]);

  const softwareTotal = useMemo(() => {
    return (softwareSlots ?? []).reduce((sum, slot) => {
      const p = (plans ?? []).find(x => x.id === slot.planId);
      const unitPrice = slot.customPrice !== undefined ? slot.customPrice : (p?.price_monthly || p?.price || 0);
      return sum + (unitPrice * (slot.quantity || 1));
    }, 0);
  }, [softwareSlots, plans]);

  const subtotal = hardwareTotal + softwareTotal;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const grandTotal = subtotal - discountAmount;

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Kalkulator RAB Anggaran' }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Kalkulator RAB Pengadaan & Proposal Anggaran"
        description="Simulasikan kebutuhan server lokal, mesin Face Recognition, kuota aplikasi, dan cetak lembar proposal resmi sekolah."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="billing_rab_calculator"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => navigate('/service-center?tab=catalog')}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Katalog Layanan
            </Button>
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Proposal RAB
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Kalkulator RAB",
          description: "Gunakan kalkulator ini untuk menyusun dokumen rancangan anggaran biaya pengadaan sistem Absenta.",
          items: [
            { text: "Pilih salah satu Paket Cepat atau sesuaikan perangkat hardware sesuai denah sekolah." },
            { text: "Tentukan jumlah lisensi software tahunan yang diinginkan." },
            { text: "Klik tombol Cetak Proposal RAB untuk mengunduh berkas penawaran resmi ber-KOP sekolah." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : (plans ?? []).length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Katalog Produk Kosong</h4>
              <p className="text-xs text-slate-400 mt-1">Belum ada paket produk atau hardware yang terdaftar.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <TabSwitcher
                tabs={[
                  { id: 'calculator', label: 'Simulasi Kalkulator RAB', icon: Calculator },
                  { id: 'specs', label: 'Spesifikasi Teknis Server', icon: Cpu }
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'calculator' | 'specs')}
              />

              {activeTab === 'specs' ? (
                <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <Suspense fallback={<div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
                    <RABServerSpecGuide />
                  </Suspense>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* Quick Presets */}
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-500" />
                      Pilihan Paket Rekomendasi Siap Pakai
                    </h3>
                    <Suspense fallback={<div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
                      <RABPresetCards onApplyPreset={handleApplyPreset} />
                    </Suspense>
                  </div>

                  {/* Main Interactive Matrix */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Form: Slots Config */}
                    <div className="lg:col-span-8 space-y-6">
                      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Alokasi Hardware & Mesin Presensi</h4>
                            <p className="text-xs text-slate-400">Pilih unit mesin terminal gerbang, server node, atau reader.</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHardwareSlots(prev => [...prev, { planId: (plans ?? [])[0]?.id || 'HW-1', quantity: 1 }])}
                            className="text-xs font-bold rounded-xl"
                          >
                            <Plus size={14} className="mr-1" /> Tambah Item
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {(hardwareSlots ?? [])?.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                              <div className="flex-1 min-w-0">
                                <SearchableSelect
                                  id={`hw-select-${idx}`}
                                  aria-label="Pilih Perangkat Hardware"
                                  value={slot.planId}
                                  onValueChange={(val) => {
                                    const parsed = rabSlotSchema.safeParse({ planId: val, quantity: slot.quantity });
                                    if (parsed.success) {
                                      setHardwareSlots(prev => prev?.map((item, i) => i === idx ? { ...item, planId: val } : item));
                                    }
                                  }}
                                  options={(plans ?? [])?.map(p => ({
                                    value: p.id,
                                    label: `${p.name} - ${formatCurrency(p.price_monthly || p.price || 0)}`
                                  }))}
                                  placeholder="Pilih Perangkat Hardware"
                                />
                              </div>
                              <div className="w-24 min-w-0">
                                <label htmlFor={`hw-qty-${idx}`} className="sr-only">Jumlah Unit</label>
                                <input
                                  id={`hw-qty-${idx}`}
                                  type="number"
                                  min="1"
                                  value={slot.quantity}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value, 10) || 1;
                                    const parsed = rabSlotSchema.safeParse({ planId: slot.planId, quantity: qty });
                                    if (parsed.success) {
                                      setHardwareSlots(prev => prev?.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
                                    }
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-center"
                                />
                              </div>
                              <button
                                type="button"
                                aria-label="Hapus item hardware"
                                onClick={() => setHardwareSlots(prev => prev.filter((_, i) => i !== idx))}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Right Summary Card */}
                    <div className="lg:col-span-4 sticky top-24 space-y-4">
                      <AnalyticsCard
                        title="Total Alokasi Investasi"
                        value={formatCurrency(grandTotal)}
                        icon={Calculator}
                        color="indigo"
                      />

                      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                          Estimasi Anggaran RAB
                        </h4>

                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between text-slate-500">
                            <span>Subtotal Hardware:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(hardwareTotal)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Subtotal Lisensi:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(softwareTotal)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Diskon Kemitraan:</span>
                            <span className="font-mono font-bold text-emerald-600">-{formatCurrency(discountAmount)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <Button
                            variant="primary"
                            size="lg"
                            onClick={() => setShowPrintModal(true)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold py-3 text-xs shadow-md"
                          >
                            <Printer size={16} />
                            Cetak Proposal Pengajuan
                          </Button>
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => navigate('/service-center?tab=catalog')}
                            className="w-full text-xs font-bold rounded-xl"
                          >
                            Beli Langsung di Katalog
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </AcademicPageLayout>

      {/* Printable Modal (Lazy) */}
      <Suspense fallback={null}>
        {showPrintModal && (
          <RABPrintableProposalView
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            hardwareSlots={hardwareSlots}
            softwareSlots={softwareSlots}
            plans={plans}
            discountPercent={discountPercent}
            grandTotal={grandTotal}
          />
        )}
      </Suspense>
    </InfraErrorBoundary>
  );
});

export default RABCalculatorPage;
