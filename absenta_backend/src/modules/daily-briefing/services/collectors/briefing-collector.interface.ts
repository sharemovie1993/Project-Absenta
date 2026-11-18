/**
 * briefing-collector.interface.ts
 * Interface Strategy Pattern untuk pengumpul data harian berdasarkan peran/posisi.
 */

import { UniversalBriefingData } from '../../types/briefing.types';

export interface IBriefingCollector {
  /**
   * Mengumpulkan dan mengolah data harian sekolah untuk peran tertentu
   * @param tenantId ID Tenant/Sekolah
   * @param tanggal Format YYYY-MM-DD (opsional, default hari ini)
   * @param targetUserId ID User spesifik (opsional)
   * @param targetEntityId ID Kelas/Jurusan spesifik (opsional)
   */
  collect(
    tenantId: string,
    tanggal?: string,
    targetUserId?: string,
    targetEntityId?: string
  ): Promise<UniversalBriefingData>;
}
