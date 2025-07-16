import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface SystemStatus {
  status: string;
  version: string;
  uptime: string;
  memory_usage: {
    total: string;
    available: string;
    used: string;
    percent: string;
  };
  disk_usage: {
    total: string;
    free: string;
    used: string;
    percent: string;
  };
  database?: {
    connected: boolean;
    type: string;
    version: string;
    timescaledb_enabled: boolean;
  };
}

export interface Task {
  task_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  persistent?: boolean;
  read?: boolean;
}

interface SystemState {
  status: SystemStatus | null;
  tasks: Task[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

const initialState: SystemState = {
  status: null,
  tasks: [],
  notifications: [],
  loading: false,
  error: null,
  connected: false,
};

// Async thunks
export const fetchSystemStatus = createAsyncThunk(
  'system/fetchStatus',
  async () => {
    const response = await fetch('http://localhost:8000/api/system/status');
    if (!response.ok) {
      throw new Error('Failed to fetch system status');
    }
    return response.json();
  }
);

export const fetchTaskStatus = createAsyncThunk(
  'system/fetchTaskStatus',
  async (taskId: string) => {
    const response = await fetch(`http://localhost:8000/api/system/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }
    return response.json();
  }
);

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
        read: false,
      };
      state.notifications.unshift(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    updateTaskProgress: (state, action: PayloadAction<{ taskId: string; progress: number; status?: string }>) => {
      const task = state.tasks.find(t => t.task_id === action.payload.taskId);
      if (task) {
        task.progress = action.payload.progress;
        if (action.payload.status) {
          task.status = action.payload.status as Task['status'];
        }
        task.updated_at = new Date().toISOString();
      }
    },
    addTask: (state, action: PayloadAction<Task>) => {
      const existingTaskIndex = state.tasks.findIndex(t => t.task_id === action.payload.task_id);
      if (existingTaskIndex >= 0) {
        state.tasks[existingTaskIndex] = action.payload;
      } else {
        state.tasks.unshift(action.payload);
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(t => t.task_id !== action.payload);
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
        state.connected = true;
      })
      .addCase(fetchSystemStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch system status';
        state.connected = false;
      })
      .addCase(fetchTaskStatus.fulfilled, (state, action) => {
        const existingTaskIndex = state.tasks.findIndex(t => t.task_id === action.payload.task_id);
        if (existingTaskIndex >= 0) {
          state.tasks[existingTaskIndex] = action.payload;
        } else {
          state.tasks.unshift(action.payload);
        }
      });
  },
});

export const {
  addNotification,
  removeNotification,
  markNotificationRead,
  clearAllNotifications,
  updateTaskProgress,
  addTask,
  removeTask,
  setConnected,
} = systemSlice.actions;

export default systemSlice.reducer;
