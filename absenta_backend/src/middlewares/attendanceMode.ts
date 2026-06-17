import { AbsensiMode } from '@prisma/client';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';

/**
 * Middleware to check tenant attendance mode and restrict access based on mode
 * @param allowedModes - Array of allowed attendance modes for the endpoint
 * @returns Middleware function
 */
export function checkAttendanceMode(allowedModes: AbsensiMode[]) {
  return async function attendanceModeMiddleware(
    request: any,
    reply: any
  ) {
    try {
      // Skip validation if no tenant ID (SUPERADMIN without tenant)
      if (!request.tenantId) {
        return;
      }

      // Fetch tenant attendance mode dynamically (checking ABSENSI subscription first)
      const currentMode = await getEffectiveAbsensiMode(request.tenantId);

      // Check if tenant's attendance mode is allowed for this endpoint
      if (!allowedModes.includes(currentMode)) {
        const modeNames = {
          [AbsensiMode.SIMPLE]: 'SIMPLE',
          [AbsensiMode.MULTI_SESI]: 'MULTI_SESI'
        };

        return reply.status(403).send({
          error: 'Attendance mode not supported',
          message: `This endpoint is not available for tenants with ${modeNames[currentMode]} attendance mode. Allowed modes: ${allowedModes.map(mode => modeNames[mode]).join(', ')}`,
          details: {
            current_mode: modeNames[currentMode],
            allowed_modes: allowedModes.map(mode => modeNames[mode]),
            endpoint_restriction: true
          }
        });
      }

      // Store attendance mode in request for use in route handlers
      request.attendanceMode = currentMode;
      
    } catch (error) {
      console.error('Error in attendance mode middleware:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to validate attendance mode'
      });
    }
  };
}

/**
 * Middleware specifically for MULTI_SESI mode endpoints
 */
export const requireMultiSesiMode = checkAttendanceMode([AbsensiMode.MULTI_SESI]);

/**
 * Middleware specifically for SIMPLE mode endpoints
 */
export const requireSimpleMode = checkAttendanceMode([AbsensiMode.SIMPLE]);

/**
 * Middleware that allows both modes
 */
export const allowBothModes = checkAttendanceMode([AbsensiMode.SIMPLE, AbsensiMode.MULTI_SESI]);