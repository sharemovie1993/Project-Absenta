import React, { useState, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { RapatSosialisasiSession, RapatAttendeeItem } from '@/api/academic/sosialisasi.api';
import toast from 'react-hot-toast';

export interface RapatSosialisasiBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RapatSosialisasiSession | null;
  attendees: RapatAttendeeItem[];
  stats: {
    totalGuru: number;
    hadirCount: number;
    belumHadirCount: number;
    persentaseHadir: number;
  };
}

export const RapatSosialisasiBeritaAcaraPrintModal: React.FC<RapatSosialisasiBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  session,
  attendees,
  stats,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);

  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  // Resolusi nama kota/kabupaten
  const defaultKota = React.useMemo(() => {
    return (
      rawSekolah?.kota ||
      rawSekolah?.kabupaten ||
      tenantInfo?.kabupaten ||
      tenantInfo?.kota ||
      'Purwakarta'
    );
  }, [rawSekolah, tenantInfo]);

  // Format tanggal ramah bahasa Indonesia
  const formattedDate = React.useMemo(() => {
    if (!session?.tanggal) return 'Hari ini';
    try {
      const d = new Date(session.tanggal);
      if (isNaN(d.getTime())) return session.tanggal;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return session.tanggal;
    }
  }, [session?.tanggal]);

  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) return;
    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan Berita Acara & Daftar Hadir PDF...', { id: 'bap-pdf' });

      const html2canvasModule = await import('html2canvas-pro');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const sheets = printSheetRef.current.querySelectorAll('.print-sheet');
      if (sheets.length === 0) throw new Error('Lembar dokumen tidak ditemukan');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < sheets.length; i++) {
        if (i > 0) pdf.addPage('a4', 'portrait');

        const sheetEl = sheets[i] as HTMLElement;
        const canvas = await html2canvas(sheetEl, {
          scale: 2.2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      const safeTitle = (session?.nama_acara || 'Berita_Acara_Sosialisasi').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Berita_Acara_${safeTitle}_${session?.tanggal || '2026'}.pdf`);

      toast.success('Berita Acara Rapat berhasil diunduh!', { id: 'bap-pdf' });
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengunduh PDF: ' + (err.message || 'Error tidak diketahui'), { id: 'bap-pdf' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !session) return null;

  // Split attendees into chunks if there are many attendees (e.g. 35 per page on page 2 onwards)
  const attendeesHadir = attendees.filter((a) => a.is_hadir);
  const attendeesBelumHadir = attendees.filter((a) => !a.is_hadir);

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Berita Acara & Notulen Rapat Sosialisasi"
      subtitle={`${session.nama_acara} • ${formattedDate}`}
      orientation="portrait"
      allowOrientationToggle={false}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={() => setShowLogoDaerah(!showLogoDaerah)}
      onToggleLogoSekolah={() => setShowLogoSekolah(!showLogoSekolah)}
      onDownloadBatchPdf={handleDownloadPdf}
      isBatchDownloading={isExportingPdf}
      batchDownloadButtonText="Unduh Berita Acara & Notulen (PDF)"
      onPrint={handlePrint}
    >
      <div ref={printSheetRef} className="flex flex-col items-center justify-center p-2 sm:p-4 gap-6">
        {/* ═══════════════════════════════════════════════════════════════
            HALAMAN 1: BERITA ACARA & NOTULEN RESMI
           ═══════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={2}
          className="print-sheet bg-white text-slate-900 shadow-xl border border-slate-200 print:border-none print:shadow-none p-8 flex flex-col justify-between"
          footerText="Berita Acara & Notulen Rapat Sosialisasi Platform • Dicetak Resmi Sistem Absenta"
        >
          <div>
            {/* Kop Surat */}
            <PrintHeader
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            {/* Judul Berita Acara */}
            <div className="text-center mt-3 mb-4">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 border-b-2 border-slate-900 inline-block pb-0.5">
                BERITA ACARA RAPAT SOSIALISASI & BIMTEK PENGGUNAAN PLATFORM
              </h2>
              <p className="text-[11px] font-semibold text-slate-700 mt-1 uppercase">
                {session.nama_acara}
              </p>
            </div>

            {/* Naskah Pengantar Berita Acara */}
            <p className="text-xs text-slate-800 leading-relaxed text-justify mb-3">
              Pada hari ini, <strong>{formattedDate}</strong>, bertempat di <strong>{session.tempat}</strong>, telah dilaksanakan Rapat Sosialisasi dan Bimbingan Teknis Penggunaan Platform Sistem Informasi Manajemen Sekolah (Absenta) yang dihadiri oleh segenap dewan guru, staf pendidik, dan panitia pelaksana.
            </p>

            {/* Rincian Pelaksanaan */}
            <table className="w-full text-xs mb-3 border-collapse">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-36 py-1 font-bold text-slate-700">Waktu Pelaksanaan</td>
                  <td className="w-4">:</td>
                  <td className="py-1 text-slate-900">{session.waktu_mulai} s.d. {session.waktu_selesai} WIB</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1 font-bold text-slate-700">Tempat Kegiatan</td>
                  <td>:</td>
                  <td className="py-1 text-slate-900">{session.tempat}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1 font-bold text-slate-700">Pimpinan Rapat</td>
                  <td>:</td>
                  <td className="py-1 text-slate-900 font-semibold">{session.pimpinan_rapat}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1 font-bold text-slate-700">Notulis Kegiatan</td>
                  <td>:</td>
                  <td className="py-1 text-slate-900">{session.notulis}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold text-slate-700">Rekapitulasi Kehadiran</td>
                  <td>:</td>
                  <td className="py-1 text-slate-900 font-bold text-emerald-800">
                    {stats.hadirCount} Hadir dari {stats.totalGuru} Guru Terdaftar ({stats.persentaseHadir}%)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Agenda Pembahasan */}
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-1 mb-1.5">
                I. Agenda Pembahasan
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-800 space-y-1 pl-1">
                {session.agenda && session.agenda.length > 0 ? (
                  session.agenda.map((ag, idx) => (
                    <li key={idx} className="leading-snug">{ag}</li>
                  ))
                ) : (
                  <li>Sosialisasi dan pengenalan fitur utama platform</li>
                )}
              </ol>
            </div>

            {/* Hasil Pembahasan & Notulen */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-1 mb-1.5">
                II. Notulen & Kesepakatan Rapat
              </h4>
              <div className="text-xs text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-h-[90px] whitespace-pre-line text-justify">
                {session.notulen_hasil?.trim() ? (
                  session.notulen_hasil
                ) : (
                  `1. Seluruh dewan guru telah diberikan pemahaman mendalam terkait tata cara presensi digital, pengisian jurnal KBM harian, dan pelaksanaan asesmen terpadu.\n` +
                  `2. Dewan guru berkomitmen untuk mengimplementasikan platform secara konsisten pada seluruh aktivitas operasional pembelajaran.\n` +
                  `3. Guru yang berhalangan hadir pada rapat ini akan diberikan pendampingan susulan oleh tim panitia kurikulum.`
                )}
              </div>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed text-justify">
              Demikian Berita Acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
            </p>
          </div>

          {/* Kolom Tanda Tangan 2-Tier */}
          <div className="mt-4 pt-3 border-t border-slate-300">
            <p className="text-right text-xs text-slate-700 mb-2">
              {defaultKota}, {formattedDate}
            </p>
            <div className="grid grid-cols-2 text-center text-xs gap-4 mb-4">
              <div>
                <p className="font-semibold text-slate-700">Pimpinan Rapat,</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 underline">{session.pimpinan_rapat}</p>
                <p className="text-[10px] text-slate-500">Pimpinan Sidang / Acara</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Notulis Rapat,</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 underline">{session.notulis}</p>
                <p className="text-[10px] text-slate-500">Sekretaris / Notulen</p>
              </div>
            </div>

            <div className="text-center text-xs pt-1">
              <p className="font-semibold text-slate-700">Mengetahui,</p>
              <p className="font-semibold text-slate-700">Kepala Sekolah</p>
              <div className="h-14"></div>
              <p className="font-bold text-slate-900 underline">
                {rawSekolah?.nama_kepsek || tenantInfo?.kepsek_nama || '( .................................................... )'}
              </p>
              <p className="text-[10px] text-slate-500">
                NIP. {rawSekolah?.nip_kepsek || tenantInfo?.kepsek_nip || '...........................................'}
              </p>
            </div>
          </div>
        </PrintDocumentSheet>

        {/* ═══════════════════════════════════════════════════════════════
            HALAMAN 2: LAMPIRAN DAFTAR HADIR PESERTA (SCAN QR)
           ═══════════════════════════════════════════════════════════════ */}
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={2}
          totalPages={2}
          className="print-sheet bg-white text-slate-900 shadow-xl border border-slate-200 print:border-none print:shadow-none p-8 flex flex-col justify-between"
          footerText="Lampiran Berita Acara • Daftar Hadir Peserta Sosialisasi Platform"
        >
          <div>
            {/* Header Lampiran */}
            <div className="text-center mb-4 pb-2 border-b-2 border-slate-900">
              <h3 className="text-sm font-black uppercase text-slate-900">
                DAFTAR HADIR PESERTA RAPAT SOSIALISASI PLATFORM
              </h3>
              <p className="text-xs text-slate-700 font-semibold uppercase">
                {session.nama_acara} • {formattedDate}
              </p>
            </div>

            {/* Statistik Ringkas */}
            <div className="flex items-center justify-between text-xs mb-3 bg-slate-50 border border-slate-200 p-2 rounded-lg font-medium">
              <span>Total Peserta Terdaftar: <strong>{stats.totalGuru} Guru</strong></span>
              <span className="text-emerald-700">Total Hadir: <strong>{stats.hadirCount} Guru</strong></span>
              <span className="text-rose-700">Belum Hadir: <strong>{stats.belumHadirCount} Guru</strong></span>
            </div>

            {/* Tabel Daftar Hadir */}
            <table className="w-full text-[11px] border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-400 font-bold text-center">
                  <th className="border border-slate-400 px-1.5 py-1 w-8">No</th>
                  <th className="border border-slate-400 px-2 py-1 text-left">Nama Guru</th>
                  <th className="border border-slate-400 px-2 py-1 text-left w-32">NIP / Identitas</th>
                  <th className="border border-slate-400 px-2 py-1 text-left w-36">Mata Pelajaran / Tugas</th>
                  <th className="border border-slate-400 px-2 py-1 w-24">Waktu Hadir</th>
                  <th className="border border-slate-400 px-2 py-1 w-20">Metode</th>
                  <th className="border border-slate-400 px-2 py-1 w-20">Paraf / Status</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((guru, index) => {
                  const waktuStr = guru.waktu_hadir
                    ? new Date(guru.waktu_hadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                    : '-';
                  const metodeLabel =
                    guru.metode_scan === 'QR_MANDIRI'
                      ? 'Scan QR'
                      : guru.metode_scan === 'SCANNER_PANITIA'
                      ? 'Scan Meja'
                      : guru.metode_scan === 'MANUAL'
                      ? 'Manual'
                      : '-';

                  return (
                    <tr
                      key={guru.guru_id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                    >
                      <td className="border border-slate-400 px-1.5 py-1 text-center font-mono">{index + 1}</td>
                      <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-900">{guru.nama_guru}</td>
                      <td className="border border-slate-400 px-2 py-1 font-mono text-[10px] text-slate-700">{guru.nip}</td>
                      <td className="border border-slate-400 px-2 py-1 text-slate-700 truncate max-w-[150px]">{guru.mapel_jabatan}</td>
                      <td className="border border-slate-400 px-2 py-1 text-center font-mono text-[10px]">
                        {guru.is_hadir ? waktuStr : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-center text-[10px]">
                        {guru.is_hadir ? (
                          <span className="font-semibold text-indigo-700">{metodeLabel}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-center">
                        {guru.is_hadir ? (
                          <span className="font-bold text-emerald-700 text-[10px]">✓ HADIR</span>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Kolom TTD Pengesahan Lampiran */}
          <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-end text-xs">
            <div>
              <p className="text-[10px] text-slate-500">
                Dicetak dari Sistem Absenta pada: {new Date().toLocaleDateString('id-ID')}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Token: {session.qr_token}</p>
            </div>
            <div className="text-center w-56">
              <p className="font-semibold text-slate-700">Notulis / Panitia Registrasi,</p>
              <div className="h-12"></div>
              <p className="font-bold text-slate-900 underline">{session.notulis}</p>
              <p className="text-[10px] text-slate-500">Panitia Rapat Sosialisasi</p>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
