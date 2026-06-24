import React from 'react';

export const Skeleton = ({ width, height, borderRadius, className = '' }) => {
  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius: borderRadius || 'var(--radius-sm)'
      }}
    />
  );
};

export const TableRowSkeleton = ({ columns = 5 }) => {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton height="18px" width={i === 0 ? '60%' : '80%'} />
        </td>
      ))}
    </tr>
  );
};
