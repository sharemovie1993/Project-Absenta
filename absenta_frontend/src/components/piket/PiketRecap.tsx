import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FileText, Printer, Calendar, RefreshCw } from 'lucide-react';
import { piketApi } from '../../api/piket.api';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { Table } from '../ui/Table';

interface PiketRecapProps {
  onUpdatePrintData: (permits: IzinKeluarSiswa[], label: string, sigDate?: string) => void;
  printPaperSize: string;
  setPrintPaperSize: React.Dispatch<React.SetStateAction<string>>;
  setIsPrintingRekap: React.Dispatch<React.SetStateAction<boolean>>;
  setPrintedPermit: React.Dispatch<React.SetStateAction<(IzinKeluarSiswa & { qrCodeUrl?: string }) | null>>;
  tenantInfo: any;
}

// Timezone-safe local ISO date utility
const getLocalISODate = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
};

export const PiketRecap: React.FC<PiketRecapProps> = ({
  onUpdatePrintData,
  printPaperSize,
  setPrintPaperSize,
  setIsPrintingRekap,
  setPrintedPermit,
  tenantInfo
}) => {
  const [filterOption, setFilterOption] = useState<'today' | 'yesterday' | 'range' | 'month'>('today');
  const [startDate, setStartDate] = useState(getLocalISODate(new Date()));
  const [endDate, setEndDate] = useState(getLocalISODate(new Date()));
  const [recapPermits, setRecapPermits] = useState<IzinKeluarSiswa[]>([]);
  const [recapDateLabel, setRecapDateLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchRecapData = async (option: string, start?: string, end?: string) => {
    setLoading(true);
    try {
      let params: { date?: string; startDate?: string; endDate?: string } = {};
      const today = new Date();
      let label = '';
      let sigDateStr = '';

      if (option === 'today') {
        const todayStr = getLocalISODate(today);
        params = { date: todayStr };
        label = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        sigDateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (option === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalISODate(yesterday);
        params = { date: yesterdayStr };
        label = yesterday.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        sigDateStr = yesterday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (option === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        const startStr = getLocalISODate(oneMonthAgo);
        const endStr = getLocalISODate(today);
        params = { startDate: startStr, endDate: endStr };
        label = `${oneMonthAgo.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - ${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        sigDateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (option === 'range' && start && end) {
        params = { startDate: start, endDate: end };
        const dStart = new Date(start);
        const dEnd = new Date(end);
        label = `${dStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - ${dEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        sigDateStr = dEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      const res = await piketApi.getDailyPermits(params);
      if (res.success) {
        setRecapPermits(res.data);
        setRecapDateLabel(label);
        // Sync with parent for printing portal
        onUpdatePrintData(res.data, label, sigDateStr);
      }
    } catch (err) {
      console.error('Failed to fetch recap:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount or when filter changes (auto-apply for today, yesterday, month)
  useEffect(() => {
    if (filterOption !== 'range') {
      fetchRecapData(filterOption);
    }
  }, [filterOption]);

  const handleApplyRange = () => {
    fetchRecapData('range', startDate, endDate);
  };

  const columns = [
    {
      key: 'no',
      label: 'No',
      className: 'w-12 text-center font-bold text-gray-400',
      render: (v: number) => <Badge variant="outline" className="border-none text-gray-400 px-0">{v}</Badge>
    },
    {
      key: 'nama',
      label: 'Nama Siswa',
      render: (_: any, row: IzinKeluarSiswa) => (
        <Badge variant="outline" className="border-none p-0 text-gray-900 dark:text-white font-black uppercase tracking-tight text-[11px] block text-left">
          {row.SiswaAkademik?.siswa.nama_siswa}
        </Badge>
      )
    },
    {
      key: 'kelas',
      label: 'Kelas / NIS',
      render: (_: any, row: IzinKeluarSiswa) => (
        <div className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">
          {row.SiswaAkademik?.kelas?.nama_kelas || '-'}
          <Badge variant="outline" className="text-[9px] font-medium block text-gray-400 border-none px-0 mt-0.5 text-left">NIS: {row.SiswaAkademik?.siswa.nis}</Badge>
        </div>
      )
    },
    {
      key: 'tipe',
      label: 'Tipe Izin',
      render: (_: any, row: IzinKeluarSiswa) => (
        <Badge variant="outline" className="text-[8px] font-black tracking-widest text-indigo-500 border-none px-0 uppercase">
          {row.tipe_izin === 'PULANG_AWAL' ? 'PULANG CEPAT' : 'IZIN SEMENTARA'}
        </Badge>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan Keperluan',
      className: 'max-w-xs',
      render: (v: string) => <span className="italic font-medium text-gray-600 dark:text-gray-300">"{v}"</span>
    },
    {
      key: 'jam_keluar',
      label: 'Jam Keluar',
      className: 'text-center font-bold text-gray-500',
      render: (v: string) => new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    },
    {
      key: 'jam_kembali',
      label: 'Jam Kembali',
      className: 'text-center font-bold text-gray-500',
      render: (v: string) => v ? new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
    },
    {
      key: 'status',
      label: 'Status',
      className: 'text-center',
      render: (v: string) => (
        <Badge variant={v === 'KEMBALI' ? 'success' : 'warning'} className="text-[9px] font-black tracking-widest uppercase">
          {v === 'KEMBALI' ? 'KEMBALI' : 'DI LUAR'}
        </Badge>
      )
    }
  ];

  const mappedData = React.useMemo(() => {
    return recapPermits.map((p, idx) => ({ ...p, no: idx + 1 }));
  }, [recapPermits]);

  return (
    <div className="space-y-6">
      {/* Dynamic Filter Section Card */}
      <Card className="p-8 rounded-3xl border-none shadow-xl bg-indigo-950 flex flex-col gap-6 border-l-8 border-emerald-500 relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="text-emerald-400" size={20} /> Rekapitulasi Laporan Piket
            </h2>
            <p className="text-xs text-indigo-200/80 max-w-lg leading-relaxed font-semibold">
              Filter dan cetak rekapitulasi data izin keluar siswa secara berkala. Format cetak otomatis menyesuaikan ukuran kertas A4 resmi.
            </p>
          </div>
          
          {/* Printing Action Button */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => {
                setPrintPaperSize('a4');
                setIsPrintingRekap(true);
                setPrintedPermit(null);
                setTimeout(() => {
                  window.print();
                  setIsPrintingRekap(false);
                }, 300);
              }}
              disabled={recapPermits.length === 0 || loading}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-indigo-950 font-black text-xs uppercase tracking-widest px-6 py-3 flex items-center gap-2 shadow-lg shadow-emerald-500/10 border-none transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Printer size={14} /> Cetak Rekap Laporan ({recapPermits.length} Data)
            </Button>
          </div>
        </div>

        {/* Filter Controls Block */}
        <div className="bg-indigo-900/40 border border-indigo-800/40 rounded-xl p-6 flex flex-col md:flex-row flex-wrap items-center gap-4 relative z-10">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'month', label: '1 Bulan Terakhir' },
              { id: 'range', label: 'Rentang Tanggal' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilterOption(opt.id as any)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                  filterOption === opt.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date range picker - visible only if 'range' option is selected */}
          {filterOption === 'range' && (
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto animate-fadeIn">
              <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/60 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-indigo-400 font-bold uppercase">Mulai:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs border-none outline-none focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/60 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-indigo-400 font-bold uppercase">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs border-none outline-none focus:ring-0 cursor-pointer"
                />
              </div>
              <Button
                onClick={handleApplyRange}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2 border-none shadow-md shadow-indigo-600/10"
              >
                Terapkan
              </Button>
            </div>
          )}

          {/* Active Date Label Preview */}
          <div className="ml-auto flex items-center gap-2 text-indigo-200/80 font-bold text-xs uppercase bg-indigo-950/40 px-4 py-2 rounded-xl border border-indigo-800/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 block animate-pulse" />
            Active: {recapDateLabel || 'Loading...'}
          </div>
        </div>
      </Card>

      {/* Preview Table Section */}
      <Card className="p-6 rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FileText className="text-indigo-500" size={16} /> Pratinjau Dokumen Laporan
          </h3>
          {loading && (
            <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-none px-3 py-1 flex items-center gap-1.5 animate-pulse">
              <RefreshCw size={10} className="animate-spin" /> Memuat Data...
            </Badge>
          )}
        </div>
        
        <Table
          data={mappedData}
          columns={columns}
          emptyMessage={loading ? "Sedang memuat data dari server..." : `Tidak ada data izin yang ditemukan untuk periode "${recapDateLabel}".`}
        />
      </Card>
    </div>
  );
};
