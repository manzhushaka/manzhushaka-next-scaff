import { z } from 'zod';

const optionalUrl = z.string().url().optional().or(z.literal(''));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('Manzhushaka Console'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('mysql://user:password@127.0.0.1:3306/manzhushaka_console'),
  SESSION_COOKIE_NAME: z.string().default('manzhushaka_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  SM4_KEY_VERSION: z.string().default('v1'),
  BOS_ENDPOINT: optionalUrl,
  BOS_BUCKET: z.string().optional(),
  BOS_ACCESS_KEY_ID: z.string().optional(),
  BOS_SECRET_ACCESS_KEY: z.string().optional(),
  BOS_REGION: z.string().default('bj'),
  BOS_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  CAPTCHA_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(10),
  SLOW_SQL_THRESHOLD_MS: z.coerce.number().int().positive().default(300),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
