import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStrukturTree, 
  createStruktur,
  assignGuruToStruktur, 
  assignSiswaToStruktur,
  removeGuruFromStruktur,
  removeSiswaFromStruktur
} from '@/api/academic/strukturOrganisasi.api';
import { getJurusanList } from '@/api/academic/jurusan.api';
import { Loader } from '@/components/ui/Loader';
import toast from 'react-hot-toast';
import { TopologyTree } from './TopologyTree';
import { StrukturMobileCardTree } from './StrukturMobileCardTree';
import { LiveNodeEditor } from './LiveNodeEditor';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import { TreeSkeleton } from './NodeSkeleton';
import { GROUP_CONFIG } from './constants';
import { transformDataToTree, transformManagementToTree, transformTuTabToTree } from './utils';
import type { GroupedStruktur, StrukturDiagramProps, TopologyNodeData } from './types';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useJenjang } from '@/hooks/useJenjang';
import { LayoutGrid, Network, Smartphone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StrukturDiagram: React.FC<StrukturDiagramProps> = React.memo(({ 
  activeCodes = [], 
  activeTab, 
  onNodeClick, 
  refreshKey 
}) => {
  const queryClient = useQueryClient();
  const [editingNode, setEditingNode] = useState<{ node: TopologyNodeData; element: HTMLElement | null } | null>(null);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  // Strict Screen Detection: Mobile will ONLY render StrukturMobileCardTree, Desktop will ONLY render TopologyTree
  const [isMobile, setIsMobile] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { confirm } = useConfirm();
  const { jenjang, tingkatList } = useJenjang();

  const rawJenjang = useMemo(() => (jenjang || 'SMA').toUpperCase(), [jenjang]);

  const group1Codes = useMemo(() => {
    if (['SD', 'MI'].includes(rawJenjang)) return [];
    if (!['SMK', 'MAK'].includes(rawJenjang)) {
      return ['KURIKULUM', 'KESISWAAN']; // Tanpa HUBIN
    }
    return ['KURIKULUM', 'KESISWAAN', 'HUBIN'];
  }, [rawJenjang]);

  const group2Codes = useMemo(() => {
    if (['SD', 'MI'].includes(rawJenjang)) return ['TU_KEPALA']; // Hanya Ka.TU
    if (!['SMK', 'MAK'].includes(rawJenjang)) {
      return ['SARPRAS', 'TU_KEPALA']; // Tanpa BKK
    }
    return ['SARPRAS', 'TU_KEPALA', 'BKK'];
  }, [rawJenjang]);

  // Queries
  const { data: treeRes, isLoading: isTreeLoading } = useQuery({
    queryKey: ['strukturTree', refreshKey, internalRefreshKey],
    queryFn: getStrukturTree,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: jurRes } = useQuery({
    queryKey: ['jurusans'],
    queryFn: () => getJurusanList(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const data = useMemo(() => treeRes?.data || {}, [treeRes]);
  const jurusans = useMemo(() => {
    const jurMap: Record<string, string> = {};
    if (jurRes?.data) {
      (jurRes.data || []).forEach(j => {
        jurMap[j.id] = j.singkatan || j.kode || j.nama;
      });
    }
    return jurMap;
  }, [jurRes]);

  // Mutations
  const assignMutation = useMutation({
    mutationFn: async ({ node, val }: { node: TopologyNodeData, val: { value: string; label: string } }) => {
      const realId = node.data?.realStrukturId;
      const roleCode = node.data?.roleCode;
      const isSiswa = roleCode === 'PETUGAS_KELAS';
      const dateStr = new Date().toISOString().split('T')[0];

      if (isSiswa) {
        return assignSiswaToStruktur(realId, { 
          siswa_id: val.value, 
          start_date: dateStr,
          kelas_id: node.data?.kelas_id 
        });
      } else {
        return assignGuruToStruktur(realId, { 
          guru_id: val.value, 
          start_date: dateStr,
          unit_id: node.data?.unit_id,
          kelas_id: node.data?.kelas_id,
          jenis_kegiatan_id: node.data?.jenis_kegiatan_id
        });
      }
    },
    onSuccess: (_, { node }) => {
      toast.success(node.data?.isAddingNew ? 'Anggota baru berhasil ditambahkan' : 'Penugasan berhasil diperbarui');
      setInternalRefreshKey(k => k + 1);
      queryClient.invalidateQueries({ queryKey: ['strukturTree'] });
      queryClient.refetchQueries({ queryKey: ['strukturTree'] });
      queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
      queryClient.invalidateQueries({ queryKey: ['waliKelasList'] });
      queryClient.invalidateQueries({ queryKey: ['wali-kelas-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['bebanGuru'] });
      queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guru-options-list'] });
      setEditingNode(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan penugasan');
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (node: TopologyNodeData) => {
      const { realMemberId, realStrukturId, roleCode, type } = node.data || {};
      const isSiswa = roleCode === 'PETUGAS_KELAS' || type === 'SISWA';
      if (isSiswa) {
        return removeSiswaFromStruktur(realStrukturId, realMemberId);
      } else {
        return removeGuruFromStruktur(realStrukturId, realMemberId);
      }
    },
    onSuccess: () => {
      toast.success('Anggota berhasil dihapus');
      setInternalRefreshKey(k => k + 1);
      queryClient.invalidateQueries({ queryKey: ['strukturTree'] });
      queryClient.refetchQueries({ queryKey: ['strukturTree'] });
      queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
      queryClient.invalidateQueries({ queryKey: ['waliKelasList'] });
      queryClient.invalidateQueries({ queryKey: ['wali-kelas-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['bebanGuru'] });
      queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      queryClient.invalidateQueries({ queryKey: ['guru-options-list'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus anggota');
    }
  });

  const handleLiveSave = useCallback(async (node: TopologyNodeData, val: { value: string; label: string }) => {
    assignMutation.mutate({ node, val });
  }, [assignMutation]);

  const stableTreeDataMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (!data || Object.keys(data).length === 0) return map;

    const kepalaSekolahTree = transformDataToTree(['KEPALA_SEKOLAH'], data, jurusans, tingkatList);
    const managementTree1 = transformManagementToTree(group1Codes, data, jurusans);
    const managementTree2 = transformManagementToTree(group2Codes, data, jurusans);
    
    if (kepalaSekolahTree) {
      map['G1_TOP'] = {
        ...kepalaSekolahTree,
        children: managementTree1?.children || []
      };
      
      if (managementTree2) {
        map['G1_BOTTOM'] = {
          id: 'PIMPINAN_GRP2_ROOT',
          label: 'MANAJEMEN OPERASIONAL',
          type: 'ROOT' as any,
          children: managementTree2.children || []
        };
      }
    }

    map['G2_TOP'] = transformDataToTree(['KAPROG', 'KABENG', 'TOOLMAN'], data, jurusans, tingkatList);
    map['G2_BOTTOM'] = transformDataToTree(['WALIKELAS'], data, jurusans, tingkatList);
    map['G3_TOP'] = transformDataToTree(['BPBK', 'BKK', 'GERBANG'], data, jurusans, tingkatList);
    map['G3_BOTTOM'] = transformDataToTree(['PETUGAS_KELAS', 'PETUGAS_ABSENSI'], data, jurusans, tingkatList);

    const handledCodes = (GROUP_CONFIG || []).flatMap(g => g.codes);
    const otherCodes = Object.keys(data || {}).filter(kode => !handledCodes.includes(kode));
    if (otherCodes.length > 0) {
      map['other'] = transformDataToTree(otherCodes, data, jurusans, tingkatList);
    }
    
    return map;
  }, [data, jurusans, group1Codes, group2Codes, tingkatList]);

  const currentTreeData1 = useMemo(() => {
    if (!data || Object.keys(data).length === 0 || activeTab !== 'PIMPINAN') return null;

    const kepalaSekolahTree = transformDataToTree(['KEPALA_SEKOLAH'], data, jurusans, tingkatList);
    const managementTree1 = transformManagementToTree(group1Codes, data, jurusans);
    
    if (!kepalaSekolahTree) return null;
    return {
      ...kepalaSekolahTree,
      children: managementTree1?.children || []
    };
  }, [data, jurusans, activeTab, group1Codes, tingkatList]);

  const currentTreeData2 = useMemo(() => {
    if (!data || Object.keys(data).length === 0 || activeTab !== 'PIMPINAN') return null;

    const managementTree2 = transformManagementToTree(group2Codes, data, jurusans);
    if (!managementTree2) return null;
    return {
      id: 'PIMPINAN_GRP2_ROOT',
      label: 'MANAJEMEN OPERASIONAL',
      type: 'ROOT' as any,
      children: managementTree2.children || []
    };
  }, [data, jurusans, activeTab, group2Codes]);

  const currentTreeData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) return null;
    if (!activeTab || !activeCodes || activeCodes.length === 0) return null;

    if (activeTab === 'PIMPINAN') {
      return null;
    }

    if (activeTab === 'TATA_USAHA') {
      return transformTuTabToTree(data, jurusans, tingkatList);
    }

    return transformDataToTree(activeCodes, data, jurusans, tingkatList);
  }, [data, jurusans, activeCodes, activeTab, tingkatList]);

  const handleNodeAction = useCallback(async (node: TopologyNodeData | null | undefined, actionType: string = 'EDIT', element: HTMLElement | null = null) => {
    if (!node) {
      setEditingNode(null);
      return;
    }

    // Handle "Remove Member" action (Trash/X Button)
    if (actionType === 'MEMBER_REMOVE' || actionType === 'DELETE') {
      const personName = node.subLabel || node.label;
      
      const isConfirmed = await confirm({
        title: 'Hapus Anggota',
        description: `Apakah Anda yakin ingin menghapus "${personName}" dari jabatan ini? Tindakan ini tidak dapat dibatalkan.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger'
      });

      if (isConfirmed) {
        removeMutation.mutate(node);
      }
      return;
    }

    // Handle "Add New Member" button (Magnetic Pill Button)
    if (node.actionType === 'MEMBER_ADD' || (typeof node.id === 'string' && node.id.startsWith('add-new-'))) {
      const virtualNode: TopologyNodeData = {
        id: `virtual-add-${Date.now()}`,
        type: 'MEMBER',
        label: 'Tambah Personel Baru',
        data: {
          ...node.data,
          realMemberId: undefined, // Penting: Jangan bawa ID orang lama
          realStrukturId: node.parentStrukturId || node.data?.realStrukturId, // Target struktur induk
          isAddingNew: true // Sinyal ke Drawer untuk CREATE bukan UPDATE
        }
      };
      setEditingNode({ node: virtualNode, element });
      return;
    }

    if (node.type === 'MEMBER' || node.type === 'STRUCT' || node.data?.isUnassigned) {
      setEditingNode({ node, element });
    }
  }, [confirm, removeMutation]);

  const renderTreeOrCards = useCallback((treeData: TopologyNodeData, keyPrefix = '') => {
    if (!treeData) return null;

    if (isMobile) {
      return (
        <TreeErrorBoundary key={`mobile-card-${keyPrefix}`}>
          <StrukturMobileCardTree 
            data={treeData} 
            editingId={editingNode?.node.id}
            onAction={handleNodeAction}
          />
        </TreeErrorBoundary>
      );
    }

    return (
      <TreeErrorBoundary key={`desktop-tree-${keyPrefix}`}>
        <TopologyTree 
          data={treeData} 
          editingId={editingNode?.node.id}
          onAction={handleNodeAction}
        />
      </TreeErrorBoundary>
    );
  }, [isMobile, editingNode?.node.id, handleNodeAction]);

  const renderedGroups = useMemo(() => {
    return GROUP_CONFIG.map(group => {
      const isMultiLayer = group.id === 'G1' || group.id === 'G2' || group.id === 'G3';
      const treeData = stableTreeDataMap[group.id];
      const hasMultiData = isMultiLayer && (stableTreeDataMap[`${group.id}_TOP`] || stableTreeDataMap[`${group.id}_BOTTOM`]);
      
      if (!treeData && !hasMultiData) return null;

      return (
        <div key={group.id} className="space-y-4" role="group" aria-label={group.title}>
          <div className="flex flex-col items-center mb-6" role="none">
            <div className={`px-6 py-2 rounded-xl bg-gradient-to-r ${group.gradient} text-white shadow-lg text-center`} role="none">
              <h3 className="text-sm font-black uppercase tracking-widest">{group.title}</h3>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-tight">{group.subtitle}</p>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mt-2" role="none" />
          </div>

          {isMultiLayer ? (
            <div className="flex flex-col gap-8">
              {stableTreeDataMap[`${group.id}_TOP`] && renderTreeOrCards(stableTreeDataMap[`${group.id}_TOP`], `${group.id}_TOP`)}
              
              {stableTreeDataMap[`${group.id}_BOTTOM`] && (
                <>
                  <div className="relative py-4" role="none">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true" role="none">
                      <div className="w-full border-t-2 border-slate-200 dark:border-slate-800 border-dashed" role="none"></div>
                    </div>
                    <div className="relative flex justify-center" role="none">
                      <span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {group.id === 'G1' ? 'Bidang Sarana & Operasional' : group.id === 'G2' ? 'Jajaran Wali Kelas' : 'Petugas Khusus'}
                      </span>
                    </div>
                  </div>

                  {renderTreeOrCards(stableTreeDataMap[`${group.id}_BOTTOM`], `${group.id}_BOTTOM`)}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {renderTreeOrCards(stableTreeDataMap[group.id], group.id)}
            </div>
          )}
        </div>
      );
    });
  }, [stableTreeDataMap, renderTreeOrCards]);

  const renderedOther = useMemo(() => {
    const treeData = stableTreeDataMap['other'];
    if (!treeData) return null;

    return (
      <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800" role="group" aria-label="Jabatan Lainnya">
        <div className="flex flex-col items-center mb-6" role="none">
          <div className="px-6 py-2 rounded-xl bg-slate-600 text-white shadow-lg text-center" role="none">
            <h3 className="text-sm font-black uppercase tracking-widest">Jabatan Lainnya</h3>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-tight">Struktur Tambahan</p>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mt-2" role="none" />
        </div>
        {renderTreeOrCards(treeData, 'other')}
      </div>
    );
  }, [stableTreeDataMap, renderTreeOrCards]);

  if (isTreeLoading) return <TreeSkeleton />;
  if (Object.keys(data).length === 0) return <div className="text-center p-8 text-gray-500">Tidak ada data struktur organisasi.</div>;

  const isTabularDiagram = activeTab && activeCodes && activeCodes.length > 0;

  return (
    <div className="space-y-8 pb-20 min-h-screen" onClick={() => setEditingNode(null)} role="tree">
      {isTabularDiagram ? (
        activeTab === 'PIMPINAN' ? (
          <div className="flex flex-col gap-4 sm:gap-12">
            {currentTreeData1 && renderTreeOrCards(currentTreeData1, 'pimpinan_g1')}
            
            {/* Divider (Desktop Diagram Only) */}
            {!isMobile && currentTreeData1 && currentTreeData2 && (
              <div className="relative py-4" role="none">
                <div className="absolute inset-0 flex items-center" aria-hidden="true" role="none">
                  <div className="w-full border-t-2 border-slate-200 dark:border-slate-800 border-dashed" role="none"></div>
                </div>
                <div className="relative flex justify-center" role="none">
                  <span className="bg-slate-50 dark:bg-slate-950 px-6 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-sm">
                    Bidang Sarana & Operasional
                  </span>
                </div>
              </div>
            )}

            {currentTreeData2 && renderTreeOrCards(currentTreeData2, 'pimpinan_g2')}
          </div>
        ) : currentTreeData ? (
          renderTreeOrCards(currentTreeData, activeTab || 'tab')
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-400 font-bold text-sm italic">Tidak ada bagan struktur untuk kategori ini.</p>
          </div>
        )
      ) : (
        <>
          {renderedGroups}
          {renderedOther}
        </>
      )}

      {/* RENDER THE EDITOR ONLY ONCE (SINGLETON PATTERN) */}
      {editingNode && (
        <LiveNodeEditor 
          node={editingNode.node}
          anchorEl={editingNode.element}
          onSave={async (val) => await handleLiveSave(editingNode.node, val)}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  );
});

StrukturDiagram.displayName = 'StrukturDiagram';
