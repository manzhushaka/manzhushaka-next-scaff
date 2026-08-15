import { describe, expect, it } from 'vitest';
import { loginInputSchema } from '@manzhushaka/contracts';

describe('登录契约', () => {
  it('接受完整登录输入', () => {
    expect(
      loginInputSchema.parse({
        username: 'admin',
        password: 'long-password',
        captchaId: 'id',
        captchaCode: '1234',
      }).username,
    ).toBe('admin');
  });

  it('拒绝空验证码', () => {
    expect(() =>
      loginInputSchema.parse({
        username: 'admin',
        password: 'long-password',
        captchaId: '',
        captchaCode: '',
      }),
    ).toThrow();
  });
});
