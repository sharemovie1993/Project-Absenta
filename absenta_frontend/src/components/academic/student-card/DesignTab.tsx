import React from 'react';
import { 
    SectionCard, 
    Badge,
    Button
} from '@/components/ui';
import { 
    Settings, 
    CreditCard,
    Printer as PrinterIcon,
    Sparkles,
    Check,
    Save,
    RefreshCw,
    GraduationCap,
    User
} from 'lucide-react';
import { SettingsGroup } from '@/components/academic/student-card/SettingsGroup';
import { PreviewCard } from '@/components/academic/student-card/PreviewCard';
import { CardBackPreview } from '@/components/academic/student-card/CardBackPreview';
import type { StudentCardConfig } from '@/components/academic/student-card/types';
import axiosInstance from '@/lib/axiosInstance';
import { CARD_PRESETS, hslToHex } from './cardPresets';
import { FrontSettingsPanel } from './FrontSettingsPanel';
import { BackSettingsPanel } from './BackSettingsPanel';

interface DesignTabProps {
    config: StudentCardConfig;
    setConfig: React.Dispatch<React.SetStateAction<StudentCardConfig>>;
    handleDragEnd: (field: 'photo' | 'qrcode' | 'data' | 'header' | 'title', info: any) => void;
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

        let currentPresets: Record<string, any> = {};
        try {
            currentPresets = config.layout_presets ? JSON.parse(config.layout_presets) : {};
        } catch (e) {
            console.error('Error parsing layout presets:', e);
        }

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
        
        const sPrim = Math.floor(Math.random() * 20) + 70; // 70-90%
        const lPrim = Math.floor(Math.random() * 15) + 35; // 35-50%
        const primary = hslToHex(h, sPrim, lPrim);
        
        const sSec = Math.floor(Math.random() * 15) + 15;  // 15-30%
        const lSec = Math.floor(Math.random() * 3) + 95;   // 95-98%
        const secondary = Math.random() > 0.4 ? hslToHex(h, sSec, lSec) : '#ffffff';
        
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
                    <FrontSettingsPanel
                        config={config}
                        setConfig={setConfig}
                        sekolah={sekolah}
                        cardTargetMode={cardTargetMode}
                        applyPreset={applyPreset}
                        handleRandomStyle={handleRandomStyle}
                        setPreviewSide={setPreviewSide}
                    />

                    <SettingsGroup title="Desain Sisi Belakang" defaultOpen={false}>
                        <BackSettingsPanel
                            config={config}
                            setConfig={setConfig}
                            handleImageUpload={handleImageUpload}
                            uploadingStamp={uploadingStamp}
                            uploadingSign={uploadingSign}
                            setPreviewSide={setPreviewSide}
                        />
                    </SettingsGroup>
                </div>
            </SectionCard>

            {/* Preview Area */}
            <div className="lg:col-span-2 space-y-6 sticky top-[130px] self-start z-30">
                <SectionCard
                    title="Live Editor Preview"
                    icon={CreditCard}
                    fullWidth
                    className="shadow-sm border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col"
                    noPadding
                >
                    <div className="p-6 lg:p-8 bg-slate-200/50 dark:bg-slate-950/50 flex-1 flex flex-col items-center justify-center relative border-b border-slate-100 dark:border-slate-800 shadow-inner">
                        {config.show_back_side && (
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl items-center gap-1 mb-3 w-56 shadow-sm border border-slate-200/30 z-30">
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

                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            {previewSide === 'front' ? 'Mode Desain Interaktif (Drag & Drop)' : 'Preview Desain Sisi Belakang'}
                        </div>

                        <div className="transform scale-[0.50] transition-all duration-200 flex items-center justify-center origin-center my-[-100px]">
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
                        {/* Column 1: Front Configuration */}
                        <div className="w-[360px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto space-y-6">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                                Desain Sisi Depan
                            </div>
                            <FrontSettingsPanel
                                config={config}
                                setConfig={setConfig}
                                sekolah={sekolah}
                                cardTargetMode={cardTargetMode}
                                applyPreset={applyPreset}
                                handleRandomStyle={handleRandomStyle}
                                setPreviewSide={setPreviewSide}
                            />
                        </div>

                        {/* Column 2: Center Editor Preview */}
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

                        {/* Column 3: Back Configuration */}
                        <div className="w-[360px] flex-shrink-0 bg-white dark:bg-slate-900 p-6 overflow-y-auto space-y-6">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                                Desain Sisi Belakang
                            </div>
                            <BackSettingsPanel
                                config={config}
                                setConfig={setConfig}
                                handleImageUpload={handleImageUpload}
                                uploadingStamp={uploadingStamp}
                                uploadingSign={uploadingSign}
                                setPreviewSide={setPreviewSide}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
