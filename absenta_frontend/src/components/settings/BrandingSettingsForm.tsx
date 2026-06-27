import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label, Button } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';
import axiosInstance from '@/lib/axiosInstance';
import { Upload, Loader2 } from 'lucide-react';

interface BrandingSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

export const BrandingSettingsForm: React.FC<BrandingSettingsFormProps> = ({ config, onChange, canEdit }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        onChange('logo_url', fileUrl);
      }
    } catch (err) {
      console.error('Failed to upload logo:', err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUploadFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFavicon(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        onChange('favicon_url', fileUrl);
      }
    } catch (err) {
      console.error('Failed to upload favicon:', err);
    } finally {
      setIsUploadingFavicon(false);
    }
  };

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
            <div className="flex gap-2">
              <Input
                id="logo_url"
                value={config.logo_url || ''}
                onChange={(e) => onChange('logo_url', e.target.value)}
                placeholder="https://..."
                disabled={!canEdit}
                className="flex-1"
              />
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleUploadLogo}
                accept="image/*"
                className="hidden"
                disabled={!canEdit}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={!canEdit || isUploadingLogo}
                className="shrink-0 flex items-center gap-1.5"
              >
                {isUploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Unggah
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="favicon_url">URL Favicon</Label>
            <div className="flex gap-2">
              <Input
                id="favicon_url"
                value={config.favicon_url || ''}
                onChange={(e) => onChange('favicon_url', e.target.value)}
                placeholder="https://..."
                disabled={!canEdit}
                className="flex-1"
              />
              <input
                type="file"
                ref={faviconInputRef}
                onChange={handleUploadFavicon}
                accept="image/*"
                className="hidden"
                disabled={!canEdit}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => faviconInputRef.current?.click()}
                disabled={!canEdit || isUploadingFavicon}
                className="shrink-0 flex items-center gap-1.5"
              >
                {isUploadingFavicon ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Unggah
              </Button>
            </div>
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
