import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hooksmith',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  connectorsDir: process.env.CONNECTORS_DIR || './connectors',
  deliveryConcurrency: Number(process.env.DELIVERY_CONCURRENCY || 5),
  regenerationConcurrency: Number(process.env.REGENERATION_CONCURRENCY || 2)
};
