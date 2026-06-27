import React from 'react';
import { 
    SectionCard, 
    Button, 
    Label, 
    Input, 
    Switch,
    Badge
} from '@/components/ui';
import { 
    Settings, 
    RotateCcw, 
    CreditCard,
    Printer as PrinterIcon
} from 'lucide-react';
import { SettingsGroup } from '@/components/academic/student-card/SettingsGroup';
import { FontSizeInput } from '@/components/academic/student-card/FontSizeInput';
import { PreviewCard } from '@/components/academic/student-card/PreviewCard';
import type { StudentCardConfig } from '@/components/academic/student-card/types';

// Coordinate Reference (EDITOR_SCALE=2, MM_TO_PX=3.78):
// Horizontal card: 647px wide × 408px tall
//   Header=136px, Card title strip ~32px → content starts ~170px
//   Photo(20×26mm)=151×196px → x=14, y=170  (photo bottom = 366px)
//   Data block (3 rows ~84px, centered at photo mid=268) → x=180, y=220
//   QR(18×18mm)=136×136px → x=497, y=200
//
// Vertical card: 408px wide × 647px tall
//   Header=136px, content starts ~170px
//   Photo(24×32mm)=181×242px centered → x=114, y=178 (photo bottom = 420px)
//   Data block below photo → x=14, y=435
//   QR beside data → x=245, y=430

const HCOORDS = {
    photo_width: 20, photo_height: 26, qrcode_width: 18, qrcode_height: 18,
    photo_x: 14,  photo_y: 170,
    data_x:  180, data_y:  220,
    qrcode_x: 497, qrcode_y: 200,
};
const VCOORDS = {
    photo_width: 24, photo_height: 32, qrcode_width: 15, qrcode_height: 15,
    photo_x: 114, photo_y: 200,
    data_x:  14,  data_y:  420,
    qrcode_x: 270, qrcode_y: 420,
};

