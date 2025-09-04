import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard = ({ children, className, onClick }: GlassCardProps) => {
  return (
    <div
      className={clsx(
        'glass-card',
        onClick && 'cursor-pointer glass-hover',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};