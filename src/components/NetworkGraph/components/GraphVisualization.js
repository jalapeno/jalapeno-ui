import React, { useEffect, useState, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { cytoscapeStyles } from '../styles/cytoscapeStyles';
import { layouts } from '../config/layouts';
import LayoutDropdown from './LayoutDropdown';
import { pathCalcService } from '../../../services/pathCalcService';
import styled from 'styled-components';
import { useNodeSelection } from '../hooks/useNodeSelection';
import { useTooltips } from '../hooks/useTooltips';
import { createTooltip, updateTooltip } from '../services/tooltipService';
import ConstraintDropdown from './ConstraintDropdown';
import CountrySelector from './CountrySelector';
import { useSequentialNodeSelection } from '../hooks/useSequentialNodeSelection';
import cytoscape from 'cytoscape';
import { theme } from '../../../styles/theme';

const GraphContainer = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
  background-color: #ffffff;
`;

const GraphVisualization = ({
  elements,
  layout,
  style,
  onNodeSelect,
  onWorkloadSelect,
  collection,
  isWorkloadMode,
  selectedWorkloadNodes,
  onWorkloadNodesChange
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const selectedPathRef = useRef([]);
  const [key, setKey] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedPath, setSelectedPath] = useState([]);
  const [pathSids, setPathSids] = useState([]);
  const [selectedConstraint, setSelectedConstraint] = useState('');
  const [sourceNode, setSourceNode] = useState(null);
  const [destinationNode, setDestinationNode] = useState(null);
  const [pathTooltipData, setPathTooltipData] = useState(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [excludedCountries, setExcludedCountries] = useState([]);
  const [isSequentialMode, setIsSequentialMode] = useState(false);
  
  // Add sequential selection hook at component level
  const { handleSequentialNodeSelect, clearSequentialSelection, getSequentialPath } = useSequentialNodeSelection(cyRef.current);

  useEffect(() => {
    console.log('GraphVisualization: Elements received:', {
      elements,
      type: typeof elements,
      isArray: Array.isArray(elements),
      timestamp: new Date().toISOString()
    });

    if (Array.isArray(elements)) {
      console.log('GraphVisualization: Rendering with elements:', {
        elementCount: elements.length,
        nodesCount: elements.filter(el => el.group === 'nodes').length,
        edgesCount: elements.filter(el => el.group === 'edges').length,
        timestamp: new Date().toISOString()
      });
    }
  }, [elements]);
  
  const {
    selectedPath: nodeSelectionPath,
    pathSids: nodeSelectionSids,
    handleNodeSelect,
    clearSelection
  } = useNodeSelection(cyRef.current);

  // Handle tooltips
  useTooltips(cyRef.current, nodeSelectionSids, pathTooltipData);

  useEffect(() => {
    // Force a remount when graphData changes
    setKey(prevKey => prevKey + 1);
  }, [elements]);

  // Add effect for node click handling
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;

    // Clear any existing handlers
    cy.removeListener('tap', 'node');
    cy.removeListener('tap');

    // Unified node click handler
    const handleNodeClick = (evt) => {
      const node = evt.target;
      
      if (isWorkloadMode) {
        console.log('Workload mode node click:', {
          nodeId: node.id(),
          isSelected: node.hasClass('workload-selected'),
          timestamp: new Date().toISOString()
        });

        // Toggle node selection
        if (node.hasClass('workload-selected')) {
          node.removeClass('workload-selected');
          // Get current selected nodes excluding the clicked one
          const currentSelected = cy.nodes('.workload-selected');
          onWorkloadNodesChange(Array.from(currentSelected));
        } else {
          node.addClass('workload-selected');
          // Get all selected nodes including the newly clicked one
          const currentSelected = cy.nodes('.workload-selected');
          onWorkloadNodesChange(Array.from(currentSelected));
        }

        // Log selection state
        console.log('Workload selection updated:', {
          nodeId: node.id(),
          isSelected: node.hasClass('workload-selected'),
          totalSelected: cy.nodes('.workload-selected').length,
          timestamp: new Date().toISOString()
        });
      } else {
        // Handle regular path selection
        const nodeData = node.data();
        console.log('Path selection mode node click:', {
          nodeId: node.id(),
          nodeType: nodeData.type,
          isSequentialMode,
          timestamp: new Date().toISOString()
        });

        // Hide hover tooltip
        const hoverTooltip = document.querySelector('.cy-tooltip');
        if (hoverTooltip) {
          hoverTooltip.style.display = 'none';
        }

        // Handle sequential mode
        if (isSequentialMode) {
          const sequentialNodes = getSequentialPath();
          const lastSequentialNode = sequentialNodes[sequentialNodes.length - 1];
          
          const isAdjacentToLast = lastSequentialNode && cy.edges().some(edge => 
            (edge.source().id() === lastSequentialNode.id() && edge.target().id() === node.id()) ||
            (edge.target().id() === lastSequentialNode.id() && edge.source().id() === node.id())
          );

          if (isAdjacentToLast) {
            handleSequentialNodeSelect(node);
          }
          return;
        }

        // Handle source/destination selection
        if (sourceNode && destinationNode) {
          cy.elements().removeClass('source destination');
          setSourceNode(null);
          setDestinationNode(null);
          setSelectedConstraint('');
          return;
        }

        if (!sourceNode) {
          cy.elements().removeClass('source destination');
          node.addClass('source');
          setSourceNode(node);
        } else if (!destinationNode && node.id() !== sourceNode.id()) {
          node.addClass('destination');
          setDestinationNode(node);
        }
      }
    };

    // Unified background click handler
    const handleBackgroundClick = (evt) => {
      if (evt.target === cy) {
        if (isWorkloadMode) {
          // Clear workload selection
          cy.nodes().removeClass('workload-selected');
          onWorkloadNodesChange([]);
          console.log('Cleared workload selection');
        } else {
          // Clear path selection
          cy.elements().removeClass('source destination sequential');
          clearSequentialSelection();
          setSourceNode(null);
          setDestinationNode(null);
          setSelectedConstraint('');
          setIsSequentialMode(false);
        }
      }
    };

    // Attach handlers
    cy.on('tap', 'node', handleNodeClick);
    cy.on('tap', handleBackgroundClick);

    // Add style for workload-selected nodes
    cy.style()
      .selector('.workload-selected')
      .style({
        'background-color': '#FFD700',  // Gold highlight
        'border-color': '#FF8C00',      // Dark orange border
        'border-width': '3px',
        'border-opacity': 0.8,
        'width': 40,
        'height': 40,
        'z-index': 9999
      })
      .update();

    return () => {
      cy.removeListener('tap', 'node', handleNodeClick);
      cy.removeListener('tap', handleBackgroundClick);
    };
  }, [
    cyRef.current,
    isWorkloadMode,
    onWorkloadNodesChange,
    isSequentialMode,
    sourceNode,
    destinationNode,
    handleSequentialNodeSelect,
    clearSequentialSelection
  ]);

  // Add layout change handler
  const handleLayoutChange = useCallback((layoutName) => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    console.log('GraphVisualization: Applying layout:', {
      layoutName,
      config: layouts[layoutName],
      timestamp: new Date().toISOString()
    });
    
    cy.layout(layouts[layoutName]).run();
  }, []);

  // Add constraint change handler
  const handleConstraintChange = useCallback(async (constraint) => {
    if (constraint === 'sovereignty') {
      setShowCountrySelector(true);
      return;
    }

    if (!sourceNode || !destinationNode || !collection) {
      console.warn('Source, destination, and collection must be set:', {
        hasSource: !!sourceNode,
        hasDestination: !!destinationNode,
        collection,
        timestamp: new Date().toISOString()
      });
      return;
    }

    setSelectedConstraint(constraint);
    
    try {
      console.log('Calculating path:', {
        collection,
        source: sourceNode.id(),
        destination: destinationNode.id(),
        constraint,
        timestamp: new Date().toISOString()
      });

      const result = await pathCalcService.calculatePath(
        collection,
        sourceNode.id(),
        destinationNode.id(),
        constraint
      );
      
      // Set tooltip data
      setPathTooltipData(result.srv6Data);
      
      // Highlight the calculated path
      if (result && cyRef.current) {
        pathCalcService.highlightPath(cyRef.current, result.nodes);
      }
      
    } catch (error) {
      console.error('Failed to calculate path:', error);
      setPathTooltipData(null);
    }
  }, [sourceNode, destinationNode, collection]);

  const handleCountrySelection = async (countries) => {
    setExcludedCountries(countries);
    
    try {
      const result = await pathCalcService.calculatePath(
        collection,
        sourceNode.id(),
        destinationNode.id(),
        'sovereignty',
        countries
      );
      
      if (result && cyRef.current) {
        pathCalcService.highlightPath(cyRef.current, result.nodes);
        setPathTooltipData(result.srv6Data);
      }
    } catch (error) {
      console.error('Failed to calculate path:', error);
    }
  };

  // Add effect to handle tooltip visibility
  useEffect(() => {
    if (!pathTooltipData) return;

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
          ${pathTooltipData.sidList.map(sid => `
            <div class="path-sids-item">${sid}</div>
          `).join('')}
        </div>
        <div class="path-sids-usid">
          <strong>SRv6 uSID:</strong>
          <div class="path-sids-item">${pathTooltipData.usid}</div>
        </div>
      </div>
    `;
    tooltip.style.display = 'block';

    // Cleanup function
    return () => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    };
  }, [pathTooltipData]);

  // Add cleanup for tooltip when component unmounts
  useEffect(() => {
    return () => {
      const tooltip = document.querySelector('.path-sids-tooltip');
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    };
  }, []);

  // Clear tooltip when clicking background
  const handleBackgroundClick = useCallback((e) => {
    if (e.target === cyRef.current) {
      setPathTooltipData(null);
      cyRef.current.elements().removeClass('selected');
    }
  }, []);

  // Initialize Cytoscape instance with both hover and click handlers
  const initializeCytoscape = useCallback((cy) => {
    cyRef.current = cy;
    
    // Click handlers
    const handleNodeClick = (e) => {
      const node = e.target;
      // console.log('Node clicked:', {
      //   id: node.id(),
      //   currentlySelected: node.hasClass('selected')
      // });

      // Add the new node to the path
      selectedPathRef.current.push(node);
      
      // Highlight all nodes in the path
      selectedPathRef.current.forEach(pathNode => {
        pathNode.addClass('selected');
      });
      
      // Highlight edges between consecutive nodes in the path
      for (let i = 0; i < selectedPathRef.current.length - 1; i++) {
        const currentNode = selectedPathRef.current[i];
        const nextNode = selectedPathRef.current[i + 1];
        
        const connectingEdges = cy.edges().filter(edge => 
          (edge.source().id() === currentNode.id() && edge.target().id() === nextNode.id()) ||
          (edge.target().id() === currentNode.id() && edge.source().id() === nextNode.id())
        );
        connectingEdges.addClass('selected');
      }

      // Note: Removed duplicate tooltip handling as it's now handled in the useEffect
    };

    const handleBackgroundClick = (e) => {
      if (e.target === cy) {
        // Clear path and remove all highlights
        selectedPathRef.current = [];
        cy.elements().removeClass('selected');
        const pathTooltip = document.querySelector('.path-sids-tooltip');
        if (pathTooltip) {
          pathTooltip.style.display = 'none';
        }
      }
    };

    // Attach click handlers
    cy.on('tap', 'node', handleNodeClick);
    cy.on('tap', handleBackgroundClick);

    // Keep existing hover handlers
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const data = node.data();
      
      let tooltipContent = [];
      
      // Start with ID and label
      if (data.id) {
        tooltipContent.push(`<strong>id:</strong> ${data.id}`);
      }
      if (data.label) {
        tooltipContent.push(`<strong>label:</strong> ${data.label}`);
      }

      // Add SID information if available
      if (data.sids && data.sids.length > 0 && data.sids[0].srv6_sid) {
        tooltipContent.push(`<strong>srv6 sid:</strong> ${data.sids[0].srv6_sid}`);
      }

      // Add remaining relevant data
      const excludedKeys = [
        '_id', '_key', '_rev', 'action', 'router_hash', 'domain_id', 
        'peer_type', 'peer_hash', 'timestamp', 'mt_id_tlv', 
        'local_node_hash', 'nexthop', 'node_msd', 'protocol_id', 
        'prefix_attr_tlvs', 'sr_algorithm', 'peer_ip', 'router_ip',
        'srv6_capabilities_tlv', 'sids', 'id', 'label', 'color'
      ];

      Object.entries(data).forEach(([key, value]) => {
        if (!excludedKeys.includes(key) && 
            !key.startsWith('is_') && 
            value !== undefined && 
            value !== 'undefined') {
          tooltipContent.push(`<strong>${key}:</strong> ${value}`);
        }
      });
      
      let tooltip = document.getElementById('cy-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'cy-tooltip';
        document.body.appendChild(tooltip);
      }

      tooltip.style.position = 'absolute';
      tooltip.style.zIndex = 1000;
      tooltip.style.backgroundColor = data.color;
      tooltip.style.color = '#ffffff';
      tooltip.style.padding = '5px 10px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontFamily = 'Tahoma, sans-serif';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      tooltip.style.opacity = '0.9';
      tooltip.style.maxWidth = '300px';
      tooltip.style.whiteSpace = 'normal';
      
      tooltip.innerHTML = tooltipContent.join('<br>');
      
      const renderedPosition = node.renderedPosition();
      const containerBounds = cy.container().getBoundingClientRect();
      
      tooltip.style.left = `${containerBounds.left + renderedPosition.x + 20}px`;
      tooltip.style.top = `${containerBounds.top + renderedPosition.y - 20}px`;
      tooltip.style.display = 'block';
    });

    cy.on('mouseout', 'node', () => {
      const tooltip = document.getElementById('cy-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    });

    return () => {
      cy.removeListener('tap', 'node', handleNodeClick);
      cy.removeListener('tap', handleBackgroundClick);
      cy.removeListener('mouseover', 'node');
      cy.removeListener('mouseout', 'node');
      document.querySelectorAll('#cy-tooltip').forEach(el => el?.remove());
    };
  }, []);

  // Process elements directly
  const elementArray = Array.isArray(elements) ? elements : [];

  // Add this log to see what layout prop we're getting
  useEffect(() => {
    console.log('GraphVisualization: Layout prop:', {
      layout,
      name: layout?.name,
      timestamp: new Date().toISOString()
    });
  }, [layout]);

  // Add debug logging
  useEffect(() => {
    console.log('GraphVisualization: Layout received:', {
      layout,
      name: layout?.name,
      isPreset: layout?.name === 'preset',
      hasPositions: typeof layout?.positions === 'function',
      timestamp: new Date().toISOString()
    });
  }, [layout]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: style,
      layout: layout
    });

    // Add click handler for nodes
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      
      if (isWorkloadMode) {
        // Toggle node selection for workload
        if (node.hasClass('workload-selected')) {
          node.removeClass('workload-selected');
          onWorkloadNodesChange(prev => 
            prev.filter(n => n.id() !== node.id())
          );
        } else {
          node.addClass('workload-selected');
          onWorkloadNodesChange(prev => [...prev, node]);
        }

        // Log selection state for debugging
        console.log('Workload node selection:', {
          nodeId: node.id(),
          isSelected: node.hasClass('workload-selected'),
          totalSelected: cyRef.current.nodes('.workload-selected').length,
          timestamp: new Date().toISOString()
        });
      } else {
        // Handle regular node selection
        const nodeId = node.id();
        onNodeSelect?.(nodeId);
      }
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements, layout, style, isWorkloadMode, onWorkloadNodesChange]);

  // Update node selection styling when selectedWorkloadNodes changes
  useEffect(() => {
    if (!cyRef.current) return;

    // Remove selection class from all nodes
    cyRef.current.nodes().removeClass('workload-selected');

    // Add selection class to selected nodes
    selectedWorkloadNodes.forEach(node => {
      const cyNode = cyRef.current.getElementById(node.id());
      if (cyNode.length) {
        cyNode.addClass('workload-selected');
      }
    });

    // Log selection state for debugging
    console.log('Updated workload node selection:', {
      selectedCount: selectedWorkloadNodes.length,
      selectedIds: selectedWorkloadNodes.map(n => n.id()),
      timestamp: new Date().toISOString()
    });
  }, [selectedWorkloadNodes]);

  return (
    <>
      <GraphContainer>
        <LayoutDropdown 
          currentLayout={layout?.name || ''}
          onLayoutChange={handleLayoutChange}
        />
        <ConstraintDropdown
          selectedConstraint={selectedConstraint}
          onConstraintChange={handleConstraintChange}
          disabled={!sourceNode || !destinationNode}
        />
        <CytoscapeComponent
          key={elementArray.length > 0 ? 'loaded' : 'loading'}
          elements={elementArray}
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'block'
          }}
          stylesheet={style}
          layout={layout || layouts['cose']}  // Use cose as fallback
          minZoom={0.2}
          maxZoom={3}
          userZoomingEnabled={true}
          userPanningEnabled={true}
          boxSelectionEnabled={false}
          wheelSensitivity={0.2}
          cy={initializeCytoscape}
        />
      </GraphContainer>
      <CountrySelector
        isOpen={showCountrySelector}
        onClose={() => setShowCountrySelector(false)}
        onConfirm={handleCountrySelection}
      />
    </>
  );
};

export default GraphVisualization; 