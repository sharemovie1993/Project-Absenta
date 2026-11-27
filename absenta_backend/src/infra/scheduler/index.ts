/**
 * 🚀 Scheduler Initializer
 *
 * Memulai semua background job yang terdaftar via JobEngine.
 * Untuk menambah job baru: cukup edit src/jobs/_registry.ts — tidak perlu menyentuh file ini.
 */
import '../../jobs/_registry';              // load semua job → mendaftar otomatis ke engine
import { jobEngine } from '../jobEngine';

export async function initSchedulers(_fastify: any) {
  // Mulai semua job yang sudah terdaftar di _registry
  await jobEngine.startAll();
}
