import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  ShieldCheck, 
  Users, 
  User, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  AlertCircle, 
  Building2, 
  Briefcase, 
  HeartHandshake, 
  BookOpen,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopologyNodeData } from './types';

interface StrukturMobileCardTreeProps {
  data: TopologyNodeData | TopologyNodeData[];
  onAction?: (node: TopologyNodeData, actionType?: string, element?: HTMLElement | null) => void;
  editingId?: string | null;
}

const getRoleIcon = (roleCode?: string, type?: string) => {
  if (roleCode === 'KEPALA_SEKOLAH') return Crown;
  if (roleCode === 'KURIKULUM') return BookOpen;
  if (roleCode === 'KESISWAAN') return Users;
  if (roleCode === 'HUBIN') return Briefcase;
  if (roleCode === 'SARPRAS') return Building2;
  if (roleCode === 'BPBK') return HeartHandshake;
  if (roleCode === 'WALIKELAS') return UserCheck;
  if (type === 'ROOT' || type === 'LEADER') return Crown;
  return ShieldCheck;
};

const getRoleColor = (roleCode?: string, type?: string) => {
  if (roleCode === 'KEPALA_SEKOLAH' || type === 'ROOT') return 'from-indigo-600 to-purple-600 text-white border-indigo-400';
  if (roleCode === 'KURIKULUM') return 'from-sky-500 to-blue-600 text-white border-sky-400';
  if (roleCode === 'KESISWAAN') return 'from-amber-500 to-orange-600 text-white border-amber-400';
  if (roleCode === 'HUBIN') return 'from-purple-500 to-indigo-600 text-white border-purple-400';
  if (roleCode === 'SARPRAS') return 'from-emerald-500 to-teal-600 text-white border-emerald-400';
  if (roleCode === 'BPBK') return 'from-rose-500 to-pink-600 text-white border-rose-400';
  if (roleCode === 'WALIKELAS') return 'from-blue-500 to-indigo-600 text-white border-blue-400';
  return 'from-slate-700 to-slate-800 text-white border-slate-600';
};

interface MobileCardNodeProps {
  node: TopologyNodeData;
  depth?: number;
  onAction?: (node: TopologyNodeData, actionType?: string, element?: HTMLElement | null) => void;
  editingId?: string | null;
}

