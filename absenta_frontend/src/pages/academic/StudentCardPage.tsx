import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Settings,
    LayoutTemplate,
    Shield,
    CreditCard,
    Save,
    Users,
    GraduationCap,
    User
} from 'lucide-react';
import { getSiswaList } from '../../api/academic/siswa.api';
import { getGuruList } from '../../api/academic/guru.api';
import { getKelasList } from '../../api/academic/kelas.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { getTenantById } from '../../api/tenants.api';
import { studentCardConfigApi } from '../../api/academic/student-card-config.api';
import { RefreshCw, Layout, Printer as PrinterIcon } from 'lucide-react';
import {
    Button,
    SectionCard,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Loader
} from '../../components/ui';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

import type {
    StudentCardConfig,
    PrintConfig
} from '../../components/academic/student-card/types';
import {
    DEFAULT_CONFIG,
    DEFAULT_PRINT_CONFIG,
    PAPER_SIZES
} from '../../components/academic/student-card/constants';

// Local Components with Lazy Loading
import { CARD_PRESETS } from './student-card/components/DesignTab';
const DesignTab = lazy(() => import('./student-card/components/DesignTab').then(m => ({ default: m.DesignTab })));
const DataTab = lazy(() => import('./student-card/components/DataTab').then(m => ({ default: m.DataTab })));
const PrintTab = lazy(() => import('./student-card/components/PrintTab').then(m => ({ default: m.PrintTab })));
const PrintOverlay = lazy(() => import('./student-card/components/PrintOverlay').then(m => ({ default: m.PrintOverlay })));

const TL = TabsList;

