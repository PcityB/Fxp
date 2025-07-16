# Information Architecture - Forex Pattern Discovery Framework

## System Overview

The Forex Pattern Discovery Framework frontend is a comprehensive React + TypeScript application that provides a professional trading terminal interface for discovering, analyzing, and validating novel candlestick patterns in forex data.

## API Backend Mapping

```
Backend API (Port 8000)          →    Frontend UI Components
├── /api/system/status          →    Dashboard (System Status Widget)
├── /api/data/list              →    Data Management Panel
├── /api/data/upload            →    Data Upload Component
├── /api/data/preprocess        →    Data Processing Controls
├── /api/patterns/extract       →    Pattern Discovery Workspace
├── /api/patterns/list          →    Pattern Gallery
├── /api/patterns/{timeframe}   →    Pattern Details View
├── /api/analysis/analyze       →    Analysis Studio
├── /api/analysis/list          →    Analysis Results
└── /api/system/tasks/{id}      →    Job Monitor Component
```

## Data Flow Architecture

```
User Interaction → Redux Actions → API Service → Backend → Response → Redux Store → UI Update

Example Flow:
1. User clicks "Extract Patterns" button
2. PatternDiscovery component dispatches extractPatterns action
3. Redux middleware calls API service (axios)
4. API service sends POST to /api/patterns/extract
5. Backend processes request and returns job ID
6. Frontend polls /api/system/tasks/{job_id} for status
7. Job completion triggers UI update with results
```

## Component Hierarchy

```
App
├── Navigation
├── Router
│   ├── Dashboard
│   │   ├── SystemStatusCard
│   │   ├── RecentDiscoveries
│   │   ├── PerformanceMetrics
│   │   └── QuickActions
│   ├── PatternDiscovery
│   │   ├── ParameterForm
│   │   ├── JobMonitor
│   │   ├── PatternHeatMap
│   │   └── PatternComparison
│   ├── PatternAnalysis
│   │   ├── CandlestickChart
│   │   ├── StatisticalPanel
│   │   ├── BacktestRunner
│   │   └── KPITiles
│   └── AdminConsole
│       ├── UserManagement
│       ├── ResourceMonitor
│       ├── JobLogs
│       └── SystemSettings
├── NotificationCenter
└── Footer
```

## State Management Structure

```
Redux Store
├── system
│   ├── status: SystemStatus
│   ├── tasks: Task[]
│   └── notifications: Notification[]
├── data
│   ├── datasets: Dataset[]
│   ├── uploadProgress: UploadProgress
│   └── processingJobs: ProcessingJob[]
├── patterns
│   ├── extractedPatterns: Pattern[]
│   ├── selectedPattern: Pattern | null
│   ├── extractionJobs: ExtractionJob[]
│   └── comparisonPatterns: Pattern[]
├── analysis
│   ├── results: AnalysisResult[]
│   ├── selectedAnalysis: AnalysisResult | null
│   ├── backtestResults: BacktestResult[]
│   └── analysisJobs: AnalysisJob[]
└── ui
    ├── theme: 'light' | 'dark'
    ├── sidebarCollapsed: boolean
    ├── activeTab: string
    └── loading: LoadingState
```

## Real-time Communication

```
WebSocket Connection (ws://localhost:8000/ws)
├── Job Status Updates
├── System Alerts
├── Pattern Discovery Notifications
└── Analysis Completion Events

Frontend WebSocket Handler:
- Connects on app initialization
- Dispatches Redux actions for incoming messages
- Implements reconnection logic
- Handles connection state in UI
```

## Responsive Breakpoints

```
Mobile:  375px - 767px   (Stack layout, simplified navigation)
Tablet:  768px - 1023px  (Hybrid layout, collapsible sidebar)
Desktop: 1024px+         (Full layout, all features visible)
```

## Security Considerations

- API calls include CORS headers (configured in backend)
- Input validation on all forms
- XSS protection through React's built-in escaping
- No sensitive data stored in localStorage
- Error messages don't expose system internals
