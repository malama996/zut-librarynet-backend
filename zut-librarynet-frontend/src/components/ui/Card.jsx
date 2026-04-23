import React from 'react';

const Card = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <div 
    ref={ref}
    style={{
      backgroundColor: 'white',
      borderRadius: '0.375rem',
      border: '1px solid var(--neutral-200)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      transition: 'box-shadow 0.2s ease-in-out',
      ...style,
    }}
    className={className}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <div 
    ref={ref}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.375rem',
      padding: '1.5rem',
      ...style,
    }}
    className={className}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <h2 
    ref={ref}
    style={{
      fontSize: '1.5rem',
      fontWeight: 700,
      color: 'var(--neutral-900)',
      margin: 0,
      ...style,
    }}
    className={className}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <p 
    ref={ref}
    style={{
      fontSize: '0.875rem',
      color: 'var(--neutral-500)',
      margin: 0,
      ...style,
    }}
    className={className}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <div 
    ref={ref}
    style={{
      padding: '1.5rem',
      paddingTop: 0,
      ...style,
    }}
    className={className}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <div 
    ref={ref}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '1.5rem',
      paddingTop: 0,
      ...style,
    }}
    className={className}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
