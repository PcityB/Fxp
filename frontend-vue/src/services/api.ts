import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const apiService = {
  // System endpoints
  getSystemStatus: () => api.get('/api/system/status'),
  
  // Data endpoints
  getDatasets: () => api.get('/api/data/list'),
  uploadData: (formData: FormData) => api.post('/api/data/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  preprocessData: (params: any) => api.post('/api/data/preprocess', params),
  
  // Pattern endpoints
  getPatterns: () => api.get('/api/patterns/list'),
  discoverPatterns: (params: any) => api.post('/api/patterns/discover', params),
  analyzePatterns: (params: any) => api.post('/api/patterns/analyze', params),
  
  // Analysis endpoints
  getAnalysis: () => api.get('/api/analysis/list'),
  runAnalysis: (params: any) => api.post('/api/analysis/run', params),
}

export default api
