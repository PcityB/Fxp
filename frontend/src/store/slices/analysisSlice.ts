import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AnalysisResult {
  id: string;
  timeframe: string;
  analysis_date: string;
  lookahead_periods: number;
  significance_threshold: number;
  n_patterns: number;
  n_clusters: number;
  profitable_clusters: number;
  significant_clusters: number;
  profitability: {
    avg_return: number;
    win_rate: number;
    profit_factor: number;
  };
  statistical_significance: Record<string, {
    p_value: number;
    t_statistic: number;
    significant: boolean;
  }>;
  cluster_returns: Record<string, {
    count: number;
    avg_return: number;
    median_return: number;
    std_return: number;
    win_rate: number;
    profit_factor: number;
  }>;
}

export interface BacktestResult {
  id: string;
  pattern_id: string;
  timeframe: string;
  test_period: {
    start: string;
    end: string;
  };
  parameters: {
    lookback_periods: number;
    stop_loss: number;
    take_profit: number;
  };
  performance: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    profit_factor: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    avg_trade: number;
    total_return: number;
  };
  trades: Array<{
    entry_date: string;
    exit_date: string;
    entry_price: number;
    exit_price: number;
    return: number;
    duration: number;
  }>;
}

export interface AnalysisJob {
  id: string;
  type: 'pattern_analysis' | 'backtest';
  timeframe: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  parameters: any;
  result?: AnalysisResult | BacktestResult;
  error?: string;
  started_at: string;
  completed_at?: string;
}

interface AnalysisState {
  results: AnalysisResult[];
  selectedAnalysis: AnalysisResult | null;
  backtestResults: BacktestResult[];
  analysisJobs: AnalysisJob[];
  loading: boolean;
  error: string | null;
}

const initialState: AnalysisState = {
  results: [],
  selectedAnalysis: null,
  backtestResults: [],
  analysisJobs: [],
  loading: false,
  error: null,
};

// Async thunks
export const analyzePatterns = createAsyncThunk(
  'analysis/analyzePatterns',
  async (params: {
    timeframe: string;
    lookahead_periods?: number;
    significance_threshold?: number;
    min_occurrences?: number;
  }) => {
    const response = await fetch('http://localhost:8000/api/analysis/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to start pattern analysis');
    }

    return response.json();
  }
);

export const fetchAnalysisList = createAsyncThunk(
  'analysis/fetchAnalysisList',
  async () => {
    const response = await fetch('http://localhost:8000/api/analysis/list');
    if (!response.ok) {
      throw new Error('Failed to fetch analysis list');
    }
    return response.json();
  }
);

export const fetchAnalysisDetails = createAsyncThunk(
  'analysis/fetchAnalysisDetails',
  async (timeframe: string) => {
    const response = await fetch(`http://localhost:8000/api/analysis/${timeframe}`);
    if (!response.ok) {
      throw new Error('Failed to fetch analysis details');
    }
    return response.json();
  }
);

export const fetchAnalysisVisualization = createAsyncThunk(
  'analysis/fetchAnalysisVisualization',
  async ({ timeframe, chartType = 'profitability' }: { timeframe: string; chartType?: string }) => {
    const response = await fetch(`http://localhost:8000/api/analysis/${timeframe}/visualize?chart_type=${chartType}`);
    if (!response.ok) {
      throw new Error('Failed to fetch analysis visualization');
    }
    // Return the blob URL for the image
    const blob = await response.blob();
    return {
      chartType,
      imageUrl: URL.createObjectURL(blob),
    };
  }
);