const StudentCardPage = () => {
    const { user, isAdmin } = useAuth();

    const role = user?.role?.name;
    const isSiswa = role === 'SISWA';
    const isGuru = role === 'GURU' || role === 'WALIKELAS';

    const canView = user?.capabilities?.includes('academic.student.card.view.config') || isAdmin();
    const canEdit = user?.capabilities?.includes('academic.student.card.update.config') || isAdmin();

    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(isSiswa ? 'print' : ((isGuru && !canView) ? 'data' : 'design'));
    const [cardTargetMode, setCardTargetMode] = useState<'SISWA' | 'GURU'>('SISWA');
    const [printConfig, setPrintConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);
    const [selectedKelas, setSelectedKelas] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [previewStudentId, setPreviewStudentId] = useState<string>('');
    const [config, setConfig] = useState<StudentCardConfig>(DEFAULT_CONFIG);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printMode, setPrintMode] = useState<'single' | 'multi'>('multi');

    const printTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const breadcrumbs = useMemo(() => [
        { label: 'Akademik' },
        { label: 'Kartu Pelajar' }
    ], []);

    const tabOptions = useMemo(() => {
        const list = [];
        if (canView) {
            list.push({ id: 'design', label: 'Desain Kartu', icon: Layout, colorClass: 'text-blue-600 dark:text-blue-400' });
        }
        if (!isSiswa) {
            list.push({ id: 'data', label: 'Pilih Siswa', icon: Users, colorClass: 'text-indigo-600 dark:text-indigo-400' });
        }
        list.push({ id: 'print', label: 'Preview & Cetak', icon: PrinterIcon, colorClass: 'text-violet-600 dark:text-violet-400' });
        return list;
    }, [canView, isSiswa]);

    useEffect(() => {
        return () => {
            if (printTimeoutRef.current !== null) {
                clearTimeout(printTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isSiswa && activeTab !== 'print') setActiveTab('print');
        if (isGuru && !canView && activeTab === 'design') setActiveTab('data');
    }, [isSiswa, isGuru, canView, activeTab]);

    useEffect(() => {
        if (isSiswa) setPrintMode('single');
    }, [isSiswa]);

    // Queries
    const { data: sekolahResponse } = useQuery({
        queryKey: ['sekolah-profile'],
        queryFn: sekolahApi.getProfile
    });
    const sekolah = sekolahResponse || null;

    // Fetch tenant info — same source as kopsurat (letterhead)
    const { data: tenantResponse } = useQuery({
        queryKey: ['tenant-info', user?.tenant_id],
        queryFn: () => getTenantById(user!.tenant_id),
        enabled: !!user?.tenant_id,
    });
    const tenantInfo = tenantResponse?.data || tenantResponse || null;

    const { data: remoteConfigResponse, isLoading: isLoadingConfig, error: configError } = useQuery({
        queryKey: ['student-card-config'],
        queryFn: studentCardConfigApi.getConfig,
        retry: false
    });

    const remoteConfig = remoteConfigResponse || null;

    const { data: kelasListResponse } = useQuery({
        queryKey: ['kelas-list'],
        queryFn: () => getKelasList(1, 100),
        enabled: !isSiswa
    });

    const kelasOptions = useMemo(() => {
        const list = kelasListResponse?.data?.map((k) => ({
            label: k.nama_kelas,
            value: k.id
        })) || [];
        return [{ label: 'Semua Kelas', value: 'all' }, ...list];
    }, [kelasListResponse]);

    const { data: rawSiswaData, isLoading: isLoadingSiswa } = useQuery({
        queryKey: ['siswa-list', selectedKelas, debouncedSearch, isSiswa, user?.id],
        queryFn: () => getSiswaList(
            1,
            100,
            debouncedSearch,
            selectedKelas === 'all' ? '' : selectedKelas,
            'AKTIF',
            '',
            isSiswa ? user?.id : ''
        )
    });

    const { data: rawGuruData, isLoading: isLoadingGuru } = useQuery({
        queryKey: ['guru-list', debouncedSearch],
        queryFn: () => getGuruList(1, 100, debouncedSearch),
        enabled: cardTargetMode === 'GURU'
    });

    const siswaData = useMemo(() => {
        if (cardTargetMode === 'GURU') {
            if (!rawGuruData) return undefined;
            return {
                ...rawGuruData,
                data: rawGuruData.data || []
            };
        }
        if (!rawSiswaData) return undefined;
        return {
            ...rawSiswaData,
            data: rawSiswaData.data?.filter((s) => s.status === 'AKTIF' && s.kelas_id) || []
        };
    }, [cardTargetMode, rawGuruData, rawSiswaData]);

    const previewStudent = useMemo(() =>
        siswaData?.data?.find((s) => s.id === previewStudentId),
        [siswaData, previewStudentId]
    );

    useEffect(() => {
        if (siswaData?.data && siswaData.data.length > 0 && !previewStudentId) {
            setPreviewStudentId(siswaData.data[0].id);
        }
    }, [siswaData, previewStudentId]);

    // Consistent with kopsurat: tenantInfo is the primary source, sekolah is a fallback
    // tenantInfo.name       → school name
    // tenantInfo.address    → school address
    // tenantInfo.logo_url   → school logo
    // tenantInfo.nama_dinas_atas    → header line 1
    // tenantInfo.nama_dinas_bawah   → header line 2 / subheader
    const sekolahData = (sekolah as any)?.data || sekolah;
    const resolvedName: string    = (tenantInfo as any)?.name    || sekolahData?.nama    || '';
    const resolvedAddress: string = (tenantInfo as any)?.address || sekolahData?.alamat  || '';
    const resolvedLogo: string    = (tenantInfo as any)?.logo_url || sekolahData?.logo_url || '';
    const resolvedHeader: string  = (tenantInfo as any)?.nama_dinas_atas   || '';
    const resolvedSubheader: string = (tenantInfo as any)?.nama_dinas_bawah || '';

    useEffect(() => {
        if (remoteConfig) {
            let activeConfig: any = { ...remoteConfig };

            if (cardTargetMode === 'GURU') {
                let savedGuruConfig = null;
                if (remoteConfig.layout_presets) {
                    try {
                        const presets = JSON.parse(remoteConfig.layout_presets);
                        if (presets.guru_active_config) {
                            savedGuruConfig = presets.guru_active_config;
                        }
                    } catch (e) {
                        console.error('Error parsing layout presets:', e);
                    }
                }
                
                if (savedGuruConfig) {
                    activeConfig = {
                        ...remoteConfig,
                        ...savedGuruConfig,
                    };
                } else {
                    // Strictly fallback to DEFAULT_GURU_CONFIG for styling, only keep school metadata
                    activeConfig = {
                        ...DEFAULT_GURU_CONFIG,
                        school_name: remoteConfig.school_name || DEFAULT_GURU_CONFIG.school_name || '',
                        school_address: remoteConfig.school_address || DEFAULT_GURU_CONFIG.school_address || '',
                        logo_url: remoteConfig.logo_url || DEFAULT_GURU_CONFIG.logo_url || '',
                        header_text: remoteConfig.header_text || DEFAULT_GURU_CONFIG.header_text || '',
                        subheader_text: remoteConfig.subheader_text || DEFAULT_GURU_CONFIG.subheader_text || '',
                        layout_presets: remoteConfig.layout_presets,
                    };
                }
            } else {
                // SISWA Mode
                let savedSiswaConfig = null;
                if (remoteConfig.layout_presets) {
                    try {
                        const presets = JSON.parse(remoteConfig.layout_presets);
                        if (presets.siswa_active_config) {
                            savedSiswaConfig = presets.siswa_active_config;
                        }
                    } catch (e) {
                        console.error('Error parsing layout presets:', e);
                    }
                }

                if (savedSiswaConfig) {
                    activeConfig = {
                        ...remoteConfig,
                        ...savedSiswaConfig,
                    };
                } else {
                    // Fallback to remoteConfig root columns (historical Siswa config) over DEFAULT_CONFIG
                    activeConfig = {
                        ...DEFAULT_CONFIG,
                        ...remoteConfig,
                    };
                }
            }

            setConfig({
                ...activeConfig,
                // tenantInfo (kopsurat source) takes priority
                school_name: resolvedName    || activeConfig.school_name    || '',
                school_address: resolvedAddress || activeConfig.school_address || '',
                logo_url:    resolvedLogo    || activeConfig.logo_url       || '',
            });

            setPrintConfig(prev => ({
                ...prev,
                paperSize: (remoteConfig.print_paper_size as any) || prev.paperSize,
                orientation: (remoteConfig.print_orientation as any) || prev.orientation,
                marginTop: remoteConfig.print_margin_top ?? prev.marginTop,
                marginBottom: remoteConfig.print_margin_bottom ?? prev.marginBottom,
                marginLeft: remoteConfig.print_margin_left ?? prev.marginLeft,
                marginRight: remoteConfig.print_margin_right ?? prev.marginRight,
                gapX: remoteConfig.print_gap_x ?? prev.gapX,
                gapY: remoteConfig.print_gap_y ?? prev.gapY,
                customWidth: remoteConfig.print_custom_width ?? prev.customWidth,
                customHeight: remoteConfig.print_custom_height ?? prev.customHeight,
                autoCenterX: remoteConfig.print_auto_center_x ?? prev.autoCenterX,
                autoCenterY: remoteConfig.print_auto_center_y ?? prev.autoCenterY,
            }));
        } else {
            const defaultConfig = cardTargetMode === 'GURU' ? DEFAULT_GURU_CONFIG : DEFAULT_CONFIG;
            setConfig(prev => ({
                ...prev,
                ...defaultConfig,
                school_name: resolvedName || prev.school_name || '',
                school_address: resolvedAddress || prev.school_address || '',
                logo_url: resolvedLogo || prev.logo_url || '',
                header_text: resolvedHeader || prev.header_text || 'PEMERINTAH KABUPATEN',
                subheader_text: resolvedSubheader || prev.subheader_text || 'DINAS PENDIDIKAN',
            }));
        }
    }, [remoteConfig, resolvedName, resolvedAddress, resolvedLogo, resolvedHeader, resolvedSubheader, cardTargetMode]);

    const saveConfigMutation = useMutation({
        mutationFn: studentCardConfigApi.updateConfig,
        onSuccess: () => {
            toast.success('Konfigurasi berhasil disimpan');
            queryClient.invalidateQueries({ queryKey: ['student-card-config'] });
        },
        onError: () => {
            toast.error('Gagal menyimpan konfigurasi');
        }
    });

    const handleSaveConfig = useCallback(() => {
        const cleanConfig = { ...config };
        
        // Parse current presets overrides
        let currentPresets: Record<string, any> = {};
        try {
            currentPresets = config.layout_presets ? JSON.parse(config.layout_presets) : {};
        } catch (e) {
            console.error('Error parsing layout presets:', e);
        }

        // Save current active config values under the active preset name
        const defaultPresetName = cardTargetMode === 'GURU' ? 'Executive Pegawai (Slate & Gold)' : 'Vertical - Versi 1';
        const presetName = config.selected_preset || defaultPresetName;
        const activeConfigValues = {
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
            school_name: config.school_name,
            school_address: config.school_address,
            header_text: config.header_text,
            subheader_text: config.subheader_text,
            logo_url: config.logo_url,
            show_header_text: config.show_header_text,
            show_subheader_text: config.show_subheader_text,
            show_school_name: config.show_school_name,
            show_school_address: config.show_school_address,
            selected_preset: presetName
        };

        currentPresets[presetName] = activeConfigValues;

        // ALSO save to target-specific active config key
        const activePresetKey = cardTargetMode === 'GURU' ? 'guru_active_config' : 'siswa_active_config';
        currentPresets[activePresetKey] = activeConfigValues;

        cleanConfig.layout_presets = JSON.stringify(currentPresets);

        // For backward compatibility / root direct reads, sync root fields with Siswa design
        if (cardTargetMode === 'SISWA') {
            Object.assign(cleanConfig, activeConfigValues);
        }

        // Merge Print Config
        cleanConfig.print_paper_size = printConfig.paperSize;
        cleanConfig.print_orientation = printConfig.orientation;
        cleanConfig.print_margin_top = printConfig.marginTop;
        cleanConfig.print_margin_bottom = printConfig.marginBottom;
        cleanConfig.print_margin_left = printConfig.marginLeft;
        cleanConfig.print_margin_right = printConfig.marginRight;
        cleanConfig.print_gap_x = printConfig.gapX;
        cleanConfig.print_gap_y = printConfig.gapY;
        cleanConfig.print_custom_width = printConfig.customWidth;
        cleanConfig.print_custom_height = printConfig.customHeight;
        cleanConfig.print_auto_center_x = printConfig.autoCenterX;
        cleanConfig.print_auto_center_y = printConfig.autoCenterY;

        saveConfigMutation.mutate(cleanConfig);
    }, [config, printConfig, cardTargetMode, saveConfigMutation]);

    const handleDragEnd = useCallback((field: 'photo' | 'qrcode' | 'data', info: { offset: { x: number; y: number } }) => {
        const { x, y } = info.offset;
        if (field === 'photo') {
            setConfig(prev => ({
                ...prev,
                photo_x: prev.photo_x + x,
                photo_y: prev.photo_y + y
            }));
        } else if (field === 'qrcode') {
            setConfig(prev => ({
                ...prev,
                qrcode_x: prev.qrcode_x + x,
                qrcode_y: prev.qrcode_y + y
            }));
        } else if (field === 'data') {
            setConfig(prev => ({
                ...prev,
                data_x: (prev.data_x || 0) + x,
                data_y: (prev.data_y || 0) + y
            }));
        }
    }, []);

    const handlePrint = useCallback(() => {
        setIsPrinting(true);
        printTimeoutRef.current = setTimeout(() => {
            window.print();
            setIsPrinting(false);
            printTimeoutRef.current = null;
        }, 500);
    }, []);

    const printLayout = useMemo(() => {
        const paperW = printConfig.paperSize === 'Custom' ? (printConfig.customWidth || 210) : PAPER_SIZES[printConfig.paperSize].width;
        const paperH = printConfig.paperSize === 'Custom' ? (printConfig.customHeight || 297) : PAPER_SIZES[printConfig.paperSize].height;

        const finalW = printConfig.orientation === 'portrait' ? paperW : paperH;
        const finalH = printConfig.orientation === 'portrait' ? paperH : paperW;

        const cardW = config.template === 'vertical' ? 54 : 85.6;
        const cardH = config.template === 'vertical' ? 85.6 : 54;

        const availW = finalW - printConfig.marginLeft - printConfig.marginRight;
        const availH = finalH - printConfig.marginTop - printConfig.marginBottom;

        const cols = Math.max(1, Math.floor((availW + printConfig.gapX) / (cardW + printConfig.gapX)));
        const rows = Math.max(1, Math.floor((availH + printConfig.gapY) / (cardH + printConfig.gapY)));

        const contentW = cols * cardW + (cols - 1) * printConfig.gapX;
        const contentH = rows * cardH + (rows - 1) * printConfig.gapY;

        let effectiveMarginLeft = printConfig.marginLeft;
        let effectiveMarginTop = printConfig.marginTop;

        if (printConfig.autoCenterX) {
            effectiveMarginLeft = (finalW - contentW) / 2;
        }

        if (printConfig.autoCenterY) {
            effectiveMarginTop = (finalH - contentH) / 2;
        }

        const itemsPerPage = cols * rows;

        return { finalW, finalH, cardW, cardH, cols, rows, itemsPerPage, effectiveMarginLeft, effectiveMarginTop };
    }, [printConfig, config.template]);

    const studentsToPrint = useMemo(() => {
        if (printMode === 'single') {
            return previewStudent ? [previewStudent] : [];
        }
        return siswaData?.data?.filter((s) => selectedStudents.includes(s.id)) || [];
    }, [siswaData, selectedStudents, printMode, previewStudent]);

    const pages = useMemo(() => {
        const pgs = [];
        for (let i = 0; i < studentsToPrint.length; i += printLayout.itemsPerPage) {
            pgs.push(studentsToPrint.slice(i, i + printLayout.itemsPerPage));
        }
        return pgs;
    }, [studentsToPrint, printLayout]);

    const toggleStudent = useCallback((id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    }, []);

    const selectAll = useCallback(() => {
        if (siswaData?.data) {
            if (selectedStudents.length === siswaData.data.length) {
                setSelectedStudents([]);
            } else {
                setSelectedStudents(siswaData.data.map((s) => s.id));
            }
        }
    }, [siswaData, selectedStudents]);

    const academicStats = useMemo(() => [
        {
            title: "Total Siswa",
            value: (siswaData as any)?.pagination?.totalItems || siswaData?.data?.length || 0,
            icon: <Users size={14} className="text-white" />,
            gradient: "from-slate-600 to-slate-800",
            subtitle: "Basis data identitas"
        },
        {
            title: "Antrean Cetak",
            value: `${selectedStudents.length} Siswa`,
            icon: <CreditCard size={14} className="text-white" />,
            gradient: selectedStudents.length > 0 ? "from-blue-600 to-indigo-700" : "from-slate-400 to-slate-500",
            subtitle: "Siap diproses batch"
        },
        {
            title: "Layout Aktif",
            value: config.template === 'horizontal' ? 'Landscape' : 'Portrait',
            icon: <LayoutTemplate size={14} className="text-white" />,
            gradient: "from-emerald-500 to-teal-700",
            subtitle: "Format desain kartu"
        }
    ], [siswaData, selectedStudents.length, config.template]);

    const pageToolbar = (
        <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'design' && canEdit && (
                <Button
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={handleSaveConfig}
                    disabled={saveConfigMutation.isPending}
                >
                    {saveConfigMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-3.5 h-3.5 mr-2" />
                    )}
                    Simpan Desain
                </Button>
            )}

            {activeTab === 'print' && (
                <Button
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={handlePrint}
                    disabled={isPrinting || studentsToPrint.length === 0}
                >
                    <PrinterIcon className="w-3.5 h-3.5 mr-2" />
                    Cetak {studentsToPrint.length} Kartu
                </Button>
            )}

            {activeTab === 'data' && (
                <div className="flex items-center gap-2">
                    <Button
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={selectAll}
                    >
                        <CreditCard className="w-3.5 h-3.5 mr-2" />
                        {selectedStudents.length === (siswaData?.data?.length || 0) && (siswaData?.data?.length || 0) > 0 ? 'Batal Semua' : 'Pilih Semua'}
                    </Button>
                </div>
            )}
            
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />
            
            <Button
                variant="toolbarOutline"
                size="toolbarIcon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['siswa-list'] })}
                title="Refresh Data"
            >
                <RefreshCw size={14} />
            </Button>
        </div>
    );

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700">
                <SectionCard className="max-w-md w-full p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20">
                        <Shield className="w-10 h-10 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Akses Terbatas</h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Anda tidak memiliki izin otorisasi untuk mengelola sistem Kartu Pelajar.
                        </p>
                    </div>
                    <Button onClick={() => window.history.back()} variant="toolbarOutline" className="h-12 w-full rounded-xl font-black uppercase tracking-widest text-[10px]">
                        Kembali ke Dashboard
                    </Button>
                </SectionCard>
            </div>
        );
    }

    if (configError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Settings className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Akses Ditolak</h1>
                    <p className="text-slate-600 mb-6">
                        Anda tidak memiliki izin untuk mengakses halaman Kartu Pelajar.
                        Silakan hubungi Administrator jika Anda memerlukan akses ini.
                    </p>
                    <Button onClick={() => window.history.back()} variant="outline">
                        Kembali
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <AcademicPageLayout
            title={cardTargetMode === 'GURU' ? 'Kartu Identitas Pegawai & Guru' : 'Kartu Pelajar Digital'}
            description={cardTargetMode === 'GURU' ? 'Desain dan cetak kartu identitas pegawai/guru dengan barcode RFID & pasfoto formal.' : 'Desain kartu pelajar dan cetak kartu RFID untuk siswa. Digunakan kapan saja saat pembuatan atau penggantian kartu siswa.'}
            stats={academicStats}
            toolbar={pageToolbar}
            breadcrumbs={breadcrumbs}
            hardeningModuleKey="studentcard"
            instruction={{
                title: cardTargetMode === 'GURU' ? 'Panduan Kartu Pegawai' : 'Panduan Kartu Pelajar',
                description: (
                  <div className="space-y-2">
                    <p>Merancang tampilan kartu pelajar sekolah dan mencetak kartu secara massal dengan kode QR.</p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
                      <p><strong>Fungsi:</strong> Mendesain dan mencetak kartu pelajar siswa.</p>
                      <p><strong>Waktu Penggunaan:</strong> Kapan saja saat menyambut siswa baru atau mencetak kartu pengganti yang hilang.</p>
                    </div>
                  </div>
                ),
                items: [
                    { text: "Tab Desain: Geser (drag) elemen Foto, QR, dan Data pada kartu untuk mengatur tata letak." },
                    { text: "Tab Pilih Siswa: Gunakan filter kelas dan centang siswa yang ingin dicetak kartunya." },
                    { text: "Tab Preview: Pastikan ukuran kertas dan margin sesuai dengan printer Anda." },
                    { text: "Gunakan kertas PVC atau Glossy tebal untuk hasil identitas yang lebih profesional." }
                ]
            }}
        >
        <div className="p-1 space-y-4">
            {/* Global Category Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                        <CreditCard size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide">Target Desain & Cetak</h3>
                        <p className="text-[11px] text-slate-400 font-bold">Pilih kategori kartu identitas yang ingin dikelola</p>
                    </div>
                </div>
                
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            setCardTargetMode('SISWA');
                            setSelectedStudents([]);
                            setPreviewStudentId('');
                        }}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                            cardTargetMode === 'SISWA'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <GraduationCap size={14} /> 🎓 Kartu Siswa
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCardTargetMode('GURU');
                            setSelectedStudents([]);
                            setPreviewStudentId('');
                        }}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                            cardTargetMode === 'GURU'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <User size={14} /> 👔 Kartu Guru & Staf
                    </button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <TabSwitcher
                        options={tabOptions}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                </div>

                    <Suspense fallback={<div className="flex justify-center p-12"><Loader size="lg" /></div>}>
                        {canView && (
                            <TabsContent value="design" className="p-6 focus-visible:ring-0">
                                <DesignTab 
                                    config={config}
                                    setConfig={setConfig}
                                    handleDragEnd={handleDragEnd}
                                    previewStudent={previewStudent}
                                    sekolah={tenantInfo || sekolahData}
                                />
                            </TabsContent>
                        )}

                        {!isSiswa && (
                            <TabsContent value="data" className="p-6 focus-visible:ring-0">
                                <DataTab 
                                    isGuru={isGuru}
                                    cardTargetMode={cardTargetMode}
                                    setCardTargetMode={(m) => {
                                        setCardTargetMode(m);
                                        setSelectedStudents([]);
                                        setPreviewStudentId('');
                                        const targetPresetName = m === 'GURU' ? 'Executive Pegawai (Slate & Gold)' : 'Horizontal - Versi 1 (Siswa)';
                                        const preset = CARD_PRESETS.find(p => p.name === targetPresetName);
                                        if (preset) {
                                            setConfig(prev => ({
                                                ...prev,
                                                ...preset,
                                                selected_preset: preset.name,
                                                school_name: prev.school_name || preset.school_name,
                                                school_address: prev.school_address || preset.school_address,
                                                header_text: prev.header_text || preset.header_text,
                                                subheader_text: prev.subheader_text || preset.subheader_text,
                                                logo_url: prev.logo_url || preset.logo_url
                                            }));
                                        }
                                    }}
                                    selectedKelas={selectedKelas}
                                    setSelectedKelas={setSelectedKelas}
                                    kelasOptions={kelasOptions}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    selectedStudents={selectedStudents}
                                    siswaData={siswaData}
                                    isLoadingSiswa={cardTargetMode === 'GURU' ? isLoadingGuru : isLoadingSiswa}
                                    previewStudentId={previewStudentId}
                                    setPreviewStudentId={setPreviewStudentId}
                                    toggleStudent={toggleStudent}
                                    selectAll={selectAll}
                                />
                            </TabsContent>
                        )}

                        <TabsContent value="print" className="p-6 focus-visible:ring-0">
                            <PrintTab 
                                isSiswa={isSiswa}
                                printMode={printMode}
                                setPrintMode={setPrintMode}
                                selectedStudents={selectedStudents}
                                printConfig={printConfig}
                                setPrintConfig={setPrintConfig}
                                studentsToPrint={studentsToPrint}
                                handlePrint={handlePrint}
                                isPrinting={isPrinting}
                                printLayout={printLayout}
                                pages={pages}
                                config={config}
                                sekolah={sekolah}
                            />
                        </TabsContent>
                    </Suspense>
                </Tabs>

                <Suspense fallback={null}>
                    <PrintOverlay 
                        isPrinting={isPrinting}
                        pages={pages}
                        printLayout={printLayout}
                        printConfig={printConfig}
                        config={config}
                        sekolah={sekolah}
                    />
                </Suspense>
            </div>
        </AcademicPageLayout>
    );
};

export default StudentCardPage;
