import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyActionHub } from '@/api/dashboard.api';
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12 }}
      className="space-y-3 max-w-full pb-16 sm:pb-6"
    >
      {/* ─── Shopee-Grade High-Density Task Hub (Above-the-Fold on Mobile) ─── */}
      <TeacherActionHubWidget
        title="Tugas & Peringatan Saya"
        actions={actionData.actions || []}
        summary={actionData.summary || { total: 0, critical: 0, today: 0, upcoming: 0 }}
        isLoading={isLoading}
        isRefreshing={isFetching}
        onRefresh={handleRefresh}
        onOpenJournal={onOpenJournal}
        onNavigateTab={onNavigateTab}
      />
    </motion.div>
  );
});

StaffActionHubTab.displayName = 'StaffActionHubTab';
