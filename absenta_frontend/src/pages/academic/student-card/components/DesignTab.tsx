import React from 'react';
import { 
    SectionCard, 
    Button, 
    Label, 
    Input, 
    Switch,
    Badge,
    Checkbox,
    Textarea
} from '@/components/ui';
import { 
    Settings, 
    RotateCcw, 
    CreditCard,
    Printer as PrinterIcon,
    Sparkles,
    Upload,
    Loader2,
    Maximize2,
    X,
    Check,
    Save,
    RefreshCw,
    GraduationCap,
    User
} from 'lucide-react';
import { SettingsGroup } from '@/components/academic/student-card/SettingsGroup';
import { FontSizeInput } from '@/components/academic/student-card/FontSizeInput';
import { PreviewCard } from '@/components/academic/student-card/PreviewCard';
import { CardBackPreview } from '@/components/academic/student-card/CardBackPreview';
import type { StudentCardConfig } from '@/components/academic/student-card/types';
import axiosInstance from '@/lib/axiosInstance';

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
    data_x:  180, data_y:  190,
    qrcode_x: 497, qrcode_y: 200,
};
const VCOORDS = {
    photo_width: 24, photo_height: 32, qrcode_width: 15, qrcode_height: 15,
    photo_x: 114, photo_y: 200,
    data_x:  14,  data_y:  420,
    qrcode_x: 270, qrcode_y: 420,
};

// Mirror layout (photo on the right, data on the left)
const V2_HCOORDS = {
    photo_width: 20, photo_height: 26, qrcode_width: 18, qrcode_height: 18,
    photo_x: 490, photo_y: 170,
    data_x:  14,  data_y:  190,
    qrcode_x: 350, qrcode_y: 200,
};

// Centered layout with circular photo overlapping header (as in sample image)
const V2_VCOORDS = {
    photo_width: 22, photo_height: 22, qrcode_width: 15, qrcode_height: 15,
    photo_x: 120, photo_y: 190,
    data_x:  14,  data_y:  420,
    qrcode_x: 270, qrcode_y: 480,
};

export const CARD_PRESETS = [
    {
        name: 'Executive Pegawai (Slate & Gold)',
        template: 'horizontal',
        primary_color: '#0f172a', secondary_color: '#d97706',
        header_bg_color: '#0f172a', header_text_color: '#fbbf24',
        header_style: 'gradient', footer_style: 'solid',
        card_pattern: 'mesh', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        show_border: true, border_color: '#94a3b8', border_width: 1,
        card_title: 'KARTU PEGAWAI',
        ...HCOORDS,
    },
    {
        name: 'Executive Guru (Midnight Indigo)',
        template: 'vertical',
        primary_color: '#1e1b4b', secondary_color: '#38bdf8',
        header_bg_color: '#312e81', header_text_color: '#ffffff',
        header_style: 'double-wave', footer_style: 'accent-line',
        card_pattern: 'dots-grid', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        photo_shape: 'circle',
        header_height: 38,
        card_title: 'KARTU PEGAWAI',
        ...V2_VCOORDS,
    },
    {
        name: 'Modern Staf (Emerald Corporate)',
        template: 'horizontal',
        primary_color: '#064e3b', secondary_color: '#10b981',
        header_bg_color: '#065f46', header_text_color: '#ffffff',
        header_style: 'slanted', footer_style: 'gradient',
        card_pattern: 'diagonal-stripe', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'KARTU PEGAWAI',
        ...V2_HCOORDS,
    },
    {
        name: 'Horizontal - Versi 1 (Siswa)',
        template: 'horizontal',
        primary_color: '#2563eb', secondary_color: '#ffffff',
        header_bg_color: '#1e3a8a', header_text_color: '#ffffff',
        header_style: 'solid', footer_style: 'solid',
        card_pattern: 'arc-overlay', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'KARTU PELAJAR',
        ...HCOORDS,
    },
    {
        name: 'Horizontal - Versi 2 (Mirrored Siswa)',
        template: 'horizontal',
        primary_color: '#7c3aed', secondary_color: '#faf5ff',
        header_bg_color: '#4c1d95', header_text_color: '#ffffff',
        header_style: 'slanted', footer_style: 'gradient',
        card_pattern: 'diagonal-stripe', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'KARTU PELAJAR',
        ...V2_HCOORDS,
    },
    {
        name: 'Vertical - Versi 1 (Siswa)',
        template: 'vertical',
        primary_color: '#2563eb', secondary_color: '#ffffff',
        header_bg_color: '#1e3a8a', header_text_color: '#ffffff',
        header_style: 'solid', footer_style: 'solid',
        card_pattern: 'gradient-radial', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'STUDENT PASS',
        ...VCOORDS,
    },
    {
        name: 'Vertical - Versi 2 (Centered Circle Siswa)',
        template: 'vertical',
        primary_color: '#0284c7', secondary_color: '#ffffff',
        header_bg_color: '#0369a1', header_text_color: '#ffffff',
        header_style: 'double-wave', footer_style: 'accent-line',
        card_pattern: 'solid', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        photo_shape: 'circle',
        header_height: 38,
        card_title: 'KARTU PELAJAR',
        ...V2_VCOORDS,
    },
];

