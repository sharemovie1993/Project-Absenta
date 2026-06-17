import { Job, Queue, QueueEvents } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { registerQueue } from '../infra/jobRegistry';

export const ATTENDANCE_QUEUE_NAME = 'attendance';
export const ATTENDANCE_DLQ_QUEUE_NAME = 'attendance_dlq';

let queue: Queue<any> | null = null;
let dlq: Queue<any> | null = null;
let queueEvents: QueueEvents | null = null;

export const getAttendanceQueue = (): Queue<any> => {
  if (queue) return queue;
  queue = new Queue(ATTENDANCE_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(ATTENDANCE_QUEUE_NAME, 3);
  return queue;
};

export const closeAttendanceQueue = async (): Promise<void> => {
  try {
    if (queueEvents) {
      await queueEvents.close();
      queueEvents = null;
    }
  } catch {}
  try {
    if (queue) {
      await queue.close();
      queue = null;
    }
  } catch {}
};

export const getAttendanceDlqQueue = (): Queue<any> => {
  if (dlq) return dlq;
  dlq = new Queue(ATTENDANCE_DLQ_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      backoff: { type: 'fixed', delay: 0 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  registerQueue(ATTENDANCE_DLQ_QUEUE_NAME, 1);
  return dlq;
};

export const getAttendanceQueueEvents = (): QueueEvents => {
  if (queueEvents) return queueEvents;
  queueEvents = new QueueEvents(ATTENDANCE_QUEUE_NAME, { connection: getRedisConnection() });
  return queueEvents;
};

export const enqueueAttendanceManualAbsence = async (data: {
  tenant_id: string;
  siswa_id: string;
  status: string;
  parent_id: string;
  keterangan?: string;
  correlation_id?: string;
}): Promise<Job<any>> => {
  const q = getAttendanceQueue();
  const day = new Date().toISOString().slice(0, 10);
  const jobId = `parent_manual_absence_${String(data.tenant_id)}_${String(data.siswa_id)}_${day}_${String(data.status)}`;
  return await q.add(
    'attendance-manual-absence',
    data,
    {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
};

export const waitForAttendanceJobResult = async <T = any>(job: Job<any>, timeoutMs: number): Promise<T> => {
  const events = getAttendanceQueueEvents();
  return (await job.waitUntilFinished(events, timeoutMs)) as T;
};
