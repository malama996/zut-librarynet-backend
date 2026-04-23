import React from 'react';

const badgeVariants = {
  default: { backgroundColor: 'var(--primary-50)', color: 'var(--primary-900)', border: '1px solid var(--primary-200)' },
  secondary: { backgroundColor: 'var(--neutral-100)', color: 'var(--neutral-900)', border: '1px solid var(--neutral-300)' },
  destructive: { backgroundColor: 'var(--error-light)', color: 'var(--error-dark)', border: '1px solid rgba(239, 68, 68, 0.3)' },
  outline: { backgroundColor: 'transparent', color: 'var(--neutral-700)', border: '2px solid var(--neutral-400)' },
  success: { backgroundColor: 'var(--success-light)', color: 'var(--success-dark)', border: '1px solid rgba(16, 185, 129, 0.3)' },
  warning: { backgroundColor: 'var(--warning-light)', color: 'var(--warning-dark)', border: '1px solid rgba(245, 158, 11, 0.3)' },
  info: { backgroundColor: 'var(--info-light)', color: 'var(--info-dark)', border: '1px solid rgba(59, 130, 246, 0.3)' },
};

const Badge = React.forwardRef(({ variant = 'default', className = '', style = {}, ...props }, ref) => (
  <span
    ref={ref}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.25rem 0.625rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      ...badgeVariants[variant],
      ...style,
    }}
    className={className}
    {...props}
  />
));

Badge.displayName = 'Badge';

export { Badge };
