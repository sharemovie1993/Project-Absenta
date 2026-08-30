import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi, type HubinTefaOrder, type MitraIndustri } from '../../../api/hubin.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { formatDate } from '../../../utils/layoutUtils';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { 
  Hammer, 
  Plus, 
  Search, 
  Building, 
  Calendar, 
  Coins, 
  Edit, 
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

// Zod validation schema for TEFA Order Form (Pillar 25)
const tefaOrderSchema = z.object({
  nama_proyek: z.string().min(1, 'Nama proyek/order harus diisi'),
  mitra_id: z.string().nullable(),
  nilai_kontrak: z.number().nullable(),
  status_proyek: z.enum(['PERENCANAAN', 'BERJALAN', 'SELESAI', 'BATAL']),
  tanggal_mulai: z.string().nullable(),
  tanggal_target: z.string().nullable(),
  deskripsi: z.string().nullable()
});

export const TefaSection: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<HubinTefaOrder | null>(null);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [mitraId, setMitraId] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [projectStatus, setProjectStatus] = useState<'PERENCANAAN' | 'BERJALAN' | 'SELESAI' | 'BATAL'>('PERENCANAAN');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const { isHubin: isHubinRole, isAdmin, can } = useCapabilities();
  const isHubin = useMemo(() => {
    return isAdmin || isHubinRole || can('hubin.tefa.manage') || can('hubin.partners.manage');
  }, [isAdmin, isHubinRole, can]);

  // Queries
  const { data: tefaData, isLoading } = useQuery({
    queryKey: ['hubin-tefa', { search: searchTerm, statusProyek: filterStatus }],
    queryFn: () => hubinApi.getTefaOrders({ search: searchTerm, statusProyek: filterStatus || undefined }),
  });

  const { data: mitraData } = useQuery({
    queryKey: ['hubin-mitra-all'],
    queryFn: () => hubinApi.getMitra({ limit: 200 }),
    enabled: isHubin
  });

  const resetForm = useCallback(() => {
    setProjectName('');
    setMitraId('');
    setContractValue('');
    setProjectStatus('PERENCANAAN');
    setStartDate('');
    setTargetDate('');
    setDescription('');
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<HubinTefaOrder>) => hubinApi.createTefaOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-tefa'] });
      toast.success('Pencatatan proyek TEFA berhasil ditambahkan!');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal menambahkan proyek';
      toast.error(errMsg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HubinTefaOrder> }) => 
      hubinApi.updateTefaOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-tefa'] });
      toast.success('Informasi proyek TEFA berhasil diperbarui!');
      setIsModalOpen(false);
      setEditingOrder(null);
      resetForm();
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal merubah proyek';
      toast.error(errMsg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deleteTefaOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-tefa'] });
      toast.success('Proyek TEFA berhasil dihapus.');
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal menghapus data';
      toast.error(errMsg);
    }
  });

  useEffect(() => {
    if (editingOrder) {
      setProjectName(editingOrder.nama_proyek);
      setMitraId(editingOrder.mitra_id || '');
      setContractValue(editingOrder.nilai_kontrak?.toString() || '');
      setProjectStatus(editingOrder.status_proyek);
      setStartDate(editingOrder.tanggal_mulai ? new Date(editingOrder.tanggal_mulai).toISOString().split('T')[0] : '');
      setTargetDate(editingOrder.tanggal_target ? new Date(editingOrder.tanggal_target).toISOString().split('T')[0] : '');
      setDescription(editingOrder.deskripsi || '');
    } else {
      resetForm();
    }
  }, [editingOrder, resetForm]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) {
      toast.error('Mohon isi nama proyek/order');
      return;
    }

    const payload = {
      nama_proyek: projectName,
      mitra_id: mitraId || null,
      nilai_kontrak: contractValue ? parseFloat(contractValue) : null,
      status_proyek: projectStatus,
      tanggal_mulai: startDate || null,
      tanggal_target: targetDate || null,
      deskripsi: description || null
    };

    // Safe parse check using Zod Schema (Pillar 25)
    const validation = tefaOrderSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }, [projectName, mitraId, contractValue, projectStatus, startDate, targetDate, description, editingOrder, createMutation, updateMutation]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Proyek TEFA',
      description: 'Apakah Anda yakin ingin menghapus pencatatan proyek TEFA ini?',
      style: 'danger'
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  }, [confirm, deleteMutation]);

  const formatRupiah = useCallback((val?: number) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }, []);

  const listData = useMemo(() => tefaData?.data || [], [tefaData]);
  const { totalRealisasi, proyekBerjalan } = useMemo(() => {
    const list: HubinTefaOrder[] = Array.isArray(listData) ? listData : [];
    const total = list.reduce((acc, curr) => acc + (Number(curr.nilai_kontrak) || 0), 0);
    const berjalan = list.filter(o => o.status_proyek === 'BERJALAN').length;
    return { totalRealisasi: total, proyekBerjalan: berjalan };
  }, [listData]);

  const mitras = useMemo(() => mitraData?.data || [], [mitraData]);
  const mitraOptions = useMemo(() => mitras?.map((m: MitraIndustri) => ({
    value: m.id,
    label: m.nama
  })) || [], [mitras]);
  const isMobile = useIsMobile();

  const renderMobileCard = (order: HubinTefaOrder) => {
    return (
      <div
        key={order.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
              {order.nama_proyek}
            </h4>
            <p className="text-[10px] font-bold text-slate-400">
              {order.Mitra?.nama || 'Umum / Tanpa Mitra'}
            </p>
          </div>
          <Badge
            variant={
              order.status_proyek === 'SELESAI' ? 'success' :
              order.status_proyek === 'BERJALAN' ? 'info' :
              order.status_proyek === 'BATAL' ? 'destructive' : 'secondary'
            }
            className="font-bold text-[9px] uppercase"
          >
            {order.status_proyek}
          </Badge>
        </div>

        {order.deskripsi && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {order.deskripsi}
          </p>
        )}

        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
          <span className="text-[10px] font-bold text-slate-400">Nilai Kontrak:</span>
          <span className="font-black text-indigo-600 dark:text-indigo-400">
            {formatRupiah(order.nilai_kontrak)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
          <span>
            {order.tanggal_mulai ? (
              `${formatDate(order.tanggal_mulai, { day: '2-digit', month: 'short' })} - ${order.tanggal_target ? formatDate(order.tanggal_target, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Selesai'}`
            ) : '-'}
          </span>

          {isHubin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-lg"
              >
                <Edit size={12} />
              </button>
              <button
                onClick={() => handleDelete(order.id)}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
            <Coins size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Total Nilai Kontrak</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{formatRupiah(totalRealisasi)}</span>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
            <Hammer size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Proyek Aktif (On Progress)</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{proyekBerjalan} Proyek</span>
          </div>
        </div>

        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
            <Building size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Total Order Diterima</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{listData?.length || 0} Order</span>
          </div>
        </div>
      </div>

      {/* Main Order Data Card */}
      <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari nama proyek/order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs rounded-xl"
              />
            </div>
            <div className="w-40 z-20">
              <SearchableSelect
                id="filterStatus"
                value={filterStatus}
                onValueChange={(val) => setFilterStatus(val)}
                options={statusOptions}
                placeholder="Semua Status"
              />
            </div>
          </div>

          {isHubin && (
            <Button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              variant="toolbarPrimary"
              size="toolbar"
              className="flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} />
              Catat Order TEFA Baru
            </Button>
          )}
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
            <Hammer size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Sinkronisasi Proyek Teaching Factory (TEFA)</h4>
            <p className="text-[9px] text-slate-400">Monitoring realisasi proyek riil industri yang dikerjakan oleh unit TEFA sekolah.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader /></div>
        ) : isMobile ? (
          <div className="space-y-4">
            <MobileAcademicList
              title="Daftar Proyek TEFA"
              data={listData || []}
              loading={isLoading}
              totalItems={listData?.length || 0}
              emptyMessage="Belum ada proyek TEFA terdaftar."
              renderCard={renderMobileCard}
            />
          </div>
        ) : listData?.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">
            Belum ada proyek TEFA terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                  <th className="py-3 px-3">Nama Proyek</th>
                  <th className="py-3 px-3">Industri Mitra</th>
                  <th className="py-3 px-3">Nilai Kontrak</th>
                  <th className="py-3 px-3">Durasi</th>
                  <th className="py-3 px-3">Status</th>
                  {isHubin && <th className="py-3 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {listData?.map((order: HubinTefaOrder) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{order.nama_proyek}</div>
                      {order.deskripsi && <div className="text-[10px] text-slate-400 line-clamp-1">{order.deskripsi}</div>}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-600 dark:text-slate-400">
                      {order.Mitra?.nama || <span className="text-slate-400 italic">Umum / Tanpa Mitra</span>}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {formatRupiah(order.nilai_kontrak)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 text-[10px]">
                      {order.tanggal_mulai ? (
                        <span>
                          {formatDate(order.tanggal_mulai, { day: '2-digit', month: 'short' })}
                          {order.tanggal_target ? ` - ${formatDate(order.tanggal_target, { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge 
                        variant={
                          order.status_proyek === 'SELESAI' ? 'success' : 
                          order.status_proyek === 'BERJALAN' ? 'info' : 
                          order.status_proyek === 'BATAL' ? 'destructive' : 'secondary'
                        }
                        className="font-bold text-[9px]"
                      >
                        {order.status_proyek}
                      </Badge>
                    </td>
                    {isHubin && (
                      <td className="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => { setEditingOrder(order); setIsModalOpen(true); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Modal - Catat / Edit Order TEFA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Hammer size={16} className="text-indigo-600" />
              {editingOrder ? 'Edit Catatan Proyek TEFA' : 'Catat Proyek / Order TEFA Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label htmlFor="projectName" className="font-bold text-slate-600 dark:text-slate-400">Nama Proyek / Kontrak Kerja *</label>
                <Input 
                  id="projectName"
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)} 
                  placeholder="e.g. Pembuatan Aplikasi Web Profile Kelurahan"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="mitraId" className="font-bold text-slate-600 dark:text-slate-400">Rekan Industri Pemberi Order</label>
                <SearchableSelect
                  id="mitraId"
                  value={mitraId}
                  onValueChange={(val) => setMitraId(val)}
                  options={mitraOptions}
                  placeholder="Pilih Rekan Industri (Opsional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="contractValue" className="font-bold text-slate-600 dark:text-slate-400">Nilai Kontrak (Rupiah)</label>
                  <Input 
                    id="contractValue"
                    type="number" 
                    value={contractValue} 
                    onChange={(e) => setContractValue(e.target.value)} 
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="projectStatus" className="font-bold text-slate-600 dark:text-slate-400">Status Pelaksanaan *</label>
                  <select
                    id="projectStatus"
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as 'PERENCANAAN' | 'BERJALAN' | 'SELESAI' | 'BATAL')}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-2.5 text-xs text-slate-700 dark:text-slate-300 outline-hidden"
                    required
                  >
                    <option value="PERENCANAAN">PERENCANAAN</option>
                    <option value="BERJALAN">BERJALAN</option>
                    <option value="SELESAI">SELESAI</option>
                    <option value="BATAL">BATAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="startDate" className="font-bold text-slate-600 dark:text-slate-400">Tanggal Mulai Proyek</label>
                  <Input 
                    id="startDate"
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="targetDate" className="font-bold text-slate-600 dark:text-slate-400">Target Tanggal Selesai</label>
                  <Input 
                    id="targetDate"
                    type="date" 
                    value={targetDate} 
                    onChange={(e) => setTargetDate(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="description" className="font-bold text-slate-600 dark:text-slate-400">Detail & Deskripsi Proyek</label>
                <textarea 
                  id="description"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={3}
                  placeholder="Tulis spesifikasi order, target deliverables, dsb..."
                  className="w-full border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-xl font-bold">
                  {editingOrder ? 'Perbarui Proyek' : 'Simpan Proyek'}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

    </div>
  );
});
