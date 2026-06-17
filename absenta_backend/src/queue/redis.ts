import { closeRedisConnections, getRedisConnection as getSharedRedisConnection } from '../infra/redis/redisClient';

export const getRedisConnection = () => getSharedRedisConnection();

export const closeRedisConnection = async (): Promise<void> => {
  await closeRedisConnections();
};
