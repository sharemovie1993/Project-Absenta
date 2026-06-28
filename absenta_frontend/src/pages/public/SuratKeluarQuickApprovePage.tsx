import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, FileText, Calendar, Clock, MapPin, User, GraduationCap, Building2, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Loader } from '@/components/ui';
import axiosInstance from '@/lib/axiosInstance';
import { toast } from 'sonner';

interface QuickApproveData {
  id: string;
  nomor_surat: string;
  judul: string;
  tujuan_surat: string;
  tanggal_surat: string;
  isi_ringkas: string;
  created_by: string;
  siswa: {
    nama: string;
    nis: string;
    kelas: string;
  } | null;
  pemanggilan: {
    alasan: string;
    tanggal: string;
    waktu: string;
    tempat: string;
  } | null;
  sekolah: {
    nama: string;
    logo: string | null;
  } | null;
}

export const SuratKeluarQuickApprovePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuickApproveData | null>(null);

  useEffect(() => {
    fetchDetail();
  }, [token]);

  const fetchDetail = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/correspondence/surat-keluar/quick-approve/${encodeURIComponent(token)}/detail`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || 'Gagal memuat detail persetujuan surat');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Tautan persetujuan tidak valid atau sudah kedaluwarsa');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!token) return;
    setApproving(true);
    try {
      const res = await axiosInstance.post(`/correspondence/surat-keluar/quick-approve/${encodeURIComponent(token)}/approve`);
      if (res.data.success) {
        setApproved(true);
        toast.success('Surat panggilan berhasil disetujui!');
      } else {
        toast.error(res.data.message || 'Gagal menyetujui surat');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyetujui surat keluar');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Memuat draf surat panggilan...</p>
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
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Akses Tidak Valid</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'Token persetujuan tidak valid, sudah digunakan, atau telah kedaluwarsa.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      {/* Premium Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.sekolah?.logo ? (
              <img src={data.sekolah.logo} alt="Logo" className="h-8 w-8 object-contain rounded-md" />
            ) : (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absenta Platform</h1>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                {data.sekolah?.nama || 'Pengaturan Sekolah'}
              </p>
            </div>
          </div>
          <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">
            Draf Surat Keluar
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          {approved ? (
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-6"
            >
              <div className="inline-flex p-4 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full">
                <CheckCircle2 className="h-16 w-16 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Surat Berhasil Disetujui!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Surat Panggilan Orang Tua BK untuk siswa <strong>{data.siswa?.nama}</strong> telah berhasil ditandatangani dan diterbitkan. Status telah diperbarui menjadi aktif secara real-time.
                </p>
              </div>

              <div className="p-4 border border-green-100 dark:border-green-900/50 bg-green-50/20 dark:bg-green-950/5 rounded-xl inline-flex items-center gap-2 text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mx-auto">
                <ShieldCheck className="h-4.5 w-4.5" />
                Tanda Tangan Digital Terverifikasi
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="approval-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Alert Warning */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl flex gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Persetujuan Cepat (Quick Approve)</h4>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-normal mt-0.5">
                    Halaman ini dikhususkan bagi Kepala Sekolah untuk menyetujui surat panggilan secara langsung dan cepat tanpa perlu masuk ke dalam aplikasi desktop.
                  </p>
                </div>
              </div>

              {/* Surat Details Card */}
              <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
                <CardHeader className="py-4 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                  <FileText className="h-4.5 w-4.5 text-indigo-500" />
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Detail Dokumen Surat Keluar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase block font-bold text-[9px] tracking-wider">Nomor Surat</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{data.nomor_surat}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase block font-bold text-[9px] tracking-wider">Tanggal Dibuat</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(data.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                     <div className="col-span-2 border-t border-slate-50 dark:border-slate-800/80 pt-3">
                      <span className="text-slate-400 uppercase block font-bold text-[9px] tracking-wider">Guru BK / Pembuat Surat</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{data.created_by || 'Guru Bimbingan Konseling'}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-50 dark:border-slate-800/80 pt-3">
                      <span className="text-slate-400 uppercase block font-bold text-[9px] tracking-wider">Perihal / Judul</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{data.judul}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Info Card */}
              <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
                <CardHeader className="py-4 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                  <GraduationCap className="h-4.5 w-4.5 text-indigo-500" />
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Siswa Yang Bersangkutan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
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

              {/* Summon Details Card */}
              <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
                <CardHeader className="py-4 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                  <Calendar className="h-4.5 w-4.5 text-indigo-500" />
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Agenda & Rencana Pertemuan
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

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="w-full py-3 h-12 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all duration-150 transform active:scale-[0.99]"
                >
                  {approving ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin mr-1 text-white" />
                      Memproses Persetujuan...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Setujui & Tanda Tangani Surat Panggilan
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
export default SuratKeluarQuickApprovePage;
