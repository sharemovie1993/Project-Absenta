import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Users,
  GraduationCap,
  Printer,
  Download,
  Smartphone,
  Maximize2,
  FileCheck2,
} from 'lucide-react';
import { PublicCurriculumAndP5 } from '../../../api/public-portal.api';
import { PrintDeskCanvas } from '@/components/ui/PrintHeader';
import { StrukturKurikulumDocumentSheet } from '@/components/kurikulum/struktur/StrukturKurikulumDocumentSheet';
import {
  StrukturKurikulumPrintModal,
  exportStrukturKurikulumPdf,
} from '@/components/kurikulum/struktur/StrukturKurikulumPrintModal';
import { DEFAULT_JABAR_LOGO_SVG, resolveCoverImageBase64 } from '@/utils/print/rapor/raporShared';

interface PublicPortalCurriculumP5Props {
  data: PublicCurriculumAndP5 | null;
}

export const PublicPortalCurriculumP5: React.FC<PublicPortalCurriculumP5Props> = ({ data }) => {
  const jurusans = useMemo(() => data?.jurusans || [], [data?.jurusans]);
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('');
  const [zoomMode, setZoomMode] = useState<'fit' | 'original'>('fit');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Pre-convert logos to Base64 so html2canvas PDF export works cleanly without CORS taint
  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);

  useEffect(() => {
    if (jurusans.length > 0 && !selectedJurusanId) {
      setSelectedJurusanId(jurusans[0].id);
    }
  }, [jurusans, selectedJurusanId]);

  useEffect(() => {
    let active = true;
    const rawDaerah = data?.header_info?.logo_daerah_url || DEFAULT_JABAR_LOGO_SVG;
    const rawSekolah = data?.header_info?.logo_url || '/logo.png';

    resolveCoverImageBase64(rawDaerah)
      .then((b64) => {
        if (active) setLogoDaerahBase64(b64);
      })
      .catch(() => {
        if (active) setLogoDaerahBase64(rawDaerah);
      });

    resolveCoverImageBase64(rawSekolah)
      .then((b64) => {
        if (active) setLogoSekolahBase64(b64);
      })
      .catch(() => {
        if (active) setLogoSekolahBase64(rawSekolah);
      });

    return () => {
      active = false;
    };
  }, [data?.header_info?.logo_daerah_url, data?.header_info?.logo_url]);

  const selectedJurusan = useMemo(() => {
    if (!selectedJurusanId) return jurusans[0] || null;
    return jurusans.find((j) => j.id === selectedJurusanId) || jurusans[0] || null;
  }, [jurusans, selectedJurusanId]);

  const enrichedTenantInfo = useMemo(() => {
    const h = data?.header_info;
    return {
      name: h?.name || 'SMK NEGERI 1 PLERED',
      logo_url: logoSekolahBase64 || h?.logo_url || '/logo.png',
      logo_daerah_url: logoDaerahBase64 || h?.logo_daerah_url || DEFAULT_JABAR_LOGO_SVG,
      address: h?.address || '',
      phone: h?.phone || '',
      email: h?.email || '',
      website: h?.website || '',
      nama_dinas_atas: h?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      nama_dinas_bawah: h?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
      nama_cabang_dinas: h?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
      print_header_lines: h?.print_header_lines,
    };
  }, [data?.header_info, logoDaerahBase64, logoSekolahBase64]);

  const defaultAcademicDate = useMemo(() => {
    const yearMatch = (data?.tahun_ajaran || '').match(/\b(20\d{2})\b/);
    const startYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    return `14 Juli ${startYear}`;
  }, [data?.tahun_ajaran]);

  if (!data || (data.subjects.length === 0 && data.p5_projects.length === 0)) {
    return null;
  }

  const handleDirectDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const jurusanSlug = (
        selectedJurusan?.singkatan ||
        selectedJurusan?.kode ||
        selectedJurusan?.nama ||
        'UMUM'
      )
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
      const tahunSlug = (data.tahun_ajaran || 'TP').replace(/[^0-9]+/g, '_');
      await exportStrukturKurikulumPdf({
        containerSelector: '#public-struktur-kurikulum-desk .print-sheet',
        fileName: `STRUKTUR_KURIKULUM_${jurusanSlug}_${tahunSlug}.pdf`,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <section id="kurikulum" className="py-20 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Part 1: Etalase Projek Penguatan Profil Pelajar Pancasila (P5) */}
        {data.p5_projects.length > 0 && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Implementasi Autentik Kurikulum Merdeka TP {data.tahun_ajaran}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Etalase Projek Penguatan Profil Pelajar Pancasila (P5)
              </h2>
              <p className="text-sm text-slate-500">
                Pembelajaran kokurikuler lintas disiplin ilmu untuk membentuk karakter, budaya kerja industri, inovasi rekayasa teknologi, dan kewirausahaan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.p5_projects.map((p5) => (
                <div
                  key={p5.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-indigo-400 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        PROJEK KOKURIKULER P5 • {p5.semester.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        {p5.jumlah_fasilitator} Guru Fasilitator
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                      {p5.judul}
                    </h3>

                    {p5.deskripsi && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {p5.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Dimensi Profil Pelajar Pancasila yang Disasar:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p5.dimensi_fokus.map((dim, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {dim}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part 2: Dokumen Resmi Struktur Kurikulum (KOSP) Versi Cetak */}
        {data.subjects.length > 0 && (
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-bold uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Transparansi Dokumen Akademik Resmi (KOSP)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Struktur Kurikulum &amp; Alokasi Jam Pelajaran Resmi
                </h3>
                {data.karakteristik_kosp && (
                  <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                    {data.karakteristik_kosp}
                  </p>
                )}
              </div>

              {/* Action Buttons (Zoom, Pratinjau Cetak, Unduh PDF) */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setZoomMode('fit')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      zoomMode === 'fit'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Pas Layar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode('original')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      zoomMode === 'original'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>100% A4</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDirectDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isExportingPdf ? 'Merender PDF...' : 'Unduh PDF Resmi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Mode Cetak / Semua Jurusan</span>
                </button>
              </div>
            </div>

            {/* Selector Konsentrasi Keahlian (Jurusan) */}
            {jurusans.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Pilih Konsentrasi Keahlian (Jurusan):</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {jurusans.map((j) => {
                    const isActive = selectedJurusan?.id === j.id;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => setSelectedJurusanId(j.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {j.singkatan ? `${j.singkatan} — ${j.nama}` : j.nama}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Embedded Official A4 Document Sheet (Versi Cetak) */}
            <div id="public-struktur-kurikulum-desk" className="w-full">
              <PrintDeskCanvas
                orientation="portrait"
                zoomMode={zoomMode}
                onZoomModeChange={setZoomMode}
                className="max-h-none bg-slate-200/75 border-slate-300 py-6 sm:py-10"
              >
                <StrukturKurikulumDocumentSheet
                  mappingData={data.subjects}
                  selectedJurusan={selectedJurusan}
                  allJurusans={jurusans}
                  tahunPelajaranNama={data.tahun_ajaran}
                  jenjang={data.jenjang || 'SMK'}
                  tenantInfo={enrichedTenantInfo}
                  showLogoDaerah={true}
                  showLogoSekolah={true}
                  wakaKurikulumNama={data.signers?.waka_kurikulum_nama || 'Wakasek Bidang Kurikulum'}
                  wakaKurikulumNip={data.signers?.waka_kurikulum_nip || '-'}
                  kepalaSekolahNama={data.signers?.kepsek_nama || 'Kepala Sekolah'}
                  kepalaSekolahNip={data.signers?.kepsek_nip || '-'}
                  kotaTitimangsa={data.signers?.kota || 'Purwakarta'}
                  tanggalTitimangsa={defaultAcademicDate}
                  pageNumber={1}
                  totalPages={1}
                />
              </PrintDeskCanvas>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1 flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                Dokumen disajikan menggunakan standar tata naskah dinas Universal Document Printing (A4 Portrait).
              </span>
              <span>
                Klik <strong>Mode Cetak / Semua Jurusan</strong> untuk mencetak satu per satu atau seluruh konsentrasi keahlian sekaligus.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal Pratinjau Cetak Penuh / Cetak Semua Jurusan */}
      <StrukturKurikulumPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mappingData={data.subjects}
        selectedJurusan={selectedJurusan}
        allJurusans={jurusans}
        tahunPelajaranNama={data.tahun_ajaran}
        jenjang={data.jenjang || 'SMK'}
        tenantInfoOverride={enrichedTenantInfo}
        signersOverride={data.signers}
        isPublicMode={true}
      />
    </section>
  );
};
