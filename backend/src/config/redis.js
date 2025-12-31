const Redis = require('redis');

let redisClient;

const initializeRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      redisClient = Redis.createClient({
        url: process.env.REDIS_URL
      });
      
      redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });
      
      redisClient.on('connect', () => {
        console.log('✅ Redis Connected');
      });
      
      await redisClient.connect();
    }
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

const setCache = async (key, value, expiry = 3600) => {
  try {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), {
      EX: expiry // Expire in seconds
    });
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

const getCache = async (key) => {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache
};