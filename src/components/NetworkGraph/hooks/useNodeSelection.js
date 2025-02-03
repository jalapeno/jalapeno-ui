import { useState, useCallback, useEffect } from 'react';

export const useNodeSelection = (cy) => {
  const [selectedPath, setSelectedPath] = useState([]);
  const [pathSids, setPathSids] = useState([]);

  const clearSelection = useCallback(() => {
    if (!cy) return;
    setSelectedPath([]);
    setPathSids([]);
    cy.elements().removeClass('selected');
  }, [cy]);

  const handleNodeSelect = useCallback((node) => {
    if (!cy) return;

    console.log('handleNodeSelect called:', {
      nodeId: node.id(),
      nodeData: node.data(),
      currentPath: selectedPath,
      timestamp: new Date().toISOString()
    });

    const nodeData = node.data();
    
    // Update path with new node
    const newPath = [...selectedPath, node];
    setSelectedPath(newPath);

    // Collect SIDs from path nodes and format for tooltip
    const newPathSids = newPath
      .map(pathNode => {
        const data = pathNode.data();
        if (!data.sids?.[0]?.srv6_sid) return null;
        
        return {
          label: data.label || data.id,
          sid: data.sids[0].srv6_sid
        };
      })
      .filter(Boolean);

    console.log('Collected SIDs:', {
      pathSids: newPathSids,
      timestamp: new Date().toISOString()
    });

    setPathSids(newPathSids);
    
    // Update visual highlighting
    cy.elements().removeClass('selected');
    newPath.forEach(pathNode => pathNode.addClass('selected'));

    // Highlight connecting edges
    for (let i = 0; i < newPath.length - 1; i++) {
      const edge = cy.edges().filter(edge => 
        (edge.source().id() === newPath[i].id() && edge.target().id() === newPath[i + 1].id()) ||
        (edge.target().id() === newPath[i].id() && edge.source().id() === newPath[i + 1].id())
      );
      edge.addClass('selected');
    }

    // Create tooltip data in the same format as path calculation
    if (newPathSids.length > 0) {
      const srv6Data = {
        sidList: newPathSids.map(sid => sid.sid),
        usid: newPathSids.map(sid => sid.sid.split('::')[0]).join(':') + ':'
      };
      
      // Create or update tooltip
      let tooltip = document.querySelector('.path-sids-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'path-sids-tooltip';
        document.body.appendChild(tooltip);
      }

      tooltip.innerHTML = `
        <h4>SRv6 Information</h4>
        <div class="path-sids-info">
          <div class="path-sids-list">
            <strong>SID List:</strong>
            ${srv6Data.sidList.map(sid => `
              <div class="path-sids-item">${sid}</div>
            `).join('')}
          </div>
          <div class="path-sids-usid">
            <strong>Micro SID:</strong>
            <div class="path-sids-item">${srv6Data.usid}</div>
          </div>
        </div>
      `;
      tooltip.style.display = 'block';
      tooltip.style.top = '108px';
      tooltip.style.right = '190px';
    }

    return { newPath, newPathSids };
  }, [selectedPath, cy]);

  // Add style configuration when cy is available
  useEffect(() => {
    if (!cy) return;
    
    cy.style()
      .selector('.selected')
      .style({
        'background-color': '#FFD700',  // Gold highlight for selected nodes
        'line-color': '#FFD700',       // Gold highlight for selected edges
        'width': node => node.isEdge() ? 4 : 40,  // Thinner edges, same node size
        'height': node => node.isEdge() ? 4 : 40,
        'border-width': 3,
        'border-color': '#FF8C00'      // Dark orange border
      })
      .update();
  }, [cy]);

  return {
    selectedPath,
    pathSids,
    handleNodeSelect,
    clearSelection
  };
}; 