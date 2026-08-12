import React from 'react';
import { Student } from '../types';
import { X, Phone, MessageCircle, Shield, Award, Calendar, AlertCircle, Star, User, BookOpen } from 'lucide-react';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onOpenBadgeModal: (student: Student) => void;
  onOpenWhatsApp: (parentName: string, parentPhone: string, studentName: string, reason: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onOpenBadgeModal,
  onOpenWhatsApp
}) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative">
        {/* Header Background Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-t-3xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white/20 shadow-md"
            />
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                NIS: {student.nis} • Gender: {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
              </span>
              <h2 className="text-xl font-bold text-white mt-1">{student.name}</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Rombel XI RPL 1 • Orang Tua: <strong className="text-white">{student.parentName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Tingkat Kehadiran</span>
              <strong className="text-lg font-extrabold text-emerald-900">{student.attendanceRate}%</strong>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Sakit / Izin</span>
              <strong className="text-lg font-extrabold text-amber-900">{student.sakitCount + student.izinCount} Hari</strong>
            </div>

            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Alpha (Tanpa Ket.)</span>
              <strong className="text-lg font-extrabold text-rose-900">{student.alphaCount} Hari</strong>
            </div>

            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Rata Rapor</span>
              <strong className="text-lg font-extrabold text-purple-900">{student.academicAverage}%</strong>
            </div>
          </div>

          {/* At Risk Warning Banner if applies */}
          {student.atRiskReason && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">Perhatian Early Warning System (EWS):</h4>
                <p className="text-xs text-rose-800 mt-0.5">{student.atRiskReason}</p>
              </div>
            </div>
          )}

          {/* Contact Parent Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">Kontak Orang Tua / Wali:</span>
              <strong className="text-sm text-slate-900">{student.parentName}</strong>
              <p className="text-xs text-slate-500">{student.parentPhone}</p>
            </div>

            <button
              onClick={() => onOpenWhatsApp(student.parentName, student.parentPhone, student.name, 'Koordinasi Perkembangan Siswa')}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Hubungi via WhatsApp
            </button>
          </div>

          {/* Badges & Accolades */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                Badge & Apresiasi Terpasang ({student.badges.length})
              </h3>

              <button
                onClick={() => {
                  onClose();
                  onOpenBadgeModal(student);
                }}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                + Tambah Badge Baru
              </button>
            </div>

            {student.badges.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada badge apresiasi khusus.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {student.badges.map((b) => (
                  <div key={b.id} className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs">
                    <span className="font-bold text-purple-950 block">{b.badgeName}</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">"{b.note}"</p>
                    <span className="text-[10px] text-purple-700 font-medium block mt-1">Oleh {b.awardedBy} • {b.awardedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 rounded-b-3xl border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            Tutup Dashboard Profile
          </button>
        </div>
      </div>
    </div>
  );
};
