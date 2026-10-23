import { z } from 'zod';

const envSchema = z.object({
  URL: z.string().url(),
  ENV: z.string().default('development'),
  REIS_ENDPOINT: z.string().default('http://localhost:3201'),
  MCP_SERVER_ENDPOINT: z.string().default('http://localhost:8000/sse'),
  MOCK_LLM_HOST: z.string().default('localhost'),
});

export const config = envSchema.parse(process.env);
