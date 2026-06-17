import { getNotificationQueue } from '../../notification.queue';
import { ParentEventType } from '@/modules/parent-app/constants/parent-event-matrix';
import type { DomainEvent } from '@/infra/event-bus';

type AttendanceTapPayload = {
  tenant_id?: string;
  student_id?: string;
  device_id?: string | null;
  tap_time?: string;
  source?: string;
  related_id?: string;
  status?: string;
  arah?: string;
  keterangan?: string;
  note?: string;
  duplicate?: boolean;
  late_minutes?: number;
  schedule_start?: string;
  original_tap?: any;
  notification_hint?: string;
};

function resolveParentEventTypeFromAttendanceTap(p: AttendanceTapPayload): ParentEventType {
  const hint = String(p.notification_hint || '').toUpperCase();
  if (hint === 'STUDENT_MULTI_SCAN') return ParentEventType.STUDENT_MULTI_SCAN;
  if (hint === 'STUDENT_LATE') return ParentEventType.STUDENT_LATE;
  if (hint === 'STUDENT_RETURN') return ParentEventType.STUDENT_RETURN;
  if (hint === 'STUDENT_PERMISSION') return ParentEventType.STUDENT_PERMISSION;
  if (hint === 'STUDENT_ABSENT') return ParentEventType.STUDENT_ABSENT;
  if (hint === 'STUDENT_PRESENT') return ParentEventType.STUDENT_PRESENT;
  if (hint === 'SESSION_PRESENT') return ParentEventType.SESSION_PRESENT;

  const status = String(p.status || '').toUpperCase();
  const arah = String(p.arah || '').toUpperCase();

  if (p.duplicate) return ParentEventType.STUDENT_MULTI_SCAN;
  if (arah === 'GERBANG_PULANG' || status === 'PULANG') return ParentEventType.STUDENT_RETURN;
  if (status === 'TERLAMBAT') return ParentEventType.STUDENT_LATE;
  if (status === 'IZIN' || status === 'SAKIT' || status === 'DISPEN') return ParentEventType.STUDENT_PERMISSION;
  if (status === 'ALPA') return ParentEventType.STUDENT_ABSENT;
  return ParentEventType.STUDENT_PRESENT;
}

async function acquireLock(conn: any, idempotencyKey: string): Promise<boolean> {
  try {
    const key = `domain-event:processed:notification:attendance:${idempotencyKey}`;
    const ok = await (conn as any).set(key, '1', 'EX', 60 * 60, 'NX');
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function handleAttendanceDomainEvent(input: {
  evt: DomainEvent<any>;
  conn: any;
  eventType: string;
  tenantId: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const { evt, conn, eventType, tenantId, idempotencyKey } = input;

  if (eventType !== 'attendance.tap' && eventType !== 'attendance.session.tap' && eventType !== 'attendance.manual.submit') {
    return false;
  }

  const locked = await acquireLock(conn, idempotencyKey);
  if (!locked) return true;

  if (!tenantId) return true;

  if (eventType === 'attendance.tap') {
    const p = (evt.payload || {}) as AttendanceTapPayload;
    const parentType = resolveParentEventTypeFromAttendanceTap(p);
    await getNotificationQueue().add('attendance-tap', {
      kind: 'parent-notification',
      eventType: parentType,
      tenantId: tenantId,
      payload: {
        studentId: String(p.student_id || ''),
        timestamp: String(p.tap_time || evt.timestamp || new Date().toISOString()),
        source: String(p.source || 'GERBANG'),
        relatedId: p.related_id,
        status: p.status,
        keterangan: p.keterangan,
        details: {
          device_id: p.device_id,
          arah: p.arah,
          note: p.note,
          late_minutes: p.late_minutes,
          schedule_start: p.schedule_start,
          original_tap: p.original_tap,
        },
      },
    } as any);
    return true;
  }

  if (eventType === 'attendance.session.tap') {
    const p = (evt.payload || {}) as any;
    await getNotificationQueue().add('attendance-session-tap', {
      kind: 'parent-notification',
      eventType: ParentEventType.SESSION_PRESENT,
      tenantId: tenantId,
      payload: {
        studentId: String(p.student_id || ''),
        timestamp: String(p.tap_time || evt.timestamp || new Date().toISOString()),
        source: 'SESSION',
        relatedId: p.related_id,
        details: {
          sesi_id: p.sesi_id,
          status: p.status,
          mapel: p.mapel,
        },
      },
    } as any);
    return true;
  }

  if (eventType === 'attendance.manual.submit') {
    const p = (evt.payload || {}) as any;
    await getNotificationQueue().add('attendance-manual-submit', {
      kind: 'parent-notification',
      eventType: ParentEventType.STUDENT_PERMISSION,
      tenantId: tenantId,
      payload: {
        studentId: String(p.student_id || ''),
        timestamp: String(p.tap_time || evt.timestamp || new Date().toISOString()),
        source: 'MANUAL',
        relatedId: p.related_id,
        status: p.status,
        catatan: p.catatan,
      },
    } as any);
    return true;
  }

  return true;
}
