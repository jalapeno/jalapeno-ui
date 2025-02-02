import React, { useState } from 'react';
import GraphVisualization from './components/GraphVisualization';
import GraphLegend from './components/GraphLegend';
import { useGraphData } from './hooks/useGraphData';
import { useGraphLayout } from './hooks/useGraphLayout';
import { pathCalcService } from '../../services/pathCalcService';
import { workloadScheduleService } from '../../services/workloadScheduleService';
import { theme } from '../../styles/theme';

const NetworkGraph = ({ 
  collection, 
  onPathCalculationStart, 
  isWorkloadMode,
  onWorkloadPathsCalculated 
}) => {
  const { graphData } = useGraphData(collection);
  const { selectedLayout, layoutOptions, handleLayoutChange } = useGraphLayout();
  
  const handleNodeSelect = async (sourceId, destId) => {
    if (!sourceId || !destId) return;
    
    try {
      const result = await pathCalcService.calculatePath(collection, sourceId, destId);
      if (result.found) {
        // Highlight the calculated path
        const cy = document.querySelector('cytoscape').cy;
        pathCalcService.highlightPath(cy, result.path);
      }
    } catch (error) {
      console.error('Path calculation failed:', error);
    }
  };

  const handleWorkloadSelect = async (selectedNodes) => {
    if (!selectedNodes || selectedNodes.length < 2) return;
    
    try {
      const result = await workloadScheduleService.calculateWorkloadPaths(
        collection,
        selectedNodes
      );
      onWorkloadPathsCalculated?.(result);
    } catch (error) {
      console.error('Workload calculation failed:', error);
    }
  };

  return (
    <div className="network-graph" style={{ 
      width: '100%', 
      height: 'calc(100vh - 72px)',
      position: 'relative',
      backgroundColor: theme.colors.background.light
    }}>
      <GraphVisualization 
        graphData={graphData}
        layoutOptions={layoutOptions}
        selectedLayout={selectedLayout}
        onNodeSelect={handleNodeSelect}
        onWorkloadSelect={handleWorkloadSelect}
      />
      <GraphLegend />
    </div>
  );
};

export default NetworkGraph; 