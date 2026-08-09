import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Printer, ListChecks, Info } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { getPermitFullLifecycleStatus } from '../../utils/piketStatusHelper';

export interface PiketUtamaPanelProps {
  pendingJurusanPermits: IzinKeluarSiswa[];
  issuedPermits: IzinKeluarSiswa[];
  dailyPermits: IzinKeluarSiswa[];
  exitedGateIds: string[];
  onOpenFormModalWithStudent: (siswa: any) => void;
  onReprintExecute: (permit: IzinKeluarSiswa) => void;
}

export const PiketUtamaPanel: React.FC<PiketUtamaPanelProps> = React.memo(({
  pendingJurusanPermits,
  issuedPermits,
  dailyPermits,
  exitedGateIds,
  onOpenFormModalWithStudent,
  onReprintExecute
}) => {
  const [mainRightTab, setMainRightTab] = useState<'pending' | 'printed'>('pending');
  const [logTab, setLogTab] = useState<'all' | 'active' | 'returned'>('all');

  return (
    <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 rounded-2xl flex flex-col h-full min-h-[500px]">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setMainRightTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                mainRightTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              🔔 Menghadap ({pendingJurusanPermits.length})
            </button>
            <button
              type="button"
              onClick={() => setMainRightTab('printed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                mainRightTab === 'printed'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              📋 Izin Terbit ({(dailyPermits || []).length - pendingJurusanPermits.length})
            </button>
          </div>
          <span
            title={
              mainRightTab === 'pending'
                ? 'Daftar rujukan dari Pos Jurusan yang akan/sedang menghadap di Meja Utama'
                : 'Daftar izin yang sudah disetujui / dicetak slip fisiknya'
            }
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-help"
          >
            <Info size={13} />
          </span>
        </div>
      </div>

      {/* TAB 1: SISWA MENGHADAP (PENDING RUJUKAN JURUSAN) */}
      {mainRightTab === 'pending' && (
        <div className="flex-1 flex flex-col">

          {pendingJurusanPermits.length > 0 ? (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-0.5">
              {pendingJurusanPermits.map((item) => {
                const nama = item.SiswaAkademik?.siswa?.nama_siswa || (item as any).Siswa?.nama_siswa || 'Siswa';
                const nis  = item.SiswaAkademik?.siswa?.nis || '-';
                const kelas = item.SiswaAkademik?.kelas?.nama_kelas || '-';
                const jam  = item.jam_keluar
                  ? new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '-';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl flex items-center justify-between hover:border-amber-400 transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">{nama}</span>
                        <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-md shrink-0">
                          RUJUKAN JURUSAN
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                        NIS: {nis} | {kelas} • <span className="text-amber-600 dark:text-amber-400 font-black">{jam}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-1">
                        "{item.alasan}"
                      </p>
                    </div>

                    <Button
                      onClick={() => onOpenFormModalWithStudent(item.SiswaAkademik?.siswa || item)}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider h-9 flex items-center gap-1.5 shadow-md shadow-amber-500/20 shrink-0"
                    >
                      <Printer size={13} /> Verifikasi &amp; Cetak
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
              <ListChecks size={36} className="text-amber-300 mb-2" />
              <p className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Tidak Ada Antrean Menghadap</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs text-center">Belum ada rujukan permohonan baru dari Piket Jurusan.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IZIN TERBIT (EKSKLUSIF TERVERIFIKASI / TERCETAK) */}
      {mainRightTab === 'printed' && (
        <div className="flex-1 flex flex-col">
          {/* Filter Sub-Tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
            {([
              { key: 'all',      label: 'Semua',    count: issuedPermits.length },
              { key: 'active',   label: '🟡 Di Luar', count: issuedPermits.filter(p => p.status !== 'KEMBALI' && !p.jam_kembali).length },
              { key: 'returned', label: '✅ Kembali',count: issuedPermits.filter(p => p.status === 'KEMBALI' || !!p.jam_kembali).length },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setLogTab(tab.key)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all ${
                  logTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* List */}
          {issuedPermits.length > 0 ? (
            <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 max-h-[440px]">
              {issuedPermits.map((item) => {
                const nama = item.SiswaAkademik?.siswa?.nama_siswa || (item as any).Siswa?.nama_siswa || 'Siswa';
                const nis  = item.SiswaAkademik?.siswa?.nis || '-';
                const kelas = item.SiswaAkademik?.kelas?.nama_kelas || '-';
                const jam  = item.jam_keluar
                  ? new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '-';
                const sudahKembali = item.status === 'KEMBALI' || !!item.jam_kembali;
                const isPulang  = item.tipe_izin === 'PULANG_AWAL';
                const isJurusan = item.tipe_izin === 'IZIN_JURUSAN';
                const lifeStep = getPermitFullLifecycleStatus(item, exitedGateIds);

                const badgeColor = isPulang
                  ? 'bg-purple-600'
                  : isJurusan
                  ? 'bg-emerald-600'
                  : 'bg-indigo-600';
                const badgeLabel = isPulang ? 'Pulang' : isJurusan ? 'Jurusan' : 'Keluar';

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      sudahKembali
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-sm text-white ${
                      sudahKembali ? 'bg-emerald-500' : badgeColor
                    }`}>
                      {nama.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-[11px] text-slate-800 dark:text-white uppercase truncate">{nama}</span>
                        <span className={`text-[7px] font-black text-white px-1.5 py-0.5 rounded-md shrink-0 ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${lifeStep.badgeClass}`}>
                          {lifeStep.shortLabel}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-0.5">{nis} | {kelas}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 truncate italic">
                        "{item.alasan}" • <span className="font-bold not-italic text-indigo-600">{jam}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onReprintExecute(item)}
                      title="Cetak Ulang Slip"
                      className="shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-500 dark:text-slate-400 transition-all flex items-center justify-center group"
                    >
                      <Printer size={14} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 my-auto">
              <ListChecks size={36} className="text-slate-300 mb-2" />
              <p className="font-black uppercase text-[10px] text-slate-400 tracking-wider">Belum Ada Slip Terbit Hari Ini</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs text-center">Permohonan terverifikasi akan tercatat di sini.</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
});
