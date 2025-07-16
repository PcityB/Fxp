import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Pattern {
  id: string;
  clusterId: number;
  timeframe: string;
  occurrences: number;
  profitability?: number;
  significance?: number;
  thumbnail?: string;
  metadata: {
    extraction_date: string;
    window_size: number;
    grid_rows: number;
    grid_cols: number;
    representative?: {
      timestamp: string;
      index: number;
      count: number;
    };
  };
}

export interface PatternExtractionJob {
  id: string;
  timeframe: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  parameters: {
    window_size: number;
    max_patterns: number;
    grid_rows: number;
    grid_cols: number;
    n_clusters?: number;
  };
  result?: {
    n_patterns: number;
    n_clusters: number;
    extraction_date: string;
  };
  error?: string;
}

export interface PatternFilters {
  timeframe?: string[];
  profitability?: [number, number];
  significance?: [number, number];
  minOccurrences?: number;
}

interface PatternsState {
  extractedPatterns: Pattern[];
  selectedPattern: Pattern | null;
  extractionJobs: PatternExtractionJob[];
  comparisonPatterns: Pattern[];
  filters: PatternFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  loading: boolean;
  error: string | null;
}

const initialState: PatternsState = {
  extractedPatterns: [],
  selectedPattern: null,
  extractionJobs: [],
  comparisonPatterns: [],
  filters: {},
  sortBy: 'profitability',
  sortOrder: 'desc',
  viewMode: 'grid',
  loading: false,
  error: null,
};

// Async thunks
export const extractPatterns = createAsyncThunk(
  'patterns/extractPatterns',
  async (params: {
    timeframe: string;
    window_size?: number;
    max_patterns?: number;
    grid_rows?: number;
    grid_cols?: number;
    n_clusters?: number;
  }) => {
    const response = await fetch('http://localhost:8000/api/patterns/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to start pattern extraction');
    }

    return response.json();
  }
);

export const fetchPatternsList = createAsyncThunk(
  'patterns/fetchPatternsList',
  async () => {
    const response = await fetch('http://localhost:8000/api/patterns/list');
    if (!response.ok) {
      throw new Error('Failed to fetch patterns list');
    }
    return response.json();
  }
);

