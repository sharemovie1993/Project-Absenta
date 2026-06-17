import { prisma } from '@/utils/prisma';
import { sesiService } from '@/modules/attendance/sesi-absensi/services/sesi.service';


export class DeviceService {
  async getDevices(tenantId: string, page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;
    const where: any = { tenant_id: tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { device_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.attendanceDevice.findMany({
        where,
        skip,
        take: limit,
        include: { Kelas: { select: { id: true, nama_kelas: true } } },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.attendanceDevice.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDeviceDetail(id: string, tenantId: string) {
    const device = await prisma.attendanceDevice.findFirst({
      where: { id, tenant_id: tenantId },
      include: { Kelas: true },
    });
    if (!device) throw new Error('Perangkat tidak ditemukan');
    return device;
  }

  async createDevice(tenantId: string, data: any) {
    return prisma.attendanceDevice.create({
      data: {
        tenant_id: tenantId,
        device_id: data.device_id,
        name: data.name,
        kelas_id: data.kelas_id || null,
        firmware_version: data.firmware_version,
      },
    });
  }

  async updateDevice(id: string, tenantId: string, data: any) {
    const existing = await this.getDeviceDetail(id, tenantId);
    
    return prisma.attendanceDevice.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        device_id: data.device_id ?? existing.device_id,
        kelas_id: data.kelas_id !== undefined ? data.kelas_id : existing.kelas_id,
        firmware_version: data.firmware_version ?? existing.firmware_version,
      },
    });
  }

  async deleteDevice(id: string, tenantId: string) {
    await this.getDeviceDetail(id, tenantId);
    return prisma.attendanceDevice.delete({ where: { id } });
  }

  async heartbeat(deviceId: string, data: { battery?: number; version?: string }) {
    const device = await prisma.attendanceDevice.findUnique({
      where: { device_id: deviceId },
    });

    if (!device) {
      // Auto-register device if not found? 
      // For now, we only update if registered.
      return null;
    }

    return prisma.attendanceDevice.update({
      where: { id: device.id },
      data: {
        status: 'ONLINE',
        heartbeat_at: new Date(),
        battery_level: data.battery,
        firmware_version: data.version,
      },
    });
  }

  async tap(deviceId: string, data: { rfid?: string; battery?: number; version?: string }) {
    // 1. Resolve Device & Metadata
    const device = await prisma.attendanceDevice.findUnique({
      where: { device_id: deviceId },
      include: { Kelas: true },
    });

    if (!device) {
      throw new Error(`Perangkat '${deviceId}' tidak terdaftar`);
    }

    // 2. Update Heartbeat Status
    await prisma.attendanceDevice.update({
      where: { id: device.id },
      data: {
        status: 'ONLINE',
        heartbeat_at: new Date(),
        battery_level: data.battery,
        firmware_version: data.version,
      },
    });

    if (!device.kelas_id) {
      throw new Error(`Perangkat '${deviceId}' belum dihubungkan ke kelas mana pun`);
    }

    // 3. Resolve Active Session for this class
    const activeSesi = await prisma.sesiAbsensi.findFirst({
      where: {
        tenant_id: device.tenant_id,
        kelas_id: device.kelas_id,
        status: { in: ['OPEN', 'BERLANGSUNG'] },
      },

      orderBy: { created_at: 'desc' },
    });

    if (!activeSesi) {
      throw new Error(`Tidak ada sesi absensi yang aktif untuk kelas '${device.Kelas?.nama_kelas || 'N/A'}'`);
    }

    // 4. Delegate to SesiService
    return sesiService.tapSiswa(
      device.tenant_id,
      null, // _org is not used for hardware scan
      activeSesi.id,
      { rfid: data.rfid, device_id: deviceId },
      'HARDWARE_AGENT' // System/Hardware designated userId
    );
  }
}


export const deviceService = new DeviceService();
