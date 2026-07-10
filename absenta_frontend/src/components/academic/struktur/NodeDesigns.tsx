/**
 * NodeDesigns.tsx
 * Reusable visual components for different types of organizational nodes.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { STRUKTUR_CONFIG, shortenPosition } from './StrukturConfig';

interface NodeDesignProps {
  node: any;
  isUnassigned: boolean;
  isActionable?: boolean;
}

/**
 * LeadershipNode: The professional two-tone 50/50 sharp square design.
 */
export const LeadershipNode = React.memo<NodeDesignProps>(({ node }) => {
  const cfg = STRUKTUR_CONFIG.design.leadership;
  const isStaff = node.label.toUpperCase().startsWith('STAF');
  const role = node.data?.roleCode;

  let headerBg = "bg-indigo-700 dark:bg-indigo-600";
  if (isStaff) {
    headerBg = "bg-slate-500 dark:bg-slate-600";
  } else if (role === 'KEPALA_SEKOLAH') {
    headerBg = "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500";
  } else if (role === 'KURIKULUM') {
    headerBg = "bg-emerald-600 dark:bg-emerald-500";
  } else if (role === 'KESISWAAN') {
    headerBg = "bg-amber-600 dark:bg-amber-500";
  } else if (role === 'HUBIN') {
    headerBg = "bg-cyan-600 dark:bg-cyan-500";
  } else if (role === 'SARPRAS') {
    headerBg = "bg-indigo-600 dark:bg-indigo-500";
  } else if (role === 'TU') {
    headerBg = "bg-blue-600 dark:bg-blue-500";
  } else if (role === 'BKK') {
    headerBg = "bg-violet-600 dark:bg-violet-500";
  }

  return (
    <div className={cn("flex flex-col w-full h-full", cfg.minHeight)}>
      {/* Position Header */}
      <div className={cn(headerBg, "px-4 flex-1 flex items-center justify-center")}>
        <span className={cn(cfg.colors.textTop, "text-[10px] font-black uppercase tracking-widest block whitespace-nowrap truncate text-center")}>
          {node.label}
        </span>
      </div>
      {/* Occupant Name */}
      <div className={cn(cfg.colors.bottom, cfg.colors.border, "px-4 flex-1 border-t w-full flex items-center justify-center")}>
        <span className={cn(cfg.colors.textBottom, "text-[11px] font-bold truncate block text-center")}>
          {node.subLabel}
        </span>
      </div>
    </div>
  );
});

/**
 * CategoryNode: Solid 1-row header design for Bidang/Category labels.
 */
export const CategoryNode = React.memo<NodeDesignProps>(({ node }) => {
  const cfg = STRUKTUR_CONFIG.design.leadership;
  
  // Custom theme colors for different categories
  let categoryColor = "bg-indigo-700 dark:bg-indigo-600";
  if (node.id?.includes('mgmt-group-1') || node.id?.includes('mgmt-group-2')) {
    categoryColor = "bg-slate-700 dark:bg-slate-800 border border-slate-600/80 rounded-xl shadow-sm";
  } else if (node.data?.roleCode === 'KURIKULUM') {
    categoryColor = "bg-emerald-600 dark:bg-emerald-500";
  } else if (node.data?.roleCode === 'KESISWAAN') {
    categoryColor = "bg-amber-600 dark:bg-amber-500";
  } else if (node.data?.roleCode === 'HUBIN') {
    categoryColor = "bg-cyan-600 dark:bg-cyan-500";
  } else if (node.data?.roleCode === 'SARPRAS') {
    categoryColor = "bg-indigo-600 dark:bg-indigo-500";
  } else if (node.data?.roleCode === 'TU') {
    categoryColor = "bg-blue-600 dark:bg-blue-500";
  } else if (node.data?.roleCode === 'BKK') {
    categoryColor = "bg-violet-600 dark:bg-violet-500";
  }

  return (
    <div className={cn(categoryColor, "w-full h-[70px] flex items-center justify-center px-6")}>
      <span className={cn(cfg.colors.textTop, "text-[10px] font-black uppercase tracking-widest block text-center leading-normal")}>
        {node.label}
      </span>
    </div>
  );
});

/**
 * MemberNode: The clean, rounded layout for staff and students.
 */
