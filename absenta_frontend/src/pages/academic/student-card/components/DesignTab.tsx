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

const CARD_PRESETS: (Partial<StudentCardConfig> & { name: string })[] = [
    {
        name: 'Modern Blue Pass',
        template: 'horizontal',
        primary_color: '#2563eb',
        header_bg_color: '#1e3a8a',
        header_text_color: '#ffffff',
        show_photo: true,
        show_qrcode: true,
        header_text: 'PEMERINTAH KABUPATEN',
        subheader_text: 'DINAS PENDIDIKAN',
        school_name: 'SMA NEGERI 1 ABSENTA',
        school_address: 'Jl. Pendidikan No. 45, Absenta',
        card_title: 'KARTU IDENTITAS SISWA',
        photo_x: 25,
        photo_y: 155,
        data_x: 160,
        data_y: 155,
        qrcode_x: 480,
        qrcode_y: 165
    },
    {
        name: 'Islamic Emerald',
        template: 'horizontal',
        primary_color: '#059669',
        header_bg_color: '#064e3b',
        header_text_color: '#fef08a',
        show_photo: true,
        show_qrcode: true,
        header_text: 'YAYASAN ISLAM AL-IKHLAS',
        subheader_text: 'MADRASAH ALIYAH',
        school_name: 'MA UNGGULAN AL-IKHLAS',
        school_address: 'Jl. Masjid Raya No. 12, Absenta',
        card_title: 'KARTU TANDA ANGGOTA',
        photo_x: 25,
        photo_y: 155,
        data_x: 160,
        data_y: 155,
        qrcode_x: 480,
        qrcode_y: 165
    },
    {
        name: 'Active Red Tech',
        template: 'horizontal',
        primary_color: '#dc2626',
        header_bg_color: '#7f1d1d',
        header_text_color: '#ffffff',
        show_photo: true,
        show_qrcode: true,
        header_text: 'KEMENTERIAN PENDIDIKAN',
        subheader_text: 'SEKOLAH MENENGAH KEJURUAN',
        school_name: 'SMK TEKNOLOGI ABSENTA',
        school_address: 'Jl. Industri Kreatif No. 7, Absenta',
        card_title: 'KARTU SISWA PRAKERIN',
        photo_x: 25,
        photo_y: 155,
        data_x: 160,
        data_y: 155,
        qrcode_x: 480,
        qrcode_y: 165
    },
    {
        name: 'Vertical Modern Blue',
        template: 'vertical',
        primary_color: '#2563eb',
        header_bg_color: '#1e3a8a',
        header_text_color: '#ffffff',
        show_photo: true,
        show_qrcode: true,
        header_text: 'KARTU IDENTITAS',
        subheader_text: 'SMA NEGERI 1 ABSENTA',
        school_name: 'SMAN 1 ABSENTA',
        school_address: 'Jl. Pendidikan No. 45',
        card_title: 'STUDENT PASS',
        photo_x: 110,
        photo_y: 155,
        data_x: 25,
        data_y: 350,
        qrcode_x: 250,
        qrcode_y: 350
    },
    {
        name: 'Vertical Islamic Green',
        template: 'vertical',
        primary_color: '#059669',
        header_bg_color: '#064e3b',
        header_text_color: '#ffffff',
        show_photo: true,
        show_qrcode: true,
        header_text: 'MADRASAH ALIYAH',
        subheader_text: 'MA UNGGULAN AL-IKHLAS',
        school_name: 'MA AL-IKHLAS',
        school_address: 'Jl. Masjid Raya No. 12',
        card_title: 'KARTU ANGGOTA',
        photo_x: 110,
        photo_y: 155,
        data_x: 25,
        data_y: 350,
        qrcode_x: 250,
        qrcode_y: 350
    },
    {
        name: 'Vertical Dark Slate',
        template: 'vertical',
        primary_color: '#374151',
        header_bg_color: '#111827',
        header_text_color: '#f3f4f6',
        show_photo: true,
        show_qrcode: true,
        header_text: 'ACADEMY PASS',
        subheader_text: 'EXCLUSIVE HIGH SCHOOL',
        school_name: 'ABSENTA HIGH SCHOOL',
        school_address: 'Downtown Street No. 9',
        card_title: 'STUDENT IDENTITY',
        photo_x: 110,
        photo_y: 155,
        data_x: 25,
        data_y: 350,
        qrcode_x: 250,
        qrcode_y: 350
    }
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
                            <div className="grid grid-cols-2 gap-2">
                                {CARD_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => setConfig({
                                            ...config,
                                            ...preset,
                                            school_name: config.school_name || sekolah?.nama || preset.school_name || '',
                                            school_address: config.school_address || sekolah?.alamat || preset.school_address || '',
                                            logo_url: config.logo_url || sekolah?.logo_url || preset.logo_url || ''
                                        })}
                                        className={`p-2 rounded-xl text-left border transition-all duration-300 hover:border-blue-400 group relative overflow-hidden flex flex-col justify-between h-20 ${
                                            config.primary_color === preset.primary_color && config.template === preset.template
                                                ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 ring-2 ring-blue-500/20'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 z-10">
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: preset.primary_color }} />
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: preset.header_bg_color }} />
                                        </div>
                                        <div className="z-10">
                                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 block truncate leading-snug uppercase tracking-tight">{preset.name}</span>
                                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{preset.template}</span>
                                        </div>
                                        <div className="absolute right-[-10px] bottom-[-10px] w-8 h-8 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-500" style={{ backgroundColor: preset.primary_color }} />
                                    </button>
                                ))}
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
