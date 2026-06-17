import { prisma } from '@/utils/prisma';

export interface ModuleResponse {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  is_active: boolean;
  metadata?: any;
}

export class ModuleService {
  async getAllModules(includeInactive: boolean = false): Promise<ModuleResponse[]> {
    return prisma.module.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: { order: 'asc' },
    });
  }

  async getModuleById(id: string): Promise<ModuleResponse | null> {
    return prisma.module.findUnique({
      where: { id },
    });
  }
}

export const moduleService = new ModuleService();
