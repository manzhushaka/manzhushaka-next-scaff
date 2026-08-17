import { z } from 'zod';

export const loginInputSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  captchaId: z.string().min(1),
  captchaCode: z.string().min(1).max(16),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const taskStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'PARTIAL_SUCCESS',
  'FAILED',
  'CANCELED',
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const resourceQuerySchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().min(1).max(32).optional(),
  type: z.string().trim().min(1).max(32).optional(),
  visible: z.enum(['true', 'false']).optional(),
  parentId: z.string().trim().max(30).optional(),
  hierarchy: z.enum(['root', 'child']).optional(),
  createdFrom: z.string().date().optional(),
  createdTo: z.string().date().optional(),
});
export type ResourceQuery = z.infer<typeof resourceQuerySchema>;

export const resourceListSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export const asyncTaskCreateSchema = z.object({
  type: z.enum(['IMPORT', 'EXPORT']),
  handler: z.string().trim().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type AsyncTaskCreate = z.infer<typeof asyncTaskCreateSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

export const systemBrandingInputSchema = z
  .object({
    systemName: z
      .string()
      .trim()
      .min(2, '系统名称至少需要 2 个字符。')
      .max(60, '系统名称不能超过 60 个字符。'),
    shortName: z
      .string()
      .trim()
      .min(1, '品牌简称不能为空。')
      .max(20, '品牌简称不能超过 20 个字符。'),
    loginTitle: z
      .string()
      .trim()
      .min(2, '登录标题至少需要 2 个字符。')
      .max(80, '登录标题不能超过 80 个字符。'),
  })
  .strict();

export type SystemBrandingInput = z.infer<typeof systemBrandingInputSchema>;

export const systemBrandingSchema = systemBrandingInputSchema.extend({
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export type SystemBranding = z.infer<typeof systemBrandingSchema>;

export const brandingAssetKindSchema = z.enum(['logo', 'favicon']);
export type BrandingAssetKind = z.infer<typeof brandingAssetKindSchema>;

export const runtimeLogLevelSchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);
export type RuntimeLogLevel = z.infer<typeof runtimeLogLevelSchema>;

export const runtimeLogQuerySchema = z.object({
  level: runtimeLogLevelSchema.optional(),
  service: z.string().trim().min(1).max(32).optional(),
  keyword: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type RuntimeLogQuery = z.infer<typeof runtimeLogQuerySchema>;

export type RuntimeLogJsonValue =
  string | number | boolean | null | RuntimeLogJsonValue[] | { [key: string]: RuntimeLogJsonValue };

const sensitiveRuntimeLogKey =
  /password|passwd|token|authorization|cookie|secret|key|captcha|session/i;

// 运行日志统一在共享层脱敏，避免 API、Worker 各自实现产生遗漏。
export function sanitizeRuntimeLogValue(value: unknown, depth = 0): RuntimeLogJsonValue {
  if (depth > 5) return '[已截断]';
  if (value === null) return null;
  if (typeof value === 'string') return sanitizeRuntimeLogText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeRuntimeLogText(value.message),
      ...(value.stack ? { stack: sanitizeRuntimeLogText(value.stack) } : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeRuntimeLogValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([key, entry]) => [
          key,
          sensitiveRuntimeLogKey.test(key) ? '[已脱敏]' : sanitizeRuntimeLogValue(entry, depth + 1),
        ]),
    );
  }
  return String(value);
}

export function sanitizeRuntimeLogText(value: string): string {
  return value
    .slice(0, 5000)
    .replace(/\b(authorization|cookie)\b(\s*[:=]\s*)(?:Bearer\s+)?[^\s,;]+/gi, '$1$2[已脱敏]')
    .replace(/([a-z][a-z\d+.-]*:\/\/[^:/\s]+:)([^@/\s]+)(@)/gi, '$1[已脱敏]$3')
    .replace(
      /([?&](?:password|passwd|token|authorization|cookie|secret|captcha|session|key)=)[^&#\s]*/gi,
      '$1[已脱敏]',
    )
    .replace(
      /(password|passwd|token|authorization|cookie|secret|captcha|session)(\s*[:=]\s*)([^\s,;]+)/gi,
      '$1$2[已脱敏]',
    );
}

export const runtimeLogItemSchema = z.object({
  id: z.string(),
  level: runtimeLogLevelSchema,
  service: z.string(),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).nullable(),
  stack: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type RuntimeLogItem = z.infer<typeof runtimeLogItemSchema>;

export const runtimeLogListSchema = z.object({
  items: z.array(runtimeLogItemSchema),
  nextCursor: z.string().nullable(),
});
