/**
 * @deprecated Semua billing jobs sekarang didaftarkan otomatis via src/jobs/_registry.ts
 * File ini dipertahankan untuk backward compatibility jika ada yang masih import.
 */
export async function startBillingSchedulers(_fastify?: any): Promise<void> {
  // No-op: semua job sudah di-register via JobEngine di _registry.ts
}
