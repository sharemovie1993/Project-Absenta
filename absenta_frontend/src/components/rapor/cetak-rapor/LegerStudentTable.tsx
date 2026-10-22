import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  FileText,
  Edit3,
  Loader2,
  Award,
  BookOpen,
  Building2,
  FileSpreadsheet,
  ChevronDown,
  UserCheck,
  Sparkles,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LegerStudent } from '../../../types/cetakRapor.types';
import { RaporPrintMenu } from '../../rapor/RaporPrintMenu';
import { 
  PengaturanCetakSertifikatModal, 
  SertifikatPklPrintSettings, 
  getStoredSertifikatSettings, 
  saveStoredSertifikatSettings 
} from '../../hubin/PengaturanCetakSertifikatModal';
import { UkkSertifikatModal, type UkkStudentItem } from '../../academic/ukk/UkkSertifikatModal';

interface LegerStudentTableProps {
  students: LegerStudent[];
  isLoading: boolean;
  isJenjangSmk: boolean;
  showLogoKananSertifikat?: boolean;
  toggleShowLogoKananSertifikat?: () => void;
  pdfLoading?: Record<string, boolean>;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  onOpenSummaryModal: (student: LegerStudent) => void;
  onPrintRapor?: (student: LegerStudent) => void;
  onPrintP5?: (student: LegerStudent) => void;
  onPrintRaporPkl?: (student: LegerStudent) => void;
  onPrintSertifikatPkl?: (student: LegerStudent) => void;
  onPrintLeger?: () => void;
  onExportLeger?: () => void;
  onBatchPrintRapor?: () => void;
  onBatchPrintBiodata?: () => void;
  onBatchPrintRaporSumatif?: () => void;
  onBatchPrintP5?: () => void;
  onBatchPrintBundelLengkap?: () => void;
  isBatchPrinting?: boolean;
  onBatchPrintRaporPkl?: () => void;
  isBatchPklPrinting?: boolean;
  onBatchPrintSertifikatPkl?: () => void;
  isBatchSertifikatPrinting?: boolean;
  hasLegerData?: boolean;
  onOpenTranskripModal: (student: LegerStudent) => void;
  getPdfSklUrl?: (siswaId: string) => string;
  getPdfUkkUrl?: (siswaId: string) => string;
  modeCetakRapor?: 'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY';
}

