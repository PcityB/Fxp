import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Dataset {
  filename: string
  timeframe: string
  rows: number
  columns: string[]
  size_kb: number
}

export interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
}

export interface ProcessingJob {
  id: string
  timeframe: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  parameters: {
    clean: boolean
    engineer_features: boolean
    normalize: boolean
  }
}

interface DataState {
  datasets: Dataset[]
  uploadProgress: Record<string, UploadProgress>
  processingJobs: ProcessingJob[]
  storageMode: {
    primary: string
    fallback: string
  }
  loading: boolean
  error: string | null
}

const initialState: DataState = {
  datasets: [],
  uploadProgress: {},
  processingJobs: [],
  storageMode: {
    primary: 'database',
    fallback: 'file'
  },
  loading: false,
  error: null,
}

// Async thunks
export const fetchDatasets = createAsyncThunk(
  'data/fetchDatasets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data/list`)
      if (!response.ok) {
        throw new Error('Failed to fetch datasets')
      }
      const result = await response.json()
      return result.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const uploadData = createAsyncThunk(
  'data/upload',
  async ({ file, timeframe }: { file: File; timeframe: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('timeframe', timeframe)

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload data')
      }

      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const preprocessData = createAsyncThunk(
  'data/preprocess',
  async (params: {
    timeframe: string
    clean?: boolean
    engineer_features?: boolean
    normalize?: boolean
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data/preprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to preprocess data')
      }

      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const fetchStorageMode = createAsyncThunk(
  'data/fetchStorageMode',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data/storage-mode`)
      if (!response.ok) {
        throw new Error('Failed to fetch storage mode')
      }
      const result = await response.json()
      return result.storage_mode
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<UploadProgress>) => {
      state.uploadProgress[action.payload.filename] = action.payload
    },
    removeUploadProgress: (state, action: PayloadAction<string>) => {
      delete state.uploadProgress[action.payload]
    },
    addProcessingJob: (state, action: PayloadAction<ProcessingJob>) => {
      state.processingJobs.push(action.payload)
    },
    updateProcessingJob: (state, action: PayloadAction<Partial<ProcessingJob> & { id: string }>) => {
      const index = state.processingJobs.findIndex(job => job.id === action.payload.id)
      if (index !== -1) {
        state.processingJobs[index] = { ...state.processingJobs[index], ...action.payload }
      }
    },
    removeProcessingJob: (state, action: PayloadAction<string>) => {
      state.processingJobs = state.processingJobs.filter(job => job.id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDatasets.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.loading = false
        state.datasets = action.payload
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(uploadData.fulfilled, (state, action) => {
        // Add the uploaded dataset to the list
        const newDataset: Dataset = {
          filename: action.payload.filename,
          timeframe: action.payload.timeframe,
          rows: action.payload.rows,
          columns: action.payload.columns,
          size_kb: 0, // Will be updated when datasets are refetched
        }
        state.datasets.push(newDataset)
      })
      .addCase(fetchStorageMode.fulfilled, (state, action) => {
        state.storageMode = action.payload
      })
  },
})

export const {
  setUploadProgress,
  removeUploadProgress,
  addProcessingJob,
  updateProcessingJob,
  removeProcessingJob,
} = dataSlice.actions

export default dataSlice.reducer
