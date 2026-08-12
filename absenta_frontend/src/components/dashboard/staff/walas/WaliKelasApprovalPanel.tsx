import React, { useState } from 'react';
import { LeaveRequest, ApprovalStatus } from './types';
import {
  CheckCircle2, XCircle, Clock, Eye, MessageCircle, FileText,
  Calendar, User, CheckCheck, Paperclip
} from 'lucide-react';

interface WaliKelasApprovalPanelProps {
  requests: LeaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onApproveAllPending: () => void;
  onViewAttachment: (req: LeaveRequest) => void;
  onOpenWhatsApp: (parentName: string, parentPhone: string, studentName: string, leaveType: string) => void;
  onSelectStudent: (studentId: string) => void;
  isApiConnected?: boolean;
}

// Accent left-border color per leave type
const leaveAccent: Record<string, string> = {
  Sakit:        'border-l-amber-400',
  'Izin Keluarga': 'border-l-blue-400',
  Dispensasi:   'border-l-indigo-400',
  'Pulang Awal': 'border-l-purple-400',
};

// Small pill badge per leave type
const leavePill: Record<string, string> = {
  Sakit:        'bg-amber-50 text-amber-700 border-amber-200',
  'Izin Keluarga': 'bg-blue-50 text-blue-700 border-blue-200',
  Dispensasi:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Pulang Awal': 'bg-purple-50 text-purple-700 border-purple-200',
};

const statusConfig = {
  Pending:   { label: 'Pending',   icon: Clock,         cls: 'text-amber-600' },
  Disetujui: { label: 'Disetujui', icon: CheckCircle2,  cls: 'text-emerald-600' },
  Ditolak:   { label: 'Ditolak',   icon: XCircle,       cls: 'text-rose-600' },
};

export const WaliKelasApprovalPanel: React.FC<WaliKelasApprovalPanelProps> = ({
  requests,
  onApprove,
  onReject,
  onApproveAllPending,
  onViewAttachment,
  onOpenWhatsApp,
  onSelectStudent,
  isApiConnected = false
}) => {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'Semua'>('Semua');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredRequests = requests.filter(req =>
    filterStatus === 'Semua' ? true : req.status === filterStatus
  );
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const handleConfirmReject = (id: string) => {
    if (!rejectReason.trim()) return;
    onReject(id, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-5">
      {/* ── Control Bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Validasi Permohonan Izin &amp; Surat Ortu
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Permohonan sakit, izin keluarga, dispensasi, dan pulang cepat dari orang tua siswa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status pill filters */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-0.5 text-[11px] font-semibold">
            {(['Semua', 'Pending', 'Disetujui', 'Ditolak'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`relative px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterStatus === s
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s}
                {s === 'Pending' && pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Batch approve */}
          {pendingCount > 0 && (
            <button
              onClick={onApproveAllPending}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Setujui Semua ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {filteredRequests.length === 0 ? (
        <div className="py-14 text-center">
          <div className="mb-3">
            {!isApiConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Belum Terhubung ke API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                API Terhubung • Data Kosong
              </span>
            )}
          </div>
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tidak ada permohonan izin</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            {!isApiConnected
              ? 'Gagal terhubung ke server backend API. Mohon pastikan service API aktif.'
              : filterStatus === 'Semua'
              ? 'Belum ada permohonan dari orang tua siswa yang diajukan di database.'
              : `Tidak ada permohonan dengan status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        /* ── Card Grid ──────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredRequests.map(req => {
            const isPending  = req.status === 'Pending';
            const isApproved = req.status === 'Disetujui';
            const isRejected = req.status === 'Ditolak';
            const StatusIcon = statusConfig[req.status]?.icon ?? Clock;
            const accentBorder = leaveAccent[req.type] || 'border-l-slate-300';
            const pillCls = leavePill[req.type] || 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div
                key={req.id}
                className={`
                  relative flex flex-col justify-between
                  bg-white dark:bg-slate-900
                  border border-slate-200/80 dark:border-slate-800
                  border-l-4 ${accentBorder}
                  rounded-2xl overflow-hidden
                  shadow-xs hover:shadow-md
                  transition-shadow duration-200
                  ${isPending ? '' : isApproved ? 'opacity-90' : 'opacity-80'}
                `}
              >
                {/* ── Card Body ──────────────────────────────────── */}
                <div className="p-4 space-y-3">
                  {/* Row 1: Avatar + Name + Status Pills */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={req.studentAvatar}
                        alt={req.studentName}
                        onClick={() => onSelectStudent(req.studentId)}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                      <div className="min-w-0">
                        <h3
                          onClick={() => onSelectStudent(req.studentId)}
                          className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 truncate leading-tight"
                        >
                          {req.studentName}
                          <span className="text-[11px] font-normal text-slate-400 ml-1.5">({req.nis})</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          {req.parentName}
                        </p>
                      </div>
                    </div>

                    {/* Status + Type pills */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${pillCls}`}>
                        {req.type}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${statusConfig[req.status]?.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Date meta (inline, no box) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {req.startDate} — {req.endDate}
                    </span>
                    <span>Diajukan: {req.submittedAt}</span>
                  </div>

                  {/* Row 3: Reason as left-border quote */}
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-2 border-slate-200 dark:border-slate-700 pl-2.5">
                    "{req.reason}"
                  </p>

                  {/* Row 4: Attachment chip (if any) */}
                  {req.attachmentUrl && (
                    <button
                      onClick={() => onViewAttachment(req)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                        {req.attachmentTitle || 'Lampiran Surat Dokter / Bukti'}
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Pratinjau
                      </span>
                    </button>
                  )}

                  {/* Row 5: Rejection reason (if any) */}
                  {isRejected && req.rejectionReason && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                      <strong>Alasan Tolak:</strong> {req.rejectionReason}
                    </p>
                  )}
                </div>

                {/* ── Card Footer: Actions ───────────────────────── */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* WA Chat tertiary */}
                  <button
                    onClick={() => onOpenWhatsApp(req.parentName, req.parentPhone, req.studentName, req.type)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat Ortu (WA)
                  </button>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRejectingId(req.id)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => onApprove(req.id)}
                        className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                        Setujui Izin
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Reject Inline Prompt ───────────────────────── */}
                {rejectingId === req.id && (
                  <div className="mx-4 mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2">
                    <p className="text-[11px] font-bold text-rose-900 dark:text-rose-300">Alasan penolakan:</p>
                    <input
                      type="text"
                      placeholder="Contoh: Bukti surat dokter kurang jelas..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full text-[11px] p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="text-[11px] px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleConfirmReject(req.id)}
                        className="text-[11px] px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                      >
                        Kirim Penolakan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
