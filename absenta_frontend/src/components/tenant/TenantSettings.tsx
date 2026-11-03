import React from 'react';
import { TenantSettingsView, type UniversalTenantSettingsViewProps } from './TenantSettingsView';

export { TenantSettingsView, type UniversalTenantSettingsViewProps };

/**
 * TenantSettings - Wrapper komponen untuk kompatibilitas ke belakang (Backward Compatibility).
 * Seluruh logika inti telah dimigrasikan ke TenantSettingsView sesuai standar
 * Universal Role-Ready View (DRY).
 */
export const TenantSettings: React.FC<UniversalTenantSettingsViewProps> = (props) => {
  return <TenantSettingsView {...props} />;
};

export default TenantSettings;
