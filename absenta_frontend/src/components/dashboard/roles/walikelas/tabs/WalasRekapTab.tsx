import React, { useState, useMemo, useRef, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Calendar, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  Users,
  ShieldAlert
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge, Loader } from '@/components/ui';
import { 
  PrintDocumentSheet, 
  PrintHeader, 
  usePrintHeaderData 
} from '@/components/ui/PrintHeader';
import { getRekapKelasBulanan } from '@/api/attendance/rekap.api';
import { getJurnalWaliKelasList } from '@/api/kurikulum/waliKelas.api';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { WalasDashboardData } from '../types';

// Code-splitting document modal to optimize initial tab bundle (Pilar 21B & TBT Optimization)
const UniversalDocumentModal = lazy(() =>
  import('@/components/ui/PrintHeader').then((m) => ({ default: m.UniversalDocumentModal }))
);

export interface WalasRekapTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

type DocumentType = 'PRESENSI_BULANAN' | 'JURNAL_PEMBINAAN' | 'LEDGER_ROMBEL';

export const WalasRekapTab: React.FC<WalasRekapTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [activeDocType, setActiveDocType] = useState<DocumentType>('PRESENSI_BULANAN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const printSheetRef = useRef<HTMLDivElement>(null);

  const { tenantInfo, logoSekolahBase64, logoDaerahBase64 } = usePrintHeaderData();

  // Query Data Presensi Bulanan (High-Performance Cache)
  const { data: rekapPresensiRes, isLoading: isLoadingPresensi } = useQuery({
    queryKey: ['walas-rekap-presensi', kelasId, selectedYear, selectedMonth],
    queryFn: () => getRekapKelasBulanan(kelasId || '', selectedYear, selectedMonth),
    enabled: Boolean(kelasId) && activeDocType === 'PRESENSI_BULANAN',
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Query Jurnal Walas (High-Performance Cache)
  const { data: jurnalRes, isLoading: isLoadingJurnal } = useQuery({
    queryKey: ['walas-rekap-jurnal', kelasId],
    queryFn: () => getJurnalWaliKelasList(1, 100, '', kelasId),
    enabled: Boolean(kelasId) && activeDocType === 'JURNAL_PEMBINAAN',
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Parse Presensi List
  const presensiItems = useMemo(() => {
    const raw = (rekapPresensiRes as any)?.data || rekapPresensiRes || [];
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [rekapPresensiRes]);

  // Parse Jurnal List
  const jurnalItems = useMemo(() => {
    const raw = (jurnalRes as any)?.data || (jurnalRes as any)?.jurnal || [];
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [jurnalRes]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading('Mempersiapkan dokumen PDF...', { id: 'walas-pdf' });
      // Primary print invocation
      window.print();
      toast.success('Gunakan opsi "Save as PDF" pada dialog cetak browser.', { id: 'walas-pdf', duration: 4000 });
    } catch {
      toast.error('Gagal mencetak dokumen.', { id: 'walas-pdf' });
    }
  };

  const walasName = data?.wali_kelas?.nama || 'Wali Kelas';
  const walasNip = data?.wali_kelas?.nip || '-';
  const tahunPelajaranStr = data?.tahun_pelajaran?.nama || `${selectedYear}/${selectedYear + 1}`;
  const semesterStr = data?.tahun_pelajaran?.semester || '1';

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header & Description */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Pusat Dokumen & Rekapitulasi Rombel
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
          Laporan resmi pembinaan dan presensi kelas berstandar institusi (True WYSIWYG & Siap Cetak).
        </p>
      </div>

      {/* Document Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all border-2 ${
            activeDocType === 'PRESENSI_BULANAN' 
              ? 'border-primary-500 bg-primary-500/5' 
              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          onClick={() => setActiveDocType('PRESENSI_BULANAN')}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Rekap Presensi Bulanan (F-BK-01)
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            Format resmi matriks kehadiran per siswa (H/S/I/A/D/L) dan persentase kehadiran bulanan.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">A4 Landscape</Badge>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1">
              Pilih Dokumen
            </span>
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all border-2 ${
            activeDocType === 'JURNAL_PEMBINAAN' 
              ? 'border-primary-500 bg-primary-500/5' 
              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          onClick={() => setActiveDocType('JURNAL_PEMBINAAN')}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Buku Jurnal Wali Kelas
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            Arsip agenda pembinaan siswa, bimbingan berkala, dan beban kerja tatap muka (2 JP).
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">A4 Portrait</Badge>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1">
              Pilih Dokumen
            </span>
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all border-2 ${
            activeDocType === 'LEDGER_ROMBEL' 
              ? 'border-primary-500 bg-primary-500/5' 
              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          onClick={() => setActiveDocType('LEDGER_ROMBEL')}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Ledger & Profil Singkat Rombel
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            Daftar lengkap biodata peserta didik, data kontak wali murid, dan rangkuman poin siswa.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">A4 Portrait</Badge>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1">
              Pilih Dokumen
            </span>
          </div>
        </Card>
      </div>

      {/* Filter & Action Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeDocType === 'PRESENSI_BULANAN' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-700 dark:text-slate-300">Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                >
                  {monthNames.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-700 dark:text-slate-300">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
            Rombel: <span className="font-bold text-slate-900 dark:text-white">{kelasNama || '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="default"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau & Cetak Dokumen</span>
          </Button>
        </div>
      </Card>

      {/* Live Preview / Tabular Overview */}
      <Card className="p-4 overflow-hidden">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Ringkasan Pratinjau: {activeDocType === 'PRESENSI_BULANAN' ? `Presensi Bulan ${monthNames[selectedMonth - 1]} ${selectedYear}` : activeDocType === 'JURNAL_PEMBINAAN' ? 'Arsip Jurnal Pembinaan' : 'Daftar Siswa Rombel'}</span>
          <span className="text-[11px] font-normal text-slate-700 dark:text-slate-300">
            {activeDocType === 'PRESENSI_BULANAN' ? `${presensiItems.length} Siswa Terdata` : activeDocType === 'JURNAL_PEMBINAAN' ? `${jurnalItems.length} Catatan Jurnal` : '-'}
          </span>
        </h4>

        {activeDocType === 'PRESENSI_BULANAN' && (
          isLoadingPresensi ? (
            <div className="py-8 text-center text-xs text-slate-700 dark:text-slate-300">Memuat data presensi...</div>
          ) : presensiItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-700 dark:text-slate-300">Belum ada rekap presensi untuk periode ini.</div>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3">No</th>
                    <th className="py-2 px-3">Nama Siswa</th>
                    <th className="py-2 px-3 text-center">Hadir</th>
                    <th className="py-2 px-3 text-center">Sakit</th>
                    <th className="py-2 px-3 text-center">Izin</th>
                    <th className="py-2 px-3 text-center">Alfa</th>
                    <th className="py-2 px-3 text-center">Dispen</th>
                    <th className="py-2 px-3 text-right">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {presensiItems.slice(0, 15).map((row: any, i: number) => (
                    <tr key={row.siswa_id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{i + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{row.nama_lengkap || row.nama}</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">{row.h || 0}</td>
                      <td className="py-2 px-3 text-center text-blue-600">{row.s || 0}</td>
                      <td className="py-2 px-3 text-center text-amber-600">{row.i || 0}</td>
                      <td className="py-2 px-3 text-center text-red-600 font-bold">{row.a || 0}</td>
                      <td className="py-2 px-3 text-center text-purple-600">{row.d || 0}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {row.persentase || '100%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {presensiItems.length > 15 && (
                <p className="text-[11px] text-center text-slate-700 dark:text-slate-300 mt-2">
                  Menampilkan 15 dari {presensiItems.length} siswa. Buka Pratinjau Dokumen untuk lembar cetak lengkap.
                </p>
              )}
            </div>
          )
        )}

        {activeDocType === 'JURNAL_PEMBINAAN' && (
          isLoadingJurnal ? (
            <div className="py-8 text-center text-xs text-slate-700 dark:text-slate-300">Memuat data jurnal...</div>
          ) : jurnalItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-700 dark:text-slate-300">Belum ada jurnal pembinaan yang dibuat.</div>
          ) : (
            <div className="space-y-2">
              {jurnalItems.slice(0, 5).map((j: any) => (
                <div key={j.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{j.judul}</p>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-1">{j.isi}</p>
                  </div>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                    {new Date(j.tanggal).toLocaleDateString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {activeDocType === 'LEDGER_ROMBEL' && (
          <div className="py-8 text-center text-xs text-slate-700 dark:text-slate-300">
            Daftar siswa rombel siap dikompilasi untuk cetak lembar profil dan tanda tangan wali murid.
          </div>
        )}
      </Card>

      {/* Universal Document Print Modal - Lazy Mounted & Code-split */}
      {isModalOpen && (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
          <UniversalDocumentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Dokumen Resmi: ${activeDocType === 'PRESENSI_BULANAN' ? 'Rekapitulasi Kehadiran Bulanan' : activeDocType === 'JURNAL_PEMBINAAN' ? 'Buku Jurnal Pembinaan Wali Kelas' : 'Ledger Rombel'}`}
          subtitle={`Rombel ${kelasNama || ''} - TP. ${tahunPelajaranStr} Semester ${semesterStr}`}
          orientation={activeDocType === 'PRESENSI_BULANAN' ? 'landscape' : 'portrait'}
          onPrint={handlePrint}
          onDownloadPdf={handleDownloadPdf}
          printButtonText="Cetak Dokumen"
          downloadPdfText="Simpan PDF"
          size="5xl"
        >
          <div ref={printSheetRef}>
            <PrintDocumentSheet
              orientation={activeDocType === 'PRESENSI_BULANAN' ? 'landscape' : 'portrait'}
              pageNumber={1}
              totalPages={1}
              footerText={`Dokumen Sah Wali Kelas • Dicetak otomatis oleh Absenta pada ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeID })}`}
            >
              {/* Kop Surat Resmi */}
              <PrintHeader 
                showDoubleLine={true}
                showLogoSekolah={true}
                showLogoDaerah={true}
                logoSekolahUrl={logoSekolahBase64}
                logoDaerahUrl={logoDaerahBase64}
              />

              {/* Judul Dokumen */}
              <div className="text-center my-4 font-serif">
                <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                  {activeDocType === 'PRESENSI_BULANAN' 
                    ? 'REKAPITULASI KEHADIRAN SISWA BULANAN' 
                    : activeDocType === 'JURNAL_PEMBINAAN' 
                    ? 'BUKU JURNAL PEMBINAAN WALI KELAS' 
                    : 'LEDGER PROFIL PESERTA DIDIK'}
                </h2>
                <p className="text-xs text-gray-700 mt-0.5">
                  Kelas: <span className="font-bold text-black">{kelasNama || '-'}</span> | 
                  Tahun Pelajaran: <span className="font-bold text-black">{tahunPelajaranStr}</span> (Semester {semesterStr})
                  {activeDocType === 'PRESENSI_BULANAN' && ` | Periode: ${monthNames[selectedMonth - 1]} ${selectedYear}`}
                </p>
              </div>

              {/* Table Data Content */}
              {activeDocType === 'PRESENSI_BULANAN' && (
                <div className="mt-4">
                  <table className="w-full border-collapse border border-black text-[10px] font-sans">
                    <thead>
                      <tr className="bg-gray-100 text-black">
                        <th className="border border-black p-1 text-center w-8">No</th>
                        <th className="border border-black p-1 text-left">Nama Peserta Didik</th>
                        <th className="border border-black p-1 text-center w-16">NIS / NISN</th>
                        <th className="border border-black p-1 text-center w-10">L/P</th>
                        <th className="border border-black p-1 text-center w-8">H</th>
                        <th className="border border-black p-1 text-center w-8">S</th>
                        <th className="border border-black p-1 text-center w-8">I</th>
                        <th className="border border-black p-1 text-center w-8">A</th>
                        <th className="border border-black p-1 text-center w-8">D</th>
                        <th className="border border-black p-1 text-center w-12">% Hadir</th>
                        <th className="border border-black p-1 text-left">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presensiItems.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="border border-black p-3 text-center text-gray-500">
                            Tidak ada rekaman data presensi untuk periode ini.
                          </td>
                        </tr>
                      ) : (
                        presensiItems.map((item: any, idx: number) => (
                          <tr key={item.siswa_id || idx} className="text-black">
                            <td className="border border-black p-1 text-center">{idx + 1}</td>
                            <td className="border border-black p-1 font-medium">{item.nama_lengkap || item.nama}</td>
                            <td className="border border-black p-1 text-center">{item.nis || item.nisn || '-'}</td>
                            <td className="border border-black p-1 text-center">{item.jenis_kelamin || 'L'}</td>
                            <td className="border border-black p-1 text-center">{item.h || 0}</td>
                            <td className="border border-black p-1 text-center">{item.s || 0}</td>
                            <td className="border border-black p-1 text-center">{item.i || 0}</td>
                            <td className="border border-black p-1 text-center font-bold text-red-600">{item.a || 0}</td>
                            <td className="border border-black p-1 text-center">{item.d || 0}</td>
                            <td className="border border-black p-1 text-center font-bold">{item.persentase || '100%'}</td>
                            <td className="border border-black p-1 text-gray-600">{item.catatan || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDocType === 'JURNAL_PEMBINAAN' && (
                <div className="mt-4">
                  <table className="w-full border-collapse border border-black text-[11px] font-sans">
                    <thead>
                      <tr className="bg-gray-100 text-black">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5 text-center w-24">Tanggal</th>
                        <th className="border border-black p-1.5 text-center w-28">Kategori</th>
                        <th className="border border-black p-1.5 text-left">Uraian Pembinaan / Tindak Lanjut</th>
                        <th className="border border-black p-1.5 text-center w-28">Paraf Walas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jurnalItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-black p-3 text-center text-gray-500">
                            Belum ada riwayat catatan jurnal pembinaan.
                          </td>
                        </tr>
                      ) : (
                        jurnalItems.map((j: any, idx: number) => (
                          <tr key={j.id || idx} className="text-black">
                            <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-black p-1.5 text-center">{new Date(j.tanggal).toLocaleDateString('id-ID')}</td>
                            <td className="border border-black p-1.5 text-center font-medium">{j.kategori}</td>
                            <td className="border border-black p-1.5">
                              <p className="font-bold">{j.judul}</p>
                              <p className="text-gray-700 mt-0.5">{j.isi}</p>
                            </td>
                            <td className="border border-black p-1.5 text-center"></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2-Tier Bureaucracy Signatures */}
              <div className="mt-10 font-serif text-[11px] text-black">
                <div className="flex justify-between items-start">
                  {/* Left: Wakasek Kesiswaan / Verifikator */}
                  <div className="text-center w-64">
                    <p className="text-transparent select-none">Titimangsa</p>
                    <p className="font-bold">Mengetahui,</p>
                    <p>Wakil Kepala Sekolah Bid. Kesiswaan</p>
                    <div className="h-16" />
                    <p className="font-bold underline">___________________________</p>
                    <p className="text-[10px]">NIP. -</p>
                  </div>

                  {/* Right: Wali Kelas Pembuat Dokumen */}
                  <div className="text-center w-64">
                    <p>
                      {tenantInfo?.address?.includes(',') ? tenantInfo.address.split(',')[1].trim() : 'Ditetapkan'},{' '}
                      {format(new Date(), 'dd MMMM yyyy', { locale: localeID })}
                    </p>
                    <p className="font-bold">Wali Kelas {kelasNama || ''},</p>
                    <div className="h-16" />
                    <p className="font-bold underline">{walasName}</p>
                    <p className="text-[10px]">NIP. {walasNip}</p>
                  </div>
                </div>

                {/* Bottom Center: Kepala Sekolah */}
                <div className="mt-6 text-center mx-auto w-72">
                  <p className="font-bold">Menyetujui / Mengesahkan,</p>
                  <p>Kepala {tenantInfo?.name || 'Sekolah Menengah Kejuruan'}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">___________________________</p>
                  <p className="text-[10px]">NIP. -</p>
                </div>
              </div>
            </PrintDocumentSheet>
          </div>
          </UniversalDocumentModal>
        </Suspense>
      )}
    </div>
  );
});

WalasRekapTab.displayName = 'WalasRekapTab';
