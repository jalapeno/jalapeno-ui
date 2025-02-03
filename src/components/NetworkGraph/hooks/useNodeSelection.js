import { useState, useCallback } from 'react';

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

    const nodeData = node.data();
    
    // Update path with new node
    const newPath = [...selectedPath, node];
    setSelectedPath(newPath);

    // Collect SIDs from path nodes
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

    return { newPath, newPathSids };
  }, [selectedPath, cy]);

  return {
    selectedPath,
    pathSids,
    handleNodeSelect,
    clearSelection
  };
}; 