const CARD_PRESETS: (Partial<StudentCardConfig> & { name: string })[] = [
    // ── HORIZONTAL ──────────────────────────────────────────
    {
        name: 'Modern Blue Pass',
        template: 'horizontal',
        primary_color: '#2563eb', secondary_color: '#ffffff',
        header_bg_color: '#1e3a8a', header_text_color: '#ffffff',
        header_style: 'solid', footer_style: 'solid',
        card_pattern: 'arc-overlay', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU IDENTITAS SISWA',
        ...HCOORDS,
    },
    {
        name: 'Islamic Emerald',
        template: 'horizontal',
        primary_color: '#059669', secondary_color: '#f0fdf4',
        header_bg_color: '#064e3b', header_text_color: '#fef08a',
        header_style: 'gradient', footer_style: 'gradient',
        card_pattern: 'wave-bottom', card_pattern_opacity: 90,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU TANDA ANGGOTA',
        ...HCOORDS,
    },
    {
        name: 'Red Circuit Tech',
        template: 'horizontal',
        primary_color: '#dc2626', secondary_color: '#ffffff',
        header_bg_color: '#7f1d1d', header_text_color: '#ffffff',
        header_style: 'slanted', footer_style: 'accent-line',
        card_pattern: 'circuit', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU SISWA PRAKERIN',
        ...HCOORDS,
    },
    {
        name: 'Golden Gradient',
        template: 'horizontal',
        primary_color: '#b45309', secondary_color: '#fffbeb',
        header_bg_color: '#78350f', header_text_color: '#fef9c3',
        header_style: 'gradient', footer_style: 'gradient',
        card_pattern: 'gradient-diagonal', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU SISWA',
        ...HCOORDS,
    },
    {
        name: 'Navy Split',
        template: 'horizontal',
        primary_color: '#1d4ed8', secondary_color: '#f8faff',
        header_bg_color: '#0f172a', header_text_color: '#e2e8f0',
        header_style: 'solid', footer_style: 'accent-line',
        card_pattern: 'split-color', card_pattern_opacity: 90,
        show_photo: true, show_qrcode: true,
        card_title: 'STUDENT IDENTITY CARD',
        ...HCOORDS,
    },
    {
        name: 'Purple Dots',
        template: 'horizontal',
        primary_color: '#7c3aed', secondary_color: '#faf5ff',
        header_bg_color: '#4c1d95', header_text_color: '#e9d5ff',
        header_style: 'wave', footer_style: 'solid',
        card_pattern: 'dots', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        card_title: 'KTM MAHASISWA',
        ...HCOORDS,
    },
    {
        name: 'Teal Arc Clean',
        template: 'horizontal',
        primary_color: '#0d9488', secondary_color: '#f0fdfa',
        header_bg_color: '#134e4a', header_text_color: '#ccfbf1',
        header_style: 'solid', footer_style: 'hidden',
        card_pattern: 'arc-overlay', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU IDENTITAS PEGAWAI',
        ...HCOORDS,
    },
    {
        name: 'Rose Glass Minimal',
        template: 'horizontal',
        primary_color: '#e11d48', secondary_color: '#fff1f2',
        header_bg_color: '#9f1239', header_text_color: '#fecdd3',
        header_style: 'glass', footer_style: 'glass',
        card_pattern: 'gradient-radial', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU SISWA',
        ...HCOORDS,
    },
    {
        name: 'Indigo Slanted Pro',
        template: 'horizontal',
        primary_color: '#4338ca', secondary_color: '#eef2ff',
        header_bg_color: '#312e81', header_text_color: '#c7d2fe',
        header_style: 'slanted', footer_style: 'gradient',
        card_pattern: 'diagonal-stripe', card_pattern_opacity: 60,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU PELAJAR',
        ...HCOORDS,
    },
    {
        name: 'Amber Wave Warm',
        template: 'horizontal',
        primary_color: '#d97706', secondary_color: '#fffbeb',
        header_bg_color: '#78350f', header_text_color: '#fef3c7',
        header_style: 'wave', footer_style: 'accent-line',
        card_pattern: 'diamond', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU IDENTITAS',
        ...HCOORDS,
    },
    // ── VERTICAL ────────────────────────────────────────────
    {
        name: 'Vertical Modern Blue',
        template: 'vertical',
        primary_color: '#2563eb', secondary_color: '#ffffff',
        header_bg_color: '#1e3a8a', header_text_color: '#ffffff',
        header_style: 'solid', footer_style: 'solid',
        card_pattern: 'gradient-radial', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        card_title: 'STUDENT PASS',
        ...VCOORDS,
    },
    {
        name: 'Vertical Islamic Green',
        template: 'vertical',
        primary_color: '#059669', secondary_color: '#f0fdf4',
        header_bg_color: '#064e3b', header_text_color: '#ffffff',
        header_style: 'gradient', footer_style: 'gradient',
        card_pattern: 'hexagon', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU ANGGOTA',
        ...VCOORDS,
    },
    {
        name: 'Vertical Dark Slate',
        template: 'vertical',
        primary_color: '#374151', secondary_color: '#f8fafc',
        header_bg_color: '#111827', header_text_color: '#f3f4f6',
        header_style: 'slanted', footer_style: 'accent-line',
        card_pattern: 'diagonal-stripe', card_pattern_opacity: 60,
        show_photo: true, show_qrcode: true,
        card_title: 'STUDENT IDENTITY',
        ...VCOORDS,
    },
    {
        name: 'Vertical Crimson Wave',
        template: 'vertical',
        primary_color: '#dc2626', secondary_color: '#fff5f5',
        header_bg_color: '#991b1b', header_text_color: '#fecaca',
        header_style: 'wave', footer_style: 'solid',
        card_pattern: 'wave-top', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU PELAJAR',
        ...VCOORDS,
    },
    {
        name: 'Vertical Gold Diamond',
        template: 'vertical',
        primary_color: '#d97706', secondary_color: '#fffbeb',
        header_bg_color: '#92400e', header_text_color: '#fef9c3',
        header_style: 'gradient', footer_style: 'accent-line',
        card_pattern: 'diamond', card_pattern_opacity: 90,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU SANTRI',
        ...VCOORDS,
    },
    {
        name: 'Vertical Glass Frost',
        template: 'vertical',
        primary_color: '#0ea5e9', secondary_color: '#f0f9ff',
        header_bg_color: '#075985', header_text_color: '#e0f2fe',
        header_style: 'glass', footer_style: 'glass',
        card_pattern: 'gradient-radial', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU PELAJAR',
        ...VCOORDS,
    },
    {
        name: 'Vertical Purple Slant',
        template: 'vertical',
        primary_color: '#7c3aed', secondary_color: '#faf5ff',
        header_bg_color: '#4c1d95', header_text_color: '#ede9fe',
        header_style: 'slanted', footer_style: 'hidden',
        card_pattern: 'arc-overlay', card_pattern_opacity: 85,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU SISWA',
        ...VCOORDS,
    },
    {
        name: 'Vertical Rose Minimal',
        template: 'vertical',
        primary_color: '#e11d48', secondary_color: '#fff1f2',
        header_bg_color: '#9f1239', header_text_color: '#fecdd3',
        header_style: 'wave', footer_style: 'gradient',
        card_pattern: 'dots', card_pattern_opacity: 60,
        show_photo: true, show_qrcode: true,
        card_title: 'KARTU ANGGOTA',
        ...VCOORDS,
    },
];

