import { useRef, useCallback, useEffect } from 'react';

export const useSequentialNodeSelection = (cy) => {
  const sequentialPathRef = useRef([]);

  const clearSequentialSelection = useCallback(() => {
    if (!cy) return;
    sequentialPathRef.current = [];
    cy.elements().removeClass('sequential');
    const tooltip = document.querySelector('.sequential-path-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }, [cy]);

  const handleSequentialNodeSelect = useCallback((node) => {
    if (!cy) return;

    console.log('Sequential path: Adding node:', {
      nodeId: node.id(),
      pathLength: sequentialPathRef.current.length,
      timestamp: new Date().toISOString()
    });

    // Add node to sequential path if not already present
    if (!sequentialPathRef.current.find(n => n.id() === node.id())) {
      sequentialPathRef.current.push(node);
    }

    // Debug log current path
    console.log('Current sequential path:', {
      nodes: sequentialPathRef.current.map(n => n.id()),
      timestamp: new Date().toISOString()
    });

    // Highlight all nodes in the sequential path
    sequentialPathRef.current.forEach(pathNode => {
      pathNode.addClass('sequential');
    });

    // Highlight connecting edges
    for (let i = 0; i < sequentialPathRef.current.length - 1; i++) {
      const currentNode = sequentialPathRef.current[i];
      const nextNode = sequentialPathRef.current[i + 1];
      
      const connectingEdges = cy.edges().filter(edge => 
        (edge.source().id() === currentNode.id() && edge.target().id() === nextNode.id()) ||
        (edge.target().id() === currentNode.id() && edge.source().id() === nextNode.id())
      );
      connectingEdges.addClass('sequential');
    }

    // Collect SIDs from ALL nodes in the path
    const pathSids = sequentialPathRef.current
      .map(pathNode => {
        const data = pathNode.data();
        if (!data.sids?.[0]?.srv6_sid) return null;
        return {
          label: data.label || data.id,
          sid: data.sids[0].srv6_sid
        };
      })
      .filter(Boolean);

    // Debug log collected SIDs
    console.log('Collected SIDs:', {
      count: pathSids.length,
      sids: pathSids.map(sid => sid.sid),
      timestamp: new Date().toISOString()
    });

    // Update tooltip with complete path information
    if (pathSids.length > 0) {
      let tooltip = document.querySelector('.path-sids-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'path-sids-tooltip';
        document.body.appendChild(tooltip);
      }

      // Build tooltip content with just the SID list
      tooltip.innerHTML = `
        <h4>Sequential Path SRv6 Info</h4>
        <div class="path-sids-info">
          <div class="path-sids-list">
            <strong>SID List:</strong>
            ${pathSids.map((sid, index) => `
              <div class="path-sids-item">
                ${index + 1}. ${sid.label}: ${sid.sid}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      tooltip.style.display = 'block';
      tooltip.style.top = '108px';
      tooltip.style.right = '190px';
    }
  }, [cy]);

  const getSequentialPath = useCallback(() => {
    return sequentialPathRef.current.filter(n => n.isNode());
  }, []);

  // Add style configuration when cy is available
  useEffect(() => {
    if (!cy) return;
    
    cy.style()
      .selector('.sequential')
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

  // Handle background clicks
  useEffect(() => {
    if (!cy) return;

    const handleBackgroundClick = (e) => {
      if (e.target === cy) {
        clearSequentialSelection();
      }
    };

    cy.on('tap', handleBackgroundClick);
    return () => cy.removeListener('tap', handleBackgroundClick);
  }, [cy, clearSequentialSelection]);

  return {
    handleSequentialNodeSelect,
    clearSequentialSelection,
    getSequentialPath
  };
}; 