export const MemberNode = React.memo<NodeDesignProps>(({ node, isActionable }) => {
  const cfg = STRUKTUR_CONFIG.design.member;
  return (
    <div className="flex flex-col w-full items-start pl-1">
      <div className="flex items-center gap-2 w-full justify-start">
        {node.data?.acronym && (
          <div className="text-[10px] px-2 py-0.5 rounded font-black uppercase bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex-shrink-0">
            {node.data.acronym}
          </div>
        )}
        <span className={cn(cfg.colors.textPrimary, "text-[11px] font-bold truncate transition-colors")}>
          {node.label}
        </span>
      </div>
      
      {node.subLabel && node.subLabel !== 'GLOBAL' && !node.label.includes(node.subLabel.replace('TK. ', '')) && (
        <span className={cn(cfg.colors.textSecondary, "text-[10px] truncate leading-tight transition-colors font-medium mt-0.5")}>
          {node.subLabel}
        </span>
      )}
    </div>
  );
});

/**
 * UnassignedNode: Placeholder for empty positions.
 */
export const UnassignedNode = React.memo<NodeDesignProps>(({ node }) => {
  const cfg = STRUKTUR_CONFIG.design.leadership;
  const tokens = STRUKTUR_CONFIG.design;
  const isStaff = node.label.toUpperCase().startsWith('STAF');
  const role = node.data?.roleCode;

  let headerBg = "bg-indigo-700 dark:bg-indigo-600";
  if (isStaff) {
    headerBg = "bg-slate-500 dark:bg-slate-600";
  } else if (role === 'KEPALA_SEKOLAH') {
    headerBg = "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500";
  } else if (role === 'KURIKULUM') {
    headerBg = "bg-emerald-600 dark:bg-emerald-500";
  } else if (role === 'KESISWAAN') {
    headerBg = "bg-amber-600 dark:bg-amber-500";
  } else if (role === 'HUBIN') {
    headerBg = "bg-cyan-600 dark:bg-cyan-500";
  } else if (role === 'SARPRAS') {
    headerBg = "bg-indigo-600 dark:bg-indigo-500";
  } else if (role === 'TU') {
    headerBg = "bg-blue-600 dark:bg-blue-500";
  } else if (role === 'BKK') {
    headerBg = "bg-violet-600 dark:bg-violet-500";
  }
  
  return (
    <div className={cn("flex flex-col w-full h-full", cfg.minHeight)}>
      {/* Position Header - Themed based on hierarchy */}
      <div className={cn(headerBg, "px-4 flex-1 flex items-center justify-center")}>
        <span className={cn(cfg.colors.textTop, "text-[10px] font-black uppercase tracking-widest block whitespace-nowrap truncate text-center")}>
          {node.label}
        </span>
      </div>
      
      {/* Occupant Area - White with RED alert text */}
      <div className={cn(cfg.colors.bottom, "px-4 flex-1 border-t border-blue-100 dark:border-slate-700 w-full flex items-center justify-center bg-white dark:bg-slate-900")}>
        <div className="flex items-center gap-2">
          <span className={cn(tokens.unassigned.colors.text, "text-[11px] font-black uppercase tracking-tighter", tokens.animations.pulse)}>
            Belum Diisi
          </span>
        </div>
      </div>
    </div>
  );
});

/**
 * GroupNode: High-contrast design for ROOT and GROUP headers.
 */
export const GroupNode = React.memo<NodeDesignProps>(({ node }) => {
  const cfg = STRUKTUR_CONFIG.design.group;
  return (
    <div className={cn("flex flex-col w-full h-full items-center justify-center p-4", cfg.colors.bg)}>
      <span className={cn(cfg.colors.text, "text-[12px] font-black uppercase tracking-[0.2em] text-center drop-shadow-sm")}>
        {node.label}
      </span>
      {node.subLabel && (
        <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">
          {node.subLabel}
        </span>
      )}
    </div>
  );
});

LeadershipNode.displayName = 'LeadershipNode';
CategoryNode.displayName = 'CategoryNode';
MemberNode.displayName = 'MemberNode';
UnassignedNode.displayName = 'UnassignedNode';
GroupNode.displayName = 'GroupNode';
