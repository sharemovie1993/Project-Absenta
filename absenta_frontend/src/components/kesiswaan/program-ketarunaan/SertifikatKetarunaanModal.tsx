import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Printer,
  Download,
  X,
  FileText,
  Layers,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Building2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PrintHeader, SendDocumentWaButton } from '@/components/ui/PrintHeader';
import { getMyTenant } from '@/api/tenants.api';
import { useAuthStore } from '@/store/authStore';
import {
  generateSertifikatKetarunaanPdf,
  formatTanggalIndonesia,
  getPredikatHuruf,
  getPredikatLabel,
  SertifikatKetarunaanPrintData,
} from '@/utils/print/modules/pdfSertifikatKetarunaan';
import { resolveCoverImageBase64 } from '@/utils/print/rapor/raporShared';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { KetarunaanNilaiStudent, KetarunaanSkema } from '@/api/kesiswaan/programKetarunaan.api';
import { toast } from 'sonner';

export interface SertifikatKetarunaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: KetarunaanNilaiStudent | null;
  skema: KetarunaanSkema | null;
  kelasNama?: string;
  jurusanNama?: string;
  tahunPelajaran?: string;
  semester?: string;
}

export const SertifikatKetarunaanModal: React.FC<SertifikatKetarunaanModalProps> = React.memo(({
  isOpen,
  onClose,
  student,
  skema,
  kelasNama,
  jurusanNama,
  tahunPelajaran,
  semester,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FRONT' | 'BACK'>('ALL');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Tenant Query for Official Kop Surat
  const { user } = useAuthStore();
  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: isOpen && !!user?.tenant_id,
  });

  const tenantData = (tenantRes as any)?.data || tenantRes || user?.tenant;

  const tenantInfoForKop = useMemo(() => {
    return {
      name: tenantData?.name || 'SMK NEGERI 1 PLERED',
      logo_url: tenantData?.logo_url || undefined,
      logo_daerah_url: tenantData?.logo_daerah_url || undefined,
      address: tenantData?.address || 'Jl. Raya Rawasari Kec. Plered Kab. Purwakarta',
      phone: tenantData?.phone || '(0264) 7504001',
      email: tenantData?.email || 'smkn1plered@gmail.com',
      website: tenantData?.website || 'smkn1plered.sch.id',
      nama_dinas_atas: tenantData?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      nama_dinas_bawah: tenantData?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
      nama_cabang_dinas: tenantData?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
      kode_pos: tenantData?.kode_pos || '41162',
      print_header_lines: tenantData?.print_header_lines || undefined,
    };
  }, [tenantData]);

  // Structured Certificate Data
  const certData: SertifikatKetarunaanPrintData = useMemo(() => {
    const s = student;
    const samapta = s?.nilai_samapta ?? 0;
    const pbb = s?.nilai_pbb ?? 0;
    const disiplin = s?.nilai_disiplin ?? s?.presensi?.rekomendasi_disiplin ?? 0;
    const mental = s?.nilai_mental ?? s?.presensi?.rekomendasi_mental ?? 0;

    const bSamapta = skema?.bobot_samapta ?? 25;
    const bPbb = skema?.bobot_pbb ?? 20;
    const bDisiplin = skema?.bobot_disiplin ?? 30;
    const bMental = skema?.bobot_mental ?? 25;

    const rawFinal = (samapta * bSamapta + pbb * bPbb + disiplin * bDisiplin + mental * bMental) / 100;
    const finalScore = s?.nilai_akhir || Math.round(rawFinal * 10) / 10;
    const finalPredikat = s?.predikat && s.predikat !== '-' ? s.predikat : getPredikatHuruf(finalScore);

    const tempat = tenantData?.city || tenantData?.kabupaten || 'Purwakarta';
    const tanggalFormat = formatTanggalIndonesia(new Date());

    return {
      nomor_sertifikat: `421.5/KETARUNAAN/${new Date().getFullYear()}/${s?.nis || '001'}`,
      tanggal_terbit: `${tempat}, ${tanggalFormat}`,
      tempat_terbit: tempat,
      mode_pelatihan: skema?.mode_pelatihan || 'SEMI_TARUNA',
      tahun_pelajaran: tahunPelajaran || '2026/2027',
      semester: semester || 'Ganjil',
      sekolah: {
        nama: tenantData?.name || 'SMK NEGERI 1 PLERED',
        alamat: tenantData?.address || 'Jl. Raya Rawasari Kec. Plered',
        kota: tempat,
        kode_pos: tenantData?.kode_pos || '41162',
        telepon: tenantData?.phone || '(0264) 7504001',
        email: tenantData?.email || 'smkn1plered@gmail.com',
        website: tenantData?.website || 'smkn1plered.sch.id',
        kepala_sekolah: tenantData?.headmaster_name || 'Wahyu Tamimbarkah, S.Pd.',
        nip_kepala: tenantData?.headmaster_nip || '197111022008011001',
        logo_url: tenantData?.logo_url,
        logo_daerah: tenantData?.logo_daerah_url,
        nama_dinas_atas: tenantData?.nama_dinas_atas,
        nama_dinas_bawah: tenantData?.nama_dinas_bawah,
        nama_cabang_dinas: tenantData?.nama_cabang_dinas,
        print_header_lines: tenantData?.print_header_lines,
      },
      siswa: {
        id: s?.siswa_id || '',
        nama_siswa: s?.nama_siswa || 'TARUNA ABSENTA',
        nis: s?.nis || '-',
        nisn: s?.nisn || '-',
        jenis_kelamin: s?.jenis_kelamin || 'L',
        nama_kelas: kelasNama || 'X AKL 1',
        jurusan_nama: jurusanNama || 'Akuntansi dan Keuangan Lembaga',
      },
      penilaian: {
        nilai_samapta: samapta,
        nilai_pbb: pbb,
        nilai_disiplin: disiplin,
        nilai_mental: mental,
        nilai_akhir: finalScore,
        predikat: finalPredikat,
        deskripsi_rapor: s?.deskripsi_rapor || '',
        bobot_samapta: bSamapta,
        bobot_pbb: bPbb,
        bobot_disiplin: bDisiplin,
        bobot_mental: bMental,
      },
      presensi_summary: s?.presensi
        ? {
            total_sesi_terlaksana: (s.presensi.total_sesi_disiplin || 0) + (s.presensi.total_sesi_duha || 0),
            hadir_disiplin: s.presensi.hadir_disiplin,
            total_sesi_disiplin: s.presensi.total_sesi_disiplin,
            persen_disiplin: s.presensi.persen_disiplin,
            hadir_duha: s.presensi.hadir_duha,
            total_sesi_duha: s.presensi.total_sesi_duha,
            persen_duha: s.presensi.persen_duha,
            terlambat_count: s.presensi.terlambat_count,
          }
        : undefined,
      signatories: {
        master_training_nama: 'Sertu Dani Ramdani',
        master_training_nip: '31080234190488',
        pembina_nama: user?.name || 'Asep Suryadi, S.Pd.',
        pembina_nip: '198504122011011003',
        kepsek_nama: tenantData?.headmaster_name || 'Wahyu Tamimbarkah, S.Pd.',
        kepsek_nip: tenantData?.headmaster_nip || '197111022008011001',
        ketua_pelaksana_nama: 'H. Ahmad Syarifudin, M.Pd.',
        ketua_pelaksana_nip: '197608142005011002',
      },
    };
  }, [student, skema, kelasNama, jurusanNama, tahunPelajaran, semester, tenantData, user]);

  const buildDoc = async () => {
    const pdfMode = activeTab === 'FRONT' ? 'front_only' : activeTab === 'BACK' ? 'back_only' : 'all';
    const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
      resolveCoverImageBase64(tenantInfoForKop.logo_daerah_url),
      resolveCoverImageBase64(tenantInfoForKop.logo_url),
    ]);

    return generateSertifikatKetarunaanPdf(certData, {
      mode: pdfMode,
      logoDaerahBase64,
      logoSekolahBase64,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const doc = await buildDoc();
      const filename = `Sertifikat_Ketarunaan_${certData.siswa.nama_siswa.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success('File PDF Sertifikat berhasil diunduh!');
    } catch (e: any) {
      console.error('Download PDF error:', e);
      toast.error('Gagal membuat file PDF sertifikat: ' + (e?.message || 'Error'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* ── Top Modal Navigation Bar ─────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Award size={22} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              Sertifikat Kelulusan Program Ketarunaan
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {certData.nomor_sertifikat}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {certData.siswa.nama_siswa} • NIS: {certData.siswa.nis} • {certData.siswa.nama_kelas}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 inline mr-1.5" />
            Semua Halaman (2 Hal)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FRONT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'FRONT'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Halaman Depan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BACK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BACK'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
            Halaman Belakang (Transkrip)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="rounded-xl text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-cyan-400" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            )}
            Unduh PDF
          </Button>

          <SendDocumentWaButton
            onGenerateWaPdf={async () => {
              const doc = await buildDoc();
              return {
                blob: doc.output('blob'),
                fileName: `Sertifikat_Ketarunaan_${certData.siswa.nama_siswa.replace(/\s+/g, '_')}.pdf`,
              };
            }}
            defaultFileName={`Sertifikat_Ketarunaan_${certData.siswa.nama_siswa.replace(/\s+/g, '_')}.pdf`}
            defaultCaption={`Selamat, terlampir Sertifikat Program Ketarunaan atas nama ${certData.siswa.nama_siswa}.`}
            className="rounded-xl"
          />

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Cetak Dokumen
          </Button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Pratinjau Sertifikat"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Main Preview Workspace (Scrollable) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center gap-8">
        {/* ========================================================================= */}
        {/* HALAMAN 1: DEPAN (SERTIFIKAT KETARUNAAN A4 LANDSCAPE)                     */}
        {/* ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'FRONT') && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Halaman 1: Depan (Sertifikat Kelulusan Program Ketarunaan)
            </span>

            <div className="w-[1050px] min-h-[742px] bg-white text-slate-900 p-10 shadow-2xl rounded-none border-2 border-slate-800 flex flex-col justify-between font-serif relative box-border overflow-hidden">
              {/* Dynamic Cyan Geometric Accents */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-cyan-500 to-sky-600 -rotate-45 translate-x-20 -translate-y-20 opacity-90 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-600 to-slate-900 -rotate-45 -translate-x-16 translate-y-16 opacity-80 pointer-events-none" />

              {/* Kop Surat Resmi */}
              <div className="w-full mb-2 relative z-10">
                <PrintHeader variant="landscape" tenantInfo={tenantInfoForKop} />
              </div>

              {/* Title & Banner */}
              <div className="text-center my-2 font-serif relative z-10">
                <div className="inline-block bg-slate-900 text-cyan-400 font-sans text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full mb-2 shadow-sm">
                  EKOSISTEM PENDIDIKAN KARAKTER BANGSA
                </div>
                <h1 className="text-[26px] font-black uppercase tracking-wider text-slate-950 font-sans">
                  S E R T I F I K A T
                </h1>
                <div className="text-[13px] font-bold text-cyan-700 dark:text-cyan-600 tracking-wide uppercase mt-0.5">
                  {certData.mode_pelatihan === 'FULL_TARUNA'
                    ? 'PENDIDIKAN & PEMBINAAN MURNI KETARUNAAN'
                    : 'PENDIDIKAN KARAKTER & PEMBINAAN KETARUNAAN'}
                </div>
                <p className="text-[11px] font-sans text-slate-600 mt-1">
                  Nomor : {certData.nomor_sertifikat}
                </p>
              </div>

              {/* Recipient Intro & Big Student Name */}
              <div className="text-center my-3 relative z-10 font-sans">
                <p className="text-xs text-slate-600 italic">Diberikan Kepada :</p>
                <div className="text-[24px] font-black uppercase text-slate-950 tracking-wide mt-1 underline decoration-cyan-500 decoration-2 underline-offset-8">
                  {certData.siswa.nama_siswa}
                </div>
                <p className="text-xs text-slate-600 mt-3 font-medium">
                  NIS: <strong>{certData.siswa.nis}</strong> • NISN: <strong>{certData.siswa.nisn}</strong> • Kelas: <strong>{certData.siswa.nama_kelas}</strong>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kompetensi Keahlian: <strong>{certData.siswa.jurusan_nama}</strong>
                </p>
              </div>

              {/* Certification Statement */}
              <div className="text-center max-w-3xl mx-auto my-2 text-[12px] font-sans text-slate-800 leading-relaxed relative z-10">
                Telah mengikuti serta dinyatakan <strong>LULUS</strong> dalam seluruh rangkaian
                <strong> Pelatihan Kesamaptaan Jasmani, Baris-Berbaris (PBB), Pembiasaan Karakter &amp; Kedisiplinan 5 Siklus </strong>
                Tahun Pelajaran {certData.tahun_pelajaran} dengan perolehan predikat mutu:
                <div className="mt-1.5 inline-block px-4 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-sm">
                  {getPredikatLabel(certData.penilaian.predikat)} ({certData.penilaian.nilai_akhir || 0})
                </div>
              </div>

              {/* 4 Signatures Grid */}
              <div className="grid grid-cols-4 gap-4 pt-6 pb-2 text-center font-sans text-[11px] relative z-10">
                {/* 1. Master of Training */}
                <div className="flex flex-col justify-between h-28">
                  <div>
                    <p className="font-semibold text-slate-700">Master of Training,</p>
                    <p className="text-[10px] text-slate-500">Instruktur Lapangan</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-950">{certData.signatories?.master_training_nama}</p>
                    <p className="text-[10px] text-slate-600">NRP. {certData.signatories?.master_training_nip}</p>
                  </div>
                </div>

                {/* 2. Pembina Ketarunaan */}
                <div className="flex flex-col justify-between h-28">
                  <div>
                    <p className="font-semibold text-slate-700">Pembina Ketarunaan,</p>
                    <p className="text-[10px] text-slate-500">Kesiswaan</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-950">{certData.signatories?.pembina_nama}</p>
                    <p className="text-[10px] text-slate-600">NIP. {certData.signatories?.pembina_nip}</p>
                  </div>
                </div>

                {/* 3. Ketua Pelaksana */}
                <div className="flex flex-col justify-between h-28">
                  <div>
                    <p className="font-semibold text-slate-700">Ketua Pelaksana,</p>
                    <p className="text-[10px] text-slate-500">Pendidikan Karakter</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-950">{certData.signatories?.ketua_pelaksana_nama}</p>
                    <p className="text-[10px] text-slate-600">NIP. {certData.signatories?.ketua_pelaksana_nip}</p>
                  </div>
                </div>

                {/* 4. Kepala Sekolah */}
                <div className="flex flex-col justify-between h-28">
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">{certData.tanggal_terbit}</p>
                    <p className="font-semibold text-slate-700">Kepala Sekolah,</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-950">{certData.signatories?.kepsek_nama}</p>
                    <p className="text-[10px] text-slate-600">NIP. {certData.signatories?.kepsek_nip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HALAMAN 2: BELAKANG (TRANSKRIP CAPAIAN 4 PILAR KETARUNAAN)                 */}
        {/* ========================================================================= */}
        {(activeTab === 'ALL' || activeTab === 'BACK') && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Halaman 2: Belakang (Transkrip Capaian 4 Pilar Ketarunaan)
            </span>

            <div className="w-[1050px] min-h-[742px] bg-white text-slate-900 p-10 shadow-2xl rounded-none border-2 border-slate-800 flex flex-col justify-between font-serif relative box-border">
              <div>
                {/* Header Title */}
                <div className="text-center my-1 font-serif">
                  <h1 className="text-[18px] font-black uppercase tracking-wider text-slate-950">
                    TRANSKRIP CAPAIAN DAN DAFTAR NILAI KETARUNAAN
                  </h1>
                  <p className="text-[11px] font-sans text-slate-500">
                    Lampiran Sertifikat Nomor : {certData.nomor_sertifikat}
                  </p>
                </div>

                {/* Student Identity Grid */}
                <div className="grid grid-cols-2 gap-x-8 text-[11px] font-sans my-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="w-28 text-slate-600">Nama Taruna</span>
                      <span>:</span>
                      <strong className="text-slate-950 uppercase">{certData.siswa.nama_siswa}</strong>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28 text-slate-600">NIS / NISN</span>
                      <span>:</span>
                      <span className="font-mono">{certData.siswa.nis} / {certData.siswa.nisn}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="w-28 text-slate-600">Kelas / Jurusan</span>
                      <span>:</span>
                      <span>{certData.siswa.nama_kelas} - {certData.siswa.jurusan_nama}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28 text-slate-600">Tahun Pelajaran</span>
                      <span>:</span>
                      <span>{certData.tahun_pelajaran} (Semester {certData.semester})</span>
                    </div>
                  </div>
                </div>

                {/* 4 Pillars Assessment Table */}
                <div className="border border-slate-950 overflow-hidden my-3">
                  <table className="w-full text-left font-sans text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-950 font-bold text-center">
                        <th className="w-12 p-2 border-r border-slate-950">NO</th>
                        <th className="p-2 border-r border-slate-950 text-left">ASPEK PENILAIAN &amp; KOMPONEN UJI</th>
                        <th className="w-20 p-2 border-r border-slate-950">BOBOT</th>
                        <th className="w-20 p-2 border-r border-slate-950">ANGKA</th>
                        <th className="w-20 p-2 border-r border-slate-950">HURUF</th>
                        <th className="w-32 p-2">KATEGORI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {/* 1. Samapta */}
                      <tr>
                        <td className="p-2 text-center font-bold border-r border-slate-950">1</td>
                        <td className="p-2 border-r border-slate-950">
                          <div className="font-bold text-slate-900">KESAMAPTAAN JASMANI (SAMAPTA)</div>
                          <div className="text-[10px] text-slate-500">Lari 12 Menit, Push-up, Sit-up, &amp; Shuttle Run</div>
                        </td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{certData.penilaian.bobot_samapta}%</td>
                        <td className="p-2 text-center font-bold font-mono border-r border-slate-950">{certData.penilaian.nilai_samapta}</td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{getPredikatHuruf(certData.penilaian.nilai_samapta)}</td>
                        <td className="p-2 text-center font-semibold">{getPredikatLabel(certData.penilaian.nilai_samapta)}</td>
                      </tr>

                      {/* 2. PBB */}
                      <tr>
                        <td className="p-2 text-center font-bold border-r border-slate-950">2</td>
                        <td className="p-2 border-r border-slate-950">
                          <div className="font-bold text-slate-900">PERATURAN BARIS-BERBARIS (PBB)</div>
                          <div className="text-[10px] text-slate-500">PBB di Tempat, Langkah Tegap, Defile, &amp; Penghormatan</div>
                        </td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{certData.penilaian.bobot_pbb}%</td>
                        <td className="p-2 text-center font-bold font-mono border-r border-slate-950">{certData.penilaian.nilai_pbb}</td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{getPredikatHuruf(certData.penilaian.nilai_pbb)}</td>
                        <td className="p-2 text-center font-semibold">{getPredikatLabel(certData.penilaian.nilai_pbb)}</td>
                      </tr>

                      {/* 3. Disiplin */}
                      <tr>
                        <td className="p-2 text-center font-bold border-r border-slate-950">3</td>
                        <td className="p-2 border-r border-slate-950">
                          <div className="font-bold text-slate-900">KEDISIPLINAN TARUNA (PRESENSI 5 SIKLUS)</div>
                          <div className="text-[10px] text-slate-500">
                            Presensi Upacara, Latihan Ketarunaan, Apel Sore, &amp; Atribut
                            {certData.presensi_summary && (
                              <span className="text-cyan-700 font-medium"> • Riil: {certData.presensi_summary.hadir_disiplin}/{certData.presensi_summary.total_sesi_disiplin} Sesi ({certData.presensi_summary.persen_disiplin}%)</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{certData.penilaian.bobot_disiplin}%</td>
                        <td className="p-2 text-center font-bold font-mono border-r border-slate-950">{certData.penilaian.nilai_disiplin}</td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{getPredikatHuruf(certData.penilaian.nilai_disiplin)}</td>
                        <td className="p-2 text-center font-semibold">{getPredikatLabel(certData.penilaian.nilai_disiplin)}</td>
                      </tr>

                      {/* 4. Mental */}
                      <tr>
                        <td className="p-2 text-center font-bold border-r border-slate-950">4</td>
                        <td className="p-2 border-r border-slate-950">
                          <div className="font-bold text-slate-900">MENTAL, KARAKTER &amp; SPIRITUAL</div>
                          <div className="text-[10px] text-slate-500">
                            Pembiasaan Ibadah Dhuha Jum'at Pagi, Jiwa Korsa, &amp; Etos Kerja 5R
                            {certData.presensi_summary && certData.presensi_summary.total_sesi_duha > 0 && (
                              <span className="text-emerald-700 font-medium"> • Dhuha: {certData.presensi_summary.hadir_duha}/{certData.presensi_summary.total_sesi_duha} Sesi ({certData.presensi_summary.persen_duha}%)</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{certData.penilaian.bobot_mental}%</td>
                        <td className="p-2 text-center font-bold font-mono border-r border-slate-950">{certData.penilaian.nilai_mental}</td>
                        <td className="p-2 text-center font-bold border-r border-slate-950">{getPredikatHuruf(certData.penilaian.nilai_mental)}</td>
                        <td className="p-2 text-center font-semibold">{getPredikatLabel(certData.penilaian.nilai_mental)}</td>
                      </tr>

                      {/* Total / Nilai Akhir */}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-950">
                        <td colSpan={2} className="p-2.5 text-center border-r border-slate-950">
                          NILAI AKHIR KOMPOSIT (RATA-RATA BERBOBOT)
                        </td>
                        <td className="p-2.5 text-center border-r border-slate-950">100%</td>
                        <td className="p-2.5 text-center font-mono text-sm border-r border-slate-950 text-cyan-800">
                          {certData.penilaian.nilai_akhir}
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-950 text-cyan-800">
                          {certData.penilaian.predikat}
                        </td>
                        <td className="p-2.5 text-center font-extrabold text-cyan-800">
                          {getPredikatLabel(certData.penilaian.predikat)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Narrative Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-2 text-[11px] font-sans">
                  <div className="font-bold text-slate-800 mb-1">Catatan Capaian Kokurikuler Rapor:</div>
                  <p className="text-slate-600 italic leading-relaxed">
                    "{certData.penilaian.deskripsi_rapor || 'Menunjukkan komitmen kedisiplinan dan kebugaran jasmani yang baik sesuai standar program ketarunaan sekolah.'}"
                  </p>
                </div>
              </div>

              {/* Bottom Dual-Signatures (Instruktur & Pembina) */}
              <div className="flex items-end justify-between pt-4 font-sans text-[11px]">
                <div className="text-center w-64">
                  <p className="font-semibold text-slate-700">Instruktur / Pelatih Jasmani,</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-950">{certData.signatories?.master_training_nama}</p>
                  <p className="text-[10px] text-slate-600">NRP. {certData.signatories?.master_training_nip}</p>
                </div>

                <div className="text-center w-64">
                  <p className="text-[10px] text-slate-500 mb-0.5">{certData.tanggal_terbit}</p>
                  <p className="font-semibold text-slate-700">Pembina Ketarunaan,</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-950">{certData.signatories?.pembina_nama}</p>
                  <p className="text-[10px] text-slate-600">NIP. {certData.signatories?.pembina_nip}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DIRECT PRINT PORTAL WITH EXACT A4 LANDSCAPE MEDIA RULES                     */}
      {/* ========================================================================= */}
      {createPortal(
        <div id="print-sertifikat-ketarunaan-portal" className="hidden">
          {/* HALAMAN 1 DEPAN */}
          <div className="sertifikat-print-page w-[297mm] h-[210mm] p-[12mm_15mm] box-border flex flex-col justify-between font-serif bg-white text-black relative">
            <div className="w-full mb-1">
              <PrintHeader variant="landscape" tenantInfo={tenantInfoForKop} />
            </div>

            <div className="text-center my-2 font-serif">
              <h1 className="text-[20pt] font-black uppercase tracking-wider text-black font-sans">
                S E R T I F I K A T
              </h1>
              <p className="text-[10pt] font-bold uppercase text-black">
                {certData.mode_pelatihan === 'FULL_TARUNA' ? 'PENDIDIKAN & PEMBINAAN MURNI KETARUNAAN' : 'PENDIDIKAN KARAKTER & KETARUNAAN'}
              </p>
              <p className="text-[9pt] font-sans text-black">Nomor : {certData.nomor_sertifikat}</p>
            </div>

            <div className="text-center my-2 font-sans">
              <p className="text-[9pt] italic">Diberikan Kepada :</p>
              <h2 className="text-[18pt] font-black uppercase text-black tracking-wide underline underline-offset-4">
                {certData.siswa.nama_siswa}
              </h2>
              <p className="text-[9.5pt] mt-2">
                NIS: {certData.siswa.nis} • NISN: {certData.siswa.nisn} • Kelas: {certData.siswa.nama_kelas}
              </p>
              <p className="text-[9pt]">Kompetensi Keahlian: {certData.siswa.jurusan_nama}</p>
            </div>

            <div className="text-center max-w-2xl mx-auto my-1 text-[9.5pt] font-sans leading-relaxed">
              Telah mengikuti serta dinyatakan <strong>LULUS</strong> dalam seluruh rangkaian
              <strong> Pelatihan Kesamaptaan Jasmani, Baris-Berbaris (PBB), Pembiasaan Karakter &amp; Kedisiplinan 5 Siklus </strong>
              Tahun Pelajaran {certData.tahun_pelajaran} dengan perolehan predikat: <strong>{getPredikatLabel(certData.penilaian.predikat)} ({certData.penilaian.nilai_akhir})</strong>.
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4 text-center font-sans text-[9pt]">
              <div>
                <p>Master of Training,</p>
                <div className="h-[18mm]" />
                <p className="font-bold underline">{certData.signatories?.master_training_nama}</p>
                <p className="text-[8pt]">NRP. {certData.signatories?.master_training_nip}</p>
              </div>
              <div>
                <p>Pembina Ketarunaan,</p>
                <div className="h-[18mm]" />
                <p className="font-bold underline">{certData.signatories?.pembina_nama}</p>
                <p className="text-[8pt]">NIP. {certData.signatories?.pembina_nip}</p>
              </div>
              <div>
                <p>Ketua Pelaksana,</p>
                <div className="h-[18mm]" />
                <p className="font-bold underline">{certData.signatories?.ketua_pelaksana_nama}</p>
                <p className="text-[8pt]">NIP. {certData.signatories?.ketua_pelaksana_nip}</p>
              </div>
              <div>
                <p className="text-[8pt]">{certData.tanggal_terbit}</p>
                <p>Kepala Sekolah,</p>
                <div className="h-[16mm]" />
                <p className="font-bold underline">{certData.signatories?.kepsek_nama}</p>
                <p className="text-[8pt]">NIP. {certData.signatories?.kepsek_nip}</p>
              </div>
            </div>
          </div>

          {/* PAGE BREAK UNTUK HALAMAN 2 */}
          <div className="page-break" style={{ pageBreakAfter: 'always' }} />

          {/* HALAMAN 2 BELAKANG */}
          <div className="sertifikat-print-page w-[297mm] h-[210mm] p-[10mm_15mm] box-border flex flex-col justify-between font-serif bg-white text-black">
            <div>
              <div className="text-center my-1 font-serif">
                <h1 className="text-[13pt] font-black uppercase">TRANSKRIP CAPAIAN DAN DAFTAR NILAI KETARUNAAN</h1>
                <p className="text-[8.5pt] font-sans">Lampiran Sertifikat Nomor : {certData.nomor_sertifikat}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[9pt] font-sans my-2 border border-black p-2">
                <div>
                  <p>Nama Taruna : <strong>{certData.siswa.nama_siswa}</strong></p>
                  <p>NIS / NISN   : {certData.siswa.nis} / {certData.siswa.nisn}</p>
                </div>
                <div>
                  <p>Kelas / Jurusan : {certData.siswa.nama_kelas} - {certData.siswa.jurusan_nama}</p>
                  <p>Tahun Pelajaran : {certData.tahun_pelajaran} (Semester {certData.semester})</p>
                </div>
              </div>

              <table className="w-full text-left font-sans text-[8.5pt] border-collapse border border-black my-2">
                <thead>
                  <tr className="border-b border-black text-center font-bold">
                    <th className="w-8 p-1 border-r border-black">NO</th>
                    <th className="p-1 border-r border-black text-left">ASPEK PENILAIAN</th>
                    <th className="w-16 p-1 border-r border-black">BOBOT</th>
                    <th className="w-16 p-1 border-r border-black">ANGKA</th>
                    <th className="w-16 p-1 border-r border-black">HURUF</th>
                    <th className="w-24 p-1">PREDIKAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  <tr>
                    <td className="p-1 text-center border-r border-black font-bold">1</td>
                    <td className="p-1 border-r border-black">KESAMAPTAAN JASMANI (SAMAPTA)</td>
                    <td className="p-1 text-center border-r border-black">{certData.penilaian.bobot_samapta}%</td>
                    <td className="p-1 text-center font-bold border-r border-black">{certData.penilaian.nilai_samapta}</td>
                    <td className="p-1 text-center border-r border-black">{getPredikatHuruf(certData.penilaian.nilai_samapta)}</td>
                    <td className="p-1 text-center">{getPredikatLabel(certData.penilaian.nilai_samapta)}</td>
                  </tr>
                  <tr>
                    <td className="p-1 text-center border-r border-black font-bold">2</td>
                    <td className="p-1 border-r border-black">PERATURAN BARIS-BERBARIS (PBB)</td>
                    <td className="p-1 text-center border-r border-black">{certData.penilaian.bobot_pbb}%</td>
                    <td className="p-1 text-center font-bold border-r border-black">{certData.penilaian.nilai_pbb}</td>
                    <td className="p-1 text-center border-r border-black">{getPredikatHuruf(certData.penilaian.nilai_pbb)}</td>
                    <td className="p-1 text-center">{getPredikatLabel(certData.penilaian.nilai_pbb)}</td>
                  </tr>
                  <tr>
                    <td className="p-1 text-center border-r border-black font-bold">3</td>
                    <td className="p-1 border-r border-black">KEDISIPLINAN TARUNA (PRESENSI 5 SIKLUS)</td>
                    <td className="p-1 text-center border-r border-black">{certData.penilaian.bobot_disiplin}%</td>
                    <td className="p-1 text-center font-bold border-r border-black">{certData.penilaian.nilai_disiplin}</td>
                    <td className="p-1 text-center border-r border-black">{getPredikatHuruf(certData.penilaian.nilai_disiplin)}</td>
                    <td className="p-1 text-center">{getPredikatLabel(certData.penilaian.nilai_disiplin)}</td>
                  </tr>
                  <tr>
                    <td className="p-1 text-center border-r border-black font-bold">4</td>
                    <td className="p-1 border-r border-black">MENTAL, KARAKTER &amp; SPIRITUAL</td>
                    <td className="p-1 text-center border-r border-black">{certData.penilaian.bobot_mental}%</td>
                    <td className="p-1 text-center font-bold border-r border-black">{certData.penilaian.nilai_mental}</td>
                    <td className="p-1 text-center border-r border-black">{getPredikatHuruf(certData.penilaian.nilai_mental)}</td>
                    <td className="p-1 text-center">{getPredikatLabel(certData.penilaian.nilai_mental)}</td>
                  </tr>
                  <tr className="font-bold border-t-2 border-black">
                    <td colSpan={2} className="p-1 text-center border-r border-black">NILAI AKHIR KOMPOSIT</td>
                    <td className="p-1 text-center border-r border-black">100%</td>
                    <td className="p-1 text-center border-r border-black">{certData.penilaian.nilai_akhir}</td>
                    <td className="p-1 text-center border-r border-black">{certData.penilaian.predikat}</td>
                    <td className="p-1 text-center">{getPredikatLabel(certData.penilaian.predikat)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-black p-2 my-2 text-[8pt] font-sans">
                <strong>Catatan Rapor Kokurikuler:</strong>
                <p className="italic">{certData.penilaian.deskripsi_rapor}</p>
              </div>
            </div>

            <div className="flex items-end justify-between pt-2 font-sans text-[8.5pt]">
              <div className="text-center w-52">
                <p>Instruktur / Pelatih Jasmani,</p>
                <div className="h-[14mm]" />
                <p className="font-bold underline">{certData.signatories?.master_training_nama}</p>
                <p className="text-[7.5pt]">NRP. {certData.signatories?.master_training_nip}</p>
              </div>
              <div className="text-center w-52">
                <p>{certData.tanggal_terbit}</p>
                <p>Pembina Ketarunaan,</p>
                <div className="h-[14mm]" />
                <p className="font-bold underline">{certData.signatories?.pembina_nama}</p>
                <p className="text-[7.5pt]">NIP. {certData.signatories?.pembina_nip}</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
