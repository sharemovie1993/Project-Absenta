/**
 * Accounting Formatters & Humanizers
 * Mengubah kode teknis / raw UUID database menjadi format pembukuan resmi dan bersahabat bagi pengurus koperasi.
 */

export interface FormattedReference {
  label: string;
  full: string;
  category: 'SAVING' | 'LOAN' | 'VOUCHER' | 'ADJUST' | 'GENERAL';
  badgeClass: string;
}

/**
 * Format nomor referensi transaksi agar ramah dibaca manusia (bebas raw UUID 36 karakter)
 */
export function formatAccountingReference(rawRef?: string | null): FormattedReference {
  if (!rawRef || rawRef.trim() === '') {
    return {
      label: '-',
      full: '-',
      category: 'GENERAL',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  }

  const trimmed = rawRef.trim();

  // 1. Kas Masuk / Kas Keluar / Transfer (BKM, BKK, TRF)
  if (trimmed.startsWith('BKM-') || trimmed.startsWith('BKK-') || trimmed.startsWith('TRF-')) {
    return {
      label: trimmed,
      full: trimmed,
      category: 'VOUCHER',
      badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    };
  }

  // 2. Ayat Jurnal Penyesuaian (AJP)
  if (trimmed.startsWith('AJP-')) {
    return {
      label: trimmed,
      full: trimmed,
      category: 'ADJUST',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }

  // 3. Pencairan Pinjaman (LN-DISB-{uuid})
  if (trimmed.startsWith('LN-DISB-')) {
    const rawUuid = trimmed.replace('LN-DISB-', '');
    const shortCode = rawUuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      label: `CAIR-${shortCode}`,
      full: trimmed,
      category: 'LOAN',
      badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    };
  }

  // 4. Pembayaran Angsuran Pinjaman (LN-REP-{uuid})
  if (trimmed.startsWith('LN-REP-')) {
    const rawUuid = trimmed.replace('LN-REP-', '');
    const shortCode = rawUuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      label: `ANGS-${shortCode}`,
      full: trimmed,
      category: 'LOAN',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    };
  }

  // 5. Simpanan / Tabungan (SAV-INIT-{uuid} atau SAV-{uuid})
  if (trimmed.startsWith('SAV-')) {
    const isInit = trimmed.startsWith('SAV-INIT-');
    const rawUuid = trimmed.replace('SAV-INIT-', '').replace('SAV-', '');
    const shortCode = rawUuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      label: isInit ? `AWAL-${shortCode}` : `SIMP-${shortCode}`,
      full: trimmed,
      category: 'SAVING',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    };
  }

  // 6. Penjualan Toko / POS (POS-{uuid})
  if (trimmed.startsWith('POS-')) {
    const rawUuid = trimmed.replace('POS-', '');
    const shortCode = rawUuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      label: `POS-${shortCode}`,
      full: trimmed,
      category: 'GENERAL',
      badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    };
  }

  // 7. Jika mengandung UUID panjang umum (mis: 8-4-4-4-12)
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidRegex.test(trimmed)) {
    const match = trimmed.match(uuidRegex);
    if (match) {
      const short = match[0].slice(0, 8).toUpperCase();
      const prefix = trimmed.split(match[0])[0];
      return {
        label: `${prefix}${short}`,
        full: trimmed,
        category: 'GENERAL',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
    }
  }

  return {
    label: trimmed,
    full: trimmed,
    category: 'GENERAL',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
}

/**
 * Humanisasi keterangan teknis developer ke bahasa akuntansi koperasi
 */
export function humanizeAccountingDescription(desc?: string | null): string {
  if (!desc) return '-';

  return desc
    // Prefix bahasa inggris developer
    .replace(/^DEPOSIT\s*-\s*/i, 'Setoran ')
    .replace(/^WITHDRAWAL\s*-\s*/i, 'Penarikan ')
    .replace(/^WITHDRAW\s*-\s*/i, 'Penarikan ')
    .replace(/^DISBURSEMENT\s*-\s*/i, 'Pencairan Pinjaman ')
    .replace(/^REPAYMENT\s*-\s*/i, 'Pembayaran Angsuran ')
    // Tagging kurung siku
    .replace(/\[AJP\]/gi, '[Penyesuaian]')
    .replace(/\[BKM\]/gi, '[Kas Masuk]')
    .replace(/\[BKK\]/gi, '[Kas Keluar]')
    .replace(/\[TRF\]/gi, '[Pindah Kas]');
}
