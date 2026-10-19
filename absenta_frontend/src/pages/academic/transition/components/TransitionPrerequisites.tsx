import React from 'react';
import { SectionCard } from '../../../../components/ui';
import { CheckCircle2, XCircle, ArrowRight, ExternalLink, Settings, Info, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui';
import type { TahunPelajaran, Semester } from '../../../../types/academic';
import { isChronologicallyAfter } from '../utils';

interface StepAction {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface StepItem {
  label: string;
  valid: boolean;
  message: string;
  action?: StepAction;
}

interface Props {
  tahunAktif?: TahunPelajaran;
  semesterAktif?: Semester;
  tahunBaru?: TahunPelajaran;
  semesterBaruGanjil?: boolean;
  activeSemester?: Semester;
  tahunBaruSelected?: boolean;
  onCreateTapel?: () => void;
}

const TransitionPrerequisites: React.FC<Props> = React.memo(({
  tahunAktif,
  semesterAktif,
  tahunBaru,
  semesterBaruGanjil = false,
  activeSemester,
  onCreateTapel,
}) => {
  const currentSemester = semesterAktif || activeSemester;
  const isSemesterGenap = currentSemester 
    ? ['genap', '2'].includes(String(currentSemester.nama_semester).toLowerCase()) 
    : false;

  const isChronological = Boolean(
    tahunAktif?.tahun && 
    tahunBaru?.tahun && 
    isChronologicallyAfter(tahunAktif.tahun, tahunBaru.tahun)
  );

  const steps: StepItem[] = [
    {
      label: 'Tahun Pelajaran Lama',
      valid: !!tahunAktif,
      message: tahunAktif ? `Aktif: ${tahunAktif.tahun}` : 'Belum ada tahun aktif'
    },
    {
      label: 'Semester Lama (Aktif)',
      valid: !!currentSemester,
      message: currentSemester ? `Aktif: ${currentSemester.nama_semester}` : 'Belum ada semester aktif'
    },
    {
      label: 'Syarat Kenaikan',
      valid: isSemesterGenap,
      message: isSemesterGenap ? 'Sudah Semester Genap' : 'Kenaikan kelas dilakukan di akhir Semester Genap.',
      action: !isSemesterGenap ? { label: 'Lihat Semester', path: '/academic/semester' } : undefined
    },
    {
      label: 'Tahun Pelajaran Baru',
      valid: !!tahunBaru && isChronological,
      message: !tahunBaru 
        ? 'Harap buat/pilih Tahun Pelajaran baru.' 
        : !isChronological 
        ? `Salah: ${tahunBaru.tahun} tidak boleh lebih lama dari ${tahunAktif?.tahun || 'tahun aktif'}.`
        : `Siap: ${tahunBaru.tahun}`,
      action: (!tahunBaru || !isChronological) ? { 
        label: 'Buat Tahun Baru', 
        onClick: onCreateTapel,
        path: '/academic/tahun-pelajaran' 
      } : undefined
    },
    {
      label: 'Semester Baru (Ganjil)',
      valid: semesterBaruGanjil && isChronological,
      message: !tahunBaru
        ? 'Pilih tahun pelajaran baru dahulu.'
        : !isChronological
        ? 'Tahun tujuan belum valid.'
        : semesterBaruGanjil 
        ? 'Semester Ganjil tersedia' 
        : 'Harap buat Semester Ganjil di tahun baru.',
      action: (!semesterBaruGanjil && isChronological) ? { label: 'Atur Semester', path: '/academic/semester' } : undefined
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
      {steps?.map((step, idx) => (
        <SectionCard 
          key={idx} 
          fullWidth
          noPadding
          className={`relative overflow-hidden transition-all duration-300 ${
            step.valid 
              ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' 
              : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30'
          }`}
        >
          {/* Status Indicator Bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${step.valid ? 'bg-green-500' : 'bg-rose-500'}`} />
          
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
               <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                 step.valid ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
               }`}>
                 {step.valid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
               </div>
               <span className={`text-[10px] font-black uppercase tracking-widest ${step.valid ? 'text-green-600' : 'text-rose-600'}`}>
                  {step.valid ? 'OK' : 'WAJIB'}
               </span>
            </div>

            <div className="space-y-1 mb-4 flex-1">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{step.label}</h4>
               <p className={`text-xs font-bold leading-tight ${step.valid ? 'text-slate-800 dark:text-slate-200' : 'text-rose-900 dark:text-rose-400'}`}>
                 {step.message}
               </p>
            </div>

            {!step.valid && step.action && (
              <div className="mt-auto">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    if (step.action?.onClick) {
                      step.action.onClick();
                    } else if (step.action?.path) {
                      window.open(step.action.path, '_blank');
                    }
                  }}
                  className="w-full justify-between h-9 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/30 px-3 rounded-xl border border-rose-200 dark:border-rose-800"
                >
                  <span>{step.action.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </SectionCard>
      ))}
    </div>
  );
});

TransitionPrerequisites.displayName = 'TransitionPrerequisites';
export default TransitionPrerequisites;
