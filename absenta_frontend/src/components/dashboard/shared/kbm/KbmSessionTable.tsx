import React from 'react';
import { Badge } from '../../../ui';
import { motion } from 'framer-motion';

interface KbmSessionTableProps {
  sessions: any[];
  onSelectSession: (session: any) => void;
  formatTime: (iso?: string) => string;
}

export const KbmSessionTable = React.memo<KbmSessionTableProps>(({
  sessions,
  onSelectSession,
  formatTime
}) => {
  return (
    <motion.div
      key="table-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kelas</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mapel</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Guru Pengampu</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Guru</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Presensi</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Jurnal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {sessions.map((sesi) => (
              <tr 
                key={sesi.id} 
                onClick={() => onSelectSession(sesi)}
                className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-900 dark:text-white">{formatTime(sesi.waktu_mulai)}</span>
                    <Badge 
                      variant={sesi.isLive ? 'success' : sesi.isFinished ? 'secondary' : 'info'} 
                      size="sm" 
                      className="text-[7px] px-1 py-0 mt-1 w-fit"
                    >
                      {sesi.isLive ? 'LIVE' : sesi.isFinished ? 'DONE' : 'SOON'}
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{sesi.Kelas?.nama_kelas || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 line-clamp-1">{sesi.Mapel?.nama_mapel || '-'}</span>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-black text-gray-500">
                        {sesi.Guru?.nama_guru?.charAt(0) || '-'}
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{sesi.Guru?.nama_guru || '-'}</span>
                   </div>
                </td>
                <td className="px-6 py-4">
                   {sesi._summary?.teacherStatus === 'TEPAT_WAKTU' && <Badge variant="success" className="text-[8px] font-black">TEPAT WAKTU</Badge>}
                   {sesi._summary?.teacherStatus === 'TERLAMBAT' && <Badge variant="warning" className="text-[8px] font-black">TERLAMBAT</Badge>}
                   {sesi._summary?.teacherStatus === 'ALPA' && <Badge variant="error" className="text-[8px] font-black">ALPA</Badge>}
                   {sesi._summary?.teacherStatus === 'BELUM_TAP' && <Badge variant="info" className="text-[8px] font-black animate-pulse">BELUM TAP</Badge>}
                   {sesi._summary?.teacherStatus === 'BELUM_MULAI' && <Badge variant="secondary" className="text-[8px] font-black">BELUM MULAI</Badge>}
                   {!sesi._summary?.teacherStatus && <Badge variant="secondary" className="text-[8px] font-black">-</Badge>}
                </td>
                <td className="px-6 py-4 text-center">
                   <span className="text-xs font-black text-gray-600 dark:text-gray-400">{sesi._summary?.hadir ?? 0} / {sesi._summary?.total ?? 0}</span>
                </td>
                <td className="px-6 py-4">
                   {sesi.ProgresMateri ? (
                     <div className="flex items-center gap-2">
                       <div className="flex gap-0.5">
                          {[1, 2, 3].map((i) => {
                            const descLen = String(sesi.ProgresMateri?.deskripsi || '').length;
                            const quality = descLen > 100 ? 3 : descLen > 20 ? 2 : 1;
                            return <div key={i} className={`w-1.5 h-1 rounded-full ${i <= quality ? (quality === 3 ? 'bg-emerald-500' : quality === 2 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-gray-200'}`} />;
                          })}
                       </div>
                       <span className="text-[10px] font-bold text-gray-500 truncate max-w-[100px]">{sesi.ProgresMateri.judul_materi || '-'}</span>
                     </div>
                   ) : <span className="text-[9px] font-black text-gray-300 uppercase">KOSONG</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});

KbmSessionTable.displayName = 'KbmSessionTable';
