import * as React from 'react';
import { cn } from '../../lib/utils';

// shadcn pattern: extend native HTML element props + add variant/size
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

// Variant and size maps — avoids a third-party library like cva for this simple demo
const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:     'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline:     'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost:       'hover:bg-accent hover:text-accent-foreground',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 py-2',
  sm:      'h-9 rounded-md px-3 text-xs',
  lg:      'h-11 rounded-md px-8',
  icon:    'h-10 w-10',
};

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles shared by all variants
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
        'ring-offset-background transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className, // caller can still override individual classes
      )}
      {...props}
    />
  );
}
