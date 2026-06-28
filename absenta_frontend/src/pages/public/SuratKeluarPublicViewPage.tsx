import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Calendar, Clock, MapPin, User, GraduationCap, Building2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Loader } from '@/components/ui';
import axiosInstance from '@/lib/axiosInstance';
import { toast } from 'sonner';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';

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
  sekolah: any;
  tenantInfo: any;
  strukturList: any[];
}

export const SuratKeluarPublicViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicViewData | null>(null);

  useEffect(() => {
    fetchDetail();
  }, [token]);

  const fetchDetail = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/correspondence/surat-keluar/public-view/${encodeURIComponent(token)}/detail`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || 'Gagal memuat detail surat panggilan');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Tautan akses tidak valid atau sudah kedaluwarsa');
    } finally {
      setLoading(false);
    }
  };

  const getBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Failed to convert logo to base64:', e);
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    const toastId = toast.loading('Menyusun berkas PDF resmi...');
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
        isSigned: true, // it must be signed since it is approved
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
      link.download = `Surat_Panggilan_${data.siswa?.nama.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success('Berkas PDF berhasil diunduh!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengunduh berkas PDF resmi.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Memuat berkas surat panggilan...</p>
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
            {error || 'Tautan akses surat tidak valid, sudah digunakan, atau telah kedaluwarsa.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.sekolah?.logo_url ? (
              <img src={data.sekolah.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded-md" />
            ) : (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surat Panggilan Orang Tua</h1>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                {data.sekolah?.name || 'Sekolah'}
              </p>
            </div>
          </div>
          <Badge variant="success" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
            Terkirim & Sah
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Agenda details */}
        <Card className="shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white">
            <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider">Perihal Dokumen</h3>
            <h2 className="text-lg font-black mt-1 leading-snug">{data.judul}</h2>
            <p className="text-xs opacity-75 mt-1">Nomor: {data.nomor_surat}</p>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Tanggal Dibuat</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {new Date(data.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Guru BK / Pengirim</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{data.created_by || 'Guru Bimbingan Konseling'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Profile */}
        <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
          <CardHeader className="py-4 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
            <GraduationCap className="h-4.5 w-4.5 text-indigo-500" />
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Siswa Yang Bersangkutan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500">
                <User className="h-5 w-5" />
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

        {/* Agenda details */}
        <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
          <CardHeader className="py-4 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
            <Calendar className="h-4.5 w-4.5 text-indigo-500" />
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Agenda Pertemuan Wali Murid
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 text-xs">
                <Calendar className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Tanggal Pertemuan</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {data.pemanggilan?.tanggal ? new Date(data.pemanggilan.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <Clock className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Waktu Pertemuan</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{data.pemanggilan?.waktu || '-'} WIB</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <MapPin className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Tempat Ruangan</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{data.pemanggilan?.tempat || '-'}</span>
                </div>
              </div>

              <div className="border-t border-slate-50 dark:border-slate-800/80 pt-3.5 flex items-start gap-3 text-xs">
                <FileText className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Alasan Pemanggilan</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed text-sm bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg max-w-lg">
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
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full py-3 h-12 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all duration-150 transform active:scale-[0.99]"
          >
            {downloading ? (
              <>
                <Loader className="h-5 w-5 animate-spin mr-1 text-white" />
                Menyusun PDF...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Unduh Surat Panggilan Resmi (PDF)
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};
export default SuratKeluarPublicViewPage;
