import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
  loading?: boolean;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend = 'neutral',
  trendValue,
  color = 'primary',
  loading = false,
  onClick,
}) => {
  const colorClasses = {
    primary: 'border-primary-200 bg-primary-50',
    success: 'border-success-200 bg-success-50',
    warning: 'border-warning-200 bg-warning-50',
    error: 'border-error-200 bg-error-50',
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    neutral: '➖',
  };

  const trendColors = {
    up: 'text-success-600',
    down: 'text-error-600',
    neutral: 'text-text-tertiary',
  };

  return (
    <div
      className={`
        bg-surface border rounded-lg p-6 transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${colorClasses[color]}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        {trend !== 'neutral' && (
          <span className={`text-sm ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      
      <div className="flex items-baseline space-x-2">
        {loading ? (
          <div className="w-16 h-8 bg-background animate-pulse rounded"></div>
        ) : (
          <span className="text-2xl font-bold text-text-primary">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        )}
        
        {trendValue && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            {Math.abs(trendValue)}%
          </span>
        )}
      </div>
      
      {subtitle && (
        <p className="text-sm text-text-tertiary mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default MetricCard;
