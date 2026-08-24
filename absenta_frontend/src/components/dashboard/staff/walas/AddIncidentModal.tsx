import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student, SeverityLevel, BKStatus } from './types';
import { X, ShieldAlert, Plus, AlertCircle } from 'lucide-react';
import { kesiswaanApi, type JenisPelanggaran } from '../../../../api/kesiswaan.api';
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
const DEFAULT_PRESETS = [{
  id: '1',
  nama_pelanggaran: 'Keterlambatan Masuk Sekolah',
  poin: 10,
  kategori: 'Kedisiplinan'
}, {
  id: '2',
  nama_pelanggaran: 'Atribut Seragam Tidak Lengkap',
  poin: 5,
  kategori: 'Kerapian'
}, {
  id: '3',
  nama_pelanggaran: 'Penggunaan HP Saat KBM Tanpa Izin',
  poin: 15,
  kategori: 'Akademik'
}, {
  id: '4',
  nama_pelanggaran: 'Membolos Jam Pelajaran',
  poin: 25,
  kategori: 'Kedisiplinan'
}, {
  id: '5',
  nama_pelanggaran: 'Tidak Mengerjakan Tugas / Kewajiban',
  poin: 10,
  kategori: 'Akademik'
}, {
  id: '6',
  nama_pelanggaran: 'Merusak Fasilitas / Sarana Kelas',
  poin: 35,
  kategori: 'Ketertiban'
}];
export const AddIncidentModal: React.FC<AddIncidentModalProps> = ({
  students,
  isOpen,
  onClose,
  onAddViolation
}) => {
  // Fetch Master Jenis Pelanggaran dari Backend Real API
  const {
    data: jenisPelanggaranRes
  } = useQuery({
    queryKey: ['kesiswaan', 'jenis-pelanggaran'],
    queryFn: () => kesiswaanApi.getJenisPelanggaran().catch(() => ({
      success: true,
      data: []
    })),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });
  const masterList: JenisPelanggaran[] = React.useMemo(() => {
    const raw = Array.isArray(jenisPelanggaranRes?.data) ? jenisPelanggaranRes.data : Array.isArray(jenisPelanggaranRes) ? jenisPelanggaranRes : [];
    return raw.length > 0 ? raw : DEFAULT_PRESETS;
  }, [jenisPelanggaranRes]);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [selectedJenisId, setSelectedJenisId] = useState(masterList[0]?.id || '');
  const [category, setCategory] = useState(masterList[0]?.nama_pelanggaran || 'Keterlambatan Masuk Sekolah');
  const [points, setPoints] = useState(masterList[0]?.poin || 10);
  const [severity, setSeverity] = useState<SeverityLevel>('Ringan');
  const [description, setDescription] = useState('');
  const [bkStatus, setBkStatus] = useState<BKStatus>('Dalam Pemantauan');
  if (!isOpen) return null;
  const handleJenisChange = (jenisId: string) => {
    setSelectedJenisId(jenisId);
    const item = masterList.find(j => j.id === jenisId);
    if (item) {
      setCategory(item.nama_pelanggaran);
      setPoints(item.poin || 10);
      setSeverity((item.poin || 10) >= 50 ? 'Berat' : (item.poin || 10) >= 25 ? 'Sedang' : 'Ringan');
    }
  };
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
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="bg-slate-900 text-white p-5 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Catat Pembinaan / Pelanggaran Siswa</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800 dark:text-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Pilih Siswa Binaan:
            </label>
            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800">
              {students.map(s => <option key={s.id} value={s.id}>
                  {s.name} ({s.nis})
                </option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Kategori Kejadian:
              </label>
              <select value={selectedJenisId} onChange={e => handleJenisChange(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800">
                {masterList.map(j => <option key={j.id} value={j.id}>
                    {j.nama_pelanggaran} ({j.poin} Poin)
                  </option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Tingkat &amp; Poin:
              </label>
              <div className="flex gap-2">
                <select value={severity} onChange={e => setSeverity(e.target.value as SeverityLevel)} className="w-2/3 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800">
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
                <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-1/3 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-bold bg-white dark:bg-slate-800" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Keterangan / Kronologi Kejadian:
            </label>
            <textarea rows={3} placeholder="Jelaskan detail kronologi kejadian..." value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Status Pembinaan BK/Walas:
            </label>
            <select value={bkStatus} onChange={e => setBkStatus(e.target.value as BKStatus)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800">
              <option value="Dalam Pemantauan">Dalam Pemantauan</option>
              <option value="Konseling BK">Konseling BK</option>
              <option value="Pemanggilan Ortu">Pemanggilan Ortu</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              Batal
            </button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
              Simpan Catatan Kejadian
            </button>
          </div>
        </form>
      </div>
    </div>;
};