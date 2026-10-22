import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import {
  UniversalDocumentModal,
  UniversalDocumentTab,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
  type DocumentTemplateOption,
} from '@/components/ui';
import { raporApi } from '@/api/rapor.api';
import {
  generateSertifikatUkkSinglePdf,
  generateSertifikatUkkBatchPdf,
  formatTanggalIndonesia,
  getDefaultUnitKompetensi,
  TUT_WURI_LOGO_SVG,
  type SertifikatUkkPrintData,
  type UkkUnitKompetensi,
} from '@/utils/print/modules/pdfSertifikatUkk';
import {
  getUkkRegulatoryEdition,
  calculateUkkPredikat,
} from '@/config/ukkRegulatoryRegistry';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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
  tahun_ajaran?: string;
}

export interface UniversalUkkSertifikatViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  siswaId?: string;
  namaSiswa?: string;
  nomorSertifikat?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  tahunAjaran?: string;
  studentsList?: UkkStudentItem[];
  isModal?: boolean;
  hideLayout?: boolean;
  className?: string;
}

export const CERTIFICATE_TEMPLATES: DocumentTemplateOption[] = [
  { id: 'kemdikbud_2026', label: 'Pedoman Kemendikdasmen 2026 (Resmi)' },
  { id: 'kemdikbud_2024', label: 'Pedoman Kemendikbudristek TA 2023/2024 (Arsip)' },
  { id: 'modern', label: 'Modern DU/DI Industri' },
  { id: 'classic', label: 'Piagam Ornamen Emas (Klasik)' },
  { id: 'suket_lampiran_2', label: 'Surat Keterangan Mengikuti UKK (Lampiran 2 Juknis)' },
];

