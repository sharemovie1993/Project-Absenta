import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label, Button } from '@/components/ui';
import type { SystemConfigPayload } from '@/services/systemConfig';
import axiosInstance from '@/lib/axiosInstance';
import { Upload, Loader2, Shuffle, Check, Palette } from 'lucide-react';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BrandingSettingsFormProps {
  config: SystemConfigPayload;
  onChange: (field: keyof SystemConfigPayload, value: string | number | boolean) => void;
  canEdit: boolean;
}

/* ─────────────────────────────────────────────
   12 Curated Color Presets
───────────────────────────────────────────── */
interface ColorPreset {
  id: string;
  name: string;
  emoji: string;
  primary: string;
  secondary: string;
  accent: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { id: 'royal-blue',    name: 'Royal Blue',    emoji: '🔵', primary: '#2563EB', secondary: '#1d4ed8', accent: '#3b82f6' },
  { id: 'deep-purple',   name: 'Deep Purple',   emoji: '🟣', primary: '#7c3aed', secondary: '#6d28d9', accent: '#a855f7' },
  { id: 'rose-red',      name: 'Rose Red',      emoji: '🩷', primary: '#e11d48', secondary: '#be123c', accent: '#f43f5e' },
  { id: 'emerald',       name: 'Emerald Green', emoji: '🟢', primary: '#059669', secondary: '#047857', accent: '#10b981' },
  { id: 'teal-ocean',    name: 'Teal Ocean',    emoji: '🩵', primary: '#0891b2', secondary: '#0e7490', accent: '#22d3ee' },
  { id: 'amber-gold',    name: 'Amber Gold',    emoji: '🟠', primary: '#d97706', secondary: '#b45309', accent: '#f59e0b' },
  { id: 'pink-coral',    name: 'Pink Coral',    emoji: '🌸', primary: '#db2777', secondary: '#be185d', accent: '#ec4899' },
  { id: 'forest-green',  name: 'Forest Green',  emoji: '🌿', primary: '#16a34a', secondary: '#15803d', accent: '#22c55e' },
  { id: 'navy-slate',    name: 'Navy Slate',    emoji: '🌊', primary: '#334155', secondary: '#1e293b', accent: '#64748b' },
  { id: 'crimson',       name: 'Crimson',       emoji: '🔴', primary: '#dc2626', secondary: '#b91c1c', accent: '#ef4444' },
  { id: 'sunshine',      name: 'Sunshine',      emoji: '🟡', primary: '#ca8a04', secondary: '#a16207', accent: '#eab308' },
  { id: 'ice-cyan',      name: 'Ice Cyan',      emoji: '🧊', primary: '#0284c7', secondary: '#0369a1', accent: '#38bdf8' },
];

function getActivePresetId(config: SystemConfigPayload): string | null {
  return COLOR_PRESETS.find(
    (p) =>
      p.primary.toLowerCase() === (config.primary_color || '').toLowerCase() &&
      p.secondary.toLowerCase() === (config.secondary_color || '').toLowerCase() &&
      p.accent.toLowerCase() === (config.accent_color || '').toLowerCase()
  )?.id ?? null;
}

