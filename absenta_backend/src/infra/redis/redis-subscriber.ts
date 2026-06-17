import { RedisClient, createRedisConnection } from './redisClient';

export class RedisSubscriber {
    private subscriber: RedisClient;

    constructor() {
        this.subscriber = createRedisConnection();
    }

    async subscribe(channel: string, callback: (message: string) => void) {
        const sub: any = this.subscriber as any;
        sub.on('message', (ch: string, message: string) => {
            if (String(ch) !== String(channel)) return;
            callback(String(message));
        });
        await sub.subscribe(channel);
    }

    async unsubscribe(channel: string) {
        await (this.subscriber as any).unsubscribe(channel);
    }

    async close() {
        try {
            await (this.subscriber as any).quit();
        } catch {}
    }
}