interface DesignTabProps {
    config: StudentCardConfig;
    setConfig: React.Dispatch<React.SetStateAction<StudentCardConfig>>;
    handleDragEnd: (field: 'photo' | 'qrcode' | 'data', info: any) => void;
    previewStudent: any;
    sekolah: any;
}

export const DesignTab: React.FC<DesignTabProps> = ({
    config,
    setConfig,
    handleDragEnd,
    previewStudent,
    sekolah
}) => {
    const activePreset = CARD_PRESETS.find(p => 
        p.template === config.template &&
        p.primary_color === config.primary_color &&
        p.secondary_color === config.secondary_color &&
        p.header_style === config.header_style &&
        p.footer_style === config.footer_style &&
        p.card_pattern === config.card_pattern
    );
    const activePresetName = activePreset ? activePreset.name : '';

    const applyPreset = (presetName: string) => {
        const preset = CARD_PRESETS.find(p => p.name === presetName);
        if (!preset) return;

        const resolvedNama    = sekolah?.name    || sekolah?.nama    || sekolah?.data?.name    || sekolah?.data?.nama    || '';
        const resolvedAlamat  = sekolah?.address || sekolah?.alamat  || sekolah?.data?.address || sekolah?.data?.alamat  || '';
        const resolvedLogo    = sekolah?.logo_url || sekolah?.data?.logo_url || '';

        setConfig({
            ...config,
            ...preset,
            school_name:    resolvedNama    || config.school_name    || '',
            school_address: resolvedAlamat  || config.school_address || '',
            logo_url:       resolvedLogo    || config.logo_url       || '',
            header_text:    config.header_text    || '',
            subheader_text: config.subheader_text || '',
            card_title:     config.card_title     || preset.card_title || '',
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Control Sidebar */}
            <SectionCard
                title="Konfigurasi Desain"
                icon={Settings}
                fullWidth
                className="lg:col-span-1 shadow-sm border-slate-100 dark:border-slate-800"
                noPadding
            >
                <div className="p-4 space-y-4">
                    <SettingsGroup title="Pustaka Preset Kartu" defaultOpen={true}>
                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pilih Preset Template:</Label>
                            <div className="relative">
                                <select
                                    value={activePresetName}
                                    onChange={(e) => applyPreset(e.target.value)}
                                    className="w-full h-11 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                                >
                                    <option value="" disabled>-- Pilih Preset Desain --</option>
                                    <optgroup label="Layout Horizontal (Lanskap)" className="font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                                        {CARD_PRESETS.filter(p => p.template === 'horizontal').map(p => (
                                            <option key={p.name} value={p.name} className="font-semibold text-slate-800 dark:text-slate-200">
                                                {p.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Layout Vertikal (Potret)" className="font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                                        {CARD_PRESETS.filter(p => p.template === 'vertical').map(p => (
                                            <option key={p.name} value={p.name} className="font-semibold text-slate-800 dark:text-slate-200">
                                                {p.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
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
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Warna Utama</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="color"
                                            value={config.primary_color}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, primary_color: e.target.value })}
                                            className="w-10 h-10 p-1.5 rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
                                        />
                                        <Input
                                            value={config.primary_color}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, primary_color: e.target.value })}
                                            className="h-10 text-xs font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Warna Header</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="color"
                                            value={config.header_bg_color || config.primary_color}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_bg_color: e.target.value })}
                                            className="w-10 h-10 p-1.5 rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
                                        />
                                        <Input
                                            value={config.header_bg_color || config.primary_color}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_bg_color: e.target.value })}
                                            className="h-10 text-xs font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Header Style */}
                            <div>
                                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Gaya Header</Label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {([
                                        { id: 'solid',    label: 'Solid',   icon: '▬' },
                                        { id: 'gradient', label: 'Gradasi', icon: '◐' },
                                        { id: 'glass',    label: 'Glass',   icon: '◻' },
                                        { id: 'wave',     label: 'Lengkung',icon: '⌒' },
                                        { id: 'slanted',  label: 'Miring',  icon: '◤' },
                                    ] as const).map((s) => (
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

                            {/* Footer Style */}
                            <div>
                                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Gaya Footer</Label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {([
                                        { id: 'solid',       label: 'Solid',  icon: '▬' },
                                        { id: 'gradient',    label: 'Gradasi',icon: '◐' },
                                        { id: 'glass',       label: 'Glass',  icon: '◻' },
                                        { id: 'accent-line', label: 'Garis',  icon: '—' },
                                        { id: 'hidden',      label: 'Sembunyikan', icon: '✕' },
                                    ] as const).map((s) => (
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
                                    {([
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
                                    ] as const).map((pat) => (
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
                                    <span className="text-[10px] font-black text-slate-400 w-8 text-right">{config.card_pattern_opacity ?? 100}%</span>
                                </div>
                            </div>
                        </div>
                    </SettingsGroup>

                    <SettingsGroup title="Identitas Sekolah" defaultOpen={true}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Nama Instansi (Header 1)</Label>
                                    <FontSizeInput
                                        value={config.header_font_size}
                                        onChange={(v: number) => setConfig({ ...config, header_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.header_text}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_text: e.target.value })}
                                    placeholder="PEMERINTAH KABUPATEN..."
                                    className="h-10 text-sm font-medium rounded-xl dark:bg-slate-950 dark:border-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Sub Instansi (Header 2)</Label>
                                    <FontSizeInput
                                        value={config.subheader_font_size}
                                        onChange={(v: number) => setConfig({ ...config, subheader_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.subheader_text}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, subheader_text: e.target.value })}
                                    placeholder="DINAS PENDIDIKAN..."
                                    className="h-10 text-sm font-medium rounded-xl dark:bg-slate-950 dark:border-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Nama Sekolah</Label>
                                    <FontSizeInput
                                        value={config.school_name_font_size}
                                        onChange={(v: number) => setConfig({ ...config, school_name_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.school_name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, school_name: e.target.value })}
                                    placeholder="SMK NEGERI 1..."
                                    className="h-10 text-sm font-bold rounded-xl dark:bg-slate-950 dark:border-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Alamat Sekolah</Label>
                                    <FontSizeInput
                                        value={config.school_address_font_size}
                                        onChange={(v: number) => setConfig({ ...config, school_address_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.school_address}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, school_address: e.target.value })}
                                    placeholder="Jl. Pendidikan No. 1..."
                                    className="h-10 text-[11px] font-medium rounded-xl dark:bg-slate-950 dark:border-slate-800"
                                />
                            </div>
                        </div>
                    </SettingsGroup>

                    <SettingsGroup title="Dimensi & Border" defaultOpen={true}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-1 block">Lebar (mm)</Label>
                                    <Input
                                        type="number"
                                        value={config.card_width || 85.6}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, card_width: parseFloat(e.target.value) })}
                                        className="h-10 text-sm rounded-xl dark:bg-slate-950 dark:border-slate-800"
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-1 block">Tinggi (mm)</Label>
                                    <Input
                                        type="number"
                                        value={config.card_height || 54}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, card_height: parseFloat(e.target.value) })}
                                        className="h-10 text-sm rounded-xl dark:bg-slate-950 dark:border-slate-800"
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tampilkan Border</Label>
                                    <Switch
                                        checked={!!config.show_border}
                                        onCheckedChange={(c: boolean) => setConfig({ ...config, show_border: c })}
                                        className="scale-90"
                                    />
                                </div>
                                {config.show_border && (
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
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
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tampilkan Foto Siswa</Label>
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
                                                className="h-9 text-xs rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tinggi (mm)</Label>
                                            <Input
                                                type="number"
                                                value={config.photo_height || 32}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, photo_height: parseFloat(e.target.value) })}
                                                className="h-9 text-xs rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tampilkan QR Code</Label>
                                    <Switch
                                        checked={!!config.show_qrcode}
                                        onCheckedChange={(c: boolean) => setConfig({ ...config, show_qrcode: c })}
                                        className="scale-90"
                                    />
                                </div>
                                {config.show_qrcode && (
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Lebar (mm)</Label>
                                            <Input
                                                type="number"
                                                value={config.qrcode_width || 20}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, qrcode_width: parseFloat(e.target.value) })}
                                                className="h-9 text-xs rounded-lg"
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
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Ukuran Nama</Label>
                                    <FontSizeInput
                                        value={config.student_name_font_size}
                                        onChange={(v: number) => setConfig({ ...config, student_name_font_size: v })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Ukuran Detail</Label>
                                    <FontSizeInput
                                        value={config.student_details_font_size}
                                        onChange={(v: number) => setConfig({ ...config, student_details_font_size: v })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-[11px] font-bold h-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => {
                                        setConfig(prev => ({
                                            ...prev,
                                            photo_x: 0, photo_y: 0,
                                            qrcode_x: 0, qrcode_y: 0,
                                            data_x: 0, data_y: 0
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
            </SectionCard>

            {/* Preview Area */}
            <div className="lg:col-span-2 space-y-6">
                <SectionCard
                    title="Live Editor Preview"
                    icon={CreditCard}
                    fullWidth
                    className="shadow-sm border-slate-100 dark:border-slate-800 overflow-hidden"
                    noPadding
                >
                    <div className="p-12 bg-slate-200/50 dark:bg-slate-950/50 flex flex-col items-center justify-center min-h-[500px] relative border-b border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Mode Desain Interaktif (Drag & Drop)
                        </div>

                        <PreviewCard
                            student={previewStudent || {
                                nama_siswa: 'CONTOH NAMA SISWA',
                                nis: '12345678',
                                nisn: '0012345678',
                                kelas: { nama_kelas: 'X - RPL 1' }
                            }}
                            config={config}
                            sekolah={sekolah}
                            onDragEnd={handleDragEnd}
                        />

                        <div className="mt-12 flex gap-6">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <div className="w-3 h-3 rounded-full border-2 border-blue-500" />
                                Posisi Dinamis
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                                Ukuran Presisi
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <PrinterIcon size={14} className="text-blue-600" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Kualitas Cetak: 300 DPI</span>
                        </div>
                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Format ID-1 Standard
                        </Badge>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};
