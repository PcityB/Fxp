import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface SystemStatus {
  status: string
  version: string
  uptime: string
  memory_usage: {
    total: string
    available: string
    used: string
    percent: string
  }
  disk_usage: {
    total: string
    free: string
    used: string
    percent: string
  }
  database: {
    connected: boolean
    type: string
    version: string
    timescaledb_enabled: boolean
  }
}

export interface Task {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  started_at: string | null
  updated_at: string | null
  completed_at: string | null
  result: any
  error: string | null
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface SystemState {
  status: SystemStatus | null
  tasks: Record<string, Task>
  notifications: Notification[]
  connected: boolean
  loading: boolean
  error: string | null
}

const initialState: SystemState = {
  status: null,
  tasks: {},
  notifications: [],
  connected: false,
  loading: false,
  error: null,
}

// Async thunks
export const fetchSystemStatus = createAsyncThunk(
  'system/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/system/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch system status')
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const fetchTaskStatus = createAsyncThunk(
  'system/fetchTaskStatus',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/system/tasks/${taskId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch task status')
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      }
      state.notifications.unshift(notification)
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      state.tasks[action.payload.task_id] = action.payload
    },
    removeTask: (state, action: PayloadAction<string>) => {
      delete state.tasks[action.payload]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSystemStatus.fulfilled, (state, action) => {
        state.loading = false
        state.status = action.payload
        state.connected = true
      })
      .addCase(fetchSystemStatus.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.connected = false
      })
      .addCase(fetchTaskStatus.fulfilled, (state, action) => {
        state.tasks[action.payload.task_id] = action.payload
      })
  },
})

export const {
  setConnected,
  addNotification,
  markNotificationAsRead,
  removeNotification,
  clearNotifications,
  updateTask,
  removeTask,
} = systemSlice.actions

export default systemSlice.reducer
