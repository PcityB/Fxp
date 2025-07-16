# Component Specification Sheet - Forex Pattern Discovery Framework

## Core Components

### 1. CandlestickChart

**Purpose:** Interactive candlestick chart with pattern overlays using Plotly.js

**Props:**
```typescript
interface CandlestickChartProps {
  data: CandlestickData[];
  patterns?: PatternOverlay[];
  height?: number;
  width?: number;
  showControls?: boolean;
  onPatternClick?: (pattern: PatternOverlay) => void;
  loading?: boolean;
}

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
```

**States:**
- `loading: boolean` - Chart data loading state
- `selectedPattern: PatternOverlay | null` - Currently selected pattern
- `zoomLevel: number` - Current zoom level
- `panPosition: { x: number; y: number }` - Pan position

**Events:**
- `onPatternClick(pattern)` - Pattern overlay clicked
- `onZoomChange(level)` - Zoom level changed
- `onPanChange(position)` - Pan position changed
- `onDataPointHover(data)` - Data point hovered

**Variants:**
- `compact` - Smaller height, minimal controls
- `fullscreen` - Maximum size with all controls
- `embedded` - No controls, click-through disabled

---

### 2. MetricCard

**Purpose:** Display key performance indicators and metrics

**Props:**
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error';
  loading?: boolean;
  onClick?: () => void;
}
```

**States:**
- `loading: boolean` - Data loading state
- `animated: boolean` - Animation state for value changes

**Events:**
- `onClick()` - Card clicked (optional)

**Variants:**
- `small` - Compact size for dashboard grids
- `large` - Detailed view with additional information
- `minimal` - Text-only, no styling

---

### 3. JobMonitor

**Purpose:** Display and monitor background job progress

**Props:**
```typescript
interface JobMonitorProps {
  jobs: Job[];
  onJobCancel?: (jobId: string) => void;
  onJobRetry?: (jobId: string) => void;
  maxVisible?: number;
  showHistory?: boolean;
}

interface Job {
  id: string;
  type: 'pattern_extraction' | 'analysis' | 'preprocessing';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}
```

**States:**
- `expandedJob: string | null` - Currently expanded job details
- `autoRefresh: boolean` - Auto-refresh enabled state

**Events:**
- `onJobCancel(jobId)` - Cancel job requested
- `onJobRetry(jobId)` - Retry job requested
- `onJobExpand(jobId)` - Job details expanded

**Variants:**
- `compact` - Single line per job
- `detailed` - Full job information
- `minimal` - Progress bars only

---

### 4. PatternGallery

**Purpose:** Grid display of discovered patterns with filtering

**Props:**
```typescript
interface PatternGalleryProps {
  patterns: Pattern[];
  selectedPatterns?: string[];
  onPatternSelect?: (patternId: string) => void;
  onPatternCompare?: (patternIds: string[]) => void;
  filters?: PatternFilters;
  onFiltersChange?: (filters: PatternFilters) => void;
  loading?: boolean;
}

interface Pattern {
  id: string;
  clusterId: number;
  timeframe: string;
  occurrences: number;
  profitability: number;
  significance: number;
  thumbnail: string;
  metadata: PatternMetadata;
}

interface PatternFilters {
  timeframe?: string[];
  profitability?: [number, number];
  significance?: [number, number];
  minOccurrences?: number;
}
```

**States:**
- `selectedPatterns: Set<string>` - Selected pattern IDs
- `sortBy: string` - Current sort field
- `sortOrder: 'asc' | 'desc'` - Sort direction
- `viewMode: 'grid' | 'list'` - Display mode

**Events:**
- `onPatternSelect(patternId)` - Pattern selected
- `onPatternCompare(patternIds)` - Compare patterns requested
- `onSortChange(field, order)` - Sort changed
- `onViewModeChange(mode)` - View mode changed

**Variants:**
- `grid` - Card-based grid layout
- `list` - Table-like list layout
- `carousel` - Horizontal scrolling

---

### 5. NotificationCenter

**Purpose:** Display real-time notifications and alerts

**Props:**
```typescript
interface NotificationCenterProps {
  notifications: Notification[];
  onNotificationDismiss?: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  persistent?: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}
```

**States:**
- `expanded: boolean` - Notification center expanded
- `unreadCount: number` - Number of unread notifications

**Events:**
- `onNotificationDismiss(id)` - Notification dismissed
- `onNotificationClick(notification)` - Notification clicked
- `onExpandToggle()` - Expand/collapse toggled

**Variants:**
- `toast` - Temporary overlay notifications
- `panel` - Persistent side panel
- `badge` - Icon with count badge only

---

### 6. ParameterForm

**Purpose:** Dynamic form for pattern extraction and analysis parameters

**Props:**
```typescript
interface ParameterFormProps {
  schema: FormSchema;
  values: Record<string, any>;
  onValuesChange: (values: Record<string, any>) => void;
  onSubmit: (values: Record<string, any>) => void;
  loading?: boolean;
  errors?: Record<string, string>;
}

interface FormSchema {
  fields: FormField[];
  validation?: ValidationRules;
}

