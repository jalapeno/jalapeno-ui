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

const GraphContainer = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
  background-color: #ffffff;
`;

const GraphVisualization = ({ elements, layout, style, collection }) => {
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

  // Add path highlighting and node selection effect
  useEffect(() => {
    if (!cyRef.current || !elements) return;
    
    const cy = cyRef.current;

    // Update node click handler
    const handleNodeClick = (e) => {
      const node = e.target;
      const nodeData = node.data();

      console.log('NetworkGraph: Node clicked:', {
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

      // If we're in sequential mode, check adjacency to last sequential node
      if (isSequentialMode) {
        // Get all sequential nodes in order of selection
        const sequentialNodes = getSequentialPath();
        const lastSequentialNode = sequentialNodes[sequentialNodes.length - 1];
        
        console.log('Sequential path status:', {
          allNodes: sequentialNodes.map(n => n.id()),
          lastNode: lastSequentialNode?.id(),
          clickedNode: node.id(),
          timestamp: new Date().toISOString()
        });

        const isAdjacentToLast = lastSequentialNode && cy.edges().some(edge => 
          (edge.source().id() === lastSequentialNode.id() && edge.target().id() === node.id()) ||
          (edge.target().id() === lastSequentialNode.id() && edge.source().id() === node.id())
        );

        if (isAdjacentToLast) {
          console.log('Adding to sequential path:', {
            nodeId: node.id(),
            lastNodeId: lastSequentialNode.id(),
            pathLength: sequentialNodes.length,
            timestamp: new Date().toISOString()
          });
          handleSequentialNodeSelect(node);
          return;
        } else {
          console.log('Non-adjacent node clicked in sequential mode - ignoring:', {
            nodeId: node.id(),
            lastNodeId: lastSequentialNode.id(),
            pathLength: sequentialNodes.length,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Check if clicked node is adjacent to source node
      const isAdjacentToSource = sourceNode && cy.edges().some(edge => 
        (edge.source().id() === sourceNode.id() && edge.target().id() === node.id()) ||
        (edge.target().id() === sourceNode.id() && edge.source().id() === node.id())
      );

      // If adjacent to source, switch to sequential path mode
      if (sourceNode && isAdjacentToSource) {
        console.log('Starting sequential path:', {
          sourceId: sourceNode.id(),
          firstAdjacentId: node.id(),
          timestamp: new Date().toISOString()
        });
        setIsSequentialMode(true);
        clearSequentialSelection();  // Clear any existing sequential selection
        handleSequentialNodeSelect(sourceNode);  // Start with source node
        handleSequentialNodeSelect(node);  // Add clicked node
        
        // Reset source/destination state
        cy.elements().removeClass('source destination');
        setSourceNode(null);
        setDestinationNode(null);
        setSelectedConstraint('');
        return;
      }

      // If not in sequential mode, handle source/destination selection
      if (!isSequentialMode) {
        // Clear previous selections if both nodes are already selected
        if (sourceNode && destinationNode) {
          cy.elements().removeClass('source destination');
          setSourceNode(null);
          setDestinationNode(null);
          setSelectedConstraint('');
          return;
        }

        // Select source node if none selected
        if (!sourceNode) {
          cy.elements().removeClass('source destination');
          node.addClass('source');
          setSourceNode(node);
          console.log('Source node selected:', node.id());
        } 
        // Select destination node if source already selected
        else if (!destinationNode && node.id() !== sourceNode.id()) {
          node.addClass('destination');
          setDestinationNode(node);
          console.log('Destination node selected:', node.id());
        }
      }
    };

    // Update background click handler
    const handleBackgroundClick = (e) => {
      if (e.target === cy) {
        cy.elements().removeClass('source destination sequential');
        clearSequentialSelection();
        setSourceNode(null);
        setDestinationNode(null);
        setSelectedConstraint('');
        setIsSequentialMode(false);
      }
    };

    cy.on('tap', 'node', handleNodeClick);
    cy.on('tap', handleBackgroundClick);

    return () => {
      cy.removeListener('tap', 'node', handleNodeClick);
      cy.removeListener('tap', handleBackgroundClick);
    };
  }, [cyRef.current, elements, sourceNode, destinationNode, handleSequentialNodeSelect, clearSequentialSelection, isSequentialMode]);

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