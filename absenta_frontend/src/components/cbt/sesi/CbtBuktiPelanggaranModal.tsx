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
  Activity,
  Zap,
} from 'lucide-react';
import type { CbtJadwalUjian, CbtPesertaUjian } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { formatLocalTimeFromISO, getTimezone, getTimezoneLabel } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';

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

  // Standar Universal Document: Default selalu ke lembar cetak A4 fisik ('print')
  const [activeTab, setActiveTab] = useState<'preview' | 'print'>('print');
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
      soal_nomor: v.soal_nomor || null,
    };
  });

  // Parse Jawaban Siswa
  const rawJawaban: any[] = Array.isArray(peserta.jawaban_json) ? peserta.jawaban_json : [];
  const totalJawabanTerisi = rawJawaban.filter((j) => Boolean(j.jawaban_siswa)).length;
  const totalSoal = jadwal.BankSoal?.jumlah_soal || rawJawaban.length || 0;
  const totalKosong = Math.max(0, totalSoal - totalJawabanTerisi);

  // Status Badge Helper
  const isDisqualified = peserta.status === 'DISQUALIFIED' || normalizedViolations.length > 0;

  // ── Pemetaan Cerdas: Menghubungkan Pelanggaran Layar ke Nomor Butir Soal ──
  const questionViolationMap = React.useMemo(() => {
    const map = new Map<number, { urutan: number; tipe: string; waktuStr: string; detail: string; isFatal: boolean }[]>();

    normalizedViolations.forEach((v, vIdx) => {
      let targetNo: number | null = null;

      // 1. Cek properti soal_nomor eksplisit
      if (typeof v.soal_nomor === 'number' && v.soal_nomor > 0) {
        targetNo = v.soal_nomor;
      }

      // 2. Cek teks detail jika menyebut "Soal No. X"
      if (!targetNo && v.detail) {
        const match = v.detail.match(/(?:soal|nomor)\s*(?:no\.?|ke-?)?\s*(\d+)/i);
        if (match && match[1]) {
          targetNo = parseInt(match[1], 10);
        }
      }

      // 3. Fallback kronologis: petakan ke butir di mana siswa berhenti mengerjakan
      if (!targetNo) {
        if (vIdx === normalizedViolations.length - 1 && peserta.status === 'DISQUALIFIED') {
          targetNo = totalJawabanTerisi > 0 ? Math.min(totalSoal, totalJawabanTerisi + 1) : 1;
        } else {
          targetNo = Math.min(totalSoal, Math.max(1, totalJawabanTerisi || (vIdx + 1)));
        }
      }

      if (targetNo) {
        const existing = map.get(targetNo) || [];
        existing.push({
          urutan: v.urutan,
          tipe: v.tipe,
          waktuStr: v.waktuStr,
          detail: v.detail,
          isFatal: v.urutan >= 3 || peserta.status === 'DISQUALIFIED',
        });
        map.set(targetNo, existing);
      }
    });

    return map;
  }, [normalizedViolations, totalJawabanTerisi, totalSoal, peserta.status]);

  // ── Analisis Forensik Perilaku Siswa (Behavioral Timing & Revisit Analytics) ──
  const behavioralStats = React.useMemo(() => {
    let totalDetik = 0;
    let rapidGuessCount = 0; // Butir dijawab < 5 detik
    let totalRevisit = 0;
    let questionsWithDurationCount = 0;

    rawJawaban.forEach((j) => {
      const dur = typeof j.durasi_detik === 'number' ? j.durasi_detik : null;
      const rev = typeof j.revisit_count === 'number' ? j.revisit_count : 1;
      const isFilled = Boolean(j.jawaban_siswa);

      if (dur !== null) {
        totalDetik += dur;
        questionsWithDurationCount++;
        if (isFilled && dur < 5 && dur >= 0) {
          rapidGuessCount++;
        }
      }
      if (rev > 1) {
        totalRevisit += rev - 1;
      }
    });

    const rataRataDetikPerSoal =
      questionsWithDurationCount > 0
        ? Math.round(totalDetik / questionsWithDurationCount)
        : totalJawabanTerisi > 0 && durasiMenit > 0
        ? Math.round((durasiMenit * 60) / totalJawabanTerisi)
        : 0;

    const rapidGuessIndex =
      totalJawabanTerisi > 0 ? Math.round((rapidGuessCount / totalJawabanTerisi) * 100) : 0;

    // Vonis Matriks Perilaku Sistem
    let verdictTitle = 'Pola Pengerjaan Wajar & Analitis';
    let verdictSubtitle = 'Siswa membaca stimulus soal dengan waktu yang proporsional dan tertib.';
    let verdictType: 'success' | 'warning' | 'danger' | 'info' = 'success';
    let verdictBadge = '✅ Wajar & Analitis';

    const nilaiAkhirNum = Number(peserta.nilai_akhir || 0);

    if (peserta.status === 'DISQUALIFIED') {
      verdictTitle = 'Sanksi Diskualifikasi Sistem';
      verdictSubtitle = 'Pelanggaran batas toleransi layar server (≥ 3x). Akses sesi dihentikan otomatis.';
      verdictType = 'danger';
      verdictBadge = '🚨 Diskualifikasi';
    } else if (rapidGuessIndex >= 60 && totalJawabanTerisi >= 5) {
      verdictTitle = 'Rapid Guessing (Nembak Kilat)';
      verdictSubtitle = `${rapidGuessIndex}% butir soal dijawab < 5 detik tanpa jeda membaca stimulus yang wajar.`;
      verdictType = 'warning';
      verdictBadge = '⚠️ Nembak Kilat';
    } else if (rapidGuessIndex >= 35 && nilaiAkhirNum >= 85 && normalizedViolations.length >= 1) {
      verdictTitle = 'Indikasi Kecurangan Terbimbing (AI/Joki)';
      verdictSubtitle = 'Pengerjaan sangat cepat disertai akurasi ekstrem dan catatan pelanggaran layar.';
      verdictType = 'danger';
      verdictBadge = '🚨 Indikasi Curang';
    } else if (rataRataDetikPerSoal >= 90 && totalKosong >= totalSoal * 0.4) {
      verdictTitle = 'Struggling / Kehabisan Waktu';
      verdictSubtitle = 'Siswa menghabiskan waktu terlalu lama pada soal awal sehingga soal akhir tidak tuntas.';
      verdictType = 'info';
      verdictBadge = '⏳ Kehabisan Waktu';
    }

    return {
      totalDetik,
      rataRataDetikPerSoal,
      rapidGuessCount,
      rapidGuessIndex,
      totalRevisit,
      hasDurationData: questionsWithDurationCount > 0,
      verdictTitle,
      verdictSubtitle,
      verdictType,
      verdictBadge,
    };
  }, [
    rawJawaban,
    totalJawabanTerisi,
    totalSoal,
    totalKosong,
    durasiMenit,
    peserta.status,
    peserta.nilai_akhir,
    normalizedViolations.length,
  ]);

  const handleBrowserPrint = () => {
    if (activeTab !== 'print') {
      setActiveTab('print');
      setTimeout(() => {
        window.print();
      }, 250);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (activeTab !== 'print') {
      setActiveTab('print');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    const container = sheetContainerRef.current;
    const sheetElement = (container?.querySelector('.print-sheet') as HTMLElement | null) || container;

    if (!sheetElement) {
      toast.error('Lembar dokumen tidak ditemukan');
      return;
    }

    const toastId = toast.loading('Menyiapkan Lembar Bukti Forensik PDF (True WYSIWYG)...');
    try {
      setIsExportingPdf(true);

      // Reset CSS zoom sebelum html2canvas capture (standar True WYSIWYG)
      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        deskCanvas.style.transform = 'none';
        void deskCanvas.offsetHeight;
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Pastikan seluruh gambar (kop surat & logo) telah termuat utuh
      const imgs = Array.from(sheetElement.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

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
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      const cleanName = siswaNama.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Bukti_Forensik_CBT_${cleanName}_${jadwal.token_ujian}.pdf`);
      toast.success('Bukti Forensik PDF berhasil diunduh (True WYSIWYG)', { id: toastId });
    } catch (err: any) {
      console.error('[CBT Bukti Forensik PDF Error]', err);
      toast.error('Gagal mengunduh dokumen: ' + (err.message || 'Unknown error'), { id: toastId });
    } finally {
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
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
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Siswa:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
            {siswaNama} ({siswaNis})
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • {jadwal.BankSoal?.Mapel?.nama_mapel || 'CBT'} • Sesi: {jadwal.nama_sesi} • Token: {jadwal.token_ujian}
          </span>
        </div>
      }
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      size="5xl"
      allowSendWa={true}
      defaultWaFilename={`Bukti_Forensik_CBT_${siswaNama.replace(/[^a-zA-Z0-9]/g, '_')}_${jadwal.token_ujian}.pdf`}
      defaultWaCaption={`Yth. Orang Tua / Wali Siswa *${siswaNama}*,\n\nBerikut terlampir Surat Keterangan Bukti Forensik Pelaksanaan CBT (${jadwal.BankSoal?.Mapel?.nama_mapel || 'Asesmen CBT'} - Sesi: ${jadwal.nama_sesi}) dengan Token Ujian *${jadwal.token_ujian}* beserta riwayat pengerjaan dan rekaman audit sistem.`}
      subHeader={
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'print'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-600'
              )}
            >
              <Printer size={13} />
              <span>📄 Lembar A4 Resmi (True WYSIWYG)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-600'
              )}
            >
              <Eye size={13} />
              <span>🖥️ Dashboard Audit &amp; Matriks Interaktif</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isDisqualified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                <AlertTriangle size={12} className="text-rose-600" />
                <span>Terdeteksi {normalizedViolations.length}x Pelanggaran Layar</span>
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
        <div className="space-y-4 print:hidden max-w-4xl mx-auto py-2">
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

          {/* 3. Panel Analitik Forensik Perilaku Siswa & Vonis Sistem */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                    Analitik Forensik Perilaku &amp; Pola Pengerjaan Siswa
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Menilai keaslian pengerjaan berdasarkan kecepatan membaca butir soal dan kebiasaan bolak-balik
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                  behavioralStats.verdictType === 'danger'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                    : behavioralStats.verdictType === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                    : behavioralStats.verdictType === 'info'
                    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {behavioralStats.verdictBadge}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Rata-rata Waktu / Soal</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {behavioralStats.rataRataDetikPerSoal} Detik / Butir
                </p>
                <span className="text-[9.5px] text-slate-500">
                  {behavioralStats.rataRataDetikPerSoal < 5 ? '⚠️ Sangat Cepat (Nembak)' : 'Wajar & Proporsional'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Indeks Tebakan Kilat (RGI)</span>
                <p className={`text-sm font-black ${behavioralStats.rapidGuessIndex >= 50 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                  {behavioralStats.rapidGuessIndex}%
                </p>
                <span className="text-[9.5px] text-slate-500">
                  {behavioralStats.rapidGuessCount} butir dijawab &lt; 5 detik
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Pemeriksaan Ulang (Revisit)</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {behavioralStats.totalRevisit}x Bolak-balik
                </p>
                <span className="text-[9.5px] text-slate-500">
                  {behavioralStats.totalRevisit > 0 ? 'Siswa mengecek ulang butir' : 'Sekali lewat langsung selesai'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Kesimpulan Forensik</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {behavioralStats.verdictTitle}
                </p>
                <span className="text-[9px] text-slate-500 line-clamp-1">
                  {behavioralStats.verdictSubtitle}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Panel Kronologi Pelanggaran (Digital Forensic Timeline) */}
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
              <div className="space-y-3">
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {rawJawaban.map((j, idx) => {
                    const no = j.nomor || idx + 1;
                    const jwb = String(j.jawaban_siswa || '').trim().toUpperCase();
                    const isFilled = Boolean(jwb);
                    const dur = typeof j.durasi_detik === 'number' ? j.durasi_detik : null;
                    const rev = typeof j.revisit_count === 'number' ? j.revisit_count : 1;
                    const isRapid = isFilled && dur !== null && dur < 5;
                    const violationsOnThis = questionViolationMap.get(no) || [];
                    const hasViolation = violationsOnThis.length > 0;
                    const isFatal = violationsOnThis.some((v) => v.isFatal);

                    return (
                      <div
                        key={j.soal_id || idx}
                        className={`relative p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[58px] ${
                          hasViolation
                            ? isFatal
                              ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400 font-black'
                              : 'bg-amber-50 dark:bg-amber-950/70 border-amber-400 text-amber-950 dark:text-amber-100 ring-1 ring-amber-300 font-black'
                            : isFilled
                            ? isRapid
                              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-900 dark:text-rose-200 font-bold'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 text-slate-400 font-normal'
                        }`}
                        title={
                          hasViolation
                            ? `Soal No. ${no}: Terdeteksi ${violationsOnThis.map((v) => `Pelanggaran #${v.urutan} (${v.tipe} ${v.waktuStr})`).join(', ')}`
                            : `Soal No. ${no}: ${isFilled ? `Pilihan ${jwb}` : 'Kosong'}${dur !== null ? ` • Waktu: ${dur} detik • ${rev}x dibuka` : ''}`
                        }
                      >
                        {/* Badge Ikon Pelanggaran */}
                        {hasViolation && (
                          <span
                            className={`absolute -top-2 -right-1.5 px-1 py-0.2 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-xs ${
                              isFatal ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                            }`}
                          >
                            <AlertTriangle size={8} />
                            <span>#{violationsOnThis.map((v) => v.urutan).join(',')}</span>
                          </span>
                        )}

                        <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-mono">#{no}</span>
                        <span className="text-xs font-black">{isFilled ? jwb : '-'}</span>

                        {/* Indikator Durasi & Revisit */}
                        {dur !== null && (
                          <span
                            className={`text-[8px] font-bold px-1 rounded-xs mt-0.5 leading-tight ${
                              isRapid
                                ? 'bg-rose-200/80 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 font-black'
                                : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {dur}s{rev > 1 ? ` (${rev}x)` : ''}
                          </span>
                        )}

                        {hasViolation && (
                          <span className="text-[7.5px] font-black text-rose-700 dark:text-rose-300 truncate max-w-full leading-tight">
                            {isFatal ? 'Diskualifikasi' : 'Tab Switch'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend Keterangan Matriks */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-indigo-100 border border-indigo-300 inline-block" />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Jawaban Wajar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 text-rose-700 text-[10px] font-black inline-flex items-center justify-center">⚡</span>
                    <span className="text-rose-700 dark:text-rose-300 font-bold">&lt; 5s (Nembak Kilat)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block" />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Kosong</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 ring-1 ring-amber-300 inline-block" />
                    <span className="text-amber-800 dark:text-amber-300 font-bold">⚠️ Titik Tab Switch</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-rose-200 border border-rose-500 ring-2 ring-rose-400 inline-block" />
                    <span className="text-rose-800 dark:text-rose-300 font-black">🚨 Titik Terdiskualifikasi</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: LEMBAR A4 RESMI STANDAR TRUE WYSIWYG (PRINT & PDF VIEW) ── */}
      <div
        ref={sheetContainerRef}
        className={cn(
          'overflow-x-auto pb-6 transition-all',
          activeTab === 'preview' ? 'hidden print:block' : 'block'
        )}
      >
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
            <div className="my-2.5">
              <h4 className="text-xs font-bold text-black uppercase mb-1">A. Rekapitulasi Pengerjaan &amp; Status Kelulusan Sesi:</h4>
              <table className="w-full text-[10.5px] border-collapse border border-slate-400 text-black">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                    <th className="p-1 border-r border-slate-300">Total Soal</th>
                    <th className="p-1 border-r border-slate-300">Butir Dijawab</th>
                    <th className="p-1 border-r border-slate-300">Butir Kosong</th>
                    <th className="p-1 border-r border-slate-300">Status Akhir</th>
                    <th className="p-1">Nilai CBT</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  <tr className="border-b border-slate-300">
                    <td className="p-1 border-r border-slate-300 font-bold">{totalSoal} Soal</td>
                    <td className="p-1 border-r border-slate-300 font-bold text-indigo-800">{totalJawabanTerisi} Soal</td>
                    <td className="p-1 border-r border-slate-300 font-bold text-amber-700">{totalKosong} Soal</td>
                    <td className="p-1 border-r border-slate-300 font-black">
                      {peserta.status === 'DISQUALIFIED' ? 'DIDISKUALIFIKASI (PELANGGARAN)' : peserta.status}
                    </td>
                    <td className="p-1 font-black text-sm text-slate-900">
                      {peserta.nilai_akhir !== null && peserta.nilai_akhir !== undefined ? peserta.nilai_akhir : 0}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/70 text-[9.5px]">
                    <td className="p-1 border-r border-slate-300 text-slate-600 font-semibold">Rata Waktu / Soal:</td>
                    <td className="p-1 border-r border-slate-300 font-bold text-slate-900">{behavioralStats.rataRataDetikPerSoal} Detik / Butir</td>
                    <td className="p-1 border-r border-slate-300 text-slate-600 font-semibold">Tebakan Kilat (&lt;5s):</td>
                    <td className="p-1 border-r border-slate-300 font-bold text-rose-700">{behavioralStats.rapidGuessIndex}% ({behavioralStats.rapidGuessCount} Soal)</td>
                    <td className="p-1 font-black text-slate-800">{behavioralStats.verdictBadge}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. KRONOLOGI FORENSIK DETAIL PELANGGARAN */}
            <div className="my-2.5">
              <h4 className="text-xs font-bold text-black uppercase mb-1">B. Catatan Digital Forensik Pelanggaran (Batas Toleransi Server: 3x):</h4>
              {normalizedViolations.length === 0 ? (
                <p className="text-[11px] italic text-slate-600 bg-slate-50 p-2 border border-slate-300 rounded">
                  Tidak ditemukan catatan pelanggaran layar. Siswa tidak melakukan perpindahan tab / aplikasi selama ujian berlangsung.
                </p>
              ) : (
                <table className="w-full text-[10px] border-collapse border border-slate-400 text-black">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                      <th className="w-8 p-1 border-r border-slate-300">No.</th>
                      <th className="w-24 p-1 border-r border-slate-300">Waktu ({tzLabel})</th>
                      <th className="w-28 p-1 border-r border-slate-300">Jenis Deteksi</th>
                      <th className="p-1">Deskripsi Kejadian / Keterangan Sistem</th>
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

            {/* 7. MATRIKS LEMBAR JAWABAN SISWA & TITIK PELANGGARAN */}
            {rawJawaban.length > 0 && (
              <div className="my-2.5">
                <h4 className="text-xs font-bold text-black uppercase mb-1">
                  C. Matriks Lembar Jawaban Siswa &amp; Titik Deteksi Pelanggaran:
                </h4>
                <div className="border border-slate-400 p-2 rounded bg-slate-50/50">
                  <div className="grid grid-cols-10 gap-1 text-[9px]">
                    {rawJawaban.map((j, idx) => {
                      const no = j.nomor || idx + 1;
                      const jwb = String(j.jawaban_siswa || '').trim().toUpperCase();
                      const isFilled = Boolean(jwb);
                      const dur = typeof j.durasi_detik === 'number' ? j.durasi_detik : null;
                      const rev = typeof j.revisit_count === 'number' ? j.revisit_count : 1;
                      const isRapid = isFilled && dur !== null && dur < 5;
                      const violationsOnThis = questionViolationMap.get(no) || [];
                      const hasViolation = violationsOnThis.length > 0;
                      const isFatal = violationsOnThis.some((v) => v.isFatal);

                      return (
                        <div
                          key={j.soal_id || idx}
                          className={`p-0.5 text-center border rounded flex flex-col justify-between min-h-[35px] ${
                            hasViolation
                              ? isFatal
                                ? 'border-rose-600 bg-rose-100 font-black text-rose-900 ring-1 ring-rose-500'
                                : 'border-amber-500 bg-amber-100 font-bold text-amber-950 ring-1 ring-amber-400'
                              : isFilled
                              ? isRapid
                                ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold'
                                : 'border-slate-300 bg-white text-slate-800'
                              : 'border-dashed border-slate-300 bg-slate-100/70 text-slate-400'
                          }`}
                        >
                          <div className="text-[7px] font-mono text-slate-500">#{no}</div>
                          <div className="text-[9.5px] font-black">{isFilled ? jwb : '-'}</div>
                          <div className={`text-[6px] font-bold leading-tight ${isRapid ? 'text-rose-600 font-black' : 'text-slate-500'}`}>
                            {dur !== null ? `${dur}s` : ''}{rev > 1 ? ` (${rev}x)` : ''}
                          </div>
                          {hasViolation && (
                            <div className="text-[6px] font-black text-rose-700 leading-tight">
                              {isFatal ? '🚨Stop' : '⚠️Tab'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-[8px] text-slate-600 mt-1.5 pt-1 border-t border-slate-200">
                    <span className="font-semibold">Keterangan:</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-white border border-slate-300 inline-block rounded-xs" /> Terisi
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 font-bold">
                      <span className="w-2.5 h-2.5 bg-rose-50 border border-rose-400 inline-block rounded-xs" /> ⚡ &lt; 5s (Nembak Kilat)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-slate-100 border border-dashed border-slate-300 inline-block rounded-xs" /> Kosong
                    </span>
                    <span className="flex items-center gap-1 text-amber-800 font-bold">
                      <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-500 inline-block rounded-xs" /> ⚠️ Titik Tab Switch
                    </span>
                    <span className="flex items-center gap-1 text-rose-800 font-black">
                      <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-600 inline-block rounded-xs" /> 🚨 Titik Diskualifikasi
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. KESIMPULAN RESMI */}
            <p className="my-2.5 text-[10.5px] leading-relaxed text-justify text-black">
              Surat Bukti Forensik ini dicetak secara otomatis dari rekaman server sistem CBT Absenta dan bersifat final serta mengikat sebagai alat bukti otentik yang sah dalam menjawab sanggahan hasil penilaian asesmen.
            </p>

            {/* 9. TANDA TANGAN RESMI 3-PILLAR */}
            <div className="mt-3 pt-1 w-full">
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
                spacingHeightMm={10}
              />
            </div>
          </PrintDocumentSheet>
        </div>
    </UniversalDocumentModal>
  );
};
