'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[4px] border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'h-8 px-3' : 'h-10 px-4',
        variant === 'primary' &&
          'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-strong))]',
        variant === 'secondary' &&
          'border-[rgb(var(--line))] bg-[rgb(var(--surface))] text-[rgb(var(--ink))] hover:bg-[rgb(var(--muted))]',
        variant === 'ghost' &&
          'border-transparent text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]',
        variant === 'danger' &&
          'border-[rgb(var(--danger))] bg-[rgb(var(--danger))] text-white hover:brightness-95',
        className,
      )}
      {...props}
    />
  );
});
