import React, { useState } from 'react';
import { LeaveRequest, ApprovalStatus } from './types';
import { resolveProfilePhotoUrl } from '../../../../lib/utils';
import {
  CheckCircle2, XCircle, Clock, Eye, MessageCircle, FileText,
  Calendar, User, CheckCheck, Paperclip, ChevronDown, ChevronUp
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

// Distinct color theme per leave type for instant visual identification
const leaveTheme: Record<string, { border: string; pill: string; bg: string }> = {
  Sakit: {
    border: 'border-l-amber-500',
    pill: 'bg-amber-500 text-white font-black shadow-xs shadow-amber-500/20',
    bg: 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60'
  },
  Izin: {
    border: 'border-l-blue-500',
    pill: 'bg-blue-600 text-white font-black shadow-xs shadow-blue-600/20',
    bg: 'bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/60'
  },
  'Izin Keluarga': {
    border: 'border-l-blue-500',
    pill: 'bg-blue-600 text-white font-black shadow-xs shadow-blue-600/20',
    bg: 'bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/60'
  },
  Dispensasi: {
    border: 'border-l-indigo-500',
    pill: 'bg-indigo-600 text-white font-black shadow-xs shadow-indigo-600/20',
    bg: 'bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50/60'
  },
  'Pulang Awal': {
    border: 'border-l-purple-500',
    pill: 'bg-purple-600 text-white font-black shadow-xs shadow-purple-600/20',
    bg: 'bg-purple-50/30 dark:bg-purple-950/10 hover:bg-purple-50/60'
  },
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
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  // Smart default: default to 'Pending' if pending items exist, otherwise fallback to 'Semua'
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'Semua'>(() => {
    return requests.some(r => r.status === 'Pending') ? 'Pending' : 'Semua';
  });

  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredRequests = requests.filter(req =>
    filterStatus === 'Semua' ? true : req.status === filterStatus
  );

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
        /* ── List Deck Container (Compact Inbox Rows) ──────────────── */
        <div className="space-y-2.5">
          {filteredRequests.map(req => {
            const isPending  = req.status === 'Pending';
            const isApproved = req.status === 'Disetujui';
            const isRejected = req.status === 'Ditolak';
            const StatusIcon = statusConfig[req.status]?.icon ?? Clock;
            const theme = leaveTheme[req.type] || {
              border: 'border-l-slate-400',
              pill: 'bg-slate-700 text-white font-black',
              bg: 'bg-white dark:bg-slate-900'
            };
            const isExpanded = expandedReqId === req.id;

            return (
              <div
                key={req.id}
                className={`
                  relative ${theme.bg}
                  border border-slate-200/80 dark:border-slate-800
                  border-l-4 ${theme.border}
                  rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md
                  transition-all duration-200
                  ${isPending ? 'ring-1 ring-amber-400/30' : 'opacity-90'}
                `}
              >
                {/* ── Compact Main Deck Row ──────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Avatar + Student Name + Wali Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={resolveProfilePhotoUrl(req.studentAvatar)}
                      alt={req.studentName}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                      }}
                      onClick={() => onSelectStudent(req.studentId)}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-slate-100 dark:bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          onClick={() => onSelectStudent(req.studentId)}
                          className="text-xs sm:text-sm font-black text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 truncate leading-tight"
                        >
                          {req.studentName}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">({req.nis})</span>
                        <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${theme.pill}`}>
                          {req.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>Ortu: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{req.parentName}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {req.startDate} — {req.endDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Pill & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${statusConfig[req.status]?.cls}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {req.status}
                    </span>

                    {/* WhatsApp Ortu Direct Action */}
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(req.parentName, req.parentPhone, req.studentName, req.type)}
                      className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-all flex items-center gap-1 cursor-pointer"
                      title="Chat WhatsApp Orang Tua"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">WA Ortu</span>
                    </button>

                    {/* Inline Pending Decisions */}
                    {isPending && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRejectingId(req.id)}
                          className="px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() => onApprove(req.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Setujui
                        </button>
                      </div>
                    )}

                    {/* Expand/Collapse Toggle Drawer Button */}
                    <button
                      type="button"
                      onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      title={isExpanded ? 'Sembunyikan Detail' : 'Lihat Alasan & Lampiran'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ── Expandable Detail Drawer ────────────────────────────────── */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-fadeIn">
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        Alasan Permohonan Orang Tua:
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        "{req.reason}"
                      </p>
                    </div>

                    {req.attachmentUrl && (
                      <button
                        type="button"
                        onClick={() => onViewAttachment(req)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100/60 transition-colors cursor-pointer group"
                      >
                        <span className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                          <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                          {req.attachmentTitle || 'Lampiran Surat Dokter / Bukti Fisik'}
                        </span>
                        <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Pratinjau
                        </span>
                      </button>
                    )}

                    {isRejected && req.rejectionReason && (
                      <p className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                        <strong>Alasan Penolakan:</strong> {req.rejectionReason}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Reject Inline Form Prompt ───────────────────────── */}
                {rejectingId === req.id && (
                  <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2">
                    <p className="text-xs font-bold text-rose-900 dark:text-rose-300">Masukkan alasan penolakan:</p>
                    <input
                      type="text"
                      placeholder="Contoh: Bukti surat dokter kurang jelas / tanggal tidak sesuai..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        className="text-xs font-semibold px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmReject(req.id)}
                        className="text-xs px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-xs"
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
