import React, { createContext, useContext } from 'react';

const EvaluationContext = createContext();

export function useEvaluationContext() {
  const context = useContext(EvaluationContext);
  if (!context) {
    throw new Error('useEvaluationContext must be used within an EvaluationProvider');
  }
  return context;
}

export function EvaluationProvider({ children, evaluationData }) {
  return (
    <EvaluationContext.Provider value={evaluationData}>
      {children}
    </EvaluationContext.Provider>
  );
} 