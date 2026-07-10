import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { LeadershipNode, MemberNode, UnassignedNode, GroupNode, CategoryNode } from './NodeDesigns';
import { STRUKTUR_CONFIG } from './StrukturConfig';
import type { TopologyNodeData } from './types';

interface TopologyTreeProps {
  data: TopologyNodeData;
  onAction?: (node: TopologyNodeData, actionType?: string, element?: HTMLElement | null) => void;
  editingId?: string | null;
}

export const TopologyTree = React.memo<TopologyTreeProps>(({ 
  data, 
  onAction,
  editingId
}) => {
  if (data.type === 'ROOT' && data.children) {
    return (
      <div className="w-full overflow-x-auto overflow-y-hidden bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner custom-scrollbar">
        <div className="inline-block min-w-full p-20">
          <div className="relative flex flex-col items-center">
            <div className="flex gap-24 justify-center pt-0">
              {(data.children || []).map((child, idx) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Segmented Horizontal Line */}
                  {data.children!.length > 1 && (
                    <div className={cn(
                      "absolute top-0 h-[2px] bg-slate-300 dark:bg-slate-700",
                      idx === 0 ? "left-1/2 right-0" : 
                      idx === data.children!.length - 1 ? "left-0 right-1/2" : 
                      "left-0 right-0"
                    )}></div>
                  )}
                  {data.children!.length > 1 && (
                    <div className="w-[2px] h-8 bg-slate-300 dark:bg-slate-700 mb-0"></div>
                  )}
                  <TreeNode 
                    node={child} 
                    depth={1} 
                    isLast={idx === data.children!.length - 1} 
                    onAction={onAction}
                    editingId={editingId}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <TreeNode 
        node={data} 
        depth={0} 
        isLast={true} 
        onAction={onAction}
        editingId={editingId}
      />
    </div>
  );
}, (prev, next) => {
  return prev.editingId === next.editingId &&
         prev.data === next.data;
});

interface TreeNodeProps {
  node: TopologyNodeData;
  depth: number;
  isLast: boolean;
  onAction?: (node: TopologyNodeData, actionType?: string, element?: HTMLElement | null) => void;
  editingId?: string | null;
  isVerticalLayout?: boolean;
}

const getNodeStyles = (type: TopologyNodeData['type']) => {
  switch (type) {
    case 'ROOT':
    case 'STRUCT':
    case 'LEADER':
      return STRUKTUR_CONFIG.design.leadership.colors.border;
    case 'GROUP':
      return STRUKTUR_CONFIG.design.group.colors.bg;
    case 'CATEGORY':
      return "bg-transparent border-none shadow-none";
    case 'MEMBER':
    default:
      return `${STRUKTUR_CONFIG.design.member.colors.bg} ${STRUKTUR_CONFIG.design.member.colors.border}`;
  }
};

const TreeNode: React.FC<TreeNodeProps> = React.memo(({ 
  node, 
  depth, 
  isLast, 
  onAction,
  editingId,
  isVerticalLayout 
}) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const isEditing = node.id === editingId;
  const hasChildren = node.children && node.children.length > 0;
  const isUnassigned = node.data?.isUnassigned || node.subLabel === 'Belum diisi' || node.id?.startsWith('unassigned-');
  const isStructuralNode = node.type === 'STRUCT' || node.type === 'ROOT' || node.type === 'GROUP' || node.type === 'LEADER' || node.type === 'CATEGORY';
  const isActionable = (node.type === 'MEMBER' || node.type === 'STRUCT' || isUnassigned) && node.type !== 'CATEGORY';

  const handleToggle = React.useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (isActionable || hasChildren) {
      if (onAction) onAction(node, 'EDIT', nodeRef.current);
    }
  }, [node, isActionable, hasChildren, onAction]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(e);
    }
  }, [handleToggle]);

  // Determine if children should be rendered vertically or horizontally
  const isRoot = node.type === 'ROOT';
  const isTopLeader = node.type === 'STRUCT' && depth === 1; // Kepsek
  
  const shouldBeVertical = 
    !isRoot && !isTopLeader && 
    (node.data?.forceVertical === true || 
     (node.data?.forceVertical !== false && 
      (isVerticalLayout || (node.type === 'GROUP' && depth >= 1) || (node.type === 'STRUCT' && depth >= 2) || (node.type === 'CATEGORY' && depth >= 2))
     )
    );
  const isExpanded = true; 

  const cfg = STRUKTUR_CONFIG.design;
  const connectorColor = "bg-slate-300 dark:bg-slate-700";
  
  return (
    <motion.div 
      layout
      initial={false}
      transition={cfg.animations.spring}
      className={cn("flex flex-col items-center", isEditing ? "z-[500] relative" : "relative")}
      role="none"
    >
      <div className={cn("relative flex flex-col items-center w-full")} role="none">
        <motion.div 
          layout
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          tabIndex={isActionable || hasChildren ? 0 : -1}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={`${node.label} ${node.subLabel ? `- ${node.subLabel}` : ''}`}
          className={cn(
            "relative z-10 flex flex-col transition-all select-none border focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:outline-none", 
            (node.type === 'STRUCT' || node.type === 'ROOT' || node.type === 'GROUP' || node.type === 'CATEGORY') && !isUnassigned ? "rounded-none" : "rounded-xl",
            isStructuralNode ? (node.type === 'CATEGORY' ? "min-h-[70px]" : "min-h-[64px]") : "min-h-[52px]",
            node.type !== 'MEMBER' && !shouldBeVertical ? "min-w-[200px] max-w-[260px]" : "w-full min-w-[200px]",
            getNodeStyles(node.type),
            isUnassigned && cn("border-blue-500 dark:border-blue-400 bg-white dark:bg-slate-900", cfg.shadows.ambient, cfg.animations.pulse),
            (isActionable || hasChildren) ? "cursor-pointer" : "cursor-default opacity-95",
            (isActionable || hasChildren) && "hover:shadow-md active:scale-[0.99]",
            isEditing && cfg.shadows.editing,
            node.type === 'CATEGORY' ? "border-none shadow-none" : ""
          )}
          style={{
            width: node.type === 'MEMBER' ? cfg.member.minWidth : cfg.leadership.minWidth,
            height: node.type === 'CATEGORY' ? 70 : (node.type === 'MEMBER' ? cfg.member.minHeight : cfg.leadership.minHeight),
          }}
          ref={nodeRef}
        >
          {/* Inner Content Wrapper (restores overflow clipping for content only) */}
          <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-0 pointer-events-none">
            {/* This empty div just ensures backgrounds/content are clipped if they bleed */}
          </div>

          {isEditing && (
             <div className={cfg.indicators.editing.wrapper}>
                <div className={cn(cfg.indicators.editing.badge, cfg.animations.bounce)}>
                  📍 Mengedit Jabatan
                </div>
             </div>
          )}

          {/* Remove Member Button - Now OUTSIDE the clipping path */}
          {!isUnassigned && 
           (node.type === 'STRUCT' || node.type === 'MEMBER') && 
           !['KAPROG', 'KABENG', 'TOOLMAN', 'PETUGAS_KELAS', 'PETUGAS_ABSENSI'].includes(node.data?.roleCode) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAction) onAction(node, 'MEMBER_REMOVE', e.currentTarget.parentElement);
              }}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(239,68,68,0.5)] hover:scale-110 active:scale-95 transition-all z-[100] border-2 border-white dark:border-slate-800 group/trash"
              title="Hapus Anggota"
              aria-label={`Hapus ${node.subLabel || node.label} dari jabatan`}
            >
              <Trash2 size={14} strokeWidth={2.5} className="group-hover/trash:animate-pulse" />
            </button>
          )}

          <div className={cn(
            "flex items-center w-full h-full min-h-[inherit] relative z-10 overflow-hidden rounded-[inherit]",
            (node.type === 'STRUCT' || node.type === 'ROOT' || node.type === 'GROUP' || node.type === 'CATEGORY') && !isUnassigned ? "gap-0 px-0 py-0" : (isUnassigned ? "p-0" : "gap-3 px-4 py-2")
          )}>
            <motion.div 
              key={node.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={cfg.animations.fade}
              className="w-full h-full"
            >
              {isUnassigned ? (
                <UnassignedNode node={node} isUnassigned={true} />
              ) : (
                <div className="flex items-center w-full h-full px-0">
                  <div className="flex flex-col flex-grow min-w-0 h-full">
                    {node.type === 'GROUP' || node.type === 'ROOT' ? (
                      <GroupNode node={node} isUnassigned={false} />
                    ) : node.type === 'STRUCT' || node.type === 'LEADER' ? (
                      <LeadershipNode node={node} isUnassigned={false} />
                    ) : node.type === 'CATEGORY' ? (
                      <CategoryNode node={node} isUnassigned={false} />
                    ) : (
                      <MemberNode node={node} isUnassigned={false} isActionable={isActionable} />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Smart Magnetic Connectors */}
        {(hasChildren || (
          ['KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU', 'BKK'].includes(node.data?.roleCode) && 
          node.type === 'CATEGORY'
        )) && isExpanded && (
          <div className="relative w-full flex flex-col items-center">
            {/* Parent vertical stem (The Magnet Stem) */}
            <div className={cn("relative w-[2px] h-12", connectorColor)}>
              {!shouldBeVertical && (
                <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full", connectorColor)} />
              )}
            </div>

            <div 
              className={cn(
                "relative flex w-full",
                shouldBeVertical 
                  ? "flex-col items-center gap-0" 
                  : "flex-row justify-center gap-8 pt-0" // Rapatkan Gap
              )}
              role="group"
            >
              {(node.children || []).map((child, idx) => (
                <div key={child.id} className={cn("relative flex flex-col items-center", shouldBeVertical ? "w-full" : "")}>
                  
                  {/* Horizontal Wings (Bleeding into Gaps to Connect) */}
                  {!shouldBeVertical && (node.children || []).length > 1 && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] flex">
                      <div className={cn(
                        "flex-1", 
                        idx === 0 ? "bg-transparent" : connectorColor,
                        idx !== 0 && "ml-[-16px]" // Sambungkan ke kiri melewati gap
                      )}></div>
                      <div className={cn(
                        "flex-1", 
                        idx === (node.children || []).length - 1 ? "bg-transparent" : connectorColor,
                        idx !== (node.children || []).length - 1 && "mr-[-16px]" // Sambungkan ke kanan melewati gap
                      )}></div>
                    </div>
                  )}

                  {/* Vertical Connection (Continuous line for both modes) */}
                  <div className={cn("w-[2px] bg-slate-300 dark:bg-slate-700", shouldBeVertical ? "h-8" : "h-10 mb-0")}></div>

                  <TreeNode 
                    node={child} 
                    depth={depth + 1} 
                    isLast={idx === (node.children || []).length - 1} 
                    onAction={onAction}
                    editingId={editingId}
                    isVerticalLayout={shouldBeVertical}
                  />
                </div>
              ))}

              {/* Centered Vertical Add Button with Label */}
              {shouldBeVertical && (
                node.data?.roleCode?.includes('WAKIL') || 
                ['KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU', 'BKK', 'BPBK'].includes(node.data?.roleCode)
              ) && !isEditing && (
                <div className="relative flex flex-col w-full items-center pt-4 group">
                  <div className={cn("w-[2px] h-8 mb-0", connectorColor, "opacity-50")}></div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Sinyal kuat: Ini adalah penambahan anggota (MEMBER_ADD)
                      onAction?.({ 
                        ...node, 
                        id: `add-new-${node.id}`,
                        actionType: 'MEMBER_ADD',
                        parentStrukturId: node.data?.realStrukturId 
                      }, 'MEMBER_ADD', e.currentTarget as HTMLElement);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500 cursor-pointer shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                    aria-label={`Tambah anggota baru ke bidang ${node.label}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Plus size={14} strokeWidth={3} />
                    </div>
                    <span className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-tight">
                      Tambah Anggota
                    </span>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}, (prev, next) => {
  return prev.editingId === next.editingId &&
         prev.isVerticalLayout === next.isVerticalLayout &&
         prev.node === next.node;
});

TopologyTree.displayName = 'TopologyTree';
TreeNode.displayName = 'TreeNode';
