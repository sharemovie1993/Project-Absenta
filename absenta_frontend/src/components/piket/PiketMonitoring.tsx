import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Loader } from '../ui/Loader';
import { CheckCircle, LogIn } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { LiveDuration } from './LiveDuration';

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
      render: (v: string) => (
        <Badge variant={v === 'PULANG_AWAL' ? 'warning' : 'info'} className="text-[9px] font-black uppercase tracking-widest">
          {v === 'PULANG_AWAL' ? 'Pulang Awal' : 'Izin Sementara'}
        </Badge>
      )
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
      label: 'Aksi Kepulangan',
      render: (_, item: IzinKeluarSiswa) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => handleMarkReturned(item.id, item.SiswaAkademik?.siswa.nama_siswa || 'Siswa')}
            className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 font-black text-[10px] uppercase tracking-wider h-8 flex items-center gap-1 shadow-sm"
          >
            <LogIn size={10} /> Catat Kembali
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleDeletePermit(item.id)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 rounded-lg font-black text-[10px] uppercase tracking-wider"
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
        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">Daftar Siswa Sedang di Luar</h3>
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
