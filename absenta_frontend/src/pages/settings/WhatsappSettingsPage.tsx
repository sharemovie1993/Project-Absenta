/**
 * WhatsappSettingsPage.tsx
 * Standalone Page Wrapper untuk WhatsApp Gateway Settings.
 * Mematuhi Universal Role-Ready View (DRY) Pattern.
 *
 * Logika bisnis inti dan antarmuka dipindahkan ke `WhatsappSettingsView.tsx`
 * sehingga dapat digunakan kembali secara konsisten baik sebagai:
 * 1. Halaman Penuh Standalone (/settings/whatsapp)
 * 2. Tab Submodul Dashboard Admin (/dashboard?tab=admin&subtab=wa_gateway)
 * 3. Quick-Access Modal Dialog
 */

import React from 'react';
import { WhatsappSettingsView } from '@/components/whatsapp/WhatsappSettingsView';

const WhatsappSettingsPage: React.FC = () => {
  return <WhatsappSettingsView hideLayout={false} />;
};

export default WhatsappSettingsPage;
