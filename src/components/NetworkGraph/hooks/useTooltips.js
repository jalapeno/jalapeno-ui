import { useEffect } from 'react';
import { createTooltip, updateTooltip } from '../services/tooltipService';

export const useTooltips = (cy, pathSids) => {
  useEffect(() => {
    if (!cy) return;

    const pathTooltip = createTooltip('path-sids-tooltip');
    console.log('Tooltip created/updated:', {
      tooltipExists: !!pathTooltip,
      pathSidsLength: pathSids?.length,
      currentTop: pathTooltip.style.top,
      currentRight: pathTooltip.style.right,
      timestamp: new Date().toISOString()
    });

    if (pathSids?.length > 0) {
      updateTooltip(pathTooltip, pathSids);
      // Force position after update
      pathTooltip.style.top = '20px';
      pathTooltip.style.right = '190px';
      
      console.log('Tooltip position after update:', {
        top: pathTooltip.style.top,
        right: pathTooltip.style.right,
        timestamp: new Date().toISOString()
      });
    } else {
      pathTooltip.style.display = 'none';
    }

    return () => {
      if (pathTooltip?.parentNode) {
        pathTooltip.parentNode.removeChild(pathTooltip);
      }
    };
  }, [cy, pathSids]);
}; 