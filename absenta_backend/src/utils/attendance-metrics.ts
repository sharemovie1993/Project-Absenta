type MetricType = 'GATE' | 'SESSION';

interface BucketKey {
  tenantId: string;
  type: MetricType;
  date: string;
}

interface BucketValue {
  count: number;
  sumMs: number;
  maxMs: number;
  samples: number[];
  thresholdBreached: number;
}

interface SnapshotValue {
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  count: number;
  thresholdBreached: number;
}

const MAX_SAMPLES_PER_BUCKET = 2000;

function makeKey(k: BucketKey): string {
  return `${k.tenantId}::${k.type}::${k.date}`;
}

function getTodayKey(tenantId: string, type: MetricType): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return makeKey({ tenantId, type, date: `${yyyy}-${mm}-${dd}` });
}

class AttendanceMetricsAggregator {
  private buckets = new Map<string, BucketValue>();

  record(tenantId: string, type: MetricType, totalMs: number): void {
    if (!tenantId) return;
    const v = Number(totalMs);
    if (!Number.isFinite(v) || v < 0) return;

    const key = getTodayKey(tenantId, type);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, sumMs: 0, maxMs: 0, samples: [], thresholdBreached: 0 };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    bucket.sumMs += v;
    if (v > bucket.maxMs) bucket.maxMs = v;

    if (bucket.samples.length < MAX_SAMPLES_PER_BUCKET) {
      bucket.samples.push(v);
    } else {
      const idx = Math.floor(Math.random() * MAX_SAMPLES_PER_BUCKET);
      bucket.samples[idx] = v;
    }

    const threshold = type === 'GATE' ? 300 : 400;
    if (v > threshold) bucket.thresholdBreached += 1;
  }

  snapshot(): Record<string, SnapshotValue> {
    const out: Record<string, SnapshotValue> = {};
    for (const [key, bucket] of this.buckets.entries()) {
      if (!bucket.count || bucket.sumMs <= 0 || bucket.samples.length === 0) continue;
      const sorted = [...bucket.samples].sort((a, b) => a - b);
      const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      const p95 = sorted[p95Index];
      out[key] = {
        avgMs: bucket.sumMs / bucket.count,
        p95Ms: p95,
        maxMs: bucket.maxMs,
        count: bucket.count,
        thresholdBreached: bucket.thresholdBreached,
      };
    }
    return out;
  }
}

export const attendanceMetricsAggregator = new AttendanceMetricsAggregator();
