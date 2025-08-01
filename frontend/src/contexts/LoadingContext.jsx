import React, { createContext, useContext, useState } from 'react';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const startLoading = () => {
    setIsGlobalLoading(true);
  };

  const stopLoading = () => {
    setIsGlobalLoading(false);
  };

  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      startLoading,
      stopLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
} 