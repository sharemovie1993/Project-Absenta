import type { TapPayload } from '../api/attendanceGerbang.api';

export interface QueuedTap extends TapPayload {
  id: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

const QUEUE_STORAGE_KEY = 'attendance_offline_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export class OfflineQueue {
  private queue: QueuedTap[] = [];
  private isProcessing = false;

  constructor() {
    this.loadFromStorage();
  }

  // Load queue from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }

  // Save queue to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  // Add tap to queue
  addTap(payload: TapPayload): string {
    const queuedTap: QueuedTap = {
      ...payload,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    this.queue.push(queuedTap);
    this.saveToStorage();
    
    console.log('Added tap to offline queue:', queuedTap.id);
    return queuedTap.id;
  }

  // Remove tap from queue
  removeTap(id: string): void {
    this.queue = this.queue.filter(tap => tap.id !== id);
    this.saveToStorage();
    console.log('Removed tap from offline queue:', id);
  }

  // Get all queued taps
  getQueue(): QueuedTap[] {
    return [...this.queue];
  }

  // Get queue size
  getQueueSize(): number {
    return this.queue.length;
  }

  // Clear entire queue
  clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
    console.log('Cleared offline queue');
  }

  // Process queue with retry mechanism
  async processQueue(
    submitFunction: (payload: TapPayload) => Promise<unknown>
  ): Promise<{ success: number; failed: number }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let successCount = 0;
    let failedCount = 0;

    console.log(`Processing offline queue: ${this.queue.length} items`);

    // Process each item in the queue
    for (const queuedTap of [...this.queue]) {
      try {
        // Attempt to submit the tap
        await submitFunction({
          siswa_id: queuedTap.siswa_id,
          arah: queuedTap.arah,
          device_id: queuedTap.device_id,
          rfid: queuedTap.rfid,
        });

        // Success - remove from queue
        this.removeTap(queuedTap.id);
        successCount++;
        console.log(`Successfully processed queued tap: ${queuedTap.id}`);

      } catch (error) {
        console.error(`Failed to process queued tap: ${queuedTap.id}`, error);
        
        // Increment retry count
        queuedTap.retryCount++;

        if (queuedTap.retryCount >= queuedTap.maxRetries) {
          // Max retries reached - remove from queue
          this.removeTap(queuedTap.id);
          failedCount++;
          console.log(`Max retries reached for tap: ${queuedTap.id}, removing from queue`);
        } else {
          // Update the tap in queue with new retry count
          const index = this.queue.findIndex(t => t.id === queuedTap.id);
          if (index !== -1) {
            this.queue[index] = queuedTap;
            this.saveToStorage();
          }
          console.log(`Retry ${queuedTap.retryCount}/${queuedTap.maxRetries} for tap: ${queuedTap.id}`);
        }

        // Add delay between retries
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }

    this.isProcessing = false;
    console.log(`Queue processing completed: ${successCount} success, ${failedCount} failed`);
    
    return { success: successCount, failed: failedCount };
  }

  // Check if queue is being processed
  isProcessingQueue(): boolean {
    return this.isProcessing;
  }

  // Get failed taps (those that exceeded max retries)
  getFailedTaps(): QueuedTap[] {
    return this.queue.filter(tap => tap.retryCount >= tap.maxRetries);
  }

  // Get pending taps (those still being retried)
  getPendingTaps(): QueuedTap[] {
    return this.queue.filter(tap => tap.retryCount < tap.maxRetries);
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

// Export utility functions
export const addToOfflineQueue = (payload: TapPayload): string => {
  return offlineQueue.addTap(payload);
};

export const processOfflineQueue = async (
  submitFunction: (payload: TapPayload) => Promise<unknown>
): Promise<{ success: number; failed: number }> => {
  return offlineQueue.processQueue(submitFunction);
};

export const getOfflineQueueSize = (): number => {
  return offlineQueue.getQueueSize();
};

export const clearOfflineQueue = (): void => {
  offlineQueue.clearQueue();
};

export const getOfflineQueue = (): QueuedTap[] => {
  return offlineQueue.getQueue();
};
