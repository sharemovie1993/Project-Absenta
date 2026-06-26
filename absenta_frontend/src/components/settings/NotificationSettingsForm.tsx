import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Label, Switch } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface NotificationSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifikasi System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Email Pembayaran Baru</Label>
            <p className="text-sm text-gray-500">Kirim email ke admin saat ada pembayaran masuk</p>
          </div>
          <Switch
            checked={config.notif_email_new_payment ?? false}
            onCheckedChange={(checked) => onChange('notif_email_new_payment', checked)}
            disabled={!canEdit}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Email Pembayaran Gagal</Label>
            <p className="text-sm text-gray-500">Kirim email ke user saat pembayaran gagal</p>
          </div>
          <Switch
            checked={config.notif_email_payment_failed ?? false}
            onCheckedChange={(checked) => onChange('notif_email_payment_failed', checked)}
            disabled={!canEdit}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Email Ringkasan Bulanan</Label>
            <p className="text-sm text-gray-500">Kirim laporan ringkasan otomatis setiap awal bulan</p>
          </div>
          <Switch
            checked={config.notif_email_monthly_summary ?? false}
            onCheckedChange={(checked) => onChange('notif_email_monthly_summary', checked)}
            disabled={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
};
