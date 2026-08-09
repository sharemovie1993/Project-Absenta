import React from 'react';
import { Shield } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { StrukturPermissionMatrix } from '@/components/academic/struktur/StrukturPermissionMatrix';
import type { PermissionCatalogItem } from '@/api/user.api';
import { useCapabilities } from '@/hooks/useCapabilities';

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
  const { isAdmin, can } = useCapabilities();
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
          canDistribute={isAdmin || can('academic.structure.manage')}
        />
      </div>
    </SectionCard>
  );
});
