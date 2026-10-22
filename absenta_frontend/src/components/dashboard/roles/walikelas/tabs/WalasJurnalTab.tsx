import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Users, 
  Search, 
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge, Loader } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { 
  getJurnalWaliKelasList, 
  createJurnalWaliKelas, 
  deleteJurnalWaliKelas 
} from '@/api/kurikulum/waliKelas.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { WalasDashboardData } from '../types';

export interface WalasJurnalTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasJurnalTab: React.FC<WalasJurnalTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jam: '10:00 WIB',
    kategori: 'PEMBINAAN_KELAS',
    judul: '',
    isi: '',
    tags: '',
  });

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

  // 1. Fetch Jurnal (High-Performance Cache)
  const { data: jurnalRes, isLoading } = useQuery({
    queryKey: ['walas-jurnal-list', kelasId, search],
    queryFn: () => getJurnalWaliKelasList(1, 50, search, kelasId),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const rawJurnalList = Array.isArray(jurnalRes?.data?.data) 
    ? jurnalRes.data.data 
    : (Array.isArray(jurnalRes?.data) ? jurnalRes.data : []);

  const filteredJurnal = rawJurnalList?.filter((j: any) => 
    selectedKategori === 'ALL' || j.kategori === selectedKategori
  );

  // 2. Mutation Create Jurnal
  const createMutation = useMutation({
    mutationFn: (payload: any) => createJurnalWaliKelas(payload),
    onSuccess: () => {
      toast.success('Jurnal pembinaan berhasil disimpan');
      setIsAddModalOpen(false);
      setFormData({
        tanggal: new Date().toISOString().slice(0, 10),
        jam: '10:00 WIB',
        kategori: 'PEMBINAAN_KELAS',
        judul: '',
        isi: '',
        tags: '',
      });
      queryClient.invalidateQueries({ queryKey: ['walas-jurnal-list'] });
      queryClient.invalidateQueries({ queryKey: ['walas-dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan jurnal');
    }
  });

  // 3. Mutation Delete Jurnal
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJurnalWaliKelas(id),
    onSuccess: () => {
      toast.success('Jurnal berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['walas-jurnal-list'] });
      queryClient.invalidateQueries({ queryKey: ['walas-dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus jurnal');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.isi.trim()) {
      toast.error('Mohon isi judul dan konten jurnal');
      return;
    }

    createMutation.mutate({
      kelas_id: kelasId,
      tanggal: formData.tanggal,
      jam: formData.jam,
      kategori: formData.kategori,
      judul: formData.judul,
      isi: formData.isi,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
    });
  };

  const getKategoriBadge = (kat: string) => {
    switch (kat) {
      case 'PEMBINAAN_KELAS':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Pembinaan Kelas</Badge>;
      case 'KOORDINASI_BK':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Koordinasi BK</Badge>;
      case 'RAPAT_ORTU':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Rapat Orang Tua</Badge>;
      case 'KASUS_SELESAI':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Kasus Teratasi</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">{kat || 'Lainnya'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Buku Jurnal Wali Kelas {kelasNama || data?.kelasInfo?.nama_kelas || 'Rombel'}</span>
              <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800">
                Bukti Beban Kerja 2 Jam
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumentasi aktivitas bimbingan kelas, koordinasi penanganan kasus, dan rapat orang tua
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm self-stretch sm:self-auto"
          disabled={isHistorical}
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Tulis Jurnal Baru
        </Button>
      </div>

      {/* 2. FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul atau isi jurnal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar self-stretch sm:self-auto pb-1">
          {['ALL', 'PEMBINAAN_KELAS', 'KOORDINASI_BK', 'RAPAT_ORTU', 'KASUS_SELESAI'].map((kat) => (
            <button
              key={kat}
              onClick={() => setSelectedKategori(kat)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                selectedKategori === kat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              )}
            >
              {kat === 'ALL' ? 'Semua Kategori' : kat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 3. TIMELINE JURNAL PEMBINAAN */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat daftar jurnal...</div>
        ) : filteredJurnal && filteredJurnal.length > 0 ? (
          filteredJurnal.map((item: any) => (
            <Card key={item.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {getKategoriBadge(item.kategori)}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.judul}</h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {item.jam && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.jam}
                    </span>
                  )}
                  {!isHistorical && (
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Hapus Jurnal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {item.konten || item.isi}
              </p>

              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {item.tags.map((t: string, i: number) => (
                    <span key={i} className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum Ada Catatan Jurnal Pembinaan</p>
            <p className="text-xs text-slate-400 mt-1">
              Catatan bimbingan yang Anda tulis akan tersimpan otomatis sebagai portofolio resmi beban kerja wali kelas.
            </p>
          </Card>
        )}
      </div>

      {/* 4. MODAL TAMBAH JURNAL BARU - Lazy Mounted */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tulis Catatan Jurnal Wali Kelas"
          size="lg"
        >
          <form onSubmit={handleSave} className="space-y-4 p-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Pelaksanaan</label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 WIB"
                  value={formData.jam}
                  onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Aktivitas</label>
              <select
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="PEMBINAAN_KELAS">Pembinaan Karakter & Kelas</option>
                <option value="KOORDINASI_BK">Koordinasi Guru BK</option>
                <option value="RAPAT_ORTU">Rapat / Komunikasi Orang Tua</option>
                <option value="KASUS_SELESAI">Penyelesaian Kasus Siswa</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Agenda</label>
              <input
                type="text"
                placeholder="e.g. Bimbingan Kedisiplinan Jam Pertama & Evaluasi Kerapian"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Isi Catatan Bimbingan</label>
              <textarea
                rows={4}
                placeholder="Tuliskan catatan arahan, perkembangan siswa, atau hasil kesepakatan bimbingan..."
                value={formData.isi}
                onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tags (Pisahkan dengan koma)</label>
              <input
                type="text"
                placeholder="e.g. kedisiplinan, piket, motivasi"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Jurnal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. MODAL KONFIRMASI HAPUS JURNAL - Lazy Mounted */}
      {Boolean(deletingId) && (
        <Modal
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          title="Konfirmasi Hapus Catatan Jurnal"
          size="sm"
        >
          <div className="p-4 space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus catatan agenda pembinaan wali kelas ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (deletingId) {
                    deleteMutation.mutate(deletingId);
                    setDeletingId(null);
                  }
                }}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Jurnal'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

WalasJurnalTab.displayName = 'WalasJurnalTab';
