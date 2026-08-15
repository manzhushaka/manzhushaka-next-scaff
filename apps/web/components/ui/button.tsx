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
        'ui-press inline-flex items-center justify-center gap-2 rounded-[2px] border text-sm font-medium transition-[color,background-color,border-color,transform] [transition-duration:var(--motion-feedback)] disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'h-8 px-3' : 'h-9 px-4',
        variant === 'primary' &&
          'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-strong))]',
        variant === 'secondary' &&
          'border-transparent bg-[rgb(var(--muted))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]',
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
