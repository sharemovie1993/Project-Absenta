import { PARENT_EVENT_MATRIX, ParentEventType, NotificationChannel } from '../constants/parent-event-matrix';
import { prisma } from '@/utils/prisma';
import { emitDomainEvent } from '@/infra/event-bus';
import { getTenantTimezone } from '@/utils/timezone.utils';

export class ParentNotificationService {
  constructor() {}

  /**
   * Dispatch Event
   * Event -> Dispatcher -> Guard -> Channel -> Log
   */
  async handleEvent(eventType: ParentEventType, payload: any, sockets?: { io: any; ioApi: any }) {
    void sockets;
    const config = PARENT_EVENT_MATRIX[eventType];
    if (!config) {
      console.warn(`[ParentNotification] No config for event: ${eventType}`);
      return;
    }

    // 1. Resolve Targets (Parents)
    const targets = await this.resolveTargets(eventType, payload);
    if (targets.length === 0) {
      // It's possible no parents are linked, or student not found.
      return;
    }

    console.log(`[ParentNotification] Processing ${eventType} for ${targets.length} parents`);

    // 2. Process per Target
    for (const target of targets) {
      await this.processTarget(target, eventType, config, payload, sockets);
    }
  }

  private async resolveTargets(_eventType: ParentEventType, payload: any) {
    // If payload has orangTuaId (Direct parent event)
    if (payload.orangTuaId) {
       const parent = await prisma.orangTua.findUnique({
         where: { id: payload.orangTuaId },
         include: { ParentAccessToken: true }
       });
       return parent ? [{ parent, siswa: null }] : [];
    }

    // If payload has siswaId (Student event)
    if (payload.siswaId) {
      const links = await prisma.orangTuaSiswa.findMany({
        where: { siswa_id: payload.siswaId },
        include: { 
          OrangTua: {
            include: { ParentAccessToken: true }
          },
          Siswa: true
        }
      });
      return links.map(link => ({ parent: link.OrangTua, siswa: link.Siswa }));
    }

    return [];
  }

  private async processTarget(target: any, eventType: ParentEventType, config: any, payload: any, sockets?: { io: any; ioApi: any }) {
    void sockets;
    const { parent, siswa } = target;

    // 3. Guard Logic
    // "Guard (Token + Active Student)"
    
    // Rule A: Student MUST be ACTIVE (unless event is NO_ACTIVE_STUDENT or TOKEN_REVOKED)
    if (siswa && siswa.status !== 'AKTIF') {
       // Exceptions for specific events if needed
       if (eventType !== ParentEventType.NO_ACTIVE_STUDENT && eventType !== ParentEventType.TOKEN_REVOKED) {
         console.log(`[ParentNotification] Skipped ${parent.nama}: Student ${siswa.nama} not active`);
         return;
       }
    }

    // Rule B: Parent Validation?
    // We assume if OrangTua exists, they are valid targets.

    // Resolve Timezone
    const timeZone = await getTenantTimezone(parent.tenant_id);
    const dateObj = payload.timestamp ? new Date(payload.timestamp) : new Date();

    let tanggalStr: string;
    let waktuStr: string;

    try {
      tanggalStr = dateObj.toLocaleDateString('id-ID', { timeZone });
      waktuStr = dateObj.toLocaleTimeString('id-ID', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      tanggalStr = dateObj.toLocaleDateString('id-ID');
      waktuStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    // Prepare Message
    const templateData = {
      ...payload,
      nama_siswa: (siswa as any)?.nama_siswa || (siswa as any)?.nama || 'Siswa',
      tanggal: tanggalStr,
      waktu: waktuStr
    };

    // 3.5. Resolve Custom WhatsApp Templates (BYOG)
    let customWaMessage = null;
    try {
      if (config.channels.includes(NotificationChannel.WA)) {
        const waConfig = await prisma.whatsappConfig.findUnique({
          where: { tenant_id: parent.tenant_id }
        });

        if (waConfig && waConfig.is_active) {
          let template = null;
          if (eventType === ParentEventType.STUDENT_PRESENT || eventType === ParentEventType.SESSION_PRESENT) {
            template = waConfig.template_absen_masuk;
          } else if (eventType === ParentEventType.STUDENT_RETURN) {
            template = waConfig.template_absen_pulang;
          }

          if (template) {
            // Replace templates in BYOG style: {{nama_siswa}}, {{waktu}}, {{tanggal}}
            customWaMessage = template
              .replace(/{{nama_siswa}}/g, templateData.nama_siswa)
              .replace(/{{waktu}}/g, templateData.waktu)
              .replace(/{{tanggal}}/g, templateData.tanggal)
              .replace(/{{mapel}}/g, templateData.mapel || templateData.details?.mapel || '');
          }
        }
      }
    } catch (e) {
      console.warn('[ParentNotification] Failed to resolve custom WA template', e);
    }

    const title = this.formatTemplate(config.titleTemplate, templateData);
    const message = this.formatTemplate(config.messageTemplate, templateData);

    // 4. Channel Resolver & Send
    const relatedId = payload.relatedId || payload.details?.sesi_id || (payload.siswaId ? `${payload.siswaId}:${new Date().toISOString().slice(0, 10)}` : undefined);

    // Filter channels based on Logic (e.g. WA optional for PULANG_CEPAT)
    let channels = [...config.channels];

    if (eventType === ParentEventType.STUDENT_LEFT_EARLY) {
      // Check Tenant Config for PULANG_CEPAT WA
      const tenantConfig = await prisma.config.findFirst({
        where: { tenant_id: parent.tenant_id, key: 'WA_PULANG_CEPAT_ENABLED' }
      });
      if (tenantConfig?.value === 'true') {
        channels.push(NotificationChannel.WA);
      }
    }

    const eventTimestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
    const tenantId = String(parent.tenant_id || '');
    const parentId = String(parent.id || '');
    const studentId =
      (payload.siswaId ? String(payload.siswaId) : null) ||
      (payload.studentId ? String(payload.studentId) : null) ||
      (siswa?.id ? String(siswa.id) : null);

    for (const channel of channels) {
      try {
        await emitDomainEvent({
          event_type: 'parent.notification.created',
          tenant_id: tenantId,
          source_service: 'parent-app',
          payload: {
            tenant_id: tenantId,
            parent_id: parentId,
            student_id: studentId,
            message_type: String(channel),
            timestamp: eventTimestamp.toISOString(),
            event: String(eventType),
            title,
            message: (channel === NotificationChannel.WA && customWaMessage) ? customWaMessage : message,
            related_id: relatedId || null,
          },
        });
      } catch (e) {
        console.error(`[ParentNotification] Failed to send ${channel} to ${parent.nama}:`, e);
      }
    }
  }

  private formatTemplate(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '?');
  }
}

export const parentNotificationService = new ParentNotificationService();
