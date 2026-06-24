import React from 'react';
import { FileText, RefreshCw, AlertTriangle, ShieldCheck, Printer, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SectionCard, Button, Input } from '../ui';
import { SimpleFormField } from '../ui/SimpleFormField';
import { format, parseISO, isValid } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { renderDailyTimeline } from '../../utils/hubinUtils';
import { PklStatusBadge } from './PklStatusBadge';

interface JurnalJson {
  status?: 'MENUNGGU_REVIEW' | 'REVISI' | 'DISETUJUI';
  catatan_revisi?: string;
}

interface StudentPklJurnal {
  Pembimbing?: { nama_guru?: string };
  jurnal_json?: JurnalJson;
}

interface SubmitJurnalMutation {
  mutate: (url: string) => void;
  isPending: boolean;
}

interface AbsensiItem {
  id: string;
  tanggal: string;
  status?: string;
  is_verified?: boolean;
}

interface HubinStudentJurnalTabProps {
  studentPkl: StudentPklJurnal | null;
  jurnalUrl: string;
  setJurnalUrl: (val: string) => void;
  submitJurnalMutation: SubmitJurnalMutation;
  onPrint?: () => void;
  rawAbsensiHistory: AbsensiItem[];
}

export const HubinStudentJurnalTab: React.FC<HubinStudentJurnalTabProps> = ({
  studentPkl,
  jurnalUrl,
  setJurnalUrl,
  submitJurnalMutation,
  onPrint,
  rawAbsensiHistory
}) => {
  const handleSubmitJurnal = React.useCallback(() => {
    if (!jurnalUrl.trim().startsWith('http')) {
      toast.error('Harap masukkan alamat tautan link (URL) yang valid!');
      return;
    }
    submitJurnalMutation.mutate(jurnalUrl);
  }, [jurnalUrl, submitJurnalMutation]);

  return (
    <div className="space-y-8">
      <SectionCard 
        title="Riwayat & Cetak Laporan Jurnal PKL" 
        icon={FileText} 
        fullWidth
      >
        <div className="space-y-6">
          {/* Quick Print Banner */}
          <div className="p-6 bg-indigo-600 rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
            <div className="relative z-10">
              <h4 className="text-lg font-black leading-tight mb-1">Cetak Laporan Jurnal Harian</h4>
              <p className="text-indigo-100 text-xs font-medium opacity-90">Unduh hasil rekapitulasi seluruh aktivitas PKL Anda dalam format PDF resmi.</p>
            </div>
            <Button
              onClick={onPrint}
              className="relative z-10 bg-white text-indigo-600 hover:bg-indigo-50 font-black px-8 py-6 rounded-xl shadow-lg flex items-center gap-3 shrink-0 uppercase text-xs tracking-widest"
            >
              <Printer size={20} />
              Cetak Sekarang
            </Button>
            
            {/* Decorative background elements */}
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Printer size={120} />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          </div>

          {/* History List */}
          <div className="space-y-4">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Riwayat Jurnal Harian</h5>
            <div className="space-y-3">
              {rawAbsensiHistory && rawAbsensiHistory.length > 0 ? (
                [...rawAbsensiHistory].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())?.map((abs, idx) => {
                  return (
                    <div key={abs.id || idx} className="p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex gap-4 w-full">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{format(new Date(abs.tanggal), 'MMM', { locale: localeID })}</span>
                            <span className="text-lg font-black text-slate-700 dark:text-slate-200 leading-none mt-1">{format(new Date(abs.tanggal), 'dd')}</span>
                          </div>
                          <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{format(new Date(abs.tanggal), 'EEEE, dd MMMM yyyy', { locale: localeID })}</span>
                                {abs.is_verified ? (
                                  <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-100/50 uppercase">Terverifikasi</span>
                                ) : (
                                  <span className="text-[9px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-100/50 uppercase">Pending</span>
                                )}
                              </div>
                              <PklStatusBadge status={abs.status || 'HADIR'} />
                            </div>
                            
                            <div className="pt-1">
                              {renderDailyTimeline(abs)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm mb-4">
                    <FileText className="text-slate-300" size={32} />
                  </div>
                  <h6 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase mb-1">Belum Ada Riwayat</h6>
                  <p className="text-xs text-slate-400 font-medium max-w-[200px]">Silakan lakukan presensi hari ini untuk memulai jurnal kegiatan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pengumpulan Jurnal & Portofolio PKL Akhir" icon={ShieldCheck} fullWidth>
        <div className="space-y-6">
          {/* Kurikulum Merdeka guidelines */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-indigo-950/20 p-5 rounded-xl border border-blue-100 dark:border-indigo-900/30 flex gap-4 text-blue-800 dark:text-indigo-350 shadow-sm leading-relaxed">
            <FileText className="shrink-0 text-indigo-500 mt-1" size={24} />
            <div className="text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold text-sm text-indigo-900 dark:text-indigo-350">Panduan Administrasi Kurikulum Merdeka SMK</p>
              <p>Berdasarkan panduan Kurikulum Merdeka, penilaian akhir PKL Anda tidak lagi berbasis Laporan PKL fisik tebal. Evaluasi akhir dinilai berdasarkan:</p>
              <ul className="list-decimal list-inside pl-1 space-y-1 text-slate-600 dark:text-slate-400">
                <li>Jurnal harian lengkap yang terverifikasi industri (Daftar di atas).</li>
                <li>Portofolio Karya / Dokumen Hasil Kerja Terbaik selama magang di DUDI.</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Silakan gabungkan seluruh berkas portofolio Anda dalam format PDF, unggah ke Google Drive/Dropbox, dan kumpulkan tautan berkasnya di bawah ini.</p>
            </div>
          </div>

          {/* Status Pengumpulan */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Pengumpulan Portofolio</p>
              <p className="text-xs text-slate-550 mt-0.5 font-medium">Guru Pembimbing: {studentPkl?.Pembimbing?.nama_guru || '-'}</p>
            </div>
            <div>
              {!studentPkl?.jurnal_json?.status ? (
                <span className="text-xs font-semibold bg-slate-150 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-full border border-slate-200/50">
                  Belum Dikumpulkan
                </span>
              ) : studentPkl.jurnal_json.status === 'MENUNGGU_REVIEW' ? (
                <span className="text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-100/50 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Menunggu Review Guru
                </span>
              ) : studentPkl.jurnal_json.status === 'REVISI' ? (
                <span className="text-xs font-semibold bg-rose-50 text-rose-650 dark:bg-rose-950/20 dark:text-rose-450 px-3 py-1 rounded-full border border-rose-100/50 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Perlu Revisi
                </span>
              ) : (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100/50 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Jurnal Disetujui
                </span>
              )}
            </div>
          </div>

          {/* Revision feedback */}
          {studentPkl?.jurnal_json?.catatan_revisi && (
            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 flex gap-3 text-rose-800 dark:text-rose-450 animate-fadeIn">
              <AlertTriangle className="shrink-0 text-rose-500 mt-0.5" size={18} />
              <div className="text-xs space-y-1">
                <p className="font-bold">Umpan Balik Guru Pembimbing</p>
                <p className="italic">"{studentPkl.jurnal_json.catatan_revisi}"</p>
              </div>
            </div>
          )}

          {/* Form submission */}
          <div className="space-y-4">
            <SimpleFormField htmlFor="student-jurnal-url" label="Tautan Berkas Jurnal & Portofolio Akhir (PDF)" required>
              <Input 
                id="student-jurnal-url"
                placeholder="https://drive.google.com/file/d/... (Pastikan akses diset publik/siapa saja memiliki link)"
                value={jurnalUrl}
                onChange={(e) => setJurnalUrl(e.target.value)}
                disabled={studentPkl?.jurnal_json?.status === 'DISETUJUI'}
                leftIcon={<FileText />}
              />
            </SimpleFormField>

            {studentPkl?.jurnal_json?.status !== 'DISETUJUI' && (
              <Button
                onClick={handleSubmitJurnal}
                disabled={submitJurnalMutation.isPending || !jurnalUrl.trim()}
                isLoading={submitJurnalMutation.isPending}
                variant="primary"
                className="w-full font-bold uppercase tracking-wider py-3 shadow-lg shadow-indigo-100 dark:shadow-none"
              >
                {studentPkl?.jurnal_json?.status === 'REVISI' ? 'Kumpulkan Revisi Jurnal' : 'Kumpulkan Jurnal & Portofolio'}
              </Button>
            )}

            {studentPkl?.jurnal_json?.status === 'DISETUJUI' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex gap-3 text-emerald-800 dark:text-emerald-450 items-center justify-center">
                <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                <p className="text-xs font-bold">Administrasi PKL Anda telah selesai dan berkas disetujui!</p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
