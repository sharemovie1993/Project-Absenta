import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Award, 
  RefreshCw,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { 
  removeKetarunaanPanitia, 
  type KetarunaanPanitiaMember 
} from '@/api/kesiswaan/programKetarunaan.api';
import { KETARUNAAN_ROLES } from './KetarunaanPanitiaFormModal';

interface KetarunaanPanitiaTableProps {
  panitiaList: KetarunaanPanitiaMember[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onEditMember: (member: KetarunaanPanitiaMember) => void;
  canManage?: boolean;
}

export const KetarunaanPanitiaTable: React.FC<KetarunaanPanitiaTableProps> = ({
  panitiaList,
  isLoading,
  onRefresh,
  onOpenAddModal,
  onEditMember,
  canManage = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredList = useMemo(() => {
    return panitiaList.filter((m) => {
      const matchRole = roleFilter === 'ALL' || m.assignment_flag === roleFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        m.nama_guru.toLowerCase().includes(term) ||
        m.nip.toLowerCase().includes(term) ||
        (m.custom_title || '').toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }, [panitiaList, roleFilter, searchTerm]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${name} dari kepanitiaan Ketarunaan?`)) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await removeKetarunaanPanitia(id);
      toast.success(res?.message || 'Panitia berhasil dihapus.');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus panitia.');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadge = (flag: string, isLeader: boolean) => {
    if (isLeader || flag === 'KETUA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          👑 Ketua Pembina
        </span>
      );
    }
    const matched = KETARUNAAN_ROLES.find(r => r.value === flag);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <span>{matched?.icon || '🚩'}</span>
        <span>{matched?.label || flag}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar: Filter & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari panitia / NIP / peran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="ALL">Semua Peran ({panitiaList.length})</option>
            {KETARUNAAN_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.icon} {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-xl text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          {canManage && (
            <Button
              size="sm"
              onClick={onOpenAddModal}
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Ploting Panitia</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 font-semibold">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5">Personel Guru / Pembina</th>
                <th className="py-3 px-3.5">Peran Kepanitiaan</th>
                <th className="py-3 px-3.5">Jabatan Resmi (SK)</th>
                <th className="py-3 px-3.5">Posisi Sistem</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                {canManage && <th className="py-3 px-3.5 text-right w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-rose-500" />
                      <span>Memuat daftar panitia ketarunaan...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
                        <Users size={22} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {searchTerm || roleFilter !== 'ALL'
                            ? 'Tidak ada panitia yang sesuai filter'
                            : 'Belum Ada Panitia yang Diploting'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {searchTerm || roleFilter !== 'ALL'
                            ? 'Coba atur ulang kata kunci pencarian atau filter peran.'
                            : 'Mulai ploting guru pembina ke dalam struktur kepanitiaan Ketarunaan.'}
                        </p>
                      </div>
                      {canManage && !searchTerm && roleFilter === 'ALL' && (
                        <Button
                          size="sm"
                          onClick={onOpenAddModal}
                          className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          <Plus size={13} className="mr-1" />
                          Ploting Panitia Pertama
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    
                    {/* Personel Guru */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {item.nama_guru.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.nama_guru}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            NIP: {item.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Peran Kepanitiaan */}
                    <td className="py-3 px-3.5">
                      {getRoleBadge(item.assignment_flag, item.is_leader)}
                    </td>

                    {/* Jabatan Resmi */}
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.custom_title || '-'}
                      </span>
                    </td>

                    {/* Posisi Sistem */}
                    <td className="py-3 px-3.5">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                        {item.position_code}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <AlertCircle size={13} />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    {canManage && (
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditMember(item)}
                            title="Ubah peran panitia"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nama_guru)}
                            disabled={deletingId === item.id}
                            title="Hapus dari kepanitiaan"
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
