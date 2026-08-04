import React, { lazy, Suspense } from 'react';
import { 
  FileText, 
  Printer, 
  Layers, 
  CheckCircle2, 
  Building2, 
  BookOpen, 
  Sparkles,
  Calendar,
  ChevronRight,
  Loader2,
  Settings2,
  Users
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Loader } from '../../components/ui/Loader';
import { TahunPelajaranSelect } from '../../components/common';
import { useKospBuilderState } from '../../hooks/kurikulum/useKospBuilderState';
import { KospMetaConfigModal } from '../../components/kurikulum/kosp/KospMetaConfigModal';

const KospWordEditorModal = lazy(() => import('../../components/kurikulum/kosp/KospWordEditorModal'));

export const KospBuilderPage: React.FC = () => {
  const {
    selectedTahunId,
    setSelectedTahunId,
    selectedTahunNama,
    jurusanList,
    sekolahInfo,
    isEditorOpen,
    setIsEditorOpen,
    isMetaModalOpen,
    setIsMetaModalOpen,
    metaConfigData,
    compiledPages,
    initialConfig,
    isLoading,
    isSaving,
    handleSaveKospPages,
    handleSaveMetaConfig,
    namaKepalaSekolah,
    wakasekKurikulum,
    mappingAllDataCount
  } = useKospBuilderState();

  const breadcrumbs = React.useMemo(() => [
    { label: 'Kurikulum' },
    { label: 'Generator KOSP' }
  ], []);

  return (
    <AcademicPageLayout
      title="Generator KOSP (Kurikulum Operasional Satuan Pendidikan)"
      description="Penyusunan dokumen KOSP otomatis dan live berbasis Word Style per Tahun Pelajaran."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="kospbuilderpage"
      instruction={{
        title: 'Panduan Modul KOSP Builder',
        description: 'Modul ini merangkum data live profil sekolah, struktur kurikulum semua jurusan, dan kalender pendidikan menjadi dokumen resmi KOSP.',
        items: [
          { text: 'Pilih Tahun Pelajaran yang ingin disusun dokumen KOSP-nya.' },
          { text: 'Atur Legalitas SK & Tim Penyusun melalui tombol "Pengaturan Legalitas SK & Tim".' },
          { text: 'Klik "Buka Live Word Editor KOSP" untuk pratinjau dan penyuntingan dalam tampilan Microsoft Word.' },
          { text: 'Data Struktur Kurikulum semua jurusan otomatis disuntikkan dari database Absenta sesuai regulasi Kemendikbud.' },
          { text: 'Simpan atau langsung cetak dokumen ke format PDF/Word.' }
        ]
      }}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Dokumen KOSP TP {selectedTahunNama}</h2>
              <p className="text-xs text-gray-500 font-medium">Patuh Kepmendikbudristek No. 262/M/2022</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              <Calendar size={15} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500">Tahun Pelajaran:</span>
              <TahunPelajaranSelect 
                value={selectedTahunId}
                onValueChange={setSelectedTahunId}
                placeholder="Pilih Tahun..."
                className="bg-transparent border-none text-xs font-black focus:ring-0 cursor-pointer min-w-[145px] [&>button]:bg-transparent [&>button]:border-none [&>button]:focus:ring-0"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setIsMetaModalOpen(true)}
              className="rounded-xl flex items-center gap-2 border-slate-300 dark:border-slate-700 text-xs font-bold h-11"
            >
              <Settings2 size={16} className="text-blue-600 dark:text-blue-400" />
              Pengaturan SK & Tim Penyusun
            </Button>

            <Button
              onClick={() => setIsEditorOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 px-4 h-11"
            >
              <Sparkles size={16} />
              BUKA LIVE WORD EDITOR KOSP
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Informational Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/10 border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-indigo-200 dark:text-indigo-900/30">
              <Building2 size={80} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-3">
              <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                Profil Satuan Pendidikan
              </Badge>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{sekolahInfo?.nama || 'SMK NEGERI 1 PLERED'}</h3>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p><strong>Kepala Sekolah:</strong> {namaKepalaSekolah}</p>
                <p><strong>Wakasek Kurikulum:</strong> {wakasekKurikulum}</p>
                <p><strong>Status Pengesahan:</strong> Siap Ditetapkan</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/10 border-emerald-100 dark:border-emerald-900/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-emerald-200 dark:text-emerald-900/30">
              <BookOpen size={80} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-3">
              <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                Agregasi Data Struktur Kurikulum
              </Badge>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{jurusanList?.length || 0}</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Jurusan Terkoneksi</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Menghubungkan {mappingAllDataCount} entri mata pelajaran live untuk seluruh konsentrasi keahlian.
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50/50 via-white to-cyan-50/30 dark:from-blue-950/20 dark:via-slate-900 dark:to-cyan-950/10 border-blue-100 dark:border-blue-900/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-blue-200 dark:text-blue-900/30">
              <Users size={80} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-3">
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200">
                Legalitas SK & Tim Penyusun
              </Badge>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{metaConfigData?.tim_penyusun?.length || 9}</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Personel Tim Penyusun</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                SK Kepsek: <strong>{metaConfigData?.nomor_sk || '421.5/089/SK-KOSP/2025'}</strong>
              </p>
            </div>
          </Card>
        </div>

        {/* Live Preview Cards for Pages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              Struktur Halaman Dokumen KOSP ({compiledPages.length} Halaman / Bab)
            </h3>
            <span className="text-xs text-gray-500 font-medium">Klik "Buka Live Word Editor KOSP" untuk mengedit naskah secara utuh.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compiledPages.map((page, idx) => (
              <div 
                key={page.label || `kosp-page-${idx}`}
                onClick={() => setIsEditorOpen(true)}
                className="group p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-40"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      HALAMAN {idx + 1}
                    </span>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {page.label}
                  </h4>
                </div>

                <div className="text-[11px] text-gray-400 font-medium flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span>Pratinjau Word Ready</span>
                  <span className="group-hover:translate-x-1 transition-transform">Edit &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Pengaturan SK & Tim Penyusun */}
        <KospMetaConfigModal
          isOpen={isMetaModalOpen}
          onClose={() => setIsMetaModalOpen(false)}
          initialData={metaConfigData}
          defaultKepsek={namaKepalaSekolah}
          defaultWakasek={wakasekKurikulum}
          onSave={handleSaveMetaConfig}
          isSaving={isSaving}
        />

        {/* Modal Word Editor KOSP */}
        {isEditorOpen && (
          <Suspense fallback={<Loader text="Memuat Word Editor KOSP..." />}>
            <KospWordEditorModal
              isOpen={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              documentTitle={`Dokumen KOSP ${sekolahInfo?.nama || ''} TP ${selectedTahunNama}`}
              pages={compiledPages}
              initialConfig={initialConfig}
              onSavePages={handleSaveKospPages}
              isSaving={isSaving}
            />
          </Suspense>
        )}
      </div>
    </AcademicPageLayout>
  );
};

export default KospBuilderPage;
