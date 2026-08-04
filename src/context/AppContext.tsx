import React, { createContext, useContext, useEffect } from 'react';
import { AppContextType } from './types';
import { useUIState } from './useUIState';
import { useAuthState } from './useAuthState';
import { useJobsData } from './useJobsData';
import { useChatsData } from './useChatsData';

export * from './types';
export { getJobDates, safeGetItem, safeSetItem } from './utils';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const uiState = useUIState();
  const authState = useAuthState();
  const jobsData = useJobsData();
  const chatsData = useChatsData(authState.language);

  // Employer access control logic
  const isEmployer = authState.isLoggedIn && authState.userProfile?.selectedRole === 'employer';
  let finalScreen = uiState.currentScreen;
  
  if (authState.isLoggedIn) {
    if (isEmployer) {
      if (['qidiruv', 'xarita', 'kalendar', 'xabarlar', 'chat', 'yakunlash'].includes(finalScreen)) {
        finalScreen = 'employer-dashboard';
      } else if (finalScreen === 'profil') {
        finalScreen = 'employer-profile';
      }
    } else {
      if (finalScreen.startsWith('employer-')) {
        finalScreen = 'xarita';
      }
    }
  }

  useEffect(() => {
    if (finalScreen !== uiState.currentScreen) {
      uiState.setCurrentScreen(finalScreen);
    }
  }, [finalScreen, uiState.currentScreen, uiState.setCurrentScreen]);

  const value: AppContextType = {
    ...uiState,
    ...authState,
    ...jobsData,
    ...chatsData,
    currentScreen: finalScreen,
  };

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
