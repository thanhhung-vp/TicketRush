import Redis from 'ioredis';
import 'dotenv/config';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => console.error('Redis error:', err));

export default redis;
