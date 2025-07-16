import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  overlay?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  overlay = false,
  message,
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin`}
        style={color ? { borderTopColor: color } : {}}
      />
      {message && (
        <p className="text-sm text-text-secondary animate-pulse">{message}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-overlay flex items-center justify-center z-modal">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
