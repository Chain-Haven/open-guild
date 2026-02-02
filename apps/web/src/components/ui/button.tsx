import * as React from 'react'

import { cn } from '@/lib/utils'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-slate-900 text-white hover:bg-slate-800',
        variant === 'outline' &&
          'border border-slate-200 bg-white hover:bg-slate-50 text-slate-900',
        variant === 'ghost' && 'hover:bg-slate-100 text-slate-900',
        size === 'sm' && 'h-8 px-3',
        size === 'md' && 'h-9 px-4',
        className,
      )}
      {...props}
    />
  )
}
