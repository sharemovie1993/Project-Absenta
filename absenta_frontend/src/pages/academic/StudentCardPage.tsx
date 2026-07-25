import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { z } from 'zod';
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
    User,
    Maximize2
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
    DEFAULT_GURU_CONFIG,
    DEFAULT_PRINT_CONFIG,
    PAPER_SIZES
} from '../../components/academic/student-card/constants';
import { 
    SekolahProfileData, 
    TenantInfoData, 
    cardConfigSchema, 
    calculatePrintLayout 
} from '../../components/academic/student-card/cardPresets';


// Local Components with Lazy Loading
import { CARD_PRESETS } from '../../components/academic/student-card/cardPresets';
const DesignTab = lazy(() => import('../../components/academic/student-card/DesignTab').then(m => ({ default: m.DesignTab })));
const DataTab = lazy(() => import('../../components/academic/student-card/DataTab').then(m => ({ default: m.DataTab })));
const PrintTab = lazy(() => import('../../components/academic/student-card/PrintTab').then(m => ({ default: m.PrintTab })));
const PrintOverlay = lazy(() => import('../../components/academic/student-card/PrintOverlay').then(m => ({ default: m.PrintOverlay })));
import { AccessRestricted, ConfigErrorState } from '../../components/academic/student-card/StudentCardErrorStates';



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
    const sekolahData = (sekolah as SekolahProfileData | undefined)?.data || sekolah;
    const resolvedName: string    = (tenantInfo as TenantInfoData | undefined)?.name    || (sekolahData as SekolahProfileData | undefined)?.nama    || '';
    const resolvedAddress: string = (tenantInfo as TenantInfoData | undefined)?.address || (sekolahData as SekolahProfileData | undefined)?.alamat  || '';
    const resolvedLogo: string    = (tenantInfo as TenantInfoData | undefined)?.logo_url || (sekolahData as SekolahProfileData | undefined)?.logo_url || '';
    const resolvedHeader: string  = (tenantInfo as TenantInfoData | undefined)?.nama_dinas_atas   || '';
    const resolvedSubheader: string = (tenantInfo as TenantInfoData | undefined)?.nama_dinas_bawah || '';

    useEffect(() => {
        if (remoteConfig) {
            let activeConfig: Partial<StudentCardConfig> = { ...remoteConfig };

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
                        ...DEFAULT_GURU_CONFIG,
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
                        ...DEFAULT_CONFIG,
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

            const resolvedKepsek = sekolahData?.kepala_sekolah || '';
            const resolvedNipKepsek = sekolahData?.nip_kepala || '';

            const finalKepsek = resolvedKepsek || 
                (activeConfig.back_principal_name === 'Nama Kepala Sekolah, M.Pd' ? '' : activeConfig.back_principal_name) || 
                'Nama Kepala Sekolah, M.Pd';
            
            const finalNip = resolvedNipKepsek || 
                (activeConfig.back_principal_nip === 'NIP. 198001012005011001' ? '' : activeConfig.back_principal_nip) || 
                'NIP. 198001012005011001';

            setConfig({
                ...activeConfig,
                // tenantInfo (kopsurat source) takes priority
                school_name: resolvedName    || activeConfig.school_name    || '',
                school_address: resolvedAddress || activeConfig.school_address || '',
                logo_url:    resolvedLogo    || activeConfig.logo_url       || '',
                back_signature_title: activeConfig.back_signature_title || 'Kepala Sekolah',
                back_principal_name: finalKepsek,
                back_principal_nip: finalNip,
            });

            setPrintConfig(prev => ({
                ...prev,
                paperSize: (remoteConfig.print_paper_size as 'A4' | 'F4' | 'Letter' | 'Custom' | undefined) || prev.paperSize,
                orientation: (remoteConfig.print_orientation as 'portrait' | 'landscape' | undefined) || prev.orientation,
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
            header_x: config.header_x,
            header_y: config.header_y,
            title_x: config.title_x,
            title_y: config.title_y,
            logo_size: config.logo_size,
            card_width: config.card_width,
            card_height: config.card_height,
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
            show_back_side: config.show_back_side,
            back_style: config.back_style,
            back_bg_color: config.back_bg_color,
            back_text_color: config.back_text_color,
            back_header_text: config.back_header_text,
            back_rules: config.back_rules,
            back_show_signature: config.back_show_signature,
            back_signature_title: config.back_signature_title,
            back_principal_name: config.back_principal_name,
            back_principal_nip: config.back_principal_nip,
            back_signature_image_url: config.back_signature_image_url,
            back_stamp_image_url: config.back_stamp_image_url,
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

        // Validation Schema Guard
        const validationResult = cardConfigSchema.safeParse(cleanConfig);
        if (!validationResult.success) {
            toast.error(validationResult.error.issues[0]?.message || 'Input konfigurasi tidak valid');
            return;
        }

        saveConfigMutation.mutate(cleanConfig);
    }, [config, printConfig, cardTargetMode, saveConfigMutation]);

    useEffect(() => {
        const handleSaveEvent = () => handleSaveConfig();
        window.addEventListener('save-card-config', handleSaveEvent);
        return () => window.removeEventListener('save-card-config', handleSaveEvent);
    }, [handleSaveConfig]);

    const handleDragEnd = useCallback((field: 'photo' | 'qrcode' | 'data' | 'header' | 'title', info: { offset: { x: number; y: number } }) => {
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
        } else if (field === 'header') {
            setConfig(prev => ({
                ...prev,
                header_x: (prev.header_x || 0) + x,
                header_y: (prev.header_y || 0) + y
            }));
        } else if (field === 'title') {
            setConfig(prev => ({
                ...prev,
                title_x: (prev.title_x || 0) + x,
                title_y: (prev.title_y || 0) + y
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
        return calculatePrintLayout(printConfig, config.template || 'vertical');
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
                setSelectedStudents(siswaData.data?.map((s) => s.id) || []);
            }
        }
    }, [siswaData, selectedStudents]);


    const pageToolbar = (
        <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'design' && canEdit && (
                <>
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

                    {config.show_back_side && (
                        <Button
                            type="button"
                            variant="toolbarOutline"
                            size="toolbar"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-card-back-focus-mode'))}
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 font-bold"
                        >
                            <Maximize2 className="w-3.5 h-3.5 mr-2" />
                            Mode Fokus Belakang
                        </Button>
                    )}
                </>
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
        return <AccessRestricted onBack={() => window.history.back()} />;
    }

    if (configError) {
        return <ConfigErrorState onBack={() => window.history.back()} />;
    }

    return (
        <AcademicPageLayout 
            hardeningModuleKey="studentcard"
            instruction={{
                title: 'Panduan Cetak Kartu Pelajar & Pegawai',
                description: 'Halaman pengelolaan desain tata letak dan pencetakan Kartu Pelajar (Siswa) serta Kartu Pegawai (Guru/Staf) secara dinamis.',
                items: [
                    { text: 'Sesuaikan template layout kartu (Horizontal/Vertical) dan atur warna utama sesuai brand instansi.' },
                    { text: 'Masukkan data identitas sekolah, logo, serta atur letak foto & QR Code secara visual.' },
                    { text: 'Pilih siswa/pegawai pada tab Pilih Siswa dan lakukan cetak massal pada tab Preview & Cetak.' }
                ]
            }}
            breadcrumbs={breadcrumbs}
        >
            <SectionCard fullWidth className="space-y-3 min-w-0 bg-transparent border-none p-0 shadow-none dark:bg-transparent">
            {/* High-Density Workstation Top Bar (Sticky) */}
            <div className="sticky top-[68px] z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 flex flex-wrap items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md gap-3">
                {/* Left: Category Switcher */}
                <div className="flex items-center gap-2">
                    <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setCardTargetMode('SISWA');
                                setSelectedStudents([]);
                                setPreviewStudentId('');
                            }}
                            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                                cardTargetMode === 'SISWA'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <GraduationCap size={13} /> 🎓 Kartu Siswa
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCardTargetMode('GURU');
                                setSelectedStudents([]);
                                setPreviewStudentId('');
                            }}
                            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                                cardTargetMode === 'GURU'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <User size={13} /> 👔 Kartu Guru & Staf
                        </button>
                    </div>
                </div>

                {/* Center: Tabs Navigation */}
                <div className="shrink-0">
                    <TabSwitcher
                        options={tabOptions}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                </div>

                {/* Right: Actions (Simpan Desain + Mode Fokus) */}
                <div className="flex items-center gap-2">
                    {pageToolbar}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <Suspense fallback={<div className="flex justify-center p-12"><Loader size="lg" /></div>}>
                    {canView && (
                        <TabsContent value="design" className="p-0 focus-visible:ring-0">
                            <DesignTab 
                                config={config}
                                setConfig={setConfig}
                                handleDragEnd={handleDragEnd}
                                previewStudent={previewStudent}
                                    sekolah={tenantInfo || sekolahData}
                                    isSaving={saveConfigMutation.isPending}
                                    cardTargetMode={cardTargetMode}
                                    setCardTargetMode={(mode) => {
                                        setCardTargetMode(mode);
                                        setSelectedStudents([]);
                                        setPreviewStudentId('');
                                    }}
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
            </SectionCard>
        </AcademicPageLayout>
    );
};

export default StudentCardPage;
