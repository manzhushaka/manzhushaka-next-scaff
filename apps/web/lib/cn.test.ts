import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('合并 Tailwind 类名并保留条件类', () => {
    const hidden = false;
    expect(cn('px-2', hidden ? 'hidden' : undefined, 'text-sm')).toBe('px-2 text-sm');
  });
});
