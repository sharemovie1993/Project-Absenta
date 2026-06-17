/**
 * 📋 Job Registry — Auto-Discovery Barrel
 *
 * Import semua job di sini. Setiap job yang di-import akan otomatis
 * mendaftar dirinya ke JobEngine via defineCronJob().
 *
 * Untuk menambah job baru:
 *   1. Buat file src/jobs/namaJob.job.ts dengan export default defineCronJob({...})
 *   2. Tambah 1 baris import di bawah ini
 *   3. SELESAI — job otomatis terjadwal dan muncul di UI
 */

// ── Observability & Maintenance ──────────────────────────────────────────────
import './alert.job';
import './failedJobCleanup.job';
import './logRetention.job';
import './metricAggregation.job';
import './tenantBackupPurge.job';

// ── Risk & Analytics ─────────────────────────────────────────────────────────
import './tenantRisk.job';
import './revenueAggregation.job';
import './revenueForecast.job';       // juga mendaftarkan subJob 'cohort'
import './upgradeIntelligence.job';

// ── Billing & Subscription ────────────────────────────────────────────────────
import './recurringBilling.job';
import './subscriptionRenewal.job';
import './billingHealthScan.job';
import './paymentReconciliation.job';
import './tenantRetention.job';

// ── Trial & Notification ──────────────────────────────────────────────────────
import './trial-reminder.job';
import './trialExpiration.job';
import './trialNotification.job';

// ── Attendance ────────────────────────────────────────────────────────────────
import './attendanceAutoClose.job';
import './attendanceAutoSession.job';
import './attendanceDigest.job';
