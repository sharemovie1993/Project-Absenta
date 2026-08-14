import React from 'react';
import { UniversalKbmCard } from '../../dashboard/shared/kbm/UniversalKbmCard';
import type { Badge } from '../../ui';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

type Props = {
  sesi: any;
  isExpanded: boolean;
  counts: Record<string, number>;
  guruStatusText?: string;
  guruStatusVariant?: BadgeVariant;
  canFinish?: boolean;
  onToggleExpand: () => void;
  onFinish?: () => void;
  onDelete?: () => void;
  onScan?: () => void;
  isGuru?: boolean;
  jenisBadgeVariant?: BadgeVariant;
  Icon?: React.ComponentType<any>;
  iconClass?: string;
  mapelLabel?: (id?: string) => string;
  guruLabel?: (id?: string) => string;
  waktuMulaiText?: string;
  waktuSelesaiText?: string;
  showScanGuru?: boolean;
  showScanSiswa?: boolean;
  canManage?: boolean;
  onOpenJournal?: () => void;
  onOpenPhotoModal?: (item: any) => void;
  onViewPhoto?: (item: any) => void;
  hideKelas?: boolean;
};

export const SesiCard = React.memo(function SesiCard({
  sesi,
  isExpanded,
  counts,
  canFinish = true,
  onToggleExpand,
  onFinish,
  onDelete,
  onScan,
  onOpenPhotoModal,
  onViewPhoto,
  canManage = true,
  hideKelas = false,
}: Props) {
  // Enrich sesi with counts if provided
  const enrichedItem = {
    ...sesi,
    counts: counts || sesi.counts || sesi.summary || sesi._summary,
  };

  return (
    <UniversalKbmCard
      mode="PETUGAS"
      item={enrichedItem}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onOpenScanModal={onScan}
      onOpenPhotoModal={onOpenPhotoModal}
      onViewPhoto={onViewPhoto}
      onFinish={onFinish}
      onDelete={onDelete}
      canManage={canManage}
      canFinish={canFinish}
      hideKelas={hideKelas}
    />
  );
});
