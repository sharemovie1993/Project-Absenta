import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  Badge,
} from '@/components/ui';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Clock,
  Printer,
  Calendar,
  User,
  Smartphone,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Hash,
} from 'lucide-react';
import type { CbtJadwalUjian, CbtPesertaUjian } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { formatLocalTimeFromISO, getTimezone, getTimezoneLabel } from '@/utils/attendance/time';

export interface CbtBuktiPelanggaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  peserta: CbtPesertaUjian | null;
  jadwal: CbtJadwalUjian | null;
}

export const CbtBuktiPelanggaranModal: React.FC<CbtBuktiPelanggaranModalProps> = ({
  isOpen,
  onClose,
  peserta,
  jadwal,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'preview' | 'print'>('preview');
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Data Sekolah & Kop Surat
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  if (!isOpen || !peserta || !jadwal) return null;

  const activeTz = getTimezone();
  const tzLabel = getTimezoneLabel(activeTz);
  const kotaSekolah = sekolahData?.kota || sekolahData?.kabupaten || 'Purwakarta';

  // Identitas Siswa
  const siswaNama = (peserta as any).Siswa?.nama_lengkap || (peserta as any).Siswa?.nama_siswa || 'Siswa Peserta';
  const siswaNis = (peserta as any).Siswa?.nis || '-';
  const siswaNisn = (peserta as any).Siswa?.nisn || '-';
  const siswaKelas = (peserta as any).Siswa?.Kelas?.nama_kelas || '-';

  // Data Waktu
  const waktuMulaiFormat = peserta.waktu_mulai ? formatLocalTimeFromISO(peserta.waktu_mulai) : '-';
  const waktuSelesaiFormat = peserta.waktu_selesai ? formatLocalTimeFromISO(peserta.waktu_selesai) : '-';
  const durasiMenit = peserta.durasi_pengerjaan_detik ? Math.round(peserta.durasi_pengerjaan_detik / 60) : 0;

  // Tanggal Hari Ini untuk Titimangsa
  const now = new Date();
  const tanggalFormat = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: activeTz,
  });
  const tanggalTitimangsa = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: activeTz,
  });

  // Parse Log Pelanggaran
  const rawPelanggaran: any[] = Array.isArray(peserta.log_pelanggaran_json) ? peserta.log_pelanggaran_json : [];
  const normalizedViolations = rawPelanggaran.map((v, idx) => {
    let waktuStr = '-';
    if (v.waktu) {
      waktuStr = formatLocalTimeFromISO(v.waktu);
    } else if (v.timestamp) {
      try {
        const d = new Date(typeof v.timestamp === 'number' ? v.timestamp : Number(v.timestamp));
        waktuStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: activeTz });
      } catch {
        waktuStr = String(v.timestamp);
      }
    }

    const tipe = v.tipe_pelanggaran || v.event || 'SWITCH_TAB';
    const detail = v.detail || v.message || v.keterangan || 'Meninggalkan layar ujian / Pindah aplikasi';

    return {
      urutan: idx + 1,
      waktuStr,
      tipe: String(tipe).toUpperCase(),
      detail,
    };
  });

  // Parse Jawaban Siswa
  const rawJawaban: any[] = Array.isArray(peserta.jawaban_json) ? peserta.jawaban_json : [];
  const totalJawabanTerisi = rawJawaban.filter((j) => Boolean(j.jawaban_siswa)).length;
  const totalSoal = jadwal.BankSoal?.jumlah_soal || rawJawaban.length || 0;
  const totalKosong = Math.max(0, totalSoal - totalJawabanTerisi);

  // Status Badge Helper
  const isDisqualified = peserta.status === 'DISQUALIFIED' || normalizedViolations.length > 0;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    const sheetElement = (container?.querySelector('.print-sheet') as HTMLElement | null) || container;

    if (!sheetElement) {
      toast.error('Lembar dokumen tidak ditemukan');
      return;
    }

    const toastId = toast.loading('Menyiapkan Lembar Bukti Forensik PDF...');
    try {
      setIsExportingPdf(true);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(sheetElement, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(297, pdfHeight));

      const cleanName = siswaNama.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Bukti_Forensik_CBT_${cleanName}_${peserta.siswa_id.slice(0, 6)}.pdf`);
      toast.success('Bukti Forensik PDF berhasil diunduh', { id: toastId });
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error('Gagal mencetak dokumen: ' + (err.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const pengawasNama = (jadwal.setting_keamanan as any)?.pengawas_1_nama || 'Pengawas Ruang Ujian';
  const pengawasNip = (jadwal.setting_keamanan as any)?.pengawas_1_nip || '-';
  const guruNama = jadwal.BankSoal?.Guru?.nama_guru || (jadwal.setting_keamanan as any)?.created_by_guru_nama || 'Guru Pengampu Mapel';
  const kepsekNama = sekolahData?.kepsek_nama || sekolahData?.nama_kepala_sekolah || 'Kepala Sekolah';
  const kepsekNip = sekolahData?.kepsek_nip || sekolahData?.nip_kepala_sekolah || '-';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Bukti Forensik & Rekap Jawaban Ujian"
      description={`Audit Trail otentik verifikasi nilai & riwayat pelanggaran untuk ${siswaNama}`}
      size="5xl"
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={() => setShowLogoDaerah(!showLogoDaerah)}
      onToggleLogoSekolah={() => setShowLogoSekolah(!showLogoSekolah)}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      isExportingPdf={isExportingPdf}
      topSlot={
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Eye size={13} />
              <span>Pratinjau Layar &amp; Matriks Jawaban</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'print'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-200 dark:border-emerald-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Printer size={13} />
              <span>Format Cetak A4 Resmi (True WYSIWYG)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isDisqualified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                <AlertTriangle size={12} className="text-rose-600" />
                <span>Terdeteksi {normalizedViolations.length}x Pelanggaran</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Ujian Tertib</span>
              </span>
            )}
          </div>
        </div>
      }
    >
      {/* ── TAB 1: PRATINJAU INTERAKTIF LAYAR (SCREEN DASHBOARD VIEW) ── */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* 1. Header Identitas Siswa */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-black">
                <User size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-800 dark:text-slate-100">{siswaNama}</h3>
                  <Badge variant={peserta.status === 'DISQUALIFIED' ? 'destructive' : peserta.status === 'FINISHED' ? 'success' : 'default'}>
                    {peserta.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  NIS: <strong className="text-slate-700 dark:text-slate-300">{siswaNis}</strong> • Kelas:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">{siswaKelas}</strong> • Sesi:{' '}
                  <span className="font-semibold">{jadwal.nama_sesi}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[90px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nilai Akhir</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {peserta.nilai_akhir !== null && peserta.nilai_akhir !== undefined ? peserta.nilai_akhir : '-'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[90px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Terjawab</span>
                <span className="text-xl font-black text-slate-700 dark:text-slate-200">
                  {totalJawabanTerisi} <span className="text-xs font-normal text-slate-400">/ {totalSoal}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grid Waktu & Perangkat */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Clock size={11} /> Waktu Mulai
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{waktuMulaiFormat} {tzLabel}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Clock size={11} /> Waktu Selesai
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{waktuSelesaiFormat} {tzLabel}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Calendar size={11} /> Durasi Terpakai
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{durasiMenit} Menit</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Smartphone size={11} /> Status Kejujuran
              </span>
              <p className={`text-xs font-black ${isDisqualified ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isDisqualified ? `${normalizedViolations.length}x Melanggar` : 'Disiplin 100%'}
              </p>
            </div>
          </div>

          {/* 3. Panel Kronologi Pelanggaran (Digital Forensic Timeline) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Kronologi Digital Forensik Pelanggaran (Tab Switch / App Exit)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Rekam jejak setiap kali siswa terdeteksi keluar dari layar ujian CBT
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200">
                {normalizedViolations.length} Kejadian Tercatat
              </span>
            </div>

            {normalizedViolations.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Tidak ditemukan catatan pelanggaran layar. Siswa mengerjakan ujian secara tertib di ruang ujian.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                {normalizedViolations.map((v) => (
                  <div key={v.urutan} className="p-3 flex items-start justify-between gap-3 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {v.urutan}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-rose-900 dark:text-rose-200">{v.detail}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Tipe Audit: <span className="font-semibold">{v.tipe}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {v.waktuStr} {tzLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Panel Rekapitulasi Butir Jawaban Siswa */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Matriks Lembar Jawaban Siswa ({totalJawabanTerisi} Terisi, {totalKosong} Kosong)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Membuktikan apakah siswa sempat mengisi butir soal sebelum terhenti/diskualifikasi
                  </p>
                </div>
              </div>
            </div>

            {rawJawaban.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                <p className="text-xs font-bold text-amber-800">
                  Siswa sama sekali belum memilih opsi jawaban apapun (0 Butir Terjawab) sebelum sesi terhenti / terdiskualifikasi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {rawJawaban.map((j, idx) => {
                  const no = j.nomor || idx + 1;
                  const jwb = String(j.jawaban_siswa || '').trim().toUpperCase();
                  const isFilled = Boolean(jwb);
                  return (
                    <div
                      key={j.soal_id || idx}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        isFilled
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 text-indigo-900 dark:text-indigo-200 font-black'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 text-slate-400 font-normal'
                      }`}
                      title={`Soal No. ${no}: ${isFilled ? `Pilihan ${jwb}` : 'Kosong / Belum Diisi'}`}
                    >
                      <span className="block text-[9px] text-slate-400 font-mono">#{no}</span>
                      <span className="text-xs">{isFilled ? jwb : '-'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: LEMBAR A4 RESMI STANDAR TRUE WYSIWYG (PRINT & PDF VIEW) ── */}
      {activeTab === 'print' && (
        <div ref={sheetContainerRef} className="overflow-x-auto pb-6">
          <PrintDocumentSheet
            orientation="portrait"
            pageNumber={1}
            totalPages={1}
            footerText={`Surat Bukti Forensik Pelaksanaan CBT — ${siswaNama} (${siswaNis}) — ${jadwal.token_ujian}`}
          >
            {/* 1. KOP SURAT RESMI */}
            <PrintHeader
              variant="portrait"
              tenantInfo={tenantInfo}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            {/* 2. JUDUL DOKUMEN */}
            <div className="text-center my-3.5 space-y-0.5">
              <h3 className="text-sm font-bold uppercase tracking-wider underline text-black">
                SURAT KETERANGAN BUKTI FORENSIK PELANGGARAN &amp; HASIL CBT
              </h3>
              <p className="text-[11px] font-semibold text-slate-700">
                Nomor: SK-FORENSIK/{now.getFullYear()}/{jadwal.token_ujian}/{siswaNis}
              </p>
            </div>

            {/* 3. NARASI PEMBUKA */}
            <p className="text-justify indent-8 my-2 text-[11.5px] leading-relaxed text-black">
              Yang bertanda tangan di bawah ini, Panitia Penyelenggara Asesmen Berbasis Komputer (CBT) dan Pengawas Ruang Ujian {tenantInfo.name || 'Sekolah'}, menerangkan secara sah dan otentik berdasarkan log sistem rekaman server bahwa peserta ujian berikut:
            </p>

            {/* 4. IDENTITAS SISWA */}
            <table className="w-full my-2 text-[11px] border-collapse border border-slate-400 text-black">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="w-40 p-1.5 font-bold bg-slate-100 border-r border-slate-300">Nama Lengkap Siswa</td>
                  <td className="p-1.5 font-bold text-slate-900 uppercase">{siswaNama}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">NIS / NISN</td>
                  <td className="p-1.5 font-mono">{siswaNis} / {siswaNisn}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Kelas / Rombel</td>
                  <td className="p-1.5 font-semibold">{siswaKelas}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Mata Pelajaran &amp; Sesi</td>
                  <td className="p-1.5 font-semibold">
                    {jadwal.BankSoal?.Mapel?.nama_mapel || jadwal.BankSoal?.judul || 'Asesmen CBT'} — {jadwal.nama_sesi} (Token: {jadwal.token_ujian})
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-300">Waktu &amp; Durasi Pengerjaan</td>
                  <td className="p-1.5">
                    Mulai: <strong>{waktuMulaiFormat}</strong> s.d. Selesai: <strong>{waktuSelesaiFormat}</strong> {tzLabel} (Durasi Efektif: <strong>{durasiMenit} Menit</strong>)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 5. REKAPITULASI CAPAIAN & FORENSIK */}
            <div className="my-3">
              <h4 className="text-xs font-bold text-black uppercase mb-1">A. Rekapitulasi Pengerjaan &amp; Status Kelulusan Sesi:</h4>
              <table className="w-full text-[11px] border-collapse border border-slate-400 text-black">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                    <th className="p-1.5 border-r border-slate-300">Total Soal</th>
                    <th className="p-1.5 border-r border-slate-300">Butir Dijawab</th>
                    <th className="p-1.5 border-r border-slate-300">Butir Kosong</th>
                    <th className="p-1.5 border-r border-slate-300">Status Akhir</th>
                    <th className="p-1.5">Nilai CBT</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 font-bold">{totalSoal} Soal</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-indigo-800">{totalJawabanTerisi} Soal</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-amber-700">{totalKosong} Soal</td>
                    <td className="p-1.5 border-r border-slate-300 font-black">
                      {peserta.status === 'DISQUALIFIED' ? 'DIDISKUALIFIKASI (PELANGGARAN)' : peserta.status}
                    </td>
                    <td className="p-1.5 font-black text-sm text-slate-900">
                      {peserta.nilai_akhir !== null && peserta.nilai_akhir !== undefined ? peserta.nilai_akhir : 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. KRONOLOGI FORENSIK DETAIL PELANGGARAN */}
            <div className="my-3">
              <h4 className="text-xs font-bold text-black uppercase mb-1">B. Catatan Digital Forensik Pelanggaran (Batas Toleransi Server: 3x):</h4>
              {normalizedViolations.length === 0 ? (
                <p className="text-[11px] italic text-slate-600 bg-slate-50 p-2 border border-slate-300 rounded">
                  Tidak ditemukan catatan pelanggaran layar. Siswa tidak melakukan perpindahan tab / aplikasi selama ujian berlangsung.
                </p>
              ) : (
                <table className="w-full text-[10.5px] border-collapse border border-slate-400 text-black">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                      <th className="w-8 p-1.5 border-r border-slate-300">No.</th>
                      <th className="w-28 p-1.5 border-r border-slate-300">Waktu (WIB)</th>
                      <th className="w-32 p-1.5 border-r border-slate-300">Jenis Deteksi</th>
                      <th className="p-1.5">Deskripsi Kejadian / Keterangan Sistem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedViolations.map((v) => (
                      <tr key={v.urutan} className="border-b border-slate-300">
                        <td className="p-1 text-center font-bold border-r border-slate-300">{v.urutan}</td>
                        <td className="p-1 text-center font-mono border-r border-slate-300">{v.waktuStr}</td>
                        <td className="p-1 text-center font-bold text-rose-700 border-r border-slate-300">{v.tipe}</td>
                        <td className="p-1">{v.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 7. KESIMPULAN RESMI */}
            <p className="my-3 text-[11px] leading-relaxed text-justify text-black">
              Surat Bukti Forensik ini dicetak secara otomatis dari rekaman server sistem CBT Absenta dan bersifat final serta mengikat sebagai alat bukti otentik yang sah dalam menjawab sanggahan hasil penilaian asesmen.
            </p>

            {/* 8. TANDA TANGAN RESMI 3-PILLAR */}
            <div className="mt-4 pt-1 w-full">
              <UniversalDocumentSignatures
                layout="triangle_cbt"
                titimangsaCity={kotaSekolah}
                titimangsaDate={tanggalTitimangsa}
                customSigners={{
                  pengawas2Ujian: {
                    roleTitle: 'Guru Pengampu Mata Pelajaran,',
                    personName: guruNama,
                  },
                  pengawasUjian: {
                    roleTitle: 'Pengawas Ruang Ujian,',
                    personName: pengawasNama,
                    nip: pengawasNip,
                  },
                  kepsek: {
                    roleTitle: 'Mengetahui / Mengesahkan,\nKepala Sekolah',
                    personName: kepsekNama,
                    nip: kepsekNip,
                  },
                }}
                spacingHeightMm={14}
              />
            </div>
          </PrintDocumentSheet>
        </div>
      )}
    </UniversalDocumentModal>
  );
};
