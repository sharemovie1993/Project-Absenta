import React, { useRef, useState, useEffect } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  Button,
} from '@/components/ui';
import { SlidersHorizontal, UserCheck, RotateCcw, PenTool } from 'lucide-react';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import toast from 'react-hot-toast';
import { formatLocalTimeFromISO, getTimezone, getTimezoneLabel } from '@/utils/attendance/time';
import { DigitalSignaturePadModal } from '@/components/ui/DigitalSignaturePadModal';

interface CbtBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: CbtJadwalUjian | null;
}

export const CbtBeritaAcaraPrintModal: React.FC<CbtBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  jadwal,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Toggle Logos state (Kop Surat)
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showTtdConfig, setShowTtdConfig] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);

  // Universal Hook: Resolves active Tenant & Sekolah data
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  // Penandatangan & Catatan State
  const [pengawas1Nama, setPengawas1Nama] = useState<string>('');
  const [pengawas1Nip, setPengawas1Nip] = useState<string>('');
  const [pengawas1Signature, setPengawas1Signature] = useState<string>('');
  const [pengawas2Nama, setPengawas2Nama] = useState<string>('');
  const [pengawas2Nip, setPengawas2Nip] = useState<string>('');
  const [pengawas2Signature, setPengawas2Signature] = useState<string>('');
  const [kepsekNama, setKepsekNama] = useState<string>('');
  const [kepsekNip, setKepsekNip] = useState<string>('');
  const [ruangUjian, setRuangUjian] = useState<string>('Laboratorium Komputer / Ruang CBT');
  const [catatanPelaksanaan, setCatatanPelaksanaan] = useState<string>(
    'Pelaksanaan asesmen Computer-Based Test (CBT) berlangsung dengan tertib, aman, dan lancar sesuai prosedur operasional standar tanpa kendala teknis yang berarti.'
  );

  const queryClient = useQueryClient();

  // Ambil data jadwal ter-update dari backend agar tanda tangan pengawas langsung tersinkron
  const { data: freshJadwal } = useQuery<CbtJadwalUjian>({
    queryKey: cbtQueryKeys.jadwalDetail(jadwal?.id || ''),
    queryFn: () => (jadwal?.id ? cbtApi.getJadwalById(jadwal.id) : Promise.resolve(null as any)),
    enabled: Boolean(isOpen && jadwal?.id),
  });

  const currentJadwal = freshJadwal || jadwal;

  const updateSignatureMutation = useMutation({
    mutationFn: async (base64Signature: string) => {
      if (!currentJadwal?.id) return;
      const rawSetting = currentJadwal.setting_keamanan || {};
      const currentSetting = typeof rawSetting === 'string' ? JSON.parse(rawSetting) : rawSetting;
      const updatedSetting = {
        ...currentSetting,
        tanda_tangan_pengawas_1: base64Signature,
        waktu_ttd_pengawas_1: new Date().toISOString(),
      };
      return cbtApi.updateJadwal(currentJadwal.id, {
        setting_keamanan: updatedSetting,
      });
    },
    onSuccess: async () => {
      toast.success('Tanda tangan digital pengawas berhasil disimpan');
      setIsSignModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['my-pengawas-cbt-schedules'] });
      if (currentJadwal?.id) {
        await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwalDetail(currentJadwal.id) });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan tanda tangan pengawas');
    },
  });

  // Ambil data peserta sesi untuk rekap kehadiran otomatis di Berita Acara
  const { data: pesertaList = [] } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(currentJadwal?.id || ''),
    queryFn: () => (currentJadwal?.id ? cbtApi.getPesertaList(currentJadwal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && currentJadwal?.id),
  });

  const populateDefaultSigners = () => {
    const rawCfg = currentJadwal?.setting_keamanan;
    const cfg = typeof rawCfg === 'string' ? JSON.parse(rawCfg) : rawCfg;
    const defaultGuruNama =
      cfg?.pengawas_1_nama ||
      currentJadwal?.BankSoal?.Guru?.nama_guru ||
      '';
    const defaultGuruNip =
      cfg?.pengawas_1_nip ||
      (currentJadwal?.BankSoal?.Guru as any)?.nip ||
      '-';
    const defaultProktorNama =
      cfg?.proktor_nama ||
      cfg?.pengawas_2_nama ||
      '';
    const defaultProktorNip =
      cfg?.proktor_nip ||
      cfg?.pengawas_2_nip ||
      '-';
    const defaultRuang =
      cfg?.ruang_ujian ||
      'Ruang Kelas / Ruang Ujian CBT';

    const defaultKepsek =
      sekolahData?.kepala_sekolah ||
      sekolahData?.nama_kepala_sekolah ||
      'Kepala Sekolah';
    const defaultNipKepsek =
      sekolahData?.nip_kepala ||
      sekolahData?.nip_kepala_sekolah ||
      '-';

    setRuangUjian(defaultRuang);
    setPengawas1Nama(defaultGuruNama);
    setPengawas1Nip(defaultGuruNip);
    setPengawas1Signature(cfg?.tanda_tangan_pengawas_1 || '');
    setPengawas2Nama(defaultProktorNama);
    setPengawas2Nip(defaultProktorNip);
    setPengawas2Signature(cfg?.tanda_tangan_proktor || cfg?.tanda_tangan_pengawas_2 || '');
    setKepsekNama(defaultKepsek);
    setKepsekNip(defaultNipKepsek);
  };

  useEffect(() => {
    if (isOpen && currentJadwal) {
      populateDefaultSigners();
    }
  }, [isOpen, currentJadwal, currentJadwal?.setting_keamanan]);

  if (!currentJadwal) return null;

  const activeTz = getTimezone();
  const tzLabel = getTimezoneLabel(activeTz);
  const tglMulai = new Date(currentJadwal.tanggal_mulai);
  const tanggalFormat = tglMulai.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: activeTz,
  });
  const tanggalTitimangsa = tglMulai.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: activeTz,
  });

  const jamMulai = formatLocalTimeFromISO(currentJadwal.tanggal_mulai);
  const jamSelesai = formatLocalTimeFromISO(currentJadwal.tanggal_selesai);
  const jamFormat =
    jamMulai && jamSelesai
      ? `${jamMulai} s.d. ${jamSelesai} ${tzLabel}`
      : `${tglMulai.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: activeTz })} ${tzLabel} s.d. Selesai`;

  const kotaSekolah = sekolahData?.kota || sekolahData?.kabupaten || 'Purwakarta';
  const totalPeserta = pesertaList.length || currentJadwal._count?.Peserta || 0;
  const totalSelesai = pesertaList.filter((p) => p.status === 'FINISHED').length;
  const totalSedangUjian = pesertaList.filter((p) => p.status === 'IN_PROGRESS').length;
  const totalDiskualifikasi = pesertaList.filter((p) => p.status === 'DISQUALIFIED').length;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';
    const container = sheetContainerRef.current;
    const sheetElement =
      (container?.querySelector('.print-sheet') as HTMLElement | null) || container;

    if (!sheetElement) {
      toast.error('Lembar dokumen tidak ditemukan');
      return;
    }

    const toastId = toast.loading('Menyiapkan dokumen PDF Berita Acara CBT...');
    try {
      setIsExportingPdf(true);

      // LANGKAH 2: Matikan zoom DOM riil & paksa reflow sinkron
      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        deskCanvas.style.transform = 'none';
        void deskCanvas.offsetHeight;
      }

      // LANGKAH 3: Tunggu rasterisasi font & beri jeda settle repaint tick
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Pastikan seluruh image (kop surat & TTD pengawas) sudah ter-load sempurna
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

      // LANGKAH 4: Render canvas dengan onclone sanitizer
      const canvas = await html2canvas(sheetElement, {
        scale: 2.0, // Wajib: 2.0 (~200 DPI Retina, tajam dan hemat RAM)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
          if (clonedDesk) {
            clonedDesk.style.zoom = '1';
            clonedDesk.style.transform = 'none';
          }
          const sheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
          sheets.forEach((s) => {
            s.style.zoom = '1';
            s.style.transform = 'none';
            s.style.letterSpacing = 'normal';
            s.style.fontVariantLigatures = 'none';
            s.style.border = 'none';
            s.style.boxShadow = 'none';
            s.style.outline = 'none';
          });
          const clonedImgs = clonedDoc.querySelectorAll('img');
          clonedImgs.forEach((img) => {
            img.style.filter = 'none';
          });
        },
      });

      // LANGKAH 5: Preservasi Rasio Aspek (JPEG 0.88 + Stream Compression)
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * canvasRatio;

      if (imgHeight <= pdfHeight + 1) {
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

      const cleanSession = (currentJadwal.nama_sesi || 'SESI_CBT').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`BERITA_ACARA_CBT_${cleanSession}_${currentJadwal.token_ujian}.pdf`);
      toast.success('PDF Berita Acara CBT berhasil diunduh (True WYSIWYG)', { id: toastId });
    } catch (err: any) {
      console.error('[CBT Berita Acara PDF Error]', err);
      toast.error(err?.message || 'Gagal mengunduh PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Berita Acara Pelaksanaan CBT"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Sesi:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            {currentJadwal.nama_sesi}
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Mapel: {currentJadwal.BankSoal?.Mapel?.nama_mapel || '-'} • Token: {currentJadwal.token_ujian}
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
      extraActions={
        <button
          type="button"
          onClick={() => setShowTtdConfig((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
            showTtdConfig
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
          }`}
          title="Sesuaikan nama penandatangan (TTD) & catatan pelaksanaan sebelum cetak"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showTtdConfig ? 'Tutup Pengaturan TTD' : 'Pengaturan TTD & Catatan'}</span>
        </button>
      }
    >
      {/* ── PANEL KONTROL PENGATURAN TTD & CATATAN (PRINT:HIDDEN) ── */}
      {showTtdConfig && (
        <div className="print:hidden mb-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-900/40">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Kustomisasi Penandatangan & Catatan Berita Acara
              </span>
            </div>
            <button
              type="button"
              onClick={populateDefaultSigners}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Struktur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                Pengawas 1 / Guru Pengampu
              </label>
              <input
                type="text"
                value={pengawas1Nama}
                onChange={(e) => setPengawas1Nama(e.target.value)}
                placeholder="Nama Lengkap & Gelar"
                aria-label="Nama Pengawas 1"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={pengawas1Nip}
                onChange={(e) => setPengawas1Nip(e.target.value)}
                placeholder="NIP Pengawas 1"
                aria-label="NIP Pengawas 1"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />

              {/* Status & Kontrol TTD Digital Pengawas */}
              <div className="mt-2 p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {pengawas1Signature ? (
                    <>
                      <img
                        src={pengawas1Signature}
                        alt="TTD Pengawas"
                        className="h-6 max-w-[55px] object-contain border border-amber-300 rounded bg-white p-0.5"
                      />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        TTD Digital ✓
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Belum Ada TTD
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSignModalOpen(true)}
                    className="text-[10px] h-6 px-2 font-bold cursor-pointer"
                  >
                    <PenTool size={11} className="mr-1" />
                    <span>{pengawas1Signature ? 'Ubah' : 'Tanda Tangani'}</span>
                  </Button>
                  {pengawas1Signature && (
                    <button
                      type="button"
                      onClick={() => {
                        setPengawas1Signature('');
                        updateSignatureMutation.mutate('');
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-700 px-1 cursor-pointer"
                      title="Hapus tanda tangan digital pengawas"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                Pengawas 2 / Proktor Ruang
              </label>
              <input
                type="text"
                value={pengawas2Nama}
                onChange={(e) => setPengawas2Nama(e.target.value)}
                placeholder="Nama Lengkap & Gelar"
                aria-label="Nama Pengawas 2"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={pengawas2Nip}
                onChange={(e) => setPengawas2Nip(e.target.value)}
                placeholder="NIP Pengawas 2"
                aria-label="NIP Pengawas 2"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                Kepala Sekolah (Mengetahui)
              </label>
              <input
                type="text"
                value={kepsekNama}
                onChange={(e) => setKepsekNama(e.target.value)}
                placeholder="Nama Kepala Sekolah"
                aria-label="Nama Kepala Sekolah"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={kepsekNip}
                onChange={(e) => setKepsekNip(e.target.value)}
                placeholder="NIP Kepala Sekolah"
                aria-label="NIP Kepala Sekolah"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Ruang / Lab Pelaksanaan:
              </label>
              <input
                type="text"
                value={ruangUjian}
                onChange={(e) => setRuangUjian(e.target.value)}
                placeholder="Contoh: Lab Komputer 1"
                aria-label="Ruang Pelaksanaan"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Catatan Jalannya Ujian:
              </label>
              <input
                type="text"
                value={catatanPelaksanaan}
                onChange={(e) => setCatatanPelaksanaan(e.target.value)}
                placeholder="Catatan pengawas selama ujian berlangsung..."
                aria-label="Catatan Pelaksanaan"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── LEMBAR A4 PORTRAIT STANDAR UNIVERSAL DOCUMENT PRINTING ── */}
      <div ref={sheetContainerRef}>
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={1}
          footerText={`Berita Acara Pelaksanaan CBT — ${currentJadwal.nama_sesi} (${currentJadwal.token_ujian})`}
        >
          {/* 1. KOP SURAT RESMI DINAS & SEKOLAH */}
          <PrintHeader
            variant="portrait"
            tenantInfo={tenantInfo}
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
          />

          {/* 2. JUDUL DOKUMEN */}
          <div className="text-center my-4 space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-wider underline text-black">
              BERITA ACARA PELAKSANAAN ASESMEN BERBASIS KOMPUTER (CBT)
            </h3>
            <p className="text-[11px] font-semibold text-slate-700">
              Nomor: BA-CBT/{tglMulai.getFullYear()}/{currentJadwal.token_ujian}
            </p>
          </div>

          {/* 3. NARASI PEMBUKA */}
          <p className="text-justify indent-8 my-3 text-[11.5px] leading-relaxed text-black">
            Pada hari ini, <strong>{tanggalFormat}</strong>, bertempat di{' '}
            <strong>{ruangUjian}</strong> {tenantInfo.name || 'Sekolah'}, telah dilaksanakan
            Asesmen Berbasis Komputer / <em>Computer-Based Test</em> (CBT) secara daring/digital
            dengan rincian pelaksanaan sebagai berikut:
          </p>

          {/* 4. TABEL RINCIAN SESI & KEHADIRAN PESERTA */}
          <table className="w-full my-3 text-[11.5px] border-collapse border border-slate-400 text-black">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="w-8 p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">1.</td>
                <td className="w-52 p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Nama Sesi Ujian</td>
                <td className="p-1.5 font-bold">{currentJadwal.nama_sesi}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">2.</td>
                <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Mata Pelajaran</td>
                <td className="p-1.5 font-semibold">
                  {currentJadwal.BankSoal?.Mapel?.nama_mapel || '-'}{' '}
                  {currentJadwal.BankSoal?.tingkat ? `(Tingkat ${currentJadwal.BankSoal.tingkat})` : ''}
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">3.</td>
                <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Kode Paket Bank Soal</td>
                <td className="p-1.5 font-mono font-bold">
                  {currentJadwal.BankSoal?.kode_bank || '-'} ({currentJadwal.BankSoal?.jumlah_soal || 0} Butir Soal)
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">4.</td>
                <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Waktu & Durasi Pengerjaan</td>
                <td className="p-1.5">
                  {jamFormat} (Alokasi: <strong>{currentJadwal.durasi_menit} Menit</strong>)
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">5.</td>
                <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Token Masuk Sesi</td>
                <td className="p-1.5 font-mono font-black tracking-widest">{currentJadwal.token_ujian}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">6.</td>
                <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Rekapitulasi Peserta Ujian</td>
                <td className="p-1.5">
                  Terdaftar/Mengikuti: <strong>{totalPeserta} Siswa</strong> • Selesai Submit:{' '}
                  <strong>{totalSelesai} Siswa</strong>
                  {totalSedangUjian > 0 ? ` • Sedang Mengerjakan: ${totalSedangUjian} Siswa` : ''}
                  {totalDiskualifikasi > 0 ? ` • Diskualifikasi: ${totalDiskualifikasi} Siswa` : ''}
                </td>
              </tr>
              <tr>
                <td className="p-1.5 text-center font-bold bg-slate-100 border-r border-slate-300">7.</td>
                <td className="p-1.5 font-semibold bg-slate-50 border-r border-slate-300">Sistem Pengawasan Digital</td>
                <td className="p-1.5 font-semibold">
                  Aktif (Anti-Tab Switch Guard, Fullscreen Lock & Pengacakan Soal/Opsi)
                </td>
              </tr>
            </tbody>
          </table>

          {/* 5. CATATAN PENGAWAS */}
          <div className="my-3.5 text-[11.5px] text-black">
            <p className="font-bold mb-1">Catatan Kejadian / Pelaksanaan Selama Ujian:</p>
            <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-[11px] leading-relaxed italic">
              {catatanPelaksanaan}
            </div>
          </div>

          <p className="my-3 text-[11.5px] leading-relaxed text-justify text-black">
            Demikian Berita Acara Pelaksanaan Asesmen Berbasis Komputer (CBT) ini dibuat dengan
            sebenarnya dan penuh rasa tanggung jawab untuk dapat dipergunakan sebagaimana mestinya.
          </p>

          {/* 6. STANDAR TANDA TANGAN (ADAPTIF: 1 PENGAWAS KELAS VS 2 PENGAWAS/PROKTOR) */}
          {/* 6. STANDAR TANDA TANGAN MENGGUNAKAN UNIVERSAL SIGNATURE ENGINE */}
          <div className="mt-6 pt-2 w-full">
            {pengawas2Nama.trim() ? (
              <UniversalDocumentSignatures
                layout="triangle_rapor"
                titimangsaCity={kotaSekolah}
                titimangsaDate={tanggalTitimangsa}
                overrideSignerLeft={{
                  roleTitle: 'Pengawas I / Ruang Ujian,',
                  personName: pengawas1Nama,
                  nip: pengawas1Nip,
                  signatureImage: pengawas1Signature,
                }}
                overrideSignerRight={{
                  roleTitle: 'Pengawas II / Proktor Ruang,',
                  personName: pengawas2Nama,
                  nip: pengawas2Nip,
                  signatureImage: pengawas2Signature,
                }}
                overrideSignerCenter={{
                  roleTitle: 'Mengetahui / Menyetujui,\nKepala Sekolah',
                  personName: kepsekNama,
                  nip: kepsekNip,
                }}
                spacingHeightMm={16}
              />
            ) : (
              <UniversalDocumentSignatures
                layout="dual_unit_kepsek"
                titimangsaCity={kotaSekolah}
                titimangsaDate={tanggalTitimangsa}
                overrideSignerLeft={{
                  roleTitle: 'Mengetahui / Menyetujui,\nKepala Sekolah',
                  personName: kepsekNama,
                  nip: kepsekNip,
                }}
                overrideSignerRight={{
                  roleTitle: 'Pengawas Ruang Ujian,',
                  personName: pengawas1Nama,
                  nip: pengawas1Nip,
                  signatureImage: pengawas1Signature,
                }}
                spacingHeightMm={16}
              />
            )}
          </div>
        </PrintDocumentSheet>
      </div>

      {/* Modal Tanda Tangan Digital Pengawas */}
      <DigitalSignaturePadModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        title="Tanda Tangan Digital Pengawas Ujian"
        subtitle={`Sesi: ${currentJadwal.nama_sesi || 'Ujian CBT'} • Ruang: ${ruangUjian}`}
        penName={pengawas1Nama || 'Pengawas Ruang'}
        initialSignature={pengawas1Signature}
        onSave={(sig) => {
          setPengawas1Signature(sig);
          updateSignatureMutation.mutate(sig);
        }}
      />
    </UniversalDocumentModal>
  );
};
