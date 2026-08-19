import React, { useState } from 'react';
import { X, CheckCircle, XCircle, FileText, Calendar, Clock, BookOpen, AlertCircle, Loader2, UserCheck, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { guruIzinApi, type PermohonanIzinGuruItem } from '../../api/guruIzin.api';
import { guruApi } from '../../api/academic.api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TeacherLeaveApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveItem: PermohonanIzinGuruItem | null;
}

export const TeacherLeaveApprovalModal: React.FC<TeacherLeaveApprovalModalProps> = ({
  isOpen,
  onClose,
  leaveItem,
}) => {
  const queryClient = useQueryClient();
  const [catatan, setCatatan] = useState('');
  const [selectedGuruInvalId, setSelectedGuruInvalId] = useState<string>(leaveItem?.guru_inval_id || '');
  const [onlyShowRecommended, setOnlyShowRecommended] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  // Fetch Smart Inval Recommendations
  const { data: recRes, isLoading: loadingRec } = useQuery({
    queryKey: ['guru-inval-recommendations', leaveItem?.guru_id, leaveItem?.tanggal_mulai, leaveItem?.tanggal_selesai, leaveItem?.jam_mulai, leaveItem?.jam_selesai],
    queryFn: () => guruIzinApi.getInvalRecommendations({
      guru_id: leaveItem?.guru_id || '',
      tanggal_mulai: leaveItem?.tanggal_mulai || '',
      tanggal_selesai: leaveItem?.tanggal_selesai || '',
      jam_mulai: leaveItem?.jam_mulai || undefined,
      jam_selesai: leaveItem?.jam_selesai || undefined,
      tipe_durasi: leaveItem?.tipe_durasi || undefined
    }),
    enabled: isOpen && !!leaveItem?.guru_id
  });

  const recommendationData = recRes?.data;
  const allRecommendedTeachers = recommendationData?.recommendations || [];

  const filteredTeachers = React.useMemo(() => {
    if (!onlyShowRecommended) return allRecommendedTeachers;
    return allRecommendedTeachers.filter(t => !t.isBusy);
  }, [allRecommendedTeachers, onlyShowRecommended]);

  // Group teachers by category for optgroup
  const groupedTeachers = React.useMemo(() => {
    const map = new Map<string, typeof allRecommendedTeachers>();
    filteredTeachers.forEach(t => {
      const group = t.categoryLabel || 'Rekan Guru Lainnya';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(t);
    });
    return Array.from(map.entries());
  }, [filteredTeachers]);

  // Sync selectedGuruInvalId on modal open
  React.useEffect(() => {
    if (leaveItem?.guru_inval_id) {
      setSelectedGuruInvalId(leaveItem.guru_inval_id);
    } else {
      setSelectedGuruInvalId('');
    }
  }, [leaveItem]);

  if (!isOpen || !leaveItem) return null;

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      setActionType('APPROVE');
      const res = await guruIzinApi.approve(leaveItem.id, {
        guru_inval_id: selectedGuruInvalId || undefined
      });
      if (res.success) {
        toast.success(`Permohonan izin ${leaveItem.Guru?.nama_guru || 'Guru'} berhasil disetujui!`, { icon: '✅' });
        queryClient.invalidateQueries({ queryKey: ['guru-izin-list'] });
        queryClient.invalidateQueries({ queryKey: ['guru-inval-list-me'] });
        queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
        queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
        onClose();
      } else {
        toast.error(res.message || 'Gagal menyetujui permohonan.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReject = async () => {
    try {
      setIsProcessing(true);
      setActionType('REJECT');
      const res = await guruIzinApi.reject(leaveItem.id, catatan);
      if (res.success) {
        toast.success(`Permohonan izin telah ditolak.`, { icon: '❌' });
        queryClient.invalidateQueries({ queryKey: ['guru-izin-list'] });
        queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
        onClose();
      } else {
        toast.error(res.message || 'Gagal menolak permohonan.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const tipeBadgeColor =
    leaveItem.tipe_izin === 'SAKIT' ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800' :
    leaveItem.tipe_izin === 'DINAS_LUAR' ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Verifikasi Izin & Tugas Guru
              </h3>
              <p className="text-[11px] text-slate-400">
                Diajukan oleh: <span className="font-semibold text-slate-700 dark:text-slate-200">{leaveItem.Pengaju?.full_name || 'Guru'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Guru Profile Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Guru</span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {leaveItem.Guru?.nama_guru || '-'}
              </h4>
              <p className="text-[11px] font-mono text-slate-500">NIP: {leaveItem.Guru?.nip || '-'}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${tipeBadgeColor}`}>
              {leaveItem.tipe_izin.replace('_', ' ')}
            </span>
          </div>

          {/* Tanggal & Waktu */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                <Calendar size={11} />
                <span>Tanggal</span>
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatDate(leaveItem.tanggal_mulai)}
                {leaveItem.tanggal_mulai !== leaveItem.tanggal_selesai && ` s/d ${formatDate(leaveItem.tanggal_selesai)}`}
              </p>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                <Clock size={11} />
                <span>Durasi</span>
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                {leaveItem.tipe_durasi === 'SEBAGIAN_SESI' && leaveItem.jam_mulai && leaveItem.jam_selesai
                  ? `${leaveItem.jam_mulai} - ${leaveItem.jam_selesai} WIB`
                  : leaveItem.tipe_durasi === 'MULTI_HARI' ? 'Multi Hari' : '1 Hari Penuh'}
              </p>
            </div>
          </div>

          {/* Alasan / Keperluan */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Keterangan / Alasan:
            </span>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 font-medium">
              {leaveItem.alasan}
            </div>
          </div>

          {/* Tugas yang Dititipkan */}
          {(leaveItem.instruksi_tugas || (leaveItem.tugas_per_kelas && Object.keys(leaveItem.tugas_per_kelas).length > 0)) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={12} />
                <span>Instruksi Tugas untuk Kelas (Inval):</span>
              </span>

              {leaveItem.instruksi_tugas && (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 font-medium whitespace-pre-wrap">
                  {leaveItem.instruksi_tugas}
                </div>
              )}

              {leaveItem.tugas_per_kelas && Object.keys(leaveItem.tugas_per_kelas).length > 0 && (
                <div className="space-y-1.5 pt-1 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                  {Object.entries(leaveItem.tugas_per_kelas).map(([kId, taskTxt]) => (
                    <div key={kId} className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-300/70 dark:border-blue-800/60 space-y-1">
                      <span className="font-extrabold text-[11px] text-blue-700 dark:text-blue-300">
                        Kelas: {kId}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium">
                        {String(taskTxt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Link Lampiran Surat */}
          {leaveItem.attachment_url && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Dokumen Lampiran:
              </span>
              <a
                href={leaveItem.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hover:underline text-xs"
              >
                📄 Buka / Unduh Lampiran Dokumen
              </a>
            </div>
          )}

          {/* ── PENUNJUKAN GURU PENGGANTI (INVAL) ── */}
          <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <UserCheck size={14} className="text-purple-600 dark:text-purple-400" />
                <span>Guru Pengganti / Inval (Opsional):</span>
              </label>
              {leaveItem.status === 'PENDING' && (
                <label className="flex items-center gap-1 text-[10px] text-purple-800 dark:text-purple-300 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyShowRecommended}
                    onChange={e => setOnlyShowRecommended(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>Hanya yang Sedang Free</span>
                </label>
              )}
            </div>

            {leaveItem.status === 'PENDING' ? (
              <select
                value={selectedGuruInvalId}
                onChange={e => setSelectedGuruInvalId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="">-- Tugas Mandiri (Diawasi Guru Piket) --</option>
                {groupedTeachers.map(([categoryTitle, teachers]) => (
                  <optgroup key={categoryTitle} label={categoryTitle}>
                    {teachers.map(g => (
                      <option
                        key={g.id}
                        value={g.id}
                        disabled={g.isBusy}
                        className={g.isBusy ? "text-slate-400 opacity-60" : "font-bold text-slate-900 dark:text-white"}
                      >
                        {g.nama_guru} {g.isSameMapel ? '⭐ (Mapel Serumpun)' : ''} {g.isPiket ? '🛡️ (Piket)' : ''} {g.isBusy ? `[⚠️ ${g.busyInfo}]` : '[✓ Free / Kosong]'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {leaveItem.GuruInval?.nama_guru || 'Tugas Mandiri (Diawasi Guru Piket)'}
              </p>
            )}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {selectedGuruInvalId
                ? 'Guru pengganti yang dipilih akan otomatis menerima tugas & membuka presensi KBM kelas ini di Tab "Jadwal Inval".'
                : 'Sistem memprioritaskan rekomendasi guru mapel serumpun yang sedang jam kosong (Free).'}
            </p>
          </div>

          {/* Catatan Penolakan (Jika Ingin Menolak) */}
          {leaveItem.status === 'PENDING' && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Catatan Penolakan (Diisi hanya jika menolak):
              </label>
              <input
                type="text"
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Alasan penolakan..."
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium"
              />
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            title="Cetak Lembar Izin & Penugasan Inval"
            className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Printer size={14} className="text-slate-600 dark:text-slate-300" />
            <span>Cetak Lembar Tugas</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup
            </button>

            {leaveItem.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isProcessing && actionType === 'REJECT' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  <span>Tolak Izin</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isProcessing && actionType === 'APPROVE' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  <span>Setujui (Approve)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
