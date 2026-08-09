import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { AuditSection } from './components/AuditSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

export default React.memo(function AuditPage() {
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
        <div className="w-full min-w-0">
          <AuditSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
