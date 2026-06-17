/**
 * Index file untuk modul tenant detail
 * Mengekspor semua komponen utama modul
 */

// Controllers
export { TenantDetailController } from './controllers/tenant-detail.controller';

// Services
export { TenantDetailService } from './services/tenant-detail.service';

// Routes
export { default as tenantDetailRoutes } from './routes/tenant-detail.routes';

// Types
export * from './types/tenant-detail.types';