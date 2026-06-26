import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label, Switch } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface SecuritySettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const SecuritySettingsForm: React.FC<SecuritySettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keamanan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 max-w-xs">
          <Label>Session Timeout (Menit)</Label>
          <Input
            type="number"
            value={config.session_timeout_minutes || 30}
            onChange={(e) => onChange('session_timeout_minutes', e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Two-Factor Authentication (2FA)</Label>
            <p className="text-sm text-gray-500">Wajibkan 2FA untuk semua user Admin</p>
          </div>
          <Switch
            checked={config.two_factor_enabled ?? false}
            onCheckedChange={(checked) => onChange('two_factor_enabled', checked)}
            disabled={!canEdit}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Monitoring Percobaan Login</Label>
            <p className="text-sm text-gray-500">Catat dan blokir IP jika terlalu banyak gagal login</p>
          </div>
          <Switch
            checked={config.login_attempt_monitoring ?? false}
            onCheckedChange={(checked) => onChange('login_attempt_monitoring', checked)}
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-2 max-w-xs">
          <Label>Rate Limit API (Request/Menit)</Label>
          <Input
            type="number"
            value={config.api_rate_limit_per_minute || 100}
            onChange={(e) => onChange('api_rate_limit_per_minute', e.target.value)}
            disabled={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
};
