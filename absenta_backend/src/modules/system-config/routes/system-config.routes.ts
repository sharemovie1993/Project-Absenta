import { systemConfigController } from '../controllers/system-config.controller';

export async function systemConfigRoutes(fastify: any) {
  // GET /api/system/config — requires auth so tenantId is extracted from JWT
  fastify.get('/', {
    handler: systemConfigController.getActive.bind(systemConfigController),
  });

  // GET /api/system/config/public — truly public, returns global config for login page branding
  fastify.get('/public', {
    config: { skipAuth: true, public: true },
    handler: systemConfigController.getActive.bind(systemConfigController),
  });

  // PUT /api/system/config
  fastify.put('/', {
    handler: systemConfigController.upsert.bind(systemConfigController),
  });

  // POST /api/setup/initialize (First-Run Windows Setup Wizard)
  fastify.post('/initialize', {
    config: { skipAuth: true, public: true },
    handler: async (request: any, reply: any) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const { schoolName, licenseKey, serverPort } = request.body || {};
        
        const envPath = path.join(process.cwd(), '.env');
        const envContent = `PORT=${serverPort || 5000}
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL="file:./prisma/dev.db"
LICENSE_KEY="${licenseKey || 'DEMO-KEY'}"
SCHOOL_NAME="${schoolName || 'Absenta School Engine'}"
SETUP_COMPLETED=true
`;
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('🟢 [SETUP WIZARD] .env configuration saved successfully!');
        return reply.send({ success: true, message: 'Setup completed successfully' });
      } catch (err: any) {
        console.error('❌ [SETUP WIZARD ERROR]:', err);
        return reply.status(500).send({ success: false, message: err.message });
      }
    }
  });
}
