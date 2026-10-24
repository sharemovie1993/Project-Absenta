import React from 'react';
import { Shield, Sparkles, Users, Award, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { HubCard } from '@/components/ui/hub';
import type { WalasDashboardData } from '../types';

export interface WalasStrukturTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasStrukturTab: React.FC<WalasStrukturTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const kelasInfo = data?.kelasInfo;

  return (
    <div className="space-y-5 w-full max-w-full min-w-0">
      {/* Header Ringkas Struktur Kelas */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Struktur & Piket {kelasNama || kelasInfo?.nama_kelas || 'Kelas'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tata kelola kepengurusan rombel dan jadwal kebersihan harian
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Perangkat Pengurus Kelas & Jadwal Piket */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Struktur Organisasi Kelas */}
        <Card className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Perangkat Pengurus Kelas</h4>
              <p className="text-xs text-slate-500">Struktur kepemimpinan rombel peserta didik</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { role: 'Ketua Murid (KM)', name: 'Perwakilan Siswa 1', desc: 'Koordinator kelas dan penghubung walas' },
              { role: 'Wakil Ketua Murid', name: 'Perwakilan Siswa 2', desc: 'Pendamping ketua murid' },
              { role: 'Sekretaris 1 & 2', name: 'Perwakilan Siswa 3 & 4', desc: 'Pencatat absensi & agenda kelas harian' },
              { role: 'Bendahara 1 & 2', name: 'Perwakilan Siswa 5 & 6', desc: 'Pengelola kas & perlengkapan kelas' },
            ].map((pos, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{pos.role}</p>
                  <p className="text-[11px] text-slate-400">{pos.desc}</p>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-medium px-2.5 py-1">
                  {pos.name}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Jadwal Regu Piket Kebersihan */}
        <Card className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Regu Piket Kebersihan Kelas</h4>
              <p className="text-xs text-slate-500">Jadwal pembagian ketertiban ruang kelas Senin - Jumat</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { day: 'Senin', count: '7 Siswa', lead: 'Regu A (Koord: Ahmad)' },
              { day: 'Selasa', count: '7 Siswa', lead: 'Regu B (Koord: Budi)' },
              { day: 'Rabu', count: '7 Siswa', lead: 'Regu C (Koord: Citra)' },
              { day: 'Kamis', count: '7 Siswa', lead: 'Regu D (Koord: Doni)' },
              { day: 'Jumat', count: '8 Siswa', lead: 'Regu E (Koord: Eka)' },
            ].map((pkt, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-16 text-xs font-bold text-slate-700 dark:text-slate-300">{pkt.day}</span>
                  <span className="text-xs text-slate-500">{pkt.lead}</span>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {pkt.count}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
});

WalasStrukturTab.displayName = 'WalasStrukturTab';
