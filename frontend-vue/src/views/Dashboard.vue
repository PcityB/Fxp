<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
      <p class="text-gray-600">XAU/Gold Pattern Analysis Overview</p>
    </div>

    <div class="dashboard-content">
      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <h3 class="text-lg font-semibold">Total Datasets</h3>
          <p class="text-3xl font-bold text-blue-600">{{ metrics.totalDatasets }}</p>
        </div>
        <div class="metric-card">
          <h3 class="text-lg font-semibold">Patterns Discovered</h3>
          <p class="text-3xl font-bold text-green-600">{{ metrics.patternsDiscovered }}</p>
        </div>
        <div class="metric-card">
          <h3 class="text-lg font-semibold">Analysis Completed</h3>
          <p class="text-3xl font-bold text-purple-600">{{ metrics.analysisCompleted }}</p>
        </div>
        <div class="metric-card">
          <h3 class="text-lg font-semibold">System Status</h3>
          <p class="text-3xl font-bold" :class="systemStatusClass">{{ systemStatus }}</p>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-container">
          <h2 class="text-xl font-semibold mb-4">Price Trends</h2>
          <CandlestickChart :data="priceData" title="XAU/USD Price Trends" />
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="activity-section">
        <h2 class="text-xl font-semibold mb-4">Recent Activity</h2>
        <div class="activity-list">
          <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
            <div class="activity-icon">
              <span class="text-2xl">{{ activity.icon }}</span>
            </div>
            <div class="activity-content">
              <h4 class="font-semibold">{{ activity.title }}</h4>
              <p class="text-sm text-gray-600">{{ activity.description }}</p>
              <span class="text-xs text-gray-400">{{ activity.timestamp }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CandlestickChart from '@/components/CandlestickChart.vue'
import { apiService } from '@/services/api'

const metrics = ref({
  totalDatasets: 0,
  patternsDiscovered: 0,
  analysisCompleted: 0
})

const systemStatus = ref('Online')
const priceData = ref([])
const recentActivity = ref([])

const systemStatusClass = computed(() => {
  return systemStatus.value === 'Online' ? 'text-green-600' : 'text-red-600'
})

const loadDashboardData = async () => {
  try {
    const [datasets, patterns, analysis] = await Promise.all([
      apiService.getDatasets(),
      apiService.getPatterns(),
      apiService.getAnalysis()
    ])
    
    metrics.value.totalDatasets = datasets.data?.length || 0
    metrics.value.patternsDiscovered = patterns.data?.length || 0
    metrics.value.analysisCompleted = analysis.data?.length || 0
    
    // Load sample price data
    priceData.value = [
      { date: '2024-01-01', open: 2000, high: 2020, low: 1990, close: 2010 },
      { date: '2024-01-02', open: 2010, high: 2030, low: 2000, close: 2025 },
      { date: '2024-01-03', open: 2025, high: 2040, low: 2015, close: 2035 },
      { date: '2024-01-04', open: 2035, high: 2050, low: 2025, close: 2045 },
      { date: '2024-01-05', open: 2045, high: 2060, low: 2035, close: 2055 }
    ]
    
    recentActivity.value = [
      {
        id: 1,
        icon: '📊',
        title: 'New Dataset Uploaded',
        description: 'XAU 1H data uploaded successfully',
        timestamp: '2 hours ago'
      },
      {
        id: 2,
        icon: '🔍',
        title: 'Pattern Discovery Complete',
        description: 'Found 15 new patterns in recent data',
        timestamp: '4 hours ago'
      },
      {
        id: 3,
        icon: '📈',
        title: 'Analysis Report Generated',
        description: 'Comprehensive analysis completed for Q1 2024',
        timestamp: '1 day ago'
      }
    ]
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.charts-section {
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.activity-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.activity-list {
  space-y: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.activity-icon {
  margin-right: 1rem;
}

.activity-content {
  flex: 1;
}
</style>
</template>