export const fetchPatternDetails = createAsyncThunk(
  'patterns/fetchPatternDetails',
  async (timeframe: string) => {
    const response = await fetch(`http://localhost:8000/api/patterns/${timeframe}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pattern details');
    }
    return response.json();
  }
);

export const fetchPatternVisualization = createAsyncThunk(
  'patterns/fetchPatternVisualization',
  async ({ timeframe, clusterId }: { timeframe: string; clusterId: number }) => {
    const response = await fetch(`http://localhost:8000/api/patterns/${timeframe}/visualize/${clusterId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pattern visualization');
    }
    // Return the blob URL for the image
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
);

const patternsSlice = createSlice({
  name: 'patterns',
  initialState,
  reducers: {
    setSelectedPattern: (state, action: PayloadAction<Pattern | null>) => {
      state.selectedPattern = action.payload;
    },
    addToComparison: (state, action: PayloadAction<Pattern>) => {
      const exists = state.comparisonPatterns.find(p => p.id === action.payload.id);
      if (!exists && state.comparisonPatterns.length < 4) {
        state.comparisonPatterns.push(action.payload);
      }
    },
    removeFromComparison: (state, action: PayloadAction<string>) => {
      state.comparisonPatterns = state.comparisonPatterns.filter(p => p.id !== action.payload);
    },
    clearComparison: (state) => {
      state.comparisonPatterns = [];
    },
    setFilters: (state, action: PayloadAction<PatternFilters>) => {
      state.filters = action.payload;
    },
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    addExtractionJob: (state, action: PayloadAction<PatternExtractionJob>) => {
      const existingIndex = state.extractionJobs.findIndex(job => job.id === action.payload.id);
      if (existingIndex >= 0) {
        state.extractionJobs[existingIndex] = action.payload;
      } else {
        state.extractionJobs.unshift(action.payload);
      }
    },
    updateExtractionJob: (state, action: PayloadAction<{ id: string; updates: Partial<PatternExtractionJob> }>) => {
      const job = state.extractionJobs.find(j => j.id === action.payload.id);
      if (job) {
        Object.assign(job, action.payload.updates);
      }
    },
    removeExtractionJob: (state, action: PayloadAction<string>) => {
      state.extractionJobs = state.extractionJobs.filter(job => job.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Extract patterns
      .addCase(extractPatterns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(extractPatterns.fulfilled, (state, action) => {
        state.loading = false;
        // Create an extraction job entry
        const job: PatternExtractionJob = {
          id: `extract_${action.payload.timeframe}_${Date.now()}`,
          timeframe: action.payload.timeframe,
          status: 'completed',
          progress: 100,
          parameters: {
            window_size: action.payload.window_size,
            max_patterns: action.payload.n_patterns,
            grid_rows: 10, // Default values
            grid_cols: 10,
            n_clusters: action.payload.n_clusters,
          },
          result: {
            n_patterns: action.payload.n_patterns,
            n_clusters: action.payload.n_clusters,
            extraction_date: action.payload.extraction_date,
          },
        };
        state.extractionJobs.unshift(job);
      })
      .addCase(extractPatterns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to extract patterns';
      })
      // Fetch patterns list
      .addCase(fetchPatternsList.fulfilled, (state, action) => {
        // Convert the patterns list to our Pattern format
        state.extractedPatterns = action.payload.patterns.map((p: any, index: number) => ({
          id: `pattern_${p.timeframe}_${index}`,
          clusterId: index,
          timeframe: p.timeframe,
          occurrences: p.n_patterns || 0,
          metadata: {
            extraction_date: p.extraction_date,
            window_size: p.window_size,
            grid_rows: 10,
            grid_cols: 10,
          },
        }));
      })
      .addCase(fetchPatternsList.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch patterns list';
      })
      // Fetch pattern details
      .addCase(fetchPatternDetails.fulfilled, (state, action) => {
        // Update patterns with detailed information
        const timeframe = action.payload.timeframe;
        const representatives = action.payload.representatives;
        
        // Update existing patterns or create new ones
        Object.keys(representatives).forEach((clusterId) => {
          const clusterIdNum = parseInt(clusterId);
          const existingPattern = state.extractedPatterns.find(
            p => p.timeframe === timeframe && p.clusterId === clusterIdNum
          );
          
          if (existingPattern) {
            existingPattern.metadata.representative = representatives[clusterId];
            existingPattern.occurrences = representatives[clusterId].count;
          } else {
            const newPattern: Pattern = {
              id: `pattern_${timeframe}_${clusterId}`,
              clusterId: clusterIdNum,
              timeframe,
              occurrences: representatives[clusterId].count,
              metadata: {
                extraction_date: action.payload.extraction_date,
                window_size: action.payload.window_size,
                grid_rows: 10,
                grid_cols: 10,
                representative: representatives[clusterId],
              },
            };
            state.extractedPatterns.push(newPattern);
          }
        });
      })
      .addCase(fetchPatternDetails.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch pattern details';
      })
      // Fetch pattern visualization
      .addCase(fetchPatternVisualization.fulfilled, (state, action) => {
        // The action.meta.arg contains the original parameters
        const { timeframe, clusterId } = action.meta.arg;
        const pattern = state.extractedPatterns.find(
          p => p.timeframe === timeframe && p.clusterId === clusterId
        );
        if (pattern) {
          pattern.thumbnail = action.payload;
        }
      })
      .addCase(fetchPatternVisualization.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch pattern visualization';
      });
  },
});

export const {
  setSelectedPattern,
  addToComparison,
  removeFromComparison,
  clearComparison,
  setFilters,
  setSorting,
  setViewMode,
  addExtractionJob,
  updateExtractionJob,
  removeExtractionJob,
  clearError,
} = patternsSlice.actions;

export default patternsSlice.reducer;
