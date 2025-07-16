import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Dataset {
  filename: string;
  timeframe: string;
  rows: number;
  columns: string[];
  size_kb: number;
}

export interface ProcessedData {
  timeframe: string;
  data: any[];
  shape: number[];
  features: string[];
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ProcessingJob {
  id: string;
  timeframe: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  parameters: {
    clean: boolean;
    engineer_features: boolean;
    normalize: boolean;
  };
  result?: {
    original_rows: number;
    processed_rows: number;
    features: string[];
  };
}

interface DataState {
  datasets: Dataset[];
  processedData: Record<string, ProcessedData>;
  uploadProgress: UploadProgress | null;
  processingJobs: ProcessingJob[];
  loading: boolean;
  error: string | null;
}

const initialState: DataState = {
  datasets: [],
  processedData: {},
  uploadProgress: null,
  processingJobs: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchDatasets = createAsyncThunk(
  'data/fetchDatasets',
  async () => {
    const response = await fetch('http://localhost:8000/api/data/list');
    if (!response.ok) {
      throw new Error('Failed to fetch datasets');
    }
    const result = await response.json();
    return result.data;
  }
);

export const uploadDataset = createAsyncThunk(
  'data/uploadDataset',
  async ({ file, timeframe }: { file: File; timeframe: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('timeframe', timeframe);

    const response = await fetch('http://localhost:8000/api/data/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload dataset');
    }

    return response.json();
  }
);

export const preprocessData = createAsyncThunk(
  'data/preprocessData',
  async (params: {
    timeframe: string;
    clean?: boolean;
    engineer_features?: boolean;
    normalize?: boolean;
  }) => {
    const response = await fetch('http://localhost:8000/api/data/preprocess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to preprocess data');
    }

    return response.json();
  }
);

export const fetchProcessedData = createAsyncThunk(
  'data/fetchProcessedData',
  async ({ timeframe, limit = 100 }: { timeframe: string; limit?: number }) => {
    const response = await fetch(
      `http://localhost:8000/api/data/processed/${timeframe}?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch processed data');
    }

    return response.json();
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<UploadProgress>) => {
      state.uploadProgress = action.payload;
    },
    clearUploadProgress: (state) => {
      state.uploadProgress = null;
    },
    addProcessingJob: (state, action: PayloadAction<ProcessingJob>) => {
      const existingIndex = state.processingJobs.findIndex(job => job.id === action.payload.id);
      if (existingIndex >= 0) {
        state.processingJobs[existingIndex] = action.payload;
      } else {
        state.processingJobs.unshift(action.payload);
      }
    },
    updateProcessingJob: (state, action: PayloadAction<{ id: string; updates: Partial<ProcessingJob> }>) => {
      const job = state.processingJobs.find(j => j.id === action.payload.id);
      if (job) {
        Object.assign(job, action.payload.updates);
      }
    },
    removeProcessingJob: (state, action: PayloadAction<string>) => {
      state.processingJobs = state.processingJobs.filter(job => job.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch datasets
      .addCase(fetchDatasets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.loading = false;
        state.datasets = action.payload;
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch datasets';
      })
      // Upload dataset
      .addCase(uploadDataset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDataset.fulfilled, (state, action) => {
        state.loading = false;
        // Add the new dataset to the list
        const newDataset: Dataset = {
          filename: action.payload.filename,
          timeframe: action.payload.timeframe,
          rows: action.payload.rows,
          columns: action.payload.columns,
          size_kb: 0, // Will be updated when we refresh the list
        };
        state.datasets.unshift(newDataset);
        state.uploadProgress = null;
      })
      .addCase(uploadDataset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to upload dataset';
        if (state.uploadProgress) {
          state.uploadProgress.status = 'failed';
          state.uploadProgress.error = action.error.message;
        }
      })
      // Preprocess data
      .addCase(preprocessData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(preprocessData.fulfilled, (state, action) => {
        state.loading = false;
        // Create a processing job entry
        const job: ProcessingJob = {
          id: `preprocess_${action.payload.timeframe}_${Date.now()}`,
          timeframe: action.payload.timeframe,
          status: 'completed',
          progress: 100,
          parameters: {
            clean: true,
            engineer_features: true,
            normalize: true,
          },
          result: {
            original_rows: action.payload.original_rows,
            processed_rows: action.payload.processed_rows,
            features: action.payload.features,
          },
        };
        state.processingJobs.unshift(job);
      })
      .addCase(preprocessData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to preprocess data';
      })
      // Fetch processed data
      .addCase(fetchProcessedData.fulfilled, (state, action) => {
        state.processedData[action.payload.timeframe] = action.payload;
      })
      .addCase(fetchProcessedData.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch processed data';
      });
  },
});

export const {
  setUploadProgress,
  clearUploadProgress,
  addProcessingJob,
  updateProcessingJob,
  removeProcessingJob,
  clearError,
} = dataSlice.actions;

export default dataSlice.reducer;
