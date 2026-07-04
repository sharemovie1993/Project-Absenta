import { z } from 'zod';

export const createDeviceSchema = z.object({
  device_id: z.string().min(1, 'device_id wajib diisi'),
  name: z.string().min(1, 'Nama perangkat wajib diisi'),
  kelas_id: z.string().optional().nullable(),
  firmware_version: z.string().optional().nullable(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

export const heartbeatSchema = z.object({
  device_id: z.string().min(1, 'device_id wajib diisi'),
  battery: z.number().optional().nullable(),
  version: z.string().optional().nullable(),
});

export const deviceTapSchema = z.object({
  device_id: z.string().min(1, 'device_id wajib diisi'),
  rfid: z.string().min(1, 'rfid wajib diisi'),
  battery: z.number().optional().nullable(),
  version: z.string().optional().nullable(),
});
