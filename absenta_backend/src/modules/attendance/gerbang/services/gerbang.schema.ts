import { z } from 'zod';
import { JenisTap } from '@/constants/enums';

export const gerbangTapSchema = z.object({
  siswa_id: z.string().optional().nullable(),
  arah: z.nativeEnum(JenisTap),
  device_id: z.string().optional().nullable(),
  rfid: z.string().optional().nullable(),
  waktu_tap: z.union([z.date(), z.string()]).transform((v) => (v ? new Date(v) : undefined)).optional(),
  is_offline_sync: z.boolean().optional().default(false),
});

export const faceVerifySchema = z.object({
  siswa_id: z.string().optional().nullable(),
  arah: z.nativeEnum(JenisTap),
  image_base64: z.string().min(1, 'image_base64 wajib diisi'),
  embedding: z.array(z.number()).optional(),
  liveness_score: z.union([z.number(), z.string()]).optional(),
});

export const faceEnrollSchema = z.object({
  siswa_id: z.string().min(1, 'siswa_id wajib diisi'),
  image_base64: z.string().min(1, 'image_base64 wajib diisi'),
  embedding: z.array(z.number()).optional(),
  source: z.string().optional().nullable(),
  embedding_type: z.string().optional().nullable(),
  model_name: z.string().optional().nullable(),
});
