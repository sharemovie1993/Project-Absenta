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
  Loader2 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { PrintHeader } from '../ui/PrintHeader';
import { hubinApi } from '../../api/hubin.api';
import { getMyTenant } from '../../api/tenants.api';
import { useAuthStore } from '../../store/authStore';
import { 
  generateSertifikatPdf, 
  formatTanggalIndonesia, 
  getPredikatHuruf, 
  getPredikatLabel, 
  SertifikatPklPrintData 
} from '../../utils/print/modules/pdfSertifikatPkl';
import { toast } from 'sonner';

// Logo Lambang Jawa Barat SVG
const JabarLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-20' }) => (
  <svg viewBox="0 0 100 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Perisai Luar Hijau */}
    <path 
      d="M50 5 C75 5, 92 18, 92 48 C92 82, 68 108, 50 115 C32 108, 8 82, 8 48 C8 18, 25 5, 50 5 Z" 
      fill="#057835" 
      stroke="#FFD700" 
      strokeWidth="4" 
    />
    {/* Kujang Emas di Tengah Atas */}
    <path 
      d="M50 18 C52 24, 55 35, 50 50 C46 38, 48 24, 50 18 Z" 
      fill="#FFD700" 
      stroke="#B8860B" 
      strokeWidth="1.5"
    />
    <circle cx="50" cy="30" r="3" fill="#FFFFFF" />
    {/* Padi dan Kapas Lingkar */}
    <path 
      d="M30 45 C30 25, 45 20, 50 20 C55 20, 70 25, 70 45 C70 65, 55 75, 50 75 C45 75, 30 65, 30 45 Z" 
      stroke="#FFD700" 
      strokeWidth="2" 
      strokeDasharray="3,3"
      fill="none" 
    />
    {/* Papan Catur / Dam Biru Putih Bawah */}
    <path 
      d="M20 78 C30 92, 42 98, 50 100 C58 98, 70 92, 80 78 Z" 
      fill="#002D62" 
    />
    <rect x="28" y="80" width="8" height="6" fill="#FFFFFF" />
    <rect x="44" y="80" width="8" height="6" fill="#FFFFFF" />
    <rect x="60" y="80" width="8" height="6" fill="#FFFFFF" />
    <rect x="36" y="86" width="8" height="6" fill="#FFFFFF" />
    <rect x="52" y="86" width="8" height="6" fill="#FFFFFF" />
    {/* Pita Kuning Bawah */}
    <path 
      d="M15 102 C30 112, 70 112, 85 102 C80 115, 20 115, 15 102 Z" 
      fill="#FFD700" 
      stroke="#B8860B" 
      strokeWidth="1"
    />
  </svg>
);

const DEFAULT_JABAR_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 C75 5, 92 18, 92 48 C92 82, 68 108, 50 115 C32 108, 8 82, 8 48 C8 18, 25 5, 50 5 Z" fill="#057835" stroke="#FFD700" stroke-width="4"/><path d="M50 18 C52 24, 55 35, 50 50 C46 38, 48 24, 50 18 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/><circle cx="50" cy="30" r="3" fill="#FFFFFF"/><path d="M30 45 C30 25, 45 20, 50 20 C55 20, 70 25, 70 45 C70 65, 55 75, 50 75 C45 75, 30 65, 30 45 Z" stroke="#FFD700" stroke-width="2" stroke-dasharray="3,3" fill="none"/><path d="M20 78 C30 92, 42 98, 50 100 C58 98, 70 92, 80 78 Z" fill="#002D62"/><rect x="28" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="44" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="60" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="36" y="86" width="8" height="6" fill="#FFFFFF"/><rect x="52" y="86" width="8" height="6" fill="#FFFFFF"/><path d="M15 102 C30 112, 70 112, 85 102 C80 115, 20 115, 15 102 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1"/></svg>`
);

interface SertifikatPklModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaPklId: string;
  defaultData?: any;
}

