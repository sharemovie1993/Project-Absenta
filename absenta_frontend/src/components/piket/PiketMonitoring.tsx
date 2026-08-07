import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Loader } from '../ui/Loader';
import { CheckCircle, LogIn, MessageSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
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
    const rawNo = (item.SiswaAkademik?.siswa as any)?.no_hp; // fallback or ortu
    if (!rawNo) {
      toast.error('Nomor WhatsApp Orang Tua/Wali tidak tersedia');
      return;
    }
    const cleanNo = rawNo.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const namaSiswa = item.SiswaAkademik?.siswa.nama_siswa || 'Siswa';
    const kelasNama = item.SiswaAkademik?.kelas?.nama_kelas || '-';
    const jamKeluar = new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const text = encodeURIComponent(`Yth. Bapak/Ibu Wali dari ${namaSiswa} (${kelasNama}), menginformasikan bahwa putra/putri Bapak/Ibu terdeteksi belum kembali ke kelas setelah izin keluar sementara dari Piket sejak jam ${jamKeluar}. Mohon dibantu pengecekannya.`);
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
      render: (_, item: IzinKeluarSiswa) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-indigo-600">
            {item.SiswaAkademik?.siswa.nama_siswa?.charAt(0)}
          </div>
          <div>
            <div className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">
              {item.SiswaAkademik?.siswa.nama_siswa}
            </div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              NIS: {item.SiswaAkademik?.siswa.nis} | Kelas: {item.SiswaAkademik?.kelas?.nama_kelas || '-'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'tipe_izin',
      label: 'Tipe Izin',
      render: (v: string) => {
        const cfg = getTipeIzinBadgeConfig(v);
        return (
          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${cfg.badgeClass}`}>
            {cfg.icon} {cfg.label}
          </span>
        );
      }
    },
    {
      key: 'alasan',
      label: 'Alasan Keluar',
      render: (v: string) => <span className="text-xs font-bold text-gray-600 dark:text-gray-400 truncate max-w-xs block">{v}</span>
    },
    {
      key: 'jam_keluar',
      label: 'Keluar Sejak',
      render: (v: string) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-gray-800 dark:text-gray-200">
            {new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-[9px] font-bold text-gray-400">
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
        <div className="flex flex-wrap gap-1.5 items-center">
          <Button
            variant="primary"
            onClick={() => handleMarkReturned(item.id, item.SiswaAkademik?.siswa.nama_siswa || 'Siswa')}
            className="bg-emerald-600 text-white rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-wider h-7 flex items-center gap-1 shadow-sm"
          >
            <LogIn size={10} /> Catat Kembali
          </Button>

          {/* 1-Click WhatsApp Action Buttons */}
          <button
            onClick={() => handleOpenWaSiswa(item)}
            title="Chat WA Siswa"
            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-200/50"
          >
            <MessageSquare size={10} /> WA Siswa
          </button>

          <button
            onClick={() => handleOpenWaOrtu(item)}
            title="Chat WA Orang Tua"
            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-200/50"
          >
            <MessageSquare size={10} /> WA Ortu
          </button>

          <button
            onClick={() => handleEskalasiBk(item)}
            title="Eskalasi ke BK"
            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-200/50"
          >
            <ShieldAlert size={10} /> BK
          </button>

          <Button
            variant="ghost"
            onClick={() => handleDeletePermit(item.id)}
            className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 h-7 px-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider"
          >
            Batal
          </Button>
        </div>
      )
    }
  ], [handleMarkReturned, handleDeletePermit]);

  return (
    <Card className="rounded-3xl border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
      <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-indigo-950/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">Daftar Siswa Sedang di Luar</h3>
          <ModuleSopTrigger moduleKey="piket" buttonLabel="📜 SOP Perizinan" />
        </div>
        <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 animate-pulse">
          {(activeOutStudents?.length || 0)} Siswa Diluar
        </Badge>
      </div>

      {loadingPermits ? (
        <div className="py-20 flex items-center justify-center"><Loader /></div>
      ) : (activeOutStudents?.length || 0) > 0 ? (
        <Table
          data={activeOutStudents}
          emptyMessage="Tidak ada siswa di luar saat ini"
          columns={columns}
        />
      ) : (
        <div className="py-20 text-center bg-gray-50 dark:bg-slate-900/30">
          <CheckCircle size={40} className="mx-auto text-emerald-400 mb-4" />
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Semua Siswa Terjaga di Sekolah</p>
          <p className="text-xs text-gray-400 mt-1">Tidak ada siswa yang terdeteksi berada di luar kelas saat ini.</p>
        </div>
      )}
    </Card>
  );
});

