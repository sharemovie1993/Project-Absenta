import { useState, useCallback } from 'react';
import { LogService } from '../utils/LogService';

interface RealTimeUpdateConfig {
  enabled: boolean;
  interval: number;
  onUpdate?: () => void;
}

interface UseRealTimeUpdatesOptions {
  metrics?: RealTimeUpdateConfig;
  activities?: RealTimeUpdateConfig;
  logs?: RealTimeUpdateConfig;
}

/**
 * Custom hook untuk mengelola real-time updates di TenantDetailPage
 * @param callbacks - Object berisi callback functions untuk setiap jenis data
 * @param options - Konfigurasi untuk setiap jenis polling
 */
export function useRealTimeUpdates(
  callbacks: {
    loadMetrics?: () => Promise<void>;
    loadActivities?: () => Promise<void>;
    loadLogs?: () => Promise<void>;
  },
  options: UseRealTimeUpdatesOptions = {}
) {
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Record<string, Date>>({});

  // Default configurations
  const defaultConfig = {
    enabled: isRealTimeEnabled,
    interval: 30000, // 30 detik
  };

  const metricsConfig = { ...defaultConfig, ...options.metrics };
  const activitiesConfig = { ...defaultConfig, ...options.activities };
  const logsConfig = { ...defaultConfig, ...options.logs };

  // Wrapper functions untuk update timestamp
  const wrappedLoadMetrics = useCallback(async () => {
    if (callbacks.loadMetrics) {
      try {
        await callbacks.loadMetrics();
        setLastUpdated(prev => ({ ...prev, metrics: new Date() }));
        metricsConfig.onUpdate?.();
      } catch (error) {
        LogService.error('Error updating metrics:', error);
      }
    }
  }, [callbacks.loadMetrics, metricsConfig.onUpdate]);

  const wrappedLoadActivities = useCallback(async () => {
    if (callbacks.loadActivities) {
      try {
        await callbacks.loadActivities();
        setLastUpdated(prev => ({ ...prev, activities: new Date() }));
        activitiesConfig.onUpdate?.();
      } catch (error) {
        LogService.error('Error updating activities:', error);
      }
    }
  }, [callbacks.loadActivities, activitiesConfig.onUpdate]);

  const wrappedLoadLogs = useCallback(async () => {
    if (callbacks.loadLogs) {
      try {
        await callbacks.loadLogs();
        setLastUpdated(prev => ({ ...prev, logs: new Date() }));
        logsConfig.onUpdate?.();
      } catch (error) {
        LogService.error('Error updating logs:', error);
      }
    }
  }, [callbacks.loadLogs, logsConfig.onUpdate]);

  const toggleRealTime = useCallback(() => {
    setIsRealTimeEnabled(prev => !prev);
  }, []);

  const forceUpdate = useCallback(async (type?: 'metrics' | 'activities' | 'logs') => {
    if (!type) {
      // Update semua
      await Promise.all([
        wrappedLoadMetrics(),
        wrappedLoadActivities(),
        wrappedLoadLogs()
      ]);
    } else {
      switch (type) {
        case 'metrics':
          await wrappedLoadMetrics();
          break;
        case 'activities':
          await wrappedLoadActivities();
          break;
        case 'logs':
          await wrappedLoadLogs();
          break;
      }
    }
  }, [wrappedLoadMetrics, wrappedLoadActivities, wrappedLoadLogs]);

  return {
    isRealTimeEnabled,
    toggleRealTime,
    forceUpdate,
    lastUpdated
  };
}
