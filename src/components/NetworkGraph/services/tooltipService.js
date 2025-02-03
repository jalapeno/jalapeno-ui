export const createTooltip = (className) => {
  let tooltip = document.querySelector(`.${className}`);
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = className;
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#ffffff';
    tooltip.style.color = '#000000';  // Set default color to black
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);
  }
  return tooltip;
};

export const updateTooltip = (tooltip, pathSids) => {
  if (!pathSids?.length) return;

  tooltip.innerHTML = `
    <div style="color: #000000;">
      <h4 style="margin: 0 0 8px 0; color: #000000;">SRv6 Information</h4>
      <div class="path-sids-info">
        <div class="path-sids-list">
          <strong style="color: #000000;">SID List:</strong>
          ${pathSids
            .filter(item => item?.sid)
            .map(item => `
              <div class="path-sids-item" style="color: #000000; margin: 4px 0;">
                ${item.label}: ${item.sid}
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
  
  tooltip.style.display = 'block';
  tooltip.style.right = '190px';
  tooltip.style.top = '80px';
  tooltip.style.width = 'auto';
}; 