import React, { lazy, Suspense, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { 
  Plus, 
  Trash2, 
  Layers,
  Printer,
  Loader2,
  BookOpen
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Loader } from '../../components/ui/Loader';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Modal } from '../../components/ui/Modal';
import { useMasterStrukturState } from '../../hooks/kurikulum/useMasterStrukturState';
import { detectKelompokForMapel } from '../../utils/kurikulum/masterStrukturHelper';
import type { Mapel } from '../../types/academic';

const MasterStrukturModal = lazy(() => import('../../components/kurikulum/master-struktur/MasterStrukturModal'));
const StrukturKurikulumTable = lazy(() => import('../../components/kurikulum/master-struktur/StrukturKurikulumTable'));

// Zod validation schema for page filters (Pillar 25)
const masterStrukturFilterSchema = z.object({
  tahunId: z.string().min(1, 'Tahun ajaran wajib dipilih'),
  tingkat: z.string().or(z.number()),
  jurusanId: z.string().min(1).nullable().optional()
});

const MasterStrukturPage: React.FC = () => {
    const {
        selectedTahunId, setSelectedTahunId,
        selectedTingkat, setSelectedTingkat,
        selectedJurusanId, setSelectedJurusanId,
        isModalOpen,
        editingItem,
        formData, setFormData,
        addMode, setAddMode,
        showAddOptions, setShowAddOptions,
        bulkSelections, setBulkSelections,
        bulkSearchQuery, setBulkSearchQuery,
        selectedRowIds,
        subjects,
        years,
        jurusans,
        isSmkOrMak,
        mappingFiltered,
        standardReferences,
        isLoadingMapping,
        isPrinting,
        totalJp,
        targetJp,
        gapJp,
        unmappedSubjects,
        presetSisaCount,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSave,
        handleSelectAllRows,
        handleToggleRowSelect,
        handleBulkDelete,
        handleDelete,
        handleAddPreset,
        handleQuickPlotUnmapped,
        handleCetakPdf,
        handleInputChange,
        detectDefaultJp,
        isMapelBelongsToOtherJurusanLocal,
        tingkatList,
        kelompokOptions,
        upsertMutation
    } = useMasterStrukturState();

    const breadcrumbs = React.useMemo(() => [
        { label: 'Kurikulum' },
        { label: 'Struktur Kurikulum' }
    ], []);

    // Safe Zod schema validation guard for page query parameters (Pillar 25)
    React.useMemo(() => {
        masterStrukturFilterSchema.safeParse({
            tahunId: selectedTahunId,
            tingkat: selectedTingkat,
            jurusanId: selectedJurusanId
        });
    }, [selectedTahunId, selectedTingkat, selectedJurusanId]);

    const renderedTingkatButtons = React.useMemo(() => {
        return tingkatList?.map((t) => (
            <button
                key={t}
                type="button"
                onClick={() => setSelectedTingkat(t)}
                aria-label={`Pilih Kelas ${t}`}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                    selectedTingkat === t 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
            >
                KELAS {t}
            </button>
        ));
    }, [tingkatList, selectedTingkat, setSelectedTingkat]);

    const renderedUnmappedRecommendations = React.useMemo(() => {
        return unmappedSubjects.slice(0, 2)?.map((s: Mapel) => (
            <button
                key={s.id}
                type="button"
                onClick={() => handleQuickPlotUnmapped(s.id)}
                className="text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 px-1.5 py-0.5 rounded font-bold transition-all truncate max-w-[100px]"
                title={`Klik untuk plot ${s.nama_mapel}`}
            >
                + {s.nama_mapel}
            </button>
        ));
    }, [unmappedSubjects, handleQuickPlotUnmapped]);

    const yearOptions = React.useMemo(() => {
        return years?.data?.map(y => ({
            value: y.id,
            label: `${y.tahun} ${y.is_active ? '(Aktif)' : ''}`
        })) || [];
    }, [years?.data]);

    const jurusanOptions = React.useMemo(() => {
        return jurusans?.data?.map(j => ({
            value: j.id,
            label: `${j.nama} (${j.singkatan || j.kode})`
        })) || [];
    }, [jurusans?.data]);

    return (
        <AcademicPageLayout
            title="Master Struktur Kurikulum"
            description="Plotting alokasi Jam Pelajaran (JP) per tingkat."
            breadcrumbs={breadcrumbs}
            hardeningModuleKey="masterstrukturpage"
            instruction={{
                title: 'Panduan Master Struktur Kurikulum',
                description: 'Kelola alokasi jam pelajaran (JP) per mata pelajaran untuk setiap tingkat kelas sesuai kurikulum yang berlaku.',
                items: [
                    { text: 'Pilih tahun ajaran dan tingkat kelas (10/11/12) untuk melihat dan mengedit struktur kurikulum.' },
                    { text: 'Klik sel pada tabel untuk mengubah jumlah jam pelajaran per minggu.' },
                    { text: 'Pastikan total JP per tingkat sesuai dengan ketentuan kurikulum yang berlaku.' }
                ]
            }}
        >
            <div className="space-y-6 animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white hidden md:block">Struktur Kurikulum</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl no-print">
                        <SearchableSelect 
                            value={selectedTahunId}
                            onValueChange={setSelectedTahunId}
                            options={yearOptions}
                            placeholder="Pilih Tahun..."
                            aria-label="Pilih Tahun Ajaran"
                            className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer min-w-[155px] [&>button]:bg-transparent [&>button]:border-none [&>button]:focus:ring-0"
                        />
                        {isSmkOrMak && (
                            <>
                                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700"></div>
                                <SearchableSelect 
                                    value={selectedJurusanId}
                                    onValueChange={setSelectedJurusanId}
                                    options={jurusanOptions}
                                    placeholder="Pilih Jurusan..."
                                    aria-label="Pilih Konsentrasi Keahlian"
                                    className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer min-w-[200px] [&>button]:bg-transparent [&>button]:border-none [&>button]:focus:ring-0"
                                />
                            </>
                        )}
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 hidden md:block"></div>
                        <div className="flex gap-1 p-1">
                            {renderedTingkatButtons}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* JP Tracker & Gap Analysis Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                        {/* Card 1: Total Beban Belajar (Indigo Card) */}
                        <AnalyticsCard
                            title="Total Beban Belajar"
                            icon={<Layers size={16} className="text-white opacity-80" />}
                            gradient="from-indigo-600 to-violet-700"
                            className="border-none shadow-sm min-h-[160px] bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative [&>div]:border-none [&>div]:bg-transparent"
                            variant="ghost"
                            value={
                                <div className="flex flex-col justify-between h-full min-h-[96px] text-white">
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-3xl font-black">{totalJp}</span>
                                        <span className="text-xs font-bold opacity-80">JP / Minggu</span>
                                    </div>
                                    <div className="flex gap-2 pt-1.5 no-print relative">
                                        <Button 
                                            onClick={() => setShowAddOptions(true)}
                                            className="flex-1 bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-lg text-[10px] h-8 border-none"
                                        >
                                            <Plus size={12} className="mr-1" />
                                            TAMBAH
                                        </Button>
                                        <Button
                                            onClick={handleCetakPdf}
                                            disabled={isPrinting || !mappingFiltered}
                                            className="flex-1 bg-white/20 hover:bg-white/30 text-white font-black rounded-lg text-[10px] h-8 border-none flex items-center justify-center gap-1"
                                        >
                                            {isPrinting ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
                                            CETAK
                                        </Button>
                                    </div>
                                </div>
                            }
                        />

                        {/* Card 2: Target Kurikulum */}
                        <AnalyticsCard
                            title="Target Kurikulum"
                            icon={
                                <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border-none text-[9px] px-1.5 py-0.5">
                                    Standar Baku
                                </Badge>
                            }
                            className="border-none shadow-sm min-h-[160px] bg-gradient-to-br from-indigo-50/20 to-white dark:from-indigo-950/5 dark:to-slate-900 border border-gray-200 dark:border-gray-800 [&>div]:border-none [&>div]:bg-transparent"
                            variant="ghost"
                            value={
                                <div className="flex flex-col justify-between h-full min-h-[96px]">
                                    <div className="mt-1 flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">{totalJp}</span>
                                        <span className="text-xs font-bold text-slate-400">/ {targetJp} JP</span>
                                    </div>
                                    <div className="mt-1 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${Math.min(100, (totalJp / targetJp) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1">Beban belajar per minggu tingkat kelas {selectedTingkat}.</p>
                                </div>
                            }
                        />

                        {/* Card 3: Analisis Selisih */}
                        <AnalyticsCard
                            title="Analisis Selisih"
                            icon={
                                gapJp > 0 ? (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                ) : gapJp === 0 ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                )
                            }
                            className="border-none shadow-sm min-h-[160px] bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-950/5 dark:to-slate-900 border border-gray-200 dark:border-gray-800 [&>div]:border-none [&>div]:bg-transparent"
                            variant="ghost"
                            value={
                                <div className="flex flex-col justify-between h-full min-h-[96px]">
                                    <div className="mt-1">
                                        {gapJp > 0 ? (
                                            <div>
                                                <p className="text-lg font-black text-amber-600 dark:text-amber-400">Kurang {gapJp} JP</p>
                                                <p className="text-[9px] text-slate-400 leading-tight">Struktur jam pelajaran masih berada di bawah alokasi standar nasional.</p>
                                            </div>
                                        ) : gapJp === 0 ? (
                                            <div>
                                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-500">Sesuai Regulasi</p>
                                                <p className="text-[9px] text-slate-400 leading-tight">Alokasi beban belajar telah memenuhi regulasi kementerian.</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">Otonomi (+{Math.abs(gapJp)} JP)</p>
                                                <p className="text-[9px] text-slate-400 leading-tight">Sekolah menyesuaikan mandiri dengan menambah jam belajar.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">
                                        Status: {gapJp > 0 ? '⚠️ Kurang Pemetaan' : gapJp === 0 ? '✅ Stabil' : 'ℹ️ Jam Tambahan'}
                                    </div>
                                </div>
                            }
                        />

                        {/* Card 4: Rekomendasi Mapel */}
                        <AnalyticsCard
                            title="Rekomendasi Mapel"
                            icon={
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-none text-[9px] px-1.5 py-0.5">
                                    {unmappedSubjects.length} Belum Diplot
                                </Badge>
                            }
                            className="border-none shadow-sm min-h-[160px] bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-950/5 dark:to-slate-900 border border-gray-200 dark:border-gray-800 [&>div]:border-none [&>div]:bg-transparent"
                            variant="ghost"
                            value={
                                <div className="flex flex-col justify-between h-full min-h-[96px]">
                                    <div className="mt-1 min-h-[36px]">
                                        {unmappedSubjects.length === 0 ? (
                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Semua mata pelajaran sekolah telah dipetakan! 🎉</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 max-h-[38px] overflow-hidden">
                                                {renderedUnmappedRecommendations}
                                            </div>
                                        )}
                                    </div>
                                    {unmappedSubjects.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => handleQuickPlotUnmapped()}
                                            className="text-left text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline uppercase tracking-wider mt-1"
                                        >
                                            Plotting Massal Sisa &rarr;
                                        </button>
                                    ) : (
                                        <p className="text-[9px] text-slate-400 mt-1">Struktur pemetaan lengkap.</p>
                                    )}
                                </div>
                            }
                        />
                    </div>

                    {/* Main Table View */}
                    <div className="w-full space-y-6">
                        <Card className="border-none shadow-sm overflow-hidden min-h-[500px]">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-wrap gap-2 no-print">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center">
                                        <BookOpen size={18} className="mr-2 text-indigo-500" />
                                        Struktur Kurikulum - Tingkat {selectedTingkat}
                                    </h3>
                                    <Badge variant="secondary" className="font-bold">{mappingFiltered.length} Mata Pelajaran</Badge>
                                </div>
                                {selectedRowIds.size > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-xs font-black rounded-lg transition-all border border-red-200 dark:border-red-900 shadow-sm"
                                    >
                                        <Trash2 size={13} />
                                        HAPUS TERPILIH ({selectedRowIds.size})
                                    </button>
                                )}
                            </div>

                            <Suspense fallback={<Loader />}>
                                <StrukturKurikulumTable
                                    isLoadingMapping={isLoadingMapping}
                                    mappingFiltered={mappingFiltered}
                                    selectedRowIds={selectedRowIds}
                                    handleSelectAllRows={handleSelectAllRows}
                                    handleToggleRowSelect={handleToggleRowSelect}
                                    standardReferences={standardReferences}
                                    openEditModal={openEditModal}
                                    handleDelete={handleDelete}
                                    openCreateModal={openCreateModal}
                                />
                            </Suspense>
                        </Card>
                    </div>
                </div>

                {/* Upsert Modal */}
                <Suspense fallback={<Loader />}>
                    {isModalOpen && (
                        <MasterStrukturModal
                            isOpen={isModalOpen}
                            onClose={closeModal}
                            editingItem={editingItem}
                            addMode={addMode}
                            formData={formData}
                            handleInputChange={handleInputChange}
                            setFormData={setFormData}
                            unmappedSubjects={unmappedSubjects}
                            subjects={subjects}
                            kelompokOptions={kelompokOptions}
                            selectedTingkat={selectedTingkat}
                            detectDefaultJpForMapel={detectDefaultJp}
                            bulkSearchQuery={bulkSearchQuery}
                            setBulkSearchQuery={setBulkSearchQuery}
                            bulkSelections={bulkSelections}
                            setBulkSelections={setBulkSelections}
                            mappingFiltered={mappingFiltered}
                            isMapelBelongsToOtherJurusan={isMapelBelongsToOtherJurusanLocal}
                            detectKelompokForMapel={detectKelompokForMapel}
                            presetSisaCount={presetSisaCount}
                            handleAddPreset={handleAddPreset}
                            handleSave={handleSave}
                            isPendingSave={upsertMutation.isPending}
                        />
                    )}
                </Suspense>

                {/* Add Mode Options Modal */}
                {showAddOptions && (
                    <Modal
                        isOpen={showAddOptions}
                        onClose={() => setShowAddOptions(false)}
                        title="Pilih Metode Plotting"
                        size="md"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                            {/* Option 1: Standar Baku / Massal */}
                            <button
                                type="button"
                                onClick={() => {
                                    setAddMode('massal');
                                    openCreateModal();
                                    setShowAddOptions(false);
                                }}
                                className="flex flex-col items-center justify-center p-6 bg-indigo-50/30 hover:bg-indigo-50 dark:bg-slate-900/30 dark:hover:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 transition-all text-center group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-all">
                                    <Layers size={24} />
                                </div>
                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Plotting Massal</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Preset Standar Nasional</span>
                            </button>

                            {/* Option 2: Tambah Manual */}
                            <button
                                type="button"
                                onClick={() => {
                                    setAddMode('manual');
                                    openCreateModal();
                                    setShowAddOptions(false);
                                }}
                                className="flex flex-col items-center justify-center p-6 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/30 dark:hover:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 transition-all text-center group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-indigo-950 flex items-center justify-center text-slate-500 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-all">
                                    <Plus size={24} />
                                </div>
                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Plotting Manual</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">Tambah Satu Per Satu</span>
                            </button>
                        </div>
                    </Modal>
                )}
            </div>
        </AcademicPageLayout>
    );
};

export default MasterStrukturPage;
