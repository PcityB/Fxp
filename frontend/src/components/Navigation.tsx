import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { toggleSidebar, setTheme } from '../store/slices/uiSlice';

const Navigation: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed, theme } = useAppSelector((state) => state.ui);
  const { connected } = useAppSelector((state) => state.system);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      description: 'System overview and metrics',
    },
    {
      id: 'discovery',
      label: 'Pattern Discovery',
      path: '/discovery',
      description: 'Extract and analyze patterns',
    },
    {
      id: 'analysis',
      label: 'Pattern Analysis',
      path: '/analysis',
      description: 'Analyze pattern performance',
    },
    {
      id: 'admin',
      label: 'Admin Console',
      path: '/admin',
      description: 'System administration',
    },
  ];

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    dispatch(setTheme(newTheme));
  };

  return (
    <nav
      className={`
        bg-surface border-r border-border flex flex-col transition-all duration-300
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FX</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-text-primary">
                  Forex Pattern Discovery
                </h1>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connected ? 'bg-success-500' : 'bg-error-500'
                    }`}
                  />
                  <span className="text-xs text-text-tertiary">
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1 rounded-md hover:bg-background transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="w-4 h-4 flex flex-col justify-center space-y-1">
              <div className="w-full h-0.5 bg-text-secondary rounded"></div>
              <div className="w-full h-0.5 bg-text-secondary rounded"></div>
              <div className="w-full h-0.5 bg-text-secondary rounded"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary-500 text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background'
                    }
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {/* Simple text-based icons */}
                      <span className="text-xs font-bold">
                        {item.id === 'dashboard' && '📊'}
                        {item.id === 'discovery' && '🔍'}
                        {item.id === 'analysis' && '📈'}
                        {item.id === 'admin' && '⚙️'}
                      </span>
                    </div>
                    
                    {!sidebarCollapsed && (
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    )}
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="text-xs text-text-tertiary">
              <div>Version 1.0.0</div>
              <div>© 2024 FX Pattern Discovery</div>
            </div>
          )}
          
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-md hover:bg-background transition-colors"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="text-sm">
              {theme === 'light' ? '🌙' : '☀️'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
