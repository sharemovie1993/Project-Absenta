import React, { useState } from 'react';
import { Student } from './types';
import { X, Award, Star, Trophy, Shield, Zap, Send, Sparkles } from 'lucide-react';
interface BadgeAwardModalProps {
  student: Student | null;
  onClose: () => void;
  onAwardBadge: (studentId: string, badgeName: string, icon: string, note: string) => void;
}
const BADGE_PRESETS = [
  {
    name: '🌟 Bintang Kehadiran',
    icon: 'Star',
    category: 'Kedisiplinan',
    desc: 'Diberikan untuk persentase kehadiran 100% atau sangat konsisten.'
  },
  {
    name: '🏆 Pejuang Prestasi',
    icon: 'Trophy',
    category: 'Prestasi',
    desc: 'Diberikan atas capaian juara perlombaan/kegiatan akademik/non-akademik.'
  },
  {
    name: '💎 Teladan Karakter',
    icon: 'Shield',
    category: 'Karakter',
    desc: 'Diberikan untuk kepribadian santun, jujur, dan aktif membantu teman.'
  },
  {
    name: '🚀 Siswa Paling Disiplin',
    icon: 'Zap',
    category: 'Kedisiplinan',
    desc: 'Diberikan atas ketaatan aturan sekolah dan seragam lengkap.'
  }
];

export const BadgeAwardModal: React.FC<BadgeAwardModalProps> = ({
  student,
  onClose,
  onAwardBadge
}) => {
  const [selectedPreset, setSelectedPreset] = useState(BADGE_PRESETS[0]);
  const [customNote, setCustomNote] = useState('');
  if (!student) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAwardBadge(student.id, selectedPreset.name, selectedPreset.icon, customNote || `Apresiasi atas dedikasi dan prestasi ananda ${student.name}.`);
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-5 rounded-t-3xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Kirim Badge Apresiasi Digital</h3>
              <p className="text-xs text-purple-200">Penerima: <strong>{student.name}</strong> ({student.nis})</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Badge Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Jenis Badge Apresiasi:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BADGE_PRESETS.map(b => <div key={b.name} onClick={() => setSelectedPreset(b)} className={`p-3 rounded-2xl border transition-all cursor-pointer ${selectedPreset.name === b.name ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20 shadow-xs' : 'border-slate-200 hover:border-purple-200 bg-white'}`}>
                  <span className="font-bold text-xs text-slate-900 block">{b.name}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{b.desc}</p>
                </div>)}
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Catatan Apresiasi Wali Kelas:
            </label>
            <textarea rows={3} placeholder={`Contoh: Terus pertahankan semangat belajarmu ${student.name.split(' ')[0]}, kamu adalah kebanggaan kelas!...`} value={customNote} onChange={e => setCustomNote(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Batal
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95">
              <Send className="w-3.5 h-3.5" />
              Kirim Badge Apresiasi
            </button>
          </div>
        </form>
      </div>
    </div>;
};