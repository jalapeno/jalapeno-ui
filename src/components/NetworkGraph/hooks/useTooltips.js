import { useEffect } from 'react';
import { createTooltip, updateTooltip } from '../services/tooltipService';

export const useTooltips = (cy, pathSids) => {
  useEffect(() => {
    if (!cy) return;

    const pathTooltip = createTooltip('path-sids-tooltip');

    if (pathSids?.length > 0) {
      updateTooltip(pathTooltip, pathSids);
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