/**
 * PlatformComplianceFollowUpPage.tsx
 * Standalone Page Wrapper untuk Pusat Evaluasi Kepatuhan & Kelengkapan Data.
 * Mematuhi Universal Role-Ready View (DRY) Pattern.
 *
 * Seluruh logika bisnis inti, query data, dan antarmuka dipindahkan ke `PlatformComplianceView.tsx`
 * sehingga dapat digunakan kembali secara konsisten baik sebagai:
 * 1. Halaman Penuh Standalone (/management/platform-compliance)
 * 2. Tab Submodul Dashboard Admin (/dashboard?tab=admin&subtab=kepatuhan)
 * 3. Quick-Access Modal Dialog
 */

import React from 'react';
import {
  PlatformComplianceView,
  type UniversalPlatformComplianceViewProps,
  type TeacherComplianceItem,
  type StudentComplianceItem,
} from '@/components/management/compliance/PlatformComplianceView';

export type { TeacherComplianceItem, StudentComplianceItem };

export interface PlatformComplianceFollowUpPageProps extends UniversalPlatformComplianceViewProps {}

export const PlatformComplianceFollowUpPage: React.FC<PlatformComplianceFollowUpPageProps> = (props) => {
  return <PlatformComplianceView hideLayout={false} {...props} />;
};

export default PlatformComplianceFollowUpPage;
