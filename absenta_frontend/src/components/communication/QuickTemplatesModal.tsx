import React from 'react';
import { 
  XMarkIcon, 
  BoltIcon, 
  ClockIcon, 
  UserGroupIcon, 
  AcademicCapIcon, 
  HeartIcon 
} from '@heroicons/react/24/outline';

interface QuickTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateText: string) => void;
}

interface TemplateCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  templates: Array<{ title: string; text: string }>;
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    title: 'Piket Harian & Ketertiban',
    icon: ClockIcon,
    templates: [
      {
        title: 'Konfirmasi Siswa Terlambat',
        text: 'Pemberitahuan: Siswa yang bersangkutan tercatat terlambat hadir di sekolah hari ini. Mohon izin konfirmasi kehadiran dan pembinaan wali kelas.'
      },
      {
        title: 'Panggilan Siswa ke Ruang Piket',
        text: 'Mohon izin untuk memanggil siswa ke ruang piket pada jam istirahat untuk koordinasi surat izin keluar/dispensasi.'
      },
      {
        title: 'Izin Meninggalkan Sekolah',
        text: 'Siswa atas nama yang bersangkutan telah diberikan izin pulang lebih awal karena kondisi sakit/keperluan keluarga mendesak dengan persetujuan piket.'
      }
    ]
  },
  {
    title: 'Wali Kelas & Orang Tua',
    icon: UserGroupIcon,
    templates: [
      {
        title: 'Pemberitahuan Ketidakhadiran (Alpa)',
        text: 'Pemberitahuan Wali Kelas: Ananda hari ini tercatat tidak hadir tanpa keterangan di kelas. Mohon bapak/ibu orang tua dapat memberikan informasi atau surat keterangan sakit/izin.'
      },
      {
        title: 'Pengumuman Rapat Orang Tua',
        text: 'Yth. Bapak/Ibu Orang Tua/Wali Murid, kami mengundang bapak/ibu untuk menghadiri pertemuan koordinasi akademik pada hari dan tanggal yang telah dijadwalkan.'
      },
      {
        title: 'Apresiasi Perkembangan Belajar',
        text: 'Alhamdulillah, ananda menunjukkan peningkatan kedisiplinan dan semangat belajar yang sangat baik minggu ini di kelas. Terima kasih atas bimbingan bapak/ibu di rumah.'
      }
    ]
  },
  {
    title: 'Guru Pengajar & KBM',
    icon: AcademicCapIcon,
    templates: [
      {
        title: 'Izin Tugas Dinas Luar',
        text: 'Izin menyampaikan kepada petugas piket & kurikulum bahwa saya berhalangan mengajar langsung di kelas karena penugasan dinas luar. Lembar kerja siswa telah disiapkan secara mandiri.'
      },
      {
        title: 'Tukar Jam Mengajar',
        text: 'Mohon konfirmasi kesediaan untuk pertukaran jam mengajar pada sesi KBM hari ini sesuai jadwal yang telah disepakati bersama.'
      }
    ]
  },
  {
    title: 'Bimbingan Konseling (BK)',
    icon: HeartIcon,
    templates: [
      {
        title: 'Undangan Konseling Siswa',
        text: 'Undangan Bimbingan Konseling: Diharapkan kehadiran ananda di ruang BK pada jam istirahat untuk sesi konsultasi dan pemetaan minat bakat.'
      },
      {
        title: 'Undangan Konsultasi Orang Tua',
        text: 'Yth. Orang Tua/Wali Siswa, kami mengundang bapak/ibu untuk berdiskusi bersama tim BK sekolah terkait rencana studi lanjutan dan perkembangan putra/putri.'
      }
    ]
  }
];

export const QuickTemplatesModal: React.FC<QuickTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BoltIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Template Pesan Instan Cepat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih template pesan siap pakai tanpa perlu mengetik manual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* List of Templates */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {TEMPLATE_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx} className={idx > 0 ? 'pt-4' : ''}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {cat.title}
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {cat.templates.map((tpl, tplIdx) => (
                    <button
                      key={tplIdx}
                      onClick={() => {
                        onSelectTemplate(tpl.text);
                        onClose();
                      }}
                      className="text-left p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {tpl.title}
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Gunakan ➔
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {tpl.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
