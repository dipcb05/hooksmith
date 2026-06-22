import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hooksmith',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  aiProvider: process.env.AI_PROVIDER || 'openai', // 'openai' | 'gemini' | 'claude' | 'mcp'
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  mcpServerUrl: process.env.MCP_SERVER_URL, // e.g., 'http://localhost:8000/sse' or a command line path
  mcpToolName: process.env.MCP_TOOL_NAME || 'generate_transformation',
  connectorsDir: process.env.CONNECTORS_DIR || './connectors',
  deliveryConcurrency: Number(process.env.DELIVERY_CONCURRENCY || 5),
  regenerationConcurrency: Number(process.env.REGENERATION_CONCURRENCY || 2)
};

