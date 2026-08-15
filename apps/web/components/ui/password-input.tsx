'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { cn } from '../../lib/cn';
import { Input } from './input';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, onKeyDown, onKeyUp, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    function updateCapsLock(event: KeyboardEvent<HTMLInputElement>) {
      setCapsLock(event.getModifierState('CapsLock'));
    }

    return (
      <div>
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={cn('pr-10', className)}
            onKeyDown={(event) => {
              updateCapsLock(event);
              onKeyDown?.(event);
            }}
            onKeyUp={(event) => {
              updateCapsLock(event);
              onKeyUp?.(event);
            }}
            {...props}
          />
          <button
            type="button"
            aria-label={visible ? '隐藏密码' : '显示密码'}
            title={visible ? '隐藏密码' : '显示密码'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="ui-press absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--ink))]"
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {capsLock ? (
          <span role="status" className="mt-1 block text-xs text-[rgb(var(--warning))]">
            大写锁定已开启
          </span>
        ) : null}
      </div>
    );
  },
);
