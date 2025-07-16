import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchAnalysisList, fetchAnalysisDetails, analyzePatterns } from '../store/slices/analysisSlice';
import { fetchPatternsList } from '../store/slices/patternsSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import CandlestickChart from '../components/CandlestickChart';
import MetricCard from '../components/MetricCard';

const PatternAnalysis: React.FC = () => {
  const dispatch = useAppDispatch();
  const { results, selectedAnalysis, loading, error } = useAppSelector((state) => state.analysis);
  const { extractedPatterns } = useAppSelector((state) => state.patterns);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');

  useEffect(() => {
    dispatch(fetchAnalysisList());
    dispatch(fetchPatternsList());
  }, [dispatch]);

  useEffect(() => {
    if (selectedTimeframe) {
      dispatch(fetchAnalysisDetails(selectedTimeframe));
    }
  }, [selectedTimeframe, dispatch]);

  const handleAnalyzePatterns = async () => {
    try {
      await dispatch(analyzePatterns({
        timeframe: selectedTimeframe,
        lookahead_periods: 10,
        significance_threshold: 0.05,
        min_occurrences: 5,
      })).unwrap();
      dispatch(fetchAnalysisDetails(selectedTimeframe));
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const availableTimeframes = [...new Set(extractedPatterns.map(p => p.timeframe))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pattern Analysis</h1>
          <p className="text-text-secondary">
            Analyze pattern performance and statistical significance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-border rounded px-3 py-2 bg-background"
          >
            <option value="">Select Timeframe</option>
            {availableTimeframes.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
          
          <button
            onClick={handleAnalyzePatterns}
            disabled={!selectedTimeframe || loading}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
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

      {selectedAnalysis ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Profitable Clusters"
              value={selectedAnalysis.profitable_clusters}
              subtitle={`of ${selectedAnalysis.n_clusters} total`}
              color="success"
            />
            
            <MetricCard
              title="Significant Clusters"
              value={selectedAnalysis.significant_clusters}
              subtitle={`p < ${selectedAnalysis.significance_threshold}`}
              color="primary"
            />
            
            <MetricCard
              title="Average Return"
              value={`${(selectedAnalysis.profitability.avg_return * 100).toFixed(2)}%`}
              trend={selectedAnalysis.profitability.avg_return > 0 ? 'up' : 'down'}
              color={selectedAnalysis.profitability.avg_return > 0 ? 'success' : 'error'}
            />
            
            <MetricCard
              title="Win Rate"
              value={`${(selectedAnalysis.profitability.win_rate * 100).toFixed(1)}%`}
              subtitle="Profitable patterns"
              color="primary"
            />
          </div>

          {/* Chart and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Candlestick Chart */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Pattern Visualization
              </h3>
              <div className="h-96">
                <CandlestickChart
                  data={[]} // Would be populated with actual data
                  height={384}
                />
              </div>
            </div>

            {/* Statistical Analysis */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Statistical Significance
              </h3>
              
              <div className="space-y-4">
                {Object.entries(selectedAnalysis.statistical_significance).slice(0, 5).map(([clusterId, stats]) => (
                  <div key={clusterId} className="flex items-center justify-between p-3 bg-background rounded">
                    <div>
                      <div className="font-medium text-text-primary">
                        Cluster {clusterId}
                      </div>
                      <div className="text-sm text-text-secondary">
                        p-value: {stats.p_value.toFixed(4)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${
                        stats.significant ? 'text-success-600' : 'text-warning-600'
                      }`}>
                        {stats.significant ? 'Significant' : 'Not Significant'}
                      </div>
                      <div className="text-sm text-text-tertiary">
                        t-stat: {stats.t_statistic.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cluster Performance Table */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Cluster Performance Details
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3">Cluster</th>
                    <th className="text-right py-2 px-3">Count</th>
                    <th className="text-right py-2 px-3">Avg Return</th>
                    <th className="text-right py-2 px-3">Win Rate</th>
                    <th className="text-right py-2 px-3">Profit Factor</th>
                    <th className="text-right py-2 px-3">Std Dev</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedAnalysis.cluster_returns).map(([clusterId, performance]) => (
                    <tr key={clusterId} className="border-b border-border hover:bg-background">
                      <td className="py-2 px-3 font-medium">Cluster {clusterId}</td>
                      <td className="py-2 px-3 text-right">{performance.count}</td>
                      <td className={`py-2 px-3 text-right font-medium ${
                        performance.avg_return > 0 ? 'text-success-600' : 'text-error-600'
                      }`}>
                        {performance.avg_return > 0 ? '+' : ''}{(performance.avg_return * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        {(performance.win_rate * 100).toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 text-right ${
                        performance.profit_factor > 1 ? 'text-success-600' : 'text-error-600'
                      }`}>
                        {performance.profit_factor.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-text-tertiary">
                        {(performance.std_return * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No analysis results yet
          </h3>
          <p className="text-text-secondary mb-4">
            Select a timeframe and run analysis to see pattern performance metrics.
          </p>
          <div className="text-sm text-text-tertiary">
            <p>• Choose a timeframe with extracted patterns</p>
            <p>• Click "Run Analysis" to start</p>
            <p>• View statistical significance and profitability</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternAnalysis;
