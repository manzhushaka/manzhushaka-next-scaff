import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-[2px] border border-transparent bg-[rgb(var(--muted))] px-3 text-sm text-[rgb(var(--ink))] placeholder:text-[rgb(var(--ink-muted))]/60 focus:border-[rgb(var(--accent))] focus:bg-[rgb(var(--surface))] focus:outline-none',
          className,
        )}
        {...props}
      />
    );
  },
);
