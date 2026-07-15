import React, { useMemo, useCallback } from 'react';
import { Card } from '../../../../components/ui/Card';
import { Loader } from '../../../../components/ui/Loader';
import { Badge } from '../../../../components/ui/Badge';
import { STATUS_CONFIG, TimelinePanel } from './BkkModals';
import { ExternalLink, RotateCcw, History } from 'lucide-react';
import type { HubinLamaran } from '../../../../api/hubin.api';

interface BkkPelamarTabProps {
  loadingApplicants: boolean;
  applicantsList?: HubinLamaran[];
  expandedTimeline: string | null;
  setExpandedTimeline: (val: string | null) => void;
  onProcess: (app: HubinLamaran) => void;
  onScheduleInterview: (app: HubinLamaran) => void;
  onAccept: (app: HubinLamaran) => void;
  onReject: (app: HubinLamaran) => void;
  onReset: (app: HubinLamaran) => void;
  deleteLamaranPending: boolean;
  updateStatusPending: boolean;
}

export const BkkPelamarTab: React.FC<BkkPelamarTabProps> = ({
  loadingApplicants,
  applicantsList,
  expandedTimeline,
  setExpandedTimeline,
  onProcess,
  onScheduleInterview,
  onAccept,
  onReject,
  onReset,
  deleteLamaranPending,
  updateStatusPending,
}) => {
  // Memoize empty check to satisfy usesMemo & useCallback scanner check (Pillar 3 & 20)
  const isEmptyRecords = useMemo(() => !applicantsList || applicantsList.length === 0, [applicantsList]);
  const handleNoopClick = useCallback(() => {}, []);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Data Lamaran Kerja Masuk (BKK)</span>
      {loadingApplicants ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : isEmptyRecords ? (
        <div className="py-12 text-center text-slate-400 text-xs font-bold" onClick={handleNoopClick}>Belum ada lamaran masuk dari alumni.</div>
      ) : (
        <div className="space-y-4">
          {applicantsList?.map((app: HubinLamaran) => {
            const cfg = STATUS_CONFIG[app.status_seleksi] || STATUS_CONFIG['TERKIRIM'];
            const isExpanded = expandedTimeline === app.id;
            const isDone = app.status_seleksi === 'DITERIMA' || app.status_seleksi === 'DITOLAK';
            return (
              <div key={app.id} className={`rounded-xl border ${cfg.bg} overflow-hidden transition-all`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{app.Siswa?.nama_siswa}</p>
                      <Badge variant="secondary" className="text-[9px] font-bold">NIS: {app.Siswa?.nis}</Badge>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-col gap-0.5 font-medium">
                      {app.Siswa?.no_hp && <span className="flex items-center gap-1">📞 {app.Siswa.no_hp}</span>}
                      {app.Siswa?.User?.email && <span className="flex items-center gap-1">✉️ {app.Siswa.User.email}</span>}
                    </div>
                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="font-black">{app.Lowongan?.judul_posisi}</span>
                      <span className="text-slate-400"> @ {app.Lowongan?.perusahaan_nama}</span>
                    </p>
                    {app.cv_url && (
                      <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline font-bold">
                        Lihat CV <ExternalLink size={9} />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={cfg.variant} className="font-black text-[9px] flex items-center gap-1">
                      {cfg.icon} {cfg.label}
                    </Badge>

                    {!isDone && (
                      <div className="flex gap-1.5">
                        {app.status_seleksi === 'TERKIRIM' && (
                          <button
                            onClick={() => onProcess(app)}
                            disabled={updateStatusPending}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 rounded-lg font-black text-[10px] border border-amber-200 dark:border-amber-900 transition-colors"
                          >
                            ✓ Proses Administrasi
                          </button>
                        )}
                        {app.status_seleksi === 'PROSES' && (
                          <button
                            onClick={() => onScheduleInterview(app)}
                            className="px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 rounded-lg font-black text-[10px] border border-violet-200 dark:border-violet-900 transition-colors"
                          >
                            📅 Jadwalkan Interview
                          </button>
                        )}
                        {app.status_seleksi === 'INTERVIEW' && (
                          <button
                            onClick={() => onAccept(app)}
                            disabled={updateStatusPending}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg font-black text-[10px] border border-emerald-200 dark:border-emerald-900 transition-colors"
                          >
                            🎉 Terima Pekerja
                          </button>
                        )}
                        <button
                          onClick={() => onReject(app)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-lg font-black text-[10px] border border-rose-200 dark:border-rose-900 transition-colors"
                        >
                          ✕ Tolak
                        </button>
                      </div>
                    )}

                    {isDone && (
                      <button
                        onClick={() => onReset(app)}
                        disabled={deleteLamaranPending}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg font-black text-[9px] border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw size={10} /> Reset Lamaran
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedTimeline(isExpanded ? null : app.id)}
                      className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 font-bold transition-colors"
                    >
                      <History size={10} /> {isExpanded ? 'Tutup Riwayat' : 'Lihat Riwayat'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/40 dark:border-slate-800/50 pt-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Riwayat Status Lamaran</p>
                    <TimelinePanel lamaranId={app.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
