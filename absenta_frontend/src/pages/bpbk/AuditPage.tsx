import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../hooks/useCapabilities';
import { SectionCard } from '@/components/ui';

const AuditSection = lazy(() => import('./components/AuditSection').then(m => ({ default: m.AuditSection })));

export default React.memo(function AuditPage() {
  const { isBpbk, isAdmin, can } = useCapabilities();
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Log Audit & Aktivitas BK"
      description="Pantau log audit keamanan, riwayat perubahan data konseling, dan aktivitas sensitif yang dilakukan oleh tim konselor secara real-time."
    >
      <AcademicPageLayout
        title="Log Audit & Riwayat Aktivitas BK"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Log Audit BK', path: '/bpbk/audit' }
        ]}
        hardeningModuleKey="bpbk_audit"
        instruction={{
          title: "Panduan Log Audit BK",
          description: "Halaman ini melacak semua perubahan data sensitif konseling dan kasus yang dilakukan oleh tim konselor.",
          items: [
            { text: "Log audit merekam tanggal, aktor, dan jenis perubahan data secara real-time." },
            { text: "Gunakan kolom pencarian untuk menemukan aksi audit berdasarkan aktor atau kategori kasus." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
            <AuditSection />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
