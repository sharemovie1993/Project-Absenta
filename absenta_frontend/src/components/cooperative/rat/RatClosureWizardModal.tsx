import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import api from '../../../lib/axiosInstance';
import { COOP_QUERY_KEYS, invalidateRatCaches } from '../../../lib/coopQueryKeys';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Coins,
  FileText,
  Printer,
  ShieldCheck,
  Users,
  Calendar,
  Gavel,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/layoutUtils';
import type { CoopMeetingItem } from '../../../pages/cooperative/RatMeetingPage';

export interface RatClosureWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: CoopMeetingItem;
  canManage: boolean;
  onOpenPrintModal?: () => void;
}

export const RatClosureWizardModal: React.FC<RatClosureWizardModalProps> = ({
  isOpen,
  onClose,
  meeting,
  canManage,
  onOpenPrintModal,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states for Step 2 (Ketuk Palu)
  const [closedBy, setClosedBy] = useState('');
  const [proceedingsDocNo, setProceedingsDocNo] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Initial step determination based on meeting status
  useEffect(() => {
    if (isOpen) {
      if (meeting.status === 'CLOSED') {
        setCurrentStep(3); // Langsung ke tahap distribusi SHU / Berkas Dinas jika sudah ditutup
      } else {
        setCurrentStep(1);
      }
      setClosedBy((meeting as any).closedBy || '');
      setProceedingsDocNo(
        (meeting as any).proceedingsDocNo ||
          `BA-RAT/${meeting.year}/${new Date().getFullYear()}/${meeting.id.slice(-4).toUpperCase()}`
      );
      setClosingNotes((meeting as any).closingNotes || '');
    }
  }, [isOpen, meeting]);

  // Query 1: Audit Kesiapan Penutupan
  const readinessQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.ratClosureReadiness(meeting.id),
    queryFn: async () => {
      const res = await api.get(`/cooperative/rat/${meeting.id}/closure-readiness`);
      return res.data.data;
    },
    enabled: isOpen,
    staleTime: 5_000,
  });

  const auditData = readinessQuery.data?.audit;
  const evalData = readinessQuery.data?.evaluation;

  // Mutation 1: Tutup Sidang Resmi (Ketuk Palu)
  const closeMeetingMutation = useMutation({
    mutationFn: async (payload: { closedBy: string; proceedingsDocNo: string; closingNotes?: string }) => {
      const res = await api.post(`/cooperative/rat/${meeting.id}/close`, payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meeting.id);
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.ratClosureReadiness(meeting.id) });
      toast.success('Sidang RAT berhasil ditutup resmi! Status dan hasil persidangan telah dikunci.');
      setCurrentStep(3); // Lanjut ke distribusi SHU
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal menutup sidang RAT';
      toast.error(msg);
    },
  });

  // Mutation 2: Eksekusi Distribusi SHU Pasca-RAT
  const distributeShuMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cooperative/rat/${meeting.id}/distribute-shu`);
      return res.data;
    },
    onSuccess: (data) => {
      invalidateRatCaches(queryClient, meeting.id);
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.ratClosureReadiness(meeting.id) });
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.shuPeriods });
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.savingsList });
      toast.success(
        data?.message || 'Distribusi SHU ke rekening simpanan sukarela anggota berhasil disalurkan!'
      );
      setCurrentStep(4); // Lanjut ke berkas dinas
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal mendistribusikan SHU';
      toast.error(msg);
    },
  });

  // Step 1 Submission
  const handleProceedToStep2 = () => {
    if (!evalData?.isReadyToClose) {
      const proceedAnyway = window.confirm(
        'Perhatian: Masih ada peringatan atau butir acara yang belum tuntas. Apakah Anda yakin tetap ingin melanjutkan penutupan sidang resmi?'
      );
      if (!proceedAnyway) return;
    }
    setCurrentStep(2);
  };

  // Step 2 Submission (Ketuk Palu)
  const handleExecuteClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closedBy.trim()) {
      toast.error('Nama pimpinan sidang/presidium wajib diisi.');
      return;
    }
    closeMeetingMutation.mutate({
      closedBy: closedBy.trim(),
      proceedingsDocNo: proceedingsDocNo.trim(),
      closingNotes: closingNotes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-600 text-white shadow-sm">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Wizard Penutupan Sidang Resmi & Distribusi SHU
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {meeting.title} (Tahun Buku {meeting.year})
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          {[
            { step: 1, label: 'Audit Kesiapan', icon: ShieldCheck },
            { step: 2, label: 'Ketuk Palu', icon: Gavel },
            { step: 3, label: 'Distribusi SHU', icon: Coins },
            { step: 4, label: 'Berkas Dinas', icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div
                key={item.step}
                className="flex items-center gap-2 flex-1 justify-center first:justify-start last:justify-end"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-primary-600 text-white shadow-sm ring-4 ring-primary-100 dark:ring-primary-950/50'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : item.step}
                </div>
                <div className="hidden sm:block text-left">
                  <span
                    className={`block text-xs font-bold ${
                      isCurrent
                        ? 'text-primary-600 dark:text-primary-400'
                        : isDone
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* STEP 1: AUDIT KESIAPAN PENUTUPAN SIDANG */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {readinessQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <span className="text-sm font-semibold">Memeriksa audit kelengkapan sidang...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Kuorum */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Kuorum Kehadiran
                      </span>
                      <Badge variant={auditData?.quorum?.isQuorumAchieved ? 'success' : 'danger'}>
                        {auditData?.quorum?.isQuorumAchieved ? 'Sah (Terpenuhi)' : 'Belum Memenuhi'}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {auditData?.quorum?.attendanceCount} / {auditData?.quorum?.totalActiveMembers} Anggota
                    </div>
                    <div className="text-xs text-slate-500">
                      Target kuorum: {auditData?.quorum?.quorumTarget} orang ({auditData?.quorum?.quorumPercent}%)
                    </div>
                  </div>

                  {/* Card 2: Rundown Acara */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Rundown Sidang
                      </span>
                      <Badge variant={auditData?.agendas?.isAllCompleted ? 'success' : 'warning'}>
                        {auditData?.agendas?.isAllCompleted ? 'Tuntas 100%' : 'Ada Acara Belum Tuntas'}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {auditData?.agendas?.completed} / {auditData?.agendas?.total} Acara Selesai
                    </div>
                    <div className="text-xs text-slate-500">
                      {auditData?.agendas?.incomplete?.length > 0
                        ? `${auditData.agendas.incomplete.length} acara belum bertanda selesai`
                        : 'Seluruh butir acara telah disidangkan'}
                    </div>
                  </div>

                  {/* Card 3: Risalah & TAP RAT */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Ketetapan & Notulensi
                      </span>
                      <Badge variant={auditData?.records?.resolutionsCount > 0 ? 'success' : 'warning'}>
                        {auditData?.records?.resolutionsCount} Dokumen TAP
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {auditData?.records?.minutesCount} Butir Notulensi
                    </div>
                    <div className="text-xs text-slate-500">
                      {auditData?.records?.votingSessionsCount} sesi pemungutan suara e-voting dicatat
                    </div>
                  </div>

                  {/* Card 4: Status SHU */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" /> SHU Tahun {meeting.year}
                      </span>
                      <Badge variant={auditData?.shu?.isDistributed ? 'success' : 'info'}>
                        {auditData?.shu?.status || 'BELUM DIBUAT'}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(auditData?.shu?.totalShu || 0)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {auditData?.shu?.totalMembersAllocated || 0} anggota terdaftar sebagai penerima
                    </div>
                  </div>
                </div>

                {/* Warnings / Evaluation alert */}
                {evalData?.warnings?.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold">Catatan Kepatuhan Sidang:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {evalData.warnings.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Seluruh syarat kuorum dan penyelesaian butir acara telah terpenuhi secara sah. Sidang siap ditutup resmi.
                    </span>
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleProceedToStep2}
                    className="w-full sm:w-auto"
                  >
                    Lanjut ke Ketuk Palu Penutupan <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: KETUK PALU PENUTUPAN RESMI */}
        {currentStep === 2 && (
          <form onSubmit={handleExecuteClose} className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-start gap-3">
              <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
                <span className="font-bold uppercase tracking-wide">Pemberitahuan Statuter & Immutability Lock</span>
                <p>
                  Ketuk palu penutupan sidang akan mengunci status persidangan menjadi <strong>CLOSED</strong>. Seluruh presensi, suara e-voting, dan risalah menjadi permanen dan tidak dapat diubah kembali.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pimpinan / Presidium Sidang Penutup <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={closedBy}
                  onChange={(e) => setClosedBy(e.target.value)}
                  placeholder="Contoh: H. Ahmad Supriyadi, S.E. (Ketua Presidium RAT)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Berita Acara Pelaksanaan RAT
                </label>
                <input
                  type="text"
                  value={proceedingsDocNo}
                  onChange={(e) => setProceedingsDocNo(e.target.value)}
                  placeholder="Contoh: BA-RAT/2026/01"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Resmi Ketuk Palu / Pesan Penutup Presidium
                </label>
                <textarea
                  rows={3}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Contoh: Sidang Paripurna RAT Tahun Buku 2026 resmi ditutup pada pukul 16:30 WIB dengan mufakat seluruh anggota."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
              </Button>
              <Button
                type="submit"
                variant="danger"
                isLoading={closeMeetingMutation.isPending}
              >
                <Gavel className="w-4 h-4 mr-1.5" /> Ketuk Palu & Tutup Sidang Resmi
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: DISTRIBUSI FINANSIAL SHU */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Alokasi SHU Tahun Buku {meeting.year}
                </span>
                <Badge variant={auditData?.shu?.isDistributed ? 'success' : 'primary'}>
                  {auditData?.shu?.isDistributed ? 'SUDAH DISALURKAN' : 'SIAP DISTRIBUSI'}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total SHU Dibagikan:</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {formatCurrency(auditData?.shu?.totalShu || 0)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {auditData?.shu?.totalMembersAllocated || 0} Anggota Penerima
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Hak SHU akan dikreditkan secara atomik ke <strong>Rekening Simpanan Sukarela</strong> masing-masing anggota terdaftar, serta menerbitkan entri jurnal akuntansi penutup secara otomatis.
              </p>
            </div>

            {auditData?.shu?.isDistributed ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold">Distribusi SHU Selesai!</p>
                  <p>Seluruh saldo anggota telah dikreditkan dan dicatat dalam buku besar simpanan koperasi.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">
                  Pastikan Surat Ketetapan (TAP RAT) telah disahkan sebelum mendistribusikan dana.
                </span>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => distributeShuMutation.mutate()}
                  isLoading={distributeShuMutation.isPending}
                  disabled={!auditData?.shu?.totalShu || auditData.shu.totalShu <= 0}
                  className="w-full sm:w-auto"
                >
                  <Coins className="w-4 h-4 mr-1.5" /> Eksekusi Distribusi SHU Sekarang
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(4)}
              >
                Lanjut ke Berkas Dinas <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: BERKAS DOKUMEN DINAS RAT */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bundel Berita Acara & Dokumen Hasil Sidang RAT
                  </h4>
                  <p className="text-xs text-slate-500">
                    Dokumen resmi untuk arsip statuter dan pelaporan ke Dinas Koperasi & UKM.
                  </p>
                </div>
                <Badge variant="success">SIDANG RESMI DITUTUP</Badge>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Berita Acara:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {(meeting as any).proceedingsDocNo || proceedingsDocNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pimpinan / Presidium Penutup:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {(meeting as any).closedBy || closedBy || 'Presidium Sidang RAT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Penutupan:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {(meeting as any).closedAt ? formatDate((meeting as any).closedAt, 'dd MMMM yyyy HH:mm') : 'Baru saja ditutup'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distribusi SHU:</span>
                  <span className="font-semibold text-emerald-600">
                    {(meeting as any).isShuDistributed || auditData?.shu?.isDistributed ? 'Telah Disalurkan' : 'Tertunda'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  if (onOpenPrintModal) onOpenPrintModal();
                }}
                className="w-full sm:w-auto"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Cetak Berkas Berita Acara Lengkap (PDF)
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                <Check className="w-4 h-4 mr-1.5" /> Selesai & Kembali ke Portal
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RatClosureWizardModal;
