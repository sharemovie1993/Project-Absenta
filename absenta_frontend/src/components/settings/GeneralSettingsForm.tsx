import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label, SearchableSelect } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface GeneralSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const GeneralSettingsForm: React.FC<GeneralSettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Umum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="app_name">Nama Aplikasi</Label>
          <Input
            id="app_name"
            value={config.app_name || ''}
            onChange={(e) => onChange('app_name', e.target.value)}
            placeholder="Contoh: Sistem Informasi Sekolah"
            disabled={!canEdit}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="default_language">Bahasa Default</Label>
            <SearchableSelect
              value={config.default_language || 'id'}
              onValueChange={(val: string) => onChange('default_language', val)}
              options={[
                { value: 'id', label: 'Indonesia' },
                { value: 'en', label: 'English' }
              ]}
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timezone">Zona Waktu</Label>
            <SearchableSelect
              value={config.timezone || 'Asia/Jakarta'}
              onValueChange={(val: string) => onChange('timezone', val)}
              options={[
                { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
                { value: 'Asia/Makassar', label: 'WITA (Makassar)' },
                { value: 'Asia/Jayapura', label: 'WIT (Jayapura)' }
              ]}
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date_format">Format Tanggal</Label>
          <SearchableSelect
            value={config.date_format || 'DD/MM/YYYY'}
            onValueChange={(val: string) => onChange('date_format', val)}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2023)' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2023)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2023-12-31)' }
            ]}
            disabled={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
};
