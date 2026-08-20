import { reconcilePendingGate } from '../../modules/attendance/sesi-absensi/services/commands/reconcile-pending-gate.command';

export async function handleSesiSummaryUpdate(io: any, _ioApi: any, payload: any) {
  try {
    const tenantId = payload?.tenant_id;
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('sesi_summary_update', payload);
    }
  } catch {}
}

export async function handleSessionAttendanceUpdate(io: any, _ioApi: any, payload: any) {
  try {
    const tenantId = payload?.tenant_id;
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('session_attendance_update', payload);
    }
  } catch (e) {
  }
}

export async function handleSesiStatusUpdate(io: any, _ioApi: any, payload: any) {
  try {
    const tenantId = payload?.tenant_id;
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('sesi_status_update', payload);
      io.to(`tenant:${tenantId}`).emit('SESI_UPDATED', payload);
    }
  } catch {}
}

export async function handleAbsenGuruUpdate(io: any, ioApi: any, payload: any) {
  try {
    const tenantId = payload?.tenant_id;
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('absen_guru_update', payload);
      io.to(`tenant:${tenantId}`).emit('sesi_status_update', payload);
      io.to(`tenant:${tenantId}`).emit('SESI_UPDATED', payload);
      io.to(`tenant:${tenantId}`).emit('attendance_feed_update', payload);
      if (ioApi) {
        ioApi.to(`tenant:${tenantId}`).emit('absen_guru_update', payload);
        ioApi.to(`tenant:${tenantId}`).emit('sesi_status_update', payload);
        ioApi.to(`tenant:${tenantId}`).emit('attendance_feed_update', payload);
      }
    }
  } catch {}
}

export async function handleGerbangTapUpdate(io: any, ioApi: any, payload: any) {
  try {
    const tenantId = payload?.tenant_id;

    if (tenantId) {
      // Real-time tap event
      io.to(`tenant:${tenantId}`).emit('gerbang_tap_update', payload);
      ioApi.to(`tenant:${tenantId}`).emit('gerbang_tap_update', payload);
    }
  } catch (e) {
  }
}

export async function handleSesiReminderUpdate(io: any, ioApi: any, payload: any) {
  try {
    const tenantId = payload?.tenant_id;
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('sesi_reminder_updated', payload);
      io.to(`tenant:${tenantId}`).emit('SESI_UPDATED', payload);
      if (ioApi) {
        ioApi.to(`tenant:${tenantId}`).emit('sesi_reminder_updated', payload);
      }
    }
  } catch {}
}

/**
 * Handles the domain event for a gate tap.
 * This is used for backend reconciliation (e.g. matching late gate taps with classroom sessions).
 */
export async function handleGateTapDomainEvent(payload: any) {
  try {
    const tenantId = payload?.tenant_id;
    const studentId = payload?.siswa_id; // Fix: Use siswa_id from event payload
    
    if (tenantId && studentId) {
      await reconcilePendingGate({ tenantId, studentId });
    }
  } catch (e) {
    console.warn('[EventBus] Gate reconciliation handling failed', e);
  }
}
