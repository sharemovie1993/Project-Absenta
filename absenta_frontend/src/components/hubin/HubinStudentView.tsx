import React, { useMemo } from 'react';
import { 
  MapPin, 
  Clock, 
  Calendar,
  ClipboardList,
  Building2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Navigation2,
  ArrowRight,
  Target,
  History as HistoryIcon
} from 'lucide-react';
import { SectionCard, TabsContent, Button, Input, Textarea } from '../ui';
import { HubinTodayPresensiCards } from './HubinTodayPresensiCards';
import { HubinTimelineLogbookBuilder } from './HubinTimelineLogbookBuilder';
import { HubinStudentJurnalTab } from './HubinStudentJurnalTab';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

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
  location: { lat: number; lng: number; accuracy?: number } | null;
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
}

export const HubinStudentView: React.FC<HubinStudentViewProps> = ({
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
}) => {
  const handlePrintClick = React.useCallback(() => {
    onPrint();
  }, [onPrint]);

  const handleSubmitPortofolio = React.useCallback(() => {
    submitJurnalMutation.mutate(jurnalUrl);
  }, [jurnalUrl, submitJurnalMutation]);

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

  // Analytics
  const presentDays = useMemo(() => rawAbsensiHistory.filter(a => a.status === 'HADIR').length, [rawAbsensiHistory]);
  const activityCount = useMemo(() => parsedTimeline.length, [parsedTimeline]);
  const isCompleteToday = !!(todayAbsensi?.jam_masuk && todayAbsensi?.jam_pulang);

  return (
    <>
      <TabsContent value="record" className="mt-0 space-y-4 animate-fadeIn">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Actions */}
          <div className="lg:col-span-5">
            {isMockLocation && (
              <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex gap-3 text-rose-600 dark:text-rose-400 animate-pulse">
                <AlertTriangle className="shrink-0" size={20} />
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
            />

            {/* Quick Riwayat Link - Compact */}
            <div 
              className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-white border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group cursor-pointer hover:bg-white dark:hover:bg-slate-750 transition-all"
              onClick={handlePrintClick}
            >
              <div className="flex items-center gap-3">
                <HistoryIcon size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Riwayat & Cetak Laporan</span>
              </div>
              <ArrowRight size={14} className="text-slate-400 dark:opacity-50 group-hover:text-indigo-600 dark:group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
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

      <TabsContent value="portofolio" className="mt-0">
        <SectionCard 
          title="Laporan & Portofolio Akhir" 
          icon={ClipboardList}
        >
          <div className="space-y-6 p-4">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <HubinGoogleDriveUploader
                label="File Laporan / Portofolio (PDF/Link Drive)"
                value={jurnalUrl}
                onChange={setJurnalUrl}
                studentEmail={user?.email}
                customFileName={generateCustomFileName('Laporan_Akhir.pdf')}
                folderName={studentPkl?.Siswa?.Kelas?.nama}
              />
              
              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSubmitPortofolio}
                  isLoading={submitJurnalMutation.isPending}
                  disabled={!jurnalUrl || submitJurnalMutation.isPending}
                  className="px-8 font-black uppercase tracking-widest text-xs"
                >
                  Kumpulkan Sekarang
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <h5 className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase mb-2">Status Portofolio</h5>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {studentPkl?.jurnal_json?.file_url ? '✅ Sudah Terunggah' : '❌ Belum Terunggah'}
                </p>
              </div>
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between gap-3">
                <div>
                  <h5 className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase mb-2">Nilai Akhir</h5>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {studentPkl?.nilai_akhir || 'Dalam Proses'}
                  </p>
                </div>
                {studentPkl?.nilai_akhir && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-[10px] h-8 font-black uppercase tracking-wider border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/30"
                    onClick={() => {
                      const apiRoot = (window as any).env?.REACT_APP_API_URL || '';
                      window.open(`${apiRoot}/reports/pdf/pkl/${studentPkl.id}`, '_blank');
                    }}
                  >
                    Unduh Rapor PKL (PDF)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </TabsContent>
    </>
  );
};
