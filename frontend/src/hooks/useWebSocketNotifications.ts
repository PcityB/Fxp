import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addNotification, setConnected, updateTaskProgress, addTask } from '../store/slices/systemSlice';

interface WebSocketMessage {
  type: 'notification' | 'task_update' | 'system_status';
  data: any;
}

const useWebSocketNotifications = (wsUrl: string = 'ws://localhost:8000/ws') => {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        dispatch(setConnected(true));
        dispatch(addNotification({
          type: 'success',
          title: 'Connected',
          message: 'Real-time updates enabled',
        }));
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
        console.error('WebSocket error:', error);
        dispatch(addNotification({
          type: 'error',
          title: 'Connection Error',
          message: 'WebSocket connection error occurred',
        }));
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        dispatch(setConnected(false));
        
        // Only show disconnection notification if it wasn't a clean close
        if (event.code !== 1000) {
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
      console.error('Failed to create WebSocket connection:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: 'Failed to establish WebSocket connection',
      }));
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
