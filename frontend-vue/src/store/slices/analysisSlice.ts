import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface AnalysisResult {
  timeframe: string
  analysis_date: string
  lookahead_periods: number
  significance_threshold: number
  profitability: {
    avg_return: number
    win_rate: number
    profit_factor: number
  }
  statistical_significance: Record<string, {
    p_value: number
    t_statistic: number
    significant: boolean
  }>
  cluster_returns: Record<string, {
    count: number
    avg_return: number
    median_return: number
    std_return: number
    win_rate: number
    profit_factor: number
  }>
}

export interface BacktestResult {
  id: string
  timeframe: string
  pattern_id: string
  start_date: string
  end_date: string
  total_trades: number
  profit_factor: number
  win_rate: number
  sharpe_ratio: number
  max_drawdown: number
  avg_trade: number
}

interface AnalysisState {
  results: AnalysisResult[]
  selectedAnalysis: AnalysisResult | null
  backtestResults: BacktestResult[]
  analysisJobs: string[]
  loading: boolean
  error: string | null
}

const initialState: AnalysisState = {
  results: [],
  selectedAnalysis: null,
  backtestResults: [],
  analysisJobs: [],
  loading: false,
  error: null,
}

// Async thunks
export const fetchAnalyses = createAsyncThunk(
  'analysis/fetchAnalyses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analysis/list`)
      if (!response.ok) {
        throw new Error('Failed to fetch analyses')
      }
      const result = await response.json()
      return result.analyses
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const fetchAnalysisDetails = createAsyncThunk(
  'analysis/fetchAnalysisDetails',
  async (timeframe: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analysis/${timeframe}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analysis details')
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

export const analyzePatterns = createAsyncThunk(
  'analysis/analyze',
  async (params: {
    timeframe: string
    lookahead_periods?: number
    significance_threshold?: number
    min_occurrences?: number
  }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analysis/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze patterns')
      }

      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setSelectedAnalysis: (state, action) => {
      state.selectedAnalysis = action.payload
    },
    addAnalysisJob: (state, action) => {
      state.analysisJobs.push(action.payload)
    },
    removeAnalysisJob: (state, action) => {
      state.analysisJobs = state.analysisJobs.filter(job => job !== action.payload)
    },
    addBacktestResult: (state, action) => {
      state.backtestResults.push(action.payload)
    },
    clearBacktestResults: (state) => {
      state.backtestResults = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAnalyses.fulfilled, (state, action) => {
        state.loading = false
        state.results = action.payload
      })
      .addCase(fetchAnalyses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchAnalysisDetails.fulfilled, (state, action) => {
        state.selectedAnalysis = action.payload
      })
      .addCase(analyzePatterns.fulfilled, (state, action) => {
        // Add new analysis to the list
        const newAnalysis: AnalysisResult = {
          timeframe: action.payload.timeframe,
          analysis_date: action.payload.analysis_date,
          lookahead_periods: action.payload.lookahead_periods,
          significance_threshold: action.payload.significance_threshold,
          profitability: action.payload.profitability,
          statistical_significance: action.payload.statistical_significance,
          cluster_returns: action.payload.cluster_returns,
        }
        state.results.unshift(newAnalysis)
      })
  },
})

export const {
  setSelectedAnalysis,
  addAnalysisJob,
  removeAnalysisJob,
  addBacktestResult,
  clearBacktestResults,
} = analysisSlice.actions

export default analysisSlice.reducer
