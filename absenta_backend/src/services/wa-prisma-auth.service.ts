/**
 * wa-prisma-auth.service.ts
 * Database Auth Store untuk Baileys WhatsApp Gateway menggunakan Prisma.
 * Menggantikan file auth fisik lokal (useMultiFileAuthState) dengan tabel PostgreSQL `wa_auth_sessions`.
 * Mendukung sesi level Sekolah/Tenant maupun sesi level User yang Login (key prefix `user:<userId>:`).
 */

import type { AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { prisma } from '../utils/prisma';

export function parseWaSessionKey(sessionKey: string): {
  tenantId: string;
  userId: string | null;
  keyPrefix: string;
} {
  const raw = String(sessionKey || '').trim();
  const sep = '::user::';
  const idx = raw.indexOf(sep);
  if (idx > 0) {
    const tenantId = raw.slice(0, idx);
    const userId = raw.slice(idx + sep.length).trim();
    if (tenantId && userId) {
      return { tenantId, userId, keyPrefix: `user:${userId}:` };
    }
  }
  return { tenantId: raw, userId: null, keyPrefix: '' };
}

export function buildUserWaSessionKey(tenantId: string, userId: string): string {
  return `${tenantId}::user::${userId}`;
}

export interface PrismaAuthState {
  state: {
    creds: AuthenticationCreds;
    keys: {
      get: (type: keyof SignalDataTypeMap, ids: string[]) => Promise<{ [id: string]: any }>;
      set: (data: any) => Promise<void>;
    };
  };
  saveCreds: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

export async function usePrismaAuthState(sessionKey: string): Promise<PrismaAuthState> {
  const { initAuthCreds, BufferJSON, proto } = await import('@whiskeysockets/baileys');
  const { tenantId, userId, keyPrefix } = parseWaSessionKey(sessionKey);
  const toDbKey = (keyId: string) => (keyPrefix ? `${keyPrefix}${keyId}` : keyId);

  const readKey = async (keyId: string) => {
    const dbKey = toDbKey(keyId);
    try {
      const row = await prisma.waAuthSession.findUnique({
        where: { tenant_id_key_id: { tenant_id: tenantId, key_id: dbKey } },
      });
      if (!row) return null;
      return JSON.parse(row.value, BufferJSON.reviver);
    } catch (e: any) {
      console.warn(`[WA-PrismaAuth:${sessionKey}] Error reading key ${dbKey}:`, e.message);
      return null;
    }
  };

  const writeKey = async (keyId: string, value: any) => {
    const dbKey = toDbKey(keyId);
    try {
      if (value === null || value === undefined) {
        await prisma.waAuthSession.deleteMany({
          where: { tenant_id: tenantId, key_id: dbKey },
        });
      } else {
        const serialized = JSON.stringify(value, BufferJSON.replacer);
        await prisma.waAuthSession.upsert({
          where: { tenant_id_key_id: { tenant_id: tenantId, key_id: dbKey } },
          create: { tenant_id: tenantId, key_id: dbKey, value: serialized },
          update: { value: serialized },
        });
      }
    } catch (e: any) {
      console.error(`[WA-PrismaAuth:${sessionKey}] Error writing key ${dbKey}:`, e.message);
    }
  };

  // Check existing creds in Database
  let creds: AuthenticationCreds = await readKey('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeKey('creds', creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
          const data: { [id: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              const keyId = `${type}-${id}`;
              let value = await readKey(keyId);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              if (value) data[id] = value;
            })
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const keyId = `${category}-${id}`;
              tasks.push(writeKey(keyId, value));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeKey('creds', creds);
    },
    clearAuth: async () => {
      console.log(`[WA-PrismaAuth:${sessionKey}] Clear database auth session rows.`);
      await prisma.waAuthSession.deleteMany({
        where: {
          tenant_id: tenantId,
          key_id: userId ? { startsWith: keyPrefix } : { not: { startsWith: 'user:' } },
        },
      });
    },
  };
}
