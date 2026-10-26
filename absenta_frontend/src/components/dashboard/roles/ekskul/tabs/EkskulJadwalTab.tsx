import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, UserCheck, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { getJadwalKegiatan, type JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';
import { getPembinaKegiatanEskul, type PembinaKegiatanEskulItem } from '@/api/attendance/pembinaKegiatanEskul.api';
import { jenisKegiatanMasterApi } from '@/api/academic/jenisKegiatanMaster.api';
import { Button, Loader } from '@/components/ui';
import { cn } from '@/lib/utils';

export const EkskulJadwalTab: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<'jadwal' | 'pembina'>('jadwal');

  const { data: jadwalRes, isLoading: loadingJadwal } = useQuery({
    queryKey: ['ekskul-jadwal-kegiatan'],
    queryFn: () => getJadwalKegiatan({ aktif: true }),
  });

  const { data: pembinaRes, isLoading: loadingPembina } = useQuery({
    queryKey: ['ekskul-pembina-kegiatan'],
    queryFn: () => getPembinaKegiatanEskul(),
  });

  const { data: eskulListRes } = useQuery({
    queryKey: ['jenis-kegiatan-master-all'],
    queryFn: jenisKegiatanMasterApi.getAll,
  });

  const jadwalList: JadwalKegiatanItem[] = jadwalRes?.data || [];
  const pembinaList: PembinaKegiatanEskulItem[] = pembinaRes?.data || [];
  const eskulList = eskulListRes?.data || [];

  return (
    <div className="space-y-4">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubView('jadwal')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeSubView === 'jadwal'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Jadwal Latihan Mingguan
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('pembina')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeSubView === 'pembina'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Daftar Guru Pembina &amp; Pelatih
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {activeSubView === 'jadwal'
            ? `${jadwalList.length} Jadwal Rutin`
            : `${pembinaList.length} Guru Pembina`}
        </div>
      </div>

      {/* Subview 1: Jadwal Latihan */}
      {activeSubView === 'jadwal' && (
        <div className="space-y-3">
          {loadingJadwal ? (
            <div className="py-16 flex justify-center items-center">
              <Loader />
            </div>
          ) : jadwalList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {jadwalList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      {item.jenis_kegiatan || 'Ekstrakurikuler'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ● Aktif
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.nama}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar size={13} className="text-indigo-500" />
                      <span>{Array.isArray(item.hari) ? item.hari.join(', ') : item.hari || 'Mingguan'}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                      <Clock size={13} className="text-indigo-500" />
                      <span>{item.waktu_mulai} - {item.waktu_selesai || 'Selesai'}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <Calendar className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
              <p className="text-xs font-bold text-slate-400">Belum ada jadwal latihan ekstrakurikuler yang aktif.</p>
            </div>
          )}
        </div>
      )}

      {/* Subview 2: Pembina & Pelatih */}
      {activeSubView === 'pembina' && (
        <div className="space-y-3">
          {loadingPembina ? (
            <div className="py-16 flex justify-center items-center">
              <Loader />
            </div>
          ) : pembinaList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pembinaList.map((pembina) => (
                <div
                  key={pembina.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm shrink-0">
                      <UserCheck size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {pembina.nama_guru}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        NIP: {pembina.nip || '–'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Kegiatan:</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">
                      {pembina.nama_kegiatan || 'Ekstrakurikuler'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <UserCheck className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
              <p className="text-xs font-bold text-slate-400">Belum ada pemetaan guru pembina yang terdaftar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
