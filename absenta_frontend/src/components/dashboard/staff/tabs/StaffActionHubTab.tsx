import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  CheckSquare, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  ShieldAlert, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { getMyActionHub } from '@/api/dashboard.api';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { TeacherActionHubWidget } from '../beranda/TeacherActionHubWidget';

interface StaffActionHubTabProps {
  onOpenJournal?: (sesi: any) => void;
  onNavigateTab?: (tabId: string) => void;
}

export const StaffActionHubTab: React.FC<StaffActionHubTabProps> = React.memo(({
  onOpenJournal,
  onNavigateTab,
}) => {
  const queryClient = useQueryClient();

  const { data: actionHubRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['my-action-hub-dashboard'],
    queryFn: () => getMyActionHub().catch(() => ({ 
      success: true, 
      data: { summary: { total: 0, critical: 0, today: 0, upcoming: 0 }, actions: [] } 
    })),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const actionData = actionHubRes?.data || { 
    summary: { total: 0, critical: 0, today: 0, upcoming: 0 }, 
    actions: [] 
  };

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-action-hub-dashboard'] });
    refetch();
  }, [queryClient, refetch]);

  return (
    <motion.div
      key="tab-action-hub-main"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="space-y-4 max-w-full pb-8"
    >
      {/* ─── Hero Command Center Header ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-200">
                <CheckSquare size={18} />
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                Pusat Tugas & Tindakan (Action Hub)
              </h2>
            </div>
            <p className="text-xs text-indigo-200/90 max-w-xl font-normal leading-relaxed">
              Konsolidasi otomatis tugas dan kewajiban lintas divisi (Kurikulum, Rapor, Piket, Kesiswaan, Hubin, Sarpras) yang siap Anda tindak lanjuti secara langsung.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl cursor-pointer"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Segarkan Data</span>
            </Button>
          </div>
        </div>

        {/* Mini Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-2 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-indigo-200 text-[11px] font-semibold">
              <Layers size={13} />
              <span>Total Tugas</span>
            </div>
            <p className="text-xl font-black text-white mt-0.5">
              {actionData.summary?.total ?? 0}
            </p>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-rose-300 text-[11px] font-semibold">
              <ShieldAlert size={13} />
              <span>Mendesak</span>
            </div>
            <p className="text-xl font-black text-rose-300 mt-0.5">
              {actionData.summary?.critical ?? 0}
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
              <Clock size={13} />
              <span>Hari Ini</span>
            </div>
            <p className="text-xl font-black text-amber-300 mt-0.5">
              {actionData.summary?.today ?? 0}
            </p>
          </div>

          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-sky-300 text-[11px] font-semibold">
              <Calendar size={13} />
              <span>Mendatang</span>
            </div>
            <p className="text-xl font-black text-sky-300 mt-0.5">
              {actionData.summary?.upcoming ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Interactive Shopee-Grade Task Widget ─── */}
      <TeacherActionHubWidget
        actions={actionData.actions || []}
        summary={actionData.summary || { total: 0, critical: 0, today: 0, upcoming: 0 }}
        isLoading={isLoading}
        onOpenJournal={onOpenJournal}
        onNavigateTab={onNavigateTab}
      />
    </motion.div>
  );
});

StaffActionHubTab.displayName = 'StaffActionHubTab';
