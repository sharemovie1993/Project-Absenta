import React, { useMemo } from 'react';
import { ClipboardList, Building2, AlertCircle, AlertTriangle, ArrowRight, History as HistoryIcon, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { SectionCard, TabsContent, Button } from '../ui';
import { HubinTodayPresensiCards } from './HubinTodayPresensiCards';
import { HubinTimelineLogbookBuilder } from './HubinTimelineLogbookBuilder';
import { HubinStudentJurnalTab } from './HubinStudentJurnalTab';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';

interface ViewUser {
  full_name?: string;
  email?: string;
}
interface JurnalInfo {
  status?: string;
  catatan_revisi?: string;
  file_url?: string;
}
interface StudentPklView {
  id: string;
  nilai_akhir?: string | number;
  jurnal_json?: JurnalInfo;
  Siswa?: {
    Kelas?: {
      nama?: string;
    };
  };
}
interface TodayAbsensi {
  jam_masuk?: string;
  jam_pulang?: string;
}
interface ViewMutation {
  mutate: (variables: any) => void;
  mutateAsync: (variables: any) => Promise<any>;
  isPending: boolean;
}
interface TimelineItem {
  id: string;
  text: string;
  time: string;
}
interface AbsensiRecord {
  id: string;
  tanggal: string;
  status: string;
}
interface HubinStudentViewProps {
  user: ViewUser | null;
  studentPkl: StudentPklView | null;
  todayAbsensi: TodayAbsensi | null;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
  isMockLocation?: boolean;
  kegiatan: string;
  setKegiatan: (val: string) => void;
  fotoUrl: string;
  setFotoUrl: (val: string) => void;
  checkInMutation: ViewMutation;
  checkOutMutation: ViewMutation;
  onRefreshLocation: () => void;
  rawAbsensiHistory: AbsensiRecord[];
  parsedTimeline: TimelineItem[];
  onDeleteActivity: (idx: number) => void;
  onOpenAddModal: () => void;
  jurnalUrl: string;
  setJurnalUrl: (val: string) => void;
  submitJurnalMutation: ViewMutation;
  stats: any[];
  generateCustomFileName: (suffix: string) => string;
  onPrint: () => void;
  isPklAktif?: boolean;
}

export const HubinStudentView: React.FC<HubinStudentViewProps> = React.memo(({
  user,
  studentPkl,
  todayAbsensi,
  location,
  isMockLocation,
  kegiatan,
  setKegiatan,
  fotoUrl,
  setFotoUrl,
  checkInMutation,
  checkOutMutation,
  onRefreshLocation,
  rawAbsensiHistory,
  parsedTimeline,
  onDeleteActivity,
  onOpenAddModal,
  jurnalUrl,
  setJurnalUrl,
  submitJurnalMutation,
  stats,
  generateCustomFileName,
  onPrint,
  isPklAktif = true,
}) => {
  const handlePrintClick = React.useCallback(() => {
    onPrint();
  }, [onPrint]);

  const handleSubmitPortofolio = React.useCallback(() => {
    submitJurnalMutation.mutate(jurnalUrl);
  }, [jurnalUrl, submitJurnalMutation]);

  // Analytics
  const presentDays = useMemo(() => rawAbsensiHistory.filter(a => a.status === 'HADIR').length, [rawAbsensiHistory]);
  const activityCount = useMemo(() => parsedTimeline.length, [parsedTimeline]);

  if (!studentPkl) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
          <Building2 size={40} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase">Belum Ada Penempatan</h3>
          <p className="text-xs text-slate-500 font-medium max-w-md">
            Data penempatan PKL Anda belum tersedia di sistem. Silakan hubungi koordinator PKL atau guru pembimbing Anda.
          </p>
        </div>
      </div>
    );
  }

  const isCompleteToday = !!(todayAbsensi?.jam_masuk && todayAbsensi?.jam_pulang);

  return (
    <>
      <TabsContent value="record" className="mt-0 space-y-4 animate-fadeIn">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-start">
          {/* Left Column: Actions */}
          <div className="lg:col-span-5">
            {/* Banner: PKL sudah berakhir */}
            {!isPklAktif && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex gap-2.5 text-amber-700 dark:text-amber-400">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <div className="text-xs">
                  <p className="font-black uppercase tracking-tight">PKL Telah Berakhir</p>
                  <p className="font-medium mt-0.5">Masa PKL Anda sudah selesai. Anda hanya dapat melihat riwayat absensi.</p>
                </div>
              </div>
            )}

            {/* Banner: Fake GPS */}
            {isMockLocation && (
              <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex gap-2.5 text-rose-600 dark:text-rose-400 animate-pulse">
                <AlertTriangle className="shrink-0" size={16} />
                <div className="text-xs">
                  <p className="font-black uppercase tracking-tight">Security Alert: Fake GPS</p>
                  <p className="font-medium">Sistem mendeteksi penggunaan lokasi palsu. Presensi dinonaktifkan demi keamanan.</p>
                </div>
              </div>
            )}

            <HubinTodayPresensiCards
              todayAbsensi={todayAbsensi}
              studentPkl={studentPkl}
              location={location}
              isMockLocation={isMockLocation}
              kegiatan={kegiatan}
              checkInMutation={checkInMutation}
              checkOutMutation={checkOutMutation}
              studentName={user?.full_name}
              onRefreshLocation={onRefreshLocation}
              isPklAktif={isPklAktif}
            />

            {/* Quick Riwayat Link - Ultra-Compact Strip */}
            <button
              type="button"
              className="mt-2.5 w-full h-9 px-3.5 bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between group cursor-pointer transition-all"
              onClick={handlePrintClick}
            >
              <div className="flex items-center gap-2">
                <HistoryIcon size={14} className="text-indigo-500" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Riwayat &amp; Cetak Laporan</span>
              </div>
              <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Right Column: Timeline Logbook */}
          <div className="lg:col-span-7">
            <HubinTimelineLogbookBuilder
              parsedTimeline={parsedTimeline}
              handleDeleteActivity={onDeleteActivity}
              onOpenAddModal={onOpenAddModal}
              todayAbsensi={todayAbsensi}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="jurnal" className="mt-0">
        <HubinStudentJurnalTab
          studentPkl={studentPkl as any}
          jurnalUrl={jurnalUrl}
          setJurnalUrl={setJurnalUrl}
          submitJurnalMutation={submitJurnalMutation}
          onPrint={onPrint}
          rawAbsensiHistory={rawAbsensiHistory}
        />
      </TabsContent>

      <TabsContent value="portofolio" className="mt-0 space-y-3">
        {/* 1. Status Ringkas (2 Kolom di Mobile & Desktop) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Status Portofolio */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-1.5">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Status Portofolio
            </span>
            <div className="flex items-center gap-1.5">
              {studentPkl?.jurnal_json?.file_url ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
                  <CheckCircle2 size={11} /> Sudah Terunggah
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60">
                  <AlertCircle size={11} /> Belum Terunggah
                </span>
              )}
            </div>
          </div>

          {/* Nilai Akhir & Unduh Rapor */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-1.5">
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Nilai Akhir Magang
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs sm:text-sm font-black ${studentPkl?.nilai_akhir ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {studentPkl?.nilai_akhir || 'Dalam Proses'}
              </span>
              {studentPkl?.nilai_akhir && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6.5 px-2 rounded-lg text-[9px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 shrink-0"
                  onClick={() => {
                    const apiRoot = (window as any).env?.REACT_APP_API_URL || '';
                    window.open(`${apiRoot}/reports/pdf/pkl/${studentPkl.id}`, '_blank');
                  }}
                >
                  <FileText size={10} className="mr-1" /> Unduh Rapor
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Catatan Revisi Pembimbing (Jika ada) */}
        {studentPkl?.jurnal_json?.catatan_revisi && (
          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h6 className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                Catatan Revisi Pembimbing:
              </h6>
              <p className="text-xs text-amber-900/80 dark:text-amber-200 mt-0.5 leading-relaxed">
                {studentPkl.jurnal_json.catatan_revisi}
              </p>
            </div>
          </div>
        )}

        {/* 3. Form Unggah Laporan Akhir (Clean & Compact) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                Unggah Laporan Akhir PKL
              </h4>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-none">
                Format PDF atau Dokumen Hasil Magang
              </p>
            </div>
            {studentPkl?.jurnal_json?.file_url && (
              <a
                href={studentPkl.jurnal_json.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Lihat Berkas</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          <HubinGoogleDriveUploader
            label="Pilih File Laporan Akhir (PDF / Dokumen)"
            value={jurnalUrl}
            onChange={setJurnalUrl}
            studentEmail={user?.email}
            customFileName={generateCustomFileName('Laporan_Akhir.pdf')}
            folderName={studentPkl?.Siswa?.Kelas?.nama}
            accept="application/pdf,image/*,.doc,.docx"
            compact={true}
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[10px] text-slate-400 font-medium truncate">
              {jurnalUrl ? 'Berkas baru dipilih' : studentPkl?.jurnal_json?.file_url ? 'Berkas tersimpan di sistem' : 'Belum ada berkas dipilih'}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitPortofolio}
              isLoading={submitJurnalMutation.isPending}
              disabled={!jurnalUrl || submitJurnalMutation.isPending}
              className="h-8 px-4 font-black uppercase tracking-wider text-[10px] sm:text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
            >
              Kumpulkan Sekarang
            </Button>
          </div>
        </div>
      </TabsContent>
    </>
  );
});