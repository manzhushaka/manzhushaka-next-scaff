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

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
