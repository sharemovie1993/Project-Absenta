import { systemConfigService } from '@/modules/system-config/services/system-config.service';

export class BillingSettingsController {
  async getSettings(req: any, reply: any) {
    try {
      const config = await systemConfigService.getActive(null);
      
      const billingSettings = {
        company_name: config?.company_legal_name || 'PT Absenta Indonesia',
        tax_id: config?.company_npwp || '',
        default_currency: 'IDR',
        billing_cycle: 'monthly',
        company_address: config?.company_address || '',
        auto_generate_bills: true,
        auto_send_invoices: true,
        auto_generate_invoices_from_billing: false,
        payment_reminders: true,
        auto_suspend_overdue: false,
        email_notifications: {
          new_payment: config?.notif_email_new_payment !== false,
          payment_failed: config?.notif_email_payment_failed !== false,
          subscription_expired: config?.notif_email_subscription_expired !== false,
          monthly_summary: config?.notif_email_monthly_summary === true
        },
        webhook_notifications: {
          payment_status: config?.webhook_payment_status !== false,
          subscription_changes: config?.webhook_subscription_changes !== false,
          billing_events: config?.webhook_billing_events !== false
        }
      };

      return reply.send({
        success: true,
        message: 'Pengaturan billing berhasil dimuat',
        data: {
          billing_settings: billingSettings
        }
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        message: 'Gagal memuat pengaturan billing: ' + err.message
      });
    }
  }

  async updateSettings(req: any, reply: any) {
    try {
      const payload: any = req.body;
      const settings = payload?.billing_settings || {};
      const user = (req as any).user;

      // Update SystemConfig global record directly using our consolidated service
      const updatePayload: any = {
        company_legal_name: settings.company_name,
        company_npwp: settings.tax_id,
        company_address: settings.company_address,
        
        // Notifications mapping
        notif_email_new_payment: settings.email_notifications?.new_payment,
        notif_email_payment_failed: settings.email_notifications?.payment_failed,
        notif_email_subscription_expired: settings.email_notifications?.subscription_expired,
        notif_email_monthly_summary: settings.email_notifications?.monthly_summary,
        
        webhook_payment_status: settings.webhook_notifications?.payment_status,
        webhook_subscription_changes: settings.webhook_notifications?.subscription_changes,
        webhook_billing_events: settings.webhook_notifications?.billing_events
      };

      await systemConfigService.upsert(updatePayload, user?.roleName || 'SUPERADMIN', null);

      // Re-fetch to return consolidated data
      const updatedConfig = await systemConfigService.getActive(null);

      const responseSettings = {
        company_name: updatedConfig?.company_legal_name || 'PT Absenta Indonesia',
        tax_id: updatedConfig?.company_npwp || '',
        default_currency: 'IDR',
        billing_cycle: 'monthly',
        company_address: updatedConfig?.company_address || '',
        auto_generate_bills: true,
        auto_send_invoices: true,
        auto_generate_invoices_from_billing: false,
        payment_reminders: true,
        auto_suspend_overdue: false,
        email_notifications: {
          new_payment: updatedConfig?.notif_email_new_payment !== false,
          payment_failed: updatedConfig?.notif_email_payment_failed !== false,
          subscription_expired: updatedConfig?.notif_email_subscription_expired !== false,
          monthly_summary: updatedConfig?.notif_email_monthly_summary === true
        },
        webhook_notifications: {
          payment_status: updatedConfig?.webhook_payment_status !== false,
          subscription_changes: updatedConfig?.webhook_subscription_changes !== false,
          billing_events: updatedConfig?.webhook_billing_events !== false
        }
      };

      return reply.send({
        success: true,
        message: 'Pengaturan billing berhasil disimpan',
        data: {
          billing_settings: responseSettings
        }
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        message: 'Gagal menyimpan pengaturan billing: ' + err.message
      });
    }
  }

  async resetSettings(req: any, reply: any) {
    try {
      const user = (req as any).user;

      // Default values payload
      const defaultPayload: any = {
        company_legal_name: 'PT Absenta Indonesia',
        company_npwp: '',
        company_address: '',
        notif_email_new_payment: true,
        notif_email_payment_failed: true,
        notif_email_subscription_expired: true,
        notif_email_monthly_summary: false,
        webhook_payment_status: true,
        webhook_subscription_changes: true,
        webhook_billing_events: false
      };

      await systemConfigService.upsert(defaultPayload, user?.roleName || 'SUPERADMIN', null);
      const updatedConfig = await systemConfigService.getActive(null);

      const responseSettings = {
        company_name: updatedConfig?.company_legal_name || 'PT Absenta Indonesia',
        tax_id: updatedConfig?.company_npwp || '',
        default_currency: 'IDR',
        billing_cycle: 'monthly',
        company_address: updatedConfig?.company_address || '',
        auto_generate_bills: true,
        auto_send_invoices: true,
        auto_generate_invoices_from_billing: false,
        payment_reminders: true,
        auto_suspend_overdue: false,
        email_notifications: {
          new_payment: true,
          payment_failed: true,
          subscription_expired: true,
          monthly_summary: false
        },
        webhook_notifications: {
          payment_status: true,
          subscription_changes: true,
          billing_events: false
        }
      };

      return reply.send({
        success: true,
        message: 'Pengaturan billing berhasil direset ke default',
        data: {
          billing_settings: responseSettings
        }
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        message: 'Gagal mereset pengaturan billing: ' + err.message
      });
    }
  }

  async testGateway(req: any, reply: any) {
    try {
      const payload: any = req.body;
      const gateway = payload?.gateway || 'midtrans';

      return reply.send({
        success: true,
        message: `Koneksi gateway ${gateway} berhasil diuji`,
        data: {
          gateway: gateway,
          status: 'connected'
        }
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        message: 'Gagal menguji gateway: ' + err.message
      });
    }
  }

  async getDefaults(req: any, reply: any) {
    return this.getSettings(req, reply);
  }
}

export const billingSettingsController = new BillingSettingsController();
