import React, { useEffect, useState } from 'react';
// @ts-ignore
import Plot from 'react-plotly.js';

interface CandlestickData {
  x: string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PatternOverlay {
  id: string;
  startIndex: number;
  endIndex: number;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  color?: string;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  patterns?: PatternOverlay[];
  height?: number;
  width?: number;
  showControls?: boolean;
  onPatternClick?: (pattern: PatternOverlay) => void;
  loading?: boolean;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  patterns = [],
  height = 400,
  width,
  showControls = true,
  onPatternClick,
  loading = false,
}) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (data && data.length > 0) {
      // Transform data for Plotly candlestick format
      const candlestickTrace = {
        x: data.map(item => item.x),
        open: data.map(item => item.open),
        high: data.map(item => item.high),
        low: data.map(item => item.low),
        close: data.map(item => item.close),
        type: 'candlestick',
        name: 'Price',
        increasing: { line: { color: '#22c55e' } },
        decreasing: { line: { color: '#ef4444' } },
      };

      const traces = [candlestickTrace];

      // Add pattern overlays
      patterns.forEach((pattern, index) => {
        const patternColor = pattern.color || (pattern.type === 'bullish' ? '#22c55e' : pattern.type === 'bearish' ? '#ef4444' : '#6b7280');
        
        // Add pattern highlight as a shape overlay
        const patternTrace = {
          x: data.slice(pattern.startIndex, pattern.endIndex + 1).map(item => item.x),
          y: data.slice(pattern.startIndex, pattern.endIndex + 1).map(item => item.high),
          type: 'scatter',
          mode: 'lines',
          name: `Pattern ${pattern.id}`,
          line: {
            color: patternColor,
            width: 3,
            dash: 'dash',
          },
          opacity: 0.7,
        } as any;
        
        traces.push(patternTrace);
      });

      setChartData(traces);
    } else {
      setChartData([]);
    }
  }, [data, patterns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-sm text-text-secondary">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-background rounded border" style={{ height }}>
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-text-secondary">No chart data available</p>
          <p className="text-sm text-text-tertiary mt-1">
            Chart will display when data is loaded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Plot
        data={chartData}
        layout={{
          title: {
            text: 'Candlestick Chart with Pattern Overlays',
            font: { size: 16 },
          },
          xaxis: {
            title: 'Time',
            rangeslider: { visible: false },
            type: 'date',
          },
          yaxis: {
            title: 'Price',
          },
          height,
          width: width || undefined,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          showlegend: patterns.length > 0,
          legend: {
            x: 0,
            y: 1,
            bgcolor: 'rgba(255,255,255,0.8)',
          },
        }}
        config={{
          responsive: true,
          displayModeBar: showControls,
          modeBarButtonsToRemove: [
            'pan2d',
            'select2d',
            'lasso2d',
            'autoScale2d',
            'hoverClosestCartesian',
            'hoverCompareCartesian',
            'toggleSpikelines',
          ],
          displaylogo: false,
        }}
        style={{ width: '100%', height: '100%' }}
        onHover={(event: any) => {
          // Handle hover events if needed
        }}
        onClick={(event: any) => {
          // Handle click events for patterns
          if (onPatternClick && event.points) {
            // Find which pattern was clicked based on trace
            const traceIndex = event.points[0]?.curveNumber;
            if (traceIndex && traceIndex > 0 && patterns[traceIndex - 1]) {
              onPatternClick(patterns[traceIndex - 1]);
            }
          }
        }}
      />
    </div>
  );
};

export default CandlestickChart;
