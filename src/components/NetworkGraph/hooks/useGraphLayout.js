import { useState, useEffect } from 'react';
import { layouts } from '../config/layouts';

export const useGraphLayout = () => {
  const [selectedLayout, setSelectedLayout] = useState('');

  const handleLayoutChange = (layout) => {
    console.log('Layout change requested:', {
      layout,
      selectedConfig: layouts[layout],
      timestamp: new Date().toISOString()
    });
    setSelectedLayout(layout);
  };

  const currentLayout = selectedLayout ? layouts[selectedLayout] : layouts['cose'];
  
  // Add debug logging
  useEffect(() => {
    console.log('useGraphLayout: Current layout:', {
      selectedLayout,
      currentLayout,
      timestamp: new Date().toISOString()
    });
  }, [selectedLayout, currentLayout]);

  return { 
    selectedLayout, 
    handleLayoutChange,
    currentLayout
  };
}; 