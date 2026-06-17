import { requestWithFallback } from "./apiUtils";
import type {
  NotificationLog,
  NotificationStatsResponse,
  NotificationServiceStatusResponse,
} from "../types/notification";

 

export async function getNotificationStats(
  params?: { startDate?: string; endDate?: string },
  options?: { headers?: Record<string, string> }
): Promise<NotificationStatsResponse> {
  const raw: any = await requestWithFallback<any>('get', '/notifications/stats', { params, headers: options?.headers });
  const data = raw?.data ?? {};
  const stats = data?.stats ?? {};
  const recent = Array.isArray(data?.recentNotifications) ? data.recentNotifications : [];
  const period = data?.period ?? { start: undefined, end: undefined };
  return {
    success: raw?.success ?? true,
    message: raw?.message ?? 'OK',
    data: {
      stats,
      recentNotifications: recent,
      period
    }
  };
}

export async function getUserNotifications(
  options?: { headers?: Record<string, string> }
): Promise<NotificationStatsResponse> {
  const raw: any = await requestWithFallback<any>('get', '/notifications/my', { headers: options?.headers });
  const data = raw?.data ?? {};
  // Endpoint /my hanya mengembalikan recentNotifications
  const recent = Array.isArray(data?.recentNotifications) ? data.recentNotifications : [];
  
  return {
    success: raw?.success ?? true,
    message: raw?.message ?? 'OK',
    data: {
      stats: {}, // Dummy stats agar kompatibel dengan tipe
      recentNotifications: recent,
      period: { start: "", end: "" }
    }
  };
}

export async function getNotificationLogs(
  params?: { page?: number; limit?: number; type?: 'EMAIL' | 'WHATSAPP'; status?: 'SENT' | 'FAILED' },
  options?: { headers?: Record<string, string> }
): Promise<{
  success: boolean;
  message: string;
  data: { logs: NotificationLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
}> {
  const raw: any = await requestWithFallback<any>('get', '/notifications/logs', { params, headers: options?.headers });
  const data = raw?.data ?? {};
  const logs = Array.isArray(data?.logs) ? data.logs : [];
  const pag = data?.pagination ?? {};
  return {
    success: raw?.success ?? true,
    message: raw?.message ?? 'OK',
    data: {
      logs,
      pagination: {
        page: Number(pag?.page ?? params?.page ?? 1),
        limit: Number(pag?.limit ?? params?.limit ?? 20),
        total: Number(pag?.total ?? logs.length),
        totalPages: Number(pag?.totalPages ?? (logs.length ? 1 : 0))
      }
    }
  };
}

export async function getNotificationServiceStatus(options?: { headers?: Record<string, string> }): Promise<NotificationServiceStatusResponse> {
  const raw: any = await requestWithFallback<any>('get', '/notifications/status', { headers: options?.headers });
  const data = raw?.data ?? {};
  return {
    success: raw?.success ?? true,
    message: raw?.message ?? 'OK',
    data: {
      email: data?.email ?? { status: 'disconnected', configured: false },
      whatsapp: data?.whatsapp ?? { status: 'disconnected', configured: false }
    }
  };
}

export async function sendTestWhatsApp(payload: { phoneNumber: string; message: string }, options?: { headers?: Record<string, string> }): Promise<{ success: boolean; message: string }> {
  return requestWithFallback('post', '/notifications/test/whatsapp', { data: payload, headers: options?.headers });
}

export async function getSubscriptions(
  params?: { page?: number; limit?: number; search?: string },
  options?: { headers?: Record<string, string> }
): Promise<{
  success: boolean;
  data: any[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  return requestWithFallback('get', '/notifications/push/subscriptions', { params, headers: options?.headers });
}

export async function getUserNotificationPreferences(options?: { headers?: Record<string, string> }): Promise<{
  success: boolean;
  message: string;
  data: {
    enabledTypes: Record<string, boolean>;
    digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY';
    thresholds?: { late?: number; no_tap?: number };
    channels?: { ATTENDANCE?: { in_app?: boolean; email?: boolean; wa?: boolean } };
  };
}> {
  const raw: any = await requestWithFallback<any>('get', '/notifications/preferences', { headers: options?.headers });
  const data = raw?.data ?? {};
  return {
    success: raw?.success ?? true,
    message: raw?.message ?? 'OK',
    data: {
      enabledTypes: data?.enabledTypes ?? { ATTENDANCE: true },
      digestFrequency: data?.digestFrequency ?? 'NONE',
      thresholds: data?.thresholds ?? undefined,
      channels: data?.channels ?? undefined
    }
  };
}

export async function updateUserNotificationPreferences(payload: {
  enabledTypes: Record<string, boolean>;
  digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY';
  thresholds?: { late?: number; no_tap?: number };
  channels?: { ATTENDANCE?: { in_app?: boolean; email?: boolean; wa?: boolean } };
}, options?: { headers?: Record<string, string> }): Promise<{
  success: boolean;
  message: string;
}> {
  return requestWithFallback('put', '/notifications/preferences', { data: payload, headers: options?.headers });
}

export async function sendTrialWelcomeEmail(payload: { email: string; tenantName?: string; setupLink?: string }) {
  return requestWithFallback('post', '/notifications/trial-email/welcome', { data: payload });
}

export async function sendTrialFeatureEmail(payload: { email: string; tenantName?: string; ctaUrl?: string }) {
  return requestWithFallback('post', '/notifications/trial-email/feature', { data: payload });
}

export async function sendTrialCaseStudyEmail(payload: { email: string; tenantName?: string; ctaUrl?: string }) {
  return requestWithFallback('post', '/notifications/trial-email/case-study', { data: payload });
}

export async function sendTrialUpgradeReminderEmail(payload: { email: string; tenantName?: string; daysLeft: number; ctaUrl?: string }) {
  return requestWithFallback('post', '/notifications/trial-email/upgrade-reminder', { data: payload });
}
