import { RedisClient, createRedisSubscriberConnection } from './redisClient';

export class RedisSubscriber {
    private subscriber: RedisClient | null;

    constructor() {
        this.subscriber = createRedisSubscriberConnection();
    }

    async subscribe(channel: string, callback: (message: string) => void) {
        const sub: any = this.subscriber as any;
        if (!sub) return;
        sub.on('message', (ch: string, message: string) => {
            if (String(ch) !== String(channel)) return;
            callback(String(message));
        });
        await sub.subscribe(channel);
    }

    async unsubscribe(channel: string) {
        if (!this.subscriber) return;
        await (this.subscriber as any).unsubscribe(channel);
    }

    async close() {
        if (!this.subscriber) return;
        try {
            await (this.subscriber as any).quit();
        } catch {}
    }
}
