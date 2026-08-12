import React, { useState } from 'react';
import { LeaveRequest, ApprovalStatus } from '../types';
import { 
  CheckCircle2, XCircle, Clock, Eye, MessageCircle, FileText, 
  Calendar, User, Phone, Filter, CheckCheck, AlertCircle, Image as ImageIcon
} from 'lucide-react';

interface WaliKelasApprovalPanelProps {
  requests: LeaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onApproveAllPending: () => void;
  onViewAttachment: (req: LeaveRequest) => void;
  onOpenWhatsApp: (parentName: string, parentPhone: string, studentName: string, leaveType: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export const WaliKelasApprovalPanel: React.FC<WaliKelasApprovalPanelProps> = ({
  requests,
  onApprove,
  onReject,
  onApproveAllPending,
  onViewAttachment,
  onOpenWhatsApp,
  onSelectStudent
}) => {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'Semua'>('Semua');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'Semua') return true;
    return req.status === filterStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const handleConfirmReject = (id: string) => {
    if (!rejectReason.trim()) return;
    onReject(id, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Validasi Permohonan Izin & Surat Ortu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Proses permohonan sakit, izin keluarga, dispensasi, dan pulang cepat yang diajukan orang tua siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600">
            {(['Semua', 'Pending', 'Disetujui', 'Ditolak'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === status
                    ? 'bg-white text-slate-900 font-bold shadow-sm'
                    : 'hover:text-slate-900'
                }`}
              >
                {status}
                {status === 'Pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Batch Approval Button */}
          {pendingCount > 0 && (
            <button
              onClick={onApproveAllPending}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              Setujui Semua ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Tidak ada permohonan izin</h3>
          <p className="text-xs text-slate-500 mt-1">
            {filterStatus === 'Semua' 
              ? 'Belum ada permohonan izin dari orang tua siswa.' 
              : `Tidak ditemukan permohonan dengan status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRequests.map(req => {
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Disetujui';
            const isRejected = req.status === 'Ditolak';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-sm hover:shadow-md flex flex-col justify-between relative ${
                  isPending ? 'border-amber-300/80 ring-1 ring-amber-400/20 bg-gradient-to-b from-amber-50/30 to-white' :
                  isApproved ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div>
                  {/* Card Header: Student Avatar, Name, Leave Type Badge, Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={req.studentAvatar}
                        alt={req.studentName}
                        onClick={() => onSelectStudent(req.studentId)}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                      <div>
                        <h3 
                          onClick={() => onSelectStudent(req.studentId)}
                          className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                        >
                          {req.studentName}
                          <span className="text-xs font-normal text-slate-400">({req.nis})</span>
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Ortu: <strong className="text-slate-700 font-medium">{req.parentName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.type === 'Sakit' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        req.type === 'Dispensasi' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                        req.type === 'Pulang Awal' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {req.type}
                      </span>

                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        isPending ? 'text-amber-700' : isApproved ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                        {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Date & Submitted Info */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Periode Izin:
                      </span>
                      <strong className="text-slate-900 font-semibold">{req.startDate} - {req.endDate}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Diajukan ortu: {req.submittedAt}</span>
                      {req.processedAt && <span className="text-slate-400">Diproses: {req.processedAt}</span>}
                    </div>
                  </div>

                  {/* Reason Text */}
                  <div className="mb-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Alasan Permohonan:
                    </span>
                    <p className="text-xs text-slate-700 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/80 italic leading-relaxed">
                      "{req.reason}"
                    </p>
                  </div>

                  {/* Attachment Preview Section */}
                  {req.attachmentUrl && (
                    <div className="mb-4">
                      <div 
                        onClick={() => onViewAttachment(req)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-100/80 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-indigo-950 group-hover:text-indigo-700">
                              {req.attachmentTitle || 'Lampiran Dokumen Surat Dokter / Bukti'}
                            </p>
                            <p className="text-[10px] text-indigo-600">Klik untuk buka pratinjau surat resmi</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </span>
                      </div>
                    </div>
                  )}

                  {req.rejectionReason && (
                    <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <strong>Alasan Penolakan:</strong> {req.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {/* WhatsApp Quick Link */}
                  <button
                    onClick={() => onOpenWhatsApp(req.parentName, req.parentPhone, req.studentName, req.type)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Chat Ortu (WA)
                  </button>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRejectingId(req.id)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Tolak
                      </button>

                      <button
                        onClick={() => onApprove(req.id)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Setujui Surat
                      </button>
                    </div>
                  )}
                </div>

                {/* Rejection Prompt Inline Overlay */}
                {rejectingId === req.id && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-300 space-y-2 animate-fadeIn">
                    <p className="text-xs font-bold text-rose-900">Alasan Penolakan Surat Izin:</p>
                    <input
                      type="text"
                      placeholder="Contoh: Bukti surat dokter kurang jelas, mohon diunggah kembali..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="text-xs px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleConfirmReject(req.id)}
                        className="text-xs px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500"
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
