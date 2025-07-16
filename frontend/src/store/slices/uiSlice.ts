import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface LoadingState {
  global: boolean;
  dashboard: boolean;
  patterns: boolean;
  analysis: boolean;
  data: boolean;
}

interface UiState {
  theme: 'light' | 'dark' | 'high-contrast';
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  activeTab: string;
  loading: LoadingState;
  notifications: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number; // in seconds
    compactMode: boolean;
    showTooltips: boolean;
    animationsEnabled: boolean;
  };
  modals: {
    patternDetails: boolean;
    exportDialog: boolean;
    settingsDialog: boolean;
    confirmDialog: boolean;
  };
  confirmDialog: {
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null;
}

const initialState: UiState = {
  theme: 'light',
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  activeTab: 'dashboard',
  loading: {
    global: false,
    dashboard: false,
    patterns: false,
    analysis: false,
    data: false,
  },
  notifications: {
    enabled: true,
    position: 'top-right',
  },
  preferences: {
    autoRefresh: true,
    refreshInterval: 30,
    compactMode: false,
    showTooltips: true,
    animationsEnabled: true,
  },
  modals: {
    patternDetails: false,
    exportDialog: false,
    settingsDialog: false,
    confirmDialog: false,
  },
  confirmDialog: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'high-contrast'>) => {
      state.theme = action.payload;
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ key: keyof LoadingState; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<UiState['notifications']>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updatePreferences: (state, action: PayloadAction<Partial<UiState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    openModal: (state, action: PayloadAction<keyof UiState['modals']>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<keyof UiState['modals']>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key as keyof UiState['modals']] = false;
      });
    },
    showConfirmDialog: (state, action: PayloadAction<{
      title: string;
      message: string;
      onConfirm?: () => void;
      onCancel?: () => void;
    }>) => {
      state.confirmDialog = action.payload;
      state.modals.confirmDialog = true;
    },
    hideConfirmDialog: (state) => {
      state.confirmDialog = null;
      state.modals.confirmDialog = false;
    },
    // Responsive breakpoint handling
    handleBreakpointChange: (state, action: PayloadAction<'mobile' | 'tablet' | 'desktop'>) => {
      const breakpoint = action.payload;
      
      // Auto-collapse sidebar on mobile
      if (breakpoint === 'mobile') {
        state.sidebarCollapsed = true;
        state.mobileMenuOpen = false;
      } else if (breakpoint === 'desktop') {
        state.sidebarCollapsed = false;
        state.mobileMenuOpen = false;
      }
    },
    // Accessibility helpers
    enableHighContrast: (state) => {
      state.theme = 'high-contrast';
      document.documentElement.setAttribute('data-theme', 'high-contrast');
    },
    toggleAnimations: (state) => {
      state.preferences.animationsEnabled = !state.preferences.animationsEnabled;
      // Apply to document for CSS animations
      document.documentElement.setAttribute(
        'data-animations', 
        state.preferences.animationsEnabled ? 'enabled' : 'disabled'
      );
    },
    // Keyboard navigation
    focusNextElement: (state) => {
      // This would be handled by a custom hook or middleware
      // Just keeping the action for consistency
    },
    focusPreviousElement: (state) => {
      // This would be handled by a custom hook or middleware
      // Just keeping the action for consistency
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  toggleMobileMenu,
  setMobileMenuOpen,
  setActiveTab,
  setLoading,
  setGlobalLoading,
  updateNotificationSettings,
  updatePreferences,
  openModal,
  closeModal,
  closeAllModals,
  showConfirmDialog,
  hideConfirmDialog,
  handleBreakpointChange,
  enableHighContrast,
  toggleAnimations,
  focusNextElement,
  focusPreviousElement,
} = uiSlice.actions;

export default uiSlice.reducer;
