import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  className = '',
  children,
  style = {},
  ...props
}, ref) => {
  const variantStyles = {
    default: { backgroundColor: 'var(--primary-600)', color: 'white' },
    destructive: { backgroundColor: '#ef4444', color: 'white' },
    outline: { backgroundColor: 'transparent', color: 'var(--neutral-700)', border: '2px solid var(--neutral-200)' },
    secondary: { backgroundColor: 'var(--neutral-100)', color: 'var(--neutral-900)' },
    ghost: { backgroundColor: 'transparent', color: 'var(--neutral-700)' },
    link: { backgroundColor: 'transparent', color: 'var(--primary-600)', textDecoration: 'underline' },
  };

  const sizeStyles = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    default: { padding: '0.625rem 1rem', fontSize: '1rem' },
    lg: { padding: '0.75rem 1.5rem', fontSize: '1.125rem' },
    icon: { width: '2.5rem', height: '2.5rem', padding: '0' },
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        borderRadius: '0.375rem',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled || loading ? 0.5 : 1,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      className={className}
      {...props}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15)';
          if (variant === 'default') e.currentTarget.style.backgroundColor = 'var(--primary-700)';
          else if (variant === 'destructive') e.currentTarget.style.backgroundColor = '#dc2626';
          else if (variant === 'outline') e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
          else if (variant === 'secondary') e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
          else if (variant === 'ghost') e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          if (variant === 'default') e.currentTarget.style.backgroundColor = 'var(--primary-600)';
          else if (variant === 'destructive') e.currentTarget.style.backgroundColor = '#ef4444';
          else if (variant === 'outline') e.currentTarget.style.backgroundColor = 'transparent';
          else if (variant === 'secondary') e.currentTarget.style.backgroundColor = 'var(--neutral-100)';
          else if (variant === 'ghost') e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {loading && <Loader2 style={{ marginRight: '0.5rem', width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
