import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({ 
  className, 
  variant = 'text',
  width,
  height 
}: SkeletonProps) => {
  const baseStyles = 'animate-pulse bg-gradient-to-r from-dark-surface to-dark-hover';
  
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };
  
  return (
    <div
      className={clsx(baseStyles, variants[variant], className)}
      style={{
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || (variant === 'circular' ? '40px' : variant === 'rectangular' ? '100px' : '16px')
      }}
    />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="glass-card space-y-4">
      <Skeleton variant="rectangular" height={200} />
      <Skeleton width="60%" />
      <Skeleton width="80%" />
      <Skeleton width="40%" />
    </div>
  );
};