import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, Clock, MapPin, User, GraduationCap, Building2, Download, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, SectionCard } from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import axiosInstance from '@/lib/axiosInstance';
import { toast } from 'react-hot-toast';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { formatDate } from '@/utils/layoutUtils';

interface PublicViewData {
  id: string;
  nomor_surat: string;
  judul: string;
  tujuan_surat: string;
  tanggal_surat: string;
  isi_ringkas: string;
  created_by: string;
  siswa: {
    id: string;
    nama: string;
    nis: string;
    kelas: string;
    kelas_id: string;
  } | null;
  pemanggilan: {
    alasan: string;
    tanggal: string;
    waktu: string;
    tempat: string;
  } | null;
  sekolah: {
    name?: string;
    logo_url?: string;
    [key: string]: unknown;
  } | null;
  tenantInfo: {
    name?: string;
    logo_url?: string;
    [key: string]: unknown;
  } | null;
  strukturList: unknown[];
}

export const SuratKeluarPublicViewPage: React.FC = React.memo(() => {
  const { token } = useParams<{ token: string }>();
  const [downloading, setDownloading] = useState(false);

  // Fetch Public View Data via React Query (Pilar 31)
  const { data, isLoading, error } = useQuery<PublicViewData>({
    queryKey: ['surat-keluar-public', token],
    queryFn: async () => {
      if (!token) throw new Error('Token tidak ditemukan');
      const res = await axiosInstance.get(`/correspondence/surat-keluar/public-view/${encodeURIComponent(token)}/detail`);
      if (res.data?.success) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Gagal memuat detail surat panggilan');
    },
    enabled: Boolean(token),
    retry: 1
  });

  const getBase64 = useCallback(async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const logoDaerahUrl = data.sekolah?.logo_url || data.tenantInfo?.logo_url;
      const logoSekolahUrl = data.tenantInfo?.logo_url;

      const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
        logoDaerahUrl ? getBase64(logoDaerahUrl) : Promise.resolve(null),
        logoSekolahUrl ? getBase64(logoSekolahUrl) : Promise.resolve(null)
      ]);

      const blob = await generateGenericPdf({
        module: 'bpbk',
        printType: 'letter_bk_call',
        selectedClassId: data.siswa?.kelas_id || '',
        sekolah: data.sekolah,
        tenantInfo: data.tenantInfo,
        strukturList: data.strukturList || [],
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo: true,
        selectedStudentId: data.siswa?.id || undefined,
        isSigned: true,
        eventDetails: {
          nomorSurat: data.nomor_surat,
          tanggalPertemuan: data.pemanggilan?.tanggal ? String(data.pemanggilan.tanggal) : new Date().toISOString(),
          waktuPertemuan: data.pemanggilan?.waktu || undefined,
          tempatPertemuan: data.pemanggilan?.tempat || undefined,
          agendaPertemuan: data.pemanggilan?.alasan || ''
        },
        filterData: {
          selectedStudent: {
            nama_siswa: data.siswa?.nama,
            nis: data.siswa?.nis,
            Kelas: {
              nama_kelas: data.siswa?.kelas
            }
          }
        }
      });

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Surat_Panggilan_${(data.siswa?.nama || 'Siswa').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success('Berkas PDF resmi berhasil diunduh!');
    } catch {
      toast.error('Gagal mengunduh berkas PDF resmi.');
    } finally {
      setDownloading(false);
    }
  }, [data, getBase64]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Absenta' },
    { label: 'Dokumen Surat Resmi' }
  ], []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Memuat berkas surat panggilan resmi...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4"
        >
          <div className="inline-flex p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full">
            <FileText className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Akses Surat Tidak Valid</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {error instanceof Error ? error.message : 'Tautan akses surat tidak valid, sudah digunakan, atau telah kedaluwarsa.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Surat Panggilan Orang Tua Resmi"
        description="Verifikasi dan lembar digital surat panggilan wali murid terenkripsi resmi sekolah."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="surat_keluar_public_view"
        instruction={{
          title: 'Panduan Akses Surat Panggilan Wali Murid',
          description: 'Halaman publik resmi untuk melihat rincian agenda pertemuan dan mengunduh berkas PDF bertanda tangan digital.',
          items: [
            { text: 'Periksa jadwal, waktu, dan ruangan pertemuan yang telah ditentukan oleh pihak sekolah.' },
            { text: 'Klik tombol [Unduh Surat Panggilan Resmi (PDF)] untuk mencetak dokumen resmi bertanda tangan.' },
            { text: 'Tunjukkan berkas ini kepada petugas piket saat menghadiri agenda di sekolah.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="max-w-2xl mx-auto space-y-6 w-full min-w-0 max-w-full">
            {/* Header info */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm w-full min-w-0 max-w-full">
              <div className="flex items-center gap-3 min-w-0">
                {data.sekolah?.logo_url ? (
                  <img src={data.sekolah.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded-lg shrink-0" />
                ) : (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Surat Panggilan Orang Tua</h3>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {data.sekolah?.name || 'Sekolah'}
                  </p>
                </div>
              </div>
              <Badge variant="success" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shrink-0">
                ✓ Sah &amp; Terdaftar
              </Badge>
            </div>

            {/* Agenda details */}
            <Card className="shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden rounded-2xl w-full min-w-0 max-w-full">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
                <h4 className="text-xs font-bold opacity-80 uppercase tracking-wider">Perihal Dokumen Resmi</h4>
                <h2 className="text-xl font-black mt-1 leading-snug">{data.judul}</h2>
                <p className="text-xs opacity-75 mt-1 font-mono">No. Surat: {data.nomor_surat}</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-0.5">Tanggal Diterbitkan</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {formatDate(data.tanggal_surat)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider mb-0.5">Petugas Pengirim</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{data.created_by || 'Guru Bimbingan Konseling'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Profile */}
            <Card className="shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl w-full min-w-0 max-w-full">
              <CardHeader className="py-4 px-6 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Identitas Siswa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.siswa?.nama}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Kelas: <strong className="text-slate-700 dark:text-slate-300">{data.siswa?.kelas}</strong> • NIS: {data.siswa?.nis}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agenda Meeting Details */}
            <Card className="shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl w-full min-w-0 max-w-full">
              <CardHeader className="py-4 px-6 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                <Calendar className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Agenda &amp; Jadwal Pertemuan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Hari / Tanggal Pertemuan</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {data.pemanggilan?.tanggal ? formatDate(data.pemanggilan.tanggal) : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Waktu Pertemuan</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{data.pemanggilan?.waktu || '-'} WIB</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Lokasi / Ruangan</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{data.pemanggilan?.tempat || '-'}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-start gap-3">
                    <FileText className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="w-full">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-1">Materi / Alasan Pemanggilan</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                        {data.pemanggilan?.alasan}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download PDF button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="w-full py-4 text-xs font-bold text-white rounded-2xl shadow-xl flex items-center justify-center gap-2 h-auto"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1 text-white" />
                    Menyusun PDF Resmi...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Unduh Surat Panggilan Resmi (PDF)
                  </>
                )}
              </Button>
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default SuratKeluarPublicViewPage;
