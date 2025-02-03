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
    <h4>SRv6 Information</h4>
    <div class="path-sids-info">
      <div class="path-sids-list">
        <strong>SID List:</strong>
        ${pathSids
          .filter(item => item?.sid)
          .map(item => `
            <div class="path-sids-item">${item.sid}</div>
          `).join('')}
      </div>
    </div>
  `;
  
  tooltip.style.display = 'block';
  tooltip.style.right = '190px';
  tooltip.style.top = '80px';
  tooltip.style.width = 'auto';
}; 