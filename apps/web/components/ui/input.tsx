import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--ink))] placeholder:text-[rgb(var(--ink-muted))] focus:border-[rgb(var(--accent))] focus:outline-none',
          className,
        )}
        {...props}
      />
    );
  },
);
