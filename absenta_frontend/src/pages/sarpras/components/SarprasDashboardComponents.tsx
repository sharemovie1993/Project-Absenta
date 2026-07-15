import React from 'react';
import { Cpu, Clock, Box, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';

export interface LoanRecord {
  id: string;
  asset_id: string;
  peminjam_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  tanggal_pinjam: string;
  tanggal_kembali_plan: string;
  tanggal_kembali_real?: string;
  Asset?: {
    id: string;
    nama: string;
    kode?: string;
  };
  Peminjam?: {
    id: string;
    full_name: string;
  };
}

export interface RepairRecord {
  id: string;
  asset_id: string;
  teknisi?: string;
  biaya?: number;
  deskripsi?: string;
  status: 'PROSES' | 'SELESAI' | 'BATAL';
  tanggal_mulai: string;
  tanggal_selesai?: string;
  Asset?: { id: string; nama: string; kode?: string; kondisi: string };
}

export interface SectorItem {
  name: string;
  percentage: number;
}

export interface DeviceInfo {
  id: string;
  nama: string;
  kode?: string;
  kondisi?: string;
  lokasi?: string;
  status?: string;
}


// Custom Divider
export const Divider: React.FC<{ title: string }> = ({ title }) => (
  <div className="relative py-4 shrink-0 select-none">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
        {title}
      </span>
    </div>
  </div>
);

// Unreturned Loans List
export const UnreturnedLoansList: React.FC<{ loans: LoanRecord[] }> = ({ loans }) => {
  const unreturned = loans?.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');

  return (
    <SectionCard
      title={
        <div className="flex flex-col">
          <span>Peminjam Belum Mengembalikan</span>
          <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Daftar peminjaman aktif yang melewati batas / belum kembali</span>
        </div>
      }
      icon={AlertTriangle}
      fullWidth
    >
      <div className="space-y-3.5 h-80 overflow-y-auto pr-1 pt-1">
        {unreturned && unreturned.length > 0 ? (
          unreturned?.map((loan) => (
            <div key={loan.id} className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/35 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Box size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{loan.Asset?.nama || 'Aset Tidak Dikenal'}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                    Peminjam: {loan.Peminjam?.full_name || 'Umum'} <span className="mx-1.5 opacity-20">•</span> Kembali: {loan.tanggal_kembali_plan ? new Date(loan.tanggal_kembali_plan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}
                  </p>
                </div>
              </div>
              <Badge variant="destructive">
                {loan.status === 'OVERDUE' ? 'Terlambat' : 'Dipinjam'}
              </Badge>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
            <Box className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Semua aset telah kembali</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

// Recent Transactions List
export const RecentTransactionsList: React.FC<{ loans: LoanRecord[] }> = ({ loans }) => {
  return (
    <SectionCard
      title={
        <div className="flex flex-col">
          <span>Log Transaksi Peminjaman</span>
          <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Daftar riwayat transaksi peminjaman terbaru</span>
        </div>
      }
      icon={Clock}
      fullWidth
    >
      <div className="space-y-3.5 h-80 overflow-y-auto pr-1 pt-1">
        {loans && loans.length > 0 ? (
          loans?.slice(0, 10)?.map((loan) => (
            <div key={loan.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Box size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{loan.Asset?.nama || 'Aset Tidak Dikenal'}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                    Oleh: {loan.Peminjam?.full_name || 'Umum'} <span className="mx-1.5 opacity-20">•</span> Tanggal: {loan.tanggal_pinjam ? new Date(loan.tanggal_pinjam).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}
                  </p>
                </div>
              </div>
              <Badge variant={loan.status === 'RETURNED' ? 'success' : loan.status === 'PENDING' ? 'warning' : 'info'}>
                {loan.status === 'RETURNED' ? 'Kembali' : loan.status === 'PENDING' ? 'Menunggu' : 'Dipinjam'}
              </Badge>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
            <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Belum ada transaksi</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

// Maintenance Alerts List
export const MaintenanceAlertsList: React.FC<{ repairs: RepairRecord[] }> = ({ repairs }) => {
  return (
    <SectionCard
      title={
        <div className="flex flex-col">
          <span>Kebutuhan Pemeliharaan & Perbaikan</span>
          <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Daftar aset kondisi rusak dalam perbaikan aktif</span>
        </div>
      }
      icon={Cpu}
      fullWidth
    >
      <div className="space-y-3.5 h-80 overflow-y-auto pr-1 pt-1">
        {repairs && repairs.length > 0 ? (
          repairs?.map((rep) => (
            <div key={rep.id} className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/35 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Cpu size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{rep.Asset?.nama || 'Aset'}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                    Teknisi: {rep.teknisi || 'Belum Ditugaskan'} <span className="mx-1.5 opacity-20">•</span> Kerusakan: {rep.deskripsi || '—'}
                  </p>
                </div>
              </div>
              <Badge variant="warning">
                {rep.status}
              </Badge>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
            <Cpu className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">Semua aset berfungsi optimal</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};
