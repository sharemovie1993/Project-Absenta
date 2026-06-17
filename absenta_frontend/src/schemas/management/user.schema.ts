import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string(),
  role_id: z.string().min(1, 'Role wajib dipilih'),
  tenant_id: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
}).refine((data) => data.confirm_password === data.password, {
  path: ['confirm_password'],
  message: 'Konfirmasi password tidak cocok',
});

export const updateUserSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  password: z.string().optional().refine((val) => (val ? val.length >= 8 : true), {
    message: 'Password minimal 8 karakter',
  }),
  confirm_password: z.string().optional(),
  role_id: z.string().min(1, 'Role wajib dipilih'),
  tenant_id: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
}).refine((data) => {
  if (data.password) {
    return data.confirm_password === data.password;
  }
  return true;
}, {
  path: ['confirm_password'],
  message: 'Konfirmasi password tidak cocok',
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