export const BrandingSettingsForm: React.FC<BrandingSettingsFormProps> = ({ config, onChange, canEdit }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [faviconPreviewError, setFaviconPreviewError] = useState(false);
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  const activePresetId = getActivePresetId(config);

  const applyPreset = (preset: ColorPreset) => {
    if (!canEdit) return;
    onChange('primary_color', preset.primary);
    onChange('secondary_color', preset.secondary);
    onChange('accent_color', preset.accent);
  };

  const applyRandomPreset = () => {
    if (!canEdit) return;
    const pool = COLOR_PRESETS.filter((p) => p.id !== activePresetId);
    const random = pool[Math.floor(Math.random() * pool.length)];
    applyPreset(random);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    setLogoPreviewError(false);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) onChange('logo_url', fileUrl);
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
    setFaviconPreviewError(false);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) onChange('favicon_url', fileUrl);
    } catch (err) {
      console.error('Failed to upload favicon:', err);
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const resolvedLogo = config.logo_url ? resolveProfilePhotoUrl(config.logo_url) : '';
  const resolvedFavicon = config.favicon_url ? resolveProfilePhotoUrl(config.favicon_url) : '';

  /* Preview colors: hovered preset > active config */
  const previewPrimary   = hoveredPreset
    ? (COLOR_PRESETS.find(p => p.id === hoveredPreset)?.primary ?? config.primary_color ?? '#2563eb')
    : (config.primary_color ?? '#2563eb');
  const previewSecondary = hoveredPreset
    ? (COLOR_PRESETS.find(p => p.id === hoveredPreset)?.secondary ?? config.secondary_color ?? '#1d4ed8')
    : (config.secondary_color ?? '#1d4ed8');
  const previewAccent    = hoveredPreset
    ? (COLOR_PRESETS.find(p => p.id === hoveredPreset)?.accent ?? config.accent_color ?? '#3b82f6')
    : (config.accent_color ?? '#3b82f6');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding &amp; Tampilan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Tagline & Description ────────────────────────── */}
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

        {/* ── Color Preset Section ─────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-slate-500" />
              <Label className="mb-0 text-sm font-bold text-slate-700 dark:text-slate-200">
                Preset Tema Warna
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyRandomPreset}
              disabled={!canEdit}
              className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 border-dashed hover:border-solid transition-all"
            >
              <Shuffle size={13} />
              Acak Tema
            </Button>
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {COLOR_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => applyPreset(preset)}
                  onMouseEnter={() => setHoveredPreset(preset.id)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  title={preset.name}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-[10px] font-bold transition-all duration-150 cursor-pointer select-none',
                    isActive
                      ? 'border-slate-800 dark:border-white shadow-md scale-105'
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm',
                    !canEdit && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{ background: isActive ? preset.primary + '15' : undefined }}
                >
                  {/* Color Swatches */}
                  <div className="flex gap-0.5">
                    <span
                      className="w-5 h-5 rounded-l-full border border-white/30 shadow-sm"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="w-5 h-5 border-y border-white/30 shadow-sm"
                      style={{ backgroundColor: preset.secondary }}
                    />
                    <span
                      className="w-5 h-5 rounded-r-full border border-white/30 shadow-sm"
                      style={{ backgroundColor: preset.accent }}
                    />
                  </div>
                  {/* Label */}
                  <span className="text-slate-600 dark:text-slate-400 leading-tight text-center">
                    {preset.emoji} {preset.name}
                  </span>
                  {/* Active check */}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 dark:bg-white flex items-center justify-center shadow">
                      <Check size={9} className="text-white dark:text-slate-900" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live Preview Banner */}
          <div
            className="rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm transition-all duration-300 overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})` }}
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: previewAccent }} />
            <div className="relative z-10 space-y-0.5">
              <p className="text-xs font-black text-white/90 uppercase tracking-wider">Pratinjau Tema</p>
              <p className="text-[10px] text-white/70 font-medium">{config.app_name || 'Absenta — Sistem Presensi Sekolah'}</p>
            </div>
            <div className="relative z-10 flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-black border border-white/30"
                style={{ backgroundColor: previewAccent + '33', color: '#fff' }}
              >
                Aktif
              </span>
              <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black"
                style={{ backgroundColor: previewAccent, color: '#fff' }}>
                AB
              </span>
            </div>
          </div>
        </div>

        {/* ── Manual Color Pickers ─────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Kustomisasi Warna Manual</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="primary_color">Warna Utama (Primary)</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  className="w-12 p-1 h-10"
                  value={config.primary_color || '#2563eb'}
                  onChange={(e) => onChange('primary_color', e.target.value)}
                  disabled={!canEdit}
                />
                <Input
                  value={config.primary_color || '#2563eb'}
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
                  value={config.secondary_color || '#1d4ed8'}
                  onChange={(e) => onChange('secondary_color', e.target.value)}
                  disabled={!canEdit}
                />
                <Input
                  value={config.secondary_color || '#1d4ed8'}
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
                  value={config.accent_color || '#3b82f6'}
                  onChange={(e) => onChange('accent_color', e.target.value)}
                  disabled={!canEdit}
                />
                <Input
                  value={config.accent_color || '#3b82f6'}
                  onChange={(e) => onChange('accent_color', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Logo & Favicon ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="logo_url">URL Logo Aplikasi</Label>
            <div className="flex gap-2">
              <Input
                id="logo_url"
                value={config.logo_url || ''}
                onChange={(e) => {
                  setLogoPreviewError(false);
                  onChange('logo_url', e.target.value);
                }}
                placeholder="https://... atau /uploads/..."
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
                {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Unggah
              </Button>
            </div>
            <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {resolvedLogo && !logoPreviewError ? (
                  <img
                    src={resolvedLogo}
                    alt="Preview Logo"
                    className="w-full h-full object-contain p-1"
                    onError={() => setLogoPreviewError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-black text-xs"
                    style={{ background: `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})` }}
                  >
                    AB
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Pratinjau Logo Utama</p>
                <p className="text-[10px] text-slate-500">Logo ini akan tampil di Topbar, Sidebar, dan Halaman Login.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="favicon_url">URL Favicon</Label>
            <div className="flex gap-2">
              <Input
                id="favicon_url"
                value={config.favicon_url || ''}
                onChange={(e) => {
                  setFaviconPreviewError(false);
                  onChange('favicon_url', e.target.value);
                }}
                placeholder="https://... atau /uploads/..."
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
                {isUploadingFavicon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Unggah
              </Button>
            </div>
            <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {resolvedFavicon && !faviconPreviewError ? (
                  <img
                    src={resolvedFavicon}
                    alt="Preview Favicon"
                    className="w-full h-full object-contain p-1"
                    onError={() => setFaviconPreviewError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-black text-xs"
                    style={{ background: `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})` }}
                  >
                    AB
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Pratinjau Favicon</p>
                <p className="text-[10px] text-slate-500">Ikon kecil yang tampil pada tab browser.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer & Support ─────────────────────────────── */}
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
