import { InfraMonitoringService } from './infra-monitoring.service';

export class InfraMonitoringBroadcaster {
  private static instance: InfraMonitoringBroadcaster;
  private service: InfraMonitoringService;
  private interval: NodeJS.Timeout | null = null;
  private isBroadcasting = false;

  private constructor() {
    this.service = new InfraMonitoringService();
  }

  public static getInstance(): InfraMonitoringBroadcaster {
    if (!InfraMonitoringBroadcaster.instance) {
      InfraMonitoringBroadcaster.instance = new InfraMonitoringBroadcaster();
    }
    return InfraMonitoringBroadcaster.instance;
  }

  /**
   * Starts the broadcast loop. If no subscribers are in the 'infra:monitoring' room,
   * it will stop automatically to optimize resource usage.
   */
  public start(io: any) {
    if (this.isBroadcasting) return;
    this.isBroadcasting = true;

    console.log('[WS BROADCASTER] Starting Infra Monitoring Real-Time Broadcast...');
    
    const runTick = async () => {
      try {
        const room = io.sockets.adapter.rooms.get('infra:monitoring');
        const activeSubscribers = room ? room.size : 0;

        if (activeSubscribers === 0) {
          console.log('[WS BROADCASTER] No active subscribers in "infra:monitoring". Going idle...');
          this.stop();
          return;
        }

        // Aggregate infrastructure metrics in a single parallel call
        const [nodes, queues, workers, pressure, events, jobs] = await Promise.all([
          this.service.listClusterNodes(),
          this.service.listClusterQueues(),
          this.service.listClusterWorkers(),
          this.service.listQueuePressure(),
          this.service.listAutoscalerEvents(),
          this.service.listJobs(),
        ]);

        const payload = {
          nodes,
          queues,
          workers,
          pressure,
          events,
          jobs,
          timestamp: Date.now(),
        };

        io.to('infra:monitoring').emit('infra_metrics_update', payload);
      } catch (err) {
        console.error('[WS BROADCASTER] Broadcast loop error:', err);
      }
    };

    // Execute immediately on start
    runTick();
    this.interval = setInterval(runTick, 2000); // 2 seconds throttled interval
  }

  /**
   * Stops the broadcast loop and clears the interval.
   */
  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isBroadcasting = false;
    console.log('[WS BROADCASTER] Infra Monitoring Real-Time Broadcast stopped.');
  }
}
