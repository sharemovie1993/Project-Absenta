import React, { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, FileText, Calendar, Clock, MapPin, User, GraduationCap, Building2, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, SectionCard } from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import axiosInstance from '@/lib/axiosInstance';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/utils/layoutUtils';

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

export const SuratKeluarQuickApprovePage: React.FC = React.memo(() => {
  const { token } = useParams<{ token: string }>();

  // Fetch Detail via React Query (Pilar 31)
  const { data, isLoading, error, refetch } = useQuery<QuickApproveData>({
    queryKey: ['surat-keluar-quick-approve', token],
    queryFn: async () => {
      if (!token) throw new Error('Token tidak ditemukan');
      const res = await axiosInstance.get(`/correspondence/surat-keluar/quick-approve/${encodeURIComponent(token)}/detail`);
      if (res.data?.success) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Gagal memuat detail persetujuan surat');
    },
    enabled: Boolean(token),
    retry: 1
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Token tidak valid');
      const res = await axiosInstance.post(`/correspondence/surat-keluar/quick-approve/${encodeURIComponent(token)}/approve`);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Gagal menyetujui surat');
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success('Surat panggilan berhasil disetujui & ditandatangani!');
      refetch();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menyetujui surat keluar';
      toast.error(msg);
    }
  });

  const handleApprove = useCallback(() => {
    approveMutation.mutate();
  }, [approveMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Platform Absenta' },
    { label: 'Persetujuan Surat Cepat' }
  ], []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
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
            {error instanceof Error ? error.message : 'Token persetujuan tidak valid, sudah digunakan, atau telah kedaluwarsa.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Portal Persetujuan Dokumen Cepat"
        description="Otorisasi & penerbitan surat dinas resmi sekolah secara instan oleh Kepala Sekolah."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="surat_keluar_quick_approve"
        instruction={{
          title: 'Panduan Otorisasi Quick Approve',
          description: 'Halaman instan bagi Kepala Sekolah untuk memeriksa draf surat panggilan dan memberikan persetujuan tanda tangan digital.',
          items: [
            { text: 'Periksa kesesuaian identitas siswa dan agenda pertemuan yang diajukan Guru BK.' },
            { text: 'Klik tombol [Setujui & Tanda Tangani Surat Panggilan] untuk mengesahkan dokumen.' },
            { text: 'Surat resmi langsung terbit dan dapat diakses oleh pihak wali murid.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="max-w-2xl mx-auto space-y-6 w-full min-w-0 max-w-full">
            {/* Header info */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm w-full min-w-0 max-w-full">
              <div className="flex items-center gap-3 min-w-0">
                {data.sekolah?.logo ? (
                  <img src={data.sekolah.logo} alt="Logo" className="h-10 w-10 object-contain rounded-lg shrink-0" />
                ) : (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verifikasi Pimpinan</h3>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {data.sekolah?.nama || 'Pengaturan Sekolah'}
                  </p>
                </div>
              </div>
              <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shrink-0">
                Draf Surat Keluar
              </Badge>
            </div>

            <AnimatePresence mode="wait">
              {approveMutation.isSuccess ? (
                <motion.div
                  key="success-screen"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-6 w-full min-w-0 max-w-full"
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
                  className="space-y-6 w-full min-w-0 max-w-full"
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
                  <Card className="shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl w-full min-w-0 max-w-full">
                    <CardHeader className="py-4 px-6 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Detail Dokumen Surat Keluar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 uppercase block font-bold text-[10px] tracking-wider mb-0.5">Nomor Surat</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{data.nomor_surat}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase block font-bold text-[10px] tracking-wider mb-0.5">Tanggal Dibuat</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                            {formatDate(data.tanggal_surat)}
                          </span>
                        </div>
                        <div className="col-span-1 sm:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <span className="text-slate-400 uppercase block font-bold text-[10px] tracking-wider mb-0.5">Guru BK / Pembuat Surat</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{data.created_by || 'Guru Bimbingan Konseling'}</span>
                        </div>
                        <div className="col-span-1 sm:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <span className="text-slate-400 uppercase block font-bold text-[10px] tracking-wider mb-0.5">Perihal / Judul</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{data.judul}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Student Info Card */}
                  <Card className="shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl w-full min-w-0 max-w-full">
                    <CardHeader className="py-4 px-6 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                      <GraduationCap className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Siswa Yang Bersangkutan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
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

                  {/* Summon Details Card */}
                  <Card className="shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl w-full min-w-0 max-w-full">
                    <CardHeader className="py-4 px-6 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center gap-2.5">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Agenda &amp; Rencana Pertemuan
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
                            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Tempat Ruangan</span>
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

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="toolbarPrimary"
                      size="toolbar"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                      className="w-full py-4 text-xs font-bold text-white rounded-2xl shadow-xl flex items-center justify-center gap-2 h-auto"
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1 text-white" />
                          Memproses Persetujuan...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Setujui &amp; Tanda Tangani Surat Panggilan
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default SuratKeluarQuickApprovePage;
