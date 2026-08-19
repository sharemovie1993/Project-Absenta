import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Send, AlertTriangle, BookOpen, Clock, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { guruIzinApi, type ImpactPreviewResponse } from '../../../../api/guruIzin.api';
import { useAuthStore } from '../../../../store/authStore';
import { useGuruMe } from '../../../../hooks/useGuruMe';

interface PengajuanIzinGuruModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName?: string;
  guruId?: string;
}

export const PengajuanIzinGuruModal: React.FC<PengajuanIzinGuruModalProps> = ({
  isOpen,
  onClose,
  teacherName,
  guruId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { guruProfile } = useGuruMe();

  const effectiveGuruId = guruId || guruProfile?.id || (user as any)?.guru_id || (user as any)?.Guru?.id || user?.id || '';

  const [selectedGuruId, setSelectedGuruId] = useState<string>(effectiveGuruId);
  const [jenisIzin, setJenisIzin] = useState<'DINAS_LUAR' | 'SAKIT' | 'IZIN_PRIBADI' | 'CUTI'>('DINAS_LUAR');
  const [tipeDurasi, setTipeDurasi] = useState<'SEHARIAN' | 'MULTI_HARI' | 'SEBAGIAN_SESI'>('SEHARIAN');
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [jamMulai, setJamMulai] = useState('07:15');
  const [jamSelesai, setJamSelesai] = useState('11:40');
  const [alasan, setAlasan] = useState('');
  const [tugasInval, setTugasInval] = useState('');
  const [isPerClassTask, setIsPerClassTask] = useState(false);
  const [classTasks, setClassTasks] = useState<Record<string, string>>({});
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Impact Preview State
  const [impactData, setImpactData] = useState<ImpactPreviewResponse | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);

  // Unique classes extracted from affected days preview
  const uniqueClasses = useMemo(() => {
    if (!impactData?.affectedDays) return [];
    const classMap = new Map<string, { kelas_id: string; nama_kelas: string; mapelList: string[]; hariList: string[] }>();
    
    impactData.affectedDays.forEach(day => {
      const sessionList = day.sessions || (day as any).slots || [];
      sessionList.forEach((s: any) => {
        const kId = s.kelas_id || s.nama_kelas;
        if (!kId) return;
        if (!classMap.has(kId)) {
          classMap.set(kId, {
            kelas_id: s.kelas_id || s.nama_kelas,
            nama_kelas: s.nama_kelas || s.kelas || kId,
            mapelList: [s.nama_mapel || s.mapel || ''],
            hariList: [day.hari]
          });
        } else {
          const existing = classMap.get(kId)!;
          if (s.nama_mapel && !existing.mapelList.includes(s.nama_mapel)) {
            existing.mapelList.push(s.nama_mapel);
          }
          if (day.hari && !existing.hariList.includes(day.hari)) {
            existing.hariList.push(day.hari);
          }
        }
      });
    });

    return Array.from(classMap.values());
  }, [impactData]);

  // Auto-sync guruId if passed or resolved
  useEffect(() => {
    if (effectiveGuruId) {
      setSelectedGuruId(effectiveGuruId);
    }
  }, [effectiveGuruId]);

  // Set default tglSelesai when tglMulai changes and tipeDurasi is SEHARIAN or SEBAGIAN_SESI
  useEffect(() => {
    if (tglMulai && (tipeDurasi === 'SEHARIAN' || tipeDurasi === 'SEBAGIAN_SESI')) {
      setTglSelesai(tglMulai);
    }
  }, [tglMulai, tipeDurasi]);

  // Fetch Impact Preview whenever date / time / guru changes
  useEffect(() => {
    if (!isOpen || !tglMulai || !tglSelesai) {
      setImpactData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoadingImpact(true);
        const res = await guruIzinApi.previewImpact({
          guru_id: selectedGuruId || effectiveGuruId || (undefined as any),
          tanggal_mulai: tglMulai,
          tanggal_selesai: tglSelesai,
          tipe_durasi: tipeDurasi,
          jam_mulai: tipeDurasi === 'SEBAGIAN_SESI' ? jamMulai : undefined,
          jam_selesai: tipeDurasi === 'SEBAGIAN_SESI' ? jamSelesai : undefined,
        });
        if (res.success) {
          setImpactData(res.data);
        }
      } catch (err) {
        console.error('Gagal memuat preview jadwal terdampak:', err);
      } finally {
        setIsLoadingImpact(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, selectedGuruId, effectiveGuruId, tglMulai, tglSelesai, tipeDurasi, jamMulai, jamSelesai]);

  if (!isOpen) return null;

  const displayName = teacherName || (user as any)?.Guru?.nama_guru || user?.name || user?.full_name || 'Guru';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tglMulai || !tglSelesai || !alasan.trim()) {
      toast.error('Mohon lengkapi tanggal dan alasan permohonan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await guruIzinApi.submit({
        guru_id: selectedGuruId || undefined,
        tipe_izin: jenisIzin,
        tipe_durasi: tipeDurasi,
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai,
        jam_mulai: tipeDurasi === 'SEBAGIAN_SESI' ? jamMulai : undefined,
        jam_selesai: tipeDurasi === 'SEBAGIAN_SESI' ? jamSelesai : undefined,
        alasan,
        instruksi_tugas: tugasInval,
        tugas_per_kelas: isPerClassTask && Object.keys(classTasks).length > 0 ? classTasks : undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        attachment_type: jenisIzin === 'DINAS_LUAR' ? 'surat_tugas' : (jenisIzin === 'SAKIT' ? 'surat_dokter' : 'keterangan')
      });

      if (res.success) {
        toast.success('Pengajuan izin/dinas berhasil dikirim dan menunggu persetujuan!', { icon: '🚀' });
        queryClient.invalidateQueries({ queryKey: ['guru-izin-list'] });
        queryClient.invalidateQueries({ queryKey: ['guru-izin-me'] });
        queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
        onClose();
      } else {
        toast.error(res.message || 'Gagal mengirim pengajuan.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl my-auto rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Form Pengajuan Izin / Cuti / Dinas Luar
              </h3>
              <p className="text-[11px] text-slate-400">
                Pemohon: <span className="font-semibold text-slate-700 dark:text-slate-200">{displayName}</span>
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

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Jenis Perizinan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Jenis Perizinan
              </label>
              <select
                value={jenisIzin}
                onChange={e => setJenisIzin(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="DINAS_LUAR">🏢 Tugas Dinas Luar / Workshop</option>
                <option value="SAKIT">🏥 Sakit (Surat Dokter)</option>
                <option value="IZIN_PRIBADI">📋 Izin Pribadi / Keluarga</option>
                <option value="CUTI">🏖️ Cuti Tahunan / Melahirkan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Tipe Durasi Waktu
              </label>
              <select
                value={tipeDurasi}
                onChange={e => setTipeDurasi(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="SEHARIAN">Seharian Penuh (1 Hari)</option>
                <option value="MULTI_HARI">Beberapa Hari Berturut-turut</option>
                <option value="SEBAGIAN_SESI">Sebagian Jam (Jam Tertentu Saja)</option>
              </select>
            </div>
          </div>

          {/* Tanggal & Waktu */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {tipeDurasi === 'SEHARIAN' || tipeDurasi === 'SEBAGIAN_SESI' ? 'Tanggal Izin' : 'Dari Tanggal'}
              </label>
              <input
                type="date"
                required
                value={tglMulai}
                onChange={e => setTglMulai(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
            
            {tipeDurasi === 'MULTI_HARI' ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  required
                  value={tglSelesai}
                  min={tglMulai}
                  onChange={e => setTglSelesai(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>
            ) : tipeDurasi === 'SEBAGIAN_SESI' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={e => setJamMulai(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={e => setJamSelesai(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-center"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 opacity-60">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Durasi
                </label>
                <div className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 flex items-center font-medium text-slate-600 dark:text-slate-400">
                  1 Hari Kerja Penuh
                </div>
              </div>
            )}
          </div>

          {/* ── INTERACTIVE IMPACT PREVIEW BOX (JAM KOS) ── */}
          {tglMulai && (
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Dampak Jadwal Mengajar (Kelas Jam Kos):</span>
                </div>
                {isLoadingImpact && (
                  <Loader2 size={12} className="animate-spin text-amber-600 dark:text-amber-400" />
                )}
              </div>

              {isLoadingImpact ? (
                <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 italic">
                  Sedang memeriksa jadwal mengajar...
                </p>
              ) : impactData && (impactData.totalSessions > 0 || (impactData as any).totalSlots > 0) ? (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    Terdapat <span className="underline font-black">{impactData.totalSessions || (impactData as any).totalSlots} sesi KBM</span> di <span className="underline font-black">{impactData.totalClasses} kelas</span> yang akan ditinggalkan:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {impactData.affectedDays.map((day) => {
                      const sessionList = day.sessions || (day as any).slots || [];
                      return (
                        <div key={day.date} className="space-y-1">
                          {sessionList.map((session: any, idx: number) => {
                            const leave = session.existing_leave;
                            const isApproved = leave?.status === 'DISETUJUI';
                            const isPending = leave?.status === 'PENDING';

                            return (
                              <div
                                key={session.id || idx}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:px-3 sm:py-2 rounded-xl border text-[11px] shadow-xs gap-1.5 ${
                                  isApproved
                                    ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60'
                                    : isPending
                                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                                    : 'bg-white/90 dark:bg-slate-900/90 border-amber-200 dark:border-amber-800/40'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="px-1.5 py-0.5 rounded-md font-black text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                    {session.nama_kelas}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {session.nama_mapel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    {session.jam_mulai} – {session.jam_selesai} WIB
                                  </span>
                                  {isApproved && (
                                    <span className="px-1.5 py-0.5 rounded-md font-black text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shrink-0 flex items-center gap-0.5">
                                      <span>✅</span>
                                      <span>Disetujui ({leave.tipe_izin?.replace('_', ' ')})</span>
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="px-1.5 py-0.5 rounded-md font-black text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0 flex items-center gap-0.5">
                                      <span>⏳</span>
                                      <span>Menunggu Verifikasi</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const allSessions = impactData?.affectedDays?.flatMap((d: any) => d.sessions || d.slots || []) || [];
                    const hasConflict = (impactData as any)?.has_conflict || (allSessions.length > 0 && allSessions.every((s: any) => !!s.existing_leave));
                    if (!hasConflict) return null;
                    return (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold mt-1">
                        <AlertTriangle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Seluruh jadwal pada jam yang dipilih sudah memiliki permohonan izin aktif / terverifikasi.</span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ Tidak ada jadwal KBM bertabrakan pada tanggal & jam ini.
                </p>
              )}
            </div>
          )}

          {/* Alasan / Keperluan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Keterangan / Keperluan <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={alasan}
              onChange={e => setAlasan(e.target.value)}
              placeholder="Contoh: Mengikuti Pelatihan Teknis Kurikulum di LPMP / Sakit flu berat..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Modul / Tugas Inval Kelas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <BookOpen size={12} className="text-blue-600 dark:text-blue-400" />
                <span>Tugas untuk Kelas yang Ditinggalkan (Inval)</span>
              </label>
              <span className="text-[10px] text-slate-400 italic">Dianjurkan</span>
            </div>

            {/* Toggle Rincikan Tugas Per-Kelas jika ada lebih dari 1 kelas */}
            {uniqueClasses.length > 1 && (
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPerClassTask}
                  onChange={e => setIsPerClassTask(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  Rincikan tugas berbeda untuk masing-masing kelas ({uniqueClasses.length} Kelas)
                </span>
              </label>
            )}

            {isPerClassTask && uniqueClasses.length > 1 ? (
              <div className="space-y-2 pt-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {uniqueClasses.map((cls) => (
                  <div
                    key={cls.kelas_id}
                    className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-blue-700 dark:text-blue-300">
                        {cls.nama_kelas} ({cls.hariList.join(', ')})
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                        {cls.mapelList.join(', ')}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={classTasks[cls.kelas_id] || ''}
                      onChange={e => setClassTasks(prev => ({ ...prev, [cls.kelas_id]: e.target.value }))}
                      placeholder={`Tuliskan petunjuk tugas khusus untuk kelas ${cls.nama_kelas}...`}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                rows={2}
                value={tugasInval}
                onChange={e => setTugasInval(e.target.value)}
                placeholder="Tuliskan petunjuk tugas mandiri (misal: 'Buka Bab 4 latihan 1-10') agar dapat disampaikan Guru Piket / Petugas Kelas..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            )}
          </div>

          {/* Link Lampiran Surat */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Tautan / URL Lampiran Surat Tugas / Dokter (Opsional)
            </label>
            <input
              type="url"
              value={attachmentUrl}
              onChange={e => setAttachmentUrl(e.target.value)}
              placeholder="https://... (Foto Surat Tugas/Dokter atau Google Drive)"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer transition-colors"
            >
              Batal
            </button>
            {(() => {
              const allImpactSessions = impactData?.affectedDays?.flatMap((d: any) => d.sessions || (d as any).slots || []) || [];
              const hasConflict = (impactData as any)?.has_conflict || (allImpactSessions.length > 0 && allImpactSessions.every((s: any) => !!s.existing_leave));

              return (
                <button
                  type="submit"
                  disabled={isSubmitting || hasConflict}
                  className={`px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                    hasConflict
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-500/20 active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : hasConflict ? (
                    <span>Izin Sudah Diajukan</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Kirim Pengajuan</span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </form>
      </div>
    </div>
  );
};
