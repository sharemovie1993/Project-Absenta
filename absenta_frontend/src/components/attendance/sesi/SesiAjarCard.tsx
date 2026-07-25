import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  School, 
  Users, 
  Clock, 
  ListTodo, 
  ArrowUpRight 
} from 'lucide-react';
import { Badge, Button, SectionCard } from '../../ui';
import { format } from 'date-fns';

interface SesiAjarCardProps {
  sesi: {
    id: string;
    tanggal: string | Date;
    waktu_mulai: string | Date;
    jenis_kegiatan?: string;
    Guru?: {
      nama_guru?: string;
    };
    Mapel?: {
      nama_mapel?: string;
    };
    Kelas?: {
      nama_kelas?: string;
    };
    ProgresMateri?: {
      judul_materi: string;
      pencapaian_persen: number;
    } | null;
    summary?: {
      HADIR?: number;
      TOTAL?: number;
    };
  };
  onOpenJournal: (sesiId: string, initialData: any) => void;
  onViewDetail: (sesi: any) => void;
  isManager?: boolean;
  isReadOnly?: boolean;
}

export const SesiAjarCard: React.FC<SesiAjarCardProps> = ({
  sesi,
  onOpenJournal,
  onViewDetail,
  isManager = false,
  isReadOnly = false,
}) => {
  const formatTime = (timeStr: string | Date) => {
    try {
      return format(new Date(timeStr), 'HH:mm');
    } catch {
      return '-';
    }
  };

  return (
    <SectionCard
      noPadding
      fullWidth
      className="group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl"
    >
      <div className="p-6">
        {/* Card Header: Badge Status and ID */}
        <div className="flex justify-between items-start mb-6">
          <Badge
            className={`px-4 py-1.5 rounded-xl font-black text-[9px] tracking-widest uppercase flex items-center gap-2 border-none ${
              sesi.ProgresMateri ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            {sesi.ProgresMateri ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {sesi.ProgresMateri ? 'Tuntas' : 'Draft'}
          </Badge>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
            #{sesi.id.slice(0, 8)}
          </span>
        </div>

        {/* Subject and Class */}
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
            {sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan || 'Sesi Mandiri'}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <School className="w-3.5 h-3.5 text-blue-400" /> {sesi.Kelas?.nama_kelas || 'Umum'}
            </span>
            {isManager && sesi.Guru?.nama_guru && (
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-black whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                👨‍🏫 {sesi.Guru.nama_guru}
              </span>
            )}
          </div>
        </div>

        {/* KBM Journal Progress Section */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 mb-6 relative overflow-hidden group/materi">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Materi KBM</p>
          {sesi.ProgresMateri ? (
            <div className="space-y-3">
              <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight line-clamp-2">
                {sesi.ProgresMateri.judul_materi}
              </h4>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sesi.ProgresMateri.pencapaian_persen}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <span className="text-[9px] font-black text-blue-600">
                  {sesi.ProgresMateri.pencapaian_persen}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic font-bold uppercase tracking-tight">
              Belum ada jurnal materi hari ini.
            </p>
          )}
        </div>

        {/* Attendance Summary & Time */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50 mb-6">
          <div className="flex items-center gap-2">
            <Users size={12} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest whitespace-nowrap">
              {sesi.summary?.HADIR || 0} Siswa Hadir
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" /> {formatTime(sesi.waktu_mulai)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            className={`flex-1 h-11 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg transition-all whitespace-nowrap ${
              isReadOnly
                ? 'bg-slate-800 text-white shadow-none hover:bg-slate-700'
                : sesi.ProgresMateri
                ? 'bg-slate-100 text-slate-900 shadow-none hover:bg-slate-200'
                : 'bg-amber-500 text-white shadow-amber-500/20'
            }`}
            onClick={() => onOpenJournal(sesi.id, sesi.ProgresMateri || null)}
          >
            <ListTodo size={14} /> {isReadOnly ? 'Lihat Jurnal' : (sesi.ProgresMateri ? 'Edit Jurnal' : 'Isi Jurnal')}
          </Button>
          <Button
            variant="outline"
            className="w-11 h-11 rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
            onClick={() => onViewDetail(sesi)}
          >
            <ArrowUpRight size={18} />
          </Button>
        </div>
      </div>
    </SectionCard>
  );
};
