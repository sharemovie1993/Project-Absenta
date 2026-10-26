import React, { useState } from 'react';
import { 
  LogOut, 
  LogIn, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { StudentGatePermit } from '../types';

interface SatpamIzinKeluarTabProps {
  permits: StudentGatePermit[];
  onConfirmExit?: (permitId: string) => Promise<void>;
  onConfirmReturn?: (permitId: string) => Promise<void>;
}

export const SatpamIzinKeluarTab: React.FC<SatpamIzinKeluarTabProps> = ({
  permits: initialPermits,
  onConfirmExit,
  onConfirmReturn,
}) => {
  const [permits, setPermits] = useState<StudentGatePermit[]>(initialPermits);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DISETUJUI' | 'DI_LUAR' | 'KEMBALI'>('ALL');

  const handleExit = async (id: string, nama: string) => {
    try {
      if (onConfirmExit) await onConfirmExit(id);
      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      setPermits((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'DI_LUAR', jam_keluar_aktual: jamStr } : p))
      );
      toast.success(`Siswa ${nama} tercatat keluar gerbang (${jamStr}).`);
    } catch {
      toast.error('Gagal memverifikasi izin keluar.');
    }
  };

  const handleReturn = async (id: string, nama: string) => {
    try {
      if (onConfirmReturn) await onConfirmReturn(id);
      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      setPermits((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'KEMBALI', jam_kembali_aktual: jamStr } : p))
      );
      toast.success(`Siswa ${nama} tercatat telah kembali ke sekolah (${jamStr}).`);
    } catch {
      toast.error('Gagal mencatat siswa kembali.');
    }
  };

  const filteredPermits = permits.filter((p) => {
    const matchesSearch =
      p.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.alasan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* ── SEARCH & FILTER ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa izin, kelas, atau alasan..."
            aria-label="Cari tiket izin keluar"
            className="pl-9 h-10 text-xs rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
          {(['ALL', 'DISETUJUI', 'DI_LUAR', 'KEMBALI'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer",
                filterStatus === st
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {st === 'ALL' ? 'Semua' : st === 'DISETUJUI' ? 'Siap Keluar' : st === 'DI_LUAR' ? 'Di Luar' : 'Kembali'}
            </button>
          ))}
        </div>
      </div>

      {/* ── PERMITS LIST ────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-rose-600 dark:text-rose-400" />
            Validasi Izin Keluar Gerbang ({filteredPermits.length})
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredPermits.filter((p) => p.status === 'DI_LUAR').length} siswa di luar gerbang
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPermits.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 space-y-2">
              <FileText size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Tidak ada izin keluar siswa aktif saat ini</p>
            </div>
          ) : (
            filteredPermits.map((permit) => {
              const isApproved = permit.status === 'DISETUJUI';
              const isOutside = permit.status === 'DI_LUAR';
              const isReturned = permit.status === 'KEMBALI';

              return (
                <div
                  key={permit.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3",
                    isOutside
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40"
                      : isApproved
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {permit.nama_siswa}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {permit.kelas} • Guru Piket: {permit.guru_piket_nama}
                        </p>
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase shrink-0",
                        isOutside
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                          : isApproved
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      )}>
                        {isOutside ? 'Sedang Di Luar' : isApproved ? 'Menunggu Keluar' : 'Sudah Kembali'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Alasan:</strong> {permit.alasan}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                        Rencana: {permit.jam_keluar_rencana} s.d {permit.jam_kembali_rencana || 'Selesai'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {permit.jam_keluar_aktual ? `Keluar: ${permit.jam_keluar_aktual}` : 'Belum lewat gerbang'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isApproved && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleExit(permit.id, permit.nama_siswa)}
                          className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1"
                        >
                          <LogOut size={12} />
                          <span>Lewat Gerbang</span>
                        </Button>
                      )}

                      {isOutside && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleReturn(permit.id, permit.nama_siswa)}
                          className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <LogIn size={12} />
                          <span>Masuk Kembali</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
