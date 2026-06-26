import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';

interface BrandingSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const BrandingSettingsForm: React.FC<BrandingSettingsFormProps> = ({ config, onChange, canEdit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding & Tampilan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={config.tagline || ''}
            onChange={(e) => onChange('tagline', e.target.value)}
            placeholder="Mencerdaskan Kehidupan Bangsa"
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Deskripsi Singkat</Label>
          <Input
            id="description"
            value={config.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Platform manajemen sekolah terintegrasi..."
            disabled={!canEdit}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="primary_color">Warna Utama (Primary)</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                className="w-12 p-1 h-10"
                value={config.primary_color || '#3b82f6'}
                onChange={(e) => onChange('primary_color', e.target.value)}
                disabled={!canEdit}
              />
              <Input
                value={config.primary_color || '#3b82f6'}
                onChange={(e) => onChange('primary_color', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="secondary_color">Warna Sekunder</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                className="w-12 p-1 h-10"
                value={config.secondary_color || '#64748b'}
                onChange={(e) => onChange('secondary_color', e.target.value)}
                disabled={!canEdit}
              />
              <Input
                value={config.secondary_color || '#64748b'}
                onChange={(e) => onChange('secondary_color', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accent_color">Warna Aksen</Label>
            <div className="flex gap-2">
              <Input
                id="accent_color"
                type="color"
                className="w-12 p-1 h-10"
                value={config.accent_color || '#f59e0b'}
                onChange={(e) => onChange('accent_color', e.target.value)}
                disabled={!canEdit}
              />
              <Input
                value={config.accent_color || '#f59e0b'}
                onChange={(e) => onChange('accent_color', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="logo_url">URL Logo</Label>
            <Input
              id="logo_url"
              value={config.logo_url || ''}
              onChange={(e) => onChange('logo_url', e.target.value)}
              placeholder="https://..."
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="favicon_url">URL Favicon</Label>
            <Input
              id="favicon_url"
              value={config.favicon_url || ''}
              onChange={(e) => onChange('favicon_url', e.target.value)}
              placeholder="https://..."
              disabled={!canEdit}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="footer_text">Teks Footer</Label>
          <Input
            id="footer_text"
            value={config.footer_text || ''}
            onChange={(e) => onChange('footer_text', e.target.value)}
            placeholder="© 2024 Sekolah Maju Jaya. All rights reserved."
            disabled={!canEdit}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="support_email">Email Support</Label>
            <Input
              id="support_email"
              value={config.support_email || ''}
              onChange={(e) => onChange('support_email', e.target.value)}
              placeholder="support@sekolah.id"
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="support_phone">Telepon Support</Label>
            <Input
              id="support_phone"
              value={config.support_phone || ''}
              onChange={(e) => onChange('support_phone', e.target.value)}
              placeholder="+62..."
              disabled={!canEdit}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
