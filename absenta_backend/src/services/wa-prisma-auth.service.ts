/**
 * wa-prisma-auth.service.ts
 * Database Auth Store untuk Baileys WhatsApp Gateway menggunakan Prisma.
 * Menggantikan file auth fisik lokal (useMultiFileAuthState) dengan tabel PostgreSQL `wa_auth_sessions`.
 * Memastikan 100% isolasi data multi-tenant dan zero physical file lock di VPS.
 */

import { initAuthCreds, BufferJSON, proto, AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { prisma } from '../utils/prisma';

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

export async function usePrismaAuthState(tenantId: string): Promise<PrismaAuthState> {
  const readKey = async (keyId: string) => {
    try {
      const row = await prisma.waAuthSession.findUnique({
        where: { tenant_id_key_id: { tenant_id: tenantId, key_id: keyId } },
      });
      if (!row) return null;
      return JSON.parse(row.value, BufferJSON.reviver);
    } catch (e: any) {
      console.warn(`[WA-PrismaAuth:${tenantId}] Error reading key ${keyId}:`, e.message);
      return null;
    }
  };

  const writeKey = async (keyId: string, value: any) => {
    try {
      if (value === null || value === undefined) {
        await prisma.waAuthSession.deleteMany({
          where: { tenant_id: tenantId, key_id: keyId },
        });
      } else {
        const serialized = JSON.stringify(value, BufferJSON.replacer);
        await prisma.waAuthSession.upsert({
          where: { tenant_id_key_id: { tenant_id: tenantId, key_id: keyId } },
          create: { tenant_id: tenantId, key_id: keyId, value: serialized },
          update: { value: serialized },
        });
      }
    } catch (e: any) {
      console.error(`[WA-PrismaAuth:${tenantId}] Error writing key ${keyId}:`, e.message);
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
      console.log(`[WA-PrismaAuth:${tenantId}] Clear database auth session rows.`);
      await prisma.waAuthSession.deleteMany({
        where: { tenant_id: tenantId },
      });
    },
  };
}
