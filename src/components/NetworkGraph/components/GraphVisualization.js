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
import ModeDropdown from './ModeDropdown';
import { workloadService } from '../../../services/workloadService';
import { api } from '../../../services/api';

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
  const [selectedMode, setSelectedMode] = useState('');

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
      
      if (selectedMode === 'workload') {
        // Toggle node selection for workload
        if (node.hasClass('source-selected')) {
          node.removeClass('source-selected');
        } else {
          node.addClass('source-selected');
        }
        
        // Get all selected nodes
        const selectedNodes = cy.nodes('.source-selected');
        onWorkloadNodesChange?.(Array.from(selectedNodes));
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
          cy.elements().removeClass('source-selected dest-selected');
          setSourceNode(null);
          setDestinationNode(null);
          setSelectedConstraint('');
          return;
        }

        if (!sourceNode) {
          cy.elements().removeClass('source-selected dest-selected');
          node.addClass('source-selected');
          setSourceNode(node);
        } else if (!destinationNode && node.id() !== sourceNode.id()) {
          node.addClass('dest-selected');
          setDestinationNode(node);
        }
      }
    };

    // Unified background click handler
    const handleBackgroundClick = (evt) => {
      if (evt.target === cy) {
        if (selectedMode === 'workload') {
          // Clear node selections and path highlighting in workload mode
          cy.elements().removeClass('source-selected dest-selected workload-path high-load critical-load');
          onWorkloadNodesChange([]);
          setPathTooltipData(null);
          console.log('Cleared workload node selection and path highlighting');
        } else {
          // Clear everything in path mode
          cy.elements().removeClass('source-selected dest-selected sequential');
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
      .selector('.source-selected')
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

    cy.style()
      .selector('.dest-selected')
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
    selectedMode,
    isSequentialMode,
    sourceNode,
    destinationNode,
    handleSequentialNodeSelect,
    clearSequentialSelection,
    onWorkloadNodesChange
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
    if (selectedMode === 'workload') {
      // Handle workload paths
      const selectedNodes = cyRef.current.nodes('.source-selected');
      const results = [];
      
      // Calculate paths between each pair of selected nodes
      for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = i + 1; j < selectedNodes.length; j++) {
          const source = selectedNodes[i];
          const dest = selectedNodes[j];
          
          try {
            const response = await api.get(`/graphs/${collection}/shortest_path/load`, {
              params: {
                source: source.id(),
                destination: dest.id(),
                direction: 'any'
              }
            });

            if (response.data.found) {
              // Extract vertex IDs from the path for highlighting
              const pathNodes = response.data.path.map(step => step.vertex._id);
              
              // Highlight the path
              pathCalcService.highlightPath(cyRef.current, pathNodes);
              
              // Show SRv6 information in tooltip
              setPathTooltipData({
                sidList: response.data.srv6_data.srv6_sid_list,
                usid: response.data.srv6_data.srv6_usid
              });
              
              results.push({
                source: source.id(),
                destination: dest.id(),
                path: pathNodes,
                hopcount: response.data.hopcount,
                vertex_count: response.data.vertex_count,
                srv6Data: {
                  sidList: response.data.srv6_data.srv6_sid_list,
                  usid: response.data.srv6_data.srv6_usid
                },
                loadData: response.data.load_data,
                average_load: response.data.load_data.average_load,
                pathDetails: response.data.path
              });
            } else {
              console.warn('No path found between nodes:', {
                source: source.id(),
                destination: dest.id()
              });
            }
          } catch (error) {
            console.error('Failed to calculate path:', error);
          }
        }
      }
      
      // Notify parent component
      onWorkloadSelect?.(results);
    } else {
      // Handle regular path calculation
      if (constraint === 'sovereignty') {
        setShowCountrySelector(true);
        return;
      }

      if (!sourceNode || !destinationNode || !collection) {
        console.warn('Source, destination, and collection must be set');
        return;
      }

      setSelectedConstraint(constraint);
      
      try {
        const result = await pathCalcService.calculatePath(
          collection,
          sourceNode.id(),
          destinationNode.id(),
          constraint
        );
        
        setPathTooltipData(result.srv6Data);
        
        if (result && cyRef.current) {
          pathCalcService.highlightPath(cyRef.current, result.nodes);
        }
      } catch (error) {
        console.error('Failed to calculate path:', error);
        setPathTooltipData(null);
      }
    }
  }, [selectedMode, sourceNode, destinationNode, collection, onWorkloadSelect]);

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

    // Debug log to see the data structure
    console.log('Tooltip data received:', {
      data: pathTooltipData,
      type: typeof pathTooltipData,
      isArray: Array.isArray(pathTooltipData),
      timestamp: new Date().toISOString()
    });

    let tooltip = document.querySelector('.path-sids-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'path-sids-tooltip';
      document.body.appendChild(tooltip);
    }

    // Add click handler to toggle view
    const handleTooltipClick = () => {
      const isJsonView = tooltip.classList.toggle('json-view');
      if (isJsonView) {
        // Show JSON view with only essential information
        const isMultiplePaths = Array.isArray(pathTooltipData);
        let jsonData;
        
        if (isMultiplePaths) {
          // Format multiple paths
          jsonData = pathTooltipData.map((pathData, index) => ({
            path: `${index + 1}`,
            source: pathData.source,
            destination: pathData.destination,
            srv6: {
              sidList: pathData.srv6Data?.sidList || [],
              usid: pathData.srv6Data?.usid || 'No uSID available'
            }
          }));
        } else {
          // Format single path
          jsonData = {
            srv6: {
              sidList: pathTooltipData.sidList || [],
              usid: pathTooltipData.usid || 'No uSID available'
            }
          };
        }
        
        tooltip.innerHTML = `
          <div style="max-height: 600px; overflow-y: auto; padding: 8px;">
            <pre style="margin: 0; white-space: pre-wrap; font-family: monospace; user-select: text;">${JSON.stringify(jsonData, null, 2)}</pre>
          </div>
        `;

        // Add context menu handler
        const preElement = tooltip.querySelector('pre');
        if (preElement) {
          preElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(preElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          });

          // Add keyboard shortcut handler
          const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
              e.preventDefault();
              const range = document.createRange();
              range.selectNodeContents(preElement);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
            }
          };

          preElement.addEventListener('keydown', handleKeyDown);
          preElement.tabIndex = 0; // Make the element focusable

          // Clean up event listeners when tooltip is removed
          return () => {
            preElement.removeEventListener('contextmenu', handleKeyDown);
            preElement.removeEventListener('keydown', handleKeyDown);
          };
        }
      } else {
        // Show formatted view
        const isMultiplePaths = Array.isArray(pathTooltipData);
        
        let tooltipContent;
        if (isMultiplePaths) {
          // Handle multiple paths
          tooltipContent = pathTooltipData.map((pathData, index) => {
            if (!pathData || !pathData.srv6Data) {
              console.warn('Invalid path data:', {
                pathData,
                index,
                timestamp: new Date().toISOString()
              });
              return '';
            }
            
            return `
              <div class="path-group" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 8px 0; color: #333;">Path ${index + 1}: ${pathData.source} → ${pathData.destination}</h4>
                <div class="path-sids-info">
                  <div class="path-sids-list">
                    <strong>SID List:</strong>
                    ${Array.isArray(pathData.srv6Data.sidList) ? 
                      pathData.srv6Data.sidList.map(sid => `
                        <div class="path-sids-item">${sid}</div>
                      `).join('') : 
                      `<div class="path-sids-item">No SID list available</div>`
                    }
                  </div>
                  <div class="path-sids-usid">
                    <strong>SRv6 uSID:</strong>
                    <div class="path-sids-item">${pathData.srv6Data.usid || 'No uSID available'}</div>
                  </div>
                  <div class="path-load-info" style="margin-top: 8px;">
                    <strong>Average Load:</strong>
                    <div class="path-sids-item">${pathData.loadData?.average_load ? `${pathData.loadData.average_load.toFixed(2)}%` : 'No load data available'}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          // Handle single path
          const sidList = pathTooltipData.sidList || [];
          const usid = pathTooltipData.usid || 'No uSID available';

          tooltipContent = `
            <h4>SRv6 Information</h4>
            <div class="path-sids-info">
              <div class="path-sids-list">
                <strong>SID List:</strong>
                ${Array.isArray(sidList) ? 
                  sidList.map(sid => `
                    <div class="path-sids-item">${sid}</div>
                  `).join('') : 
                  `<div class="path-sids-item">No SID list available</div>`
                }
              </div>
              <div class="path-sids-usid">
                <strong>SRv6 uSID:</strong>
                <div class="path-sids-item">${usid}</div>
              </div>
            </div>
          `;
        }

        tooltip.innerHTML = `
          <div style="max-height: 600px; overflow-y: auto; padding: 8px;">
            ${tooltipContent || 'No path data available'}
          </div>
        `;
      }
    };

    // Show formatted view by default
    const showFormattedView = () => {
      const isMultiplePaths = Array.isArray(pathTooltipData);
      
      let tooltipContent;
      if (isMultiplePaths) {
        // Handle multiple paths
        tooltipContent = pathTooltipData.map((pathData, index) => {
          if (!pathData || !pathData.srv6Data) {
            console.warn('Invalid path data:', {
              pathData,
              index,
              timestamp: new Date().toISOString()
            });
            return '';
          }
          
          return `
            <div class="path-group" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.1);">
              <h4 style="margin: 0 0 8px 0; color: #333;">Path ${index + 1}: ${pathData.source} → ${pathData.destination}</h4>
              <div class="path-sids-info">
                <div class="path-sids-list">
                  <strong>SID List:</strong>
                  ${Array.isArray(pathData.srv6Data.sidList) ? 
                    pathData.srv6Data.sidList.map(sid => `
                      <div class="path-sids-item">${sid}</div>
                    `).join('') : 
                    `<div class="path-sids-item">No SID list available</div>`
                  }
                </div>
                <div class="path-sids-usid">
                  <strong>SRv6 uSID:</strong>
                  <div class="path-sids-item">${pathData.srv6Data.usid || 'No uSID available'}</div>
                </div>
                <div class="path-load-info" style="margin-top: 8px;">
                  <strong>Average Load:</strong>
                  <div class="path-sids-item">${pathData.loadData?.average_load ? `${pathData.loadData.average_load.toFixed(2)}%` : 'No load data available'}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        // Handle single path
        const sidList = pathTooltipData.sidList || [];
        const usid = pathTooltipData.usid || 'No uSID available';

        tooltipContent = `
          <h4>SRv6 Information</h4>
          <div class="path-sids-info">
            <div class="path-sids-list">
              <strong>SID List:</strong>
              ${Array.isArray(sidList) ? 
                sidList.map(sid => `
                  <div class="path-sids-item">${sid}</div>
                `).join('') : 
                `<div class="path-sids-item">No SID list available</div>`
              }
            </div>
            <div class="path-sids-usid">
              <strong>SRv6 uSID:</strong>
              <div class="path-sids-item">${usid}</div>
            </div>
          </div>
        `;
      }

      tooltip.innerHTML = `
        <div style="max-height: 600px; overflow-y: auto; padding: 8px;">
          ${tooltipContent || 'No path data available'}
        </div>
      `;
    };
    
    // Initial render of formatted view
    showFormattedView();
    
    // Add click handler
    tooltip.style.cursor = 'pointer';
    tooltip.addEventListener('click', handleTooltipClick);

    // Cleanup function
    return () => {
      if (tooltip && tooltip.parentNode) {
        tooltip.removeEventListener('click', handleTooltipClick);
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
      
      if (selectedMode === 'workload') {
        // Toggle node selection for workload
        if (node.hasClass('source-selected')) {
          node.removeClass('source-selected');
        } else {
          node.addClass('source-selected');
        }
        
        // Get all selected nodes
        const selectedNodes = cyRef.current.nodes('.source-selected');
        onWorkloadNodesChange?.(Array.from(selectedNodes));
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
  }, [elements, layout, style, selectedMode, onNodeSelect, onWorkloadNodesChange]);

  // Update node selection styling when selectedWorkloadNodes changes
  useEffect(() => {
    if (!cyRef.current) return;

    // Remove selection class from all nodes
    cyRef.current.nodes().removeClass('source-selected dest-selected');

    // Add selection class to selected nodes
    selectedWorkloadNodes.forEach(node => {
      const cyNode = cyRef.current.getElementById(node.id());
      if (cyNode.length) {
        cyNode.addClass('source-selected');
      }
    });

    // Log selection state for debugging
    console.log('Updated workload node selection:', {
      selectedCount: selectedWorkloadNodes.length,
      selectedIds: selectedWorkloadNodes.map(n => n.id()),
      timestamp: new Date().toISOString()
    });
  }, [selectedWorkloadNodes]);

  // Add mode change handler
  const handleModeChange = useCallback((mode) => {
    // Clear any existing selections when switching modes
    if (cyRef.current) {
      cyRef.current.elements().removeClass('source-selected dest-selected');
    }
    setSourceNode(null);
    setDestinationNode(null);
    setSelectedConstraint('');
    setSelectedMode(mode);
  }, []);

  const handleCalculatePaths = useCallback(async (nodes) => {
    if (!cyRef.current || !collection) return;
    
    try {
      // Use workloadService to calculate paths
      const results = await workloadService.calculatePaths(collection, nodes);
      
      // Debug log the results before processing
      console.log('Workload path results:', {
        results,
        filteredResults: results.filter(r => !r.error),
        timestamp: new Date().toISOString()
      });
      
      // Highlight all workload paths using the new function
      pathCalcService.highlightWorkloadPaths(cyRef.current, results.filter(r => !r.error));
      
      // Set all path data for tooltip display
      setPathTooltipData(results.filter(r => !r.error));
      
      // Notify parent component
      onWorkloadSelect?.(results);
    } catch (error) {
      console.error('Failed to calculate workload paths:', error);
    }
  }, [collection, onWorkloadSelect]);

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
          disabled={selectedMode === 'workload' || !sourceNode || !destinationNode}
        />
        <ModeDropdown
          selectedMode={selectedMode}
          onModeChange={handleModeChange}
          sourceNode={sourceNode}
          destinationNode={destinationNode}
          selectedNodes={selectedWorkloadNodes}
          onCalculatePaths={handleCalculatePaths}
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