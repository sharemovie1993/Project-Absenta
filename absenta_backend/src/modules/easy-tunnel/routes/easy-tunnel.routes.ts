import { requireCapability } from '../../../middlewares/requireCapability';
import { easyTunnelController } from '../controllers/easy-tunnel.controller';

export async function easyTunnelRoutes(fastify: any) {
  // Semua endpoint ini diamankan dengan hak akses pembaruan konfigurasi sistem
  const opts = {
    preHandler: [requireCapability('core.system.config.update')]
  };

  // Tunnels CRUD
  fastify.get('/tunnels', opts, easyTunnelController.getTunnels.bind(easyTunnelController));
  fastify.get('/tunnels/:id', opts, easyTunnelController.getTunnelById.bind(easyTunnelController));
  fastify.post('/tunnels/setup', opts, easyTunnelController.setupTunnel.bind(easyTunnelController));
  fastify.post('/tunnels/:id/start', opts, easyTunnelController.startTunnel.bind(easyTunnelController));
  fastify.post('/tunnels/:id/stop', opts, easyTunnelController.stopTunnel.bind(easyTunnelController));
  fastify.get('/tunnels/:id/diagnose', opts, easyTunnelController.diagnoseTunnel.bind(easyTunnelController));
  fastify.get('/tunnels/:id/telemetry', opts, easyTunnelController.getTunnelTelemetry.bind(easyTunnelController));
  fastify.post('/tunnels/:id/edit', opts, easyTunnelController.editTunnel.bind(easyTunnelController));
  fastify.delete('/tunnels/:id', opts, easyTunnelController.removeTunnel.bind(easyTunnelController));
  fastify.post('/tunnels/force-release', opts, easyTunnelController.forceRelease.bind(easyTunnelController));

  // Billing & Order Proxy
  fastify.get('/order/packages', opts, easyTunnelController.getPackages.bind(easyTunnelController));
  fastify.get('/order/payment-channels', opts, easyTunnelController.getPaymentChannels.bind(easyTunnelController));
  fastify.get('/order/check-slug/:slug', opts, easyTunnelController.checkSlug.bind(easyTunnelController));
  fastify.get('/order/validate-key/:key', opts, easyTunnelController.validateKey.bind(easyTunnelController));
  fastify.post('/order/new', opts, easyTunnelController.newOrder.bind(easyTunnelController));
  fastify.get('/order/payment-status/:key', opts, easyTunnelController.checkPaymentStatus.bind(easyTunnelController));
  fastify.get('/order/invoice-status/:number', opts, easyTunnelController.checkInvoiceStatus.bind(easyTunnelController));
  fastify.get('/order/licenses/:slug', opts, easyTunnelController.getMyLicenses.bind(easyTunnelController));

  // System & Installation Info
  fastify.get('/system/info', opts, easyTunnelController.getSystemInfo.bind(easyTunnelController));
  fastify.post('/system/install-wireguard', opts, easyTunnelController.installWireguard.bind(easyTunnelController));

  // Custom Domain
  fastify.get('/custom-domain/status', opts, easyTunnelController.getCustomDomainStatus.bind(easyTunnelController));
  fastify.post('/custom-domain', opts, easyTunnelController.setCustomDomain.bind(easyTunnelController));
  fastify.delete('/custom-domain', opts, easyTunnelController.removeCustomDomain.bind(easyTunnelController));
}

