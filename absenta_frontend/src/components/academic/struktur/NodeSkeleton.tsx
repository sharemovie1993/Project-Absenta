import React from 'react';
import { cn } from '@/lib/utils';

export const NodeSkeleton: React.FC<{ type?: 'leadership' | 'member' | 'group' }> = ({ type = 'member' }) => {
  if (type === 'group') {
    return (
      <div className="flex flex-col items-center mb-6 animate-pulse">
        <div className="w-48 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mt-2" />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative flex flex-col transition-all animate-pulse border border-slate-100 dark:border-slate-800",
        type === 'leadership' ? "rounded-none min-h-[64px] w-[220px]" : "rounded-xl min-h-[52px] w-[200px]",
        "bg-white dark:bg-slate-900/50"
      )}
    >
      <div className="flex items-center w-full h-full p-3 gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-2 w-24 bg-slate-100 dark:bg-slate-800/50 rounded" />
        </div>
      </div>
    </div>
  );
};

export const TreeSkeleton: React.FC = () => {
  return (
    <div className="space-y-12 pb-20 min-h-screen">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-8 flex flex-col items-center">
          <NodeSkeleton type="group" />
          <div className="flex gap-8">
            <NodeSkeleton type="leadership" />
            <NodeSkeleton type="leadership" />
          </div>
          <div className="flex gap-4">
            <NodeSkeleton type="member" />
            <NodeSkeleton type="member" />
            <NodeSkeleton type="member" />
            <NodeSkeleton type="member" />
          </div>
        </div>
      ))}
    </div>
  );
};
