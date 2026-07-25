import React, { Suspense } from 'react';
import { 
  Button, 
  Label, 
  Input, 
  Switch,
  Checkbox
} from '@/components/ui';
import { 
  Sparkles, 
  RotateCcw 
} from 'lucide-react';
import { SettingsGroup } from '@/components/academic/student-card/SettingsGroup';
import { FontSizeInput } from '@/components/academic/student-card/FontSizeInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { StudentCardConfig } from '@/components/academic/student-card/types';
import { CARD_PRESETS } from './cardPresets';
import { SchoolIdentitySettings } from './SchoolIdentitySettings';


interface FrontSettingsPanelProps {
  config: StudentCardConfig;
  setConfig: React.Dispatch<React.SetStateAction<StudentCardConfig>>;
  sekolah: any;
  cardTargetMode: 'SISWA' | 'GURU';
  applyPreset: (presetName: string) => void;
  handleRandomStyle: () => void;
  setPreviewSide: (side: 'front' | 'back') => void;
}

export const FrontSettingsPanel: React.FC<FrontSettingsPanelProps> = ({
  config,
  setConfig,
  applyPreset,
  handleRandomStyle,
  setPreviewSide,
  cardTargetMode
}) => {
  const activePresetName = config.selected_preset || 'Vertical - Versi 1';

  const presetOptions = (CARD_PRESETS ?? [])?.map(p => ({
    value: p.name || '',
    label: `${(p.template || 'horizontal') === 'horizontal' ? 'Lanskap' : 'Potret'}: ${p.name || ''}`
  })) ?? [];

  return (
    <div className="space-y-4" onFocusCapture={() => setPreviewSide('front')}>
      <SettingsGroup title="Pustaka Preset Kartu" defaultOpen={true}>
        <div className="space-y-3">
          <Label htmlFor="preset-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pilih Preset Template:</Label>
          <div className="relative">
            <Suspense fallback={<div className="h-11 w-full bg-slate-50 dark:bg-slate-900 rounded-xl animate-pulse" />}>
              <SearchableSelect
                id="preset-select"
                value={activePresetName}
                onValueChange={(v) => applyPreset(v)}
                options={presetOptions}
                placeholder="Pilih Preset Desain..."
                triggerClassName="w-full h-11 rounded-xl font-semibold"
              />
            </Suspense>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRandomStyle}
            className="w-full flex items-center justify-center gap-2 border-dashed border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl mt-2"
          >
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            Acak Warna & Gaya Desain
          </Button>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Template & Warna" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Layout Template</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={config.template === 'horizontal' ? 'primary' : 'outline'}
                onClick={() => setConfig({ ...config, template: 'horizontal' })}
                className={`h-10 text-xs font-bold rounded-xl ${config.template === 'horizontal' ? 'bg-blue-600 text-white' : 'dark:border-slate-800'}`}
              >
                Horizontal
              </Button>
              <Button
                variant={config.template === 'vertical' ? 'primary' : 'outline'}
                onClick={() => setConfig({ ...config, template: 'vertical' })}
                className={`h-10 text-xs font-bold rounded-xl ${config.template === 'vertical' ? 'bg-blue-600 text-white' : 'dark:border-slate-800'}`}
              >
                Vertical
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Warna Utama</Label>
              <div className="flex gap-1.5 items-center">
                <Input
                  type="color"
                  value={config.primary_color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, primary_color: e.target.value })}
                  className="w-8 h-8 p-1 rounded-lg border-slate-200 dark:border-slate-800 cursor-pointer"
                />
                <Input
                  value={config.primary_color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, primary_color: e.target.value })}
                  className="h-8 text-[10px] font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-2 flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Warna Header</Label>
              <div className="flex gap-1.5 items-center">
                <Input
                  type="color"
                  value={config.header_bg_color || config.primary_color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_bg_color: e.target.value })}
                  className="w-8 h-8 p-1 rounded-lg border-slate-200 dark:border-slate-800 cursor-pointer"
                />
                <Input
                  value={config.header_bg_color || config.primary_color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_bg_color: e.target.value })}
                  className="h-8 text-[10px] font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-2 flex-1"
                />
              </div>
            </div>
          </div>

          {/* Header Style */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Gaya Header</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {( [
                { id: 'solid',       label: 'Solid',       icon: '▬' },
                { id: 'gradient',    label: 'Gradasi',     icon: '◐' },
                { id: 'wave',        label: 'Lengkung',    icon: '⌒' },
                { id: 'slanted',     label: 'Miring',      icon: '◤' },
                { id: 'double-wave', label: 'Gelombang',   icon: '≈' },
                { id: 'two-tone',    label: 'Split',       icon: '◧' },
                { id: 'minimal',     label: 'Minimal',     icon: '—' },
              ] as const)?.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setConfig({ ...config, header_style: s.id })}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase tracking-tight border transition-all duration-200 ${
                    (config.header_style || 'solid') === s.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 ring-2 ring-blue-500/30 scale-105'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Header Background Pattern */}
          <div className="pt-1">
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Pola Latar Header</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {( [
                { id: 'solid',             label: 'Solid',       preview: 'bg-white border border-slate-200' },
                { id: 'gradient-diagonal', label: 'Gradasi /',   preview: 'bg-gradient-to-br from-blue-50 to-white border border-blue-100' },
                { id: 'gradient-radial',   label: 'Radial',      preview: 'bg-[radial-gradient(ellipse_at_80%_20%,#bfdbfe_0%,transparent_70%)] border border-blue-100' },
                { id: 'wave-bottom',       label: 'Ombak ↓',    preview: 'border border-slate-200 bg-white' },
                { id: 'wave-top',          label: 'Ombak ↑',    preview: 'border border-slate-200 bg-white' },
                { id: 'diagonal-stripe',   label: 'Garis',       preview: 'bg-[repeating-linear-gradient(45deg,#e0e7ff_0px,#e0e7ff_2px,white_2px,white_12px)] border border-blue-100' },
                { id: 'dots',              label: 'Titik',       preview: 'bg-[radial-gradient(circle,#3b82f6_1px,transparent_1px)] bg-[length:10px_10px] border border-blue-100 bg-white' },
                { id: 'circuit',           label: 'Sirkuit',     preview: 'border border-slate-200 bg-slate-50' },
                { id: 'diamond',           label: 'Berlian',     preview: 'border border-slate-200 bg-white' },
                { id: 'split-color',       label: 'Split',       preview: 'bg-[linear-gradient(160deg,#bfdbfe_0%,#bfdbfe_45%,white_45%)] border border-blue-100' },
                { id: 'arc-overlay',       label: 'Busur',       preview: 'border border-slate-200 bg-white' },
                { id: 'hexagon',           label: 'Hexagon',     preview: 'border border-slate-200 bg-white' },
              ] as const)?.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => setConfig({ ...config, header_pattern: pat.id })}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${pat.preview} ${
                    (config.header_pattern || 'solid') === pat.id
                      ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md scale-105'
                      : 'hover:scale-102 hover:shadow-sm'
                  }`}
                >
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight leading-none">{pat.label}</span>
                </button>
              ))}
            </div>
            {/* Header Pattern Opacity */}
            <div className="mt-2.5 flex items-center gap-3">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">Intensitas Pola Header</Label>
              <input
                type="range"
                min={5}
                max={100}
                value={config.header_pattern_opacity ?? 20}
                onChange={(e) => setConfig({ ...config, header_pattern_opacity: Number(e.target.value) })}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">{config.header_pattern_opacity ?? 20}%</span>
            </div>
          </div>

          {/* Footer Style */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Gaya Footer</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {( [
                { id: 'solid',       label: 'Solid',  icon: '▬' },
                { id: 'gradient',    label: 'Gradasi',icon: '◐' },
                { id: 'glass',       label: 'Glass',  icon: '◻' },
                { id: 'accent-line', label: 'Garis',  icon: '—' },
                { id: 'hidden',      label: 'Sembunyikan', icon: '✕' },
              ] as const)?.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setConfig({ ...config, footer_style: s.id })}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase tracking-tight border transition-all duration-200 ${
                    (config.footer_style || 'solid') === s.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 ring-2 ring-blue-500/30 scale-105'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Background Pattern */}
          <div className="pt-2">
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-3 block">Pola Latar Kartu</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {( [
                { id: 'solid',             label: 'Solid',       preview: 'bg-white border border-slate-200' },
                { id: 'gradient-diagonal', label: 'Gradasi /',   preview: 'bg-gradient-to-br from-blue-50 to-white border border-blue-100' },
                { id: 'gradient-radial',   label: 'Radial',      preview: 'bg-[radial-gradient(ellipse_at_80%_20%,#bfdbfe_0%,transparent_70%)] border border-blue-100' },
                { id: 'wave-bottom',       label: 'Ombak ↓',    preview: 'border border-slate-200 bg-white' },
                { id: 'wave-top',          label: 'Ombak ↑',    preview: 'border border-slate-200 bg-white' },
                { id: 'diagonal-stripe',   label: 'Garis',       preview: 'bg-[repeating-linear-gradient(45deg,#e0e7ff_0px,#e0e7ff_2px,white_2px,white_12px)] border border-blue-100' },
                { id: 'dots',              label: 'Titik',       preview: 'bg-[radial-gradient(circle,#3b82f6_1px,transparent_1px)] bg-[length:10px_10px] border border-blue-100 bg-white' },
                { id: 'circuit',           label: 'Sirkuit',     preview: 'border border-slate-200 bg-slate-50' },
                { id: 'diamond',           label: 'Berlian',     preview: 'border border-slate-200 bg-white' },
                { id: 'split-color',       label: 'Split',       preview: 'bg-[linear-gradient(160deg,#bfdbfe_0%,#bfdbfe_45%,white_45%)] border border-blue-100' },
                { id: 'arc-overlay',       label: 'Busur',       preview: 'border border-slate-200 bg-white' },
                { id: 'hexagon',           label: 'Hexagon',     preview: 'border border-slate-200 bg-white' },
              ] as const)?.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => setConfig({ ...config, card_pattern: pat.id })}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${pat.preview} ${
                    config.card_pattern === pat.id || (!config.card_pattern && pat.id === 'solid')
                      ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md scale-105'
                      : 'hover:scale-102 hover:shadow-sm'
                  }`}
                >
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight leading-none">{pat.label}</span>
                </button>
              ))}
            </div>
            {/* Pattern Opacity */}
            <div className="mt-3 flex items-center gap-3">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap">Intensitas Pola</Label>
              <input
                type="range"
                min={10}
                max={100}
                value={config.card_pattern_opacity ?? 100}
                onChange={(e) => setConfig({ ...config, card_pattern_opacity: Number(e.target.value) })}
                className="flex-1 h-1.5 rounded-full accent-blue-600"
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      <SchoolIdentitySettings
        config={config}
        setConfig={setConfig}
        cardTargetMode={cardTargetMode}
      />

      <SettingsGroup title="Dimensi & Border" defaultOpen={true}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Lebar (mm)</Label>
              <Input
                type="number"
                value={config.card_width || 85.6}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, card_width: parseFloat(e.target.value) })}
                className="h-8 text-xs rounded-lg dark:bg-slate-950 dark:border-slate-800"
                step="0.1"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Tinggi (mm)</Label>
              <Input
                type="number"
                value={config.card_height || 54}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, card_height: parseFloat(e.target.value) })}
                className="h-8 text-xs rounded-lg dark:bg-slate-955 dark:border-slate-800"
                step="0.1"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Tampilkan Border</Label>
              <Switch
                checked={!!config.show_border}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_border: c })}
                className="scale-90"
              />
            </div>
            {config.show_border && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-955/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Warna</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={config.border_color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, border_color: e.target.value })}
                      className="w-8 h-8 p-1 rounded-lg cursor-pointer"
                    />
                    <Input
                      value={config.border_color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, border_color: e.target.value })}
                      className="h-8 text-[10px] font-mono flex-1 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tebal (px)</Label>
                  <FontSizeInput
                    value={config.border_width || 1}
                    onChange={(v: number) => setConfig({ ...config, border_width: v })}
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Elemen Foto & QR" defaultOpen={true}>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Tampilkan Foto Siswa</Label>
              <Switch
                checked={!!config.show_photo}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_photo: c })}
                className="scale-90"
              />
            </div>
            {config.show_photo && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Lebar (mm)</Label>
                  <Input
                    type="number"
                    value={config.photo_width || 24}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, photo_width: parseFloat(e.target.value) })}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tinggi (mm)</Label>
                  <Input
                    type="number"
                    value={config.photo_height || 32}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, photo_height: parseFloat(e.target.value) })}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="col-span-2 pt-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Bentuk Bingkai Foto</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={(config.photo_shape || 'square') === 'square' ? 'primary' : 'outline'}
                      onClick={() => setConfig({ ...config, photo_shape: 'square' })}
                      className="h-8 text-[10px] font-bold rounded-lg"
                    >
                      Kotak (Standard)
                    </Button>
                    <Button
                      type="button"
                      variant={config.photo_shape === 'circle' ? 'primary' : 'outline'}
                      onClick={() => setConfig({ ...config, photo_shape: 'circle' })}
                      className="h-8 text-[10px] font-bold rounded-lg"
                    >
                      Bulat (Versi 2)
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Tampilkan QR Code</Label>
              <Switch
                checked={!!config.show_qrcode}
                onCheckedChange={(c: boolean) => setConfig({ ...config, show_qrcode: c })}
                className="scale-90"
              />
            </div>
            {config.show_qrcode && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-955/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Lebar (mm)</Label>
                  <Input
                    type="number"
                    value={config.qrcode_width || 20}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, qrcode_width: parseFloat(e.target.value) })}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tinggi (mm)</Label>
                  <Input
                    type="number"
                    value={config.qrcode_height || 20}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, qrcode_height: parseFloat(e.target.value) })}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Tipografi Data Siswa" defaultOpen={true}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Ukuran Nama</Label>
              <FontSizeInput
                value={config.student_name_font_size}
                onChange={(v: number) => setConfig({ ...config, student_name_font_size: v })}
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Ukuran Detail</Label>
              <FontSizeInput
                value={config.student_details_font_size}
                onChange={(v: number) => setConfig({ ...config, student_details_font_size: v })}
              />
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => {
                setConfig(prev => ({
                  ...prev,
                  photo_x: 0, photo_y: 0,
                  qrcode_x: 0, qrcode_y: 0,
                  data_x: 0, data_y: 0,
                  header_x: 0, header_y: 0,
                  title_x: 0, title_y: 0
                }));
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2 text-slate-500" />
              Reset Semua Posisi
            </Button>
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
};
