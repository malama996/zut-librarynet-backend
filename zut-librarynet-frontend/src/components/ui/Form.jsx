import React from 'react';

const FormGroup = ({ className = '', style = {}, children, ...props }) => (
  <div 
    style={{ marginBottom: '1.5rem', ...style }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

const Label = ({ className = '', style = {}, ...props }) => (
  <label
    style={{
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: 600,
      color: 'var(--neutral-700)',
      marginBottom: '0.5rem',
      ...style,
    }}
    className={className}
    {...props}
  />
);

const Input = React.forwardRef(({ className = '', error = false, style = {}, ...props }, ref) => (
  <input
    ref={ref}
    style={{
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: error ? '1px solid #ef4444' : '1px solid var(--neutral-200)',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      color: 'var(--neutral-900)',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      fontFamily: 'inherit',
      ...style,
    }}
    className={className}
    {...props}
    onFocus={(e) => {
      e.target.style.border = error ? '1px solid #ef4444' : '1px solid var(--primary-600)';
      e.target.style.boxShadow = error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(75, 124, 180, 0.1)';
    }}
    onBlur={(e) => {
      e.target.style.border = error ? '1px solid #ef4444' : '1px solid var(--neutral-200)';
      e.target.style.boxShadow = 'none';
    }}
  />
));
Input.displayName = 'Input';

const Select = React.forwardRef(({ className = '', error = false, style = {}, children, ...props }, ref) => (
  <select
    ref={ref}
    style={{
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: error ? '1px solid #ef4444' : '1px solid var(--neutral-200)',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      color: 'var(--neutral-900)',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      fontFamily: 'inherit',
      cursor: 'pointer',
      ...style,
    }}
    className={className}
    {...props}
    onFocus={(e) => {
      e.target.style.border = error ? '1px solid #ef4444' : '1px solid var(--primary-600)';
      e.target.style.boxShadow = error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(75, 124, 180, 0.1)';
    }}
    onBlur={(e) => {
      e.target.style.border = error ? '1px solid #ef4444' : '1px solid var(--neutral-200)';
      e.target.style.boxShadow = 'none';
    }}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

const Textarea = React.forwardRef(({ className = '', error = false, style = {}, ...props }, ref) => (
  <textarea
    ref={ref}
    style={{
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: error ? '1px solid #ef4444' : '1px solid var(--neutral-200)',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      color: 'var(--neutral-900)',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '8rem',
      ...style,
    }}
    className={className}
    {...props}
    onFocus={(e) => {
      e.target.style.border = error ? '1px solid #ef4444' : '1px solid var(--primary-600)';
      e.target.style.boxShadow = error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : '0 0 0 3px rgba(75, 124, 180, 0.1)';
    }}
    onBlur={(e) => {
      e.target.style.border = error ? '1px solid #ef4444' : '1px solid var(--neutral-200)';
      e.target.style.boxShadow = 'none';
    }}
  />
));
Textarea.displayName = 'Textarea';

const FormError = ({ message, className = '', style = {} }) => (
  <p 
    style={{
      marginTop: '0.25rem',
      fontSize: '0.875rem',
      color: '#dc2626',
      fontWeight: 500,
      ...style,
    }}
    className={className}
  >
    {message}
  </p>
);

export { FormGroup, Label, Input, Select, Textarea, FormError };
