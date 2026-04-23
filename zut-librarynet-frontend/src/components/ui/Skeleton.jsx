import React from 'react';

const Skeleton = ({ className = '', style = {}, ...props }) => (
  <div
    style={{
      background: 'linear-gradient(90deg, var(--neutral-200) 0%, var(--neutral-100) 50%, var(--neutral-200) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-pulse 2s infinite',
      borderRadius: '0.375rem',
      ...style,
    }}
    className={className}
    {...props}
  />
);

const SkeletonCard = () => (
  <div style={{
    borderRadius: '0.375rem',
    border: '1px solid var(--neutral-200)',
    backgroundColor: 'white',
    padding: '1.5rem',
  }}>
    <Skeleton style={{ height: '1.5rem', width: '12rem', marginBottom: '1rem' }} />
    <Skeleton style={{ height: '1rem', width: '100%', marginBottom: '0.75rem' }} />
    <Skeleton style={{ height: '1rem', width: '75%', marginBottom: '1.5rem' }} />
    <Skeleton style={{ height: '2.5rem', width: '6rem' }} />
  </div>
);

const SkeletonTableRow = () => (
  <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
    <td style={{ padding: '1rem' }}><Skeleton style={{ height: '1rem', width: '8rem' }} /></td>
    <td style={{ padding: '1rem' }}><Skeleton style={{ height: '1rem', width: '6rem' }} /></td>
    <td style={{ padding: '1rem' }}><Skeleton style={{ height: '1rem', width: '7rem' }} /></td>
    <td style={{ padding: '1rem' }}><Skeleton style={{ height: '1rem', width: '5rem' }} /></td>
  </tr>
);

export { Skeleton, SkeletonCard, SkeletonTableRow };
