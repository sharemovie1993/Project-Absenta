import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStrukturTree, 
  assignGuruToStruktur, 
  removeGuruFromStruktur 
} from '@/api/academic/strukturOrganisasi.api';
import { getJurusanList } from '@/api/academic/jurusan.api';
import { TopologyTree } from './TopologyTree';
import { StrukturMobileCardTree } from './StrukturMobileCardTree';
import { LiveNodeEditor } from './LiveNodeEditor';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import { TreeSkeleton } from './NodeSkeleton';
import { transformManagementToTree } from './utils';
import type { TopologyNodeData } from './types';
import { useConfirm } from '@/providers/ConfirmProvider';
import { syncStrukturCache } from '@/helpers/strukturQuerySync';
import { 
  Users, 
  Info, 
  RefreshCw, 
  ShieldCheck, 
  X,
  Sparkles,
  Printer
} from 'lucide-react';
import { StrukturDivisiPrintModal } from './StrukturDivisiPrintModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export interface UniversalDivisiStrukturViewProps {
  /**
   * Kode posisi divisi (misal: 'KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU_KEPALA', 'BKK', 'BPBK')
   */
  divisionCode: string;
  divisionTitle?: string;
  description?: string;
  hideLayout?: boolean; // True jika di-embed dalam tab dashboard role
  isModal?: boolean;    // True jika dibuka dalam quick-view modal
  readOnly?: boolean;   // True jika mode pantau tanpa hak edit
  onClose?: () => void;
}

const DIVISION_METADATA: Record<string, { title: string; defaultDesc: string; accentColor: string }> = {
  KURIKULUM: {
    title: 'Struktur Organisasi Bidang Kurikulum',
    defaultDesc: 'Susunan Waka Kurikulum dan formasi staf bidang (Penjadwalan, Asesmen, KOSP, P5, Administrasi).',
    accentColor: 'from-emerald-600 to-teal-700',
  },
  KESISWAAN: {
    title: 'Struktur Organisasi Bidang Kesiswaan',
    defaultDesc: 'Susunan Waka Kesiswaan dan formasi staf bidang (Ketertiban, OSIS, Prestasi, Karakter, Satgas PPKSP).',
    accentColor: 'from-amber-500 to-orange-600',
  },
  HUBIN: {
    title: 'Struktur Organisasi Bidang Hubungan Industri & Masyarakat',
    defaultDesc: 'Susunan Waka Hubin dan formasi staf bidang (Kemitraan DUDI, Penempatan PKL, BKK, TEFA).',
    accentColor: 'from-cyan-600 to-blue-700',
  },
  SARPRAS: {
    title: 'Struktur Organisasi Bidang Sarana & Prasarana',
    defaultDesc: 'Susunan Waka Sarpras dan formasi staf bidang (Inventaris, Pemeliharaan Gedung, K3 Lingkungan).',
    accentColor: 'from-indigo-600 to-violet-700',
  },
  TU_KEPALA: {
    title: 'Struktur Organisasi Tata Usaha',
    defaultDesc: 'Susunan Kepala TU dan formasi staf administrasi (Persuratan, Keuangan/SPP, Dapodik/Kepegawaian).',
    accentColor: 'from-blue-600 to-indigo-700',
  },
  BKK: {
    title: 'Struktur Organisasi Bursa Kerja Khusus (BKK)',
    defaultDesc: 'Susunan pengurus BKK dalam penyaluran alumni, kemitraan loker, dan tracer study.',
    accentColor: 'from-violet-600 to-purple-700',
  },
  BPBK: {
    title: 'Struktur Organisasi Bimbingan & Konseling (BP/BK)',
    defaultDesc: 'Susunan koordinator dan tim konselor siswa sekolah.',
    accentColor: 'from-rose-600 to-pink-700',
  },
};

/**
 * 🏛️ Universal Role-Ready View (DRY): DivisiStrukturOrganisasiView
 * Menampilkan bagan formasi dan slotting staf sub-bidang untuk divisi tertentu.
 * Dapat dipanggil secara mandiri di halaman master struktur, sebagai sub-tab di tiap Dashboard Role,
 * maupun sebagai modal inspeksi kilat.
 */
