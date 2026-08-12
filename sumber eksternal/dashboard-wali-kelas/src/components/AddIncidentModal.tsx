import React, { useState } from 'react';
import { Student, SeverityLevel, BKStatus } from '../types';
import { X, ShieldAlert, Plus } from 'lucide-react';

interface AddIncidentModalProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
  onAddViolation: (data: {
    studentId: string;
    studentName: string;
    nis: string;
    category: string;
    points: number;
    severity: SeverityLevel;
    description: string;
    reporter: 'Wali Kelas';
    bkStatus: BKStatus;
  }) => void;
}

export const AddIncidentModal: React.FC<AddIncidentModalProps> = ({
  students,
  isOpen,
  onClose,
  onAddViolation
}) => {
  if (!isOpen) return null;

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [category, setCategory] = useState('Keterlambatan Masuk Sekolah');
  const [points, setPoints] = useState(10);
  const [severity, setSeverity] = useState<SeverityLevel>('Ringan');
  const [description, setDescription] = useState('');
  const [bkStatus, setBkStatus] = useState<BKStatus>('Dalam Pemantauan');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId);
    if (!student || !description.trim()) return;

    onAddViolation({
      studentId: student.id,
      studentName: student.name,
      nis: student.nis,
      category,
      points: Number(points),
      severity,
      description,
      reporter: 'Wali Kelas',
      bkStatus
    });

    onClose();
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 relative overflow-hidden">
        <div className="bg-slate-900 text-white p-5 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Catat Pembinaan / Pelanggaran Khusus</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pilih Siswa Binaan:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.nis})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori Kejadian:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Keterlambatan Masuk Sekolah">Keterlambatan Masuk Sekolah</option>
                <option value="Atribut Seragam Tidak Lengkap">Atribut Seragam Tidak Lengkap</option>
                <option value="Penggunaan HP Saat KBM">Penggunaan HP Saat KBM</option>
                <option value="Membolos Jam Pelajaran">Membolos Jam Pelajaran</option>
                <option value="Tidak Mengerjakan Tugas">Tidak Mengerjakan Tugas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tingkat / Poin:</label>
              <div className="flex gap-2">
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                  className="w-2/3 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-1/3 text-xs p-2.5 rounded-xl border border-slate-200 text-center font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Keterangan / Kejadian Detail:</label>
            <textarea
              rows={3}
              placeholder="Jelaskan detail kronologi kejadian..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status Pembinaan BK/Walas:</label>
            <select
              value={bkStatus}
              onChange={(e) => setBkStatus(e.target.value as BKStatus)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Dalam Pemantauan">Dalam Pemantauan</option>
              <option value="Konseling BK">Konseling BK</option>
              <option value="Pemanggilan Ortu">Pemanggilan Ortu</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Simpan Catatan Kejadian
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
