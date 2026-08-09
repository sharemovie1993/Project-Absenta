import React from 'react';
import { 
    SectionCard, 
    Button, 
    Label, 
    Input, 
    Switch
} from '@/components/ui';
import { 
    Settings, 
    CreditCard, 
    Printer as PrinterIcon, 
    RefreshCw 
} from 'lucide-react';
import { SettingsGroup } from '@/components/academic/student-card/SettingsGroup';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PrintableCard } from '@/components/academic/student-card/PrintableCard';
import type { StudentCardConfig, PrintConfig } from '@/components/academic/student-card/types';

interface PrintTabProps {
    isSiswa: boolean;
    printMode: 'single' | 'multi';
    setPrintMode: (val: 'single' | 'multi') => void;
    selectedStudents: string[];
    printConfig: PrintConfig;
    setPrintConfig: (val: PrintConfig) => void;
    studentsToPrint: any[];
    handlePrint: () => void;
    isPrinting: boolean;
    printLayout: any;
    pages: any[][];
    config: StudentCardConfig;
    sekolah: any;
}

export const PrintTab: React.FC<PrintTabProps> = React.memo(({
    isSiswa,
    printMode,
    setPrintMode,
    selectedStudents,
    printConfig,
    setPrintConfig,
    studentsToPrint,
    handlePrint,
    isPrinting,
    printLayout,
    pages,
    config,
    sekolah
}) => {
    const isRFID = printConfig.paperSize === 'RFID';
    const [zoomLevel, setZoomLevel] = React.useState<number>(isRFID ? 1.0 : 0.55);

    React.useEffect(() => {
        setZoomLevel(isRFID ? 1.0 : 0.55);
    }, [isRFID]);

    return (
        <div className={`grid grid-cols-1 ${!isSiswa ? 'lg:grid-cols-12' : ''} gap-8 h-[calc(100vh-250px)] animate-in fade-in duration-500`}>
            {/* Settings Column */}
            {!isSiswa && (
                <SectionCard
                    title="Konfigurasi Output"
                    icon={Settings}
                    fullWidth
                    className="lg:col-span-4 h-full shadow-sm border-slate-100 dark:border-slate-800 flex flex-col"
                    noPadding
                >
                    <div className="p-4 space-y-4 flex-1 custom-scrollbar overflow-y-auto">
                        {/* Print Mode */}
                        <SettingsGroup title="Mode Output" defaultOpen={true}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={printMode === 'single' ? 'primary' : 'outline'}
                                        onClick={() => setPrintMode('single')}
                                        className={`h-10 text-[11px] font-bold rounded-xl ${printMode === 'single' ? 'bg-blue-600 text-white' : 'dark:border-slate-800'}`}
                                    >
                                        Single (Current)
                                    </Button>
                                    <Button
                                        variant={printMode === 'multi' ? 'primary' : 'outline'}
                                        onClick={() => setPrintMode('multi')}
                                        className={`h-10 text-[11px] font-bold rounded-xl ${printMode === 'multi' ? 'bg-blue-600 text-white' : 'dark:border-slate-800'}`}
                                    >
                                        Multi (Batch)
                                    </Button>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                        {printMode === 'single'
                                            ? 'Mencetak kartu yang sedang dipreview di editor desain saja.'
                                            : `Mencetak seluruh (${selectedStudents.length}) siswa yang telah dipilih dalam antrean batch.`}
                                    </p>
                                </div>
                            </div>
                        </SettingsGroup>

                        {/* Paper Settings */}
                        <SettingsGroup title="Kertas & Orientasi" defaultOpen={true}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Ukuran Kertas</Label>
                                        <SearchableSelect
                                            value={printConfig.paperSize}
                                            onValueChange={(v: any) => {
                                                if (v === 'RFID') {
                                                    setPrintConfig({
                                                        ...printConfig,
                                                        paperSize: v,
                                                        orientation: config.template === 'horizontal' ? 'landscape' : 'portrait',
                                                        marginTop: 0,
                                                        marginBottom: 0,
                                                        marginLeft: 0,
                                                        marginRight: 0,
                                                        gapX: 0,
                                                        gapY: 0
                                                    });
                                                } else {
                                                    setPrintConfig({ ...printConfig, paperSize: v });
                                                }
                                            }}
                                            options={[
                                                { value: 'A4', label: 'A4 Standard' },
                                                { value: 'F4', label: 'F4 / Folio' },
                                                { value: 'RFID', label: 'RFID / ATM Card (CR-80)' },
                                                { value: 'Custom', label: 'Custom' }
                                            ]}
                                            placeholder="Pilih Kertas"
                                            searchPlaceholder="Cari Ukuran..."
                                            triggerClassName="h-10 rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Orientasi</Label>
                                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl h-10 items-center">
                                            <Button
                                                variant="ghost"
                                                className={`flex-1 flex items-center justify-center h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${printConfig.orientation === 'portrait' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                                onClick={() => setPrintConfig({ ...printConfig, orientation: 'portrait' })}
                                            >
                                                Portrait
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className={`flex-1 flex items-center justify-center h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${printConfig.orientation === 'landscape' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                                onClick={() => setPrintConfig({ ...printConfig, orientation: 'landscape' })}
                                            >
                                                Landscape
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {printConfig.paperSize === 'Custom' && (
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Lebar (mm)</Label>
                                            <Input
                                                type="number"
                                                value={printConfig.customWidth || 210}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, customWidth: Number(e.target.value) })}
                                                className="h-8 text-xs rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Tinggi (mm)</Label>
                                            <Input
                                                type="number"
                                                value={printConfig.customHeight || 297}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, customHeight: Number(e.target.value) })}
                                                className="h-8 text-xs rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SettingsGroup>

                        {/* Margins */}
                        <SettingsGroup title="Margin Halaman (mm)" defaultOpen={true}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Atas</Label>
                                    <Input
                                        type="number"
                                        value={printConfig.marginTop}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, marginTop: Number(e.target.value) })}
                                        className="h-10 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Bawah</Label>
                                    <Input
                                        type="number"
                                        value={printConfig.marginBottom}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, marginBottom: Number(e.target.value) })}
                                        className="h-10 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Kiri</Label>
                                    <Input
                                        type="number"
                                        value={printConfig.marginLeft}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, marginLeft: Number(e.target.value) })}
                                        className="h-10 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Kanan</Label>
                                    <Input
                                        type="number"
                                        value={printConfig.marginRight}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, marginRight: Number(e.target.value) })}
                                        className="h-10 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                        </SettingsGroup>

                        {/* Alignment */}
                        <SettingsGroup title="Auto Alignment" defaultOpen={true}>
                            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tengah Horizontal</Label>
                                    <Switch
                                        checked={!!printConfig.autoCenterX}
                                        onCheckedChange={(c: boolean) => setPrintConfig({ ...printConfig, autoCenterX: c })}
                                        className="scale-90"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tengah Vertikal</Label>
                                    <Switch
                                        checked={!!printConfig.autoCenterY}
                                        onCheckedChange={(c: boolean) => setPrintConfig({ ...printConfig, autoCenterY: c })}
                                        className="scale-90"
                                    />
                                </div>
                            </div>
                        </SettingsGroup>

                        {/* Spacing */}
                        <SettingsGroup title="Jarak Antar Kartu (mm)" defaultOpen={true}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Horizontal (Gap X)</Label>
                                    <Input
                                        type="number"
                                        value={printConfig.gapX}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, gapX: Number(e.target.value) })}
                                        className="h-10 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400">Vertikal (Gap Y)</Label>
                                    <Input
                                        type="number"
                                        value={printConfig.gapY}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrintConfig({ ...printConfig, gapY: Number(e.target.value) })}
                                        className="h-10 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                        </SettingsGroup>
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                            onClick={handlePrint}
                            disabled={isPrinting || (printMode === 'multi' && selectedStudents.length === 0)}
                        >
                            {isPrinting ? (
                                <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                            ) : (
                                <PrinterIcon className="w-5 h-5 mr-3" />
                            )}
                            Cetak ({studentsToPrint.length}) Kartu
                        </Button>
                    </div>
                </SectionCard>
            )}

            {/* Preview Column */}
            <div className={`${!isSiswa ? 'lg:col-span-8' : 'w-full'} bg-slate-200/50 dark:bg-slate-950/50 rounded-xl p-10 overflow-auto flex flex-col items-center justify-start border border-slate-200 dark:border-slate-800 shadow-inner relative custom-scrollbar`}>
                {isSiswa && (
                    <div className="mb-8 w-full max-w-md">
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl text-center mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="text-blue-600 w-6 h-6" />
                            </div>
                            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Kartu Pelajar Saya</h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">Gunakan kartu ini untuk absensi digital dan identitas resmi sekolah.</p>
                        </div>
                        <Button size="lg" className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20" onClick={handlePrint}>
                            <PrinterIcon className="w-5 h-5 mr-3" />
                            Cetak Kartu Sekarang
                        </Button>
                    </div>
                )}

                <div className="w-full max-w-2xl mb-4 flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 z-20">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Live Print Preview ({isRFID ? 'Presisi 1:1 Editor' : 'Fit Page Halaman 1'})
                    </div>
                </div>

                <div
                    className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative transition-all duration-300 ease-out hover:shadow-[0_40px_80px_rgba(0,0,0,0.2)]"
                    style={{
                        width: `${printLayout.finalW}mm`,
                        height: `${printLayout.finalH}mm`,
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: isRFID ? 'center' : 'top center',
                        marginBottom: `-${(printLayout.finalH * Math.max(0, 1 - zoomLevel))}mm` // Adjust for scale offset
                    }}
                >
                    {/* Margin Guides (Visual Only) */}
                    <div
                        className="absolute border border-dashed border-blue-200 pointer-events-none z-10"
                        style={{
                            top: `${printConfig.marginTop}mm`,
                            left: `${printConfig.marginLeft}mm`,
                            right: `${printConfig.marginRight}mm`,
                            bottom: `${printConfig.marginBottom}mm`,
                        }}
                    />

                    {/* Cards Preview (Fallback to Sample Student if empty) */}
                    {(() => {
                        const sampleStudent = {
                            id: 'sample-preview-1',
                            nama: 'A. SYARIF HIDAYAT',
                            nama_siswa: 'A. SYARIF HIDAYAT',
                            nis: '12345678',
                            nisn: '0012345678',
                            kelas: { nama: 'X - RPL 1', nama_kelas: 'X - RPL 1' }
                        };
                        const listToRender = (pages.length > 0 && pages[0].length > 0) 
                            ? pages[0] 
                            : [sampleStudent];

                        return listToRender.map((student: any, idx: number) => {
                            const col = idx % printLayout.cols;
                            const row = Math.floor(idx / printLayout.cols);

                            return (
                                <div
                                    key={student.id || idx}
                                    className="absolute"
                                    style={{
                                        left: `${printLayout.effectiveMarginLeft + (col * (printLayout.cardW + printConfig.gapX))}mm`,
                                        top: `${printLayout.effectiveMarginTop + (row * (printLayout.cardH + printConfig.gapY))}mm`,
                                        width: `${printLayout.cardW}mm`,
                                        height: `${printLayout.cardH}mm`,
                                    }}
                                >
                                    <PrintableCard student={student} config={config} sekolah={sekolah} />
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
});
