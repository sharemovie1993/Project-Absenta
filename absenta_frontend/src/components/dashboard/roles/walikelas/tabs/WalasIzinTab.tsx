import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  FileText, 
  ExternalLink, 
  MessageCircle, 
  Search,
  Filter,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { 
  getPermohonanIzinList, 
  updatePermohonanIzinStatus 
} from '@/api/kurikulum/waliKelas.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { WalasDashboardData } from '../types';

export interface WalasIzinTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasIzinTab: React.FC<WalasIzinTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'DISETUJUI' | 'DITOLAK' | ''>('PENDING');
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<any | null>(null);
  const [approvingItem, setApprovingItem] = useState<any | null>(null);
  const [catatanPenolakan, setCatatanPenolakan] = useState('');

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

  // 1. Fetch Permohonan Izin
  const { data: izinRes, isLoading } = useQuery({
    queryKey: ['walas-izin-list', kelasId, statusFilter],
    queryFn: () => getPermohonanIzinList(statusFilter || undefined, kelasId),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  const rawIzinList = Array.isArray(izinRes?.data) ? izinRes.data : (Array.isArray(izinRes) ? izinRes : []);

  // 2. Mutation Update Status (Approve/Reject)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: 'DISETUJUI' | 'DITOLAK'; catatan?: string }) => 
      updatePermohonanIzinStatus(id, { status, catatan_penolakan: catatan }),
    onSuccess: (_, variables) => {
      toast.success(variables.status === 'DISETUJUI' ? 'Permohonan izin berhasil disetujui' : 'Permohonan izin ditolak');
      setRejectingItem(null);
      setCatatanPenolakan('');
      queryClient.invalidateQueries({ queryKey: ['walas-izin-list'] });
      queryClient.invalidateQueries({ queryKey: ['walas-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['walas-rekap-bulanan'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memproses permohonan izin');
    }
  });

  const handleApprove = (item: any) => {
    setApprovingItem(item);
  };

  const handleConfirmApprove = () => {
    if (approvingItem) {
      updateStatusMutation.mutate({ id: approvingItem.id, status: 'DISETUJUI' });
      setApprovingItem(null);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatanPenolakan.trim()) {
      toast.error('Catatan alasan penolakan wajib diisi');
      return;
    }
    if (rejectingItem) {
      updateStatusMutation.mutate({
        id: rejectingItem.id,
        status: 'DITOLAK',
        catatan: catatanPenolakan.trim(),
      });
    }
  };

  const getTipeIzinBadge = (tipe: string) => {
    switch (tipe) {
      case 'SAKIT':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sakit (Dokter)</Badge>;
      case 'IZIN_KELUARGA':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Izin Keluarga</Badge>;
      case 'DISPENSASI':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Dispensasi Lomba</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">{tipe || 'Izin'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. HEADER & STATUS FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Persetujuan Surat Izin Siswa</span>
              {data?.izinPendingCount ? (
                <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5">
                  {data.izinPendingCount} Perlu Ditindaklanjuti
                </Badge>
              ) : null}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifikasi permohonan surat dokter / izin yang diajukan orang tua siswa untuk sinkronisasi absensi
            </p>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-stretch sm:self-auto">
          {[
            { id: 'PENDING', label: 'Menunggu Approval' },
            { id: 'DISETUJUI', label: 'Disetujui' },
            { id: 'DITOLAK', label: 'Ditolak' },
            { id: '', label: 'Semua Status' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === st.id
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. DAFTAR PERMOHONAN IZIN */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat daftar permohonan izin...</div>
        ) : rawIzinList && rawIzinList.length > 0 ? (
          rawIzinList.map((item: any) => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'DISETUJUI';
            const isRejected = item.status === 'DITOLAK';

            return (
              <Card 
                key={item.id} 
                className={cn(
                  "p-5 rounded-2xl border transition-all space-y-4",
                  isPending ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center shrink-0">
                      {item.Siswa?.nama_siswa?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.Siswa?.nama_siswa || 'Peserta Didik'}</span>
                        <span className="text-xs font-normal text-slate-400">NIS: {item.Siswa?.nis || '-'}</span>
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {getTipeIzinBadge(item.tipe_izin)}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s.d. {new Date(item.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs font-bold px-2.5 py-1",
                        isPending && "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
                        isApproved && "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300",
                        isRejected && "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Alasan / Keterangan:</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{item.alasan}</p>
                  </div>

                  {item.catatan_penolakan && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                      <strong>Alasan Penolakan:</strong> {item.catatan_penolakan}
                    </div>
                  )}

                  {item.attachment_url && (
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-7"
                        onClick={() => setSelectedAttachment(item.attachment_url)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Surat Dokter / Lampiran
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Approval Walas */}
                {isPending && !isHistorical && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => setRejectingItem(item)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak Izin
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                      onClick={() => handleApprove(item)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Setujui & Sinkronkan Absen
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
            <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tidak Ada Permohonan Izin</p>
            <p className="text-xs text-slate-400 mt-1">
              Surat izin atau sakit yang diajukan orang tua siswa melalui aplikasi mobile akan masuk ke halaman ini.
            </p>
          </Card>
        )}
      </div>

      {/* 3. MODAL VIEWER LAMPIRAN */}
      <Modal
        isOpen={Boolean(selectedAttachment)}
        onClose={() => setSelectedAttachment(null)}
        title="Dokumen Lampiran Izin / Surat Dokter"
        size="lg"
      >
        <div className="p-4 space-y-4 text-center">
          {selectedAttachment && (
            <img 
              src={selectedAttachment} 
              alt="Lampiran Surat Dokter" 
              className="max-h-[500px] mx-auto rounded-xl shadow-md border border-slate-200"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedAttachment(null)}
          >
            Tutup Pratinjau
          </Button>
        </div>
      </Modal>

      {/* 4. MODAL ALASAN PENOLAKAN IZIN */}
      <Modal
        isOpen={Boolean(rejectingItem)}
        onClose={() => setRejectingItem(null)}
        title="Konfirmasi Penolakan Surat Izin"
        size="md"
      >
        <form onSubmit={handleConfirmReject} className="p-4 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Berikan alasan penolakan untuk disampaikan kembali kepada orang tua siswa:
          </p>
          <textarea
            rows={3}
            placeholder="e.g. Surat dokter tidak memuat stempel klinik resmi, mohon lampirkan ulang..."
            value={catatanPenolakan}
            onChange={(e) => setCatatanPenolakan(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectingItem(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              disabled={updateStatusMutation.isPending}
            >
              Konfirmasi Tolak
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL KONFIRMASI PERSETUJUAN IZIN */}
      <Modal
        isOpen={Boolean(approvingItem)}
        onClose={() => setApprovingItem(null)}
        title="Konfirmasi Persetujuan Surat Izin"
        size="sm"
      >
        <div className="p-4 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin menyetujui permohonan izin <strong className="text-slate-900 dark:text-white">{approvingItem?.tipe_izin}</strong> untuk siswa <strong className="text-slate-900 dark:text-white">{approvingItem?.Siswa?.nama_siswa || 'siswa terpilih'}</strong>?
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
            ✓ Catatan absensi pada tanggal tersebut akan otomatis disinkronkan ke rekapitulasi kehadiran kelas dan gerbang sekolah.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApprovingItem(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={updateStatusMutation.isPending}
              onClick={handleConfirmApprove}
            >
              {updateStatusMutation.isPending ? 'Menyetujui...' : 'Ya, Setujui Permohonan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

WalasIzinTab.displayName = 'WalasIzinTab';
