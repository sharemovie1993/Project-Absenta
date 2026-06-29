import { EasyTunnelService } from '../services/easy-tunnel.service';
import { WireguardManager } from '../../../services/wireguardManager';
import {
  fetchPaymentChannels,
  fetchPackages,
  validateLicenseKey,
  checkLicenseStatus,
  checkInvoiceStatus,
  checkSlugAvailability,
  requestNewLicense
} from '../../../services/licenseClient';
import os from 'os';

export const easyTunnelController = {
  async getTunnels(_request: any, reply: any) {
    try {
      const data = await EasyTunnelService.getAllTunnels();
      return reply.send({ success: true, data });
    } catch (err: any) {
      console.error('[EasyTunnel] getTunnels error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getTunnelById(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await EasyTunnelService.getTunnelById(id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      console.error('[EasyTunnel] getTunnelById error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async setupTunnel(request: any, reply: any) {
    try {
      const { license_key, subdomain_slug, local_port, app_name } = request.body || {};
      if (!license_key || !subdomain_slug || !local_port || !app_name) {
        return reply.status(400).send({
          success: false,
          message: 'license_key, subdomain_slug, local_port, dan app_name wajib diisi.'
        });
      }

      const portNum = parseInt(local_port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return reply.status(400).send({ success: false, message: 'Port lokal tidak valid (1-65535).' });
      }

      const data = await EasyTunnelService.setupTunnel({
        license_key,
        subdomain_slug,
        local_port: portNum,
        app_name
      });

      return reply.send({
        success: true,
        message: `Tunnel untuk "${app_name}" berhasil dikonfigurasi! Klik "Aktifkan" untuk memulai.`,
        data
      });
    } catch (err: any) {
      console.error('[EasyTunnel] setupTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async startTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await EasyTunnelService.startTunnel(id);
      return reply.send({ success: true, message: result.message });
    } catch (err: any) {
      console.error('[EasyTunnel] startTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async stopTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await EasyTunnelService.stopTunnel(id);
      return reply.send({ success: true, message: result.message });
    } catch (err: any) {
      console.error('[EasyTunnel] stopTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async diagnoseTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await EasyTunnelService.getTunnelById(id);
      const result = await WireguardManager.diagnoseTunnel(data.slug);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] diagnoseTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async removeTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await EasyTunnelService.removeTunnel(id);
      return reply.send({ success: true, message: 'Tunnel berhasil dihapus.', data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] removeTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async editTunnel(request: any, reply: any) {
    try {
      const { id } = request.params;
      const { local_port, app_name } = request.body || {};
      const portNum = parseInt(local_port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return reply.status(400).send({ success: false, message: 'Port lokal tidak valid (1-65535).' });
      }

      const result = await EasyTunnelService.editTunnel(id, portNum, app_name);
      return reply.send({ success: true, message: 'Konfigurasi berhasil disimpan.', data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] editTunnel error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async forceRelease(request: any, reply: any) {
    try {
      const { license_key } = request.body || {};
      const result = await EasyTunnelService.forceRelease(license_key);
      return reply.send({ success: true, message: 'Lisensi berhasil di-release.', data: result });
    } catch (err: any) {
      console.error('[EasyTunnel] forceRelease error:', err);
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  // Billing & Order proxy endpoints
  async getPackages(_request: any, reply: any) {
    try {
      const data = await fetchPackages();
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getPaymentChannels(_request: any, reply: any) {
    try {
      const data = await fetchPaymentChannels();
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async checkSlug(request: any, reply: any) {
    try {
      const { slug } = request.params;
      const result = await checkSlugAvailability(slug);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async validateKey(request: any, reply: any) {
    try {
      const { key } = request.params;
      const data = await validateLicenseKey(key);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async newOrder(request: any, reply: any) {
    try {
      const payload = request.body || {};
      const result = await requestNewLicense(payload);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async checkPaymentStatus(request: any, reply: any) {
    try {
      const { key } = request.params;
      const result = await checkLicenseStatus(key);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async checkInvoiceStatus(request: any, reply: any) {
    try {
      const { number } = request.params;
      const result = await checkInvoiceStatus(number);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getSystemInfo(_request: any, reply: any) {
    try {
      const info = {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        wg_installed: WireguardManager.isWireGuardInstalled(),
        tunnel_base_domain: process.env.EASY_TUNNEL_BASE_DOMAIN || 'tefatjkt.net'
      };
      return reply.send({ success: true, data: info });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async installWireguard(_request: any, reply: any) {
    try {
      const result = await WireguardManager.installWireGuard();
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  }
};
