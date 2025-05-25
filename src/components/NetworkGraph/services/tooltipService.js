import { theme } from '../../../styles/theme';

export const createTooltip = (className) => {
  let tooltip = document.querySelector(`.${className}`);
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = className;
    document.body.appendChild(tooltip);
  }
  return tooltip;
};

export const updateTooltip = (tooltip, pathSids) => {
  if (!pathSids?.length) return;

  tooltip.innerHTML = `
    <div>
      <h4>SRv6 Information</h4>
      <div class="path-sids-info">
        <div class="path-sids-list">
          <strong>SID List:</strong>
          ${pathSids
            .filter(item => item?.sid)
            .map(item => `
              <div class="path-sids-item">
                ${item.label}: ${item.sid}
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
  
  tooltip.style.display = 'block';
  tooltip.style.top = '20px';  // Match legend's top position
  tooltip.style.right = '190px';  // Position to left of legend
}; 