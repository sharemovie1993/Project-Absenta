import { parentAppController } from '../controllers/parent-auth.controller';
import { parentAuthGuard } from '../guards/parent-auth.guard';
import { initParentAppAttendanceEventConsumer } from '../services/event-handlers/attendance-event-consumer';
import { determineDataScope } from '@/middlewares/dataScope';

export async function parentAppRoutes(fastify: any) {
  void initParentAppAttendanceEventConsumer().catch(err => console.warn('[ParentAppRoutes] Consumer init warning:', err?.message));
  // console.log('🔥 parentAppRoutes REGISTERED');
  const NotificationController = (require('../../notification/controllers/notification.controller') as any)
    .NotificationController as any;
  const notificationController = new NotificationController();

  // Push Notification VAPID Key (Public within parent-app context)
  fastify.get('/notifications/push/vapid-public-key', {
    config: { skipAuth: true },
    handler: notificationController.getVapidPublicKey.bind(notificationController),
  });

  // Subscribe Push (Public within parent-app context)
  fastify.post('/notifications/push/subscribe', {
    config: { skipAuth: true },
    handler: notificationController.subscribePush.bind(notificationController),
  });

  // Register FCM token (Native app)
  fastify.post('/notifications/fcm/register', {
    config: { skipAuth: true },
    handler: notificationController.registerFcmToken.bind(notificationController),
  });

  // Main Dashboard (Profile + Active Students + Status)
  fastify.get('/me', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: async (request: any, reply: any) => {
      console.log('🔥🔥🔥 /api/parent-app/me HANDLER HIT');
      return parentAppController.getDashboard(request, reply);
    }
  });

  // Student Attendance History (Paginated)
  fastify.get('/siswa/:id/riwayat-kehadiran', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.getAttendanceHistory.bind(parentAppController)
  });

  // Student Notifications (Paginated)
  fastify.get('/siswa/:id/notifikasi', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.getNotifications.bind(parentAppController)
  });

  // Student Monthly Recap
  fastify.get('/siswa/:id/rekap-bulanan', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.getMonthlyRecap.bind(parentAppController)
  });

  // Student Daily Tracking
  fastify.get('/siswa/:id/tracking-harian', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.getDailyTracking.bind(parentAppController)
  });

  // Report Absence (SAKIT/IZIN)
  fastify.post('/siswa/:id/lapor-absen', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.reportAbsence.bind(parentAppController)
  });

  // Report Card View (Rapor Online)
  fastify.get('/siswa/:id/rapor', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.getRapor.bind(parentAppController)
  });

  // P5 Projek View
  fastify.get('/siswa/:id/p5', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: parentAppController.getP5.bind(parentAppController)
  });

  // === CHAT ROUTING ===
  const { ParentChatController } = require('../controllers/parent-chat.controller');
  const { requireCapability } = require('../../../middlewares/requireCapability');

  // Wali Murid Chat Routes (Stateless Auth Guard)
  fastify.post('/chat/session', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: ParentChatController.startSession
  });

  fastify.get('/chat/sessions', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: ParentChatController.getParentSessions
  });

  fastify.get('/chat/messages/:sessionId', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: ParentChatController.getParentMessages
  });

  fastify.post('/chat/message', {
    config: { skipAuth: true },
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: ParentChatController.sendParentMessage
  });

  // Guru / Wali Kelas Chat Routes (User Session Auth)
  fastify.get('/teacher/chat/sessions', {
    preHandler: [requireCapability('academic.teaching.view'), determineDataScope()],
    handler: ParentChatController.getTeacherSessions
  });

  fastify.get('/teacher/chat/messages/:sessionId', {
    preHandler: [requireCapability('academic.teaching.view'), determineDataScope()],
    handler: ParentChatController.getTeacherMessages
  });

  fastify.post('/teacher/chat/message', {
    preHandler: [requireCapability('academic.teaching.view'), determineDataScope()],
    handler: ParentChatController.sendTeacherMessage
  });

  // === BK CONSULTATION BOOKING (SISI ORANG TUA) ===
  const { BkKonsultasiParentController } = require('../../bpbk/controllers/bk-konsultasi.controller');

  // Buat booking konsultasi baru
  fastify.post('/bk/konsultasi', {
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: BkKonsultasiParentController.createBooking
  });

  // Riwayat booking milik orang tua
  fastify.get('/bk/konsultasi', {
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: BkKonsultasiParentController.getMyBookings
  });

  // Batalkan booking
  fastify.patch('/bk/konsultasi/:id/cancel', {
    preHandler: [parentAuthGuard, determineDataScope()],
    handler: BkKonsultasiParentController.cancelBooking
  });
}