const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

interface DesignTabProps {
    config: StudentCardConfig;
    setConfig: React.Dispatch<React.SetStateAction<StudentCardConfig>>;
    handleDragEnd: (field: 'photo' | 'qrcode' | 'data', info: any) => void;
    previewStudent: any;
    sekolah: any;
    isSaving?: boolean;
    cardTargetMode?: 'SISWA' | 'GURU';
    setCardTargetMode?: (mode: 'SISWA' | 'GURU') => void;
}

export const DesignTab: React.FC<DesignTabProps> = ({
    config,
    setConfig,
    handleDragEnd,
    previewStudent,
    sekolah,
    isSaving = false,
    cardTargetMode = 'SISWA',
    setCardTargetMode
}) => {
    const activePresetName = config.selected_preset || 'Vertical - Versi 1';
    const [previewSide, setPreviewSide] = React.useState<'front' | 'back'>('front');
    const [uploadingStamp, setUploadingStamp] = React.useState(false);
    const [uploadingSign, setUploadingSign] = React.useState(false);
    const [isFocusMode, setIsFocusMode] = React.useState(false);

    React.useEffect(() => {
        const handleOpenFocusMode = () => {
            setPreviewSide('back');
            setIsFocusMode(true);
        };
        window.addEventListener('open-card-back-focus-mode', handleOpenFocusMode);
        return () => {
            window.removeEventListener('open-card-back-focus-mode', handleOpenFocusMode);
        };
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'stamp' | 'signature') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        if (type === 'stamp') setUploadingStamp(true);
        else setUploadingSign(true);

        try {
            const res = await axiosInstance.post('/upload/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (res.data?.success && res.data?.data?.url) {
                const url = res.data.data.url;
                if (type === 'stamp') {
                    setConfig(prev => ({ ...prev, back_stamp_image_url: url }));
                } else {
                    setConfig(prev => ({ ...prev, back_signature_image_url: url }));
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            if (type === 'stamp') setUploadingStamp(false);
            else setUploadingSign(false);
        }
    };

    const applyPreset = (presetName: string) => {
        const preset = CARD_PRESETS.find(p => p.name === presetName);
        if (!preset) return;

        // Parse current layout presets overrides
        let currentPresets: Record<string, any> = {};
        try {
            currentPresets = config.layout_presets ? JSON.parse(config.layout_presets) : {};
        } catch (e) {
            console.error('Error parsing layout presets:', e);
        }

        // Save current configuration values under the old selected_preset name (if one was selected)
        const oldPresetName = config.selected_preset || 'Vertical - Versi 1';
        currentPresets[oldPresetName] = {
            template: config.template,
            primary_color: config.primary_color,
            secondary_color: config.secondary_color,
            header_bg_color: config.header_bg_color,
            header_text_color: config.header_text_color,
            header_style: config.header_style,
            header_pattern: config.header_pattern,
            header_pattern_opacity: config.header_pattern_opacity,
            footer_height: config.footer_height,
            footer_bg_color: config.footer_bg_color,
            footer_style: config.footer_style,
            show_photo: config.show_photo,
            photo_shape: config.photo_shape,
            show_qrcode: config.show_qrcode,
            photo_x: config.photo_x,
            photo_y: config.photo_y,
            photo_scale: config.photo_scale,
            photo_width: config.photo_width,
            photo_height: config.photo_height,
            qrcode_x: config.qrcode_x,
            qrcode_y: config.qrcode_y,
            qrcode_scale: config.qrcode_scale,
            qrcode_width: config.qrcode_width,
            qrcode_height: config.qrcode_height,
            data_x: config.data_x,
            data_y: config.data_y,
            card_title: config.card_title,
            card_pattern: config.card_pattern,
            card_pattern_opacity: config.card_pattern_opacity,
            header_height: config.header_height,
            header_font_size: config.header_font_size,
            subheader_font_size: config.subheader_font_size,
            school_name_font_size: config.school_name_font_size,
            school_address_font_size: config.school_address_font_size,
            card_title_font_size: config.card_title_font_size,
            student_name_font_size: config.student_name_font_size,
            student_details_font_size: config.student_details_font_size,
            show_border: config.show_border,
            border_color: config.border_color,
            border_width: config.border_width,
        };

        // Load the new preset overrides if they exist, otherwise fall back to base preset defaults
        const newPresetCustomizations = currentPresets[presetName] || {};

        const resolvedNama    = sekolah?.name    || sekolah?.nama    || sekolah?.data?.name    || sekolah?.data?.nama    || '';
        const resolvedAlamat  = sekolah?.address || sekolah?.alamat  || sekolah?.data?.address || sekolah?.data?.alamat  || '';
        const resolvedLogo    = sekolah?.logo_url || sekolah?.data?.logo_url || '';

        setConfig({
            ...config,
            ...preset,
            ...newPresetCustomizations,
            selected_preset: presetName,
            layout_presets: JSON.stringify(currentPresets),
            school_name:    resolvedNama    || config.school_name    || '',
            school_address: resolvedAlamat  || config.school_address || '',
            logo_url:       resolvedLogo    || config.logo_url       || '',
            header_text:    config.header_text    || '',
            subheader_text: config.subheader_text || '',
            card_title:     newPresetCustomizations.card_title || config.card_title || preset.card_title || '',
        });
    };

    const handleRandomStyle = () => {
        const h = Math.floor(Math.random() * 360);
        
        // Primary (Vibrant & saturated color)
        const sPrim = Math.floor(Math.random() * 20) + 70; // 70-90%
        const lPrim = Math.floor(Math.random() * 15) + 35; // 35-50%
        const primary = hslToHex(h, sPrim, lPrim);
        
        // Secondary (Matching light pastel background tint or clean white)
        const sSec = Math.floor(Math.random() * 15) + 15;  // 15-30%
        const lSec = Math.floor(Math.random() * 3) + 95;   // 95-98%
        const secondary = Math.random() > 0.4 ? hslToHex(h, sSec, lSec) : '#ffffff';
        
        // Header Bg (slightly darker HSL shade of primary)
        const headerBg = hslToHex(h, Math.min(100, sPrim + 5), Math.floor(Math.random() * 10) + 20); // 20-30%
        
        const patternOpts = [
            'solid', 'gradient-diagonal', 'gradient-radial', 'wave-bottom', 'wave-top', 
            'diagonal-stripe', 'dots', 'circuit', 'diamond', 'split-color', 'arc-overlay', 'hexagon'
        ];
        const randomPattern = patternOpts[Math.floor(Math.random() * patternOpts.length)] as any;
        const randomHeaderPattern = patternOpts[Math.floor(Math.random() * patternOpts.length)] as any;
        
        const headerStyles = ['solid', 'gradient', 'wave', 'slanted', 'double-wave', 'two-tone', 'minimal'];
        const footerStyles = ['solid', 'gradient', 'glass', 'accent-line'];
        const randomHeaderStyle = headerStyles[Math.floor(Math.random() * headerStyles.length)] as any;
        const randomFooterStyle = footerStyles[Math.floor(Math.random() * footerStyles.length)] as any;
        
        setConfig({
            ...config,
            primary_color: primary,
            secondary_color: secondary,
            header_bg_color: headerBg,
            header_text_color: '#ffffff',
            footer_bg_color: headerBg,
            card_pattern: randomPattern,
            card_pattern_opacity: Math.floor(Math.random() * 40) + 60, // 60-100%
            header_style: randomHeaderStyle,
            header_pattern: randomHeaderPattern,
            header_pattern_opacity: Math.floor(Math.random() * 25) + 5, // 5-30% for subtle pattern in header
            footer_style: randomFooterStyle
        });
    };

    const frontSettingsJsx = (
        <div className="space-y-4" onFocusCapture={() => setPreviewSide('front')}>
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
                                    {([
                                        { id: 'solid',       label: 'Solid',       icon: '▬' },
                                        { id: 'gradient',    label: 'Gradasi',     icon: '◐' },
                                        { id: 'wave',        label: 'Lengkung',    icon: '⌒' },
                                        { id: 'slanted',     label: 'Miring',      icon: '◤' },
                                        { id: 'double-wave', label: 'Gelombang',   icon: '≈' },
                                        { id: 'two-tone',    label: 'Split',       icon: '◧' },
                                        { id: 'minimal',     label: 'Minimal',     icon: '—' },
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

                            {/* Header Background Pattern */}
                            <div className="pt-1">
                                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Pola Latar Header</Label>
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
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ukuran Logo Sekolah</Label>
                                <FontSizeInput
                                    value={config.logo_size || 24}
                                    onChange={(v: number) => setConfig({ ...config, logo_size: v })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id="show-header-1"
                                            checked={config.show_header_text !== false}
                                            onCheckedChange={(c: boolean) => setConfig({ ...config, show_header_text: c })}
                                        />
                                        <Label htmlFor="show-header-1" className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight cursor-pointer">Nama Instansi (Header 1)</Label>
                                    </div>
                                    <FontSizeInput
                                        value={config.header_font_size}
                                        onChange={(v: number) => setConfig({ ...config, header_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.header_text}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, header_text: e.target.value })}
                                    placeholder="PEMERINTAH KABUPATEN..."
                                    className="h-8 text-[11px] font-medium rounded-lg dark:bg-slate-950 dark:border-slate-800"
                                    disabled={config.show_header_text === false}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id="show-header-2"
                                            checked={config.show_subheader_text !== false}
                                            onCheckedChange={(c: boolean) => setConfig({ ...config, show_subheader_text: c })}
                                        />
                                        <Label htmlFor="show-header-2" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap">Sub Instansi (Header 2)</Label>
                                    </div>
                                    <FontSizeInput
                                        value={config.subheader_font_size}
                                        onChange={(v: number) => setConfig({ ...config, subheader_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.subheader_text}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, subheader_text: e.target.value })}
                                    placeholder="DINAS PENDIDIKAN..."
                                    className="h-8 text-[11px] font-medium rounded-lg dark:bg-slate-950 dark:border-slate-800"
                                    disabled={config.show_subheader_text === false}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id="show-school-name"
                                            checked={config.show_school_name !== false}
                                            onCheckedChange={(c: boolean) => setConfig({ ...config, show_school_name: c })}
                                        />
                                        <Label htmlFor="show-school-name" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap">Nama Sekolah</Label>
                                    </div>
                                    <FontSizeInput
                                        value={config.school_name_font_size}
                                        onChange={(v: number) => setConfig({ ...config, school_name_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.school_name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, school_name: e.target.value })}
                                    placeholder="SMK NEGERI 1..."
                                    className="h-8 text-[11px] font-bold rounded-lg dark:bg-slate-950 dark:border-slate-800"
                                    disabled={config.show_school_name === false}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id="show-school-address"
                                            checked={config.show_school_address !== false}
                                            onCheckedChange={(c: boolean) => setConfig({ ...config, show_school_address: c })}
                                        />
                                        <Label htmlFor="show-school-address" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap">Alamat Sekolah</Label>
                                    </div>
                                    <FontSizeInput
                                        value={config.school_address_font_size}
                                        onChange={(v: number) => setConfig({ ...config, school_address_font_size: v })}
                                    />
                                </div>
                                <Input
                                    value={config.school_address}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, school_address: e.target.value })}
                                    placeholder="Jl. Pendidikan No. 1..."
                                    className="h-8 text-[11px] font-medium rounded-lg dark:bg-slate-950 dark:border-slate-800"
                                    disabled={config.show_school_address === false}
                                />
                            </div>
                        </div>
                    </SettingsGroup>

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
                                        className="h-8 text-xs rounded-lg dark:bg-slate-950 dark:border-slate-800"
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
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
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

    const backSettingsJsx = (
        <div className="space-y-4" onFocusCapture={() => setPreviewSide('back')}>
            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aktifkan Cetak Dua Sisi</Label>
                                <Switch
                                    checked={!!config.show_back_side}
                                    onCheckedChange={(c: boolean) => setConfig({ ...config, show_back_side: c })}
                                    className="scale-90"
                                />
                            </div>

                            {config.show_back_side && (
                                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight mb-2 block">Varian Desain Sisi Belakang</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {([
                                                { id: 'default', label: 'Header Strip' },
                                                { id: 'minimal', label: 'Minimalis' },
                                                { id: 'full-header', label: 'Full Header Bar' },
                                                { id: 'accent-border', label: 'Bingkai Aksen' },
                                                { id: 'split-gradient', label: 'Gradasi Halus' }
                                            ] as const).map((styleOpt) => (
                                                <Button
                                                    key={styleOpt.id}
                                                    type="button"
                                                    variant={(config.back_style || 'default') === styleOpt.id ? 'primary' : 'outline'}
                                                    onClick={() => setConfig({ ...config, back_style: styleOpt.id })}
                                                    className="h-9 text-[10px] font-bold rounded-xl"
                                                >
                                                    {styleOpt.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Warna Latar</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="color"
                                                    value={config.back_bg_color || '#ffffff'}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_bg_color: e.target.value })}
                                                    className="w-8 h-8 p-1 rounded-lg cursor-pointer"
                                                />
                                                <Input
                                                    value={config.back_bg_color || '#ffffff'}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_bg_color: e.target.value })}
                                                    className="h-8 text-[10px] font-mono flex-1 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Warna Teks</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="color"
                                                    value={config.back_text_color || '#1e293b'}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_text_color: e.target.value })}
                                                    className="w-8 h-8 p-1 rounded-lg cursor-pointer"
                                                />
                                                <Input
                                                    value={config.back_text_color || '#1e293b'}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_text_color: e.target.value })}
                                                    className="h-8 text-[10px] font-mono flex-1 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                     <div className="space-y-1">
                                         <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Judul Sisi Belakang</Label>
                                         <Input
                                             value={config.back_header_text || ''}
                                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_header_text: e.target.value })}
                                             placeholder="TATA TERTIB KARTU..."
                                             className="h-8 text-[11px] rounded-lg dark:bg-slate-950 dark:border-slate-800"
                                         />
                                     </div>

                                     <div className="space-y-1">
                                         <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Tata Tertib (Baris Baru = Poin Baru)</Label>
                                         <Textarea
                                             value={config.back_rules || ''}
                                             onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig({ ...config, back_rules: e.target.value })}
                                             placeholder="Tulis aturan di sini..."
                                             rows={5}
                                             className="text-xs rounded-lg min-h-[100px] dark:bg-slate-950 dark:border-slate-800"
                                         />
                                     </div>

                                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Tampilkan Tanda Tangan & Stempel</Label>
                                            <Switch
                                                checked={!!config.back_show_signature}
                                                onCheckedChange={(c: boolean) => setConfig({ ...config, back_show_signature: c })}
                                                className="scale-90"
                                            />
                                        </div>

                                        {config.back_show_signature && (
                                            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Jabatan Penandatangan</Label>
                                                    <Input
                                                        value={config.back_signature_title || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_signature_title: e.target.value })}
                                                        placeholder="Kepala Sekolah / Kepala Perpustakaan"
                                                        className="h-8 text-xs rounded-lg bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap</Label>
                                                    <Input
                                                        value={config.back_principal_name || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_principal_name: e.target.value })}
                                                        placeholder="Nama Lengkap Penandatangan"
                                                        className="h-8 text-xs rounded-lg bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">NIP / Identifikasi</Label>
                                                    <Input
                                                        value={config.back_principal_nip || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, back_principal_nip: e.target.value })}
                                                        placeholder="NIP. 1980..."
                                                        className="h-8 text-xs rounded-lg bg-white"
                                                    />
                                                </div>

                                                {/* Upload Tanda Tangan & Stempel */}
                                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">File TTD</Label>
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                id="upload-signature-input"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, 'signature')}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => document.getElementById('upload-signature-input')?.click()}
                                                                disabled={uploadingSign}
                                                                className="w-full h-8 text-[9px] font-black uppercase tracking-wider rounded-lg"
                                                            >
                                                                {uploadingSign ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} className="mr-1" />}
                                                                {config.back_signature_image_url ? 'TTD Terunggah' : 'Pilih TTD'}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-bold text-slate-400 uppercase">File Stempel</Label>
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                id="upload-stamp-input"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, 'stamp')}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => document.getElementById('upload-stamp-input')?.click()}
                                                                disabled={uploadingStamp}
                                                                className="w-full h-8 text-[9px] font-black uppercase tracking-wider rounded-lg"
                                                            >
                                                                {uploadingStamp ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} className="mr-1" />}
                                                                {config.back_stamp_image_url ? 'Stempel Terunggah' : 'Pilih Stempel'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
        </div>
    );

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
                    {frontSettingsJsx}

                    <SettingsGroup title="Desain Sisi Belakang" defaultOpen={false}>
                        {backSettingsJsx}
                    </SettingsGroup>
                </div>
            </SectionCard>

            {/* Preview Area (Sticky on Scroll) */}
            <div className="lg:col-span-2 space-y-6 sticky top-[90px] self-start z-30 transition-all duration-300">
                <SectionCard
                    title="Live Editor Preview"
                    icon={CreditCard}
                    fullWidth
                    className="shadow-sm border-slate-100 dark:border-slate-800 overflow-hidden"
                    noPadding
                >
                    <div className="p-12 bg-slate-200/50 dark:bg-slate-950/50 flex flex-col items-center justify-center min-h-[500px] relative border-b border-slate-100 dark:border-slate-800 shadow-inner">
                        {config.show_back_side && (
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl items-center gap-1 mb-8 w-56 shadow-sm border border-slate-200/30 z-30">
                                <button
                                    type="button"
                                    className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                        previewSide === 'front' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                    onClick={() => setPreviewSide('front')}
                                >
                                    Sisi Depan
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                        previewSide === 'back' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                    onClick={() => setPreviewSide('back')}
                                >
                                    Sisi Belakang
                                </button>
                            </div>
                        )}

                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            {previewSide === 'front' ? 'Mode Desain Interaktif (Drag & Drop)' : 'Preview Desain Sisi Belakang'}
                        </div>

                        {previewSide === 'front' ? (
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
                        ) : (
                            <CardBackPreview config={config} />
                        )}

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

            {/* Focus Mode Overlay */}
            {isFocusMode && (
                <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[9999] flex flex-col overflow-hidden">
                    {/* Header Area */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={16} className="text-violet-500 animate-pulse" />
                                    Mode Fokus: Desain Kartu {cardTargetMode === 'GURU' ? 'Guru & Staf' : 'Siswa'}
                                </h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                    Fokus merancang tata tertib, tanda tangan, dan stempel secara berdampingan tanpa terganggu menu lain.
                                </p>
                            </div>

                            {setCardTargetMode && (
                                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setCardTargetMode('SISWA')}
                                        className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                                            cardTargetMode === 'SISWA'
                                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        <GraduationCap size={14} /> 🎓 Kartu Siswa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCardTargetMode('GURU')}
                                        className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                                            cardTargetMode === 'GURU'
                                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        <User size={14} /> 👔 Kartu Guru & Staf
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    onClick={() => window.dispatchEvent(new CustomEvent('save-card-config'))}
                                    disabled={isSaving}
                                    className="h-9 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                >
                                    {isSaving ? (
                                        <RefreshCw size={13} className="animate-spin" />
                                    ) : (
                                        <Save size={13} />
                                    )}
                                    Simpan Desain
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => setIsFocusMode(false)}
                                    className="h-9 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                >
                                    <Check size={14} />
                                    Selesai & Keluar
                                </Button>
                            </div>
                        </div>

                        {/* Three-Column Split Workspace */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Column 1: Front Configuration (360px fixed width) */}
                            <div className="w-[360px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto space-y-6">
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                                    Desain Sisi Depan
                                </div>
                                {frontSettingsJsx}
                            </div>

                            {/* Column 2: Center Editor Preview (Fixed/Sticky Position) */}
                            <div className="flex-1 bg-slate-100 dark:bg-slate-950/60 p-6 flex flex-col items-center justify-center overflow-hidden space-y-4 border-r border-slate-200 dark:border-slate-800 relative select-none">
                                <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-450">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Live Preview Desain Kartu
                                </div>

                                <div className="flex bg-slate-200 dark:bg-slate-850 p-1 rounded-xl items-center gap-1 w-52 shadow-sm border border-slate-300/30 z-30">
                                    <button
                                        type="button"
                                        className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            previewSide === 'front' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                        onClick={() => setPreviewSide('front')}
                                    >
                                        Sisi Depan
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            previewSide === 'back' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                        onClick={() => setPreviewSide('back')}
                                    >
                                        Sisi Belakang
                                    </button>
                                </div>

                                <div className={`transform ${
                                    config.template === 'vertical' 
                                        ? 'scale-[0.48] lg:scale-[0.52] xl:scale-[0.55]' 
                                        : 'scale-[0.62] lg:scale-[0.68] xl:scale-[0.72]'
                                } transition-all duration-200 flex items-center justify-center origin-center`}>
                                    {previewSide === 'front' ? (
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
                                    ) : (
                                        <CardBackPreview config={config} />
                                    )}
                                </div>

                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Ukuran Standard ID-1 (85.6mm x 54mm)
                                </div>
                            </div>

                            {/* Column 3: Back Configuration (360px fixed width) */}
                            <div className="w-[360px] flex-shrink-0 bg-white dark:bg-slate-900 p-6 overflow-y-auto space-y-6">
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                                    Desain Sisi Belakang
                                </div>
                                {backSettingsJsx}
                            </div>
                        </div>
                    </div>
            )}
        </div>
    );
};
