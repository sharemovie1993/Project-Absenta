/**
 * 🚀 Scheduler Initializer
 *
 * Memulai semua background job yang terdaftar via JobEngine.
 * Untuk menambah job baru: cukup edit src/jobs/_registry.ts — tidak perlu menyentuh file ini.
 */
import '../../jobs/_registry';              // load semua job → mendaftar otomatis ke engine
import { jobEngine } from '../jobEngine';
import { initWorkerAutoscaler } from '../worker-autoscaler.service';
import { getInfraQueue } from '../../queues/infra.queue';

export async function initSchedulers(_fastify: any) {
  // Mulai semua job yang sudah terdaftar di _registry
  await jobEngine.startAll();

  // Autoheal watchdog — cek kesehatan worker setiap 10 detik
  const q = getInfraQueue();
  setInterval(() => {
    void q.add(
      'autoheal-watchdog',
      { ts: Date.now() },
      { jobId: `autoheal_${Math.floor(Date.now() / 10000)}` }
    );
  }, 10000);

  // Autoscaler worker
  initWorkerAutoscaler();
}
