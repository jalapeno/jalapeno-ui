import { useState } from 'react';

export const useGraphLayout = () => {
  const [selectedLayout, setSelectedLayout] = useState('cose');

  const layoutOptions = {
    cose: {
      name: 'cose',
      padding: 50,
      animate: true
    },
    circle: {
      name: 'circle',
      padding: 50,
      animate: true
    },
    concentric: {
      name: 'concentric',
      padding: 50,
      animate: true
    }
  };

  const handleLayoutChange = (layout) => {
    setSelectedLayout(layout);
  };

  return { selectedLayout, layoutOptions, handleLayoutChange };
}; 