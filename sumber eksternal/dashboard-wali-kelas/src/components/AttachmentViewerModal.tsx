import React from 'react';
import { LeaveRequest } from '../types';
import { X, FileText, CheckCircle2, ShieldCheck, Download, Printer } from 'lucide-react';

interface AttachmentViewerModalProps {
  request: LeaveRequest | null;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  request,
  onClose
}) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-white">{request.attachmentTitle || 'Pratinjau Surat Lampiran Ortu'}</h3>
              <p className="text-xs text-slate-400">Siswa: {request.studentName} ({request.nis})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Medical Note Paper Mockup */}
          <div className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/80 shadow-inner font-serif text-slate-800 space-y-4 relative">
            <div className="border-b-2 border-slate-800 pb-3 text-center">
              <h4 className="text-base font-bold uppercase tracking-wider text-slate-900">
                {request.doctorDetails?.clinicName || 'KLINIK MEDIKA UTAMA PRATAMA'}
              </h4>
              <p className="text-[11px] font-sans text-slate-600">Jl. Raya Soekarno-Hatta No. 102, Bandung • Telp (022) 7201928</p>
            </div>

            <div className="text-center font-sans font-bold text-sm text-slate-900 underline uppercase tracking-wide">
              SURAT KETERANGAN ISTIRAHAT DOKTER
            </div>

            <div className="font-sans text-xs space-y-1.5 leading-relaxed">
              <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
              <div className="pl-4 space-y-1">
                <p>Nama Pasien: <strong>{request.studentName}</strong></p>
                <p>Status: Siswa SMKN 1 Tech Center (XI RPL 1)</p>
                <p>Diagnosis: <em>{request.doctorDetails?.diagnosis || 'Febris & Acute Upper Respiratory Infection'}</em></p>
              </div>
              <p className="pt-2">
                Memerlukan istirahat berobat jalan selama <strong>{request.doctorDetails?.restDays || 2} ({request.startDate} s.d. {request.endDate})</strong>.
              </p>
            </div>

            {/* Doctor Stamp & Signature Mockup */}
            <div className="pt-6 flex justify-end font-sans">
              <div className="text-center text-xs space-y-1 relative">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-500/40 text-indigo-700 font-bold text-[9px] flex items-center justify-center rotate-[-12deg] absolute -top-8 -left-12 pointer-events-none opacity-80">
                  ★ TERVERIFIKASI RESMI ★
                </div>
                <p className="text-slate-500 text-[10px]">Dokter Pemeriksa,</p>
                <div className="h-10" />
                <p className="font-bold underline text-slate-900">{request.doctorDetails?.doctorName || 'dr. H. Rahmat Hidayat, Sp.A'}</p>
                <p className="text-[10px] text-slate-400">SIP: 503/401/SIP.D/2024</p>
              </div>
            </div>
          </div>

          {/* Actual Attachment Image Preview */}
          {request.attachmentUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 p-2 block bg-slate-50 border-b border-slate-200">
                Foto Bukti Fisik / Surat Dokter:
              </span>
              <img
                src={request.attachmentUrl}
                alt="Lampiran Surat"
                className="w-full h-56 object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 rounded-b-3xl border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Dokumen Otentik Ortu
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
