import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { removeNotification, markNotificationRead } from '../store/slices/systemSlice';

const NotificationCenter: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector((state) => state.system);
  const { notifications: notificationSettings } = useAppSelector((state) => state.ui);

  // Auto-dismiss non-persistent notifications after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach((notification) => {
      if (!notification.persistent && !notification.read) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notification.id));
        }, 5000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, dispatch]);

  if (!notificationSettings.enabled || notifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success-50 border-success-200 text-success-800';
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800';
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800';
      default:
        return 'bg-primary-50 border-primary-200 text-primary-800';
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[notificationSettings.position]} z-toast space-y-2 max-w-sm w-full`}
    >
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`
            border rounded-lg p-4 shadow-lg transition-all duration-300 transform
            ${getNotificationColors(notification.type)}
            animate-in slide-in-from-right-full
          `}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-lg">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{notification.title}</h4>
                  <p className="text-sm opacity-90 mt-1">{notification.message}</p>
                  <p className="text-xs opacity-75 mt-2">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                
                <button
                  onClick={() => dispatch(removeNotification(notification.id))}
                  className="ml-2 flex-shrink-0 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress bar for auto-dismiss */}
          {!notification.persistent && !notification.read && (
            <div className="mt-3 w-full bg-black bg-opacity-10 rounded-full h-1">
              <div
                className="bg-current h-1 rounded-full animate-shrink"
                style={{ animationDuration: '5s' }}
              />
            </div>
          )}
        </div>
      ))}
      
      {/* Show count if there are more notifications */}
      {notifications.length > 5 && (
        <div className="text-center">
          <div className="inline-block bg-surface border border-border rounded-full px-3 py-1 text-xs text-text-secondary">
            +{notifications.length - 5} more notifications
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
