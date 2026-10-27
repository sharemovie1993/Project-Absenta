import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Eye,
  Check,
  X,
  MessageSquare,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import { toast } from 'react-hot-toast';
import type { SiswaBimbinganItem } from '../types';

export interface LogbookItem {
  id: string;
  penempatan_id: string;
  nama_siswa: string;
  kelas: string;
  nama_mitra: string;
  tanggal: string;
  jam_masuk?: string;
  jam_pulang?: string;
  kegiatan: string;
  image_url?: string;
  status_verifikasi: 'MENUNGGU_REVIEW' | 'DISETUJUI' | 'REVISI';
  catatan_pembimbing?: string;
}

export interface PklJurnalTabProps {
  siswaList: SiswaBimbinganItem[];
  logbookList?: LogbookItem[];
  onApproveLogbook?: (logbookId: string) => Promise<void>;
  onRejectLogbook?: (logbookId: string, catatan: string) => Promise<void>;
  onOpenSiswaDetail?: (penempatanId: string) => void;
}

export const PklJurnalTab: React.FC<PklJurnalTabProps> = ({
  siswaList,
  logbookList = [],
  onApproveLogbook,
  onRejectLogbook,
  onOpenSiswaDetail,
}) => {
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'MENUNGGU_REVIEW' | 'DISETUJUI' | 'REVISI'>('MENUNGGU_REVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [revisiModalItem, setRevisiModalItem] = useState<LogbookItem | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const displayItems: LogbookItem[] = logbookList;

  const filteredLogs = displayItems.filter((log) => {
    const matchStatus = statusFilter === 'SEMUA' || log.status_verifikasi === statusFilter;
    const matchSearch =
      log.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleApprove = async (item: LogbookItem) => {
    setSubmittingId(item.id);
    try {
      if (onApproveLogbook) {
        await onApproveLogbook(item.id);
      }
      toast.success(`Jurnal ${item.nama_siswa} berhasil diverifikasi!`);
    } catch {
      toast.error('Gagal memverifikasi jurnal.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleOpenRevisi = (item: LogbookItem) => {
    setRevisiModalItem(item);
    setCatatanRevisi(item.catatan_pembimbing || '');
  };

  const handleConfirmRevisi = async () => {
    if (!revisiModalItem) return;
    if (!catatanRevisi.trim()) {
      toast.error('Wajib mengisi catatan perbaikan/revisi.');
      return;
    }
    setSubmittingId(revisiModalItem.id);
    try {
      if (onRejectLogbook) {
        await onRejectLogbook(revisiModalItem.id, catatanRevisi);
      }
      toast.success('Catatan revisi telah dikirim ke siswa!');
      setRevisiModalItem(null);
    } catch {
      toast.error('Gagal mengirim revisi.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Cari nama siswa atau uraian kegiatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm rounded-xl h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['MENUNGGU_REVIEW', 'DISETUJUI', 'REVISI', 'SEMUA'] as const).map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(st)}
                className="text-xs font-bold rounded-xl h-9 shrink-0"
              >
                {st === 'MENUNGGU_REVIEW'
                  ? 'Perlu Review'
                  : st === 'DISETUJUI'
                  ? 'Disetujui'
                  : st === 'REVISI'
                  ? 'Revisi'
                  : 'Semua Status'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Logbook Items List */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Seluruh Jurnal Telah Ditinjau
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tidak ada jurnal logbook magang dengan status ini yang memerlukan tindakan Anda saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {log.nama_siswa}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {log.kelas}
                    </Badge>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {log.nama_mitra}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{log.tanggal}</span>
                    {log.jam_masuk && (
                      <span className="text-slate-400">({log.jam_masuk} - {log.jam_pulang || 'Selesai'})</span>
                    )}
                  </div>
                </div>

                <Badge
                  variant={
                    log.status_verifikasi === 'DISETUJUI'
                      ? 'success'
                      : log.status_verifikasi === 'REVISI'
                      ? 'danger'
                      : 'warning'
                  }
                  className="text-xs font-extrabold uppercase px-2.5 py-1 w-fit"
                >
                  {log.status_verifikasi === 'MENUNGGU_REVIEW' ? 'Menunggu Review' : log.status_verifikasi}
                </Badge>
              </div>

              {/* Uraian Kegiatan Logbook */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {log.kegiatan}
              </div>

              {log.image_url && (
                <div className="pt-1">
                  <a
                    href={log.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <ExternalLink size={12} />
                    <span>Lihat Bukti Foto Kegiatan PKL ↗</span>
                  </a>
                </div>
              )}

              {log.catatan_pembimbing && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200">
                  <span className="font-bold">Catatan Revisi Anda:</span> {log.catatan_pembimbing}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                {onOpenSiswaDetail && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenSiswaDetail(log.penempatan_id)}
                    className="text-xs font-bold rounded-xl h-8 gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mr-auto"
                    title="Buka seluruh histori kalender jurnal siswa ini"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Histori Lengkap</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenRevisi(log)}
                  disabled={submittingId === log.id}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5 text-rose-600 dark:text-rose-400"
                >
                  <MessageSquare size={14} />
                  Minta Revisi
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleApprove(log)}
                  disabled={submittingId === log.id || log.status_verifikasi === 'DISETUJUI'}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Check size={14} />
                  {log.status_verifikasi === 'DISETUJUI' ? 'Sudah Terverifikasi' : 'Setujui Jurnal'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog Catatan Revisi */}
      {revisiModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Beri Catatan Revisi Jurnal
            </h3>
            <p className="text-xs text-slate-500">
              Siswa: <span className="font-bold text-slate-800 dark:text-slate-200">{revisiModalItem.nama_siswa}</span> ({revisiModalItem.tanggal})
            </p>
            <textarea
              rows={4}
              placeholder="Jelaskan apa yang harus diperbaiki oleh siswa (misal: mohon lengkapi dokumentasi foto atau deskripsi teknis alat)..."
              value={catatanRevisi}
              onChange={(e) => setCatatanRevisi(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevisiModalItem(null)}
                className="text-xs font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRevisi}
                className="text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Kirim Revisi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
