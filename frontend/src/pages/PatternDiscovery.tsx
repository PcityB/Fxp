import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { extractPatterns, fetchPatternsList, fetchPatternDetails } from '../store/slices/patternsSlice';
import { fetchDatasets } from '../store/slices/dataSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import PatternGallery from '../components/PatternGallery';
import JobMonitor from '../components/JobMonitor';
import { default as ParameterForm } from '../components/ParameterForm';

const PatternDiscovery: React.FC = () => {
  const dispatch = useAppDispatch();
  const { datasets } = useAppSelector((state) => state.data);
  const { extractedPatterns, extractionJobs, loading, error } = useAppSelector((state) => state.patterns);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');

  useEffect(() => {
    dispatch(fetchDatasets());
    dispatch(fetchPatternsList());
  }, [dispatch]);

  const handleExtractPatterns = async (params: any) => {
    try {
      await dispatch(extractPatterns(params)).unwrap();
      // Refresh patterns list after extraction
      dispatch(fetchPatternsList());
      if (params.timeframe) {
        dispatch(fetchPatternDetails(params.timeframe));
      }
    } catch (error) {
      console.error('Pattern extraction failed:', error);
    }
  };

  const parameterSchema = {
    fields: [
      {
        name: 'timeframe',
        type: 'select' as const,
        label: 'Timeframe',
        description: 'Select the timeframe for pattern extraction',
        required: true,
        options: datasets.map(dataset => ({
          value: dataset.timeframe,
          label: `${dataset.timeframe} (${dataset.rows.toLocaleString()} rows)`,
        })),
        defaultValue: selectedTimeframe,
      },
      {
        name: 'window_size',
        type: 'number' as const,
        label: 'Window Size',
        description: 'Size of the sliding window for pattern extraction',
        required: true,
        min: 3,
        max: 20,
        defaultValue: 5,
      },
      {
        name: 'max_patterns',
        type: 'number' as const,
        label: 'Max Patterns',
        description: 'Maximum number of patterns to extract',
        required: true,
        min: 100,
        max: 10000,
        step: 100,
        defaultValue: 5000,
      },
      {
        name: 'grid_rows',
        type: 'select' as const,
        label: 'Grid Rows',
        description: 'Number of rows in the Template Grid',
        required: true,
        options: [
          { value: 10, label: '10 rows' },
          { value: 15, label: '15 rows' },
          { value: 20, label: '20 rows' },
          { value: 25, label: '25 rows' },
        ],
        defaultValue: 10,
      },
      {
        name: 'grid_cols',
        type: 'select' as const,
        label: 'Grid Columns',
        description: 'Number of columns in the Template Grid',
        required: true,
        options: [
          { value: 10, label: '10 columns' },
          { value: 15, label: '15 columns' },
        ],
        defaultValue: 10,
      },
      {
        name: 'n_clusters',
        type: 'number' as const,
        label: 'Number of Clusters',
        description: 'Number of pattern clusters (leave empty for auto-detection)',
        required: false,
        min: 5,
        max: 50,
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pattern Discovery</h1>
          <p className="text-text-secondary">
            Extract and analyze novel candlestick patterns from forex data
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-text-tertiary">
            {extractedPatterns.length} patterns discovered
          </div>
          {loading && <LoadingSpinner size="small" />}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-error-500">❌</span>
            <span className="text-error-700 font-medium">Error</span>
          </div>
          <p className="text-error-600 mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Parameters and Job Monitor */}
        <div className="space-y-6">
          {/* Parameter Form */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Extraction Parameters
            </h3>
            
            <ParameterForm
              schema={parameterSchema}
              onSubmit={handleExtractPatterns}
              loading={loading}
            />
          </div>

          {/* Job Monitor */}
          <JobMonitor
            jobs={extractionJobs.map(job => ({
              id: job.id,
              type: 'pattern_extraction',
              status: job.status,
              progress: job.progress,
              startedAt: new Date(job.parameters ? Date.now() : Date.now()),
              completedAt: job.status === 'completed' ? new Date() : undefined,
              error: job.error,
              result: job.result,
            }))}
            maxVisible={5}
            showHistory={true}
          />
        </div>

        {/* Right Column - Pattern Gallery */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Discovered Patterns
              </h3>
              
              <div className="flex items-center space-x-2">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="text-sm border border-border rounded px-2 py-1 bg-background"
                >
                  <option value="">All Timeframes</option>
                  {datasets.map(dataset => (
                    <option key={dataset.timeframe} value={dataset.timeframe}>
                      {dataset.timeframe}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <PatternGallery
              patterns={extractedPatterns.filter(pattern => 
                !selectedTimeframe || pattern.timeframe === selectedTimeframe
              )}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Pattern Statistics */}
      {extractedPatterns.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Discovery Statistics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {extractedPatterns.length}
              </div>
              <div className="text-sm text-text-secondary">Total Patterns</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">
                {new Set(extractedPatterns.map(p => p.timeframe)).size}
              </div>
              <div className="text-sm text-text-secondary">Timeframes</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">
                {extractedPatterns.reduce((sum, p) => sum + p.occurrences, 0)}
              </div>
              <div className="text-sm text-text-secondary">Total Occurrences</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">
                {extractionJobs.filter(job => job.status === 'completed').length}
              </div>
              <div className="text-sm text-text-secondary">Completed Jobs</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternDiscovery;
