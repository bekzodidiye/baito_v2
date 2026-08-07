import React, { createContext, useContext, useMemo } from 'react';
import { AppContextType } from './types';
import { useUIState } from './useUIState';
import { useAuthState } from './useAuthState';

export * from './types';
export { getJobDates, safeGetItem, safeSetItem } from './utils';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const uiState = useUIState();
  const authState = useAuthState();

  // Memoize value object to avoid Context Pollution re-renders
  const value: AppContextType = useMemo(() => ({
    ...uiState,
    ...authState,
  }), [uiState, authState]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
