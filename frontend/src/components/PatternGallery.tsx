import React, { useState } from 'react';
import type { Pattern } from '../store/slices/patternsSlice';
import LoadingSpinner from './LoadingSpinner';

interface PatternGalleryProps {
  patterns: Pattern[];
  loading?: boolean;
  onPatternSelect?: (pattern: Pattern) => void;
  onPatternCompare?: (patterns: Pattern[]) => void;
}

const PatternGallery: React.FC<PatternGalleryProps> = ({
  patterns,
  loading = false,
  onPatternSelect,
  onPatternCompare,
}) => {
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'occurrences' | 'profitability' | 'timeframe'>('occurrences');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handlePatternSelect = (pattern: Pattern) => {
    if (onPatternSelect) {
      onPatternSelect(pattern);
    }
  };

  const handlePatternToggle = (patternId: string) => {
    const newSelected = new Set(selectedPatterns);
    if (newSelected.has(patternId)) {
      newSelected.delete(patternId);
    } else if (newSelected.size < 4) { // Limit to 4 patterns for comparison
      newSelected.add(patternId);
    }
    setSelectedPatterns(newSelected);
  };

  const handleCompare = () => {
    if (onPatternCompare && selectedPatterns.size > 1) {
      const patternsToCompare = patterns.filter(p => selectedPatterns.has(p.id));
      onPatternCompare(patternsToCompare);
    }
  };

  const sortedPatterns = [...patterns].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'occurrences':
        aValue = a.occurrences;
        bValue = b.occurrences;
        break;
      case 'profitability':
        aValue = a.profitability || 0;
        bValue = b.profitability || 0;
        break;
      case 'timeframe':
        aValue = a.timeframe;
        bValue = b.timeframe;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" message="Loading patterns..." />
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No patterns discovered yet
        </h3>
        <p className="text-text-secondary mb-4">
          Start by extracting patterns from your forex data using the parameter form.
        </p>
        <div className="text-sm text-text-tertiary">
          <p>• Select a timeframe with available data</p>
          <p>• Configure extraction parameters</p>
          <p>• Click "Start Extraction" to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-text-secondary">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-border rounded px-2 py-1 bg-background"
            >
              <option value="occurrences">Occurrences</option>
              <option value="profitability">Profitability</option>
              <option value="timeframe">Timeframe</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          <div className="flex items-center space-x-1 border border-border rounded">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 text-sm ${
                viewMode === 'grid' 
                  ? 'bg-primary-500 text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-sm ${
                viewMode === 'list' 
                  ? 'bg-primary-500 text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {selectedPatterns.size > 1 && (
          <button
            onClick={handleCompare}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 text-sm font-medium"
          >
            Compare {selectedPatterns.size} patterns
          </button>
        )}
      </div>

      {/* Pattern Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPatterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              selected={selectedPatterns.has(pattern.id)}
              onSelect={() => handlePatternSelect(pattern)}
              onToggle={() => handlePatternToggle(pattern.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPatterns.map((pattern) => (
            <PatternListItem
              key={pattern.id}
              pattern={pattern}
              selected={selectedPatterns.has(pattern.id)}
              onSelect={() => handlePatternSelect(pattern)}
              onToggle={() => handlePatternToggle(pattern.id)}
            />
          ))}
        </div>
      )}

      {/* Selection Info */}
      {selectedPatterns.size > 0 && (
        <div className="text-sm text-text-tertiary text-center">
          {selectedPatterns.size} pattern{selectedPatterns.size > 1 ? 's' : ''} selected
          {selectedPatterns.size >= 4 && ' (maximum reached)'}
        </div>
      )}
    </div>
  );
};

// Pattern Card Component
const PatternCard: React.FC<{
  pattern: Pattern;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}> = ({ pattern, selected, onSelect, onToggle }) => {
  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all duration-200
        ${selected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-border hover:border-primary-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-text-primary">
            Cluster {pattern.clusterId}
          </h4>
          <p className="text-sm text-text-secondary">
            {pattern.timeframe} timeframe
          </p>
        </div>
        
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded border-border focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Pattern Thumbnail */}
      <div 
        className="w-full h-32 bg-background rounded border mb-3 flex items-center justify-center cursor-pointer"
        onClick={onSelect}
      >
        {pattern.thumbnail ? (
          <img 
            src={pattern.thumbnail} 
            alt={`Pattern ${pattern.clusterId}`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-text-tertiary text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs">Pattern Preview</div>
          </div>
        )}
      </div>

      {/* Pattern Stats */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Occurrences:</span>
          <span className="font-medium text-text-primary">{pattern.occurrences}</span>
        </div>
        
        {pattern.profitability !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Profitability:</span>
            <span className={`font-medium ${
              pattern.profitability > 0 ? 'text-success-600' : 'text-error-600'
            }`}>
              {pattern.profitability > 0 ? '+' : ''}{(pattern.profitability * 100).toFixed(1)}%
            </span>
          </div>
        )}
        
        {pattern.significance !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Significance:</span>
            <span className={`font-medium ${
              pattern.significance < 0.05 ? 'text-success-600' : 'text-warning-600'
            }`}>
              {pattern.significance < 0.05 ? 'Significant' : 'Not significant'}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onSelect}
        className="w-full mt-3 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        View Details →
      </button>
    </div>
  );
};

// Pattern List Item Component
const PatternListItem: React.FC<{
  pattern: Pattern;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}> = ({ pattern, selected, onSelect, onToggle }) => {
  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all duration-200
        ${selected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-border hover:border-primary-300'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded border-border focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          <div>
            <div className="font-medium text-text-primary">
              Cluster {pattern.clusterId}
            </div>
            <div className="text-sm text-text-secondary">
              {pattern.timeframe}
            </div>
          </div>
          
          <div className="text-center">
            <div className="font-medium text-text-primary">{pattern.occurrences}</div>
            <div className="text-xs text-text-secondary">Occurrences</div>
          </div>
          
          <div className="text-center">
            {pattern.profitability !== undefined ? (
              <>
                <div className={`font-medium ${
                  pattern.profitability > 0 ? 'text-success-600' : 'text-error-600'
                }`}>
                  {pattern.profitability > 0 ? '+' : ''}{(pattern.profitability * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-text-secondary">Profitability</div>
              </>
            ) : (
              <div className="text-text-tertiary">-</div>
            )}
          </div>
          
          <div className="text-center">
            {pattern.significance !== undefined ? (
              <>
                <div className={`font-medium ${
                  pattern.significance < 0.05 ? 'text-success-600' : 'text-warning-600'
                }`}>
                  {pattern.significance < 0.05 ? 'Yes' : 'No'}
                </div>
                <div className="text-xs text-text-secondary">Significant</div>
              </>
            ) : (
              <div className="text-text-tertiary">-</div>
            )}
          </div>
          
          <div className="text-right">
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternGallery;
