import { useEffect } from 'react';
import { createTooltip, updateTooltip } from '../services/tooltipService';

export const useTooltips = (cy, pathSids, pathTooltipData) => {
  useEffect(() => {
    if (!cy) return;

    // Create tooltip for path SIDs
    if (pathSids && pathSids.length > 0) {
      createTooltip(cy, pathSids);
    }

    // Update tooltip for path data
    if (pathTooltipData) {
      // Ensure pathTooltipData is an array before mapping
      const tooltipData = Array.isArray(pathTooltipData) ? pathTooltipData : [pathTooltipData];
      
      // Filter out any undefined or invalid entries
      const validData = tooltipData.filter(data => 
        data && 
        data.srv6Data && 
        Array.isArray(data.srv6Data.sidList)
      );

      if (validData.length > 0) {
        updateTooltip(cy, validData);
      }
    }

    return () => {
      // Cleanup tooltips
      const tooltip = document.querySelector('.path-sids-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [cy, pathSids, pathTooltipData]);
}; 