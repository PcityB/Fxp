import { configureStore } from '@reduxjs/toolkit'
import systemReducer from './slices/systemSlice'
import dataReducer from './slices/dataSlice'
import patternsReducer from './slices/patternsSlice'
import analysisReducer from './slices/analysisSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    system: systemReducer,
    data: dataReducer,
    patterns: patternsReducer,
    analysis: analysisReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