export const UkkSertifikatView: React.FC<UniversalUkkSertifikatViewProps> = ({
  isOpen = true,
  onClose = () => {},
  siswaId,
  namaSiswa,
  nomorSertifikat,
  kelasId: _kelasId,
  kelasNama,
  jurusanId,
  jurusanNama = 'Teknik Komputer dan Jaringan',
  tahunAjaran,
  studentsList = [],
  isModal = false,
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
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('kemdikbud_2026');

  const [isLoadingUkk, setIsLoadingUkk] = useState<boolean>(false);
  const [ukkRecord, setUkkRecord] = useState<any>(null);
  const [jurusanSettings, setJurusanSettings] = useState<any>(null);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const printSheetsRef = useRef<HTMLDivElement | null>(null);

  // Print Header Data hook: tenant info, school details, base64 logos
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  const currentStudent = allStudents[currentIndex] || {
    id: siswaId || '',
    nama_siswa: namaSiswa || 'Siswa',
    nomor_sertifikat: nomorSertifikat,
    kelas: kelasNama,
  };

  const activeSiswaId = currentStudent.id;
  const rawActiveYear =
    typeof currentStudent.tahun_ajaran === 'string'
      ? currentStudent.tahun_ajaran
      : (currentStudent.tahun_ajaran as any)?.tahun ||
        (typeof tahunAjaran === 'string' ? tahunAjaran : (tahunAjaran as any)?.tahun) ||
        '2025/2026';
  const activeTahunAjaran = String(rawActiveYear || '2025/2026');

  // Active Regulatory Edition based on active template or student academic year
  const activeEdition = useMemo(() => {
    if (selectedTemplate === 'kemdikbud_2024') return getUkkRegulatoryEdition('2023_2024');
    if (selectedTemplate === 'kemdikbud_2026') return getUkkRegulatoryEdition('2026');
    return getUkkRegulatoryEdition(activeTahunAjaran);
  }, [selectedTemplate, activeTahunAjaran]);

  // Fetch UKK student record and jurusan settings
  useEffect(() => {
    let isCancelled = false;
    if (!activeSiswaId) return;

    const loadData = async () => {
      setIsLoadingUkk(true);
      try {
        const [ukkRes, settingsRes] = await Promise.allSettled([
          raporApi.getUkk({ siswa_id: activeSiswaId, tahun_ajaran: activeTahunAjaran }).catch(() => null),
          raporApi.getUkkSettings(jurusanId, activeTahunAjaran).catch(() => null),
        ]);

        if (isCancelled) return;

        const ukkRaw = ukkRes.status === 'fulfilled' ? (ukkRes.value as any) : null;
        const record =
          Array.isArray(ukkRaw?.data) && ukkRaw.data.length > 0
            ? ukkRaw.data.find((u: any) => u.siswa_id === activeSiswaId) || ukkRaw.data[0]
            : ukkRaw?.data || null;

        const settingsRaw = settingsRes.status === 'fulfilled' ? (settingsRes.value as any) : null;
        setUkkRecord(record);
        setJurusanSettings(settingsRaw?.data || settingsRaw || null);
      } catch (err) {
        console.warn('Error loading UKK details:', err);
      } finally {
        if (!isCancelled) setIsLoadingUkk(false);
      }
    };

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [activeSiswaId, jurusanId, activeTahunAjaran]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentIndex < allStudents.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const handleSelectStudent = (newId: string) => {
    const idx = allStudents.findIndex((s) => s.id === newId);
    if (idx !== -1 && idx !== currentIndex) setCurrentIndex(idx);
  };

  // Assembled active certificate data & Regulatory Evaluation
  const certData: SertifikatUkkPrintData = useMemo(() => {
    const nomor =
      currentStudent.nomor_sertifikat ||
      ukkRecord?.nomor_sertifikat ||
      `UKK/${new Date().getFullYear()}/${currentStudent.nis || '0001'}`;

    const tanggalTerbit = ukkRecord?.tanggal_terbit
      ? `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(ukkRecord.tanggal_terbit)}`
      : `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(new Date())}`;

    const unitKompetensiList: UkkUnitKompetensi[] =
      Array.isArray(jurusanSettings?.unit_kompetensi) && jurusanSettings.unit_kompetensi.length > 0
        ? jurusanSettings.unit_kompetensi
        : getDefaultUnitKompetensi(jurusanNama);

    // Calculate dynamic scores & official 2026 threshold
    const rawNilaiPraktik = currentStudent.nilai_praktik ?? ukkRecord?.nilai_praktik ?? 85;
    const rawNilaiTeori = currentStudent.nilai_teori ?? ukkRecord?.nilai_teori ?? 86;
    const rawNilaiAkhir =
      currentStudent.nilai_akhir ??
      ukkRecord?.nilai_akhir ??
      Math.round((Number(rawNilaiPraktik) * 0.7) + (Number(rawNilaiTeori) * 0.3));

    const editionId = jurusanSettings?.edisi_pedoman || activeEdition.id;
    const computedPredikat = calculateUkkPredikat(rawNilaiAkhir, editionId);

    return {
      nomor_sertifikat: nomor,
      tanggal_terbit: tanggalTerbit,
      sekolah: {
        nama: sekolahData?.nama || tenantInfo?.name || 'SEKOLAH MENENGAH KEJURUAN',
        alamat: sekolahData?.alamat || tenantInfo?.address || '',
        kota: sekolahData?.kota || 'Purwakarta',
        telepon: sekolahData?.telepon || tenantInfo?.phone || '',
        email: sekolahData?.email || tenantInfo?.email || '',
        website: sekolahData?.website || tenantInfo?.website || '',
        kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
        nip_kepala: sekolahData?.nip_kepala || '-',
        nama_dinas_atas: sekolahData?.nama_dinas_atas || tenantInfo?.nama_dinas_atas,
        nama_dinas_bawah: sekolahData?.nama_dinas_bawah || tenantInfo?.nama_dinas_bawah,
        nama_cabang_dinas: sekolahData?.nama_cabang_dinas || tenantInfo?.nama_cabang_dinas,
        print_header_lines: sekolahData?.print_header_lines || tenantInfo?.print_header_lines,
      },
      siswa: {
        nama_siswa: currentStudent.nama_siswa,
        nis: currentStudent.nis || ukkRecord?.Siswa?.nis || '-',
        nisn: currentStudent.nisn || ukkRecord?.Siswa?.nisn || '-',
        nama_kelas: currentStudent.kelas || ukkRecord?.Siswa?.Kelas?.nama_kelas || kelasNama || 'Kelas XII',
        program_keahlian: jurusanNama,
        konsentrasi_keahlian: jurusanNama,
      },
      ukk: {
        skema_sertifikasi: jurusanSettings?.skema_sertifikasi || 'Sertifikasi Kompetensi Keahlian (UKK Mandiri)',
        judul_penugasan:
          jurusanSettings?.judul_penugasan_id ||
          'Implementasi Jaringan LAN dan Troubleshooting Perangkat Komputer',
        judul_penugasan_en:
          jurusanSettings?.judul_penugasan_en ||
          'Local Area Network Implementation and Hardware Troubleshooting',
        predikat: currentStudent.predikat || ukkRecord?.predikat || computedPredikat.predikatId,
        predikat_en: computedPredikat.predikatEn,
        nilai_praktik: rawNilaiPraktik,
        nilai_teori: rawNilaiTeori,
        nilai_akhir: rawNilaiAkhir,
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
        ttd_asesor_internal: jurusanSettings?.ttd_asesor_internal,
        ttd_asesor_eksternal: jurusanSettings?.ttd_asesor_eksternal,
        ttd_kepala_sekolah: jurusanSettings?.ttd_kepala_sekolah,
        unit_kompetensi: unitKompetensiList,
      },
    };
  }, [currentStudent, ukkRecord, jurusanSettings, sekolahData, tenantInfo, jurusanNama, kelasNama, activeEdition]);

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Single PDF Download via True WYSIWYG DOM Capture & jsPDF Fallback
  const handleDownloadSinglePdf = async () => {
    const isSuket = selectedTemplate === 'suket_lampiran_2';
    const cleanName = (certData.siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_');
    const prefix = isSuket ? 'SURAT_KETERANGAN_UKK' : 'SERTIFIKAT_UKK';
    const filename = `${prefix}_${cleanName}.pdf`;

    // 1. Primary Engine: True WYSIWYG Canvas Capture (Memotret Lembar Persis 1:1 Layar)
    try {
      const sheets = printSheetsRef.current?.querySelectorAll('.print-sheet');
      if (sheets && sheets.length > 0) {
        toast.loading('Menyiapkan dokumen sertifikat presisi...', { id: 'pdf-cert-export' });
        const html2canvas = (await import('html2canvas-pro')).default;
        const { jsPDF } = await import('jspdf');

        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: 'a4',
        });

        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i] as HTMLElement;
          const canvas = await html2canvas(sheet, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
          });

          const imgData = canvas.toDataURL('image/png');
          if (i > 0) {
            pdf.addPage('a4', orientation);
          }
          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        }

        pdf.save(filename);
        toast.success(
          isSuket
            ? 'Surat Keterangan PDF berhasil diunduh (Presisi 100% Layar)'
            : 'Sertifikat UKK berhasil diunduh (Presisi 100% Layar)',
          { id: 'pdf-cert-export' }
        );
        return;
      }
    } catch (err) {
      console.warn('Canvas export fallback to jsPDF programmatic:', err);
    }

    // 2. Fallback Engine: Programmatic Vector Generator
    try {
      const { blobUrl, filename: fallbackFilename } = await generateSertifikatUkkSinglePdf(certData, {
        logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
        logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
        editionId: activeEdition.id,
        templateType: isSuket ? 'suket_lampiran_2' : 'sertifikat',
      });

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fallbackFilename || filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      toast.success(isSuket ? 'Surat Keterangan UKK berhasil diunduh' : 'Sertifikat UKK berhasil diunduh');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh dokumen PDF');
    }
  };

  // Batch PDF Download via jsPDF
  const handleBatchDownload = async () => {
    if (allStudents.length === 0 || isBatchDownloading) return;
    setIsBatchDownloading(true);

    try {
      const isSuket = selectedTemplate === 'suket_lampiran_2';
      const certList: SertifikatUkkPrintData[] = allStudents.map((s) => {
        const sNilaiPraktik = s.nilai_praktik ?? certData.ukk.nilai_praktik ?? 85;
        const sNilaiTeori = s.nilai_teori ?? certData.ukk.nilai_teori ?? 86;
        const sNilaiAkhir =
          s.nilai_akhir ??
          Math.round(Number(sNilaiPraktik) * 0.7 + Number(sNilaiTeori) * 0.3);
        const sPredikat = calculateUkkPredikat(sNilaiAkhir, activeEdition.id);

        return {
          nomor_sertifikat:
            s.nomor_sertifikat || `UKK/${new Date().getFullYear()}/${s.nis || '0001'}`,
          tanggal_terbit: `${sekolahData?.kota || 'Purwakarta'}, ${formatTanggalIndonesia(new Date())}`,
          sekolah: certData.sekolah,
          siswa: {
            nama_siswa: s.nama_siswa,
            nis: s.nis || '-',
            nisn: s.nisn || '-',
            nama_kelas: s.kelas || kelasNama || 'Kelas XII',
            program_keahlian: jurusanNama,
            konsentrasi_keahlian: jurusanNama,
          },
          ukk: {
            ...certData.ukk,
            predikat: s.predikat || sPredikat.predikatId,
            predikat_en: sPredikat.predikatEn,
            nilai_praktik: sNilaiPraktik,
            nilai_teori: sNilaiTeori,
            nilai_akhir: sNilaiAkhir,
          },
        };
      });

      const { blobUrl, filename } = await generateSertifikatUkkBatchPdf(
        certList,
        kelasNama || 'Sekelas',
        undefined,
        {
          logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
          logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
          editionId: activeEdition.id,
          templateType: isSuket ? 'suket_lampiran_2' : 'sertifikat',
        }
      );

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success(
        isSuket
          ? `Berhasil mengunduh Surat Keterangan ${allStudents.length} siswa`
          : `Berhasil mengunduh Sertifikat ${allStudents.length} siswa`
      );
    } catch (e) {
      console.error('Batch download failed:', e);
      toast.error('Gagal mengunduh dokumen massal');
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // Student Selector Node for Universal Toolbar
  const studentSelectorNode = allStudents.length > 1 ? (
    <div className="flex items-center gap-2">
      <select
        value={currentStudent.id}
        onChange={(e) => handleSelectStudent(e.target.value)}
        className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-[200px] sm:max-w-[240px] truncate cursor-pointer focus:ring-2 focus:ring-primary shadow-xs"
      >
        {allStudents.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nama_siswa} {s.nis ? `(${s.nis})` : ''}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  // Title & Subtitle for Universal Toolbar
  const titleNode = (
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
        <Award className="w-4 h-4" />
      </div>
      <span className="font-bold text-sm sm:text-base text-foreground">
        {selectedTemplate === 'suket_lampiran_2'
          ? 'Surat Keterangan Mengikuti UKK (Lampiran 2)'
          : 'Sertifikat Uji Kompetensi Keahlian (UKK)'}
      </span>
    </div>
  );

  const subtitleNode = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
        {currentStudent.nama_siswa}
      </span>
      {kelasNama && (
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          • {kelasNama}
        </span>
      )}
      <span className="text-[11px] font-semibold text-primary/80 hidden sm:inline">
        • {activeEdition.label} (TA {activeTahunAjaran})
      </span>
    </div>
  );

  // Common inner content for both Modal and Tab representations
  const renderSheetsContent = () => {
    // -------------------------------------------------------------------------
    // RENDER TEMPLATE: LAMPIRAN 2 JUKNIS 2026 (SURAT KETERANGAN TELAH MENGIKUTI UKK)
    // -------------------------------------------------------------------------
    if (selectedTemplate === 'suket_lampiran_2') {
      return (
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={1}
          footerText={`Surat Keterangan Telah Mengikuti UKK — ${certData.sekolah?.nama}`}
        >
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Kop Surat Resmi Sekolah */}
              <PrintHeader
                variant="portrait"
                tenantInfo={tenantInfo}
                showLogoDaerah={showLogoDaerah}
                showLogoSekolah={showLogoSekolah}
              />

              {/* Judul Surat Keterangan */}
              <div className="text-center my-4 space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
                  SURAT KETERANGAN
                </h3>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  TELAH MENGIKUTI UJI KOMPETENSI KEAHLIAN
                </h4>
                <p className="text-[11px] font-mono text-slate-600">
                  Nomor : {certData.nomor_sertifikat}/SK-UKK/{new Date().getFullYear()}
                </p>
              </div>

              {/* Narasi Pembuka */}
              <p className="text-justify my-3 text-[11.5px] leading-relaxed">
                Kepala <strong>{certData.sekolah?.nama}</strong> menerangkan bahwa :
              </p>

              <table className="w-full my-2 text-[11.5px] border-collapse">
                <tbody>
                  <tr>
                    <td className="w-36 py-1 font-semibold">Nama</td>
                    <td className="py-1">: <strong>{certData.siswa.nama_siswa}</strong></td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">NISN</td>
                    <td className="py-1 font-mono">: {certData.siswa.nisn || certData.siswa.nis}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Program Keahlian</td>
                    <td className="py-1">: {certData.siswa.program_keahlian}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-justify my-3 text-[11.5px] leading-relaxed">
                Telah mengikuti uji kompetensi keahlian pada paket <strong>{certData.ukk.judul_penugasan}</strong> dengan keterangan pada unit di bawah ini :
              </p>

              {/* Tabel 3 Kolom Lampiran 2: Kode Unit | Judul Unit | Keterangan */}
              <div className="border border-slate-400 overflow-hidden rounded-xs my-3 font-sans">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-slate-900">
                      <th className="w-36 py-2 px-2.5 text-center border-r border-slate-400 font-bold">
                        Kode Unit <br /><span className="text-[9.5px] font-normal italic">Unit Code</span>
                      </th>
                      <th className="py-2 px-3 text-left border-r border-slate-400 font-bold">
                        Judul Unit <br /><span className="text-[9.5px] font-normal italic">Unit Title</span>
                      </th>
                      <th className="w-32 py-2 px-2.5 text-center font-bold">
                        Keterangan <br /><span className="text-[9.5px] font-normal italic">Information</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {certData.ukk.unit_kompetensi?.map((unit, uIdx) => {
                      const isUnitKompeten = Number(certData.ukk.nilai_akhir || 80) >= 75 || uIdx < 8;
                      return (
                        <tr key={uIdx} className={uIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-1.5 px-2.5 text-center border-t border-r border-slate-300 font-mono text-[10.5px]">
                            {unit.kode_unit}
                          </td>
                          <td className="py-1.5 px-3 text-left border-t border-r border-slate-300 font-medium">
                            {unit.judul_unit}
                          </td>
                          <td className="py-1.5 px-2.5 text-center border-t border-slate-300 font-semibold text-[10.5px]">
                            {isUnitKompeten ? (
                              <span className="text-emerald-700">Kompeten</span>
                            ) : (
                              <span className="text-rose-600">Belum Kompeten</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="my-4 text-[11.5px] leading-relaxed">
                Demikian surat keterangan ini kami sampaikan untuk di pergunakan sebagaimana mestinya.
              </p>
            </div>

            {/* Tanda Tangan Tunggal Kepala Sekolah Lampiran 2 */}
            <div className="pt-4 border-t border-slate-200 mt-6 text-right">
              <div className="inline-block text-center font-serif text-[11px] min-w-[220px]">
                <p>{certData.tanggal_terbit}</p>
                <p className="font-normal mt-0.5">Kepala SMK,</p>
                <div className="h-16 flex items-center justify-center my-1">
                  {certData.ukk.ttd_kepala_sekolah ? (
                    <img
                      src={certData.ukk.ttd_kepala_sekolah}
                      alt="TTD Kepala Sekolah"
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-14" />
                  )}
                </div>
                <p className="font-bold underline text-slate-900">
                  {certData.sekolah?.kepala_sekolah || 'Kepala Sekolah'}
                </p>
                <p className="text-[10px] text-slate-600 font-sans">
                  NIP. {certData.sekolah?.nip_kepala || '-'}
                </p>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      );
    }

    // -------------------------------------------------------------------------
    // RENDER TEMPLATE: SERTIFIKAT KOMPETENSI 2 LEMBAR (LAMPIRAN 1 JUKNIS 2026)
    // -------------------------------------------------------------------------
    return (
      <>
        {isLoadingUkk && (
          <div className="flex items-center justify-center p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>Memuat data penilaian dan pengaturan UKK...</span>
          </div>
        )}

        {/* Regulatory Advisory for Under-Threshold Students */}
        {Number(certData.ukk.nilai_akhir || 0) < activeEdition.thresholdMandiri.kompeten.min && (
          <div className="print:hidden mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-bold">
                  Siswa Belum Mencapai Batas Kelulusan Minimal ({activeEdition.thresholdMandiri.kompeten.min})
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Siswa ini memperoleh nilai <strong>{certData.ukk.nilai_akhir}</strong> ({certData.ukk.predikat}). Sesuai regulasi {activeEdition.label}, siswa berhak diterbitkan <strong>Surat Keterangan Mengikuti UKK (Lampiran 2)</strong>, bukan Sertifikat Kompetensi.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTemplate('suket_lampiran_2')}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Beralih ke Lampiran 2
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LEMBAR 1: MUKA DEPAN SERTIFIKAT RESMI UKK (LAMPIRAN 1 HAL 21)             */}
        {/* ========================================================================= */}
        <PrintDocumentSheet
          orientation={orientation}
          pageNumber={1}
          totalPages={2}
          footerText={`Sertifikat Kompetensi — ${certData.sekolah?.nama}`}
          className="relative overflow-hidden bg-white"
        >
          {/* Sisi Kiri: Poligon Geometris Resmi (Hanya pada template regulasi resmi) */}
          {(selectedTemplate === 'kemdikbud_2026' || selectedTemplate === 'kemdikbud_2024' || !['classic', 'modern'].includes(selectedTemplate)) && (
            <svg
              viewBox="0 0 210 297"
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              preserveAspectRatio="none"
            >
              <polygon points="0,0 14,0 38,76 0,106" fill="#38bdf8" />
              <polygon points="38,76 24,106 0,106" fill="#0ea5e9" />
              <polygon points="0,106 22,74 36,126 0,194" fill="#fb923c" opacity="0.9" />
              <polygon points="36,126 24,174 0,106" fill="#ea580c" opacity="0.95" />
              <polygon points="0,194 42,162 26,254 0,297" fill="#f43f5e" />
            </svg>
          )}

          {/* Certificate Frame with Dynamic Template Styling */}
          <div
            className={cn(
              'h-full flex flex-col justify-between relative z-10 transition-all duration-200',
              (selectedTemplate === 'kemdikbud_2026' || selectedTemplate === 'kemdikbud_2024' || !['classic', 'modern'].includes(selectedTemplate))
                ? 'pl-[18%] sm:pl-[22%] pr-[5%] sm:pr-[7%] py-6 sm:py-8'
                : 'p-6 sm:p-9',
              selectedTemplate === 'classic' && 'border-[6px] border-double border-amber-600/90 bg-[#fffdf9]',
              selectedTemplate === 'modern' && 'border-2 border-indigo-600/80 bg-white shadow-xs rounded-xl'
            )}
          >
            <div>
              {/* Top Logo: TUT WURI HANDAYANI TUNGGAL DI TENGAH ATAS */}
              <div className="flex items-center justify-center mb-3">
                <img
                  src="/assets/tutwuri.svg"
                  alt="Tut Wuri Handayani"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                />
              </div>

              {/* Main Official Title Bilingual Sesuai Juknis */}
              <div className="text-center space-y-0.5 mb-3">
                <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                  {activeEdition.titleId || 'SERTIFIKAT KOMPETENSI'}
                </h1>
                <p className="text-base sm:text-lg font-bold italic tracking-wide text-[#0066FF]">
                  {activeEdition.titleEn || 'COMPETENCY CERTIFICATE'}
                </p>
                <p className="text-[10.5px] font-mono text-slate-700 tracking-wide mt-1">
                  Nomor : {certData.nomor_sertifikat}
                </p>
              </div>

              {/* Certification Statement Bilingual */}
              <div className="text-center my-3 space-y-0.5">
                <p className="text-[11px] text-slate-800">{activeEdition.statementId}</p>
                <p className="text-[9.5px] text-slate-500 italic">{activeEdition.statementEn}</p>
              </div>

              {/* Student Name & NISN */}
              <div className="text-center my-3">
                <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900">
                  {certData.siswa.nama_siswa}
                </h2>
                <p className="text-[10.5px] font-sans text-slate-700 mt-0.5">
                  NISN: {certData.siswa.nisn || certData.siswa.nis || '-'}
                </p>
              </div>

              {/* Qualification Assessment Text Bilingual */}
              <div className="text-center my-2 space-y-1.5">
                <div className="text-[10.5px] text-slate-800">
                  <p>{activeEdition.hasTakenId}</p>
                  <p className="text-[9.5px] text-slate-500 italic">{activeEdition.hasTakenEn}</p>
                </div>

                <div className="text-[10.5px] text-slate-800">
                  <p>{activeEdition.competencyPrefixId}</p>
                  <p className="text-[9.5px] text-slate-500 italic">{activeEdition.competencyPrefixEn}</p>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                    {certData.siswa.konsentrasi_keahlian || certData.siswa.program_keahlian}
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-800">
                  <p>pada Judul Penugasan</p>
                  <p className="text-[9.5px] text-slate-500 italic">on Assignment</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 max-w-[460px] mx-auto">
                    {certData.ukk.judul_penugasan}
                  </p>
                  {certData.ukk.judul_penugasan_en && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5 max-w-[460px] mx-auto">
                      {certData.ukk.judul_penugasan_en}
                    </p>
                  )}
                </div>

                {/* Predikat / Achievement Level */}
                <div className="pt-1">
                  <p className="text-[10.5px] text-slate-800">dengan predikat</p>
                  <p className="text-[9.5px] text-slate-500 italic">with achievement level</p>
                  <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                    {certData.ukk.predikat}
                  </div>
                  {certData.ukk.predikat_en && (
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {certData.ukk.predikat_en}
                    </div>
                  )}
                </div>

                {/* Masa Berlaku Wajib 3 Tahun Sesuai Juknis */}
                <div className="pt-1 text-center text-[9.5px] text-slate-700 font-sans">
                  <p>{activeEdition.klausulMasaBerlakuId}</p>
                  <p className="italic text-slate-500">{activeEdition.klausulMasaBerlakuEn}</p>
                </div>
              </div>
            </div>

            {/* Bottom Official Signatures */}
            <div className="pt-3 mt-1">
              <div className="text-center text-[10.5px] text-slate-700 mb-2 font-sans">
                {certData.tanggal_terbit}
              </div>

              <div className="grid grid-cols-2 gap-6 text-center text-[10.5px]">
                {/* Kolom Kiri: Kepala Sekolah */}
                <div>
                  <p className="font-semibold text-slate-900">
                    {activeEdition.labelTtdKepalaSekolah} {certData.sekolah?.nama || 'SMK'}
                  </p>
                  <p className="text-[9.5px] text-slate-500 italic">
                    {activeEdition.labelTtdKepalaSekolahEn} {certData.sekolah?.nama || 'SMK'}
                  </p>
                  <div className="h-12 flex items-center justify-center my-1">
                    {certData.ukk.ttd_kepala_sekolah ? (
                      <img
                        src={certData.ukk.ttd_kepala_sekolah}
                        alt="TTD Kepala Sekolah"
                        className="max-h-11 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-11" />
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    {certData.sekolah?.kepala_sekolah || 'Kepala Sekolah'}
                  </p>
                  <p className="text-[10px] font-medium text-slate-700">Kepala Sekolah</p>
                  <p className="text-[9px] text-slate-500 italic">School Principal</p>
                </div>

                {/* Kolom Kanan: Penguji Eksternal (DU/DI) */}
                <div>
                  <p className="font-bold text-slate-900 uppercase">
                    {certData.ukk.mitra_nama || 'MITRA INDUSTRI'}
                  </p>
                  <div className="h-12 flex items-center justify-center my-1">
                    {certData.ukk.ttd_asesor_eksternal ? (
                      <img
                        src={certData.ukk.ttd_asesor_eksternal}
                        alt="TTD Penguji Eksternal"
                        className="max-h-11 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-11" />
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    {certData.ukk.asesor_eksternal || 'Penguji Eksternal'}
                  </p>
                  <p className="text-[10px] font-medium text-slate-700">Penguji Eksternal</p>
                  <p className="text-[9px] text-slate-500 italic">External Assessor</p>
                </div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* Visual Sheet Divider */}
        <div className="print:hidden flex items-center gap-3 my-2 text-xs text-slate-500 font-sans">
          <div className="h-px bg-slate-300 dark:bg-slate-700 w-24" />
          <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-xs border border-slate-300 dark:border-slate-700">
            Halaman 2: Transkrip Unit Kompetensi
          </span>
          <div className="h-px bg-slate-300 dark:bg-slate-700 w-24" />
        </div>

        {/* ========================================================================= */}
        {/* LEMBAR 2: LEMBAR BELAKANG (DAFTAR UNIT KOMPETENSI SESUAI HALAMAN 22)      */}
        {/* ========================================================================= */}
        <PrintDocumentSheet
          orientation={orientation}
          pageNumber={2}
          totalPages={2}
          footerText={`Transkrip Nilai UKK — ${certData.siswa.nama_siswa} (${certData.siswa.nisn || certData.siswa.nis})`}
        >
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Header Lembar Belakang Sesuai Hal 22 */}
              <div className="text-center pb-3 mb-4 border-b border-slate-300">
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                  DAFTAR UNIT KOMPETENSI
                </h3>
                <p className="text-[11px] font-serif italic text-slate-600">
                  List of Competency Unit
                </p>
              </div>

              {/* Table of Competencies 2 Kolom Sesuai Format Resmi Hal 22 */}
              <div className="border border-slate-400 overflow-hidden rounded-xs my-3 font-sans">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-slate-900">
                      <th className="w-44 py-2 px-3 text-center border-r border-slate-400 font-bold">
                        Kode Unit <br /><span className="text-[9.5px] font-normal italic">Unit Code</span>
                      </th>
                      <th className="py-2 px-3 text-left font-bold">
                        Judul Unit <br /><span className="text-[9.5px] font-normal italic">Unit Title</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {certData.ukk.unit_kompetensi?.map((unit, uIdx) => (
                      <tr
                        key={uIdx}
                        className={uIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                      >
                        <td className="py-2 px-3 text-center border-t border-r border-slate-300 font-mono text-[10.5px]">
                          {unit.kode_unit}
                        </td>
                        <td className="py-2 px-3 text-left border-t border-slate-300 font-medium">
                          {unit.judul_unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Score Table */}
              <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-sm font-sans">
                <div className="text-[11px] font-bold text-slate-800 mb-1.5">
                  Ringkasan Penilaian Uji Kompetensi Keahlian:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[11px]">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Nilai Praktik</div>
                    <div className="text-base font-bold text-slate-800">{certData.ukk.nilai_praktik ?? '-'}</div>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Nilai Teori</div>
                    <div className="text-base font-bold text-slate-800">{certData.ukk.nilai_teori ?? '-'}</div>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Nilai Akhir</div>
                    <div className="text-base font-bold text-primary">
                      {certData.ukk.nilai_akhir}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Predikat</div>
                    <div className="text-base font-extrabold text-emerald-700 uppercase">
                      {certData.ukk.predikat}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assessor Signatures on Page 2 (Simetris 2 Kolom Resmi) */}
            <div className="pt-5 border-t border-slate-300 mt-4">
              <div className="grid grid-cols-2 gap-8 text-center text-[10.5px]">
                {/* Kolom Kiri: Penguji Internal */}
                <div>
                  <p className="font-semibold text-slate-800">Penguji Internal</p>
                  <p className="text-[9.5px] text-slate-500 italic">Internal Assessor</p>
                  <div className="h-12 flex items-center justify-center my-1">
                    {certData.ukk.ttd_asesor_internal ? (
                      <img
                        src={certData.ukk.ttd_asesor_internal}
                        alt="TTD Penguji Internal"
                        className="max-h-11 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-11" />
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    {certData.ukk.asesor_internal || 'Penguji Internal'}
                  </p>
                  <p className="text-[10px] text-slate-600 font-sans">
                    ({certData.sekolah?.nama || 'SMK'})
                  </p>
                </div>

                {/* Kolom Kanan: Penguji Eksternal */}
                <div>
                  <p className="font-semibold text-slate-800">Penguji Eksternal</p>
                  <p className="text-[9.5px] text-slate-500 italic">External Assessor</p>
                  <div className="h-12 flex items-center justify-center my-1">
                    {certData.ukk.ttd_asesor_eksternal ? (
                      <img
                        src={certData.ukk.ttd_asesor_eksternal}
                        alt="TTD Penguji Eksternal"
                        className="max-h-11 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-11" />
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    {certData.ukk.asesor_eksternal || 'Penguji Eksternal'}
                  </p>
                  <p className="text-[10px] text-slate-600 font-sans">
                    ({certData.ukk.mitra_nama || 'Mitra Industri'})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </>
    );
  };

  // If invoked as a modal dialog
  if (isModal) {
    return (
      <UniversalDocumentModal
        isOpen={isOpen}
        onClose={onClose}
        title={titleNode}
        subtitle={subtitleNode}
        orientation={orientation}
        allowOrientationToggle={true}
        onOrientationChange={setOrientation}
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        onToggleLogoDaerah={setShowLogoDaerah}
        onToggleLogoSekolah={setShowLogoSekolah}
        allowLogoToggles={true}
        batchTotal={allStudents.length}
        batchCurrentIndex={currentIndex}
        onPrevBatch={handlePrev}
        onNextBatch={handleNext}
        batchSelector={studentSelectorNode}
        onDownloadBatchPdf={handleBatchDownload}
        isBatchDownloading={isBatchDownloading}
        batchDownloadButtonText={allStudents.length > 1 ? `Unduh Sekelas (${allStudents.length})` : undefined}
        templateOptions={CERTIFICATE_TEMPLATES}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
        templateLabel="Format Dokumen:"
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadSinglePdf}
        downloadPdfText="PDF"
        printButtonText="Cetak"
        size="6xl"
      >
        <div ref={printSheetsRef} className="w-full flex flex-col items-center">
          {renderSheetsContent()}
        </div>
      </UniversalDocumentModal>
    );
  }

  // If invoked as a full-page tab inside a dashboard view
  return (
    <div className={className}>
      <UniversalDocumentTab
        title={titleNode}
        subtitle={subtitleNode}
        orientation={orientation}
        allowOrientationToggle={true}
        onOrientationChange={setOrientation}
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        onToggleLogoDaerah={setShowLogoDaerah}
        onToggleLogoSekolah={setShowLogoSekolah}
        allowLogoToggles={true}
        batchTotal={allStudents.length}
        batchCurrentIndex={currentIndex}
        onPrevBatch={handlePrev}
        onNextBatch={handleNext}
        batchSelector={studentSelectorNode}
        onDownloadBatchPdf={handleBatchDownload}
        isBatchDownloading={isBatchDownloading}
        batchDownloadButtonText={allStudents.length > 1 ? `Unduh Sekelas (${allStudents.length})` : undefined}
        templateOptions={CERTIFICATE_TEMPLATES}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
        templateLabel="Format Dokumen:"
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadSinglePdf}
        downloadPdfText="PDF"
        printButtonText="Cetak"
      >
        <div ref={printSheetsRef} className="w-full flex flex-col items-center">
          {renderSheetsContent()}
        </div>
      </UniversalDocumentTab>
    </div>
  );
};
