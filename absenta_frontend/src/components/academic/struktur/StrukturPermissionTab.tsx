import React from 'react';
import { Shield } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { StrukturPermissionMatrix } from '@/components/academic/struktur/StrukturPermissionMatrix';
import type { PermissionCatalogItem } from '@/api/user.api';

interface StrukturPermissionTabProps {
  structures: any[];
  permissionCatalog: PermissionCatalogItem[];
  searchQuery: string;
  onUpdatePermissions: (strukturId: string, newPermissions: string[]) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  user: any;
}

export const StrukturPermissionTab: React.FC<StrukturPermissionTabProps> = React.memo(({
  structures,
  permissionCatalog,
  searchQuery,
  onUpdatePermissions,
  onSave,
  isSaving,
  hasUnsavedChanges,
  user
}) => {
  return (
    <SectionCard noPadding fullWidth title="Matriks Izin Akses Jabatan" icon={Shield}>
      <div className="p-4 md:p-8">
        <StrukturPermissionMatrix 
          structures={structures}
          permissionCatalog={permissionCatalog}
          searchQuery={searchQuery}
          onUpdatePermissions={onUpdatePermissions}
          onSave={onSave}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          canDistribute={['SUPERADMIN', 'ADMIN'].includes(String((user as any)?.role?.name || (user as any)?.role || '')) || (user as any)?.capabilities?.includes('academic.structures.manage')}
        />
      </div>
    </SectionCard>
  );
});
