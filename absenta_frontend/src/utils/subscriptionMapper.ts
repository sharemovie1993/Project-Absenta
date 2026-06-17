import { differenceInDays, isValid, format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface SubscriptionUIState {
  // Data Mentah (tetap disertakan jika butuh akses langsung)
  original: any;
  
  // Display Values (Aman untuk UI)
  displayStatus: string;         // Label status (e.g., "Aktif", "Kedaluwarsa")
  displayStatusBadge: string;    // Kelas CSS untuk badge
  effectiveStatus: string;       // Status code yang sudah dinormalisasi (ACTIVE, EXPIRED, etc.)
  displayDaysLeft: string;       // String "0", "30", dst.
  displayEndDate: string;        // Tanggal berakhir terformat
  displayNextBilling: string;    // Tanggal tagihan berikutnya
  displayPlanName: string;       // Nama paket
  displayPrice: string;          // Harga terformat

  // Logic Values (Untuk kondisi rendering)
  isExpired: boolean;            // True jika status EXPIRED
  isTrial: boolean;              // True jika status TRIAL
  isActive: boolean;             // True jika status ACTIVE
  isPendingPayment: boolean;     // True jika status PENDING_PAYMENT
  daysLeftInt: number;           // Integer sisa hari (selalu >= 0)
  progressPercent: number;       // 0-100 untuk progress bar
  progressColor: string;         // Kelas warna tailwind (bg-red-500, etc.)
  
  // Action States
  canAutoRenew: boolean;         // Apakah tombol auto-renew boleh aktif?
  isAutoRenewOn: boolean;        // State toggle saat ini
  autoRenewLabel: string;        // Label toggle
}

/**
 * MENGUBAH DATA SUBSCRIPTION MENJADI UI STATE YANG AMAN
 * 
 * Aturan:
 * 1. Tidak boleh ada negative days
 * 2. Status EXPIRED harus tegas (days = 0, progress = 100% red)
 * 3. Auto Renew disabled jika Expired
 */
export const mapSubscriptionToUI = (sub: any, lastInvoiceStatus?: string, hasPaymentSuccess?: boolean): SubscriptionUIState => {
  if (!sub) {
    return createEmptyState();
  }

  let statusRaw = String(sub.status || '').toUpperCase();

  // Override status logic based on payment (Matches frontend optimization)
  if (lastInvoiceStatus) {
     const invStatus = String(lastInvoiceStatus).toUpperCase();
     if ((statusRaw === 'PENDING_PAYMENT' || statusRaw === 'TRIAL') && (invStatus === 'PAID' || hasPaymentSuccess === true)) {
       statusRaw = 'ACTIVE';
     }
  }

  const endDateStr = sub.end_date;
  const startDateStr = sub.start_date;
  
  // 1. Hitung Hari
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let endDate = endDateStr ? new Date(endDateStr) : null;
  let startDate = startDateStr ? new Date(startDateStr) : null;
  
  // Validasi tanggal
  if (endDate && !isValid(endDate)) endDate = null;
  if (startDate && !isValid(startDate)) startDate = null;
  
  if (endDate) endDate.setHours(0, 0, 0, 0);

  let daysLeftRaw = 0;
  if (endDate) {
    daysLeftRaw = differenceInDays(endDate, today);
  }

  // CLAMPING: Hari tidak boleh negatif untuk display
  const daysLeftInt = Math.max(0, daysLeftRaw);
  
  // Jika status EXPIRED, paksa 0
  const effectiveDays = statusRaw === 'EXPIRED' ? 0 : daysLeftInt;

  // 2. Hitung Progress Bar
  let progressPercent = 0;
  if (statusRaw === 'EXPIRED') {
    progressPercent = 100;
  } else if (startDate && endDate) {
    const totalDuration = differenceInDays(endDate, startDate);
    const safeTotal = Math.max(1, totalDuration); // Hindari divisi by zero
    const elapsed = safeTotal - daysLeftRaw; // Raw dipakai untuk akurasi durasi berjalan
    // Clamping percent 0-100
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / safeTotal) * 100)));
    
    // Invert logic? Biasanya progress bar = "masa terpakai".
    // User request: "Expired = 100%". Berarti 100% = Habis.
    // Jadi rumus (elapsed / total) * 100 sudah benar.
    
    // Namun di kode lama: Math.round((left/total)*100) -> ini sisa!
    // User bilang "Progress bar 0% memberi kesan baru mulai, padahal sudah berakhir".
    // Berarti User ingin: 100% = Selesai/Habis.
    // Kode lama menghitung pct = (left/total)*100. Jika left=0, pct=0. Ini salah persepsi user.
    // KITA UBAH: Progress bar menunjukkan "Waktu Terpakai".
    // 0% = Baru mulai. 100% = Habis.
    
    // Tunggu, kode lama:
    // const pct = Math.max(0, Math.min(100, Math.round((left/total)*100)));
    // Jika left (sisa) = 30, total = 30 -> 100%.
    // Jadi kode lama adalah "Battery Level" (Penuh = Baru, Kosong = Habis).
    // User complaint: "Progress bar 0% ... kesan baru mulai".
    // Berarti user melihat bar KOSONG (0 width) saat expired.
    // User ingin EXPIRED = 100% width (FULL MERAH).
    
    // Jadi:
    // Mode "Battery" (Sisa): Start=100%, End=0%.
    // Mode "Timeline" (Berjalan): Start=0%, End=100%.
    
    // User request: "Untuk EXPIRED: Progress bar = 100% ... Label = Masa berlaku telah berakhir".
    // Ini ambigu. Jika 100% penuh merah, berarti "Timeline sudah penuh".
    // Mari kita pakai logika Timeline: Semakin lama, semakin penuh.
    
    progressPercent = Math.min(100, Math.max(0, Math.round(((safeTotal - daysLeftInt) / safeTotal) * 100)));
    
    // KOREKSI: Kode lama memakai "left/total". Jadi logic lama adalah "Battery".
    // User ingin visualisasi "Habis" itu "Jelas" (Merah).
    // Jika kita ubah jadi Timeline (makin penuh), maka logic harus dibalik.
    // Mari kita set:
    // EXPIRED = 100% (Penuh Merah).
    // ACTIVE (Baru) = 0% atau 100%?
    // Biasanya "Sisa Kuota" itu makin sedikit makin habis (100 -> 0).
    // Tapi user bilang "0% memberi kesan baru mulai". Ini indikasi user menganggap bar itu "Timeline Berjalan".
    // Jadi kita akan pakai logika TIMELINE: 0% (Start) -> 100% (End).
    
    // Recalculate for Timeline Logic:
    const daysElapsed = Math.max(0, safeTotal - daysLeftInt);
    progressPercent = Math.round((daysElapsed / safeTotal) * 100);
  } else {
    progressPercent = 0; // Default fallback
  }

  // Override explicit request
  if (statusRaw === 'EXPIRED' || statusRaw === 'TRIAL_END') progressPercent = 100;

  // 3. Tentukan Warna & Badge
  let progressColor = 'bg-blue-500';
  let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
  let statusLabel = statusRaw;

  switch (statusRaw) {
    case 'ACTIVE':
      statusLabel = 'Aktif';
      badgeClass = 'bg-green-100 text-green-800 border-green-200';
      progressColor = effectiveDays <= 7 ? 'bg-orange-500' : 'bg-green-500';
      break;
    case 'TRIAL':
      statusLabel = 'Masa Percobaan';
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
      progressColor = 'bg-blue-500';
      break;
    case 'TRIAL_END':
      statusLabel = 'Masa Percobaan Berakhir';
      badgeClass = 'bg-red-100 text-red-800 border-red-200';
      progressColor = 'bg-red-500';
      break;
    case 'EXPIRED':
      statusLabel = 'Kedaluwarsa';
      badgeClass = 'bg-red-100 text-red-800 border-red-200';
      progressColor = 'bg-red-500';
      break;
    case 'PENDING_PAYMENT':
      statusLabel = 'Menunggu Pembayaran';
      badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      progressColor = 'bg-yellow-500';
      break;
    case 'SUSPENDED':
      statusLabel = 'Ditangguhkan';
      badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
      progressColor = 'bg-slate-500';
      break;
  }

  // 4. Auto Renew Logic
  const isAutoRenewOn = !!sub.auto_renew;
  const canAutoRenew = statusRaw !== 'EXPIRED' && statusRaw !== 'CANCELLED';
  
  let autoRenewLabel = isAutoRenewOn ? 'Aktif' : 'Non-aktif';
  if (statusRaw === 'EXPIRED') {
    autoRenewLabel = 'Nonaktif (langganan telah berakhir)';
  }

  return {
    original: sub,
    displayStatus: statusLabel,
    displayStatusBadge: badgeClass,
    effectiveStatus: statusRaw,
    displayDaysLeft: String(effectiveDays),
    displayEndDate: formatDate(endDate),
    displayNextBilling: formatDate(sub.next_billing_date),
    displayPlanName: sub.plan?.name || sub.Plan?.name || '-',
    displayPrice: formatCurrency(sub.plan?.price_monthly || sub.Plan?.price_monthly || 0),
    
    isExpired: statusRaw === 'EXPIRED',
    isTrial: statusRaw === 'TRIAL',
    isActive: statusRaw === 'ACTIVE',
    isPendingPayment: statusRaw === 'PENDING_PAYMENT',
    
    daysLeftInt: effectiveDays,
    progressPercent,
    progressColor,
    
    canAutoRenew,
    isAutoRenewOn: statusRaw === 'EXPIRED' ? false : isAutoRenewOn,
    autoRenewLabel
  };
};

const createEmptyState = (): SubscriptionUIState => ({
  original: null,
  displayStatus: '-',
  displayStatusBadge: '',
  effectiveStatus: '-',
  displayDaysLeft: '-',
  displayEndDate: '-',
  displayNextBilling: '-',
  displayPlanName: '-',
  displayPrice: '-',
  isExpired: false,
  isTrial: false,
  isActive: false,
  isPendingPayment: false,
  daysLeftInt: 0,
  progressPercent: 0,
  progressColor: '',
  canAutoRenew: false,
  isAutoRenewOn: false,
  autoRenewLabel: '-'
});

// Helper simple formatting
const formatCurrency = (val: any) => {
  const num = Number(val);
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const formatDate = (d: any) => {
  if (!d) return '-';
  const date = new Date(d);
  if (!isValid(date)) return '-';
  return format(date, 'd MMMM yyyy', { locale: id });
};
