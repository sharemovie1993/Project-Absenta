import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Timeline, TimelineItem } from '../ui/Timeline';
import { Loader } from '../ui/Loader';
import { Search, History, CheckCircle, LogIn, LogOut } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';

interface PiketHistoryProps {
  dailyPermits: IzinKeluarSiswa[];
  historySearch: string;
  setHistorySearch: (val: string) => void;
  filteredHistory: IzinKeluarSiswa[];
  loadingPermits: boolean;
}

export const PiketHistory: React.FC<PiketHistoryProps> = React.memo(({
  dailyPermits,
  historySearch,
  setHistorySearch,
  filteredHistory,
  loadingPermits
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Timeline Left side */}
      <div className="lg:col-span-7">
        <Card className="p-8 rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">Alur Keluar Masuk Hari Ini</h3>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Kronologis</Badge>
          </div>

          {loadingPermits ? (
            <div className="py-20 flex items-center justify-center"><Loader /></div>
          ) : (dailyPermits?.length || 0) > 0 ? (
            <Timeline>
              {dailyPermits?.map((p, idx) => {
                const statusColors: Record<string, 'success' | 'info' | 'warning'> = {
                  'DISETUJUI': 'warning',
                  'KEMBALI': 'success'
                };
                const statusLabels: Record<string, string> = {
                  'DISETUJUI': 'DI LUAR SEKOLAH',
                  'KEMBALI': 'SUDAH KEMBALI'
                };
                return (
                  <TimelineItem
                    key={p.id}
                    title={`${p.SiswaAkademik?.siswa.nama_siswa} (${p.SiswaAkademik?.kelas?.nama_kelas || '-'})`}
                    time={new Date(p.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    status={statusColors[p.status] || 'info'}
                    icon={p.status === 'KEMBALI' ? <LogIn size={10} /> : <LogOut size={10} />}
                    subtitle={
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[8px] font-black tracking-widest text-indigo-500 border-none px-0 uppercase">{p.tipe_izin === 'PULANG_AWAL' ? 'PULANG CEPAT' : 'IZIN SEMENTARA'}</Badge>
                        <span className="text-gray-300">•</span>
                        <Badge size="sm" variant={p.status === 'KEMBALI' ? 'success' : 'warning'} className="text-[8px] font-black tracking-widest uppercase">
                          {statusLabels[p.status] || p.status}
                        </Badge>
                      </div>
                    }
                    content={
                      <div className="space-y-2">
                        <p className="font-medium text-xs"><Badge variant="outline" className="text-[9px] font-bold text-gray-400 border-none px-0 tracking-widest uppercase">Alasan:</Badge> {p.alasan}</p>
                        {p.status === 'KEMBALI' && p.jam_kembali && (
                          <div className="mt-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-900/30">
                            <CheckCircle size={10} /> Siswa Kembali Pukul {new Date(p.jam_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    }
                    isLast={idx === (dailyPermits?.length || 0) - 1}
                  />
                );
              })}
            </Timeline>
          ) : (
            <div className="py-20 text-center">
              <History size={40} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Belum ada riwayat hari ini</p>
            </div>
          )}
        </Card>
      </div>

      {/* Detail list table on Right side */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="p-6 rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                id="history-search-input"
                aria-label="Cari riwayat siswa"
                placeholder="Cari riwayat siswa..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredHistory?.map((p) => (
              <Card key={p.id} className="p-4 rounded-xl bg-gray-50/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-100 transition-all shadow-none">
                <div className="space-y-1 min-w-0">
                  <h4 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight truncate">{p.SiswaAkademik?.siswa.nama_siswa}</h4>
                  <Badge variant="outline" className="text-[9px] font-black text-gray-400 border-none px-0 tracking-widest uppercase">{p.SiswaAkademik?.kelas?.nama_kelas || '-'} | NIS: {p.SiswaAkademik?.siswa.nis}</Badge>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[160px] italic">"{p.alasan}"</p>
                </div>
                <div className="text-right">
                  <Badge variant={p.status === 'KEMBALI' ? 'success' : 'warning'} className="text-[8px] font-black tracking-widest uppercase">
                    {p.status}
                  </Badge>
                  <span className="text-[9px] font-bold text-gray-400 block mt-1">
                    {new Date(p.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </Card>
            ))}
            {(filteredHistory?.length || 0) === 0 && (
              <p className="text-center text-xs text-gray-400 font-bold py-10 uppercase tracking-widest">Tidak ada hasil cocok</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
});
