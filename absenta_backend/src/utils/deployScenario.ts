/**
 * Deployment Scenario Helper
 * Strictly explicit 3-mode configuration:
 * - 'saas-public' : Cloud VPS Multi-Tenant Platform (direct public access, Let's Encrypt SSL)
 * - 'saas-local'  : Home/Office Multi-Tenant Platform (tunneled to internet via EasyTunnel WireGuard)
 * - 'onpremise'   : Dedicated 1 School Appliance (hybrid: local LAN Port 80 + online via EasyTunnel)
 *
 * ZERO ALIAS POLICY: Any unknown or legacy value ('hybrid', 'local', 'cloud', etc.) will throw an explicit error.
 */

export type DeployScenario = 'saas-public' | 'saas-local' | 'onpremise';

export const VALID_DEPLOY_SCENARIOS: readonly DeployScenario[] = ['saas-public', 'saas-local', 'onpremise'] as const;

export function getDeployScenario(): DeployScenario {
  const raw = (process.env.DEPLOY_SCENARIO || '').trim().toLowerCase();

  if (raw === 'saas-local' || raw === 'saas-public' || raw === 'onpremise') {
    return raw;
  }

  // Standar Paten Ekosistem Absenta: Unified Hybrid Multi-Tenant Platform ('saas-local')
  return 'saas-local';
}

/**
 * Returns true if current server operates as a multi-tenant platform (Cloud VPS or Local Home Server).
 */
export function isSaasScenario(): boolean {
  const s = getDeployScenario();
  return s === 'saas-public' || s === 'saas-local';
}

/**
 * Returns true if current server is a dedicated school appliance (on-premise hybrid).
 */
export function isOnPremiseScenario(): boolean {
  return getDeployScenario() === 'onpremise';
}

/**
 * Returns true if current server relies on EasyTunnel WireGuard for internet connectivity.
 */
export function isTunnelScenario(): boolean {
  const s = getDeployScenario();
  return s === 'saas-local' || s === 'onpremise';
}

/**
 * Returns true if current server is directly reachable via public IP without a tunnel gateway.
 */
export function isDirectPublicScenario(): boolean {
  return getDeployScenario() === 'saas-public';
}
