import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { Button } from '@/components/ui';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { UnifiedCatalog } from '@/components/billing/UnifiedCatalog';
import { useQuery } from '@tanstack/react-query';
import { getMySubscription } from '@/api/mySubscription.api';

export const CatalogPage: React.FC = React.memo(() => {
  const navigate = useNavigate();

  const subQuery = useQuery({
    queryKey: ['my-subscription-details'],
    queryFn: async () => {
      const res = await getMySubscription();
      return res.data;
    },
    staleTime: 60 * 1000
  });

  const activeAcademicTier = subQuery.data?.active_academic_tier || 'CORE_PLATFORM';
  const services = useMemo(() => {
    const raw = subQuery.data?.services || subQuery.data?.all_subscriptions || [];
    return Array.isArray(raw) ? raw : [];
  }, [subQuery.data]);

  const instructionData = useMemo(() => ({
    title: "Panduan Katalog & Pengadaan Layanan",
    description: "Halaman ini menyediakan etalase seluruh modul resmi platform Absenta, perangkat keras, dan simulasi penganggaran Dana BOS.",
    items: [
      { text: "Pilih modul atau hardware untuk melihat spesifikasi detail dan varian kapasitas siswa." },
      { text: "Gunakan tombol 'Simulasi RAB BOS' untuk merancang usulan belanja sesuai rekening ARKAS Kemendikbud." },
      { text: "Masukkan modul ke Keranjang Belanja untuk pengadaan multi-item sekaligus." }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Katalog &amp; Pengadaan Sekolah"
        description="Jelajahi seluruh modul berlisensi resmi, perangkat keras, dan rancang simulasi anggaran BOS ARKAS secara mandiri."
        instruction={instructionData}
        breadcrumbs={[{ label: 'Katalog Layanan' }]}
        hardeningModuleKey="catalogpage"
        toolbar={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/service-center')}
            className="rounded-xl border-slate-200 dark:border-slate-800 h-9 px-3 font-bold text-xs flex items-center gap-1.5"
          >
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>Status Langganan Aktif</span>
          </Button>
        }
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="w-full min-w-0 max-w-full">
            <UnifiedCatalog
              mode="private"
              activeAcademicTier={activeAcademicTier}
              ownedServices={services}
            />
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default CatalogPage;
