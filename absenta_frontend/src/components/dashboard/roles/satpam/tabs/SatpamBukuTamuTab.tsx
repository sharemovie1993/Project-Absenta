import React, { useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Clock, 
  Building, 
  Phone, 
  CheckCircle2, 
  LogOut, 
  CreditCard,
  User,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { GuestLogRecord } from '../types';

interface SatpamBukuTamuTabProps {
  guestLogs: GuestLogRecord[];
  onAddGuest?: (guest: Omit<GuestLogRecord, 'id' | 'jam_masuk' | 'status'>) => Promise<void>;
  onCheckoutGuest?: (id: string) => Promise<void>;
}

export const SatpamBukuTamuTab: React.FC<SatpamBukuTamuTabProps> = ({
  guestLogs: initialLogs,
  onAddGuest,
  onCheckoutGuest,
}) => {
  const [logs, setLogs] = useState<GuestLogRecord[]>(initialLogs);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BERKUNJUNG' | 'SELESAI'>('ALL');

  // Form State
  const [namaTamu, setNamaTamu] = useState('');
  const [instansi, setInstansi] = useState('');
  const [keperluan, setKeperluan] = useState('');
  const [menemui, setMenemui] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [nomorKartuTamu, setNomorKartuTamu] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaTamu.trim() || !keperluan.trim() || !menemui.trim()) {
      toast.error('Harap lengkapi nama tamu, keperluan, dan pihak yang ditemui.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const jamMasuk = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      if (onAddGuest) {
        await onAddGuest({
          nama_tamu: namaTamu,
          instansi,
          keperluan,
          menemui,
          no_telepon: noTelepon,
          nomor_kartu_tamu: nomorKartuTamu,
        });
      }

      const newRecord: GuestLogRecord = {
        id: `tamu-${Date.now()}`,
        nama_tamu: namaTamu,
        instansi: instansi || '-',
        keperluan,
        menemui,
        no_telepon: noTelepon || '-',
        nomor_kartu_tamu: nomorKartuTamu || `T-${Math.floor(10 + Math.random() * 90)}`,
        jam_masuk: jamMasuk,
        status: 'BERKUNJUNG',
      };

      setLogs((prev) => [newRecord, ...prev]);
      toast.success(`Tamu ${namaTamu} berhasil dicatat.`);

      // Reset
      setNamaTamu('');
      setInstansi('');
      setKeperluan('');
      setMenemui('');
      setNoTelepon('');
      setNomorKartuTamu('');
      setShowAddForm(false);
    } catch {
      toast.error('Gagal mencatat data tamu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async (id: string, nama: string) => {
    try {
      if (onCheckoutGuest) {
        await onCheckoutGuest(id);
      }

      const now = new Date();
      const jamKeluar = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'SELESAI', jam_keluar: jamKeluar } : l))
      );
      toast.success(`Tamu ${nama} telah selesai berkunjung (${jamKeluar}).`);
    } catch {
      toast.error('Gagal memperbarui status tamu.');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.nama_tamu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.instansi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.menemui.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* ── TOP ACTION BAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama tamu, instansi, atau orang yang ditemui..."
              aria-label="Cari buku tamu"
              className="pl-9 h-10 text-xs rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
            {(['ALL', 'BERKUNJUNG', 'SELESAI'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer",
                  filterStatus === st
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {st === 'ALL' ? 'Semua' : st === 'BERKUNJUNG' ? 'Aktif' : 'Keluar'}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="h-10 px-4 rounded-2xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-1.5 shrink-0"
        >
          <Plus size={15} />
          <span>{showAddForm ? 'Tutup Formulir' : 'Catat Tamu Baru'}</span>
        </Button>
      </div>

      {/* ── EXPANDABLE QUICK ADD GUEST FORM ────────────────── */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitGuest}
          className="p-5 rounded-3xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-teal-200/50 dark:border-teal-900/50">
            <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={16} className="text-teal-600 dark:text-teal-400" />
              Pencatatan Buku Tamu Pos Satpam
            </h4>
            <span className="text-[10.5px] text-teal-600 dark:text-teal-400 font-mono">
              Registrasi Cepat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Nama Lengkap Tamu *
              </label>
              <Input
                type="text"
                required
                value={namaTamu}
                onChange={(e) => setNamaTamu(e.target.value)}
                placeholder="Contoh: Bpk. Ahmad Hidayat"
                aria-label="Nama tamu"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Instansi / Asal Tamu
              </label>
              <Input
                type="text"
                value={instansi}
                onChange={(e) => setInstansi(e.target.value)}
                placeholder="Contoh: PT Telkom / Orang Tua Siswa"
                aria-label="Instansi tamu"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Bertemu Dengan Siapa? *
              </label>
              <Input
                type="text"
                required
                value={menemui}
                onChange={(e) => setMenemui(e.target.value)}
                placeholder="Contoh: Kepala Sekolah / Bagian TU"
                aria-label="Pihak yang ditemui"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                Keperluan Kunjungan *
              </label>
              <Input
                type="text"
                required
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Contoh: Rapat Kerjasama Industri"
                aria-label="Keperluan kunjungan"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                No. HP / WhatsApp
              </label>
              <Input
                type="tel"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                placeholder="081234567890"
                aria-label="Nomor telepon tamu"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                No. Kartu Visitor / ID Card
              </label>
              <Input
                type="text"
                value={nomorKartuTamu}
                onChange={(e) => setNomorKartuTamu(e.target.value)}
                placeholder="Contoh: V-04 (Kartu Tamu)"
                aria-label="Nomor kartu tamu"
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-teal-200/50 dark:border-teal-900/50">
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
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
            >
              Simpan &amp; Serahkan Kartu Tamu
            </Button>
          </div>
        </form>
      )}

      {/* ── GUEST LOGS LIST ────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Daftar Kunjungan Tamu Hari Ini ({filteredLogs.length})
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredLogs.filter((l) => l.status === 'BERKUNJUNG').length} tamu di dalam sekolah
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredLogs.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 space-y-2">
              <UserCheck size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Tidak ada data tamu yang cocok</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isVisiting = log.status === 'BERKUNJUNG';
              return (
                <div
                  key={log.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3",
                    isVisiting
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {log.nama_tamu}
                          </h5>
                          {log.nomor_kartu_tamu && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {log.nomor_kartu_tamu}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                          <Building size={12} className="shrink-0" />
                          <span>{log.instansi || 'Individu'}</span>
                        </p>
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase shrink-0",
                        isVisiting
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {isVisiting ? 'Di Dalam' : 'Sudah Keluar'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Keperluan:</strong> {log.keperluan}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">Menemui:</strong> {log.menemui}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Masuk: {log.jam_masuk} {log.jam_keluar && `• Keluar: ${log.jam_keluar}`}
                    </span>

                    {isVisiting && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCheckout(log.id, log.nama_tamu)}
                        className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1"
                      >
                        <LogOut size={12} />
                        <span>Selesai / Keluar</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
