import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addNotification, setConnected, updateTaskProgress, addTask } from '../store/slices/systemSlice';

interface WebSocketMessage {
  type: 'notification' | 'task_update' | 'system_status';
  data: any;
}

const useWebSocketNotifications = (wsUrl: string = 'ws://j8jmtp-8000.csb.app/ws') => {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        dispatch(setConnected(true));
        // Only show success notification if we were previously disconnected
        if (reconnectAttempts.current > 0) {
          dispatch(addNotification({
            type: 'success',
            title: 'Reconnected',
            message: 'Real-time updates restored',
          }));
        }
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'notification':
              dispatch(addNotification({
                type: message.data.type || 'info',
                title: message.data.title || 'Notification',
                message: message.data.message || '',
                persistent: message.data.persistent,
              }));
              break;
              
            case 'task_update':
              if (message.data.task_id) {
                dispatch(updateTaskProgress({
                  taskId: message.data.task_id,
                  progress: message.data.progress,
                  status: message.data.status,
                }));
                
                // If task is completed, show notification
                if (message.data.status === 'completed') {
                  dispatch(addNotification({
                    type: 'success',
                    title: 'Task Completed',
                    message: `Task ${message.data.task_id} has completed successfully`,
                  }));
                } else if (message.data.status === 'failed') {
                  dispatch(addNotification({
                    type: 'error',
                    title: 'Task Failed',
                    message: `Task ${message.data.task_id} has failed: ${message.data.error || 'Unknown error'}`,
                  }));
                }
              }
              break;
              
            case 'system_status':
              // Handle system status updates
              if (message.data.status === 'maintenance') {
                dispatch(addNotification({
                  type: 'warning',
                  title: 'System Maintenance',
                  message: 'System is entering maintenance mode',
                  persistent: true,
                }));
              }
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error occurred');
        // Don't dispatch notification for every error to avoid spam
        // Only dispatch if we're not already in a reconnection state
        if (reconnectAttempts.current === 0) {
          dispatch(addNotification({
            type: 'warning',
            title: 'Connection Issue',
            message: 'Experiencing connection difficulties. Attempting to reconnect...',
          }));
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        dispatch(setConnected(false));
        
        // Only show disconnection notification on first disconnect (not during reconnection attempts)
        if (event.code !== 1000 && reconnectAttempts.current === 0) {
          dispatch(addNotification({
            type: 'warning',
            title: 'Disconnected',
            message: 'Real-time updates disabled. Attempting to reconnect...',
          }));
        }

        // Attempt to reconnect if not a clean close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
            connect();
          }, reconnectDelay * reconnectAttempts.current); // Exponential backoff
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          dispatch(addNotification({
            type: 'error',
            title: 'Connection Failed',
            message: 'Unable to establish real-time connection. Please refresh the page.',
            persistent: true,
          }));
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection');
      // Only show notification if we're not already trying to reconnect
      if (reconnectAttempts.current === 0) {
        dispatch(addNotification({
          type: 'error',
          title: 'Connection Failed',
          message: 'Failed to establish WebSocket connection',
        }));
      }
    }
  }, [wsUrl, dispatch]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  }, []);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility changes to manage connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, we might want to reduce activity
        console.log('Page hidden, WebSocket remains active');
      } else {
        // Page is visible again, ensure connection is active
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('Page visible, reconnecting WebSocket');
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online, reconnecting WebSocket');
      connect();
    };

    const handleOffline = () => {
      console.log('Network offline');
      dispatch(addNotification({
        type: 'warning',
        title: 'Network Offline',
        message: 'You are currently offline. Real-time updates are disabled.',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, dispatch]);

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
};

export default useWebSocketNotifications;
