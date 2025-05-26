import React, { useEffect, useState } from 'react';
import GraphVisualization from './components/GraphVisualization';
import GraphLegend from './components/GraphLegend';
import { useGraphData } from './hooks/useGraphData';
import { useGraphLayout } from './hooks/useGraphLayout';
import { pathCalcService } from '../../services/pathCalcService';
import { workloadScheduleService } from '../../services/workloadScheduleService';
import { theme } from '../../styles/theme';
import { cytoscapeStyles } from './styles/cytoscapeStyles';
import { layouts } from './config/layouts';
import './styles/NetworkGraph.css';

const NetworkGraph = ({ 
  collection, 
  onPathCalculationStart, 
  isWorkloadMode,
  onWorkloadPathsCalculated,
  onWorkloadNodesSelected 
}) => {
  const { graphData, error, loading } = useGraphData(collection);
  const { selectedLayout, handleLayoutChange, currentLayout } = useGraphLayout();
  const [selectedWorkloadNodes, setSelectedWorkloadNodes] = useState([]);
  
  useEffect(() => {
    console.log('NetworkGraph: Rendering with data:', {
      collectionId: collection,
      hasGraphData: !!graphData,
      graphDataContent: graphData,
      timestamp: new Date().toISOString()
    });
  }, [collection, graphData]);

  useEffect(() => {
    // Notify parent component of selected nodes
    console.log('NetworkGraph: Selected nodes changed:', {
      nodeCount: selectedWorkloadNodes.length,
      nodeIds: selectedWorkloadNodes.map(n => n.id()),
      timestamp: new Date().toISOString()
    });
    onWorkloadNodesSelected?.(selectedWorkloadNodes);
  }, [selectedWorkloadNodes, onWorkloadNodesSelected]);

  const handleWorkloadNodesChange = (nodes) => {
    console.log('NetworkGraph: Handling workload nodes change:', {
      nodeCount: nodes.length,
      nodeIds: nodes.map(n => n.id()),
      timestamp: new Date().toISOString()
    });
    setSelectedWorkloadNodes(nodes);
  };

  if (loading) {
    return <div>Loading graph data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!graphData) {
    console.log('NetworkGraph: No graph data available');
    return <div>Loading graph data...</div>;
  }

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
    <div className="network-graph-container" style={{ 
      width: '100%', 
      height: 'calc(100vh - 72px)',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      <GraphVisualization 
        elements={graphData}
        layout={currentLayout}
        style={cytoscapeStyles}
        onNodeSelect={handleNodeSelect}
        onWorkloadSelect={handleWorkloadSelect}
        collection={collection}
        isWorkloadMode={isWorkloadMode}
        selectedWorkloadNodes={selectedWorkloadNodes}
        onWorkloadNodesChange={handleWorkloadNodesChange}
      />
      <GraphLegend />
    </div>
  );
};

export default NetworkGraph; 