import { PrismaClient, PaymentGateway, PaymentMethod, PaymentStatus, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { AbsenStatus } from '../../src/constants/enums';

const prisma = new PrismaClient();

type Mode = 'seed' | 'cleanup';

function envInt(name: string, fallback: number): number {
  const raw = Number.parseInt(String(process.env[name] ?? ''), 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function envStr(name: string, fallback: string): string {
  const v = String(process.env[name] ?? '').trim();
  return v ? v : fallback;
}

function chunk<T>(rows: T[], size: number): T[][] {
  if (size <= 0) return [rows];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function randomAmount(): number {
  const min = 10000;
  const max = 10000000;
  const value = min + Math.random() * (max - min);
  return Math.round(value * 100) / 100;
}

const SEED_TAG = 'PHASE5A_SIM';
const TENANT_NAME_PREFIX = 'SIM_TENANT_PHASE5A_';
const TENANT_DOMAIN_PREFIX = 'sim-phase5a-';

async function seed(): Promise<void> {
  const tenantsTarget = envInt('TENANTS', 100);
  const invoicesTarget = envInt('INVOICES', 20000);
  const paymentsTarget = envInt('PAYMENTS', 20000);
  const systemEventTarget = envInt('SYSTEM_EVENT_LOG', 200000);
  const metricsTarget = envInt('AGG_METRICS', 100000);
  const riskEventTarget = envInt('RISK_EVENTS', 20000);
  const academicPerTenant = envInt('ACADEMIC_PER_TENANT', 50);
  const attendancePerTenant = envInt('ATTENDANCE_PER_TENANT', 200);

  const batchSize = envInt('BATCH_SIZE', 2000);

  console.log('[SEED][INIT] Starting performance simulator seeding with config', {
    tenantsTarget,
    invoicesTarget,
    paymentsTarget,
    systemEventTarget,
    metricsTarget,
    riskEventTarget,
    academicPerTenant,
    attendancePerTenant,
    batchSize,
  });

  const now = new Date();
  const sixMonthsAgoRaw = new Date(now.getTime());
  sixMonthsAgoRaw.setMonth(sixMonthsAgoRaw.getMonth() - 6);
  const sixMonthsAgo = utcDateOnly(sixMonthsAgoRaw);
  const todayUtc = utcDateOnly(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDaySpan = Math.max(1, Math.floor((todayUtc.getTime() - sixMonthsAgo.getTime()) / dayMs));
  const baseMetricDateIso = sixMonthsAgo.toISOString().slice(0, 10);

  console.log('[SEED][PLAN] Fetching active public plans for simulation');
  let seedPlans = await prisma.plan.findMany({
    where: { is_active: true, is_public: true },
    select: { id: true, price_monthly: true },
    orderBy: { price_monthly: 'asc' as any },
  });

  if (!seedPlans.length) {
    console.log('[SEED][PLAN] No public plans found, falling back to first active plan');
    const fallbackPlan = await prisma.plan.findFirst({
      where: { is_active: true },
      select: { id: true, price_monthly: true },
      orderBy: { created_at: 'asc' as any },
    });
    if (!fallbackPlan?.id) throw new Error('No active plan found');
    seedPlans = [fallbackPlan];
  }

  console.log('[SEED][PLAN] Plans selected for simulation', {
    totalPlans: seedPlans.length,
  });

  const guruRole = await prisma.role.findFirst({
    where: { name: 'GURU' },
    select: { id: true },
  });
  if (!guruRole?.id) throw new Error('GURU role not found');

  const createdTenants: Array<{ id: string; name: string; domain: string }> = [];
  for (let i = 0; i < tenantsTarget; i += 1) {
    const n = String(i + 1).padStart(4, '0');
    createdTenants.push({ id: `phase5a-sim-tenant-${n}`, name: `${TENANT_NAME_PREFIX}${n}`, domain: `${TENANT_DOMAIN_PREFIX}${n}.local` });
  }

  console.log('[SEED][TENANT] Creating simulated tenants', { totalTenants: createdTenants.length });
  for (const batch of chunk(createdTenants, batchSize)) {
    await prisma.tenant.createMany({
      data: batch.map((t) => ({ id: t.id, name: t.name, domain: t.domain, status: 'ACTIVE' })),
      skipDuplicates: true,
    });
  }

  const tenantIds = (
    await prisma.tenant.findMany({
      where: { domain: { startsWith: TENANT_DOMAIN_PREFIX } },
      select: { id: true },
      orderBy: { id: 'asc' as any },
    })
  ).map((t) => t.id);

  console.log('[SEED][SUBSCRIPTION] Preparing subscriptions for tenants', { totalTenants: tenantIds.length });
  const expiryOffsetsMs = [
    5 * 60 * 1000,
    15 * 60 * 1000,
    30 * 60 * 1000,
    60 * 60 * 1000,
    2 * 60 * 60 * 1000,
    6 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000,
    1 * dayMs,
    3 * dayMs,
    7 * dayMs,
    14 * dayMs,
    30 * dayMs,
  ];
  console.log('[SEED][SUBSCRIPTION] Expiry scenarios from now (ms)', { expiryOffsetsMs });
  const subRows = tenantIds.map((tenantId, index) => {
    const plan = seedPlans[index % seedPlans.length];
    const priceMonthly = Number(plan.price_monthly || 0);
    const offsetMs = expiryOffsetsMs[index % expiryOffsetsMs.length];
    const endDate = new Date(now.getTime() + offsetMs);
    const nextBillingDate = new Date(endDate.getTime());
    return {
      id: `phase5a-sim-subscription-${tenantId}`,
      tenant_id: tenantId,
      plan_id: plan.id,
      start_date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      end_date: endDate,
      status: SubscriptionStatus.ACTIVE,
      auto_renew: true,
      next_billing_date: nextBillingDate,
      price_snapshot: priceMonthly,
    };
  });

  for (const batch of chunk(subRows, batchSize)) {
    await prisma.subscription.createMany({ data: batch as any, skipDuplicates: true });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { tenant_id: { in: tenantIds }, status: SubscriptionStatus.ACTIVE },
    select: { id: true, tenant_id: true },
    orderBy: [{ tenant_id: 'asc' as any }, { created_at: 'asc' as any }],
  });
  const subIdByTenant = new Map(subscriptions.map((s) => [s.tenant_id, s.id]));

  console.log('[SEED][ACADEMIC] Seeding academic and attendance data per tenant');
  const academicLogs: { tenants: number; jurusan: number; kelas: number; mapel: number; guru: number; siswa: number; jadwal: number; siswaAkademik: number } = {
    tenants: tenantIds.length,
    jurusan: 0,
    kelas: 0,
    mapel: 0,
    guru: 0,
    siswa: 0,
    jadwal: 0,
    siswaAkademik: 0,
  };

  const attendanceLogs: { sesi: number; absenSiswa: number; absenGerbang: number; absenGuru: number } = {
    sesi: 0,
    absenSiswa: 0,
    absenGerbang: 0,
    absenGuru: 0,
  };

  const invoicesPerTenant = Math.floor(invoicesTarget / Math.max(1, tenantIds.length));
  const remainingInvoices = invoicesTarget - invoicesPerTenant * tenantIds.length;

  const billings: any[] = [];
  const invoices: any[] = [];
  const payments: any[] = [];

  const baseBillingDate = sixMonthsAgo;
  let invoiceCounter = 1;
  let paymentCounter = 0;

  for (let tIndex = 0; tIndex < tenantIds.length; tIndex += 1) {
    const tenantId = tenantIds[tIndex];
    const subId = subIdByTenant.get(tenantId);
    if (!subId) continue;

    const perTenant = invoicesPerTenant + (tIndex < remainingInvoices ? 1 : 0);

    const jurusanId = `sim-jurusan-${tenantId}`;
    const kelasId = `sim-kelas-${tenantId}`;
    const mapelId = `sim-mapel-${tenantId}`;
    const guruId = `sim-guru-${tenantId}`;
    const siswaId = `sim-siswa-${tenantId}`;
    const tahunPelajaranId = `sim-tahunpel-${tenantId}`;
    const semesterId = `sim-semester-${tenantId}`;
    const sekolahId = `sim-sekolah-${tenantId}`;

    await prisma.$executeRawUnsafe(
      `
      insert into "TahunPelajaran" (id, tenant_id, tahun, is_active, created_at, updated_at)
      values ($1, $2, '2025/2026', true, now(), now())
      on conflict (id) do nothing;
      `,
      tahunPelajaranId,
      tenantId
    );

    await prisma.$executeRawUnsafe(
      `
      insert into "Semester" (id, tenant_id, nama_semester, tahun_pelajaran_id, is_active, created_at, updated_at)
      values ($1, $2, 'Ganjil', $3, true, now(), now())
      on conflict (id) do nothing;
      `,
      semesterId,
      tenantId,
      tahunPelajaranId
    );

    await prisma.$executeRawUnsafe(
      `
      insert into "Sekolah" (id, tenant_id, nama, created_at, updated_at)
      values ($1, $2, 'Sekolah Simulasi', now(), now())
      on conflict (id) do nothing;
      `,
      sekolahId,
      tenantId
    );

    await prisma.$executeRawUnsafe(
      `
      insert into "Jurusan" (id, tenant_id, nama, kode, created_at, updated_at)
      values ($1, $2, 'Teknik Simulasi', 'SIM', now(), now())
      on conflict (id) do nothing;
      `,
      jurusanId,
      tenantId
    );

    await prisma.$executeRawUnsafe(
      `
      insert into "Kelas" (id, tenant_id, nama_kelas, tingkat, jurusan_id, created_at, updated_at)
      values ($1, $2, 'X SIM 1', 10, $3, now(), now())
      on conflict (id) do nothing;
      `,
      kelasId,
      tenantId,
      jurusanId
    );

    await prisma.$executeRawUnsafe(
      `
      insert into "Mapel" (id, tenant_id, nama_mapel, kode_mapel, created_at, updated_at)
      values ($1, $2, 'Simulasi Pemrograman', 'SIMPROG', now(), now())
      on conflict (id) do nothing;
      `,
      mapelId,
      tenantId
    );

    const guruUserEmail = `sim-guru-${tenantId}@sim.local`;
    const guruUser = await prisma.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: tenantId,
          email: guruUserEmail,
        },
      },
      update: {},
      create: {
        tenant_id: tenantId,
        email: guruUserEmail,
        password: 'SIMULATED_HASH',
        full_name: 'Guru Simulasi',
        role_id: guruRole.id,
        status: 'ACTIVE',
      },
    });

    await prisma.guru.upsert({
      where: { id: guruId },
      update: {
        tenant_id: tenantId,
        user_id: guruUser.id,
        nama_guru: 'Guru Simulasi',
      },
      create: {
        id: guruId,
        tenant_id: tenantId,
        user_id: guruUser.id,
        nama_guru: 'Guru Simulasi',
      },
    });

    await prisma.siswa.upsert({
      where: { id: siswaId },
      update: {
        tenant_id: tenantId,
        nama_siswa: 'Siswa Simulasi',
        nis: `SIM-${tenantId}`,
        jenis_kelamin: 'L',
        status: 'AKTIF',
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      },
      create: {
        id: siswaId,
        tenant_id: tenantId,
        nama_siswa: 'Siswa Simulasi',
        nis: `SIM-${tenantId}`,
        jenis_kelamin: 'L',
        status: 'AKTIF',
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      },
    });

    academicLogs.jurusan += 1;
    academicLogs.kelas += 1;
    academicLogs.mapel += 1;
    academicLogs.guru += 1;
    academicLogs.siswa += 1;

    const siswaAkademikId = `sim-siswa-akademik-${tenantId}`;
    await prisma.siswaAkademik.upsert({
      where: { id: siswaAkademikId },
      update: {
        siswa_id: siswaId,
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        status: 'AKTIF',
      },
      create: {
        id: siswaAkademikId,
        siswa_id: siswaId,
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        status: 'AKTIF',
      },
    });
    academicLogs.siswaAkademik += 1;

    let sesiPerTenant = 0;
    let absenPerTenant = 0;
    let gatePerTenant = 0;
    let absenGuruPerTenant = 0;
    for (let j = 0; j < perTenant; j += 1) {
      const billingDate = new Date(baseBillingDate.getTime() + (invoiceCounter % totalDaySpan) * dayMs);
      const dateKey = billingDate.toISOString().slice(0, 10);
      const billingId = `phase5a-sim-billing-${tenantId}-${dateKey}`;
      const invoiceId = `phase5a-sim-invoice-${tenantId}-${dateKey}`;
      const dueDate = new Date(billingDate.getTime() + 3 * 24 * 60 * 60 * 1000);
      const periodStart = billingDate;
      const periodEnd = new Date(billingDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const billingAmount = randomAmount();
      billings.push({
        id: billingId,
        tenant_id: tenantId,
        subscription_id: subId,
        amount: billingAmount,
        charge_type: 'RECURRING',
        status: 'UNPAID',
        billing_date: billingDate,
      });

      const status = invoiceCounter % 10 === 0 ? InvoiceStatus.OVERDUE : InvoiceStatus.PAID;
      const paidAt = status === InvoiceStatus.PAID ? new Date(dueDate.getTime() + 2 * 60 * 60 * 1000) : null;

      const invoiceAmount = randomAmount();
      invoices.push({
        id: invoiceId,
        tenant_id: tenantId,
        billing_id: billingId,
        subscription_id: subId,
        invoice_number: `PHASE5A-${tenantId}-${dateKey}`,
        amount: invoiceAmount,
        subtotal_amount: invoiceAmount,
        total_amount: invoiceAmount,
        currency: 'IDR',
        status,
        issue_date: billingDate,
        due_date: dueDate,
        period_start: periodStart,
        period_end: periodEnd,
        paid_at: paidAt,
      });

      if (paymentCounter < paymentsTarget) {
        const payStatus = status === InvoiceStatus.PAID ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
        const paymentAmount = randomAmount();
        payments.push({
          id: `phase5a-sim-payment-${invoiceId}`,
          tenant_id: tenantId,
          billing_id: billingId,
          gateway: PaymentGateway.TRIPAY,
          payment_method: PaymentMethod.QRIS,
          amount: paymentAmount,
          currency: 'IDR',
          status: payStatus,
          created_at: billingDate,
          updated_at: billingDate,
          invoice_id: invoiceId,
        });
        paymentCounter += 1;
      }

      if (sesiPerTenant < academicPerTenant || absenPerTenant < attendancePerTenant) {
        const sesiId = `sim-sesi-${tenantId}-${dateKey}-${j}`;
        await prisma.$executeRawUnsafe(
          `
          insert into "SesiAbsensi" (id, tenant_id, kelas_id, semester_id, tahun_pelajaran_id, tanggal, waktu_mulai, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6::timestamptz, $6::timestamptz, now(), now())
          on conflict (id) do nothing;
          `,
          sesiId,
          tenantId,
          kelasId,
          semesterId,
          tahunPelajaranId,
          billingDate.toISOString()
        );

        sesiPerTenant += 1;

        const statuses: AbsenStatus[] = [AbsenStatus.HADIR, AbsenStatus.SAKIT, AbsenStatus.IZIN, AbsenStatus.ALPA];
        const statusIndex = (j + tIndex) % statuses.length;
        const status = statuses[statusIndex];

        await prisma.$executeRawUnsafe(
          `
          insert into "AbsenSiswa" (id, tenant_id, sesi_id, siswa_id, siswa_akademik_id, status, waktu_tap, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7::timestamptz, now(), now())
          on conflict (id) do nothing;
          `,
          `sim-absen-siswa-${tenantId}-${dateKey}-${j}`,
          tenantId,
          sesiId,
          siswaId,
          siswaAkademikId,
          status,
          billingDate.toISOString()
        );
        absenPerTenant += 1;

        const sesiGerbangId = `sim-sesi-gerbang-${tenantId}-${dateKey}-${j}`;
        await prisma.$executeRawUnsafe(
          `
          insert into "SesiGerbang" (id, tenant_id, sekolah_id, tanggal, waktu_mulai)
          values ($1, $2, $3, $4::timestamptz, $4::timestamptz)
          on conflict (id) do nothing;
          `,
          sesiGerbangId,
          tenantId,
          sekolahId,
          billingDate.toISOString()
        );

        await prisma.$executeRawUnsafe(
          `
          insert into "AbsenGerbangSiswa" (id, tenant_id, sesi_gerbang_id, siswa_id, arah, status, waktu_tap, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7::timestamptz, now(), now())
          on conflict (id) do nothing;
          `,
          `sim-absen-gate-${tenantId}-${dateKey}-${j}`,
          tenantId,
          sesiGerbangId,
          siswaId,
          'MASUK',
          status,
          billingDate.toISOString()
        );
        gatePerTenant += 1;

        await prisma.$executeRawUnsafe(
          `
          insert into "AbsenGuru" (id, tenant_id, sesi_id, guru_id, status, waktu_tap, tahun_pelajaran_id, semester_id, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, now(), now())
          on conflict (id) do nothing;
          `,
          `sim-absen-guru-${tenantId}-${dateKey}-${j}`,
          tenantId,
          sesiId,
          guruId,
          status,
          billingDate.toISOString(),
          tahunPelajaranId,
          semesterId
        );
        absenGuruPerTenant += 1;
      }

      invoiceCounter += 1;
    }

    attendanceLogs.sesi += sesiPerTenant;
    attendanceLogs.absenSiswa += absenPerTenant;
    attendanceLogs.absenGerbang += gatePerTenant;
    attendanceLogs.absenGuru += absenGuruPerTenant;
  }

  console.log('[SEED][BILLING] Inserting billing, invoice, and payment records', {
    billings: billings.length,
    invoices: invoices.length,
    payments: payments.length,
  });
  for (const batch of chunk(billings, batchSize)) {
    await prisma.billing.createMany({ data: batch as any, skipDuplicates: true });
  }
  for (const batch of chunk(invoices, batchSize)) {
    await prisma.invoice.createMany({ data: batch as any, skipDuplicates: true });
  }
  for (const batch of chunk(payments, batchSize)) {
    await prisma.payment.createMany({ data: batch as any, skipDuplicates: true });
  }

  const tenantMapCte = `
    tenant_map as (
      select id as tenant_id, row_number() over (order by id) as rn
      from "Tenant"
      where domain like '${TENANT_DOMAIN_PREFIX.replace(/'/g, "''")}%'
    )
  `;

  if (systemEventTarget > 0) {
    console.log('[SEED][METRIC] Seeding system event logs', { systemEventTarget });
    await prisma.$executeRawUnsafe(`
      with ${tenantMapCte}
      insert into "SystemEventLog" (
        id, event_type, domain, entity_type, entity_id, tenant_id, severity, metadata, correlation_id, created_at
      )
      select
        ('sim-systemevent-' || gs.i::text),
        case when (gs.i % 5)=0 then 'CRON_EXECUTED' when (gs.i % 5)=1 then 'QUEUE_JOB_FAILED' when (gs.i % 5)=2 then 'PAYMENT_WEBHOOK_PROCESSED' when (gs.i % 5)=3 then 'INVOICE_OVERDUE' else 'RISK_CALCULATED' end,
        case when (gs.i % 3)=0 then 'CRON' when (gs.i % 3)=1 then 'QUEUE' else 'PAYMENT' end,
        'SIM',
        ('sim-' || gs.i::text),
        (select tenant_id from tenant_map where rn = ((gs.i - 1) % (select count(*) from tenant_map) + 1)),
        case when (gs.i % 20)=0 then 'ERROR' else 'INFO' end,
        jsonb_build_object('seed_tag','${SEED_TAG}','i',gs.i),
        null,
        now() - ((gs.i % 30) || ' days')::interval
      from generate_series(1, ${systemEventTarget}) as gs(i)
      on conflict (id) do nothing;
    `);
  }

  if (metricsTarget > 0) {
    console.log('[SEED][METRIC] Seeding aggregated daily metrics', { metricsTarget });
    const metricKeys = ["total_event_count", "total_error_count", "payment_failure_count", "invoice_overdue_count", "subscription_active_count"];
    await prisma.$executeRawUnsafe(`
      with ${tenantMapCte},
      params as (
        select ${tenantIds.length}::int as tenants, ${metricKeys.length}::int as keys
      ),
      seq as (
        select gs.i as i,
               ((gs.i - 1) % (select tenants from params)) + 1 as tenant_rn,
               (((gs.i - 1) / (select tenants from params)) % ${totalDaySpan}) as day_idx,
               (((gs.i - 1) / ((select tenants from params) * 365)) % (select keys from params)) as key_idx
        from generate_series(1, ${metricsTarget}) as gs(i)
      )
      insert into aggregated_metric_daily (id, date, tenant_id, metric_key, value, created_at, updated_at)
      select
        ('phase5a-sim-aggmetric-' || seq.tenant_rn::text || '-' || seq.day_idx::text || '-' || (seq.key_idx + 1)::text),
        (date '${baseMetricDateIso}' + (seq.day_idx || ' days')::interval)::date,
        (select tenant_id from tenant_map where rn = seq.tenant_rn),
        (array['${metricKeys.join("','")}'])[seq.key_idx + 1],
        (seq.i % 10000)::float,
        now(),
        now()
      from seq
      on conflict (date, tenant_id, metric_key) do nothing;
    `);
  }

  if (riskEventTarget > 0) {
    console.log('[SEED][RISK] Seeding tenant risk events', { riskEventTarget });
    await prisma.$executeRawUnsafe(`
      with ${tenantMapCte}
      insert into tenant_risk_event (id, tenant_id, event_type, severity, metric_value, metadata, created_at)
      select
        ('sim-riskevent-' || gs.i::text),
        (select tenant_id from tenant_map where rn = ((gs.i - 1) % (select count(*) from tenant_map) + 1)),
        case when (gs.i % 3)=0 then 'RISK_LEVEL_CHANGED' when (gs.i % 3)=1 then 'INVOICE_OVERDUE_SPIKE' else 'PAYMENT_FAILURE_SPIKE' end,
        (case when (gs.i % 10)=0 then 'HIGH' when (gs.i % 5)=0 then 'MEDIUM' else 'LOW' end)::"TenantRiskEventSeverity",
        (gs.i % 100)::float,
        jsonb_build_object('seed_tag','${SEED_TAG}','i',gs.i),
        now() - ((gs.i % 30) || ' days')::interval
      from generate_series(1, ${riskEventTarget}) as gs(i)
      on conflict (id) do nothing;
    `);
  }

  console.log('[SEED][RISK] Seeding tenant risk score logs');
  await prisma.$executeRawUnsafe(`
    with ${tenantMapCte}
    insert into tenant_risk_score_log (id, tenant_id, risk_score, risk_level, created_at)
    select
      ('sim-riskscorelog-' || tenant_map.rn::text),
      tenant_map.tenant_id,
      (tenant_map.rn % 100),
      (case when (tenant_map.rn % 20)=0 then 'CRITICAL' when (tenant_map.rn % 10)=0 then 'HIGH_RISK' when (tenant_map.rn % 5)=0 then 'WARNING' else 'HEALTHY' end)::"TenantRiskLevel",
      now() - (tenant_map.rn % 30 || ' days')::interval
    from tenant_map
    on conflict do nothing;
  `);

  console.log('[SEED][REVENUE] Seeding revenue snapshots for tenants');
  await prisma.$executeRawUnsafe(`
    with ${tenantMapCte}
    insert into revenue_snapshot_monthly (id, month, tenant_id, mrr, arr, churn_amount, upgrade_gain, downgrade_loss, nrr, created_at, updated_at)
    select
      ('phase5a-sim-revsnap-' || tenant_map.tenant_id || '-' || (date_trunc('month', now())::date - ((m.m - 1) || ' months')::interval)::date::text),
      (date_trunc('month', now())::date - ((m.m - 1) || ' months')::interval)::date,
      tenant_map.tenant_id,
      (10000 + ((tenant_map.rn + m.m) % 10000000))::float,
      (12 * (10000 + ((tenant_map.rn + m.m) % 10000000)))::float,
      ((tenant_map.rn * m.m) % 1000000)::float,
      ((tenant_map.rn * (m.m + 1)) % 1000000)::float,
      ((tenant_map.rn * (m.m + 2)) % 1000000)::float,
      (1.0)::float,
      now(),
      now()
    from tenant_map
    cross join generate_series(1, 6) as m(m)
    on conflict (id) do update
      set mrr = excluded.mrr,
          arr = excluded.arr,
          churn_amount = excluded.churn_amount,
          upgrade_gain = excluded.upgrade_gain,
          downgrade_loss = excluded.downgrade_loss,
          nrr = excluded.nrr,
          updated_at = excluded.updated_at;
  `);

  const academicCount = await prisma.$queryRawUnsafe<any[]>(`
    select
      (select count(*) from "Jurusan" where id like 'sim-jurusan-%') as jurusan,
      (select count(*) from "Kelas" where id like 'sim-kelas-%') as kelas,
      (select count(*) from "Mapel" where id like 'sim-mapel-%') as mapel,
      (select count(*) from "Guru" where id like 'sim-guru-%') as guru,
      (select count(*) from "Siswa" where id like 'sim-siswa-%') as siswa,
      (select count(*) from "SiswaAkademik" where id like 'sim-siswa-akademik-%') as siswa_akademik
  `);

  const attendanceCount = await prisma.$queryRawUnsafe<any[]>(`
    select
      (select count(*) from "SesiAbsensi" where id like 'sim-sesi-%') as sesi,
      (select count(*) from "AbsenSiswa" where id like 'sim-absen-siswa-%') as absen_siswa,
      (select count(*) from "AbsenGerbangSiswa" where id like 'sim-absen-gate-%') as absen_gerbang,
      (select count(*) from "AbsenGuru" where id like 'sim-absen-guru-%') as absen_guru
  `);

  console.log('ACADEMIC_SEED_COUNTS', {
    tenants: academicLogs.tenants,
    jurusan: academicLogs.jurusan,
    kelas: academicLogs.kelas,
    mapel: academicLogs.mapel,
    guru: academicLogs.guru,
    siswa: academicLogs.siswa,
    siswaAkademik: academicLogs.siswaAkademik,
    aggregated: academicCount[0],
  });

  console.log('ATTENDANCE_SEED_COUNTS', {
    sesi: attendanceLogs.sesi,
    absenSiswa: attendanceLogs.absenSiswa,
    absenGerbang: attendanceLogs.absenGerbang,
    absenGuru: attendanceLogs.absenGuru,
    aggregated: attendanceCount[0],
  });

  await prisma.$executeRawUnsafe(`
    insert into revenue_snapshot_monthly (id, month, tenant_id, mrr, arr, churn_amount, upgrade_gain, downgrade_loss, nrr, created_at, updated_at)
    select
      ('phase5a-sim-revglobal-' || (date_trunc('month', now())::date - ((m.m - 1) || ' months')::interval)::date::text),
      (date_trunc('month', now())::date - ((m.m - 1) || ' months')::interval)::date,
      null,
      5000000::float,
      60000000::float,
      0::float,
      0::float,
      0::float,
      1.0::float,
      now(),
      now()
    from generate_series(1, 6) as m(m)
    on conflict (id) do update
      set mrr = excluded.mrr,
          arr = excluded.arr,
          churn_amount = excluded.churn_amount,
          upgrade_gain = excluded.upgrade_gain,
          downgrade_loss = excluded.downgrade_loss,
          nrr = excluded.nrr,
          updated_at = excluded.updated_at;
  `);
}

async function cleanup(): Promise<void> {
  const tenantIds = (
    await prisma.tenant.findMany({
      where: {
        OR: [{ domain: { startsWith: TENANT_DOMAIN_PREFIX } }, { name: { startsWith: TENANT_NAME_PREFIX } }],
      },
      select: { id: true },
      orderBy: { id: 'asc' as any },
    })
  ).map((t) => t.id);

  if (tenantIds.length === 0) {
    console.log('[SEED][CLEANUP] No simulated tenants found, nothing to cleanup');
    return;
  }

  console.log('[SEED][CLEANUP] Cleaning simulated billing and subscription data', { tenantCount: tenantIds.length });
  await prisma.payment.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await prisma.invoice.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  await prisma.billing.deleteMany({ where: { tenant_id: { in: tenantIds } } });
  const subs = await prisma.subscription.findMany({
    where: { tenant_id: { in: tenantIds } },
    select: { id: true },
  });
  const subscriptionIds = subs.map((s) => s.id);
  if (subscriptionIds.length > 0) {
    await prisma.subscriptionHistory.deleteMany({
      where: { subscription_id: { in: subscriptionIds } },
    });
  }
  await prisma.subscription.deleteMany({ where: { tenant_id: { in: tenantIds } } });

  console.log('[SEED][CLEANUP] Cleaning simulated academic and attendance data');
  await prisma.absenSiswa.deleteMany({ where: { id: { startsWith: 'sim-absen-siswa-' } } });
  await prisma.absenGerbangSiswa.deleteMany({ where: { id: { startsWith: 'sim-absen-gate-' } } });
  await prisma.absenGuru.deleteMany({ where: { id: { startsWith: 'sim-absen-guru-' } } });
  await prisma.sesiAbsensi.deleteMany({ where: { id: { startsWith: 'sim-sesi-' } } });
  await prisma.sesiGerbang.deleteMany({ where: { id: { startsWith: 'sim-sesi-gerbang-' } } });
  await prisma.siswaAkademik.deleteMany({ where: { id: { startsWith: 'sim-siswa-akademik-' } } });
  await prisma.siswa.deleteMany({ where: { id: { startsWith: 'sim-siswa-' } } });
  await prisma.guru.deleteMany({ where: { id: { startsWith: 'sim-guru-' } } });
  await prisma.user.deleteMany({
    where: {
      AND: [
        { email: { startsWith: 'sim-guru-' } },
        { email: { endsWith: '@sim.local' } },
      ],
    },
  });
  await prisma.mapel.deleteMany({ where: { id: { startsWith: 'sim-mapel-' } } });
  await prisma.kelas.deleteMany({ where: { id: { startsWith: 'sim-kelas-' } } });
  await prisma.jurusan.deleteMany({ where: { id: { startsWith: 'sim-jurusan-' } } });
  await prisma.semester.deleteMany({ where: { id: { startsWith: 'sim-semester-' } } });
  await prisma.tahunPelajaran.deleteMany({ where: { id: { startsWith: 'sim-tahunpel-' } } });
  await prisma.sekolah.deleteMany({ where: { id: { startsWith: 'sim-sekolah-' } } });

  console.log('[SEED][CLEANUP] Cleaning risk and revenue metrics for simulated tenants');
  await prisma.$executeRawUnsafe(`delete from tenant_risk_event where tenant_id = any($1::text[])`, tenantIds as any);
  await prisma.$executeRawUnsafe(`delete from tenant_risk_score_log where tenant_id = any($1::text[])`, tenantIds as any);
  await prisma.$executeRawUnsafe(`delete from tenant_risk_score where tenant_id = any($1::text[])`, tenantIds as any);
  await prisma.$executeRawUnsafe(`delete from revenue_snapshot_monthly where tenant_id = any($1::text[])`, tenantIds as any);
  await prisma.$executeRawUnsafe(`delete from revenue_snapshot_monthly where id like 'sim-revglobal-%'`);
  await prisma.$executeRawUnsafe(`delete from revenue_snapshot_monthly where id like 'phase5a-sim-revglobal-%'`);
  await prisma.$executeRawUnsafe(`delete from revenue_snapshot_monthly where id like 'sim-revsnap-%'`);
  await prisma.$executeRawUnsafe(`delete from revenue_snapshot_monthly where id like 'phase5a-sim-revsnap-%'`);
  await prisma.$executeRawUnsafe(`delete from aggregated_metric_daily where tenant_id = any($1::text[])`, tenantIds as any);
  await prisma.$executeRawUnsafe(`delete from aggregated_metric_daily where id like 'sim-aggmetric-%'`);
  await prisma.$executeRawUnsafe(`delete from aggregated_metric_daily where id like 'phase5a-sim-aggmetric-%'`);
  await prisma.$executeRawUnsafe(`delete from "SystemEventLog" where (metadata->>'seed_tag') = '${SEED_TAG}'`);

  console.log('[SEED][CLEANUP] Cleaning activity logs for simulated tenants');
  await prisma.activityLog.deleteMany({
    where: {
      tenant_id: { in: tenantIds },
    },
  });

  console.log('[SEED][CLEANUP] Cleaning simulated tenants');
  await prisma.tenant.deleteMany({
    where: {
      domain: { startsWith: TENANT_DOMAIN_PREFIX },
      name: { startsWith: TENANT_NAME_PREFIX },
    },
  });

  console.log('[SEED][CLEANUP] Cleanup completed for simulated data');
}

async function main(): Promise<void> {
  const mode = (envStr('MODE', 'seed') as Mode) || 'seed';
  try {
    if (mode === 'cleanup') {
      await cleanup();
    } else {
      await seed();
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
