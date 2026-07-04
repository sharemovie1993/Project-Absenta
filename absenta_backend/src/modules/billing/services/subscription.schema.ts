import { z } from 'zod';

export const licenseWebhookSchema = z.object({
  license_key: z.string().min(1, 'License key wajib diisi'),
  tenant_id: z.string().optional().nullable(),
});