export const DivisiStrukturOrganisasiView: React.FC<UniversalDivisiStrukturViewProps> = React.memo(({
  divisionCode,
  divisionTitle,
  description,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const [editingNode, setEditingNode] = useState<{ node: TopologyNodeData; element: HTMLElement | null } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Screen detection: Mobile vs Desktop
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const meta = DIVISION_METADATA[divisionCode] || {
    title: `Struktur Organisasi Divisi ${divisionCode}`,
    defaultDesc: 'Bagan susunan koordinator dan tim formasi sub-bidang.',
    accentColor: 'from-slate-700 to-slate-900',
  };

  const effectiveTitle = divisionTitle || meta.title;
  const effectiveDesc = description || meta.defaultDesc;

  // 1. Fetch Struktur Tree
  const { data: treeRes, isLoading: isTreeLoading, refetch } = useQuery({
    queryKey: ['strukturTree', divisionCode, refreshKey],
    queryFn: getStrukturTree,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Jurusans for label resolvers
  const { data: jurRes } = useQuery({
    queryKey: ['jurusans'],
    queryFn: () => getJurusanList(),
    staleTime: 30 * 60 * 1000,
  });

  const jurusans = useMemo(() => {
    const jurMap: Record<string, string> = {};
    if (jurRes?.data) {
      (jurRes.data || []).forEach((j: any) => {
        jurMap[j.id] = j.singkatan || j.kode || j.nama;
      });
    }
    return jurMap;
  }, [jurRes]);

  // 3. Transform Tree for Specific Division
  const divisionTreeData = useMemo(() => {
    if (!treeRes?.data) return null;
    const tree = transformManagementToTree([divisionCode], treeRes.data, jurusans, { includeEmptySlots: true, horizontalSubSlots: true });
    // Jika tree memiliki children (kategori divisi), ambil langsung kategori divisinya sebagai root tampilan
    if (tree && tree.children && tree.children.length === 1) {
      return tree.children[0];
    }
    return tree;
  }, [treeRes, divisionCode, jurusans]);

  // 4. Mutations
  const assignMutation = useMutation({
    mutationFn: async ({
      node,
      val,
    }: {
      node: TopologyNodeData;
      val: {
        value: string;
        label: string;
        is_leader?: boolean;
        assignment_flag?: string;
        custom_title?: string;
      };
    }) => {
      const realId = node.data?.realStrukturId;
      const dateStr = new Date().toISOString().split('T')[0];

      return assignGuruToStruktur(realId, {
        guru_id: val.value,
        start_date: dateStr,
        unit_id: node.data?.unit_id,
        kelas_id: node.data?.kelas_id,
        jenis_kegiatan_id: node.data?.jenis_kegiatan_id,
        is_leader: val.is_leader ?? node.data?.isLeader,
        assignment_flag: val.assignment_flag ?? node.data?.assignmentFlag,
        custom_title: val.custom_title ?? node.data?.customTitle,
      });
    },
    onSuccess: async (_, { node }) => {
      toast.success(
        node.data?.isAddingNew
          ? 'Anggota baru berhasil ditambahkan'
          : 'Penugasan staf berhasil disimpan'
      );
      setRefreshKey((k) => k + 1);
      await syncStrukturCache(queryClient);
      setEditingNode(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan penugasan');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (node: TopologyNodeData) => {
      const { realMemberId, realStrukturId } = node.data || {};
      return removeGuruFromStruktur(realStrukturId, realMemberId);
    },
    onSuccess: async () => {
      toast.success('Anggota berhasil dihapus dari formasi');
      setRefreshKey((k) => k + 1);
      await syncStrukturCache(queryClient);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus anggota');
    },
  });

  const handleNodeAction = useCallback(
    async (
      node: TopologyNodeData | null | undefined,
      actionType: string = 'EDIT',
      element: HTMLElement | null = null
    ) => {
      if (!node) {
        setEditingNode(null);
        return;
      }

      if (readOnly) {
        toast('Mode pantau (Read-only): Anda tidak memiliki izin mengubah struktur ini.');
        return;
      }

      // Remove Member (Trash Icon)
      if (actionType === 'MEMBER_REMOVE' || actionType === 'DELETE') {
        const personName = node.subLabel || node.label;
        const isConfirmed = await confirm({
          title: 'Hapus dari Formasi',
          description: `Apakah Anda yakin ingin menghapus "${personName}" dari penugasan ini? Slot ini akan kembali kosong dan siap diisi personil baru.`,
          confirmText: 'Ya, Hapus',
          cancelText: 'Batal',
          style: 'danger',
        });

        if (isConfirmed) {
          removeMutation.mutate(node);
        }
        return;
      }

      // Add New Member (Ad-hoc)
      if (node.actionType === 'MEMBER_ADD' || (typeof node.id === 'string' && node.id.startsWith('add-new-'))) {
        const virtualNode: TopologyNodeData = {
          id: `virtual-add-${Date.now()}`,
          type: 'MEMBER',
          label: 'Tambah Personil Pendukung',
          data: {
            ...node.data,
            realMemberId: undefined,
            realStrukturId: node.parentStrukturId || node.data?.realStrukturId,
            isAddingNew: true,
          },
        };
        setEditingNode({ node: virtualNode, element });
        return;
      }

      // Edit or Fill Empty Slot
      if (node.type === 'MEMBER' || node.type === 'STRUCT' || node.data?.isUnassigned) {
        setEditingNode({ node, element });
      }
    },
    [confirm, removeMutation, readOnly]
  );

  return (
    <div className={cn("w-full space-y-4", isModal && "p-2 sm:p-4")}>
      {/* 1. Header & Title (Disembunyikan jika di-embed di tab dashboard role agar tidak redundan) */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm shrink-0", meta.accentColor)}>
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {effectiveTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {effectiveDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshKey((k) => k + 1);
                refetch();
                toast.success('Bagan struktur diperbarui');
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <RefreshCw size={13} />
              <span>Muat Ulang</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Printer size={13} />
              <span>Cetak Bagan (A4 / GRC)</span>
            </Button>
            {isModal && onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5">
                <X size={18} />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 2. Informational Banner for Waka / Koordinator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl text-blue-900 dark:text-blue-200 text-xs">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Formasi Mandiri Tim Divisi</p>
            <p className="text-[11px] text-blue-700 dark:text-blue-300/90 leading-relaxed">
              Klik langsung pada kartu formasi bertuliskan <strong>+ Klik Isi Slot</strong> untuk menugaskan guru pembantu sub-bidang Anda. Waka/Koordinator dapat secara leluasa mengatur penugasan tim tanpa perlu menunggu administrator.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshKey((k) => k + 1);
              refetch();
              toast.success('Bagan struktur diperbarui');
            }}
            className="gap-1.5 text-xs font-bold bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100/50"
          >
            <RefreshCw size={13} />
            <span>Muat Ulang</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Printer size={13} />
            <span>Cetak Bagan (A4 / GRC)</span>
          </Button>
        </div>
      </div>

      {/* 3. Main Topology Diagram / Mobile Cards */}
      <div className="w-full bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-6 shadow-xs overflow-x-auto min-h-[420px] flex items-center justify-start xl:justify-center custom-scrollbar">
        {isTreeLoading ? (
          <TreeSkeleton />
        ) : divisionTreeData ? (
          <TreeErrorBoundary>
            {isMobile ? (
              <StrukturMobileCardTree
                data={divisionTreeData}
                editingId={editingNode?.node.id}
                onAction={handleNodeAction}
              />
            ) : (
              <TopologyTree
                data={divisionTreeData}
                editingId={editingNode?.node.id}
                onAction={handleNodeAction}
              />
            )}
          </TreeErrorBoundary>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Formasi Divisi Belum Tersedia
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Data master jabatan untuk divisi {divisionCode} belum diaktifkan di master organisasi sekolah.
            </p>
          </div>
        )}
      </div>

      {/* 4. Live Node Editor (Singleton Drawer) */}
      {editingNode && (
        <LiveNodeEditor
          node={editingNode.node}
          anchorEl={editingNode.element}
          onSave={async (val) => {
            await assignMutation.mutateAsync({
              node: editingNode.node,
              val,
            });
          }}
          onClose={() => setEditingNode(null)}
        />
      )}

      {/* 5. Modal Cetak Universal Document Printing (A4 Landscape & Papan GRC 2:1) */}
      {isPrintModalOpen && (
        <StrukturDivisiPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          divisionCode={divisionCode}
          divisionTitle={effectiveTitle}
          treeData={divisionTreeData}
        />
      )}
    </div>
  );
});

DivisiStrukturOrganisasiView.displayName = 'DivisiStrukturOrganisasiView';
