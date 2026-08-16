import { describe, expect, it } from 'vitest';
import { loginInputSchema, systemBrandingInputSchema } from '@manzhushaka/contracts';

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

describe('系统品牌契约', () => {
  it('会清理品牌文本两端的空白', () => {
    expect(
      systemBrandingInputSchema.parse({
        systemName: '  企业管理平台  ',
        shortName: '  管理平台  ',
        loginTitle: '  登录管理后台  ',
      }),
    ).toEqual({
      systemName: '企业管理平台',
      shortName: '管理平台',
      loginTitle: '登录管理后台',
    });
  });

  it('拒绝过长名称和未定义字段', () => {
    expect(() =>
      systemBrandingInputSchema.parse({
        systemName: '系'.repeat(61),
        shortName: '管理平台',
        loginTitle: '登录管理后台',
        secretKey: '不能写入',
      }),
    ).toThrow();
  });
});
