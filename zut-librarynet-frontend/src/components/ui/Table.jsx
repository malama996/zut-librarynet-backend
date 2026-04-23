import React from 'react';

const Table = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <div style={{ width: '100%', overflowX: 'auto' }}>
    <table
      ref={ref}
      style={{
        width: '100%',
        fontSize: '0.875rem',
        borderCollapse: 'collapse',
        ...style,
      }}
      className={className}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <thead 
    ref={ref}
    style={{
      borderBottom: '2px solid var(--neutral-300)',
      backgroundColor: 'var(--neutral-50)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      ...style,
    }}
    className={className}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <tbody 
    ref={ref}
    style={style}
    className={className}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef(({ className = '', isHoverable = true, style = {}, ...props }, ref) => (
  <tr
    ref={ref}
    style={{
      borderBottom: '1px solid var(--neutral-200)',
      cursor: isHoverable ? 'pointer' : 'default',
      ...style,
    }}
    className={className}
    {...props}
    onMouseEnter={(e) => {
      if (isHoverable) e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
    }}
    onMouseLeave={(e) => {
      if (isHoverable) e.currentTarget.style.backgroundColor = 'transparent';
    }}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <th
    ref={ref}
    style={{
      height: '3rem',
      padding: '0.75rem 1rem',
      textAlign: 'left',
      fontSize: '0.875rem',
      fontWeight: 600,
      color: 'var(--neutral-700)',
      ...style,
    }}
    className={className}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className = '', style = {}, ...props }, ref) => (
  <td
    ref={ref}
    style={{
      padding: '0.75rem 1rem',
      verticalAlign: 'middle',
      color: 'var(--neutral-700)',
      ...style,
    }}
    className={className}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};
