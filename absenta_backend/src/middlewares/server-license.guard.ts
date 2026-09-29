import { isOnPremiseScenario } from '@/utils/deployScenario';
import { LicenseService } from '@/infra/license/license.service';

/**
 * Server License Guard for On-Premise School Appliance.
 *
 * POLICY:
 * - If DEPLOY_SCENARIO is 'saas-public' or 'saas-local', this guard is completely bypassed.
 * - If DEPLOY_SCENARIO is 'onpremise':
 *   - Checks whether LicenseService.isLicenseValid() is true.
 *   - If valid, allow request to proceed.
 *   - If expired or offline > 7 days:
 *     - GET requests are ALWAYS allowed (Graceful Read-Only: reporting, printing, viewing).
 *     - Whitelisted routes (authentication, license input/sync, network diagnostics) are ALWAYS allowed.
 *     - Mutative operations (POST, PUT, PATCH, DELETE) are rejected with HTTP 402 Payment Required.
 */

const WHITELISTED_PATHS = [
  '/api/system/license',
  '/api/license',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/refresh',
  '/api/system/config',
  '/api/system/network',
  '/api/easy-tunnel',
  '/auth/login',
  '/auth/logout'
];

export async function serverLicenseGuard(request: any, reply: any) {
  // 1. Only enforce on onpremise deployments
  if (!isOnPremiseScenario()) {
    return;
  }

  // 1b. In development mode, bypass unless LICENSE_FORCE_ENFORCE is explicitly true
  if (process.env.NODE_ENV !== 'production' && process.env.LICENSE_FORCE_ENFORCE !== 'true') {
    return;
  }

  // 2. Read-only requests (GET, HEAD, OPTIONS) are always allowed
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }

  // 3. Whitelisted endpoints (login, license activation, network setup) are always allowed
  const urlPath = request.url.split('?')[0].toLowerCase();
  const isWhitelisted = WHITELISTED_PATHS.some(allowed => urlPath.startsWith(allowed));
  if (isWhitelisted) {
    return;
  }

  // 4. Verify server license validity
  const isValid = LicenseService.isLicenseValid();
  if (!isValid) {
    return reply.status(402).send({
      success: false,
      code: 'SERVER_LICENSE_EXPIRED',
      message: 'Masa aktif lisensi server on-premise telah berakhir atau server offline melebihi 7 hari. Sistem berada dalam mode Read-Only. Pembuatan dan perubahan data baru dibatasi hingga lisensi diperbarui.'
    });
  }
}