export const SertifikatPklModal: React.FC<SertifikatPklModalProps> = React.memo(({
  isOpen,
  onClose,
  siswaPklId,
  defaultData,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FRONT' | 'BACK'>('ALL');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Tenant Query for Centralized Kop Surat (PrintHeader)
  const { user } = useAuthStore();
  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: isOpen && !!user?.tenant_id,
  });

  const tenantData = (tenantRes as any)?.data || tenantRes || user?.tenant;

  // Fetch full details from backend
  const { data: certResponse, isLoading } = useQuery({
    queryKey: ['sertifikat-pkl-data', siswaPklId],
    queryFn: () => hubinApi.getSertifikatPklData(siswaPklId),
    enabled: isOpen && Boolean(siswaPklId),
  });

  const pklData = certResponse?.data || certResponse || defaultData;

  // Centralized Tenant Kop Configuration
  const tenantInfoForKop = useMemo(() => {
    const rawSekolah = pklData?.sekolah || {};
    return {
      name: tenantData?.name || rawSekolah?.nama || 'SMK NEGERI 1 PLERED',
      logo_url: tenantData?.logo_url || rawSekolah?.logo_url || undefined,
      logo_daerah_url: tenantData?.logo_daerah_url || rawSekolah?.logo_daerah || DEFAULT_JABAR_LOGO,
      address: tenantData?.address || rawSekolah?.alamat || 'Jl. Raya Rawasari Kec. Plered Kab. Purwakarta Telp. (0264) 7504001',
      phone: tenantData?.phone || rawSekolah?.telepon || '(0264) 7504001',
      email: tenantData?.email || rawSekolah?.email || 'smkneple@gmail.com',
      website: tenantData?.website || rawSekolah?.website || 'smknegeri1plered.sch.id',
      nama_dinas_atas: tenantData?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      nama_dinas_bawah: tenantData?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
      nama_cabang_dinas: tenantData?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
      kode_pos: tenantData?.kode_pos || rawSekolah?.kode_pos || '41162',
      print_header_lines: tenantData?.print_header_lines || undefined,
    };
  }, [tenantData, pklData?.sekolah]);

  // Resolve structured data
  const certData: SertifikatPklPrintData = useMemo(() => {
    const rawSiswa = pklData?.Siswa || defaultData?.Siswa || {};
    const rawMitra = pklData?.Mitra || defaultData?.Mitra || {};
    const rawSekolah = pklData?.sekolah || {};

    const hardTeknis = pklData?.hard_kompetensi_teknis ?? defaultData?.hard_kompetensi_teknis ?? 88;
    const hardK3lh = pklData?.hard_sop_k3lh ?? defaultData?.hard_sop_k3lh ?? 89;
    const hardBisnis = pklData?.hard_alur_bisnis ?? defaultData?.hard_alur_bisnis ?? 87;

    const softDisiplin = pklData?.soft_kedisiplinan ?? defaultData?.soft_kedisiplinan ?? 83;
    const softInisiatif = pklData?.soft_kerajinan_inisiatif ?? defaultData?.soft_kerajinan_inisiatif ?? 84;
    const softKerjasama = pklData?.soft_kerjasama ?? defaultData?.soft_kerjasama ?? 86;
    const softJujur = pklData?.soft_kejujuran ?? defaultData?.soft_kejujuran ?? 88;
    const softTanggungJawab = pklData?.soft_tanggung_jawab ?? defaultData?.soft_tanggung_jawab ?? 85;

    const scores = [hardTeknis, hardK3lh, hardBisnis, softDisiplin, softInisiatif, softKerjasama, softJujur, softTanggungJawab];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    const refSertifikat = (pklData as any)?.referensi_sertifikat;
    const nomorResmi = pklData?.nomor_sertifikat || refSertifikat?.nomor_surat || defaultData?.nomor_sertifikat || '425.1/0630/SMKN1PLD-KCD Wil.IV';
    const durasiResmi = String(refSertifikat?.durasi_jp || '792');
    const tempatResmi = refSertifikat?.tempat_terbit || rawSekolah.kota || 'Purwakarta';
    const tanggalResmi = refSertifikat?.tanggal_terbit 
      ? `${tempatResmi}, ${refSertifikat.tanggal_terbit}`
      : `${tempatResmi}, 22 Desember 2025`;
    const kepalaResmi = refSertifikat?.penandatangan_nama || rawSekolah.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.';
    const nipResmi = refSertifikat?.penandatangan_nip || rawSekolah.nip_kepala || '197111022008011001';

    return {
      nomor_sertifikat: nomorResmi,
      durasi_jp: durasiResmi,
      tanggal_terbit: tanggalResmi,
      // Adaptive assessment config
      assessment_mode: (pklData?.assessment_mode || 'DUDI_ONLY') as 'DUDI_ONLY' | 'COMPOSITE',
      weight_dudi: pklData?.weight_dudi ?? 70,
      weight_laporan: pklData?.weight_laporan ?? 15,
      weight_sidang: pklData?.weight_sidang ?? 15,
      sekolah: {
        nama: rawSekolah.nama || 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PLERED',
        alamat: rawSekolah.alamat || 'Jl. Raya Rawasari Kec. Plered Kab. Purwakarta Telp. (0264) 7504001',
        kota: tempatResmi,
        kode_pos: rawSekolah.kode_pos || '41162',
        telepon: rawSekolah.telepon || '(0264) 7504001',
        email: rawSekolah.email || 'smkneple@gmail.com',
        website: rawSekolah.website || 'smknegeri1plered.sch.id',
        kepala_sekolah: kepalaResmi,
        nip_kepala: nipResmi,
        logo_url: rawSekolah.logo_url,
        logo_daerah: rawSekolah.logo_daerah,
      },
      siswa: {
        nama_siswa: rawSiswa.nama_siswa || defaultData?.nama_siswa || 'AHMAD FADILAH',
        nis: rawSiswa.nis || defaultData?.nis || '2324100257',
        nisn: rawSiswa.nisn || defaultData?.nisn || '3087225907',
        tempat_lahir: rawSiswa.tempat_lahir || 'Purwakarta',
        tanggal_lahir: rawSiswa.tanggal_lahir || new Date('2008-10-15'),
        foto: rawSiswa.foto || null,
        program_keahlian: rawSiswa.Jurusan?.ProgramKeahlian?.nama || 'Teknik Otomotif',
        konsentrasi_keahlian: rawSiswa.Jurusan?.nama || 'Teknik Sepeda Motor',
        nama_kelas: rawSiswa.Kelas?.nama_kelas || defaultData?.nama_kelas || 'XII TSM 1',
      },
      mitra: {
        nama: rawMitra.nama || defaultData?.mitra_nama || 'POST MITRA',
        alamat: pklData?.alamat_dudi || rawMitra.alamat || defaultData?.alamat_dudi || 'Jl. Raya Citeko-Plered-Purwakarta',
        penanggung_jawab_nama: pklData?.penanggung_jawab_nama || rawMitra.pic_nama || defaultData?.penanggung_jawab_nama || '',
        instruktur_nama: pklData?.instruktur_nama || defaultData?.instruktur_nama || '',
      },
      pembimbing: {
        nama: pklData?.pembimbing_nama || pklData?.Pembimbing?.nama_guru || null,
        nip: pklData?.pembimbing_nip || pklData?.Pembimbing?.nip || null,
      },
      penilaian: {
        hard_kompetensi_teknis: hardTeknis,
        hard_sop_k3lh: hardK3lh,
        hard_alur_bisnis: hardBisnis,
        soft_kedisiplinan: softDisiplin,
        soft_kerajinan_inisiatif: softInisiatif,
        soft_kerjasama: softKerjasama,
        soft_kejujuran: softJujur,
        soft_tanggung_jawab: softTanggungJawab,
        nilai_akhir_pkl: pklData?.nilai_akhir_pkl ?? defaultData?.nilai_akhir_pkl ?? Math.round(avg * 100) / 100,
        predikat_pkl: pklData?.predikat_pkl || defaultData?.predikat_pkl || 'BAIK',
        // Composite mode scores
        nilai_laporan: pklData?.nilai_laporan ?? null,
        nilai_sidang: pklData?.nilai_sidang ?? null,
      },
    };
  }, [pklData, defaultData]);

  // Calculations for Daftar Nilai
  const hardScores = [
    certData.penilaian.hard_kompetensi_teknis ?? 88,
    certData.penilaian.hard_sop_k3lh ?? 89,
    certData.penilaian.hard_alur_bisnis ?? 87,
  ];
  const softScores = [
    certData.penilaian.soft_kedisiplinan ?? 83,
    certData.penilaian.soft_kerajinan_inisiatif ?? 84,
    certData.penilaian.soft_kerjasama ?? 86,
    certData.penilaian.soft_kejujuran ?? 88,
    certData.penilaian.soft_tanggung_jawab ?? 85,
  ];
  const isComposite = certData.assessment_mode === 'COMPOSITE';
  const dudiScoresArr = [...hardScores, ...softScores];
  const dudiTotal = dudiScoresArr.reduce((acc, s) => acc + s, 0);
  const dudiAvg = dudiTotal / dudiScoresArr.length;

  // For display purposes (total row on DUDI_ONLY)
  const totalScore = dudiTotal;

  // Compute displayed nilai akhir depending on mode
  let avgScore: number;
  if (isComposite) {
    const stored = certData.penilaian.nilai_akhir_pkl;
    if (stored !== null && stored !== undefined) {
      avgScore = stored;
    } else {
      const wD = certData.weight_dudi ?? 70;
      const wL = certData.weight_laporan ?? 15;
      const wS = certData.weight_sidang ?? 15;
      let scoreSum = dudiAvg * wD;
      let wSum = wD;
      if (certData.penilaian.nilai_laporan !== null && certData.penilaian.nilai_laporan !== undefined) {
        scoreSum += certData.penilaian.nilai_laporan * wL; wSum += wL;
      }
      if (certData.penilaian.nilai_sidang !== null && certData.penilaian.nilai_sidang !== undefined) {
        scoreSum += certData.penilaian.nilai_sidang * wS; wSum += wS;
      }
      avgScore = wSum > 0 ? scoreSum / wSum : dudiAvg;
    }
  } else {
    avgScore = certData.penilaian.nilai_akhir_pkl ?? dudiAvg;
  }

  const avgScoreFormatted = (Math.round(avgScore * 100) / 100).toFixed(2).replace('.', ',');
  const finalPredikat = certData.penilaian.predikat_pkl ? certData.penilaian.predikat_pkl.toUpperCase() : getPredikatLabel(avgScore);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const pdfMode = activeTab === 'FRONT' ? 'front_only' : activeTab === 'BACK' ? 'back_only' : 'all';
      const doc = await generateSertifikatPdf(certData, { 
        mode: pdfMode,
        logoDaerahBase64: tenantInfoForKop.logo_daerah_url,
        logoSekolahBase64: tenantInfoForKop.logo_url
      });
      doc.save(`Sertifikat_PKL_${certData.siswa.nama_siswa.replace(/\s+/g, '_')}.pdf`);
      toast.success('File PDF Sertifikat berhasil diunduh!');
    } catch (e) {
      console.error('Download PDF error:', e);
      toast.error('Gagal membuat file PDF sertifikat');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between overflow-hidden">
      {/* Top Modal Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award size={22} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              Sertifikat Praktik Kerja Lapangan (PKL)
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {certData.nomor_sertifikat}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {certData.siswa.nama_siswa} • NIS: {certData.siswa.nis} • {certData.mitra.nama}
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
                ? 'bg-indigo-600 text-white shadow-md'
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
                ? 'bg-indigo-600 text-white shadow-md'
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
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Halaman Belakang (Nilai)
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="rounded-xl text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-400" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            )}
            Unduh PDF
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
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

      {/* Main Preview Workspace (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center gap-8">
        {isLoading && (
          <div className="text-slate-400 text-xs flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Memuat data sertifikat...
          </div>
        )}

        {/* ============================================================ */}
        {/* HALAMAN DEPAN (SERTIFIKAT RESMI LANDSCAPE A4) */}
        {/* ============================================================ */}
        {(activeTab === 'ALL' || activeTab === 'FRONT') && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Halaman 1: Depan (Sertifikat Praktik Kerja Lapangan)
            </span>

            <div className="w-[1050px] min-h-[742px] bg-white text-slate-900 p-12 shadow-2xl rounded-none border border-slate-200 flex flex-col justify-between font-serif relative box-border">
              {/* Top Kop Surat Resmi Tenant */}
              <div className="w-full mb-3">
                <PrintHeader variant="landscape" tenantInfo={tenantInfoForKop} />
              </div>

              {/* Title & Number */}
              <div className="text-center my-4 font-serif">
                <h1 className="text-[18px] font-black uppercase tracking-wider underline underline-offset-4 text-slate-950">
                  SERTIFIKAT PRAKTIK KERJA LAPANGAN
                </h1>
                <p className="text-[12px] font-sans text-slate-800 mt-1">
                  Nomor : {certData.nomor_sertifikat}
                </p>
              </div>

              {/* Intro Line */}
              <div className="text-[12px] text-slate-900 font-sans leading-relaxed">
                Kepala {certData.sekolah?.nama || 'Sekolah Menengah Kejuruan (SMK) Negeri 1 Plered'} menerangkan bahwa :
              </div>

              {/* Student Biodata Table */}
              <div className="grid grid-cols-[200px_20px_1fr] text-[12px] font-sans gap-y-1.5 pl-6 my-1">
                <div className="text-slate-800">Nama</div>
                <div>:</div>
                <div className="font-bold text-slate-950 uppercase">{certData.siswa.nama_siswa}</div>

                <div className="text-slate-800">Tempat, Tanggal Lahir</div>
                <div>:</div>
                <div>{certData.siswa.tempat_lahir}, {formatTanggalIndonesia(certData.siswa.tanggal_lahir)}</div>

                <div className="text-slate-800">Nomor Induk Siswa</div>
                <div>:</div>
                <div className="font-mono">{certData.siswa.nis}</div>

                <div className="text-slate-800">Program Keahlian</div>
                <div>:</div>
                <div>{certData.siswa.program_keahlian}</div>

                <div className="text-slate-800">Konsentrasi Keahlian</div>
                <div>:</div>
                <div>{certData.siswa.konsentrasi_keahlian}</div>
              </div>

              {/* PKL Placement Details */}
              <div className="text-[12px] font-sans leading-relaxed my-1">
                <div>Telah melaksanakan <strong>Praktik Kerja Lapangan di :</strong></div>
                <div className="grid grid-cols-[200px_20px_1fr] gap-y-1 pl-6 mt-1">
                  <div className="text-slate-800">Nama Perusahaan/Instansi</div>
                  <div>:</div>
                  <div className="font-bold uppercase text-slate-950">{certData.mitra.nama}</div>

                  <div className="text-slate-800">Alamat</div>
                  <div>:</div>
                  <div>({certData.mitra.alamat})</div>
                </div>
              </div>

              {/* Clauses */}
              <div className="text-[12px] font-sans leading-relaxed my-2 space-y-1">
                <div>
                  dan telah memenuhi <strong>{certData.durasi_jp} Jam Pelajaran (JP)</strong> dengan hasil <strong>{finalPredikat}</strong>
                </div>
                <div>
                  Sertifikat ini merupakan bagian yang tidak terpisahkan dari IJAZAH siswa yang bersangkutan.
                </div>
              </div>

              {/* Bottom Row: Photo 3x4 & Signature */}
              <div className="flex items-end justify-between pt-6">
                {/* Photo 3x4 Box */}
                <div className="w-[114px] h-[152px] border border-slate-950 flex flex-col items-center justify-center text-slate-600 ml-6 bg-slate-50 font-sans text-xs">
                  {certData.siswa.foto ? (
                    <img src={certData.siswa.foto} alt="Pasfoto Siswa" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span>foto</span>
                      <span>3x4</span>
                    </>
                  )}
                </div>

                {/* Headmaster Signature Block */}
                <div className="text-center font-sans text-[12px] mr-10 leading-relaxed">
                  <div>{certData.tanggal_terbit}</div>
                  <div className="mt-0.5">Kepala sekolah,</div>
                  <div className="h-20" />
                  <div className="font-bold underline text-slate-950">
                    {certData.sekolah?.kepala_sekolah}
                  </div>
                  <div className="text-[11px] text-slate-700">
                    NIP. {certData.sekolah?.nip_kepala}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* HALAMAN BELAKANG (DAFTAR NILAI PKL LANDSCAPE A4) */}
        {/* ============================================================ */}
        {(activeTab === 'ALL' || activeTab === 'BACK') && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Halaman 2: Belakang (Daftar Nilai Praktik Kerja Lapangan)
            </span>

            <div className="w-[1050px] min-h-[742px] bg-white text-slate-900 p-12 shadow-2xl rounded-none border border-slate-200 flex flex-col justify-between font-serif relative box-border">
              <div>
                {/* Header Title */}
                <div className="text-center my-2 font-serif">
                  <h1 className="text-[18px] font-black uppercase tracking-wider text-slate-950">
                    DAFTAR NILAI PRAKTIK KERJA LAPANGAN
                  </h1>
                </div>

                {/* Student Short Identity */}
                <div className="grid grid-cols-[180px_20px_1fr] text-[12px] font-sans gap-y-1.5 my-4">
                  <div className="text-slate-800">Nama</div>
                  <div>:</div>
                  <div className="font-bold uppercase text-slate-950">{certData.siswa.nama_siswa}</div>

                  <div className="text-slate-800">Nomor Induk siswa</div>
                  <div>:</div>
                  <div className="font-mono">{certData.siswa.nisn || certData.siswa.nis}</div>

                  <div className="text-slate-800">Konsentrasi Keahlian</div>
                  <div>:</div>
                  <div>{certData.siswa.konsentrasi_keahlian}</div>

                  <div className="text-slate-800">Nama Perusahaan/Instansi</div>
                  <div>:</div>
                  <div className="font-bold uppercase text-slate-950">{certData.mitra.nama}</div>
                </div>

                {/* Formal Assessment Table */}
                <div className="overflow-hidden border border-slate-950 my-2">
                  <table className="w-full text-left font-sans text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-950 text-center font-bold">
                        <th rowSpan={2} className="w-12 p-2 border-r border-slate-950">NO.</th>
                        <th rowSpan={2} className="p-2 border-r border-slate-950 text-center">ASPEK PENILAIAN</th>
                        <th colSpan={2} className="p-1 border-b border-slate-950 text-center">NILAI</th>
                      </tr>
                      <tr className="border-b border-slate-950 text-center font-bold">
                        <th className="w-24 p-1.5 border-r border-slate-950">ANGKA</th>
                        <th className="w-24 p-1.5">HURUF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-950">
                      {/* A. HARD SKILL */}
                      <tr className="font-bold bg-slate-50/50">
                        <td className="p-1.5 text-center border-r border-slate-950">A</td>
                        <td colSpan={3} className="p-1.5">HARD SKILL</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">1</td>
                        <td className="p-1.5 border-r border-slate-950">Kompetensi Teknis</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{hardScores[0]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(hardScores[0])}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">2</td>
                        <td className="p-1.5 border-r border-slate-950">Penerapan SOP dan K3LH</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{hardScores[1]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(hardScores[1])}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">3</td>
                        <td className="p-1.5 border-r border-slate-950">Memahami Alur Bisnis</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{hardScores[2]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(hardScores[2])}</td>
                      </tr>

                      {/* B. SOFT SKILL */}
                      <tr className="font-bold bg-slate-50/50">
                        <td className="p-1.5 text-center border-r border-slate-950">B</td>
                        <td colSpan={3} className="p-1.5">SOFT SKILL</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">1</td>
                        <td className="p-1.5 border-r border-slate-950">Kedisiplinan</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{softScores[0]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(softScores[0])}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">2</td>
                        <td className="p-1.5 border-r border-slate-950">Kerajinan, Inisiatif & Kreatifitas</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{softScores[1]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(softScores[1])}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">3</td>
                        <td className="p-1.5 border-r border-slate-950">Kerjasama (Team Work)</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{softScores[2]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(softScores[2])}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">4</td>
                        <td className="p-1.5 border-r border-slate-950">Kejujuran</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{softScores[3]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(softScores[3])}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-center border-r border-slate-950">5</td>
                        <td className="p-1.5 border-r border-slate-950">Tanggung Jawab</td>
                        <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{softScores[4]}</td>
                        <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(softScores[4])}</td>
                      </tr>

                      {/* JUMLAH NILAI – only on DUDI_ONLY */}
                      {!isComposite && (
                        <tr className="font-bold border-t-2 border-slate-950">
                          <td colSpan={2} className="p-2 text-center border-r border-slate-950">JUMLAH NILAI</td>
                          <td className="p-2 text-center border-r border-slate-950 font-mono font-bold">{totalScore}</td>
                          <td className="p-2 text-center"></td>
                        </tr>
                      )}

                      {/* C. EVALUASI AKADEMIK SEKOLAH – only on COMPOSITE */}
                      {isComposite && (
                        <>
                          <tr className="font-bold bg-slate-50/50">
                            <td className="p-1.5 text-center border-r border-slate-950">C</td>
                            <td colSpan={3} className="p-1.5 text-[10px]">
                              EVALUASI AKADEMIK SEKOLAH{' '}
                              <span className="font-normal italic text-slate-600">
                                (Bobot: DUDI {certData.weight_dudi ?? 70}% | Laporan {certData.weight_laporan ?? 15}% | Sidang {certData.weight_sidang ?? 15}%)
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1.5 text-center border-r border-slate-950">1</td>
                            <td className="p-1.5 border-r border-slate-950">Nilai Rata-Rata DUDI (Hard + Soft Skill)</td>
                            <td className="p-1.5 text-center border-r border-slate-950 font-semibold">{(Math.round(dudiAvg * 100) / 100).toFixed(2)}</td>
                            <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(dudiAvg)}</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 text-center border-r border-slate-950">2</td>
                            <td className="p-1.5 border-r border-slate-950">Laporan PKL</td>
                            <td className="p-1.5 text-center border-r border-slate-950 font-semibold">
                              {certData.penilaian.nilai_laporan !== null && certData.penilaian.nilai_laporan !== undefined ? certData.penilaian.nilai_laporan : '-'}
                            </td>
                            <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(certData.penilaian.nilai_laporan ?? null)}</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 text-center border-r border-slate-950">3</td>
                            <td className="p-1.5 border-r border-slate-950">Sidang / Presentasi PKL</td>
                            <td className="p-1.5 text-center border-r border-slate-950 font-semibold">
                              {certData.penilaian.nilai_sidang !== null && certData.penilaian.nilai_sidang !== undefined ? certData.penilaian.nilai_sidang : '-'}
                            </td>
                            <td className="p-1.5 text-center font-semibold">{getPredikatHuruf(certData.penilaian.nilai_sidang ?? null)}</td>
                          </tr>
                        </>
                      )}

                      {/* NILAI AKHIR RATA-RATA */}
                      <tr className="font-bold border-t border-slate-950">
                        <td colSpan={2} className="p-2 text-center border-r border-slate-950">NILAI AKHIR RATA-RATA</td>
                        <td className="p-2 text-center border-r border-slate-950 font-mono font-bold">{avgScoreFormatted}</td>
                        <td className="p-2 text-center font-bold text-slate-950">{finalPredikat}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Legend & Company Signature */}
              <div className="flex items-start justify-between pt-6 font-sans text-[11px]">
                {/* Keterangan Nilai Box (Border hitam) */}
                <div className="border border-slate-950 p-3 w-64 space-y-1">
                  <div className="font-semibold mb-1 italic">Keterangan Nilai :</div>
                  <div className="grid grid-cols-[60px_20px_1fr] text-[10px] leading-tight">
                    <span>90 - 100</span>
                    <span className="font-bold">A</span>
                    <span className="italic">Amat Baik</span>

                    <span>80 - 89</span>
                    <span className="font-bold">B</span>
                    <span className="italic">Baik</span>

                    <span>70 - 79</span>
                    <span className="font-bold">C</span>
                    <span className="italic">Cukup Baik</span>

                    <span>60 - 69</span>
                    <span className="font-bold">D</span>
                    <span className="italic">Kurang Baik</span>
                  </div>
                </div>

                {/* Signature block – adaptive based on mode */}
                {isComposite ? (
                  <div className="flex gap-16 text-[12px] mr-4">
                    {/* Pembimbing Sekolah */}
                    <div className="text-center leading-relaxed">
                      <div>Guru Pembimbing PKL / Kaprog</div>
                      <div className="h-20" />
                      <div className="border-b border-slate-950 w-52 mx-auto font-bold">
                        {certData.pembimbing?.nama || '\u00A0'}
                      </div>
                      {certData.pembimbing?.nip && (
                        <div className="text-[10px] mt-0.5">{`NIP. ${certData.pembimbing.nip}`}</div>
                      )}
                    </div>
                    {/* PIC DUDI */}
                    <div className="text-center leading-relaxed">
                      <div>Penanggung Jawab Perusahaan / Instansi</div>
                      <div className="h-20" />
                      <div className="border-b border-slate-950 w-52 mx-auto font-bold">
                        {certData.mitra.penanggung_jawab_nama || '\u00A0'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* DUDI_ONLY: single signature */
                  <div className="text-center text-[12px] mr-10 leading-relaxed">
                    <div>Penanggung Jawab Perusahaan / Instansi</div>
                    <div className="h-20" />
                    <div className="border-b border-slate-950 w-56 mx-auto font-bold">
                      {certData.mitra.penanggung_jawab_nama || '\u00A0'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DIRECT PRINT PORTAL WITH EXACT A4 LANDSCAPE MEDIA RULES */}
      {/* ============================================================ */}
      {createPortal(
        <div id="print-sertifikat-portal" className="hidden">
          {/* HALAMAN 1 DEPAN */}
          <div className="sertifikat-print-page w-[297mm] h-[210mm] p-[15mm] box-border flex flex-col justify-between font-serif bg-white text-black">
            {/* Kop Surat Resmi Tenant */}
            <div className="w-full mb-2">
              <PrintHeader variant="landscape" tenantInfo={tenantInfoForKop} />
            </div>

            {/* Title & Number */}
            <div className="text-center my-3 font-serif">
              <h1 className="text-[16pt] font-black uppercase underline underline-offset-4">
                SERTIFIKAT PRAKTIK KERJA LAPANGAN
              </h1>
              <p className="text-[10pt] font-sans mt-1">Nomor : {certData.nomor_sertifikat}</p>
            </div>

            <div className="text-[10pt] font-sans">
              Kepala {certData.sekolah?.nama || 'Sekolah Menengah Kejuruan (SMK) Negeri 1 Plered'} menerangkan bahwa :
            </div>

            {/* Biodata */}
            <div className="grid grid-cols-[55mm_5mm_1fr] text-[10pt] font-sans gap-y-1 pl-6">
              <div>Nama</div><div>:</div><div className="font-bold uppercase">{certData.siswa.nama_siswa}</div>
              <div>Tempat, Tanggal Lahir</div><div>:</div><div>{certData.siswa.tempat_lahir}, {formatTanggalIndonesia(certData.siswa.tanggal_lahir)}</div>
              <div>Nomor Induk Siswa</div><div>:</div><div>{certData.siswa.nis}</div>
              <div>Program Keahlian</div><div>:</div><div>{certData.siswa.program_keahlian}</div>
              <div>Konsentrasi Keahlian</div><div>:</div><div>{certData.siswa.konsentrasi_keahlian}</div>
            </div>

            {/* PKL Info */}
            <div className="text-[10pt] font-sans leading-relaxed">
              <div>Telah melaksanakan <strong>Praktik Kerja Lapangan di :</strong></div>
              <div className="grid grid-cols-[55mm_5mm_1fr] gap-y-1 pl-6 mt-1">
                <div>Nama Perusahaan/Instansi</div><div>:</div><div className="font-bold uppercase">{certData.mitra.nama}</div>
                <div>Alamat</div><div>:</div><div>({certData.mitra.alamat})</div>
              </div>
            </div>

            {/* Clauses */}
            <div className="text-[10pt] font-sans space-y-1">
              <div>
                dan telah memenuhi <strong>{certData.durasi_jp} Jam Pelajaran (JP)</strong> dengan hasil <strong>{finalPredikat}</strong>
              </div>
              <div>
                Sertifikat ini merupakan bagian yang tidak terpisahkan dari IJAZAH siswa yang bersangkutan.
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-end justify-between pt-4">
              <div className="w-[30mm] h-[40mm] border border-black flex flex-col items-center justify-center text-black text-[9pt] font-sans ml-6">
                {certData.siswa.foto ? (
                  <img src={certData.siswa.foto} alt="Pasfoto" className="w-full h-full object-cover" />
                ) : (
                  <><span>foto</span><span>3x4</span></>
                )}
              </div>

              <div className="text-center font-sans text-[10pt] mr-12">
                <div>{certData.tanggal_terbit}</div>
                <div>Kepala sekolah,</div>
                <div className="h-[22mm]" />
                <div className="font-bold underline">{certData.sekolah?.kepala_sekolah}</div>
                <div className="text-[9pt]">NIP. {certData.sekolah?.nip_kepala}</div>
              </div>
            </div>
          </div>

          {/* PAGE BREAK UNTUK HALAMAN 2 */}
          <div className="page-break" style={{ pageBreakAfter: 'always' }} />

          {/* HALAMAN 2 BELAKANG (DAFTAR NILAI) */}
          <div className="sertifikat-print-page w-[297mm] h-[210mm] p-[15mm] box-border flex flex-col justify-between font-serif bg-white text-black">
            <div>
              <div className="text-center my-2 font-serif">
                <h1 className="text-[15pt] font-black uppercase">DAFTAR NILAI PRAKTIK KERJA LAPANGAN</h1>
              </div>

              <div className="grid grid-cols-[50mm_5mm_1fr] text-[10pt] font-sans gap-y-1 my-3">
                <div>Nama</div><div>:</div><div className="font-bold uppercase">{certData.siswa.nama_siswa}</div>
                <div>Nomor Induk siswa</div><div>:</div><div>{certData.siswa.nisn || certData.siswa.nis}</div>
                <div>Konsentrasi Keahlian</div><div>:</div><div>{certData.siswa.konsentrasi_keahlian}</div>
                <div>Nama Perusahaan/Instansi</div><div>:</div><div className="font-bold uppercase">{certData.mitra.nama}</div>
              </div>

              {/* Tabel Penilaian */}
              <div className="border border-black my-2">
                <table className="w-full text-left font-sans text-[9pt] border-collapse">
                  <thead>
                    <tr className="border-b border-black text-center font-bold">
                      <th rowSpan={2} className="w-10 p-1 border-r border-black">NO.</th>
                      <th rowSpan={2} className="p-1 border-r border-black">ASPEK PENILAIAN</th>
                      <th colSpan={2} className="p-1 border-b border-black">NILAI</th>
                    </tr>
                    <tr className="border-b border-black text-center font-bold">
                      <th className="w-20 p-1 border-r border-black">ANGKA</th>
                      <th className="w-20 p-1">HURUF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    <tr className="font-bold"><td className="p-1 text-center border-r border-black">A</td><td colSpan={3} className="p-1">HARD SKILL</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">1</td><td className="p-1 border-r border-black">Kompetensi Teknis</td><td className="p-1 text-center border-r border-black">{hardScores[0]}</td><td className="p-1 text-center">{getPredikatHuruf(hardScores[0])}</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">2</td><td className="p-1 border-r border-black">Penerapan SOP dan K3LH</td><td className="p-1 text-center border-r border-black">{hardScores[1]}</td><td className="p-1 text-center">{getPredikatHuruf(hardScores[1])}</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">3</td><td className="p-1 border-r border-black">Memahami Alur Bisnis</td><td className="p-1 text-center border-r border-black">{hardScores[2]}</td><td className="p-1 text-center">{getPredikatHuruf(hardScores[2])}</td></tr>

                    <tr className="font-bold"><td className="p-1 text-center border-r border-black">B</td><td colSpan={3} className="p-1">SOFT SKILL</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">1</td><td className="p-1 border-r border-black">Kedisiplinan</td><td className="p-1 text-center border-r border-black">{softScores[0]}</td><td className="p-1 text-center">{getPredikatHuruf(softScores[0])}</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">2</td><td className="p-1 border-r border-black">Kerajinan, Inisiatif & Kreatifitas</td><td className="p-1 text-center border-r border-black">{softScores[1]}</td><td className="p-1 text-center">{getPredikatHuruf(softScores[1])}</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">3</td><td className="p-1 border-r border-black">Kerjasama (Team Work)</td><td className="p-1 text-center border-r border-black">{softScores[2]}</td><td className="p-1 text-center">{getPredikatHuruf(softScores[2])}</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">4</td><td className="p-1 border-r border-black">Kejujuran</td><td className="p-1 text-center border-r border-black">{softScores[3]}</td><td className="p-1 text-center">{getPredikatHuruf(softScores[3])}</td></tr>
                    <tr><td className="p-1 text-center border-r border-black">5</td><td className="p-1 border-r border-black">Tanggung Jawab</td><td className="p-1 text-center border-r border-black">{softScores[4]}</td><td className="p-1 text-center">{getPredikatHuruf(softScores[4])}</td></tr>

                    {/* JUMLAH NILAI – only on DUDI_ONLY */}
                    {!isComposite && (
                      <tr className="font-bold border-t-2 border-black">
                        <td colSpan={2} className="p-1.5 text-center border-r border-black">JUMLAH NILAI</td>
                        <td className="p-1.5 text-center border-r border-black">{totalScore}</td>
                        <td></td>
                      </tr>
                    )}

                    {/* C. EVALUASI AKADEMIK SEKOLAH – only on COMPOSITE */}
                    {isComposite && (
                      <>
                        <tr className="font-bold">
                          <td className="p-1 text-center border-r border-black">C</td>
                          <td colSpan={3} className="p-1 text-[8pt]">
                            EVALUASI AKADEMIK SEKOLAH{' '}
                            <span className="font-normal italic">
                              (DUDI {certData.weight_dudi ?? 70}% | Laporan {certData.weight_laporan ?? 15}% | Sidang {certData.weight_sidang ?? 15}%)
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1 text-center border-r border-black">1</td>
                          <td className="p-1 border-r border-black">Nilai Rata-Rata DUDI (Hard + Soft Skill)</td>
                          <td className="p-1 text-center border-r border-black">{(Math.round(dudiAvg * 100) / 100).toFixed(2)}</td>
                          <td className="p-1 text-center">{getPredikatHuruf(dudiAvg)}</td>
                        </tr>
                        <tr>
                          <td className="p-1 text-center border-r border-black">2</td>
                          <td className="p-1 border-r border-black">Laporan PKL</td>
                          <td className="p-1 text-center border-r border-black">
                            {certData.penilaian.nilai_laporan !== null && certData.penilaian.nilai_laporan !== undefined ? certData.penilaian.nilai_laporan : '-'}
                          </td>
                          <td className="p-1 text-center">{getPredikatHuruf(certData.penilaian.nilai_laporan ?? null)}</td>
                        </tr>
                        <tr>
                          <td className="p-1 text-center border-r border-black">3</td>
                          <td className="p-1 border-r border-black">Sidang / Presentasi PKL</td>
                          <td className="p-1 text-center border-r border-black">
                            {certData.penilaian.nilai_sidang !== null && certData.penilaian.nilai_sidang !== undefined ? certData.penilaian.nilai_sidang : '-'}
                          </td>
                          <td className="p-1 text-center">{getPredikatHuruf(certData.penilaian.nilai_sidang ?? null)}</td>
                        </tr>
                      </>
                    )}

                    <tr className="font-bold border-t border-black">
                      <td colSpan={2} className="p-1.5 text-center border-r border-black">NILAI AKHIR RATA-RATA</td>
                      <td className="p-1.5 text-center border-r border-black">{avgScoreFormatted}</td>
                      <td className="p-1.5 text-center">{finalPredikat}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start justify-between pt-4 font-sans text-[9pt]">
              <div className="border border-black p-2 w-56">
                <div className="font-semibold italic mb-0.5">Keterangan Nilai :</div>
                <div className="grid grid-cols-[45px_15px_1fr] text-[8pt] leading-tight">
                  <span>90 - 100</span><span className="font-bold">A</span><span>Amat Baik</span>
                  <span>80 - 89</span><span className="font-bold">B</span><span>Baik</span>
                  <span>70 - 79</span><span className="font-bold">C</span><span>Cukup Baik</span>
                  <span>60 - 69</span><span className="font-bold">D</span><span>Kurang Baik</span>
                </div>
              </div>

              {/* Adaptive signature block in print portal */}
              {isComposite ? (
                <div className="flex gap-12 text-[10pt] mr-4">
                  <div className="text-center">
                    <div>Guru Pembimbing PKL / Kaprog</div>
                    <div className="h-[22mm]" />
                    <div className="border-b border-black w-44 mx-auto font-bold">
                      {certData.pembimbing?.nama || '\u00A0'}
                    </div>
                    {certData.pembimbing?.nip && (
                      <div className="text-[8pt] mt-0.5">{`NIP. ${certData.pembimbing.nip}`}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div>Penanggung Jawab Perusahaan / Instansi</div>
                    <div className="h-[22mm]" />
                    <div className="border-b border-black w-44 mx-auto font-bold">
                      {certData.mitra.penanggung_jawab_nama || '\u00A0'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-[10pt] mr-12">
                  <div>Penanggung Jawab Perusahaan / Instansi</div>
                  <div className="h-[22mm]" />
                  <div className="border-b border-black w-48 mx-auto font-bold">
                    {certData.mitra.penanggung_jawab_nama || '\u00A0'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Global CSS for Clean Landscape Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          #root {
            display: none !important;
          }
          body > :not(#print-sertifikat-portal) {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-sertifikat-portal {
            display: block !important;
          }
          .sertifikat-print-page {
            page-break-after: always;
            break-after: page;
          }
          .sertifikat-print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
});
