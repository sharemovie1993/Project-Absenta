import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Shield,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  getKetarunaanPendamping,
  tapKetarunaanPendamping,
  type KetarunaanPendamping,
} from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanKepanitiaanTabProps {
  jadwalKegiatanId: string | null;
  sesiId: string | null;
  refetchSesi: () => void;
}

function statusBadge(status: string) {
  if (status === 'HADIR') return <Badge variant="success" className="text-[10px]">Hadir</Badge>;
  if (status === 'IZIN') return <Badge variant="warning" className="text-[10px]">Izin</Badge>;
  if (status === 'SAKIT') return <Badge variant="warning" className="text-[10px]">Sakit</Badge>;
  if (status === 'ALPA') return <Badge variant="error" className="text-[10px]">Alpa</Badge>;
  return <Badge variant="outline" className="text-[10px]">Belum</Badge>;
}

function jabatanLabel(kode: string) {
  const map: Record<string, string> = {
    KETUA_PEMBINA_TARUNA: '🎖️ Ketua Pembina Taruna',
    KAPROG: '🏛️ Kaprog',
    WALIKELAS: '🏫 Wali Kelas',
    GURU_MAPEL: '📚 Guru Mapel (Beririsan)',
    KEPALA_SEKOLAH: '👑 Kepala Sekolah',
    KESISWAAN: '🧑‍🎓 Waka Kesiswaan',
    PEMBINA_ESKUL: '🚩 Pembina OSIS',
  };
  return map[kode] || kode;
}

export const KetarunaanKepanitiaanTab: React.FC<KetarunaanKepanitiaanTabProps> = ({
  jadwalKegiatanId,
  sesiId,
  refetchSesi,
}) => {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ketarunaan-pendamping', sesiId, jadwalKegiatanId],
    queryFn: () => getKetarunaanPendamping({
      sesi_id: sesiId ?? undefined,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    staleTime: 30_000,
  });

  const pendamping = data?.data ?? [];
  const realSesiId = data?.sesi_id ?? sesiId;

  const tapMutation = useMutation({
    mutationFn: (payload: { guru_id: string; status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA' }) =>
      tapKetarunaanPendamping({
        guru_id: payload.guru_id,
        sesi_id: realSesiId!,
        status: payload.status,
        catatan: payload.status === 'HADIR' ? 'Hadir via Terminal Khusus Ketarunaan' : undefined,
      }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Presensi dicatat');
      if (res?.synced_kbm) {
        toast.success('✅ Otomatis tersinkronisasi ke Sesi KBM Reguler', { duration: 4000 });
      }
      refetch();
      qc.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
    },
    onError: () => toast.error('Gagal mencatat presensi'),
  });

  const groups = useMemo(() => {
    const g: Record<string, KetarunaanPendamping[]> = {};
    pendamping.forEach(p => {
      const key = p.jabatan_kode;
      if (!g[key]) g[key] = [];
      g[key].push(p);
    });
    return g;
  }, [pendamping]);

  const hadirCount = pendamping.filter(p => p.status === 'HADIR').length;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!realSesiId && pendamping.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-bold">Belum ada sesi Ketarunaan hari ini</p>
        <p className="text-xs mt-1">Sesi otomatis terbuka saat jam Ketarunaan berlangsung</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header ringkasan */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Daftar Pendamping Hari Ini</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{hadirCount} / {pendamping.length} hadir</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { refetch(); refetchSesi(); }} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Tabel per kelompok jabatan */}
      <div className="space-y-4">
        {Object.entries(groups).map(([kode, list]) => (
          <div key={kode} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {jabatanLabel(kode)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {list.filter(x => x.status === 'HADIR').length}/{list.length} Hadir
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map(p => (
                <div key={p.guru_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.nama_guru}</p>
                      {p.kelas_nama && <p className="text-[11px] text-slate-400">{p.kelas_nama}</p>}
                      {p.catatan && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic truncate">
                          {p.catatan}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(p.status)}
                    {p.status === 'BELUM_TAP' && realSesiId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                        disabled={tapMutation.isPending}
                        onClick={() => tapMutation.mutate({ guru_id: p.guru_id, status: 'HADIR' })}
                      >
                        {tapMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
