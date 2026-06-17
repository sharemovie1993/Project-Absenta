import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Filter, 
  Building2, 
  Activity,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input } from '../../components/ui';
import { PklStatusBadge } from '../../components/hubin/PklStatusBadge';

const MonitoringPklPage: React.FC = () => {
  const { subscription } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filterClass, setFilterClass] = useState('all');

  // Gating Logic
  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');
  const isEnabled = subscription !== undefined && !isLocked;

  // Queries
  const { data: penempatanData, isLoading, refetch } = useQuery({
    queryKey: ['penempatan-pkl', { search: searchTerm, page, limit: 100 }],
    queryFn: () => hubinApi.getPenempatan({ search: searchTerm, page, limit: 100 }),
    enabled: isEnabled
  });

  // Helper to find today's attendance record
  const getTodayAbsen = (absensiPkl: any[]) => {
    if (!absensiPkl || absensiPkl.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return absensiPkl.find((a: any) => {
      const aStr = new Date(a.tanggal).toISOString().split('T')[0];
      return aStr === todayStr;
    });
  };

  const rawPenempatan = useMemo(() => {
    return Array.isArray(penempatanData?.data) ? penempatanData.data : (penempatanData as any)?.data || [];
  }, [penempatanData]);

  const pagination = useMemo(() => penempatanData?.pagination || null, [penempatanData]);

  const paginationProps = useMemo(() => {
    if (!pagination) return undefined;
    return {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.total,
      itemsPerPage: pagination.limit,
      onPageChange: (newPage: number) => setPage(newPage),
    };
  }, [pagination]);

  // Process dynamic items
  const monitoringItems = useMemo(() => {
    return rawPenempatan.filter((p: any) => {
      // Still need class filtering on client side if backend doesn't support it yet
      // but search is already handled by server
      const matchesClass = filterClass === 'all' || (p.Siswa?.Kelas?.nama_kelas || 'XII - PKL') === filterClass;
      return matchesClass;
    }).map((p: any) => {
      const todayAbsen = getTodayAbsen(p.AbsensiPkl || []);
      
      const formatHumanTime = (t?: string) => {
        if (!t) return '-';

        // Jika format ISO (mengandung T)
        if (t.includes('T')) {
          try {
            const parsed = parseISO(t);
            if (isValid(parsed)) return format(parsed, 'HH:mm');
          } catch (e) { /* fallback */ }
        }

        if (t.includes(':')) {
          const parts = t.split(':');
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return t;
      };

      return {
        id: p.id,
        siswa: p.Siswa?.nama_siswa || p.Siswa?.full_name || 'N/A',
        kelas: p.Siswa?.Kelas?.nama_kelas || 'XII - PKL',
        perusahaan: p.Mitra?.nama || 'N/A',
        lokasi: p.Mitra?.alamat || '-',
        status: todayAbsen ? todayAbsen.status : 'BELUM ABSEN',
        lastSync: todayAbsen ? formatHumanTime(todayAbsen.jam_masuk) : '-',
        koordinat: todayAbsen && todayAbsen.latitude_masuk ? `${todayAbsen.latitude_masuk.toFixed(4)}, ${todayAbsen.longitude_masuk.toFixed(4)}` : null,
        isVerified: todayAbsen ? todayAbsen.is_verified : false
      };
    });
  }, [rawPenempatan]);

  // Filtering options
  const classesList = useMemo(() => {
    return Array.from(new Set(monitoringItems.map((item: any) => item.kelas))) as string[];
  }, [monitoringItems]);

  // Calculate stats dynamically for cards
  const totalSiswaAktif = useMemo(() => pagination?.total || 0, [pagination]);
  const totalHadirHariIni = useMemo(() => monitoringItems.filter((item: any) => item.status === 'HADIR').length, [monitoringItems]);
  const totalBelumAbsen = useMemo(() => monitoringItems.filter((item: any) => item.status === 'BELUM ABSEN').length, [monitoringItems]);

  const stats = useMemo(() => [
    {
      title: 'Siswa Aktif PKL',
      value: totalSiswaAktif,
      icon: <Activity size={24} />,
      gradient: 'from-blue-500 to-indigo-650'
    },
    {
      title: 'Hadir Hari Ini',
      value: totalHadirHariIni,
      icon: <CheckCircle2 size={24} />,
      gradient: 'from-emerald-400 to-teal-650'
    },
    {
      title: 'Belum Absen',
      value: totalBelumAbsen,
      icon: <AlertCircle size={24} />,
      gradient: 'from-rose-500 to-red-650'
    }
  ], [totalSiswaAktif, totalHadirHariIni, totalBelumAbsen]);

  // Smart Client-Side Excel Export
  const handleExcelExport = () => {
    if (monitoringItems.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    
    // CSV structure (Excel fully compatible with BOM)
    const headers = ['Nama Siswa', 'Kelas', 'Perusahaan Mitra', 'Status Presensi', 'Waktu Tap', 'Koordinat GPS'];
    const rows = monitoringItems.map((item: any) => [
      item.siswa,
      item.kelas,
      item.perusahaan,
      item.status,
      item.lastSync,
      item.koordinat || 'N/A'
    ]);
    
    // Add UTF-8 BOM for MS Excel compatibility
    const csvContent = "\uFEFF" + [
      headers.join(','), 
      ...rows.map((e: string[]) => e.map((val: string) => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Monitoring_PKL_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Laporan Keaktifan PKL berhasil diekspor ke Excel!');
  };

  const breadcrumbs = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Monitoring PKL', path: '/hubin/monitoring' }
  ];

  const toolbar = (
    <Button 
      onClick={handleExcelExport}
      variant="toolbarPrimary"
      size="toolbar"
    >
      <FileSpreadsheet size={16} className="mr-1.5" />
      Ekspor Excel
    </Button>
  );

  // Table Columns
  const columns = useMemo(() => [
    {
      key: 'siswa',
      label: 'Siswa / Kelas',
      sortable: true,
      render: (siswa: string, row: any) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{siswa}</div>
          <div className="text-xs text-slate-400 mt-0.5 font-medium">{row.kelas}</div>
        </div>
      )
    },
    {
      key: 'perusahaan',
      label: 'Perusahaan Mitra',
      sortable: true,
      render: (perusahaan: string) => (
        <span className="font-medium text-slate-750 dark:text-slate-300">
          {perusahaan}
        </span>
      )
    },
    {
      key: 'lokasi',
      label: 'Geoloc / Koordinat',
      render: (_: any, row: any) => row.koordinat ? (
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${row.koordinat}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 px-2.5 py-1.5 rounded-xl border border-indigo-100/50 w-fit hover:bg-indigo-100"
        >
          <MapPin size={12} className="text-red-500 shrink-0 animate-bounce" />
          <span>{row.koordinat}</span>
        </a>
      ) : (
        <div className="flex items-center gap-1 text-xs text-slate-450 dark:text-slate-550 max-w-xs line-clamp-2">
          <MapPin size={12} className="shrink-0" />
          <span>{row.lokasi}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Presensi Hari Ini',
      sortable: true,
      render: (status: string) => (
        <PklStatusBadge status={status} />
      )
    },
    {
      key: 'lastSync',
      label: 'Waktu Tap',
      render: (lastSync: string) => (
        <span className="font-mono text-xs text-slate-550 dark:text-slate-400">
          {lastSync === '-' ? '-' : (
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-slate-400" />
              {lastSync}
            </span>
          )}
        </span>
      )
    }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Monitoring PKL"
      description="Pantau progres siswa di lapangan secara real-time. Dapatkan rekap kehadiran bulanan, verifikasi logbook kegiatan, dan pantau titik koordinat siswa saat melakukan absensi di industri."
    >
      <AcademicPageLayout
        title="Monitoring PKL"
        description="Pantau kehadiran dan lokasi siswa PKL secara real-time."
        breadcrumbs={breadcrumbs}
        stats={stats}
        isLoadingStats={isLoading}
        toolbar={toolbar}
      >
        <SectionCard title="Aktivitas Monitoring PKL Siswa" icon={Activity} fullWidth noPadding>
          {/* Filters & Refresh */}
          <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center justify-between">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Cari siswa atau nama perusahaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <Filter className="text-slate-400" size={16} />
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none w-full md:w-44 cursor-pointer"
                >
                  <option value="all">Semua Kelas</option>
                  {classesList.map((cls: string) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="toolbarOutline"
                size="toolbarIcon"
                onClick={() => refetch()}
                disabled={isLoading}
                className="rounded-xl"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          <div className="bg-transparent overflow-hidden">
            <Table
              columns={columns}
              data={monitoringItems}
              loading={isLoading}
              emptyMessage="Tidak ada aktivitas presensi PKL yang terdeteksi hari ini."
              compact={true}
              pagination={paginationProps}
            />
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default MonitoringPklPage;
