import { appLogger } from '@/utils/app-logger';

import { backupService } from '../services/backup.service';

export const backupController = {
  async export(request: any, reply: any) {
    try {
      const user = request.user!;
      const result = await backupService.exportData(user.tenantId);

      const filename = `academic-backup-${new Date().toISOString().split('T')[0]}.json`;

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('Content-Type', 'application/json');
      
      return reply.send(result);
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error');
      console.error('Error exporting data:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  },

  async import(request: any, reply: any) {
    try {
      const user = request.user!;
      const data = request.body;

      const result = await backupService.importData(user.tenantId, data);

      return reply.status(200).send(result);
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error');
      console.error('Error importing data:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }
};
