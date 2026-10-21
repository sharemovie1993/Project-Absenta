import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SaranaItem } from '../types';

interface KaprogSaranaTabProps {
  saranaCounts: {
    total: number;
    dipinjam: number;
    rusak: number;
  };
  saranaList: SaranaItem[];
}

export const KaprogSaranaTab: React.FC<KaprogSaranaTabProps> = React.memo(({
  saranaCounts,
  saranaList = [],
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* 3 Stat Cards Sarpras */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Total Alat & Mesin Praktik
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {saranaCounts?.total || 0} <span className="text-xs font-normal text-slate-400">Unit</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Terdata di Ruang Praktik Kejuruan
          </p>
        </Card>

        <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Sedang Dipinjam Praktik
          </span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {saranaCounts?.dipinjam || 0} <span className="text-xs font-normal text-slate-400">Item</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Aktif dalam sesi praktikum KBM
          </p>
        </Card>

        <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Rusak / Butuh Perbaikan
          </span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {saranaCounts?.rusak || 0} <span className="text-xs font-normal text-slate-400">Unit</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Perlu pengajuan servis ke tim Sarpras
          </p>
        </Card>
      </div>

      {/* Tabel Aset & Inventaris Lab */}
      <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Inventaris Sarana Praktik Kejuruan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log peralatan spesifik jurusan yang dikelola toolman dan instruktur lab.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/sarpras/inventaris')}
              className="text-xs font-semibold rounded-xl"
            >
              Buka Sarpras
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/sarpras/perbaikan')}
              className="text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Lapor Kerusakan
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/70 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Sarana / Alat</th>
                <th className="py-3 px-4">Kode Aset</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Lokasi Bengkel</th>
                <th className="py-3 px-4 text-center">Kondisi</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(saranaList || [])?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada inventaris alat yang terdaftar untuk bengkel jurusan ini.
                  </td>
                </tr>
              ) : (
                (saranaList || [])?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {item.nama}
                      </div>
                      {item.peminjam && (
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          Dipinjam: {item.peminjam}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {item.kode}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.kategori}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {item.lokasi}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.kondisi === 'BAIK' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          Baik
                        </span>
                      )}
                      {item.kondisi === 'RUSAK' && (
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                          Rusak
                        </span>
                      )}
                      {item.kondisi === 'PERBAIKAN' && (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          Servis
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                          item.status === 'TERSEDIA'
                            ? 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                            : 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 font-semibold'
                        )}
                      >
                        {item.status === 'TERSEDIA' ? 'Tersedia' : 'Dipinjam'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});

KaprogSaranaTab.displayName = 'KaprogSaranaTab';
