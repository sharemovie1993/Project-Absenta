import { publicPortalController } from '../controllers/public-portal.controller';

export async function publicPortalRoutes(fastify: any) {
  const publicConfig = {
    skipAuth: true,
    public: true,
    rateLimit: {
      max: 120,
      timeWindow: '1 minute',
    },
  };

  // ── Routes dengan parameter explicit :tenantSlug ──
  fastify.get('/:tenantSlug/profile', { config: publicConfig }, publicPortalController.getProfile.bind(publicPortalController));
  fastify.get('/:tenantSlug/live-pulse', { config: publicConfig }, publicPortalController.getLivePulse.bind(publicPortalController));
  fastify.get('/:tenantSlug/calendar-ekskul', { config: publicConfig }, publicPortalController.getCalendarAndEkskul.bind(publicPortalController));
  fastify.get('/:tenantSlug/curriculum-p5', { config: publicConfig }, publicPortalController.getCurriculumAndP5.bind(publicPortalController));
  fastify.get('/:tenantSlug/class-schedule', { config: publicConfig }, publicPortalController.getClassSchedule.bind(publicPortalController));
  fastify.get('/:tenantSlug/ppid-docs', { config: publicConfig }, publicPortalController.getPublicDocuments.bind(publicPortalController));
  fastify.get('/:tenantSlug/staff', { config: publicConfig }, publicPortalController.getStaff.bind(publicPortalController));
  fastify.get('/:tenantSlug/programs', { config: publicConfig }, publicPortalController.getPrograms.bind(publicPortalController));
  fastify.get('/:tenantSlug/achievements', { config: publicConfig }, publicPortalController.getAchievements.bind(publicPortalController));
  fastify.get('/:tenantSlug/hubin', { config: publicConfig }, publicPortalController.getHubin.bind(publicPortalController));
  fastify.get('/:tenantSlug/facilities', { config: publicConfig }, publicPortalController.getFacilities.bind(publicPortalController));
  fastify.get('/:tenantSlug/articles', { config: publicConfig }, publicPortalController.getArticles.bind(publicPortalController));
  fastify.get('/:tenantSlug/articles/:slug', { config: publicConfig }, publicPortalController.getArticleDetail.bind(publicPortalController));
  fastify.get('/:tenantSlug/verify/:docType/:code', { config: publicConfig }, publicPortalController.verifyDocument.bind(publicPortalController));
  fastify.post('/:tenantSlug/graduation-check', { config: publicConfig }, publicPortalController.checkGraduation.bind(publicPortalController));
  fastify.post('/:tenantSlug/guestbook', { config: publicConfig }, publicPortalController.submitGuestBook.bind(publicPortalController));
  fastify.post('/:tenantSlug/aspirasi', { config: publicConfig }, publicPortalController.submitAspirasi.bind(publicPortalController));

  // ── Routes berbasis Host / Domain Header (Resolusi Otomatis Subdomain / Custom Domain) ──
  fastify.get('/profile', { config: publicConfig }, publicPortalController.getProfile.bind(publicPortalController));
  fastify.get('/live-pulse', { config: publicConfig }, publicPortalController.getLivePulse.bind(publicPortalController));
  fastify.get('/calendar-ekskul', { config: publicConfig }, publicPortalController.getCalendarAndEkskul.bind(publicPortalController));
  fastify.get('/curriculum-p5', { config: publicConfig }, publicPortalController.getCurriculumAndP5.bind(publicPortalController));
  fastify.get('/class-schedule', { config: publicConfig }, publicPortalController.getClassSchedule.bind(publicPortalController));
  fastify.get('/ppid-docs', { config: publicConfig }, publicPortalController.getPublicDocuments.bind(publicPortalController));
  fastify.get('/staff', { config: publicConfig }, publicPortalController.getStaff.bind(publicPortalController));
  fastify.get('/programs', { config: publicConfig }, publicPortalController.getPrograms.bind(publicPortalController));
  fastify.get('/achievements', { config: publicConfig }, publicPortalController.getAchievements.bind(publicPortalController));
  fastify.get('/hubin', { config: publicConfig }, publicPortalController.getHubin.bind(publicPortalController));
  fastify.get('/facilities', { config: publicConfig }, publicPortalController.getFacilities.bind(publicPortalController));
  fastify.get('/articles', { config: publicConfig }, publicPortalController.getArticles.bind(publicPortalController));
  fastify.get('/articles/:slug', { config: publicConfig }, publicPortalController.getArticleDetail.bind(publicPortalController));
  fastify.get('/verify/:docType/:code', { config: publicConfig }, publicPortalController.verifyDocument.bind(publicPortalController));
  fastify.post('/graduation-check', { config: publicConfig }, publicPortalController.checkGraduation.bind(publicPortalController));
  fastify.post('/guestbook', { config: publicConfig }, publicPortalController.submitGuestBook.bind(publicPortalController));
  fastify.post('/aspirasi', { config: publicConfig }, publicPortalController.submitAspirasi.bind(publicPortalController));

  // ── CMS Management Endpoints (Admin / Humas) ──
  fastify.post('/manage/config', publicPortalController.saveConfig.bind(publicPortalController));
  fastify.post('/manage/articles', publicPortalController.createArticle.bind(publicPortalController));
  fastify.put('/manage/articles/:id', publicPortalController.updateArticle.bind(publicPortalController));
  fastify.delete('/manage/articles/:id', publicPortalController.deleteArticle.bind(publicPortalController));
}
