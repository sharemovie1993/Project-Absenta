import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Clock, 
  ShieldAlert, 
  User, 
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface GateViolationRecord {
  id: string;
  nama_siswa: string;
  kelas: string;
  nisn: string;
  jenis_pelanggaran: string;
  poin: number;
  jam: string;
  tindakan: string;
  status: 'PENDING' | 'DITINDAK';
}

const INITIAL_VIOLATIONS: GateViolationRecord[] = [
  {
    id: 'v-1',
    nama_siswa: 'Rian Pratama',
    kelas: 'X TJKT 2',
    nisn: '0061298411',
    jenis_pelanggaran: 'Terlambat Masuk (> 07:15 WIB)',
    poin: 5,
    jam: '07:22',
    tindakan: 'Diberi sanksi menyanyikan lagu nasional & lapor guru piket',
    status: 'DITINDAK',
  },
  {
    id: 'v-2',
    nama_siswa: 'Denny Setiawan',
    kelas: 'XI TBSM 1',
    nisn: '0059128472',
    jenis_pelanggaran: 'Atribut Seragam Tidak Lengkap (Tanpa Dasi & Sabuk)',
    poin: 5,
    jam: '07:10',
    tindakan: 'Pencatatan pos satpam & peringatan tertulis',
    status: 'PENDING',
  },
];

export const SatpamPelanggaranTab: React.FC = () => {
  const [violations, setViolations] = useState<GateViolationRecord[]>(INITIAL_VIOLATIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [namaSiswa, setNamaSiswa] = useState('');
  const [kelas, setKelas] = useState('');
  const [jenisPelanggaran, setJenisPelanggaran] = useState('Terlambat Masuk');
  const [tindakan, setTindakan] = useState('');

  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaSiswa.trim() || !kelas.trim()) {
      toast.error('Harap lengkapi nama siswa dan kelas.');
      return;
    }

    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newRecord: GateViolationRecord = {
      id: `v-${Date.now()}`,
      nama_siswa: namaSiswa,
      kelas,
      nisn: '00' + Math.floor(10000000 + Math.random() * 90000000),
      jenis_pelanggaran: jenisPelanggaran,
      poin: jenisPelanggaran.includes('Terlambat') ? 5 : 10,
      jam: jamStr,
      tindakan: tindakan || 'Diberi pengarahan di pos keamanan',
      status: 'DITINDAK',
    };

    setViolations((prev) => [newRecord, ...prev]);
    toast.success(`Pelanggaran gerbang siswa ${namaSiswa} berhasil dicatat.`);

    setNamaSiswa('');
    setKelas('');
    setTindakan('');
    setShowAddForm(false);
  };

  const filtered = violations.filter(
    (v) =>
      v.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.jenis_pelanggaran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* ── TOP ACTION BAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa terlambat / melanggar di gerbang..."
            aria-label="Cari catatan pelanggaran"
            className="pl-9 h-10 text-xs rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <Button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="h-10 px-4 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm gap-1.5 shrink-0"
        >
          <Plus size={15} />
          <span>{showAddForm ? 'Tutup Formulir' : 'Catat Pelanggaran Gerbang'}</span>
        </Button>
      </div>

      {/* ── EXPANDABLE QUICK ADD VIOLATION FORM ────────────── */}
      {showAddForm && (
        <form
          onSubmit={handleAddViolation}
          className="p-5 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 shadow-xs space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-rose-200/50 dark:border-rose-900/50">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />
              Pencatatan Pelanggaran Siswa Pos Gerbang
            </h4>
            <span className="text-[10.5px] text-rose-600 dark:text-rose-400 font-mono">
              Terhubung ke Kesiswaan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Nama Siswa *
              </label>
              <Input
                type="text"
                required
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                placeholder="Contoh: Rian Pratama"
                aria-label="Nama siswa melanggar"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Kelas *
              </label>
              <Input
                type="text"
                required
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Contoh: XI RPL 1"
                aria-label="Kelas siswa"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Jenis Pelanggaran Gerbang
              </label>
              <select
                value={jenisPelanggaran}
                onChange={(e) => setJenisPelanggaran(e.target.value)}
                aria-label="Jenis pelanggaran"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none"
              >
                <option value="Terlambat Masuk (> 07:15 WIB)">Terlambat Masuk (&gt; 07:15 WIB)</option>
                <option value="Atribut Seragam Tidak Lengkap">Atribut Seragam Tidak Lengkap</option>
                <option value="Rambut / Kerapian Tidak Sesuai">Rambut / Kerapian Tidak Sesuai</option>
                <option value="Kendaraan Knalpot Brong / Tanpa Helm">Kendaraan Knalpot Brong / Tanpa Helm</option>
                <option value="Lompat Pagar / Menerobos Gerbang">Lompat Pagar / Menerobos Gerbang</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Tindakan / Sanksi Pos Satpam
              </label>
              <Input
                type="text"
                value={tindakan}
                onChange={(e) => setTindakan(e.target.value)}
                placeholder="Contoh: Diberi pembinaan & lapor piket"
                aria-label="Tindakan yang diambil"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-rose-200/50 dark:border-rose-900/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(false)}
              className="h-9 px-3 rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Simpan &amp; Teruskan ke Kesiswaan
            </Button>
          </div>
        </form>
      )}

      {/* ── VIOLATIONS LIST ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Catatan Pelanggaran Gerbang Hari Ini ({filtered.length})
          </h4>
        </div>

        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
              <p className="text-xs font-medium">Tertib! Belum ada pelanggaran di pos gerbang hari ini</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.nama_siswa}
                    </h5>
                    <span className="text-[11px] text-slate-500 font-medium">({item.kelas})</span>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      +{item.poin} Poin
                    </span>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    {item.jenis_pelanggaran}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Tindakan:</strong> {item.tindakan}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-right self-end sm:self-auto shrink-0 font-mono text-xs text-slate-400">
                  <Clock size={13} />
                  <span>{item.jam} WIB</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