export const LegerStudentTable: React.FC<LegerStudentTableProps> = React.memo(({
  students,
  isLoading,
  isJenjangSmk,
  pdfLoading = {},
  tahunPelajaranId,
  semesterId,
  tahunPelajaranNama,
  semesterNama,
  onOpenSummaryModal,
  onPrintRapor,
  onPrintP5,
  onPrintRaporPkl,
  onPrintSertifikatPkl,
  onPrintLeger,
  onExportLeger,
  onBatchPrintRapor,
  onBatchPrintBiodata,
  onBatchPrintRaporSumatif,
  onBatchPrintP5,
  onBatchPrintBundelLengkap,
  isBatchPrinting = false,
  onBatchPrintRaporPkl,
  isBatchPklPrinting = false,
  onBatchPrintSertifikatPkl,
  isBatchSertifikatPrinting = false,
  hasLegerData = true,
  onOpenTranskripModal,
  getPdfSklUrl,
  getPdfUkkUrl,
  modeCetakRapor = 'CP_ONLY',
  showLogoKananSertifikat = false,
  toggleShowLogoKananSertifikat,
}) => {
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const [isCetakSekaligusMenuOpen, setIsCetakSekaligusMenuOpen] = useState(false);
  const [isSertifikatSettingsModalOpen, setIsSertifikatSettingsModalOpen] = useState(false);
  const [isUkkModalOpen, setIsUkkModalOpen] = useState(false);
  const [selectedUkkStudent, setSelectedUkkStudent] = useState<LegerStudent | null>(null);
  const [sertifikatSettings, setSertifikatSettings] = useState<SertifikatPklPrintSettings>(() => getStoredSertifikatSettings());
  const batchMenuRef = useRef<HTMLDivElement>(null);
  const cetakSekaligusMenuRef = useRef<HTMLDivElement>(null);

  const ukkStudentsList: UkkStudentItem[] = React.useMemo(() => {
    return (students || []).map((s) => ({
      id: s.id,
      nama_siswa: s.nama_siswa,
      nis: s.nis,
      kelas: s.kelas_nama,
      isCompleted: true,
    }));
  }, [students]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchMenuRef.current && !batchMenuRef.current.contains(event.target as Node)) {
        setIsBatchMenuOpen(false);
      }
      if (cetakSekaligusMenuRef.current && !cetakSekaligusMenuRef.current.contains(event.target as Node)) {
        setIsCetakSekaligusMenuOpen(false);
      }
    };
    if (isBatchMenuOpen || isCetakSekaligusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBatchMenuOpen, isCetakSekaligusMenuOpen]);

  if (isLoading) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-none shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs font-semibold text-slate-400">Memuat matriks leger & data siswa...</p>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-none shadow-xs">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500">Tidak ada siswa ditemukan pada kelas ini.</p>
      </Card>
    );
  }

  return (
    <Card className="p-0 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden dark:bg-slate-900/40 w-full max-w-full min-w-0">
      {/* Action Toolbar di atas header tabel sebelah kanan */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Daftar Siswa</span>
          <Badge variant="outline" className="text-[10px] font-bold border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            {students.length} Siswa
          </Badge>
        </div>

        {/* Sisi Kanan: Cetak Sekaligus, Toggle Logo PKL, & Buku Leger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tombol Buka Modal Pengaturan Cetak Sertifikat PKL (SMK) */}
          {isJenjangSmk && (
            <button
              type="button"
              onClick={() => setIsSertifikatSettingsModalOpen(true)}
              title="Pengaturan Cetak Sertifikat PKL: Logo, Nama PIC, Nama DUDI, & Jabatan"
              className="flex items-center gap-1.5 h-[36px] px-3.5 rounded-xl border border-indigo-500/40 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Pengaturan Sertifikat</span>
              <span className="sm:hidden">Opsi Cetak</span>
            </button>
          )}

          {/* Tombol Toggle Instan On-The-Fly: Logo Kanan Sertifikat PKL (SMK) */}
          {isJenjangSmk && toggleShowLogoKananSertifikat && (
            <button
              type="button"
              onClick={toggleShowLogoKananSertifikat}
              title="Sakelar instan (on-the-fly): aktifkan atau nonaktifkan logo kanan (Logo Sekolah) pada kop Sertifikat PKL"
              className={`hidden sm:flex items-center gap-1.5 h-[36px] px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showLogoKananSertifikat
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Logo Kanan Sertifikat:</span>
              <span className={showLogoKananSertifikat ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400 font-bold'}>
                {showLogoKananSertifikat ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Dropdown Utama: Cetak Sekaligus */}
          <div className="relative inline-block text-left" ref={cetakSekaligusMenuRef}>
            <Button
              onClick={() => setIsCetakSekaligusMenuOpen((prev) => !prev)}
              disabled={isBatchPrinting || !hasLegerData || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all h-[36px] px-3.5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
              title="Pilihan cetak dokumen rapor sekelas dalam 1 file PDF gabungan"
            >
              {isBatchPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Cetak Sekaligus</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCetakSekaligusMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isCetakSekaligusMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    PILIHAN CETAK MASSAL ({students.length} SISWA)
                  </p>
                </div>

                <div className="p-1 space-y-0.5">
                  {/* 1. BIODATA & COVER */}
                  {onBatchPrintBiodata && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCetakSekaligusMenuOpen(false);
                        onBatchPrintBiodata();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <UserCheck size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          Biodata &amp; Sampul Rapor
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Cover &amp; 17 Butir Data Diri (2 Hal/Siswa)
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 2. RAPOR SEMESTER CK1-CK2 */}
                  {onBatchPrintRapor && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCetakSekaligusMenuOpen(false);
                        onBatchPrintRapor();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          Rapor Semester (CK1 &amp; CK2)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Intrakurikuler, Ekskul, Presensi &amp; Catatan
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 3. RAPOR SUMATIF */}
                  {onBatchPrintRaporSumatif && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCetakSekaligusMenuOpen(false);
                        onBatchPrintRaporSumatif();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Award size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                          Rapor Penilaian Sumatif
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Daftar Nilai Sumatif Lingkup Materi
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 4. RAPOR P5 */}
                  {onBatchPrintP5 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCetakSekaligusMenuOpen(false);
                        onBatchPrintP5();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                          Rapor Projek (P5)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Kokurikuler Profil Pelajar Pancasila
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 5. RAPOR PKL (SMK) */}
                  {isJenjangSmk && onBatchPrintRaporPkl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCetakSekaligusMenuOpen(false);
                        onBatchPrintRaporPkl();
                      }}
                      disabled={isBatchPklPrinting}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group disabled:opacity-50"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {isBatchPklPrinting ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                          Rapor PKL (Praktik Kerja Lapangan)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Kompilasi Penilaian DUDI Sekelas
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 6. SERTIFIKAT PKL (SMK) */}
                  {isJenjangSmk && onBatchPrintSertifikatPkl && (
                    <div className="flex items-center gap-1 group">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCetakSekaligusMenuOpen(false);
                          onBatchPrintSertifikatPkl();
                        }}
                        disabled={isBatchSertifikatPrinting}
                        className="flex-1 text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {isBatchSertifikatPrinting ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                            Sertifikat PKL (SMK)
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Kompilasi Piagam &amp; Transkrip Nilai DUDI Sekelas
                          </div>
                        </div>
                      </button>
                      {isJenjangSmk && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSertifikatSettingsModalOpen(true);
                          }}
                          title="Buka Pengaturan Lengkap Cetak Sertifikat PKL (Logo, PIC, DUDI, dll)"
                          className="px-2 py-1 mr-1 text-[10px] font-bold rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Atur</span>
                        </button>
                      )}
                      {toggleShowLogoKananSertifikat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleShowLogoKananSertifikat();
                          }}
                          title="Klik untuk Mengaktifkan/Menonaktifkan Logo Kanan Kop Surat pada Sertifikat PKL secara instan"
                          className={`px-2 py-1 mr-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                            showLogoKananSertifikat
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Logo Kanan: {showLogoKananSertifikat ? 'ON' : 'OFF'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. BUNDEL LENGKAP */}
                {onBatchPrintBundelLengkap && (
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCetakSekaligusMenuOpen(false);
                        onBatchPrintBundelLengkap();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Layers size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                          Bundel Rapor Lengkap Sekelas
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Cover + Biodata + Nilai CK1-CK2 Terpadu
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dropdown Aksi Sekunder: Buku Leger */}
          {onPrintLeger && (
            <div className="relative inline-block text-left" ref={batchMenuRef}>
              <Button
                variant="outline"
                onClick={() => setIsBatchMenuOpen((prev) => !prev)}
                disabled={!hasLegerData || isLoading}
                className="border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Opsi cetak buku leger nilai, rapor PKL, dan ekspor excel sekelas"
              >
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Buku Leger</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-transform ${isBatchMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isBatchMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 space-y-0.5">
                    {/* CETAK BUKU LEGER KELAS */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchMenuOpen(false);
                        onPrintLeger();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                          Buku Leger
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Format resmi PDF
                        </div>
                      </div>
                    </button>

                    {/* EKSPOR EXCEL LEGER KELAS */}
                    {onExportLeger && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMenuOpen(false);
                          onExportLeger();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Printer size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                            Ekspor Excel
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            File spreadsheet (.xlsx)
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {isJenjangSmk && onBatchPrintRaporPkl && (
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMenuOpen(false);
                          onBatchPrintRaporPkl();
                        }}
                        disabled={isBatchPklPrinting}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group disabled:opacity-50"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {isBatchPklPrinting ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                            Rapor PKL
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Kompilasi PDF PKL
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {isJenjangSmk && onBatchPrintSertifikatPkl && (
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMenuOpen(false);
                          onBatchPrintSertifikatPkl();
                        }}
                        disabled={isBatchSertifikatPrinting}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group disabled:opacity-50"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {isBatchSertifikatPrinting ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                            Sertifikat PKL
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Kompilasi Piagam Sekelas
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {isJenjangSmk && (
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMenuOpen(false);
                          setSelectedUkkStudent(students[0] || null);
                          setIsUkkModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Award size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-orange-700 dark:group-hover:text-orange-300">
                            Sertifikat UKK Sekelas
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Pratinjau &amp; Cetak Massal
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto w-full max-w-full min-w-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3.5 text-center w-12">Rank</th>
              <th className="p-3.5">Nama Siswa / NIS</th>
              <th className="p-3.5 text-center">Rata-Rata</th>
              <th className="p-3.5 text-center">Presensi (S/I/A)</th>
              <th className="p-3.5 text-center">Catatan Wali</th>
              <th className="p-3.5 text-right pr-4">Aksi Cetak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(students ?? []).map((student) => {
              const isRaporLoading = !!pdfLoading[`rapor_${student.id}`];
              const isP5Loading = !!pdfLoading[`p5_${student.id}`];
              const isPklLoading = !!pdfLoading[`pkl_${student.id}`];

              return (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Rank */}
                  <td className="p-3.5 text-center font-black text-slate-700 dark:text-slate-200">
                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 font-black border-slate-300 text-slate-700 dark:text-slate-200 text-xs">
                      #{student.rank}
                    </Badge>
                  </td>

                  {/* Siswa */}
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {student.nama_siswa}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      NIS: {student.nis}
                    </div>
                  </td>

                  {/* Rata-Rata Rapor */}
                  <td className="p-3.5 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {student.rata_rata || '0'}
                  </td>

                  {/* Presensi */}
                  <td className="p-3.5 text-center">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                      <span className="text-amber-600 font-bold">{student.sakit}</span> /{' '}
                      <span className="text-blue-600 font-bold">{student.izin}</span> /{' '}
                      <span className="text-rose-600 font-bold">{student.alpa}</span>
                    </span>
                  </td>

                  {/* Catatan Wali Kelas */}
                  <td className="p-3.5 text-center max-w-[200px] truncate">
                    {student.catatan_wali ? (
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] italic truncate block">
                        "{student.catatan_wali}"
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-[10px]">Belum diisi</span>
                    )}
                  </td>

                  {/* Action Group (Opsi A: Clean Ergonomic Dropdown UI) */}
                  <td className="p-3.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-2 flex-nowrap">
                      {/* Absensi & Catatan Wali Kelas */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSummaryModal(student)}
                        className="text-xs font-semibold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 whitespace-nowrap flex-shrink-0"
                        title="Isi presensi & catatan perkembangan siswa"
                      >
                        <Edit3 size={13} className="mr-1 flex-shrink-0 text-slate-500" />
                        <span>Catatan</span>
                      </Button>

                      {/* Dropdown Cetak Dokumen Rapor Lengkap (Termasuk Transkrip) */}
                      <RaporPrintMenu
                        studentId={student.id}
                        studentName={student.nama_siswa}
                        tahunPelajaranId={tahunPelajaranId}
                        semesterId={semesterId}
                        tahunPelajaranNama={tahunPelajaranNama}
                        semesterNama={semesterNama}
                        hasPkl={isJenjangSmk !== false}
                        hasUkk={isJenjangSmk !== false}
                        hasSkl={true}
                        showSumatifArchive={modeCetakRapor === 'SUMATIF_AND_CP' || modeCetakRapor === 'SUMATIF_ONLY'}
                        onPrintRaporPkl={() => onPrintRaporPkl?.(student)}
                        onPrintSertifikatPkl={() => onPrintSertifikatPkl?.(student)}
                        onPrintSertifikatUkk={() => {
                          setSelectedUkkStudent(student);
                          setIsUkkModalOpen(true);
                        }}
                        onOpenTranskrip={() => onOpenTranskripModal(student)}
                      />
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Pengaturan Cetak Sertifikat PKL */}
      {isJenjangSmk && (
        <PengaturanCetakSertifikatModal
          isOpen={isSertifikatSettingsModalOpen}
          onClose={() => setIsSertifikatSettingsModalOpen(false)}
          currentSettings={sertifikatSettings}
          onSave={(newSettings) => {
            setSertifikatSettings(newSettings);
            if (toggleShowLogoKananSertifikat && newSettings.showLogoKanan !== showLogoKananSertifikat) {
              toggleShowLogoKananSertifikat();
            }
          }}
        />
      )}

      {/* Modal Universal Sertifikat UKK */}
      {isJenjangSmk && (
        <UkkSertifikatModal
          isOpen={isUkkModalOpen}
          onClose={() => {
            setIsUkkModalOpen(false);
            setSelectedUkkStudent(null);
          }}
          siswaId={selectedUkkStudent?.id || students[0]?.id}
          namaSiswa={selectedUkkStudent?.nama_siswa || students[0]?.nama_siswa}
          kelasNama={students[0]?.kelas_nama}
          studentsList={ukkStudentsList}
        />
      )}
    </Card>
  );
});
