import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FolderTree, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  Lock, 
  FileText, 
  Folder, 
  FolderOpen,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coopAccountApi } from '@/api/coopAccount.api';
import { SectionCard } from '@/components/ui/SectionCard';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import Button from '@/components/ui/Button';
import { formatRupiahCompact, formatRupiahFull } from '../dashboard/CoopExecutiveKpiCards';
import { AccountFormModal } from './AccountFormModal';
import { cn } from '@/lib/utils';
import type { 
  AccountNode, 
  AccountCategoryType, 
  CreateAccountPayload, 
  UpdateAccountPayload 
} from './types';

interface ChartOfAccountsSectionProps {
  canManage?: boolean;
}

const TYPE_CONFIG: Record<AccountCategoryType, { label: string; badgeClass: string; prefix: string }> = {
  ASSET: { 
    label: 'Aktiva', 
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800', 
    prefix: '1' 
  },
  LIABILITY: { 
    label: 'Kewajiban', 
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800', 
    prefix: '2' 
  },
  EQUITY: { 
    label: 'Ekuitas', 
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800', 
    prefix: '3' 
  },
  REVENUE: { 
    label: 'Pendapatan', 
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', 
    prefix: '4' 
  },
  EXPENSE: { 
    label: 'Beban', 
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800', 
    prefix: '5' 
  },
};