const MobileCardNode: React.FC<MobileCardNodeProps> = React.memo(({ 
  node, 
  depth = 0, 
  onAction,
  editingId 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const roleCode = node.data?.roleCode;
  const isUnassigned = Boolean(
    node.type !== 'MEMBER' && (
      node.data?.isUnassigned || 
      !node.subLabel || 
      node.subLabel === '—' || 
      node.subLabel === 'Belum diisi' || 
      node.subLabel === 'Belum Ditugaskan' ||
      node.id?.startsWith('unassigned-')
    )
  );
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isCategory = Boolean(
    node.type === 'CATEGORY' || 
    node.type === 'GROUP' || 
    (node.type === 'ROOT' && roleCode !== 'KEPALA_SEKOLAH') || 
    node.id?.includes('ROOT') || 
    node.id?.includes('mgmt-group') ||
    node.id?.includes('PIMPINAN_GRP2') ||
    node.label?.toUpperCase().includes('MANAJEMEN')
  );
  const isRoot = !isCategory && (node.type === 'ROOT' || node.type === 'LEADER' || roleCode === 'KEPALA_SEKOLAH');

  const RoleIcon = getRoleIcon(roleCode, node.type);
  const roleGradient = getRoleColor(roleCode, node.type);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCategory && onAction) {
      onAction(node, 'EDIT', cardRef.current);
    }
  };

  const handleAddMember = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction({
        ...node,
        id: `add-new-${node.id}`,
        actionType: 'MEMBER_ADD',
        parentStrukturId: node.data?.realStrukturId || node.id
      }, 'MEMBER_ADD', cardRef.current);
    }
  };

  const handleDeleteMember = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction(node, 'MEMBER_REMOVE', cardRef.current);
    }
  };

  // Skip rendering purely structural wrapper if it has no label
  if (node.type === 'ROOT' && !node.label && hasChildren) {
    return (
      <div className="space-y-3 w-full">
        {node.children!.map(child => (
          <MobileCardNode 
            key={child.id} 
            node={child} 
            depth={depth} 
            onAction={onAction}
            editingId={editingId}
          />
        ))}
      </div>
    );
  }

  // ── PURE CATEGORY / BIDANG BANNER (Fokus ke Label Divisi tanpa tombol + di header) ──
  if (isCategory) {
    const isDirectUnit = Boolean(
      node.type === 'CATEGORY' || 
      node.id?.startsWith('mgmt-group-') || 
      node.data?.realStrukturId
    );

    return (
      <div className="w-full mt-4 first:mt-0">
        <div 
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          className={cn(
            "px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs select-none",
            "bg-gradient-to-r from-slate-100/90 to-slate-50 dark:from-slate-800/90 dark:to-slate-800/50 border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
              <RoleIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate">
              {node.label}
            </span>
          </div>

          {hasChildren && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                {node.children!.length} Tim
              </span>
              <div className="text-slate-400">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          )}
        </div>

        {/* Render Subordinate Children */}
        {hasChildren && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2.5 w-full mt-2.5"
              >
                {node.children!.map(child => (
                  <MobileCardNode 
                    key={child.id} 
                    node={child} 
                    depth={depth + 1} 
                    onAction={onAction}
                    editingId={editingId}
                  />
                ))}

                {/* Tombol Tambah Anggota / Staf khusus di bawah daftar personil bidang */}
                {isDirectUnit && (
                  <div className="pl-3.5 sm:pl-5 ml-2.5 sm:ml-4 pt-1">
                    <button
                      onClick={handleAddMember}
                      className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-600 bg-indigo-50/40 hover:bg-indigo-100/60 dark:bg-slate-800/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-tight transition-all active:scale-98 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Tambah Anggota {node.label}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  // Identifikasi apakah ini adalah kartu Koordinator / Posisi Utama (bukan staf bawahan)
  const isCoordinatorCard = Boolean(
    node.data?.realStrukturId && 
    roleCode !== 'KEPALA_SEKOLAH' && 
    !['TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'].includes(roleCode || '') &&
    !node.data?.kelas_id && 
    node.type !== 'MEMBER' &&
    !node.id?.startsWith('staff-') &&
    !node.id?.startsWith('member-') &&
    (
      ['BPBK', 'PEMBINA_ESKUL', 'GERBANG', 'TOOLMAN', 'KABENG', 'KOPERASI', 'TU_KEPALA', 'GURU'].some(code => String(roleCode || '').includes(code)) ||
      Boolean(node.data?.isCoordinator)
    )
  );

  return (
    <div className={cn("w-full relative flex flex-col", depth > 0 && "pl-3.5 sm:pl-5 border-l-2 border-indigo-100 dark:border-slate-800 ml-2.5 sm:ml-4 mt-2.5")}>
      {/* Node Card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl border transition-all shadow-sm bg-white dark:bg-slate-900 overflow-hidden",
          isUnassigned 
            ? "border-amber-300 dark:border-amber-900/70 bg-amber-50/40 dark:bg-amber-950/20" 
            : isRoot
            ? "border-indigo-200 dark:border-indigo-800 shadow-md ring-1 ring-indigo-500/20"
            : "border-slate-200 dark:border-slate-800",
          node.id === editingId && "ring-2 ring-indigo-500 border-transparent shadow-lg"
        )}
      >
        {/* Header Jabatan / Role Badge */}
        <div className={cn(
          "px-3.5 py-2 flex items-center justify-between gap-2 border-b",
          isRoot 
            ? `bg-gradient-to-r ${roleGradient} border-transparent` 
            : "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
              isRoot ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
            )}>
              <RoleIcon className="w-3.5 h-3.5" />
            </div>
            <span className={cn(
              "text-xs font-black truncate uppercase tracking-tight",
              isRoot ? "text-white" : "text-slate-800 dark:text-slate-200"
            )}>
              {node.label || 'Jabatan'}
            </span>
          </div>

          {/* Expand / Collapse for branches */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={cn(
                "p-1 rounded-md transition-colors flex items-center gap-1 text-[10px] font-bold",
                isRoot 
                  ? "bg-white/20 hover:bg-white/30 text-white" 
                  : "bg-slate-200/60 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
              )}
            >
              <span>{node.children!.length} Tim</span>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Content Body: Personil Information */}
        <div className="p-3.5 flex items-center justify-between gap-3">
          {/* Avatar & Identitas Guru */}
          <div 
            onClick={handleCardClick}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            {/* Avatar Thumbnail */}
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs border transition-transform group-hover:scale-105",
              isUnassigned 
                ? "bg-amber-100 dark:bg-amber-900/50 border-amber-300 text-amber-600 dark:text-amber-400" 
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            )}>
              {isUnassigned ? (
                <Plus className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <User className="w-5 h-5 stroke-[2]" />
              )}
            </div>

            {/* Nama & NIP / Role Info */}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "text-sm font-extrabold truncate leading-tight transition-colors",
                isUnassigned 
                  ? "text-amber-800 dark:text-amber-400" 
                  : "text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
              )}>
                {isUnassigned ? 'Belum Ditugaskan' : node.subLabel}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                {isUnassigned ? 'Ketuk untuk memilih guru' : (node.data?.details || 'Personil Terdaftar')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isUnassigned ? (
              <button
                onClick={handleCardClick}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Tugaskan</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleCardClick}
                  title="Ganti Personil"
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all active:scale-90"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {node.data?.realMemberId && (
                  <button
                    onClick={handleDeleteMember}
                    title="Kosongkan Jabatan"
                    className="p-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-xl transition-all active:scale-90"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Render Subordinate Children or Multi-member Add Action */}
      {(hasChildren || isCoordinatorCard) && (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2.5 w-full mt-2.5"
            >
              {hasChildren && node.children!.map(child => (
                <MobileCardNode 
                  key={child.id} 
                  node={child} 
                  depth={depth + 1} 
                  onAction={onAction}
                  editingId={editingId}
                />
              ))}

              {/* Tombol Tambah Anggota TEPAT 1 KALI di bawah Koordinator / Posisi Utama */}
              {isCoordinatorCard && (
                <div className="pl-3.5 sm:pl-5 ml-2.5 sm:ml-4 pt-1">
                  <button
                    onClick={handleAddMember}
                    className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-600 bg-indigo-50/40 hover:bg-indigo-100/60 dark:bg-slate-800/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-tight transition-all active:scale-98 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Tambah Staf / Anggota {node.label.replace(/^KOORDINATOR\s+/i, '')}</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.editingId === next.editingId &&
    prev.depth === next.depth &&
    prev.node === next.node
  );
});

export const StrukturMobileCardTree: React.FC<StrukturMobileCardTreeProps> = React.memo(({ 
  data, 
  onAction,
  editingId 
}) => {
  const nodes = useMemo(() => Array.isArray(data) ? data : [data], [data]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-400 font-bold">Tidak ada struktur untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full pb-10">
      {nodes.map(node => (
        <MobileCardNode 
          key={node.id} 
          node={node} 
          depth={0} 
          onAction={onAction}
          editingId={editingId}
        />
      ))}
    </div>
  );
});
