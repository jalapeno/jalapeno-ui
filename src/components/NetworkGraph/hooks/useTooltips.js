import { useEffect } from 'react';
import { createTooltip, updateTooltip } from '../services/tooltipService';

export const useTooltips = (cy, pathSids, pathTooltipData) => {
  useEffect(() => {
    if (!cy) return;

    const pathTooltip = createTooltip('path-sids-tooltip');
    
    // Handle SRv6 data from path calculation
    if (pathTooltipData) {
      pathTooltip.innerHTML = `
        <h4>SRv6 Information</h4>
        <div class="path-sids-info">
          <div class="path-sids-list">
            <strong>SID List:</strong>
            ${pathTooltipData.sidList.map(sid => `
              <div class="path-sids-item">${sid}</div>
            `).join('')}
          </div>
          <div class="path-sids-usid">
            <strong>Micro SID:</strong>
            <div class="path-sids-item">${pathTooltipData.usid}</div>
          </div>
        </div>
      `;
      pathTooltip.style.display = 'block';
    }
    // Handle SIDs from sequential node clicks
    else if (pathSids?.length > 0) {
      updateTooltip(pathTooltip, pathSids);
      pathTooltip.style.display = 'block';
    } else {
      pathTooltip.style.display = 'none';
    }

    // Force position
    pathTooltip.style.top = '108px';
    pathTooltip.style.right = '190px';

    return () => {
      if (pathTooltip?.parentNode) {
        pathTooltip.parentNode.removeChild(pathTooltip);
      }
    };
  }, [cy, pathSids, pathTooltipData]);
}; 