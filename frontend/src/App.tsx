import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import useWebSocketNotifications from './hooks/useWebSocketNotifications';
import { fetchSystemStatus } from './store/slices/systemSlice';

// Import styles
import './styles/designTokens.css';
import './index.css';

// Import components
import Navigation from './components/Navigation';
import NotificationCenter from './components/NotificationCenter';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Import pages
import Dashboard from './pages/Dashboard';
import PatternDiscovery from './pages/PatternDiscovery';
import PatternAnalysis from './pages/PatternAnalysis';
import AdminConsole from './pages/AdminConsole';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme, loading } = useAppSelector((state) => state.ui);
  const { connected } = useAppSelector((state) => state.system);

  // Initialize WebSocket connection
  useWebSocketNotifications();

  // Fetch initial system status
  useEffect(() => {
    dispatch(fetchSystemStatus());
  }, [dispatch]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            // Open command palette (future feature)
            break;
          case '/':
            event.preventDefault();
            // Focus search (future feature)
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading.global) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" message="Loading Forex Pattern Discovery Framework..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Router>
        <div className="flex h-screen overflow-hidden">
          <Navigation />
          
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/discovery" element={<PatternDiscovery />} />
              <Route path="/analysis" element={<PatternAnalysis />} />
              <Route path="/admin" element={<AdminConsole />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
        
        <NotificationCenter />
        
        {/* Connection status indicator */}
        {!connected && (
          <div className="fixed bottom-4 left-4 bg-error-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Reconnecting...</span>
            </div>
          </div>
        )}
      </Router>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
