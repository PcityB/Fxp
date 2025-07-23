import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Pattern {
  timeframe: string
  extraction_date: string
  n_patterns: number
  window_size: number
  n_clusters: number
  file: string
}

export interface PatternDetails {
  timeframe: string
  extraction_date: string
  n_patterns: number
  window_size: number
  cluster_labels: number[]
  representatives: Record<string, {
    timestamp: string
    index: number
    count: number
  }>
}

interface PatternsState {
  extractedPatterns: Pattern[]
  selectedPattern: PatternDetails | null
  extractionJobs: string[]
  comparisonPatterns: Pattern[]
  loading: boolean
  error: string | null
}

const initialState: PatternsState = {
  extractedPatterns: [],
  selectedPattern: null,
  extractionJobs: [],
  comparisonPatterns: [],
  loading: false,
  error: null,
}

// Async thunks
export const fetchPatterns = createAsyncThunk(
  'patterns/fetchPatterns',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/patterns/list`)
      if (!response.ok) {
        throw new Error('Failed to fetch patterns')
      }
      const result = await response.json()
      return result.patterns
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const fetchPatternDetails = createAsyncThunk(
  'patterns/fetchPatternDetails',
  async (timeframe: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/patterns/${timeframe}`)
      if (!response.ok) {
        throw new Error('Failed to fetch pattern details')
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const extractPatterns = createAsyncThunk(
  'patterns/extract',
  async (params: {
    timeframe: string
    window_size?: number
    max_patterns?: number
    grid_rows?: number
    grid_cols?: number
    n_clusters?: number
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/patterns/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to extract patterns')
      }

      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

const patternsSlice = createSlice({
  name: 'patterns',
  initialState,
  reducers: {
    setSelectedPattern: (state, action: PayloadAction<PatternDetails | null>) => {
      state.selectedPattern = action.payload
    },
    addExtractionJob: (state, action: PayloadAction<string>) => {
      state.extractionJobs.push(action.payload)
    },
    removeExtractionJob: (state, action: PayloadAction<string>) => {
      state.extractionJobs = state.extractionJobs.filter(job => job !== action.payload)
    },
    addComparisonPattern: (state, action: PayloadAction<Pattern>) => {
      state.comparisonPatterns.push(action.payload)
    },
    removeComparisonPattern: (state, action: PayloadAction<string>) => {
      state.comparisonPatterns = state.comparisonPatterns.filter(p => p.timeframe !== action.payload)
    },
    clearComparisonPatterns: (state) => {
      state.comparisonPatterns = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatterns.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPatterns.fulfilled, (state, action) => {
        state.loading = false
        state.extractedPatterns = action.payload
      })
      .addCase(fetchPatterns.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchPatternDetails.fulfilled, (state, action) => {
        state.selectedPattern = action.payload
      })
      .addCase(extractPatterns.fulfilled, (state, action) => {
        // Add new pattern to the list
        const newPattern: Pattern = {
          timeframe: action.payload.timeframe,
          extraction_date: action.payload.extraction_date,
          n_patterns: action.payload.n_patterns,
          window_size: action.payload.window_size,
          n_clusters: action.payload.n_clusters,
          file: `${action.payload.timeframe}_patterns.json`,
        }
        state.extractedPatterns.unshift(newPattern)
      })
  },
})

export const {
  setSelectedPattern,
  addExtractionJob,
  removeExtractionJob,
  addComparisonPattern,
  removeComparisonPattern,
  clearComparisonPatterns,
} = patternsSlice.actions

export default patternsSlice.reducer
