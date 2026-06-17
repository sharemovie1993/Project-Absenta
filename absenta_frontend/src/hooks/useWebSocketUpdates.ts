import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { LogService } from '../utils/LogService';
import type { TenantMetrics, RecentActivity, AttendanceData, BillingData } from '../api/tenant-detail.api';

// Type definitions untuk data yang diterima
interface MetricsData extends TenantMetrics {}
type ActivitiesData = RecentActivity[];
interface LogData {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

interface UpdateCallbacks {
  onMetricsUpdate?: (data: TenantMetrics) => void;
  onActivitiesUpdate?: (data: RecentActivity[]) => void;
  onLogsUpdate?: (data: LogData) => void;
  onAttendanceUpdate?: (data: AttendanceData) => void;
  onBillingUpdate?: (data: BillingData) => void;
  onUserUpdate?: (data: UserUpdatePayload) => void;
}

interface UserUpdatePayload {
  users: any[];
  pagination: any;
}

interface PollingCallbacks {
  loadMetrics?: () => Promise<void>;
  loadActivities?: () => Promise<void>;
  loadLogs?: () => Promise<void>;
  loadAttendance?: () => Promise<void>;
  loadBilling?: () => Promise<void>;
  loadUsers?: () => Promise<void>;
}

interface UseWebSocketUpdatesOptions {
  tenantId: string;
  enabled?: boolean;
  pollingIntervals?: {
    metrics?: number;
    activities?: number;
    logs?: number;
    attendance?: number;
    billing?: number;
    users?: number;
  };
}

type UpdateType = 'metrics' | 'activities' | 'logs' | 'attendance' | 'billing' | 'users';

/**
 * Hook untuk real-time updates menggunakan WebSocket dengan polling fallback
 * Refactored to use SocketContext singleton.
 */
export function useWebSocketUpdates(
  updateCallbacks: UpdateCallbacks,
  pollingCallbacks: PollingCallbacks,
  options: UseWebSocketUpdatesOptions
) {
  const {
    tenantId,
    enabled = (() => {
      const v = (import.meta?.env?.VITE_REALTIME_ENABLED_DEFAULT as string | undefined);
      return typeof v === 'string' ? v !== 'false' : true;
    })(),
  } = options;

  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(enabled);
  const [lastUpdated, setLastUpdated] = useState<Record<string, Date>>({});
  const updateCallbacksRef = useRef<UpdateCallbacks>(updateCallbacks);
  
  useEffect(() => { updateCallbacksRef.current = updateCallbacks; }, [updateCallbacks]);

  // Update timestamp helper function
  const updateTimestamp = useCallback((type: UpdateType) => {
    setLastUpdated(prev => ({
      ...prev,
      [type]: new Date()
    }));
  }, []);

  useEffect(() => {
    if (!isRealTimeEnabled || !isConnected || !tenantId) return;

    LogService.info('[useWebSocketUpdates] Joining tenant room:', tenantId);
    emit('join_tenant', tenantId);

    const handleMetrics = (data: MetricsData) => {
      LogService.debug('Received metrics update:', data);
      updateCallbacksRef.current.onMetricsUpdate?.(data);
      updateTimestamp('metrics');
    };

    const handleActivities = (data: ActivitiesData) => {
      LogService.debug('Received activities update:', data);
      updateCallbacksRef.current.onActivitiesUpdate?.(data);
      updateTimestamp('activities');
    };

    const handleLogs = (data: LogData) => {
      LogService.debug('Received logs update:', data);
      updateCallbacksRef.current.onLogsUpdate?.(data);
      updateTimestamp('logs');
    };

    const handleAttendance = (data: AttendanceData) => {
      LogService.debug('Received attendance update:', data);
      updateCallbacksRef.current.onAttendanceUpdate?.(data);
      updateTimestamp('attendance');
    };

    const handleBilling = (data: BillingData) => {
      LogService.debug('Received billing update:', data);
      updateCallbacksRef.current.onBillingUpdate?.(data);
      updateTimestamp('billing');
    };

    const handleUsers = (data: UserUpdatePayload) => {
      LogService.debug('Received users update:', data);
      updateCallbacksRef.current.onUserUpdate?.(data);
      updateTimestamp('users');
    };

    const handleGenericUpdate = (data: { type: UpdateType; payload: any }) => {
      LogService.debug('Received generic tenant update:', data);
      const { type, payload } = data;
      switch (type) {
        case 'metrics': updateCallbacksRef.current.onMetricsUpdate?.(payload); updateTimestamp('metrics'); break;
        case 'activities': updateCallbacksRef.current.onActivitiesUpdate?.(payload); updateTimestamp('activities'); break;
        case 'logs': updateCallbacksRef.current.onLogsUpdate?.(payload); updateTimestamp('logs'); break;
        case 'attendance': updateCallbacksRef.current.onAttendanceUpdate?.(payload); updateTimestamp('attendance'); break;
        case 'billing': updateCallbacksRef.current.onBillingUpdate?.(payload); updateTimestamp('billing'); break;
        case 'users': updateCallbacksRef.current.onUserUpdate?.(payload); updateTimestamp('users'); break;
      }
    };

    subscribe('tenant_metrics_update', handleMetrics);
    subscribe('tenant_activities_update', handleActivities);
    subscribe('tenant_logs_update', handleLogs);
    subscribe('tenant_attendance_update', handleAttendance);
    subscribe('tenant_billing_update', handleBilling);
    subscribe('tenant_users_update', handleUsers);
    subscribe('tenant_update', handleGenericUpdate);

    return () => {
      unsubscribe('tenant_metrics_update', handleMetrics);
      unsubscribe('tenant_activities_update', handleActivities);
      unsubscribe('tenant_logs_update', handleLogs);
      unsubscribe('tenant_attendance_update', handleAttendance);
      unsubscribe('tenant_billing_update', handleBilling);
      unsubscribe('tenant_users_update', handleUsers);
      unsubscribe('tenant_update', handleGenericUpdate);
    };
  }, [isConnected, tenantId, isRealTimeEnabled, subscribe, unsubscribe, emit, updateTimestamp]);

  const toggleRealTime = useCallback(() => {
    setIsRealTimeEnabled(prev => !prev);
  }, []);

  const forceUpdate = useCallback(async (type?: UpdateType | 'all') => {
    if (isConnected && tenantId) {
      emit('tenant_update_request', { tenantId, type: type || 'all' });
    }
  }, [isConnected, tenantId, emit]);

  return {
    connectionStatus: isConnected ? 'connected' : 'offline',
    isRealTimeEnabled,
    setIsRealTimeEnabled,
    lastUpdated,
    isUsingWebSocket: isConnected,
    reconnectWebSocket: () => {}, // Handled globally by SocketContext
    toggleRealTime,
    forceUpdate
  };
}
