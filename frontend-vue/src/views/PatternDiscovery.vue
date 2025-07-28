<template>
  <div class="pattern-discovery">
    <div class="header">
      <h1 class="text-2xl font-bold mb-4">Pattern Discovery</h1>
      <p class="text-gray-600">Discover new patterns in XAU/Gold data</p>
    </div>

    <div class="content">
      <!-- Upload Section -->
      <div class="upload-section">
        <h2 class="text-xl font-semibold mb-4">Upload Data</h2>
        <div class="upload-area">
          <input
            type="file"
            @change="handleFileUpload"
            accept=".csv,.json"
            class="file-input"
          />
          <div class="upload-info">
            <p>Upload CSV or JSON files with XAU/Gold data</p>
            <p class="text-sm text-gray-500">Expected columns: date, open, high, low, close, volume</p>
          </div>
        </div>
      </div>

      <!-- Discovery Parameters -->
      <div class="parameters-section">
        <h2 class="text-xl font-semibold mb-4">Discovery Parameters</h2>
        <div class="parameters-grid">
          <div class="parameter">
            <label>Timeframe</label>
            <select v-model="parameters.timeframe" class="input">
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
            </select>
          </div>
          <div class="parameter">
            <label>Pattern Length</label>
            <input v-model.number="parameters.patternLength" type="number" class="input" min="3" max="20" />
          </div>
          <div class="parameter">
            <label>Similarity Threshold</label>
            <input v-model.number="parameters.similarityThreshold" type="range" min="0.1" max="1.0" step="0.1" class="input" />
            <span>{{ parameters.similarityThreshold }}</span>
          </div>
        </div>
      </div>

      <!-- Discovery Results -->
      <div class="results-section">
        <h2 class="text-xl font-semibold mb-4">Discovery Results</h2>
        <div v-if="isDiscovering" class="loading">
          <div class="spinner"></div>
          <p>Discovering patterns...</p>
        </div>
        <div v-else-if="discoveredPatterns.length > 0" class="patterns-grid">
          <div v-for="pattern in discoveredPatterns" :key="pattern.id" class="pattern-card">
            <h3 class="font-semibold">Pattern {{ pattern.id }}</h3>
            <p class="text-sm text-gray-600">Confidence: {{ pattern.confidence }}%</p>
            <p class="text-sm text-gray-600">Frequency: {{ pattern.frequency }}</p>
            <CandlestickChart :data="pattern.data" :title="`Pattern ${pattern.id}`" />
          </div>
        </div>
        <div v-else class="no-results">
          <p>No patterns discovered yet. Upload data and run discovery.</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions">
        <button @click="runDiscovery" :disabled="isDiscovering" class="btn btn-primary">
          {{ isDiscovering ? 'Discovering...' : 'Run Discovery' }}
        </button>
        <button @click="resetDiscovery" class="btn btn-secondary">Reset</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CandlestickChart from '@/components/CandlestickChart.vue'
import { apiService } from '@/services/api'

const parameters = ref({
  timeframe: '1h',
  patternLength: 5,
  similarityThreshold: 0.7
})

const isDiscovering = ref(false)
const discoveredPatterns = ref([])
const uploadedFile = ref<File | null>(null)

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    uploadedFile.value = target.files[0]
  }
}

const runDiscovery = async () => {
  if (!uploadedFile.value) {
    alert('Please upload a file first')
    return
  }

  isDiscovering.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadedFile.value)
    formData.append('timeframe', parameters.value.timeframe)
    formData.append('patternLength', parameters.value.patternLength.toString())
    formData.append('similarityThreshold', parameters.value.similarityThreshold.toString())

    const response = await apiService.discoverPatterns(formData)
    discoveredPatterns.value = response.data.patterns || []
  } catch (error) {
    console.error('Error discovering patterns:', error)
    alert('Error discovering patterns. Please try again.')
  } finally {
    isDiscovering.value = false
  }
}

const resetDiscovery = () => {
  discoveredPatterns.value = []
  uploadedFile.value = null
  parameters.value = {
    timeframe: '1h',
    patternLength: 5,
    similarityThreshold: 0.7
  }
}
</script>

<style scoped>
.pattern-discovery {
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

.upload-section, .parameters-section, .results-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}

.file-input {
  margin-bottom: 1rem;
}

.parameters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.parameter {
  display: flex;
  flex-direction: column;
}

.input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.patterns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.pattern-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 1rem;
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
