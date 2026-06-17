import React, { useEffect, useState } from 'react';
import { Badge, Timeline, TimelineItem, Loader, Alert } from '../../ui';
import { getSiswaHistory, type SiswaHistory as SiswaHistoryType } from '../../../api/academic/siswa.api';
import { Calendar, GraduationCap, School, Info } from 'lucide-react';

interface SiswaHistoryProps {
  siswaId: string;
}

export const SiswaHistory: React.FC<SiswaHistoryProps> = ({ siswaId }) => {
  const [history, setHistory] = useState<SiswaHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getSiswaHistory(siswaId);
        // Sort history by year and semester descending
        const sortedData = [...data].sort((a, b) => {
          const yearA = a.tahunPelajaran?.tahun || '';
          const yearB = b.tahunPelajaran?.tahun || '';
          if (yearA !== yearB) return yearB.localeCompare(yearA);
          return (b.semester?.nama_semester || '').localeCompare(a.semester?.nama_semester || '');
        });
        setHistory(sortedData);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat riwayat');
      } finally {
        setLoading(false);
      }
    };

    if (siswaId) {
      fetchHistory();
    }
  }, [siswaId]);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <Loader className="mb-4" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menelusuri Arsip...</p>
    </div>
  );
  
  if (error) return <Alert variant="destructive" className="rounded-xl border-dashed">{error}</Alert>;

  if (!history.length) return (
    <div className="py-20 flex flex-col items-center justify-center opacity-50">
      <Info className="w-10 h-10 text-slate-300 mb-4" />
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Belum ada riwayat akademik</p>
    </div>
  );

  return (
    <div className="px-1">

      <Timeline className="px-2">
        {history.map((item, index) => {
          const isAktif = item.status === 'AKTIF';
          const isNaik = item.status === 'NAIK';
          const status = isAktif ? 'success' : (isNaik ? 'info' : 'warning');
          
          return (
            <TimelineItem
              key={item.id}
              isLast={index === history.length - 1}
              status={status}
              icon={isAktif ? <GraduationCap size={12} /> : (isNaik ? <School size={12} /> : null)}
              title={
                <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-black">{item.tahunPelajaran?.tahun || 'N/A'}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{item.semester?.nama_semester || 'N/A'}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                    <School className="w-3 h-3 opacity-50" />
                    <span>Kelas <span className="font-bold text-slate-900 dark:text-slate-100">{item.kelas?.nama_kelas || '-'}</span></span>
                  </div>
                  <Badge variant={status} className="ml-auto text-[8px] h-4 font-black tracking-widest px-1.5 rounded">
                    {item.status}
                  </Badge>
                </div>
              }
              time={item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            />
          );
        })}
      </Timeline>
    </div>
  );
};