export const runBacktest = createAsyncThunk(
  'analysis/runBacktest',
  async (params: {
    pattern_id: string;
    timeframe: string;
    lookback_periods: number;
    stop_loss: number;
    take_profit: number;
    test_period_start?: string;
    test_period_end?: string;
  }) => {
    // This would be a custom backtest endpoint (not in the current API)
    // For now, we'll simulate the backtest process
    const response = await fetch('http://localhost:8000/api/analysis/backtest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to run backtest');
    }

    return response.json();
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setSelectedAnalysis: (state, action: PayloadAction<AnalysisResult | null>) => {
      state.selectedAnalysis = action.payload;
    },
    addAnalysisJob: (state, action: PayloadAction<AnalysisJob>) => {
      const existingIndex = state.analysisJobs.findIndex(job => job.id === action.payload.id);
      if (existingIndex >= 0) {
        state.analysisJobs[existingIndex] = action.payload;
      } else {
        state.analysisJobs.unshift(action.payload);
      }
    },
    updateAnalysisJob: (state, action: PayloadAction<{ id: string; updates: Partial<AnalysisJob> }>) => {
      const job = state.analysisJobs.find(j => j.id === action.payload.id);
      if (job) {
        Object.assign(job, action.payload.updates);
      }
    },
    removeAnalysisJob: (state, action: PayloadAction<string>) => {
      state.analysisJobs = state.analysisJobs.filter(job => job.id !== action.payload);
    },
    addBacktestResult: (state, action: PayloadAction<BacktestResult>) => {
      const existingIndex = state.backtestResults.findIndex(result => result.id === action.payload.id);
      if (existingIndex >= 0) {
        state.backtestResults[existingIndex] = action.payload;
      } else {
        state.backtestResults.unshift(action.payload);
      }
    },
    removeBacktestResult: (state, action: PayloadAction<string>) => {
      state.backtestResults = state.backtestResults.filter(result => result.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Analyze patterns
      .addCase(analyzePatterns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(analyzePatterns.fulfilled, (state, action) => {
        state.loading = false;
        // Create an analysis job entry
        const job: AnalysisJob = {
          id: `analysis_${action.payload.timeframe}_${Date.now()}`,
          type: 'pattern_analysis',
          timeframe: action.payload.timeframe,
          status: 'completed',
          progress: 100,
          parameters: {
            lookahead_periods: 10,
            significance_threshold: 0.05,
            min_occurrences: 5,
          },
          result: {
            id: `analysis_${action.payload.timeframe}`,
            timeframe: action.payload.timeframe,
            analysis_date: action.payload.analysis_date,
            lookahead_periods: 10,
            significance_threshold: 0.05,
            n_patterns: action.payload.n_patterns,
            n_clusters: action.payload.n_clusters,
            profitable_clusters: action.payload.profitable_clusters,
            significant_clusters: action.payload.significant_clusters,
            profitability: {
              avg_return: 0,
              win_rate: 0,
              profit_factor: 0,
            },
            statistical_significance: {},
            cluster_returns: {},
          } as AnalysisResult,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        };
        state.analysisJobs.unshift(job);
      })
      .addCase(analyzePatterns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to analyze patterns';
      })
      // Fetch analysis list
      .addCase(fetchAnalysisList.fulfilled, (state, action) => {
        // Convert the analysis list to our AnalysisResult format
        state.results = action.payload.analyses.map((a: any) => ({
          id: `analysis_${a.timeframe}`,
          timeframe: a.timeframe,
          analysis_date: a.analysis_date,
          lookahead_periods: a.lookahead_periods,
          significance_threshold: 0.05,
          n_patterns: 0,
          n_clusters: a.n_clusters,
          profitable_clusters: a.profitable_clusters,
          significant_clusters: a.significant_clusters,
          profitability: {
            avg_return: 0,
            win_rate: 0,
            profit_factor: 0,
          },
          statistical_significance: {},
          cluster_returns: {},
        }));
      })
      .addCase(fetchAnalysisList.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch analysis list';
      })
      // Fetch analysis details
      .addCase(fetchAnalysisDetails.fulfilled, (state, action) => {
        const analysisResult: AnalysisResult = {
          id: `analysis_${action.payload.timeframe}`,
          timeframe: action.payload.timeframe,
          analysis_date: action.payload.analysis_date,
          lookahead_periods: action.payload.lookahead_periods,
          significance_threshold: action.payload.significance_threshold,
          n_patterns: 0,
          n_clusters: 0,
          profitable_clusters: 0,
          significant_clusters: 0,
          profitability: action.payload.profitability,
          statistical_significance: action.payload.statistical_significance,
          cluster_returns: action.payload.cluster_returns,
        };

        // Update existing result or add new one
        const existingIndex = state.results.findIndex(r => r.timeframe === action.payload.timeframe);
        if (existingIndex >= 0) {
          state.results[existingIndex] = analysisResult;
        } else {
          state.results.push(analysisResult);
        }

        // Set as selected if none is selected
        if (!state.selectedAnalysis) {
          state.selectedAnalysis = analysisResult;
        }
      })
      .addCase(fetchAnalysisDetails.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch analysis details';
      })
      // Fetch analysis visualization
      .addCase(fetchAnalysisVisualization.fulfilled, (state, action) => {
        // Store visualization URL (could be used for caching)
        // For now, we'll just clear any errors
        state.error = null;
      })
      .addCase(fetchAnalysisVisualization.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch analysis visualization';
      })
      // Run backtest
      .addCase(runBacktest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runBacktest.fulfilled, (state, action) => {
        state.loading = false;
        // Add backtest result
        const backtestResult: BacktestResult = {
          id: `backtest_${Date.now()}`,
          pattern_id: action.meta.arg.pattern_id,
          timeframe: action.meta.arg.timeframe,
          test_period: {
            start: action.meta.arg.test_period_start || '',
            end: action.meta.arg.test_period_end || '',
          },
          parameters: {
            lookback_periods: action.meta.arg.lookback_periods,
            stop_loss: action.meta.arg.stop_loss,
            take_profit: action.meta.arg.take_profit,
          },
          performance: action.payload.performance || {
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            win_rate: 0,
            profit_factor: 0,
            sharpe_ratio: 0,
            sortino_ratio: 0,
            max_drawdown: 0,
            avg_trade: 0,
            total_return: 0,
          },
          trades: action.payload.trades || [],
        };
        state.backtestResults.unshift(backtestResult);
      })
      .addCase(runBacktest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to run backtest';
      });
  },
});

export const {
  setSelectedAnalysis,
  addAnalysisJob,
  updateAnalysisJob,
  removeAnalysisJob,
  addBacktestResult,
  removeBacktestResult,
  clearError,
} = analysisSlice.actions;

export default analysisSlice.reducer;