export const ChartOfAccountsSection: React.FC<ChartOfAccountsSectionProps> = ({
  canManage = true,
}) => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<AccountCategoryType | 'ALL'>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountNode | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  
  // Delete Confirmation State
  const [deletingAccount, setDeletingAccount] = useState<AccountNode | null>(null);

  // ─── TANSTACK QUERY: FETCH COA TREE & FLAT ────────────────────────────────
  const { data: coaData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['coop-accounts', { search, type: selectedType }],
    queryFn: () => coopAccountApi.getAccounts({ tree: true, search, type: selectedType === 'ALL' ? undefined : selectedType }),
    staleTime: 30000,
  });

  const flatList = coaData?.flat || [];
  const treeList = coaData?.tree || [];
  const summary = coaData?.summary || { totalAccounts: 0, totalHeaders: 0, totalPostingAccounts: 0 };

  // Inisialisasi awal: Buka semua akun level 1 & 2 secara default
  React.useEffect(() => {
    if (flatList.length > 0 && expandedIds.size === 0) {
      const initialOpen = new Set<string>();
      flatList.forEach(a => {
        if (a.isHeader && a.level <= 2) initialOpen.add(a.id);
      });
      setExpandedIds(initialOpen);
    }
  }, [flatList]);

  // ─── MUTATIONS ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateAccountPayload) => coopAccountApi.createAccount(payload),
    onSuccess: (newAcc) => {
      toast.success(`Akun "${newAcc.code} - ${newAcc.name}" berhasil dibuat`);
      queryClient.invalidateQueries({ queryKey: ['coop-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-balance-sheet'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal membuat akun');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) => coopAccountApi.updateAccount(id, payload),
    onSuccess: (updatedAcc) => {
      toast.success(`Akun "${updatedAcc.code} - ${updatedAcc.name}" berhasil diperbarui`);
      queryClient.invalidateQueries({ queryKey: ['coop-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-balance-sheet'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui akun');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coopAccountApi.deleteAccount(id),
    onSuccess: () => {
      toast.success('Akun berhasil dihapus');
      setDeletingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['coop-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-balance-sheet'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus akun');
    }
  });

  const syncDefaultsMutation = useMutation({
    mutationFn: () => coopAccountApi.ensureDefaultAccounts(),
    onSuccess: () => {
      toast.success('Struktur akun standar berhasil disinkronisasi');
      queryClient.invalidateQueries({ queryKey: ['coop-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal sinkronisasi akun');
    }
  });

  // ─── TREE EXPAND/COLLAPSE HELPERS ─────────────────────────────────────────
  const toggleNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allHeaderIds = new Set<string>();
    flatList.filter(a => a.isHeader).forEach(a => allHeaderIds.add(a.id));
    setExpandedIds(allHeaderIds);
  }, [flatList]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // ─── MODAL HANDLERS ───────────────────────────────────────────────────────
  const handleOpenAddModal = (parentId?: string) => {
    setEditingAccount(null);
    setDefaultParentId(parentId || null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (account: AccountNode) => {
    setEditingAccount(account);
    setDefaultParentId(account.parentId);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (payload: CreateAccountPayload | UpdateAccountPayload) => {
    if (editingAccount) {
      await updateMutation.mutateAsync({ id: editingAccount.id, payload: payload as UpdateAccountPayload });
    } else {
      await createMutation.mutateAsync(payload as CreateAccountPayload);
    }
  };

  // ─── RECURSIVE TREE ROW RENDERER ──────────────────────────────────────────
  const renderTreeNodes = (nodes: AccountNode[]) => {
    return nodes.map(node => {
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = expandedIds.has(node.id);
      const typeInfo = TYPE_CONFIG[node.type];
      const isNegative = node.balance < 0;

      // Padding kiri berbasis level hierarki
      const indentPadding = Math.min((node.level - 1) * 20, 80);

      return (
        <React.Fragment key={node.id}>
          <div
            className={cn(
              "flex items-center justify-between p-2.5 sm:p-3 border-b border-slate-100 dark:border-slate-800/80 transition-colors text-xs",
              node.isHeader 
                ? "bg-slate-50/70 dark:bg-slate-850/60 font-semibold" 
                : "bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            )}
          >
            {/* Sisi Kiri: Hirarki, Toggle, Ikon & Nama */}
            <div className="flex items-center gap-2 min-w-0 pr-3" style={{ paddingLeft: `${indentPadding}px` }}>
              {/* Tombol Toggle jika punya anak */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 shrink-0 transition-transform"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-5 shrink-0 inline-block text-center text-slate-300 dark:text-slate-700">•</span>
              )}

              {/* Ikon Tipe Akun */}
              {node.isHeader ? (
                isExpanded ? (
                  <FolderOpen size={15} className="text-indigo-500 shrink-0" />
                ) : (
                  <Folder size={15} className="text-indigo-500 shrink-0" />
                )
              ) : (
                <FileText size={14} className="text-slate-400 shrink-0" />
              )}

              {/* Kode Akun */}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                {node.code}
              </span>

              {/* Nama Akun */}
              <span className={cn(
                "truncate",
                node.isHeader ? "font-bold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
              )}>
                {node.name}
              </span>

              {/* Badges Status */}
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {node.isHeader && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Header
                  </span>
                )}
                {node.isSystem && (
                  <span title="Akun sistem bawaan koperasi" className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-0.5 cursor-help">
                    <Lock size={9} />
                    <span className="hidden sm:inline">Sistem</span>
                  </span>
                )}
                {!node.isActive && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    Non-aktif
                  </span>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Golongan, Saldo, dan Aksi */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Badge Golongan */}
              <span className={cn("hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border", typeInfo?.badgeClass)}>
                {typeInfo?.label}
              </span>

              {/* Saldo Akun */}
              <div className="text-right min-w-[90px] sm:min-w-[120px]">
                <span 
                  title={formatRupiahFull(node.balance)}
                  className={cn(
                    "font-mono block truncate cursor-help",
                    node.isHeader ? "font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100" : "font-bold text-xs",
                    isNegative ? "text-rose-600 dark:text-rose-400" : (node.isHeader ? "" : "text-slate-700 dark:text-slate-300")
                  )}
                >
                  {formatRupiahCompact(node.balance)}
                </span>
                {node.isHeader ? (
                  <span className="text-[9px] text-slate-400 block -mt-0.5">
                    Saldo Rollup
                  </span>
                ) : (
                  (node.journalCount ?? 0) > 0 && (
                    <span className="text-[9px] text-slate-400 block -mt-0.5">
                      {node.journalCount} mutasi
                    </span>
                  )
                )}
              </div>

              {/* Tombol Aksi */}
              {canManage && (
                <div className="flex items-center gap-1 pl-1">
                  {/* Tambah Sub-Akun Langsung */}
                  <button
                    type="button"
                    title={`Tambah Sub-Akun di bawah ${node.name}`}
                    onClick={() => handleOpenAddModal(node.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                  >
                    <Plus size={13} />
                  </button>

                  {/* Edit Akun */}
                  <button
                    type="button"
                    title="Edit Nama / Induk Akun"
                    onClick={() => handleOpenEditModal(node)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                  >
                    <Edit3 size={13} />
                  </button>

                  {/* Hapus Akun (Hanya jika bukan akun sistem) */}
                  <button
                    type="button"
                    title={node.isSystem ? 'Akun sistem tidak dapat dihapus' : 'Hapus Akun'}
                    disabled={node.isSystem}
                    onClick={() => setDeletingAccount(node)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      node.isSystem 
                        ? "text-slate-300 dark:text-slate-700 cursor-not-allowed" 
                        : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    )}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Render Rekursif Sub-Akun (Anak) jika sedang di-expand */}
          {hasChildren && isExpanded && renderTreeNodes(node.children!)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      
      {/* ─── KARTU RINGKASAN COA (SHARED ANALYTICSCARD COMPONENT) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <AnalyticsCard
          title="Total Bagan Akun"
          value={`${summary.totalAccounts} Akun`}
          icon={<FolderTree size={20} />}
          gradient="from-blue-600 to-indigo-600"
          subtitle="Seluruh rekening pembukuan aktif"
          isLoading={isLoading}
        />

        <AnalyticsCard
          title="Akun Induk (Header)"
          value={`${summary.totalHeaders} Kelompok`}
          icon={<Layers size={20} />}
          gradient="from-indigo-600 to-purple-600"
          subtitle="Wadah klasifikasi rekening"
          isLoading={isLoading}
        />

        <AnalyticsCard
          title="Akun Transaksi (Posting)"
          value={`${summary.totalPostingAccounts} Posting`}
          icon={<FileText size={20} />}
          gradient="from-emerald-600 to-teal-600"
          subtitle="Rekening operasional transaksi"
          isLoading={isLoading}
        />
      </div>

      {/* ─── TOOLBAR & AKSI ─── */}
      <SectionCard fullWidth noPadding>
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Baris Kontrol Utama */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode akun atau nama akun..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Tombol Kontrol */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-2 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-2 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              >
                Tutup Semua
              </button>

              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => syncDefaultsMutation.mutate()}
                    disabled={syncDefaultsMutation.isPending}
                    className="text-xs flex items-center gap-1.5"
                    title="Sinkronisasi akun standar koperasi"
                  >
                    <RefreshCw size={13} className={syncDefaultsMutation.isPending ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Sinkronisasi</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleOpenAddModal()}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Tambah Akun</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filter Tab Kategori Golongan */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors",
                selectedType === 'ALL' 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              Semua Golongan
            </button>
            {(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as AccountCategoryType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5",
                  selectedType === t 
                    ? "bg-indigo-600 text-white" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                )}
              >
                <span>{TYPE_CONFIG[t].prefix} - {TYPE_CONFIG[t].label}</span>
              </button>
            ))}
          </div>

          {/* ─── TABEL POHON BAGAN AKUN (ACCURATE STYLE) ─── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            {/* Header Kolom */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-100/80 dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Bagan Akun / Kode Rekening</span>
              <div className="flex items-center gap-8 pr-2">
                <span className="hidden md:inline">Golongan</span>
                <span className="text-right w-24">Saldo Berjalan</span>
                {canManage && <span className="w-16 text-right">Aksi</span>}
              </div>
            </div>

            {/* Konten Pohon */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Memuat bagan akun koperasi...</span>
              </div>
            ) : treeList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <FolderTree size={24} className="mx-auto mb-2 opacity-50" />
                <span>Tidak ada akun yang sesuai dengan pencarian.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {renderTreeNodes(treeList)}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ─── MODAL FORM TAMBAH / EDIT AKUN ─── */}
      <AccountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        editingAccount={editingAccount}
        defaultParentId={defaultParentId}
        allAccounts={flatList}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* ─── MODAL KONFIRMASI HAPUS ─── */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hapus Akun Pembukuan?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anda akan menghapus akun: <strong>{deletingAccount.code} - {deletingAccount.name}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
              Akun hanya dapat dihapus jika belum pernah memiliki mutasi jurnal dan tidak memiliki sub-akun anak di bawahnya.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setDeletingAccount(null)}
                disabled={deleteMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => deleteMutation.mutate(deletingAccount.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
