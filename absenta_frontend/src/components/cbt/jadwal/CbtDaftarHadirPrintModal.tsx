import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  Button,
} from '@/components/ui';
import { SlidersHorizontal, UserCheck, RotateCcw, PenTool } from 'lucide-react';
import type { CbtJadwalUjian, CbtPesertaUjian } from '@/types/cbt.types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import toast from 'react-hot-toast';
import { formatLocalTimeFromISO, getTimezoneLabel } from '@/utils/attendance/time';
import { formatLocalDateIndo } from '@/utils/date.utils';
import { DigitalSignaturePadModal } from '@/components/ui/DigitalSignaturePadModal';

interface CbtDaftarHadirPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: CbtJadwalUjian | null;
}

export const CbtDaftarHadirPrintModal: React.FC<CbtDaftarHadirPrintModalProps> = ({
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

  // Universal Hook: Resolves active Tenant & Sekolah data
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah as any;

  // Penandatangan & Ruang State
  const [pengawas1Nama, setPengawas1Nama] = useState<string>('');
  const [pengawas1Nip, setPengawas1Nip] = useState<string>('');
  const [pengawas1Signature, setPengawas1Signature] = useState<string>('');
  const [proktorNama, setProktorNama] = useState<string>('');
  const [proktorNip, setProktorNip] = useState<string>('');
  const [proktorSignature, setProktorSignature] = useState<string>('');
  const [kepsekNama, setKepsekNama] = useState<string>('');
  const [kepsekNip, setKepsekNip] = useState<string>('');
  const [ruangUjian, setRuangUjian] = useState<string>('Ruang Ujian CBT');
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const updateSignatureMutation = useMutation({
    mutationFn: async (base64Signature: string) => {
      if (!jadwal?.id) return;
      const currentSetting = jadwal.setting_keamanan || {};
      const updatedSetting = {
        ...currentSetting,
        tanda_tangan_pengawas_1: base64Signature,
        waktu_ttd_pengawas_1: new Date().toISOString(),
      };
      return cbtApi.updateJadwal(jadwal.id, {
        setting_keamanan: updatedSetting,
      });
    },
    onSuccess: () => {
      toast.success('Tanda tangan digital pengawas berhasil disimpan');
      setIsSignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan tanda tangan pengawas');
    },
  });

  // Ambil data peserta sesi untuk tabel kehadiran & tanda tangan digital
  const { data: pesertaList = [], isLoading: loadingPeserta } = useQuery<CbtPesertaUjian[]>({
    queryKey: cbtQueryKeys.pesertaList(jadwal?.id || ''),
    queryFn: () => (jadwal?.id ? cbtApi.getPesertaList(jadwal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && jadwal?.id),
  });

  const populateDefaultSigners = () => {
    const cfg = jadwal?.setting_keamanan;
    const defaultGuruNama =
      cfg?.pengawas_1_nama ||
      jadwal?.BankSoal?.Guru?.nama_guru ||
      '';
    const defaultGuruNip =
      cfg?.pengawas_1_nip ||
      (jadwal?.BankSoal?.Guru as any)?.nip ||
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
    setProktorNama(defaultProktorNama);
    setProktorNip(defaultProktorNip);
    setProktorSignature(cfg?.tanda_tangan_proktor || cfg?.tanda_tangan_pengawas_2 || '');
    setKepsekNama(defaultKepsek);
    setKepsekNip(defaultNipKepsek);
  };

  useEffect(() => {
    if (isOpen && jadwal) {
      populateDefaultSigners();
    }
  }, [isOpen, jadwal]);

  // Urutkan peserta berdasarkan NISN / Nama Siswa
  const sortedPeserta = useMemo(() => {
    const copy = [...pesertaList];
    copy.sort((a, b) => {
      const namaA = a.Siswa?.nama_lengkap || (a as any).siswa?.nama_lengkap || '';
      const namaB = b.Siswa?.nama_lengkap || (b as any).siswa?.nama_lengkap || '';
      return namaA.localeCompare(namaB);
    });
    return copy;
  }, [pesertaList]);

  // Statistik Kehadiran
  const stats = useMemo(() => {
    const total = sortedPeserta.length;
    let signed = 0;
    let present = 0;

    sortedPeserta.forEach((p) => {
      const meta = p.metadata_perangkat as any;
      if (meta?.tanda_tangan) signed++;
      if (p.status === 'IN_PROGRESS' || p.status === 'FINISHED' || p.status === 'DISQUALIFIED') present++;
    });

    return {
      total,
      signed,
      present: present > signed ? present : signed,
      absent: total - (present > signed ? present : signed),
    };
  }, [sortedPeserta]);

  // Handler Print Browser (@media print)
  const handlePrint = () => {
    window.print();
  };

  // Handler Export PDF True WYSIWYG Berstandar Industri (5-Langkah Protokol Baku Anti-Kerning Collapse)
  const handleDownloadPdf = async () => {
    if (!jadwal) return;

    // ── LANGKAH 1: Ambil container canvas preview & simpan zoom asli ──
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';

    const toastId = toast.loading('Menyiapkan dokumen PDF Daftar Hadir CBT (True WYSIWYG)...');
    try {
      setIsExportingPdf(true);

      // ── LANGKAH 2: Matikan zoom DOM riil & paksa reflow sinkron ──
      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        deskCanvas.style.transform = 'none';
        void deskCanvas.offsetHeight; // Trigger synchronous reflow
      }

      // ── LANGKAH 3: Tunggu rasterisasi font & beri jeda settle repaint tick ──
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));

      const sheetElements = document.querySelectorAll<HTMLElement>('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        toast.error('Lembar dokumen tidak ditemukan', { id: toastId });
        return;
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true, // Stream compression aktif
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const sheetElement = sheetElements[i];

        // ── LANGKAH 4: Render canvas dengan onclone sanitizer ──
        const canvas = await html2canvas(sheetElement, {
          scale: 2.0, // Skala 2.0 (~200 DPI Retina)
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            // Netralkan desk canvas pada DOM kloningan
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              clonedDesk.style.transform = 'none';
            }
            // Netralkan seluruh sheet kloningan: hilangkan border, shadow, dan paksa letterSpacing normal
            const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
            clonedSheets.forEach((s) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.letterSpacing = 'normal';
              s.style.fontVariantLigatures = 'none';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        // ── LANGKAH 5: Preservasi Rasio Aspek (Anti-Gepeng & Anti-Bloat) ──
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
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
      }

      const cleanSession = (jadwal.nama_sesi || 'SESI_CBT').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`DAFTAR_HADIR_CBT_${cleanSession}_${jadwal.token_ujian}.pdf`);
      toast.success('Daftar Hadir CBT berhasil diunduh (True WYSIWYG)', { id: toastId });
    } catch (err: any) {
      console.error('[PDF Export Error]:', err);
      toast.error(err.message || 'Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      // Selalu kembalikan zoom desk ke posisi semula
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExportingPdf(false);
    }
  };

  if (!jadwal) return null;

  // Format tanggal & jam
  const tanggalFormat = formatLocalDateIndo(jadwal.tanggal_mulai);
  const jamMulai = formatLocalTimeFromISO(jadwal.tanggal_mulai);
  const jamSelesai = formatLocalTimeFromISO(jadwal.tanggal_selesai);
  const tz = getTimezoneLabel();
  const jamFormat = `${jamMulai} s.d. ${jamSelesai} ${tz}`;

  // Kota & Tanggal Titimangsa
  const kotaSekolah = sekolahData?.kota || sekolahData?.kabupaten || 'Tempat';
  const tanggalTitimangsa = tanggalFormat;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Daftar Hadir Peserta Ujian (CBT)"
      subtitle={`${jadwal.nama_sesi} • Token: ${jadwal.token_ujian}`}
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handlePrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF'}
      printButtonText="Cetak"
      size="5xl"
      extraActions={
        <button
          type="button"
          onClick={() => setShowTtdConfig((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            showTtdConfig
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
          }`}
          title="Atur Pejabat Penandatangan & Ruang"
        >
          <SlidersHorizontal size={14} />
          <span>{showTtdConfig ? 'Tutup Pengaturan Form' : 'Pengaturan Form & TTD'}</span>
        </button>
      }
    >
      {/* ── PANEL DRAWER PENGATURAN SIGNER & RUANG (COLLAPSIBLE) ── */}
      {showTtdConfig && (
        <div className="mb-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:bg-slate-800/80 dark:border-indigo-900/50 text-xs space-y-3.5 print:hidden">
          <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-700 pb-2">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <UserCheck size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Pengaturan Lembar Daftar Hadir & Pejabat Penandatangan</span>
            </span>
            <button
              type="button"
              onClick={populateDefaultSigners}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <RotateCcw size={12} />
              <span>Reset Default</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Lokasi Ruang Ujian */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Lokasi / Nama Ruang Ujian:
              </label>
              <input
                type="text"
                value={ruangUjian}
                onChange={(e) => setRuangUjian(e.target.value)}
                placeholder="cth: Lab Komputer 1 / R.05"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            {/* Pengawas Ruang 1 */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Pengawas Ruang Ujian (Nama & Gelar):
              </label>
              <input
                type="text"
                value={pengawas1Nama}
                onChange={(e) => setPengawas1Nama(e.target.value)}
                placeholder="Nama Pengawas Ruang"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                value={pengawas1Nip}
                onChange={(e) => setPengawas1Nip(e.target.value)}
                placeholder="NIP Pengawas (kosongkan jika -)"
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />

              {/* Status & Kontrol TTD Digital Pengawas */}
              <div className="mt-2 p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {pengawas1Signature ? (
                    <>
                      <img
                        src={pengawas1Signature}
                        alt="TTD Pengawas"
                        className="h-6 max-w-[55px] object-contain border border-emerald-300 rounded bg-white p-0.5"
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

            {/* Proktor / Pengawas 2 */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Proktor Ruang / Pengawas II:
              </label>
              <input
                type="text"
                value={proktorNama}
                onChange={(e) => setProktorNama(e.target.value)}
                placeholder="Nama Proktor / Pengawas II"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                value={proktorNip}
                onChange={(e) => setProktorNip(e.target.value)}
                placeholder="NIP Proktor (kosongkan jika -)"
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── LEMBAR DOKUMEN CETAK A4 TRUE WYSIWYG ── */}
      <div className="flex justify-center p-2 sm:p-4">
        <PrintDocumentSheet
          ref={sheetContainerRef}
          paperSize="A4"
          orientation="portrait"
          style={{ letterSpacing: 'normal' }}
          className="shadow-xl mx-auto print-sheet"
        >
          {/* 1. KOP SURAT RESMI */}
          <PrintHeader
            sekolahData={sekolahData}
            tenantData={tenantInfo}
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
          />

          {/* 2. JUDUL DOKUMEN */}
          <div className="text-center my-3 pb-1 border-b-2 border-black">
            <h2 className="text-sm font-black uppercase tracking-wider text-black">
              Daftar Hadir Peserta Asesmen / Ujian Berbasis Komputer (CBT)
            </h2>
            <p className="text-[11px] font-bold text-black uppercase mt-0.5">
              Tahun Ajaran {jadwal.TahunPelajaran?.tahun || '2026/2027'} • Semester {jadwal.Semester?.nama || 'Ganjil'}
            </p>
          </div>

          {/* 3. METADATA SESI UJIAN (GRID 2-KOLOM COMPACT) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10.5px] leading-tight text-black my-2.5 pb-2 border-b border-slate-300">
            <div className="flex">
              <span className="w-28 font-semibold shrink-0">Mata Pelajaran</span>
              <span className="mr-1.5">:</span>
              <span className="font-bold">
                {jadwal.BankSoal?.Mapel?.nama_mapel || jadwal.BankSoal?.judul || 'Mata Pelajaran Umum'}{' '}
                {jadwal.BankSoal?.tingkat ? `(Tingkat ${jadwal.BankSoal.tingkat})` : ''}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold shrink-0">Hari, Tanggal</span>
              <span className="mr-1.5">:</span>
              <span className="font-bold">{tanggalFormat}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold shrink-0">Nama Sesi Ujian</span>
              <span className="mr-1.5">:</span>
              <span>{jadwal.nama_sesi}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold shrink-0">Waktu / Alokasi</span>
              <span className="mr-1.5">:</span>
              <span>
                {jamFormat} ({jadwal.durasi_menit} Menit)
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold shrink-0">Ruang Ujian</span>
              <span className="mr-1.5">:</span>
              <span className="font-bold">{ruangUjian}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-semibold shrink-0">Token Masuk Sesi</span>
              <span className="mr-1.5">:</span>
              <span className="font-mono font-black tracking-widest">{jadwal.token_ujian}</span>
            </div>
          </div>

          {/* 4. TABEL DAFTAR HADIR PESERTA & TANDA TANGAN DIGITAL */}
          <div className="my-2">
            <table className="w-full text-[10px] border-collapse border border-black text-black">
              <thead>
                <tr className="bg-slate-100 border-b border-black text-[10px] font-bold">
                  <th className="border border-black py-1.5 px-1 text-center w-7">No</th>
                  <th className="border border-black py-1.5 px-2 text-center w-24">NISN / No Peserta</th>
                  <th className="border border-black py-1.5 px-2 text-left">Nama Lengkap Peserta</th>
                  <th className="border border-black py-1.5 px-1.5 text-center w-20">Kelas</th>
                  <th className="border border-black py-1.5 px-1 text-center w-16">Waktu Masuk</th>
                  <th className="border border-black py-1.5 px-1 text-center w-16">Status</th>
                  <th className="border border-black py-1.5 px-2 text-center w-28">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                {loadingPeserta ? (
                  <tr>
                    <td colSpan={7} className="border border-black py-8 text-center text-slate-500 italic">
                      Memuat daftar peserta ujian...
                    </td>
                  </tr>
                ) : sortedPeserta.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-black py-8 text-center text-slate-500 italic">
                      Belum ada peserta terdaftar pada sesi ujian ini.
                    </td>
                  </tr>
                ) : (
                  sortedPeserta.map((p, idx) => {
                    const meta = (p.metadata_perangkat || {}) as any;
                    const signatureImg = meta.tanda_tangan;
                    const waktuTtd = meta.waktu_ttd || p.waktu_mulai;
                    const waktuFormatted = waktuTtd ? formatLocalTimeFromISO(waktuTtd) : '-';

                    const namaSiswa =
                      p.Siswa?.nama_lengkap ||
                      (p as any).siswa?.nama_lengkap ||
                      (p as any).nama_siswa ||
                      'Peserta Didik';
                    const nisn =
                      p.Siswa?.nisn ||
                      p.Siswa?.nis ||
                      (p as any).siswa?.nisn ||
                      (p as any).siswa?.nis ||
                      '-';
                    const kelas =
                      p.Siswa?.Kelas?.nama_kelas ||
                      (p as any).siswa?.Kelas?.nama_kelas ||
                      (p as any).kelas_nama ||
                      '-';

                    const isPresent =
                      Boolean(signatureImg) ||
                      p.status === 'IN_PROGRESS' ||
                      p.status === 'FINISHED' ||
                      p.status === 'DISQUALIFIED';

                    const statusLabel =
                      p.status === 'FINISHED'
                        ? 'SELESAI'
                        : p.status === 'IN_PROGRESS'
                        ? 'MENGERJAKAN'
                        : p.status === 'DISQUALIFIED'
                        ? 'DISKUALIFIKASI'
                        : isPresent
                        ? 'HADIR'
                        : 'BELUM';

                    return (
                      <tr key={p.id || idx} className="border-b border-black/80">
                        <td className="border border-black py-1 px-1 text-center font-mono">{idx + 1}</td>
                        <td className="border border-black py-1 px-2 text-center font-mono text-[9.5px]">
                          {nisn}
                        </td>
                        <td className="border border-black py-1 px-2 font-medium">
                          <span className="font-semibold">{namaSiswa}</span>
                        </td>
                        <td className="border border-black py-1 px-1 text-center font-medium">{kelas}</td>
                        <td className="border border-black py-1 px-1 text-center font-mono text-[9px]">
                          {waktuFormatted !== '-' ? `${waktuFormatted} ${tz}` : '-'}
                        </td>
                        <td className="border border-black py-1 px-1 text-center font-bold text-[8.5px]">
                          {statusLabel}
                        </td>
                        <td className="border border-black py-0.5 px-1 text-center align-middle h-9 w-28">
                          {signatureImg ? (
                            <div className="flex flex-col items-center justify-center">
                              <img
                                src={signatureImg}
                                alt={`TTD ${namaSiswa}`}
                                className="h-7 max-w-[85px] object-contain filter contrast-125"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[9px] select-none italic">
                              ........................
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. REKAPITULASI KEHADIRAN (RINGKAS) */}
          <div className="flex items-center justify-between text-[10px] text-black font-semibold my-2 px-1">
            <div className="flex items-center gap-4">
              <span>
                Total Terdaftar: <strong>{stats.total} Siswa</strong>
              </span>
              <span>
                Hadir (Bertanda Tangan): <strong>{stats.signed} Siswa</strong>
              </span>
              <span>
                Belum Hadir: <strong>{stats.absent} Siswa</strong>
              </span>
            </div>
            <div className="text-[9px] text-slate-500 italic">
              *Tanda tangan dibubuhkan secara digital saat siswa mengonfirmasi kehadiran & pakta integritas.
            </div>
          </div>

          {/* 6. TANDA TANGAN PEJABAT PENGAWAS & PROKTOR */}
          <div className="mt-5 pt-2 w-full">
            {proktorNama.trim() ? (
              <UniversalDocumentSignatures
                layout="triangle_rapor"
                titimangsaCity={kotaSekolah}
                titimangsaDate={tanggalTitimangsa}
                overrideSignerLeft={{
                  roleTitle: 'Proktor Ruang Ujian,',
                  personName: proktorNama,
                  nip: proktorNip,
                  signatureImage: proktorSignature,
                }}
                overrideSignerRight={{
                  roleTitle: 'Pengawas Ruang Ujian,',
                  personName: pengawas1Nama,
                  nip: pengawas1Nip,
                  signatureImage: pengawas1Signature,
                }}
                overrideSignerCenter={{
                  roleTitle: 'Mengetahui,\nKepala Sekolah',
                  personName: kepsekNama,
                  nip: kepsekNip,
                }}
                spacingHeightMm={14}
              />
            ) : (
              <UniversalDocumentSignatures
                layout="dual_column"
                titimangsaCity={kotaSekolah}
                titimangsaDate={tanggalTitimangsa}
                overrideSignerLeft={{
                  roleTitle: 'Mengetahui,\nKepala Sekolah',
                  personName: kepsekNama,
                  nip: kepsekNip,
                }}
                overrideSignerRight={{
                  roleTitle: 'Pengawas Ruang Ujian,',
                  personName: pengawas1Nama,
                  nip: pengawas1Nip,
                  signatureImage: pengawas1Signature,
                }}
                spacingHeightMm={14}
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
        subtitle={`Sesi: ${jadwal.nama_sesi || 'Ujian CBT'} • Ruang: ${ruangUjian}`}
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

export default CbtDaftarHadirPrintModal;
