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
    const modules: any[] = await prisma.module.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: { order: 'asc' },
    });

    const hardwareModules: any[] = [
      { id: 'SERVER_HARDWARE', name: 'Server Node', description: 'Node Server untuk Lokasi Sekolah', icon: 'Server', order: 80, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: 'NETWORK_HARDWARE', name: 'Network Wi-Fi 6', description: 'Access Point Wi-Fi 6 & PoE Switch', icon: 'Wifi', order: 81, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: 'ABSENSI_HARDWARE', name: 'Biometrik & RFID', description: 'Fingerprint LAN/PoE & Mini OTG RFID', icon: 'Fingerprint', order: 82, is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: 'PHYSICAL_SERVICE', name: 'Kartu & Cetak', description: 'Paket Cetak Kartu Pelajar PVC RFID', icon: 'CreditCard', order: 83, is_active: true, created_at: new Date(), updated_at: new Date() }
    ];

    hardwareModules.forEach(hm => {
      if (!modules.some(m => m.id === hm.id)) {
        modules.push(hm);
      }
    });

    return modules;
  }

  async getModuleById(id: string): Promise<ModuleResponse | null> {
    return prisma.module.findUnique({
      where: { id },
    });
  }
}

export const moduleService = new ModuleService();
