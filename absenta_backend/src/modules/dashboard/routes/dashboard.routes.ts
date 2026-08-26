// @ts-nocheck
import { dashboardOverviewRoutes } from './sub/dashboard-overview.routes';
import { dashboardAttendanceRoutes } from './sub/dashboard-attendance.routes';
import { dashboardAnalyticsRoutes } from './sub/dashboard-analytics.routes';
import { dashboardRoleRoutes } from './sub/dashboard-role.routes';

export async function dashboardRoutes(fastify: any) {
  await dashboardOverviewRoutes(fastify);
  await dashboardAttendanceRoutes(fastify);
  await dashboardAnalyticsRoutes(fastify);
  await dashboardRoleRoutes(fastify);
}
