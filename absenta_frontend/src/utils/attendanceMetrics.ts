export function logAttendanceMetric(event: string, payload: Record<string, any>) {
  try {
    console.info('[ATTENDANCE_METRIC]', event, payload);
  } catch (e) {
    console.error('[ATTENDANCE_UI_ERROR]', e);
  }
}
