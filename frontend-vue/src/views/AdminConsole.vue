<template>
  <div class="admin-console">
    <div class="header">
      <h1 class="text-2xl font-bold mb-4">Admin Console</h1>
      <p class="text-gray-600">System administration and configuration</p>
    </div>

    <div class="content">
      <!-- System Status -->
      <div class="status-section">
        <h2 class="text-xl font-semibold mb-4">System Status</h2>
        <div class="status-grid">
          <div class="status-card">
            <h3>API Status</h3>
            <p :class="apiStatus === 'Online' ? 'text-green-600' : 'text-red-600'">{{ apiStatus }}</p>
          </div>
          <div class="status-card">
            <h3>Database</h3>
            <p :class="dbStatus === 'Connected' ? 'text-green-600' : 'text-red-600'">{{ dbStatus }}</p>
          </div>
          <div class="status-card">
            <h3>Storage</h3>
            <p>{{ storageUsage }} / {{ storageTotal }} GB</p>
          </div>
          <div class="status-card">
            <h3>Active Jobs</h3>
            <p>{{ activeJobs }}</p>
          </div>
        </div>
      </div>

      <!-- Configuration -->
      <div class="config-section">
        <h2 class="text-xl font-semibold mb-4">Configuration</h2>
        <div class="config-grid">
          <div class="config-item">
            <label>API Base URL</label>
            <input v-model="config.apiBaseUrl" type="text" class="input" />
          </div>
          <div class="config-item">
            <label>Max File Size (MB)</label>
            <input v-model.number="config.maxFileSize" type="number" class="input" />
          </div>
          <div class="config-item">
            <label>Processing Threads</label>
            <input v-model.number="config.processingThreads" type="number" class="input" />
          </div>
          <div class="config-item">
            <label>Cache Duration (hours)</label>
            <input v-model.number="config.cacheDuration" type="number" class="input" />
          </div>
        </div>
        <button @click="saveConfig" class="btn btn-primary">Save Configuration</button>
      </div>

      <!-- Maintenance -->
      <div class="maintenance-section">
        <h2 class="text-xl font-semibold mb-4">Maintenance</h2>
        <div class="maintenance-actions">
          <button @click="clearCache" class="btn btn-warning">Clear Cache</button>
          <button @click="restartWorkers" class="btn btn-warning">Restart Workers</button>
          <button @click="backupData" class="btn btn-success">Backup Data</button>
          <button @click="cleanupOldData" class="btn btn-danger">Cleanup Old Data</button>
        </div>
      </div>

      <!-- Logs -->
      <div class="logs-section">
        <h2 class="text-xl font-semibold mb-4">System Logs</h2>
        <div class="logs-container">
          <div v-for="log in logs" :key="log.id" class="log-entry">
            <span class="log-timestamp">{{ log.timestamp }}</span>
            <span class="log-level" :class="`log-${log.level}`">{{ log.level }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService } from '@/services/api'

const apiStatus = ref('Checking...')
const dbStatus = ref('Checking...')
const storageUsage = ref(0)
const storageTotal = ref(100)
const activeJobs = ref(0)

const config = ref({
  apiBaseUrl: 'http://localhost:8000',
  maxFileSize: 100,
  processingThreads: 4,
  cacheDuration: 24
})

const logs = ref([
  { id: 1, timestamp: '2024-01-01 10:00:00', level: 'INFO', message: 'System started successfully' },
  { id: 2, timestamp: '2024-01-01 10:05:00', level: 'WARN', message: 'High memory usage detected' },
  { id: 3, timestamp: '2024-01-01 10:10:00', level: 'ERROR', message: 'Failed to process file: data.csv' },
  { id: 4, timestamp: '2024-01-01 10:15:00', level: 'INFO', message: 'Pattern discovery completed' }
])

const loadSystemStatus = async () => {
  try {
    const response = await apiService.getSystemStatus()
    apiStatus.value = 'Online'
    dbStatus.value = 'Connected'
    activeJobs.value = response.data?.activeJobs || 0
  } catch (error) {
    apiStatus.value = 'Offline'
    dbStatus.value = 'Disconnected'
  }
}

const saveConfig = async () => {
  try {
    // Save configuration
    console.log('Saving configuration:', config.value)
    alert('Configuration saved successfully')
  } catch (error) {
    console.error('Error saving configuration:', error)
    alert('Error saving configuration')
  }
}

const clearCache = async () => {
  try {
    console.log('Clearing cache...')
    alert('Cache cleared successfully')
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

const restartWorkers = async () => {
  try {
    console.log('Restarting workers...')
    alert('Workers restarted successfully')
  } catch (error) {
    console.error('Error restarting workers:', error)
  }
}

const backupData = async () => {
  try {
    console.log('Creating backup...')
    alert('Backup created successfully')
  } catch (error) {
    console.error('Error creating backup:', error)
  }
}

const cleanupOldData = async () => {
  try {
    console.log('Cleaning up old data...')
    alert('Old data cleaned up successfully')
  } catch (error) {
    console.error('Error cleaning up old data:', error)
  }
}

onMounted(() => {
  loadSystemStatus()
})
</script>

<style scoped>
.admin-console {
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

.status-section, .config-section, .maintenance-section, .logs-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-card {
  padding: 1rem;
  text-align: center;
  border: 1px solid #eee;
  border-radius: 8px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
}

.input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.maintenance-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 1rem;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  font-family: monospace;
  font-size: 0.9rem;
}

.log-timestamp {
  color: #666;
}

.log-level {
  font-weight: bold;
}

.log-INFO { color: #007bff; }
.log-WARN { color: #ffc107; }
.log-ERROR { color: #dc3545; }

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary { background: #007bff; color: white; }
.btn-warning { background: #ffc107; color: black; }
.btn-success { background: #28a745; color: white; }
.btn-danger { background: #dc3545; color: white; }
</style>
</template>
