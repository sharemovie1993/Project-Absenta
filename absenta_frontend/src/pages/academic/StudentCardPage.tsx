import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Search,
    Settings,
    LayoutTemplate,
    Shield,
    CreditCard,
    Save,
    Users
} from 'lucide-react';
import { getSiswaList } from '../../api/academic/siswa.api';
import { getKelasList } from '../../api/academic/kelas.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { studentCardConfigApi } from '../../api/academic/student-card-config.api';
import { RefreshCw, Layout, Printer as PrinterIcon } from 'lucide-react';
import {
    Button,
    Input,
    SectionCard,
    Label,
    Badge,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Switch,
    Checkbox
} from '../../components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';

import type {
    StudentCardConfig,
    PrintConfig
} from '../../components/academic/student-card/types';
import {
    MM_TO_PX,
    EDITOR_SCALE,
    DEFAULT_CONFIG,
    DEFAULT_PRINT_CONFIG,
    PAPER_SIZES
} from '../../components/academic/student-card/constants';
import { FontSizeInput } from '../../components/academic/student-card/FontSizeInput';
import { SettingsGroup } from '../../components/academic/student-card/SettingsGroup';
import { PreviewCard } from '../../components/academic/student-card/PreviewCard';
import { PrintableCard } from '../../components/academic/student-card/PrintableCard';

// Local Components
import { DesignTab } from './student-card/components/DesignTab';
import { DataTab } from './student-card/components/DataTab';
import { PrintTab } from './student-card/components/PrintTab';
import { PrintOverlay } from './student-card/components/PrintOverlay';

