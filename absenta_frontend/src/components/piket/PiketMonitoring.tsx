import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Loader } from '../ui/Loader';
import { CheckCircle, LogIn, MessageSquare, ShieldAlert, X, Radio, Clock, UserCheck } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { LiveDuration } from './LiveDuration';
import { getTipeIzinBadgeConfig } from '../../utils/piketStatusHelper';
import { ModuleSopTrigger } from '../common/ModuleSopTrigger';
import toast from 'react-hot-toast';

interface PiketMonitoringProps {
  activeOutStudents: IzinKeluarSiswa[];
  loadingPermits: boolean;
  handleMarkReturned: (id: string, namaSiswa: string) => Promise<void>;
  handleDeletePermit: (id: string) => Promise<void>;
}

export const PiketMonitoring: React.FC<PiketMonitoringProps> = React.memo(({
  activeOutStudents,
  loadingPermits,
  handleMarkReturned,
  handleDeletePermit
}) => {

  const handleOpenWaSiswa = (item: IzinKeluarSiswa) => {
    const rawNo = (item.SiswaAkademik?.siswa as any)?.no_hp;
    if (!rawNo) {
      toast.error('Nomor WhatsApp Siswa tidak tersedia');
      return;
    }
    const cleanNo = rawNo.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const namaSiswa = item.SiswaAkademik?.siswa.nama_siswa || 'Siswa';
    const jamKeluar = new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const text = encodeURIComponent(`Halo ${namaSiswa}, kamu terdeteksi melebihi batas waktu izin keluar sementara dari Piket (sejak jam ${jamKeluar}). Harap segera kembali ke Ruang Piket / Kelas sekarang!`);
    window.open(`https://wa.me/${cleanNo}?text=${text}`, '_blank');
  };

  const handleOpenWaOrtu = (item: IzinKeluarSiswa) => {
    const rawNo = (item.SiswaAkademik?.siswa as any)?.no_hp;
    if (!rawNo) {
      toast.error('Nomor WhatsApp Orang Tua/Wali tidak tersedia');
      return;
    }
    const cleanNo = rawNo.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const namaSiswa = item.SiswaAkademik?.siswa.nama_siswa || 'Siswa';
    const kelasNama = item.SiswaAkademik?.kelas?.nama_kelas || '-';
    const jamKeluar = new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const text = encodeURIComponent(`Yth. Bapak/Ibu Wali dari ${namaSiswa} (${kelasNama}), menginformasikan bahwa putra/putri Bapak/Ibu terdeteksi belum kembali ke sekolah setelah izin keluar sementara dari Piket sejak jam ${jamKeluar}. Mohon dibantu pengecekannya.`);
    window.open(`https://wa.me/${cleanNo}?text=${text}`, '_blank');
  };

  const handleEskalasiBk = (item: IzinKeluarSiswa) => {
    const namaSiswa = item.SiswaAkademik?.siswa.nama_siswa || 'Siswa';
    toast.success(`Eskalasi kasus overstay ${namaSiswa} telah dicatat dan diteruskan ke Guru BK & Tim Kesiswaan.`);
  };

  const columns = React.useMemo(() => [
    {
      key: 'siswa',
      label: 'Siswa / Kelas',
      render: (_, item: IzinKeluarSiswa) => {
        const nama = item.SiswaAkademik?.siswa.nama_siswa || 'Siswa';
        const nis = item.SiswaAkademik?.siswa.nis || '-';
        const kelas = item.SiswaAkademik?.kelas?.nama_kelas || '-';
        const initial = nama.charAt(0).toUpperCase();

        return (
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-500/20 shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight truncate">
                {nama}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold text-slate-400">NIS: {nis}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
                  {kelas}
                </span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'tipe_izin',
      label: 'Tipe Izin',
      render: (v: string) => {
        const cfg = getTipeIzinBadgeConfig(v);
        return (
          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${cfg.badgeClass}`}>
            {cfg.icon} {cfg.label}
          </span>
        );
      }
    },
    {
      key: 'alasan',
      label: 'Alasan Keluar',
      render: (v: string) => (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 italic truncate max-w-xs block">
          "{v}"
        </span>
      )
    },
    {
      key: 'jam_keluar',
      label: 'Keluar Sejak',
      render: (v: string) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            {new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} <span className="text-[9px] font-bold text-slate-400">WIB</span>
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            {new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )
    },
    {
      key: 'duration',
      label: 'Durasi Keluar',
      render: (_, item: IzinKeluarSiswa) => <LiveDuration jamKeluar={item.jam_keluar} />
    },
    {
      key: 'actions',
      label: 'Aksi Kepulangan & Penindakan',
      render: (_, item: IzinKeluarSiswa) => (
        <div className="flex items-center gap-1.5 flex-nowrap py-1">
          {/* Primary Action Button */}
          <button
            onClick={() => handleMarkReturned(item.id, item.SiswaAkademik?.siswa.nama_siswa || 'Siswa')}
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 active:scale-95"
          >
            <LogIn size={12} /> Catat Kembali
          </button>

          {/* WhatsApp Action Buttons */}
          <button
            onClick={() => handleOpenWaSiswa(item)}
            title="Kirim Pesan Teguran WA Siswa"
            className="h-8 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/60 transition-all shrink-0"
          >
            <MessageSquare size={11} /> WA Siswa
          </button>

          <button
            onClick={() => handleOpenWaOrtu(item)}
            title="Kirim Notifikasi WA Orang Tua"
            className="h-8 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-200/60 dark:border-blue-800/60 transition-all shrink-0"
          >
            <MessageSquare size={11} /> WA Ortu
          </button>

          {/* Eskalasi BK */}
          <button
            onClick={() => handleEskalasiBk(item)}
            title="Eskalasi Kasus ke BK / Kesiswaan"
            className="h-8 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-200/60 dark:border-rose-800/60 transition-all shrink-0"
          >
            <ShieldAlert size={11} /> BK
          </button>

          {/* Batal */}
          <button
            onClick={() => handleDeletePermit(item.id)}
            title="Batalkan Izin Ini"
            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl flex items-center justify-center transition-all shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )
    }
  ], [handleMarkReturned, handleDeletePermit]);

  return (
    <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Radio size={16} className="text-rose-500 animate-pulse" />
              Daftar Siswa Sedang di Luar
            </h3>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Monitoring real-time keberadaan siswa dan tindakan kepulangan
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <ModuleSopTrigger moduleKey="piket" buttonLabel="📜 SOP Perizinan" />
          <Badge className="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <UserCheck size={12} />
            {(activeOutStudents?.length || 0)} Siswa di Luar
          </Badge>
        </div>
      </div>

      {/* Table Content */}
      {loadingPermits ? (
        <div className="py-20 flex items-center justify-center"><Loader /></div>
      ) : (activeOutStudents?.length || 0) > 0 ? (
        <div className="overflow-x-auto">
          <Table
            data={activeOutStudents}
            emptyMessage="Tidak ada siswa di luar saat ini"
            columns={columns}
          />
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50/30 dark:bg-slate-900/20">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto mb-3 border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle size={28} />
          </div>
          <p className="text-slate-800 dark:text-white font-black uppercase text-xs tracking-wider">
            Semua Siswa Terjaga di Sekolah
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            Tidak ada siswa yang terdeteksi sedang berada di luar kelas atau keluar lingkungan sekolah saat ini.
          </p>
        </div>
      )}
    </Card>
  );
});
