import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Award,
  Download,
  ExternalLink,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileCheck2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { raporApi } from '@/api/rapor.api';
import { useAuthStore } from '@/store/authStore';
import { resolveCoverImageBase64 } from '@/utils/print/rapor/raporShared';
import {
  generateSertifikatUkkSinglePdf,
  generateSertifikatUkkBatchPdf,
  formatTanggalIndonesia,
  type SertifikatUkkPrintData,
} from '@/utils/print/modules/pdfSertifikatUkk';

export interface UkkStudentItem {
  id: string;
  nama_siswa: string;
  nis?: string;
  nisn?: string;
  kelas?: string;
  nomor_sertifikat?: string;
  predikat?: string;
  nilai_praktik?: number | string;
  nilai_teori?: number | string;
  nilai_akhir?: number | string;
  asesor_internal?: string;
  asesor_eksternal?: string;
  mitra_nama?: string;
  isCompleted?: boolean;
}

export interface UniversalUkkSertifikatViewProps {
  siswaId?: string;
  namaSiswa?: string;
  nomorSertifikat?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  studentsList?: UkkStudentItem[];
  isModal?: boolean;
  hideLayout?: boolean;
  onClose?: () => void;
  className?: string;
}

export const UkkSertifikatView: React.FC<UniversalUkkSertifikatViewProps> = ({
  siswaId,
  namaSiswa,
  nomorSertifikat,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
  studentsList = [],
  isModal = false,
  hideLayout = false,
  onClose,
  className = '',
}) => {
  // Normalize students list
  const allStudents = useMemo<UkkStudentItem[]>(() => {
    if (studentsList && studentsList.length > 0) {
      return studentsList;
    }
    if (siswaId) {
      return [
        {
          id: siswaId,
          nama_siswa: namaSiswa || 'Siswa',
          nomor_sertifikat: nomorSertifikat,
          kelas: kelasNama,
          isCompleted: true,
        },
      ];
    }
    return [];
  }, [studentsList, siswaId, namaSiswa, nomorSertifikat, kelasNama]);

  // Selected student index
  const initialIndex = useMemo(() => {
    if (!siswaId || allStudents.length === 0) return 0;
    const foundIdx = allStudents.findIndex((s) => s.id === siswaId);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [siswaId, allStudents]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentStudent = allStudents[currentIndex] || {
    id: siswaId || '',
    nama_siswa: namaSiswa || 'Siswa',
    nomor_sertifikat: nomorSertifikat,
    kelas: kelasNama,
  };

  const activeSiswaId = currentStudent.id;

  // Render Sertifikat UKK via jsPDF (Instant, reliable, kebal dari timeout puppeteer)
  useEffect(() => {
    if (!activeSiswaId) {
      setBlobUrl(null);
      setIsLoadingPdf(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingPdf(true);
    setFetchError(null);

    const buildPdf = async () => {
      try {
        // 1. Fetch School & Tenant Details & UKK Settings (concurrent)
        const [sekolahRes, ukkRes, settingsRes] = await Promise.allSettled([
          sekolahApi.getProfile(),
          // If current student doesn't have score/asesor, fetch from UKK backend
          !currentStudent.nilai_praktik || !currentStudent.asesor_eksternal
            ? raporApi.getUkk({ siswa_id: activeSiswaId }).catch(() => null)
            : Promise.resolve(null),
          raporApi.getUkkSettings(jurusanId).catch(() => null),
        ]);

        if (isCancelled) return;

        const sekolahData: any =
          sekolahRes.status === 'fulfilled'
            ? (sekolahRes.value as any)?.data || sekolahRes.value
            : null;
        const tenantInfo: any = useAuthStore.getState().user?.tenant;

        const ukkRaw = ukkRes.status === 'fulfilled' ? (ukkRes.value as any) : null;
        const ukkRecord =
          Array.isArray(ukkRaw?.data) && ukkRaw.data.length > 0
            ? ukkRaw.data.find((u: any) => u.siswa_id === activeSiswaId) || ukkRaw.data[0]
            : ukkRaw?.data || null;

        const settingsRaw = settingsRes.status === 'fulfilled' ? (settingsRes.value as any) : null;
        const jurusanSettings = settingsRaw?.data || settingsRaw || null;

        // 2. Resolve Logos Base64
        const logoDaerahUrl = sekolahData?.logo_daerah || null;
        const logoSekolahUrl = sekolahData?.logo_url || null;

        const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
          resolveCoverImageBase64(logoDaerahUrl),
          resolveCoverImageBase64(logoSekolahUrl),
        ]);

        if (isCancelled) return;

        // 3. Assemble Print Data
        const certData: SertifikatUkkPrintData = {
          nomor_sertifikat:
            currentStudent.nomor_sertifikat ||
            ukkRecord?.nomor_sertifikat ||
            `UKK/${new Date().getFullYear()}/${currentStudent.nis || '0001'}`,
          tanggal_terbit: ukkRecord?.tanggal_terbit
            ? `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(ukkRecord.tanggal_terbit)}`
            : `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(new Date())}`,
          sekolah: {
            nama: sekolahData?.nama || tenantInfo?.name || 'SEKOLAH MENENGAH KEJURUAN',
            alamat: sekolahData?.alamat || '',
            kota: sekolahData?.kota || 'Purwakarta',
            telepon: sekolahData?.telepon || '',
            email: sekolahData?.email || '',
            website: sekolahData?.website || '',
            kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
            nip_kepala: sekolahData?.nip_kepala || '-',
            nama_dinas_atas: sekolahData?.nama_dinas_atas,
            nama_dinas_bawah: sekolahData?.nama_dinas_bawah,
            nama_cabang_dinas: sekolahData?.nama_cabang_dinas,
            print_header_lines: sekolahData?.print_header_lines,
          },
          siswa: {
            nama_siswa: currentStudent.nama_siswa,
            nis: currentStudent.nis || ukkRecord?.Siswa?.nis,
            nisn: currentStudent.nisn || ukkRecord?.Siswa?.nisn,
            nama_kelas: currentStudent.kelas || ukkRecord?.Siswa?.Kelas?.nama_kelas || kelasNama,
            program_keahlian:
              jurusanNama ||
              ukkRecord?.Siswa?.Kelas?.Jurusan?.nama_jurusan ||
              'Teknik Komputer dan Jaringan',
            konsentrasi_keahlian:
              jurusanNama ||
              ukkRecord?.Siswa?.Kelas?.Jurusan?.nama_jurusan ||
              'Teknik Komputer dan Jaringan',
          },
          ukk: {
            skema_sertifikasi:
              jurusanSettings?.skema_sertifikasi || undefined,
            judul_penugasan:
              jurusanSettings?.judul_penugasan_id || undefined,
            judul_penugasan_en:
              jurusanSettings?.judul_penugasan_en || undefined,
            predikat: currentStudent.predikat || ukkRecord?.predikat || 'KOMPETEN',
            nilai_praktik: currentStudent.nilai_praktik ?? ukkRecord?.nilai_praktik ?? 85,
            nilai_teori: currentStudent.nilai_teori ?? ukkRecord?.nilai_teori ?? 86,
            nilai_akhir: currentStudent.nilai_akhir ?? ukkRecord?.nilai_akhir,
            asesor_internal:
              currentStudent.asesor_internal ||
              ukkRecord?.asesor_internal ||
              'Tim Asesor Sekolah',
            asesor_eksternal:
              currentStudent.asesor_eksternal ||
              ukkRecord?.asesor_eksternal ||
              'Penguji Asosiasi Industri',
            mitra_nama:
              currentStudent.mitra_nama ||
              ukkRecord?.MitraIndustri?.nama ||
              'Mitra Industri / DU-DI',
            ttd_asesor_internal:
              jurusanSettings?.ttd_asesor_internal || undefined,
            ttd_asesor_eksternal:
              jurusanSettings?.ttd_asesor_eksternal || undefined,
            ttd_kepala_sekolah:
              jurusanSettings?.ttd_kepala_sekolah || undefined,
            unit_kompetensi:
              Array.isArray(jurusanSettings?.unit_kompetensi) && jurusanSettings.unit_kompetensi.length > 0
                ? jurusanSettings.unit_kompetensi
                : undefined,
          },
        };

        // 4. Generate with jsPDF
        const { blobUrl: generatedUrl } = await generateSertifikatUkkSinglePdf(certData, {
          logoDaerahBase64,
          logoSekolahBase64,
        });

        if (isCancelled) return;

        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return generatedUrl;
        });
        setIsLoadingPdf(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to generate jsPDF UKK certificate:', err);
        setFetchError(err.message || 'Gagal merender sertifikat UKK');
        setIsLoadingPdf(false);
      }
    };

    buildPdf();

    return () => {
      isCancelled = true;
    };
  }, [activeSiswaId, reloadKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allStudents.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSelectStudent = (newId: string) => {
    const idx = allStudents.findIndex((s) => s.id === newId);
    if (idx !== -1 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Iframe print blocked, falling back to window.open', err);
      }
    }
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleDownloadSingle = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Sertifikat_UKK_${(currentStudent.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Batch download sekelas via jsPDF (Instant compile)
  const handleBatchDownload = async () => {
    if (allStudents.length === 0 || isBatchDownloading) return;
    setIsBatchDownloading(true);

    try {
      const [sekolahRes, settingsRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        raporApi.getUkkSettings(jurusanId).catch(() => null),
      ]);
      const sekolahData: any = (sekolahRes as any)?.data || sekolahRes;
      const settingsData: any = (settingsRes as any)?.data || settingsRes;
      const tenantInfo: any = useAuthStore.getState().user?.tenant;

      const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
        resolveCoverImageBase64(sekolahData?.logo_daerah),
        resolveCoverImageBase64(sekolahData?.logo_url),
      ]);

      const certList: SertifikatUkkPrintData[] = allStudents.map((s) => ({
        nomor_sertifikat:
          s.nomor_sertifikat || `UKK/${new Date().getFullYear()}/${s.nis || '0001'}`,
        tanggal_terbit: `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(new Date())}`,
        sekolah: {
          nama: sekolahData?.nama || tenantInfo?.name || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: sekolahData?.alamat || '',
          kota: sekolahData?.kota || 'Purwakarta',
          telepon: sekolahData?.telepon || '',
          email: sekolahData?.email || '',
          website: sekolahData?.website || '',
          kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: sekolahData?.nip_kepala || '-',
          nama_dinas_atas: sekolahData?.nama_dinas_atas,
          nama_dinas_bawah: sekolahData?.nama_dinas_bawah,
          nama_cabang_dinas: sekolahData?.nama_cabang_dinas,
          print_header_lines: sekolahData?.print_header_lines,
        },
        siswa: {
          nama_siswa: s.nama_siswa,
          nis: s.nis,
          nisn: s.nisn,
          nama_kelas: s.kelas || kelasNama,
          program_keahlian: jurusanNama || 'Teknik Komputer dan Jaringan',
          konsentrasi_keahlian: jurusanNama || 'Teknik Komputer dan Jaringan',
        },
        ukk: {
          skema_sertifikasi: settingsData?.skema_sertifikasi || undefined,
          judul_penugasan: settingsData?.judul_penugasan_id || undefined,
          judul_penugasan_en: settingsData?.judul_penugasan_en || undefined,
          predikat: s.predikat || 'KOMPETEN',
          nilai_praktik: s.nilai_praktik ?? 85,
          nilai_teori: s.nilai_teori ?? 86,
          nilai_akhir: s.nilai_akhir,
          asesor_internal: s.asesor_internal || 'Tim Asesor Sekolah',
          asesor_eksternal: s.asesor_eksternal || 'Penguji Asosiasi Industri',
          mitra_nama: s.mitra_nama || 'Mitra Industri / DU-DI',
          ttd_asesor_internal: settingsData?.ttd_asesor_internal || undefined,
          ttd_asesor_eksternal: settingsData?.ttd_asesor_eksternal || undefined,
          ttd_kepala_sekolah: settingsData?.ttd_kepala_sekolah || undefined,
          unit_kompetensi:
            Array.isArray(settingsData?.unit_kompetensi) && settingsData.unit_kompetensi.length > 0
              ? settingsData.unit_kompetensi
              : undefined,
        },
      }));

      const { blobUrl: batchUrl, filename: batchFilename } = await generateSertifikatUkkBatchPdf(
        certList,
        kelasNama || 'Sekelas',
        undefined,
        { logoDaerahBase64, logoSekolahBase64 }
      );

      const a = document.createElement('a');
      a.href = batchUrl;
      a.download = batchFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(batchUrl), 5000);
    } catch (e) {
      console.error('Failed batch download via jsPDF:', e);
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const getPredikatBadge = (predikat?: string) => {
    if (!predikat) return null;
    const upper = predikat.toUpperCase();
    if (upper.includes('SANGAT BAIK') || upper.includes('SANGAT KOMPETEN')) {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold"
        >
          {predikat}
        </Badge>
      );
    }
    if (upper.includes('BAIK') || upper.includes('KOMPETEN')) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-700 dark:text-blue-300 text-[11px] font-bold"
        >
          {predikat}
        </Badge>
      );
    }
    if (upper.includes('CUKUP')) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-300 text-[11px] font-bold"
        >
          {predikat}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[11px] font-bold">
        {predikat}
      </Badge>
    );
  };

  return (
    <div className={cn('flex flex-col w-full h-full space-y-3', className)}>
      {/* Universal Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Student Switcher & Info */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {allStudents.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0 || isLoadingPdf}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer disabled:opacity-30"
                title="Siswa Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 min-w-[50px] text-center">
                {currentIndex + 1} / {allStudents.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === allStudents.length - 1 || isLoadingPdf}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer disabled:opacity-30"
                title="Siswa Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Student Selector Dropdown if multi-student */}
          {allStudents.length > 1 ? (
            <select
              value={currentStudent.id}
              onChange={(e) => handleSelectStudent(e.target.value)}
              disabled={isLoadingPdf}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-[220px] sm:max-w-[280px] truncate cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_siswa} {s.nis ? `(${s.nis})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentStudent.nama_siswa}
              </span>
            </div>
          )}

          {/* Student Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentStudent.kelas && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              >
                {currentStudent.kelas}
              </Badge>
            )}
            {getPredikatBadge(currentStudent.predikat)}
            {currentStudent.nomor_sertifikat && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                No: {currentStudent.nomor_sertifikat}
              </span>
            )}
          </div>
        </div>

        {/* Right: Print & Download Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={isLoadingPdf}
            className="h-8 px-2.5 text-xs font-semibold rounded-xl cursor-pointer"
            title="Muat ulang dokumen"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5 text-slate-500', isLoadingPdf && 'animate-spin')}
            />
            <span className="hidden sm:inline ml-1">Reload</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (blobUrl) window.open(blobUrl, '_blank');
            }}
            disabled={!blobUrl || isLoadingPdf}
            className="h-8 px-3 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-40"
            title="Buka sertifikat di tab baru browser"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
            <span className="hidden sm:inline">Tab Baru</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!blobUrl || isLoadingPdf}
            className="h-8 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-40"
            title="Cetak sertifikat"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 mr-1.5" />
            <span>Cetak</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSingle}
            disabled={!blobUrl || isLoadingPdf}
            className="h-8 px-3 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer disabled:opacity-40"
            title="Unduh file PDF"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Unduh</span>
          </Button>

          {allStudents.length > 1 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleBatchDownload}
              disabled={isBatchDownloading}
              className="h-8 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              title="Unduh seluruh sertifikat siswa di kelas ini dalam satu berkas PDF"
            >
              {isBatchDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  <span>Unduh Sekelas ({allStudents.length})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main PDF Display Canvas */}
      <div
        className={cn(
          'relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-inner',
          isModal ? 'h-[calc(92vh-150px)]' : 'h-[calc(100vh-220px)] min-h-[580px]'
        )}
      >
        {isLoadingPdf && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-slate-900/90 z-20 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Merender Dokumen Sertifikat UKK Resmi (jsPDF Engine)...
            </p>
            <p className="text-[11px] text-slate-400">
              {currentStudent.nama_siswa} {currentStudent.nis ? `• NIS: ${currentStudent.nis}` : ''}
            </p>
          </div>
        )}

        {fetchError ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Gagal Memuat Dokumen Sertifikat
            </h4>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mt-1">
              {fetchError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Coba Muat Ulang
            </Button>
          </div>
        ) : blobUrl ? (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            title={`Sertifikat UKK ${currentStudent.nama_siswa}`}
            className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 border-none"
          />
        ) : !isLoadingPdf ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <FileCheck2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak Ada Siswa Terpilih
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Silakan pilih siswa pada tabel UKK atau daftar rombel untuk meninjau dan mencetak sertifikat.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