const StudentCardPage = () => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const role = user?.role?.name;
    const isSiswa = role === 'SISWA';
    const isGuru = role === 'GURU' || role === 'WALIKELAS';

    const canView = user?.capabilities?.includes('academic.student.card.view.config') || isAdmin();

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700">
                <SectionCard className="max-w-md w-full p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20">
                        <Shield className="w-10 h-10 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Akses Terbatas</h1>
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

    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(isSiswa ? 'print' : (isGuru ? 'data' : 'design'));
    const [printConfig, setPrintConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);
    const [selectedKelas, setSelectedKelas] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [previewStudentId, setPreviewStudentId] = useState<string>('');
    const [config, setConfig] = useState<StudentCardConfig>(DEFAULT_CONFIG);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printMode, setPrintMode] = useState<'single' | 'multi'>('multi');

    // Redirect tabs if role restricted
    useEffect(() => {
        if (isSiswa && activeTab !== 'print') setActiveTab('print');
        if (isGuru && activeTab === 'design') setActiveTab('data');
    }, [isSiswa, isGuru, activeTab]);

    // For Siswa, force printMode to single
    useEffect(() => {
        if (isSiswa) setPrintMode('single');
    }, [isSiswa]);

    // Queries
    const { data: sekolah } = useQuery({
        queryKey: ['sekolah-profile'],
        queryFn: sekolahApi.getProfile
    });

    const { data: remoteConfig, isLoading: isLoadingConfig, error: configError } = useQuery({
        queryKey: ['student-card-config'],
        queryFn: studentCardConfigApi.getConfig,
        retry: false
    });

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

    const { data: kelasList } = useQuery({
        queryKey: ['kelas-list'],
        queryFn: () => getKelasList(1, 100),
        enabled: !isSiswa // Siswa doesn't need class list
    });

    const kelasOptions = useMemo(() => {
        const list = kelasList?.data?.map((k: any) => ({
            label: k.nama_kelas,
            value: k.id
        })) || [];
        return [{ label: 'Semua Kelas', value: 'all' }, ...list];
    }, [kelasList]);

    const { data: siswaData, isLoading: isLoadingSiswa } = useQuery({
        queryKey: ['siswa-list', selectedKelas, debouncedSearch, isSiswa, user?.id],
        queryFn: () => getSiswaList(
            1,
            100,
            debouncedSearch,
            selectedKelas === 'all' ? '' : selectedKelas,
            '',
            '',
            isSiswa ? user?.id : ''
        )
    });

    const previewStudent = useMemo(() =>
        siswaData?.data?.find((s: any) => s.id === previewStudentId),
        [siswaData, previewStudentId]
    );

    useEffect(() => {
        if (siswaData?.data && siswaData.data.length > 0 && !previewStudentId) {
            setPreviewStudentId(siswaData.data[0].id);
        }
    }, [siswaData]);

    // Sync remote config to local state
    useEffect(() => {
        if (remoteConfig) {
            const namaSekolah = (sekolah as any)?.nama || (sekolah as any)?.data?.nama;
            const alamatSekolah = (sekolah as any)?.alamat || (sekolah as any)?.data?.alamat;

            setConfig(prev => ({
                ...prev,
                ...remoteConfig,
                school_name: remoteConfig.school_name || namaSekolah || '',
                school_address: remoteConfig.school_address || alamatSekolah || '',
            }));

            // Sync Print Config
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
        }
    }, [remoteConfig, sekolah]);

    // Sync School Name to Config if config is empty and no remote config yet
    useEffect(() => {
        if (sekolah && !remoteConfig) {
            const nama = (sekolah as any)?.nama || (sekolah as any)?.data?.nama;
            const alamat = (sekolah as any)?.alamat || (sekolah as any)?.data?.alamat;
            setConfig(prev => ({
                ...prev,
                school_name: prev.school_name || nama,
                school_address: prev.school_address || alamat
            }));
        }
    }, [sekolah, remoteConfig]);

    // Mutation
    const saveConfigMutation = useMutation({
        mutationFn: studentCardConfigApi.updateConfig,
        onSuccess: () => {
            showToast('Konfigurasi berhasil disimpan', 'success');
            queryClient.invalidateQueries({ queryKey: ['student-card-config'] });
        },
        onError: () => {
            showToast('Gagal menyimpan konfigurasi', 'error');
        }
    });

    const handleSaveConfig = () => {
        // Create a clean copy of config to save
        const { ...cleanConfig } = config as any;
        delete cleanConfig.Tenant;

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
    };

    const handleDragEnd = (field: 'photo' | 'qrcode' | 'data', info: any) => {
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
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    const printLayout = useMemo(() => {
        const paperW = printConfig.paperSize === 'Custom' ? (printConfig.customWidth || 210) : PAPER_SIZES[printConfig.paperSize].width;
        const paperH = printConfig.paperSize === 'Custom' ? (printConfig.customHeight || 297) : PAPER_SIZES[printConfig.paperSize].height;

        const finalW = printConfig.orientation === 'portrait' ? paperW : paperH;
        const finalH = printConfig.orientation === 'portrait' ? paperH : paperW;

        const cardW = config.template === 'vertical' ? 54 : 86;
        const cardH = config.template === 'vertical' ? 86 : 54;

        const availW = finalW - printConfig.marginLeft - printConfig.marginRight;
        const availH = finalH - printConfig.marginTop - printConfig.marginBottom;

        const cols = Math.max(1, Math.floor((availW + printConfig.gapX) / (cardW + printConfig.gapX)));
        const rows = Math.max(1, Math.floor((availH + printConfig.gapY) / (cardH + printConfig.gapY)));

        // Center Alignment Logic
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
        return siswaData?.data?.filter((s: any) => selectedStudents.includes(s.id)) || [];
    }, [siswaData, selectedStudents, printMode, previewStudent]);

    const pages = useMemo(() => {
        const pgs = [];
        for (let i = 0; i < studentsToPrint.length; i += printLayout.itemsPerPage) {
            pgs.push(studentsToPrint.slice(i, i + printLayout.itemsPerPage));
        }
        return pgs;
    }, [studentsToPrint, printLayout]);

    // Helper to toggle student selection
    const toggleStudent = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (siswaData?.data) {
            if (selectedStudents.length === siswaData.data.length) {
                setSelectedStudents([]);
            } else {
                setSelectedStudents(siswaData.data.map((s: any) => s.id));
            }
        }
    };

    const academicStats = useMemo(() => [
        {
            title: "Total Siswa",
            value: (siswaData as any)?.pagination?.totalItems || siswaData?.data?.length || 0,
            icon: <Users size={14} />,
            gradient: "from-slate-600 to-slate-800",
            subtitle: "Basis data identitas"
        },
        {
            title: "Antrean Cetak",
            value: `${selectedStudents.length} Siswa`,
            icon: <CreditCard size={14} />,
            gradient: selectedStudents.length > 0 ? "from-blue-600 to-indigo-700" : "from-slate-400 to-slate-500",
            subtitle: "Siap diproses batch"
        },
        {
            title: "Layout Aktif",
            value: config.template === 'horizontal' ? 'Landscape' : 'Portrait',
            icon: <LayoutTemplate size={14} />,
            gradient: "from-emerald-500 to-teal-700",
            subtitle: "Format desain kartu"
        }
    ], [siswaData, selectedStudents.length, config.template]);

    // Toolbar Component
    const pageToolbar = (
        <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'design' && isAdmin() && (
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

    return (
        <AcademicPageLayout
            title="Kartu Pelajar Digital"
            description="Desain kartu identitas siswa dengan QR Code dinamis dan cetak secara massal dengan layout presisi."
            stats={academicStats}
            toolbar={pageToolbar}
            instruction={{
                title: "Panduan Kartu Pelajar",
                description: "Ikuti langkah berikut untuk menghasilkan kartu pelajar berkualitas tinggi.",
                items: [
                    { text: "Tab Desain: Geser (drag) elemen Foto, QR, dan Data pada kartu untuk mengatur tata letak." },
                    { text: "Tab Pilih Siswa: Gunakan filter kelas dan centang siswa yang ingin dicetak kartunya." },
                    { text: "Tab Preview: Pastikan ukuran kertas dan margin sesuai dengan printer Anda." },
                    { text: "Gunakan kertas PVC atau Glossy tebal untuk hasil identitas yang lebih profesional." }
                ]
            }}
        >
            <div className="p-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <TabsList className="bg-transparent border-none p-0 gap-8 h-12">
                            {isAdmin() && (
                                <TabsTrigger
                                    value="design"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-12 px-1 text-slate-500 data-[state=active]:text-blue-600 font-bold transition-all flex items-center gap-2"
                                >
                                    <Layout className="w-4 h-4" />
                                    Desain Kartu
                                </TabsTrigger>
                            )}
                            {!isSiswa && (
                                <TabsTrigger
                                    value="data"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-12 px-1 text-slate-500 data-[state=active]:text-blue-600 font-bold transition-all flex items-center gap-2"
                                >
                                    <Users className="w-4 h-4" />
                                    Pilih Siswa
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="print"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-12 px-1 text-slate-500 data-[state=active]:text-blue-600 font-bold transition-all flex items-center gap-2"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                Preview & Cetak
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {isAdmin() && (
                        <TabsContent value="design" className="p-6 focus-visible:ring-0">
                            <DesignTab 
                                config={config}
                                setConfig={setConfig}
                                handleDragEnd={handleDragEnd}
                                previewStudent={previewStudent}
                                sekolah={sekolah}
                            />
                        </TabsContent>
                    )}

                    {!isSiswa && (
                        <TabsContent value="data" className="p-6 focus-visible:ring-0">
                            <DataTab 
                                isGuru={isGuru}
                                selectedKelas={selectedKelas}
                                setSelectedKelas={setSelectedKelas}
                                kelasOptions={kelasOptions}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                selectedStudents={selectedStudents}
                                siswaData={siswaData}
                                isLoadingSiswa={isLoadingSiswa}
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
                </Tabs>

                <PrintOverlay 
                    isPrinting={isPrinting}
                    pages={pages}
                    printLayout={printLayout}
                    printConfig={printConfig}
                    config={config}
                    sekolah={sekolah}
                />
            </div>
        </AcademicPageLayout>
    );
};

export default StudentCardPage;