interface FormField {
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'range';
  label: string;
  description?: string;
  required?: boolean;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
}
```

**States:**
- `values: Record<string, any>` - Current form values
- `errors: Record<string, string>` - Validation errors
- `touched: Record<string, boolean>` - Touched fields

**Events:**
- `onValuesChange(values)` - Form values changed
- `onSubmit(values)` - Form submitted
- `onFieldFocus(fieldName)` - Field focused
- `onFieldBlur(fieldName)` - Field blurred

**Variants:**
- `compact` - Minimal spacing, inline labels
- `detailed` - Full descriptions and help text
- `wizard` - Multi-step form with navigation

---

### 7. DataTable

**Purpose:** Sortable, filterable data table with pagination

**Props:**
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  selection?: SelectionConfig;
  onRowClick?: (row: T) => void;
}

interface TableColumn<T> {
  key: keyof T;
  title: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface PaginationConfig {
  pageSize: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}
```

**States:**
- `currentPage: number` - Current page number
- `pageSize: number` - Items per page
- `sortBy: string` - Current sort column
- `sortOrder: 'asc' | 'desc'` - Sort direction
- `filters: Record<string, any>` - Active filters
- `selectedRows: Set<string>` - Selected row IDs

**Events:**
- `onPageChange(page, pageSize)` - Page changed
- `onSortChange(column, order)` - Sort changed
- `onFilterChange(filters)` - Filters changed
- `onSelectionChange(selectedRows)` - Selection changed

**Variants:**
- `compact` - Dense layout, smaller text
- `comfortable` - Standard spacing
- `spacious` - Extra padding and spacing

---

## Layout Components

### 8. DashboardLayout

**Purpose:** Main dashboard layout with sidebar and content area

**Props:**
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}
```

**States:**
- `sidebarCollapsed: boolean` - Sidebar collapsed state
- `mobileMenuOpen: boolean` - Mobile menu state

**Variants:**
- `fixed` - Fixed sidebar and header
- `fluid` - Responsive, collapsible sidebar
- `minimal` - No sidebar, header only

---

### 9. Navigation

**Purpose:** Main navigation component with routing

**Props:**
```typescript
interface NavigationProps {
  items: NavigationItem[];
  activeItem?: string;
  collapsed?: boolean;
  onItemClick?: (item: NavigationItem) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavigationItem[];
}
```

**States:**
- `activeItem: string` - Currently active navigation item
- `expandedItems: Set<string>` - Expanded parent items

**Variants:**
- `sidebar` - Vertical sidebar navigation
- `tabs` - Horizontal tab navigation
- `breadcrumb` - Breadcrumb navigation

---

## Form Components

### 10. FormInput

**Purpose:** Reusable form input with validation

**Props:**
```typescript
interface FormInputProps {
  type: 'text' | 'number' | 'email' | 'password';
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}
```

**States:**
- `focused: boolean` - Input focused state
- `touched: boolean` - Input has been interacted with

**Variants:**
- `outlined` - Outlined border style
- `filled` - Filled background style
- `underlined` - Bottom border only

---

### 11. Button

**Purpose:** Consistent button component with multiple variants

**Props:**
```typescript
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

**States:**
- `loading: boolean` - Loading state with spinner
- `pressed: boolean` - Button pressed state

**Variants:**
- `primary` - Main action button
- `secondary` - Secondary action button
- `outline` - Outlined button
- `ghost` - Minimal styling
- `danger` - Destructive action button

---

## Utility Components

### 12. LoadingSpinner

**Purpose:** Loading indicator component

**Props:**
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  overlay?: boolean;
  message?: string;
}
```

**Variants:**
- `spinner` - Rotating spinner
- `dots` - Animated dots
- `pulse` - Pulsing animation
- `skeleton` - Skeleton placeholder

---

### 13. ErrorBoundary

**Purpose:** Error boundary for graceful error handling

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
```

**States:**
- `hasError: boolean` - Error state
- `error: Error | null` - Current error

---

## Responsive Behavior

### Breakpoint System
```css
/* Mobile First Approach */
.component {
  /* Mobile styles (375px+) */
}

@media (min-width: 768px) {
  .component {
    /* Tablet styles */
  }
}

@media (min-width: 1024px) {
  .component {
    /* Desktop styles */
  }
}

@media (min-width: 1366px) {
  .component {
    /* Large desktop styles */
  }
}
```

### Component Adaptations
- **CandlestickChart**: Touch gestures on mobile, mouse interactions on desktop
- **DataTable**: Horizontal scroll on mobile, fixed columns on desktop
- **Navigation**: Bottom tabs on mobile, sidebar on desktop
- **ParameterForm**: Stacked fields on mobile, grid layout on desktop

## Accessibility Standards

### WCAG AA Compliance
- Color contrast ratio ≥ 4.5:1 for normal text
- Color contrast ratio ≥ 3:1 for large text
- All interactive elements keyboard accessible
- Screen reader compatible with ARIA labels
- Focus indicators clearly visible

### Keyboard Navigation
- Tab order follows logical flow
- Escape key closes modals/dropdowns
- Arrow keys navigate within components
- Enter/Space activate buttons and links

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for complex components
- Live regions for dynamic updates
- Alternative text for images and charts
