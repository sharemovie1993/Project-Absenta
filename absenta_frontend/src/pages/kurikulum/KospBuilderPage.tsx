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
  Loader2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Loader } from '../../components/ui/Loader';
import { TahunPelajaranSelect } from '../../components/common';
import { useKospBuilderState } from '../../hooks/kurikulum/useKospBuilderState';

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
    compiledPages,
    initialConfig,
    isLoading,
    isSaving,
    handleSaveKospPages,
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
              onClick={() => setIsEditorOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 px-4 h-11"
            >
              <Sparkles size={16} />
              BUKA LIVE WORD EDITOR KOSP
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Status Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Identitas Sekolah */}
          <Card className="p-6 space-y-4 border-none shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identitas Satuan Pendidikan</span>
              <Building2 size={18} className="text-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-gray-900 dark:text-white">{sekolahInfo?.nama || 'SMK Negeri 1 Plered'}</h3>
              <p className="text-xs text-gray-500 font-medium">NPSN: {sekolahInfo?.npsn || '-'}</p>
              <p className="text-xs text-gray-500 font-medium line-clamp-1">{sekolahInfo?.alamat || '-'}</p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Kepala Sekolah:</span>
                <span>{namaKepalaSekolah}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Wakasek Kurikulum:</span>
                <span>{wakasekKurikulum}</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Kelengkapan Struktur Kurikulum Live */}
          <Card className="p-6 space-y-4 border-none shadow-sm bg-gradient-to-br from-indigo-50/20 to-white dark:from-indigo-950/10 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Struktur Kurikulum Live</span>
              <Layers size={18} className="text-indigo-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{jurusanList?.length || 0}</span>
                <span className="text-xs font-bold text-gray-500">Jurusan / Keahlian</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {mappingAllDataCount} mata pelajaran ter-plot pada TP {selectedTahunNama}.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {jurusanList?.map((j: any) => (
                <Badge key={j.id} variant="secondary" className="font-bold text-[10px]">
                  {j.singkatan || j.kode || j.nama}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Card 3: Status Dokumen KOSP */}
          <Card className="p-6 space-y-4 border-none shadow-sm bg-gradient-to-br from-emerald-50/20 to-white dark:from-emerald-950/10 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Status Dokumen</span>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">Siap Ditinjau & Dicetak</p>
              <p className="text-xs text-gray-500 font-medium">
                KOSP TP {selectedTahunNama} terintegrasi live dengan Word Style Engine.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-400">Total Halaman:</span>
              <span className="font-black text-slate-800 dark:text-slate-200">{compiledPages.length} Halaman Word</span>
            </div>
          </Card>
        </div>

        {/* Live Word Preview Teaser */}
        <Card className="p-8 border-none shadow-sm bg-slate-900 text-white space-y-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500 text-white font-black text-[9px] uppercase tracking-wider">Word Style Engine</Badge>
                <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider">Kepmendikbud No. 262/M/2022</Badge>
              </div>
              <h3 className="text-xl font-black">Edit & Cetak Dokumen KOSP dalam Tampilan Microsoft Word</h3>
              <p className="text-sm text-slate-400 max-w-2xl">
                Dokumen KOSP berisi Lembar Pengesahan, Bab I Karakteristik, Bab II Visi Misi, Bab III Pengorganisasian Pembelajaran, Bab IV & V Rencana Pembelajaran, serta Lampiran Tabel Struktur Kurikulum Live seluruh jurusan.
              </p>
            </div>
            <Button
              onClick={() => setIsEditorOpen(true)}
              className="bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl px-6 h-12 shadow-xl whitespace-nowrap"
            >
              <FileText size={18} className="mr-2 text-indigo-600" />
              BUKA LIVE WORD EDITOR
            </Button>
          </div>
        </Card>

        {/* Editor Modal */}
        <Suspense fallback={<Loader />}>
          {isEditorOpen && (
            <KospWordEditorModal
              isOpen={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              tahunPelajaranNama={selectedTahunNama}
              pages={compiledPages}
              config={initialConfig}
              onSavePages={handleSaveKospPages}
              isSaving={isSaving}
            />
          )}
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
};

export default KospBuilderPage;
