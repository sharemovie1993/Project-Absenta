import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Label, Switch } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface ParentAppSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const ParentAppSettingsForm: React.FC<ParentAppSettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfigurasi Aplikasi Orang Tua</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Aktifkan Parent App</Label>
            <p className="text-sm text-gray-500">Izinkan orang tua login dan mengakses data siswa</p>
          </div>
          <Switch
            checked={config.parent_app_enabled ?? false}
            onCheckedChange={(checked) => onChange('parent_app_enabled', checked)}
            disabled={!canEdit}
          />
        </div>

        {config.parent_app_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Dashboard</Label>
              <Switch
                checked={config.parent_app_dashboard_enabled ?? false}
                onCheckedChange={(checked) => onChange('parent_app_dashboard_enabled', checked)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Riwayat Absensi</Label>
              <Switch
                checked={config.parent_app_attendance_history_enabled ?? false}
                onCheckedChange={(checked) => onChange('parent_app_attendance_history_enabled', checked)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Notifikasi Realtime</Label>
              <Switch
                checked={config.parent_app_notifications_enabled ?? false}
                onCheckedChange={(checked) => onChange('parent_app_notifications_enabled', checked)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Rekap Bulanan</Label>
              <Switch
                checked={config.parent_app_monthly_recap_enabled ?? false}
                onCheckedChange={(checked) => onChange('parent_app_monthly_recap_enabled', checked)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Tracking Harian</Label>
              <Switch
                checked={config.parent_app_daily_tracking_enabled ?? false}
                onCheckedChange={(checked) => onChange('parent_app_daily_tracking_enabled', checked)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Lapor Ketidakhadiran</Label>
              <Switch
                checked={config.parent_app_report_absence_enabled ?? false}
                onCheckedChange={(checked) => onChange('parent_app_report_absence_enabled', checked)}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
