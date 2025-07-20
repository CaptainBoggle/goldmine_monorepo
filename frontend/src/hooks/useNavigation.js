import { useState } from 'react';

export function useNavigation() {
  const [activeTab, setActiveTab] = useState('Inference');

  const navigateTo = (tab) => {
    setActiveTab(tab);
  };

  const isActive = (tab) => {
    return activeTab === tab;
  };

  return {
    activeTab,
    setActiveTab,
    navigateTo,
    isActive
  };
} 