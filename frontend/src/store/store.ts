import { configureStore } from '@reduxjs/toolkit';
import systemSlice from './slices/systemSlice';
import dataSlice from './slices/dataSlice';
import patternsSlice from './slices/patternsSlice';
import analysisSlice from './slices/analysisSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    system: systemSlice,
    data: dataSlice,
    patterns: patternsSlice,
    analysis: analysisSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
