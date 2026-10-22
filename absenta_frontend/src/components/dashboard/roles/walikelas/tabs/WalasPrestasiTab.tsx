import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Trophy, 
  Award, 
  Medal, 
  Star, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Users
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { getPrestasiList } from '@/api/kurikulum/waliKelas.api';
import { cn } from '@/lib/utils';
import type { WalasDashboardData } from '../types';

export interface WalasPrestasiTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

interface PrestasiItem {
  id: string;
  nama: string;
  bidang?: string;
  tingkat?: string;
  peringkat?: string;
  tahun?: number | string;
  tanggal?: string;
  penyelenggara?: string;
  keterangan?: string;
  siswa?: {
    id: string;
    nama: string;
    nis?: string;
    nisn?: string;
    foto?: string;
  };
  poin_penghargaan?: number;
}

export const WalasPrestasiTab: React.FC<WalasPrestasiTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBidang, setSelectedBidang] = useState<string>('ALL');
  const [selectedTingkat, setSelectedTingkat] = useState<string>('ALL');
  const [selectedPrestasi, setSelectedPrestasi] = useState<PrestasiItem | null>(null);

  // Fetch Prestasi Siswa
  const { data: prestasiRes, isLoading } = useQuery({
    queryKey: ['walas-prestasi', kelasId],
    queryFn: () => getPrestasiList(kelasId, 100),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  const prestasiList: PrestasiItem[] = useMemo(() => {
    const raw = (prestasiRes as any)?.data || prestasiRes || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      id: item.id || `pres-${Math.random()}`,
      nama: item.nama || item.judul || item.nama_prestasi || 'Prestasi Siswa',
      bidang: item.bidang || item.kategori || 'Akademik',
      tingkat: item.tingkat || 'Sekolah',
      peringkat: item.peringkat || item.juara || 'Juara',
      tahun: item.tahun || new Date().getFullYear(),
      tanggal: item.tanggal || item.created_at || new Date().toISOString(),
      penyelenggara: item.penyelenggara || '-',
      keterangan: item.keterangan || item.deskripsi || '',
      siswa: item.siswa ? {
        id: item.siswa.id,
        nama: item.siswa.nama_lengkap || item.siswa.nama || 'Siswa',
        nis: item.siswa.nis,
        nisn: item.siswa.nisn,
        foto: item.siswa.foto_profil || item.siswa.foto,
      } : undefined,
      poin_penghargaan: item.poin_penghargaan || item.poin || 10,
    }));
  }, [prestasiRes]);

  // Filtered List
  const filteredPrestasi = useMemo(() => {
    return prestasiList.filter((item) => {
      const matchSearch = !searchQuery || 
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.siswa?.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.penyelenggara?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchBidang = selectedBidang === 'ALL' || 
        item.bidang?.toUpperCase() === selectedBidang.toUpperCase();
      
      const matchTingkat = selectedTingkat === 'ALL' || 
        item.tingkat?.toUpperCase() === selectedTingkat.toUpperCase();

      return matchSearch && matchBidang && matchTingkat;
    });
  }, [prestasiList, searchQuery, selectedBidang, selectedTingkat]);

  // Leaderboard Bintang Siswa
  const studentLeaderboard = useMemo(() => {
    const map = new Map<string, { nama: string; nis?: string; totalPrestasi: number; totalPoin: number }>();
    prestasiList.forEach((item) => {
      if (!item.siswa?.id) return;
      const existing = map.get(item.siswa.id) || {
        nama: item.siswa.nama,
        nis: item.siswa.nis,
        totalPrestasi: 0,
        totalPoin: 0,
      };
      existing.totalPrestasi += 1;
      existing.totalPoin += (item.poin_penghargaan || 10);
      map.set(item.siswa.id, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalPoin - a.totalPoin || b.totalPrestasi - a.totalPrestasi)
      .slice(0, 3);
  }, [prestasiList]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = prestasiList.length;
    const juara1 = prestasiList.filter(p => p.peringkat?.toLowerCase().includes('1') || p.peringkat?.toLowerCase().includes('emas') || p.peringkat?.toLowerCase().includes('pertama')).length;
    const nasional = prestasiList.filter(p => p.tingkat?.toLowerCase().includes('nasional') || p.tingkat?.toLowerCase().includes('provinsi')).length;
    return { total, juara1, nasional };
  }, [prestasiList]);

  const getTingkatBadgeColor = (tingkat?: string) => {
    const t = (tingkat || '').toLowerCase();
    if (t.includes('internasional')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    if (t.includes('nasional')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (t.includes('provinsi')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
    if (t.includes('kota') || t.includes('kabupaten')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Prestasi</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Tercatat di rombel {kelasNama || ''}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Juara 1 / Emas</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.juara1}</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Penghargaan Tertinggi</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
            <Medal className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Provinsi / Nasional</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.nasional}</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Skala Tingkat Tinggi</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bintang Kelas</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{studentLeaderboard.length}</p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Siswa kontributor utama</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Leaderboard Highlight */}
      {studentLeaderboard.length > 0 && (
        <Card className="p-5 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/60 dark:border-amber-900/40">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Bintang Prestasi Rombel
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {studentLeaderboard.map((student, idx) => (
              <div 
                key={student.nama + idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                  idx === 0 ? "bg-amber-500 text-white shadow-xs shadow-amber-500/30" :
                  idx === 1 ? "bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200" :
                  "bg-amber-700/60 text-white"
                )}>
                  #{idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{student.nama}</p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                    {student.totalPrestasi} Prestasi · {student.totalPoin} Poin
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari prestasi, nama siswa, atau penyelenggara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedBidang}
            onChange={(e) => setSelectedBidang(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="ALL">Semua Bidang</option>
            <option value="AKADEMIK">Akademik</option>
            <option value="NON-AKADEMIK">Non-Akademik</option>
            <option value="LKS">LKS / Kejuruan</option>
            <option value="OLAHRAGA">Olahraga</option>
            <option value="SENI">Seni & Budaya</option>
          </select>

          <select
            value={selectedTingkat}
            onChange={(e) => setSelectedTingkat(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="ALL">Semua Tingkat</option>
            <option value="SEKOLAH">Sekolah</option>
            <option value="KECAMATAN">Kecamatan</option>
            <option value="KOTA">Kota / Kab</option>
            <option value="PROVINSI">Provinsi</option>
            <option value="NASIONAL">Nasional</option>
            <option value="INTERNASIONAL">Internasional</option>
          </select>
        </div>
      </div>

      {/* Prestasi List */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs">Memuat data prestasi rombel...</p>
        </div>
      ) : filteredPrestasi.length === 0 ? (
        <Card className="py-12 px-4 text-center border-dashed">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum Ada Catatan Prestasi</p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedBidang !== 'ALL' || selectedTingkat !== 'ALL'
              ? 'Tidak ditemukan prestasi yang sesuai dengan kriteria filter.'
              : 'Siswa di rombel ini belum memiliki data prestasi yang diarsipkan pada sistem.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPrestasi.map((item) => (
            <Card 
              key={item.id} 
              className="p-4 hover:border-amber-400/60 dark:hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between group"
              onClick={() => setSelectedPrestasi(item)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className={cn("text-[10px] font-semibold border", getTingkatBadgeColor(item.tingkat))}>
                    {item.tingkat || 'Sekolah'}
                  </Badge>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    {item.peringkat}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {item.nama}
                </h4>

                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                  Penyelenggara: <span className="font-medium text-slate-700 dark:text-slate-300">{item.penyelenggara}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0">
                  <Users className="w-3.5 h-3.5 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.siswa?.nama || 'Siswa Rombel'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>{new Date(item.tanggal || Date.now()).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrestasi && (
        <Modal
          isOpen={Boolean(selectedPrestasi)}
          onClose={() => setSelectedPrestasi(null)}
          title="Detail Dokumen Prestasi Siswa"
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {selectedPrestasi.peringkat} • Tingkat {selectedPrestasi.tingkat}
                </p>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedPrestasi.nama}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <span className="text-slate-700 dark:text-slate-300 block text-[11px]">Nama Peraih:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPrestasi.siswa?.nama || '-'}</span>
                {selectedPrestasi.siswa?.nis && (
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 block">NIS: {selectedPrestasi.siswa.nis}</span>
                )}
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <span className="text-slate-700 dark:text-slate-300 block text-[11px]">Bidang / Kategori:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPrestasi.bidang}</span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block">Poin Apresiasi: +{selectedPrestasi.poin_penghargaan}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="text-slate-700 dark:text-slate-300 font-medium">Penyelenggara Kegiatan:</p>
              <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium">
                {selectedPrestasi.penyelenggara}
              </p>
            </div>

            {selectedPrestasi.keterangan && (
              <div className="space-y-1.5 text-xs">
                <p className="text-slate-700 dark:text-slate-300 font-medium">Catatan / Deskripsi Tambahan:</p>
                <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedPrestasi.keterangan}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedPrestasi(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

WalasPrestasiTab.displayName = 'WalasPrestasiTab';
