import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { MapPin, RefreshCw, Info } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { getPermitFullLifecycleStatus } from '../../utils/piketStatusHelper';

export interface PiketJurusanPanelProps {
  jurusanFilteredPermits: IzinKeluarSiswa[];
  exitedGateIds: string[];
  namaJurusan?: string;
  onRefresh: () => void;
}

export const PiketJurusanPanel: React.FC<PiketJurusanPanelProps> = ({
  jurusanFilteredPermits,
  exitedGateIds,
  namaJurusan,
  onRefresh
}) => {
  const [activeTrackedId, setActiveTrackedId] = useState<string | null>(null);

  return (
    <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 rounded-2xl flex flex-col h-full min-h-[500px]">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            Pantauan Live ({namaJurusan || 'Jurusan'})
          </h3>
          <span
            title="Pelacakan posisi siswa real-time secara dinamis dari Pos Jurusan ke Meja Utama dan Gate Satpam"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
          >
            <Info size={13} />
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
          aria-label="Refresh Pantauan Jurusan"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {jurusanFilteredPermits && jurusanFilteredPermits.length > 0 ? (
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-[460px]">
          {jurusanFilteredPermits.map((item) => {
            const nama = item.SiswaAkademik?.siswa?.nama_siswa || (item as any).Siswa?.nama_siswa || 'Siswa';
            const nis  = item.SiswaAkademik?.siswa?.nis || '-';
            const kelas = item.SiswaAkademik?.kelas?.nama_kelas || '-';
            const jam  = item.jam_keluar
              ? new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : '-';
            const lifeStep = getPermitFullLifecycleStatus(item, exitedGateIds);
            const isTracked = activeTrackedId === item.id;

            return (
              <div
                key={item.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                      {nama.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">{nama}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${lifeStep.badgeClass}`}>
                          {lifeStep.shortLabel}
                        </span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                        NIS: {nis} | {kelas} • <span className="text-slate-500 italic font-normal">"{item.alasan}"</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Trigger Track Status */}
                  <button
                    type="button"
                    onClick={() => setActiveTrackedId(prev => (prev === item.id ? null : item.id))}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
                      isTracked
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40'
                    }`}
                  >
                    <MapPin size={12} className={isTracked ? 'animate-bounce' : ''} />
                    {isTracked ? 'Tutup Track' : '📦 Track Status'}
                  </button>
                </div>

                {/* VISUAL TRACKING EXPEDISI / KURIR PACKAGING STYLE STEPPER BAR */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div className="relative flex items-center justify-between px-2 py-1">
                    {/* Background Progress Bar Line */}
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0" />
                    
                    {/* Active Progress Bar Line Fill */}
                    <div
                      className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 transition-all duration-500 rounded-full z-0"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((lifeStep.stepIndex - 1) / 3) * 100))}%`
                      }}
                    />

                    {/* DYNAMIC FLOATING PIN MARKER WITH STUDENT NAME */}
                    <div
                      className="absolute top-[-26px] -translate-x-1/2 z-20 transition-all duration-500 flex flex-col items-center pointer-events-none"
                      style={{
                        left: `calc(1.5rem + ${Math.min(100, Math.max(0, ((lifeStep.stepIndex - 1) / 3) * 100))}% - 3rem)`
                      }}
                    >
                      <div className="bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg border border-emerald-300 flex items-center gap-1 animate-bounce whitespace-nowrap">
                        <span>📍 {nama.split(' ')[0]} di sini</span>
                      </div>
                      <div className="w-1.5 h-1.5 bg-emerald-600 rotate-45 -mt-0.5" />
                    </div>

                    {/* Step Node 1: Piket Jurusan */}
                    <div className="relative z-10 flex flex-col items-center group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        lifeStep.stepIndex >= 1 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 text-slate-400'
                      }`}>
                        1
                      </div>
                      <span className={`text-[8px] font-bold mt-1 uppercase ${lifeStep.stepIndex >= 1 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}`}>
                        Pos Jurusan
                      </span>
                    </div>

                    {/* Step Node 2: Meja Utama */}
                    <div className="relative z-10 flex flex-col items-center group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        lifeStep.stepIndex >= 2 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 text-slate-400'
                      }`}>
                        2
                      </div>
                      <span className={`text-[8px] font-bold mt-1 uppercase ${lifeStep.stepIndex >= 2 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}`}>
                        Meja Utama
                      </span>
                    </div>

                    {/* Step Node 3: Gate Satpam */}
                    <div className="relative z-10 flex flex-col items-center group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        lifeStep.stepIndex >= 3 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 text-slate-400'
                      }`}>
                        3
                      </div>
                      <span className={`text-[8px] font-bold mt-1 uppercase ${lifeStep.stepIndex >= 3 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}`}>
                        Gate Satpam
                      </span>
                    </div>

                    {/* Step Node 4: Kembali */}
                    <div className="relative z-10 flex flex-col items-center group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        lifeStep.stepIndex >= 4 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-200 text-slate-400'
                      }`}>
                        4
                      </div>
                      <span className={`text-[8px] font-bold mt-1 uppercase ${lifeStep.stepIndex >= 4 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}`}>
                        Kembali
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
          <MapPin size={36} className="text-emerald-300 mb-2" />
          <p className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Tidak Ada Siswa Izin Aktif</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs text-center">Permohonan izin dari jurusan ini akan muncul secara live di sini.</p>
        </div>
      )}
    </Card>
  );
};
