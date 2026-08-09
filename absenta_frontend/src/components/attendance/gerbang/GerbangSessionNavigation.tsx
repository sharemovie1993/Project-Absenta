import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../ui';

export interface GerbangSessionNavigationProps {
  show: boolean;
  canCreate: boolean;
  modeLabel: string;
  onOpenSessionPage: () => void;
  onOpenSessionsList: () => void;
  onOpenCreateSession: () => void;
  createDisabledReason?: string;
}

export const GerbangSessionNavigation = React.memo(function GerbangSessionNavigation({
  show,
  canCreate,
  modeLabel,
  onOpenSessionPage,
  onOpenSessionsList,
  onOpenCreateSession,
  createDisabledReason,
}: GerbangSessionNavigationProps) {
  const sesiDisabled = !show;
  const sesiTitle = sesiDisabled ? 'Mode SIMPLE tidak mendukung sesi' : undefined;
  const createDisabled = !canCreate;
  const createTitle = createDisabled ? (createDisabledReason || 'Anda tidak aktif sebagai Petugas Absensi') : undefined;

  return (
    <Card className="mt-3 dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="dark:text-white">Navigasi Sesi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            title={sesiTitle}
            onClick={onOpenSessionPage}
            disabled={sesiDisabled}
          >
            Halaman Sesi
          </Button>
          {show && (
            <Button size="sm" variant="outline" onClick={onOpenSessionsList}>Daftar Sesi</Button>
          )}
          {show && (
            <Button
              size="sm"
              onClick={onOpenCreateSession}
              disabled={createDisabled}
              title={createTitle}
            >
              Buat Sesi
            </Button>
          )}
        </div>
        <div className="text-xs text-gray-600 mt-2 dark:text-gray-400">Mode: {modeLabel}</div>
      </CardContent>
    </Card>
  );
});
