<template>
  <div class="pattern-analysis">
    <div class="header">
      <h1 class="text-2xl font-bold mb-4">Pattern Analysis</h1>
      <p class="text-gray-600">Analyze discovered patterns and their performance</p>
    </div>

    <div class="content">
      <!-- Pattern Selection -->
      <div class="pattern-selection">
        <h2 class="text-xl font-semibold mb-4">Select Pattern</h2>
        <select v-model="selectedPattern" class="input">
          <option value="">Choose a pattern</option>
          <option v-for="pattern in patterns" :key="pattern.id" :value="pattern">
            {{ pattern.name }} - {{ pattern.confidence }}% confidence
          </option>
        </select>
      </div>

      <!-- Analysis Parameters -->
      <div class="analysis-params">
        <h2 class="text-xl font-semibold mb-4">Analysis Parameters</h2>
        <div class="params-grid">
          <div class="param">
            <label>Time Range</label>
            <select v-model="analysisParams.timeRange" class="input">
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year</option>
            </select>
          </div>
          <div class="param">
            <label>Confidence Level</label>
            <input v-model.number="analysisParams.confidenceLevel" type="range" min="0.5" max="1.0" step="0.1" class="input" />
            <span>{{ analysisParams.confidenceLevel }}</span>
          </div>
        </div>
      </div>

      <!-- Analysis Results -->
      <div class="results">
        <h2 class="text-xl font-semibold mb-4">Analysis Results</h2>
        <div v-if="isAnalyzing" class="loading">
          <div class="spinner"></div>
          <p>Analyzing pattern...</p>
        </div>
        <div v-else-if="analysisResults" class="results-content">
          <div class="metrics">
            <div class="metric">
              <h3>Success Rate</h3>
              <p class="text-2xl font-bold text-green-600">{{ analysisResults.successRate }}%</p>
            </div>
            <div class="metric">
              <h3>Average Return</h3>
              <p class="text-2xl font-bold text-blue-600">{{ analysisResults.avgReturn }}%</p>
            </div>
            <div class="metric">
              <h3>Max Drawdown</h3>
              <p class="text-2xl font-bold text-red-600">{{ analysisResults.maxDrawdown }}%</p>
            </div>
          </div>
          <CandlestickChart :data="analysisResults.chartData" title="Pattern Performance" />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button @click="runAnalysis" :disabled="!selectedPattern || isAnalyzing" class="btn btn-primary">
          {{ isAnalyzing ? 'Analyzing...' : 'Run Analysis' }}
        </button>
        <button @click="exportResults" :disabled="!analysisResults" class="btn btn-secondary">
          Export Results
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CandlestickChart from '@/components/CandlestickChart.vue'
import { apiService } from '@/services/api'

const patterns = ref([
  { id: 1, name: 'Bullish Engulfing', confidence: 85 },
  { id: 2, name: 'Bearish Harami', confidence: 78 },
  { id: 3, name: 'Morning Star', confidence: 92 }
])

const selectedPattern = ref(null)
const isAnalyzing = ref(false)
const analysisResults = ref(null)

const analysisParams = ref({
  timeRange: '3m',
  confidenceLevel: 0.8
})

const runAnalysis = async () => {
  if (!selectedPattern.value) return
  
  isAnalyzing.value = true
  try {
    const response = await apiService.runAnalysis({
      patternId: selectedPattern.value.id,
      ...analysisParams.value
    })
    
    analysisResults.value = {
      successRate: 75.5,
      avgReturn: 12.3,
      maxDrawdown: -8.7,
      chartData: [
        { date: '2024-01-01', open: 2000, high: 2020, low: 1990, close: 2010 },
        { date: '2024-01-02', open: 2010, high: 2030, low: 2000, close: 2025 },
        { date: '2024-01-03', open: 2025, high: 2040, low: 2015, close: 2035 },
        { date: '2024-01-04', open: 2035, high: 2050, low: 2025, close: 2045 },
        { date: '2024-01-05', open: 2045, high: 2060, low: 2035, close: 2055 }
      ]
    }
  } catch (error) {
    console.error('Error running analysis:', error)
  } finally {
    isAnalyzing.value = false
  }
}

const exportResults = () => {
  if (!analysisResults.value) return
  
  const data = JSON.stringify(analysisResults.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pattern-analysis.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.pattern-analysis {
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.pattern-selection, .analysis-params, .results {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.param {
  display: flex;
  flex-direction: column;
}

.input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
</template>
