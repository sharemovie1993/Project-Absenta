import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface AttendanceSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const AttendanceSettingsForm: React.FC<AttendanceSettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Absensi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 max-w-xs">
          <Label>Batas Toleransi Keterlambatan (Menit)</Label>
          <Input
            type="number"
            value={config.default_late_threshold || 15}
            onChange={(e) => onChange('default_late_threshold', e.target.value)}
            disabled={!canEdit}
          />
          <p className="text-xs text-gray-500">Default untuk semua jadwal jika tidak diset spesifik</p>
        </div>
        <div className="grid gap-2 max-w-xs">
          <Label>Batas Toleransi Pulang Cepat (Menit)</Label>
          <Input
            type="number"
            value={config.default_notap_threshold || 0}
            onChange={(e) => onChange('default_notap_threshold', e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
};
