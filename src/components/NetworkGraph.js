import React, { useEffect, useRef, useState, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import { api } from '../services/api';  // Import the configured axios instance
import '../styles/NetworkGraph.css';

const COLORS = {
  igp_node: '#CC4A04',    // Cayenne orange for IGP nodes
  bgp_node: '#0d7ca1',    // Blue for BGP nodes
  prefix: '#696e6d',      // Grey for all prefix types
  text: '#000',           // Black text
  edge: '#1a365d'         // Blue edges
};

cytoscape.use(cola);
cytoscape.use(dagre);

const NetworkGraph = ({ collection }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('circle');
  //const [selectedLayout, setSelectedLayout] = useState('clos');
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState('full'); // 'full' or 'nodes'
  const [selectedPath, setSelectedPath] = useState([]);
  const [pathSids, setPathSids] = useState([]);

  const isPrefix = (type) => {
    return type === 'ls_prefix' || type === 'bgp_prefix';
  };

  // Legend component definition
  const Legend = () => (
    <div className="graph-legend" style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Legend</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.igp_node,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>IGP Nodes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.bgp_node,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>BGP Nodes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.prefix,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>Prefixes</span>
        </div>
      </div>
    </div>
  );

  const transformDataToCytoscape = (data) => {
    const elements = [];
    const processedEdges = new Set();
    
    // First add all vertices
    Object.entries(data.vertices).forEach(([id, vertex]) => {
      // Debug log to see complete vertex data
      console.log('NetworkGraph: Complete vertex data:', {
        //raw: vertex,
        id: id,
        router_id: vertex.router_id,
        tier: vertex.tier,
        sids: vertex.sids,
        all_keys: Object.keys(vertex)
      });
      
      let nodeColor = '#666666';
      let nodeLabel = vertex.name || id;
      
      if (id.includes('bgp_node')) {
        nodeColor = COLORS.bgp_node;
      } else if (id.includes('igp_node')) {
        nodeColor = COLORS.igp_node;
      } else if (id.includes('prefix')) {  // Changed to match any prefix type
        nodeColor = COLORS.prefix;
        nodeLabel = vertex.prefix || id;  // Use prefix field if available
      }

      // Create node with all vertex properties
      const nodeData = {
        group: 'nodes',
        data: {
          id: id,
          label: nodeLabel,
          type: vertex.collection,
          color: nodeColor,
          router_id: vertex.router_id,
          tier: vertex.tier,
          asn: vertex.asn,
          sids: vertex.sids,
          name: vertex.name,
          ...vertex  // Include all other properties
        }
      };

      console.log('NetworkGraph: Transformed node data:', nodeData);
      elements.push(nodeData);
    });

    // Then add edges, avoiding duplicates
    data.edges.forEach(edge => {
      if (edge._from && edge._to) {
        // Create a canonical edge ID that's the same regardless of direction
        const nodes = [edge._from, edge._to].sort();
        const edgeId = `${nodes[0]}-${nodes[1]}`;
        
        if (!processedEdges.has(edgeId)) {
          processedEdges.add(edgeId);
          elements.push({
            group: 'edges',
            data: {
              id: edgeId,
              source: edge._from,
              target: edge._to
            }
          });
        }
      }
    });

    console.log('Transformed elements:', {
      total: elements.length,
      nodes: elements.filter(e => e.group === 'nodes').length,
      edges: elements.filter(e => e.group === 'edges').length
    });

    return elements;
  };

  // Add layout options
  const layoutOptions = {
    circle: {
      name: 'circle',
      padding: 50,
      animate: true,
      spacingFactor: 1.5,
      startAngle: 0,  // Start from right (3 o'clock position)
      sweep: 2 * Math.PI,  // Full 360 degrees
      clockwise: true,
      sort: function(a, b) {  // Sort nodes to group prefixes together
        const aIsPrefix = a.data('id').includes('ls_prefix');
        const bIsPrefix = b.data('id').includes('ls_prefix');
        if (aIsPrefix && !bIsPrefix) return 1;
        if (!aIsPrefix && bIsPrefix) return -1;
        return 0;
      }
    },
    concentric: {
      name: 'concentric',
      concentric: function(node) {
        return node.data('id').includes('ls_prefix') ? 1 : 2;
      },
      levelWidth: function() { return 1; },
      minNodeSpacing: 100,
      spacingFactor: 1.5,
      animate: true
    },
    dagre: {
      name: 'dagre',
      rankDir: 'TB',
      ranker: 'tight-tree',
      animate: true,
      padding: 50,
      rankSep: 100,
      nodeSep: 50,
      rank: function(node) {
        return node.data('id').includes('ls_prefix') ? 2 : 1;
      },
      ready: function() {
        console.log('Hierarchical layout starting:', {
          timestamp: new Date().toISOString(),
          prefixNodes: cyRef.current?.nodes().filter(n => n.data('id').includes('ls_prefix')).length,
          otherNodes: cyRef.current?.nodes().filter(n => !n.data('id').includes('ls_prefix')).length
        });
      }
    },
    // cose: {
    //   name: 'cose',
    //   idealEdgeLength: 100,
    //   nodeOverlap: 20,
    //   animate: true,
    //   randomize: false,
    //   padding: 50,
    //   fit: true,
    //   spacingFactor: 1.5,
    //   ready: function() {
    //     console.log('NetworkGraph: COSE layout starting', {
    //       timestamp: new Date().toISOString(),
    //       viewport: {
    //         width: cyRef.current?.width(),
    //         height: cyRef.current?.height()
    //       }
    //     });
    //   },
    //   stop: function() {
    //     console.log('NetworkGraph: COSE layout complete', {
    //       timestamp: new Date().toISOString(),
    //       boundingBox: cyRef.current?.elements().boundingBox()
    //     });
    //     cyRef.current?.fit(undefined, 50);
    //   }
    // },
    clos: {
      name: 'preset',
      positions: function(node) {
        const tier = node.data('tier');
        
        // Check if any nodes have tier data
        const allNodes = node.cy().nodes();
        const nodesWithTier = allNodes.filter(n => n.data('tier'));
        
        // If no nodes have tier data, return null to trigger breadthfirst fallback
        if (nodesWithTier.length === 0) {
          console.log('CLOS Layout: No tier data found in any nodes, falling back to breadthfirst:', {
            totalNodes: allNodes.length,
            timestamp: new Date().toISOString()
          });
          return null;
        }

        // If some nodes have tiers but this one doesn't, hide it
        if (!tier) {
          console.log('CLOS Layout: Hiding node without tier data:', {
            nodeId: node.id(),
            timestamp: new Date().toISOString()
          });
          node.style('display', 'none');
          return null;
        }

        // Special handling for dc-prefix tier
        if (tier === 'dc-prefix') {
          const connectedEdges = node.connectedEdges();
          const connectedTier0Node = connectedEdges
            .connectedNodes()
            .filter(n => n.data('tier') === 'dc-tier-0')
            .first();

          if (connectedTier0Node.length > 0) {
            const tier0Pos = connectedTier0Node.position();
            
            // Get all dc-tier-0 nodes and sort them by x position
            const allTier0Nodes = node.cy().nodes().filter(n => n.data('tier') === 'dc-tier-0');
            const sortedTier0Nodes = allTier0Nodes.sort((a, b) => a.position().x - b.position().x);
            
            // Find the index of this node's parent in the sorted list
            const parentIndex = sortedTier0Nodes.indexOf(connectedTier0Node);
            
            // Get all prefixes connected to this dc-tier-0 node
            const siblingPrefixes = connectedTier0Node
              .connectedEdges()
              .connectedNodes()
              .filter(n => n.data('tier') === 'dc-prefix');
            
            const prefixIndex = siblingPrefixes.indexOf(node);
            const xSpacing = 70;
            const xOffset = (prefixIndex - (siblingPrefixes.length - 1) / 2) * xSpacing;
            
            // Base vertical spacing from dc-tier-0
            const ySpacing = 150;
            
            // Alternate vertical position based on parent index
            const groupYOffset = (parentIndex % 2) * 100; // Alternate between 0 and 100px offset
            
            // Small y-offset within group based on prefix index
            const withinGroupYOffset = (prefixIndex % 2) * 30;
            
            console.log('CLOS Layout: Positioning dc-prefix node:', {
              nodeId: node.id(),
              parentTier0: connectedTier0Node.id(),
              parentIndex,
              groupYOffset,
              withinGroupYOffset,
              timestamp: new Date().toISOString()
            });
            
            return {
              x: tier0Pos.x + xOffset,
              y: tier0Pos.y + ySpacing + groupYOffset + withinGroupYOffset
            };
          }
        }
        
        // Normal positioning for nodes with valid tiers - update vertical spacing
        const yPosition = tierLevels[tier] * 150; // Changed to 150px
        const tierNodes = node.cy().nodes().filter(n => n.data('tier') === tier);
        const nodeIndex = tierNodes.indexOf(node);
        const xSpacing = 180;
        const xOffset = (tierNodes.length * xSpacing) / -2;
        const xPosition = xOffset + (nodeIndex * xSpacing);

        console.log('CLOS Layout: Node position calculated:', {
          nodeId: node.id(),
          tier: tier,
          position: { x: xPosition, y: yPosition },
          timestamp: new Date().toISOString()
        });

        return { x: xPosition, y: yPosition };
      },
      ready: function() {
        const unpositionedNodes = this.options.eles.nodes().filter(node => 
          !node.position().x && !node.position().y
        );
        
        if (unpositionedNodes.length > 0) {
          console.log('CLOS Layout: Falling back to breadthfirst layout:', {
            unpositionedCount: unpositionedNodes.length,
            totalNodes: this.options.eles.nodes().length,
            timestamp: new Date().toISOString()
          });
          
          this.options.eles.layout({
            name: 'breadthfirst',
            directed: true,
            padding: 50,
            spacingFactor: 1.5,
            animate: true,
            animationDuration: 500,
            fit: true
          }).run();
        }
      }
    }
  };

  // Update the style configuration
  const style = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': 40,
        'height': 40
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': '#999999',
        'curve-style': 'bezier',
        'target-arrow-shape': 'none'  // Remove arrows
      }
    }
  ];

  // Add request tracking
  const requestIdRef = useRef(0);
  const [dataSource, setDataSource] = useState(null);

  const requestTrackingRef = useRef({
    pendingRequests: new Set(),
    lastResponse: null
  });

  const fetchTrackingRef = useRef({
    activeRequests: new Map(),
    processedData: new Set()
  });

  const fetchLifecycleRef = useRef({
    requests: new Map(),
    responses: new Map()
  });

  const logFetchEvent = useCallback((event, details) => {
    console.log('NetworkGraph: Fetch Lifecycle:', {
      event,
      requestId: details.requestId,
      collection: details.collection,
      timestamp: new Date().toISOString(),
      mountCount: strictModeRef.current.mountCount,
      ...details
    });
  }, []);

  const fetchTopology = useCallback(async (collection) => {
    try {

      const response = await api.get(`/collections/${collection}/topology`);
      
      console.log('NetworkGraph: API response received:', {
        status: response.status,
        collection,
        dataSize: response.data ? Object.keys(response.data).length : 0,
        timestamp: new Date().toISOString()
      });

      return response.data;

    } catch (error) {
      console.error('NetworkGraph: API request failed:', {
        error: error.message,
        collection,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }, []);

  const fetchNodesTopology = useCallback(async (collection) => {
    try {
      console.log('NetworkGraph: Making nodes-only API request:', {
        collection,
        requestType: 'nodes-topology',
        timestamp: new Date().toISOString()
      });

      const response = await api.get(`/collections/${collection}/topology/nodes`);
      
      console.log('NetworkGraph: Nodes-only response received:', {
        status: response.status,
        collection,
        dataSize: response.data ? Object.keys(response.data).length : 0,
        timestamp: new Date().toISOString()
      });

      return response.data;

    } catch (error) {
      console.error('NetworkGraph: Nodes-only request failed:', {
        error: error.message,
        collection,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    console.log('Collection received:', {
      collection,
      type: typeof collection,
      keys: collection ? Object.keys(collection) : 'none'
    });

    if (typeof collection === 'string') {
      console.log('NetworkGraph: Fetching topology:', {
        collection,
        viewType,
        timestamp: new Date().toISOString()
      });

      // Choose which fetch function to use based on viewType
      const fetchFunction = viewType === 'full' ? fetchTopology : fetchNodesTopology;

      fetchFunction(collection)
        .then(data => {
          console.log('NetworkGraph: Topology data received:', {
            viewType,
            vertices: Object.keys(data.vertices).length,
            edges: data.edges?.length || 0,
            timestamp: new Date().toISOString()
          });
          const elements = transformDataToCytoscape(data);
          setGraphData(elements);
        })
        .catch(error => {
          console.error('NetworkGraph: Topology fetch failed:', {
            error: error.message,
            collection,
            viewType,
            timestamp: new Date().toISOString()
          });
        });
    }
  }, [collection, viewType, fetchTopology, fetchNodesTopology]);

  useEffect(() => {
    console.log('Graph data changed:', {
      hasData: !!graphData,
      nodeCount: graphData?.length || 0,
      timestamp: new Date().toISOString()
    });

    if (cyRef.current && graphData) {
      const cy = cyRef.current;
      
      console.log('Applying initial layout:', {
        elements: cy.elements().length,
        layout: selectedLayout,
        config: layoutOptions[selectedLayout],
        timestamp: new Date().toISOString()
      });
      
      // Apply the selected layout to all nodes at once
      cy.layout(layoutOptions[selectedLayout])
        .run();

      // Fit the viewport with padding
      cy.fit(undefined, 50);
    }
  }, [graphData, selectedLayout]);

  // Add mount tracking and initialization state
  const mountCountRef = useRef(0);
  const isInitializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    mountCountRef.current += 1;
    console.log('Component mounted:', {
      mountCount: mountCountRef.current,
      isInitialized: isInitializedRef.current,
      hasData: !!graphData,
      timestamp: new Date().toISOString()
    });

    // Wait for the second mount in strict mode
    if (mountCountRef.current === 2) {
      setIsReady(true);
    }

    return () => {
      console.log('Component unmounting:', {
        mountCount: mountCountRef.current,
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  const dataProcessingRef = useRef({
    lastDataTimestamp: null,
    processedData: new Set()
  });

  useEffect(() => {
    if (containerRef.current && graphData) {
      // Generate unique key for this data
      const dataKey = JSON.stringify({
        timestamp: new Date().toISOString(),
        dataLength: graphData.length,
        firstNodeId: graphData[0]?.data?.id
      });

      // Check if we've already processed this data
      if (dataProcessingRef.current.processedData.has(dataKey)) {
        console.log('NetworkGraph: Skipping duplicate data processing:', {
          dataKey,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Track this data processing
      dataProcessingRef.current.processedData.add(dataKey);
      dataProcessingRef.current.lastDataTimestamp = new Date().toISOString();

      console.log('NetworkGraph: Processing new data:', {
        dataKey,
        processedCount: dataProcessingRef.current.processedData.size,
        timestamp: new Date().toISOString()
      });

      // Continue with Cytoscape initialization
      // ... rest of your initialization code ...
    }
  }, [containerRef, graphData]);

  useEffect(() => {
    if (containerRef.current && graphData) {
      console.log('NetworkGraph: Data Flow Analysis:', {
        phase: 'pre-initialization',
        source: 'NetworkGraph.js',
        graphDataSource: graphData?._source || 'unknown',
        containerState: {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
          isConnected: containerRef.current.isConnected
        },
        graphState: {
          hasData: !!graphData,
          elementCount: graphData?.length,
          dataStructure: graphData?.[0] ? Object.keys(graphData[0]) : []
        },
        timestamp: new Date().toISOString()
      });

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements: graphData,
        style: style,
        wheelSensitivity: 0.2
      });

      // Create and configure layout
      const layoutConfig = {
        name: 'circle',
        padding: 50,
        animate: true,
        animationDuration: 500,
        spacingFactor: 1.5,
        fit: true,
        boundingBox: { x1: 0, y1: 0, w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight }
      };

      console.log('Creating layout with config:', layoutConfig);
      const layout = cy.layout(layoutConfig);

      // Bind layout events
      layout.one('layoutstart', function(e) {
        console.log('Layout start event fired:', {
          timestamp: new Date().toISOString(),
          eventType: e.type,
          nodeCount: cy.nodes().length
        });
      });

      layout.one('layoutready', function(e) {
        console.log('Layout ready event fired:', {
          timestamp: new Date().toISOString(),
          eventType: e.type,
          nodePositions: cy.nodes().map(n => ({
            id: n.id(),
            position: n.position()
          }))
        });
      });

      layout.one('layoutstop', function(e) {
        console.log('Layout stop event fired:', {
          timestamp: new Date().toISOString(),
          eventType: e.type,
          finalLayout: true
        });
      });

      // Run layout
      console.log('Running layout...');
      layout.run();
      cyRef.current = cy;
    }
  }, [containerRef, graphData]);

  // Separate effect for layout changes
  useEffect(() => {
    if (cyRef.current && !isLoading) {
      console.log('Applying layout change:', selectedLayout);
      cyRef.current.layout(layoutOptions[selectedLayout]).run();
    }
  }, [selectedLayout, isLoading]);

  // Add function to hide path SIDs tooltip
  const hidePathSidsTooltip = () => {
    const pathTooltip = document.querySelector('.path-sids-tooltip');
    if (pathTooltip) {
      console.log('NetworkGraph: Hiding Path SIDs tooltip:', {
        trigger: 'user interaction',
        timestamp: new Date().toISOString()
      });
      pathTooltip.style.display = 'none';
      setPathSids([]);
      setSelectedPath([]);
    }
  };

  // Update layout change handler
  const handleLayoutChange = (e) => {
    console.log('NetworkGraph: Layout changed:', {
      from: selectedLayout,
      to: e.target.value,
      action: 'hiding Path SIDs',
      timestamp: new Date().toISOString()
    });
    setSelectedLayout(e.target.value);
    hidePathSidsTooltip();
    if (cyRef.current) {
      cyRef.current.layout(layoutOptions[e.target.value]).run();
    }
  };

  // Add initialization tracking
  const initializationRef = useRef({
    count: 0,
    lastTimestamp: null,
    sources: []
  });

  useEffect(() => {
    // Track initialization source
    initializationRef.current.count++;
    initializationRef.current.lastTimestamp = new Date().toISOString();
    initializationRef.current.sources.push({
      trigger: 'mount',
      hasCollection: !!collection,
      hasData: !!graphData,
      timestamp: new Date().toISOString()
    });

    console.log('NetworkGraph: Initialization Tracking:', {
      count: initializationRef.current.count,
      history: initializationRef.current.sources,
      currentMount: {
        collection,
        graphDataPresent: !!graphData,
        timestamp: new Date().toISOString()
      }
    });

    return () => {
      console.log('NetworkGraph: Cleanup:', {
        initCount: initializationRef.current.count,
        unmountTime: new Date().toISOString()
      });
    };
  }, [collection, graphData]);

  // Track strict mode double-mount
  const strictModeRef = useRef({
    mountCount: 0,
    isStrictModeMount: false
  });

  useEffect(() => {
    strictModeRef.current.mountCount++;
    console.log('NetworkGraph: Mount Cycle:', {
      phase: 'mount',
      mountCount: strictModeRef.current.mountCount,
      isStrictModeMount: strictModeRef.current.mountCount === 1,
      hasData: !!graphData,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('NetworkGraph: Mount Cycle:', {
        phase: 'unmount',
        mountCount: strictModeRef.current.mountCount,
        isStrictModeMount: strictModeRef.current.mountCount === 1,
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  useEffect(() => {
    if (graphData) {
      console.log('NetworkGraph: Data Processing:', {
        phase: 'data-received',
        dataSize: graphData.length,
        dataHash: JSON.stringify(graphData).slice(0, 100), // First 100 chars as hash
        mountCount: strictModeRef.current.mountCount,
        timestamp: new Date().toISOString(),
        graphData: graphData,
        source: new Error().stack.split('\n')[2] // Where the data came from
      });
    }
  }, [graphData]);

  useEffect(() => {
    if (collection) {
      console.log('NetworkGraph: Collection Processing:', {
        phase: 'collection-received',
        collection,
        mountCount: strictModeRef.current.mountCount,
        timestamp: new Date().toISOString(),
        source: new Error().stack.split('\n')[2]
      });
    }
  }, [collection]);

  // Add detailed logging for data processing stages
  const processTopologyData = useCallback((response) => {
    const responseKey = `${response.url}_${new Date().getTime()}`;
    
    if (dataProcessingRef.current.processedResponses.has(responseKey)) {
      console.log('NetworkGraph: Duplicate topology processing prevented:', {
        url: response.url,
        timestamp: new Date().toISOString(),
        timeSinceLastProcess: dataProcessingRef.current.lastProcessedTimestamp ? 
          new Date().getTime() - new Date(dataProcessingRef.current.lastProcessedTimestamp).getTime() : 
          'first process'
      });
      return;
    }

    console.log('NetworkGraph: Processing topology data:', {
      phase: 'process-start',
      url: response.url,
      responseKey,
      timestamp: new Date().toISOString()
    });

    dataProcessingRef.current.processedResponses.add(responseKey);
    dataProcessingRef.current.lastProcessedTimestamp = new Date().toISOString();

    // Continue with existing processing logic
    // ... rest of the processing code ...
  }, []);

  const getLayoutConfig = (elements) => {
    return {
      name: 'circle',
      animate: true,
      animationDuration: 500,
      // Remove any node type specific positioning
      // Just use one circle layout for all nodes initially
      radius: 300,
      startAngle: 3 / 2 * Math.PI,
      sweep: 2 * Math.PI,
      clockwise: true,
      sort: (a, b) => {  // Optional: sort nodes by ID for consistent layout
        return a.data('id').localeCompare(b.data('id'));
      }
    };
  };

  // Update the layout application
  const applyLayout = useCallback((elements) => {
    if (!cyRef.current || !elements?.length) return;
    
    console.log('NetworkGraph: Applying circle layout to all nodes:', {
      totalNodes: elements.length,
      timestamp: new Date().toISOString()
    });

    const layout = cyRef.current.layout(getLayoutConfig(elements));
    layout.run();
  }, []);

  // Add tooltip state and handlers
  useEffect(() => {
    if (cyRef.current && graphData) {
      const cy = cyRef.current;

      let tooltip = document.querySelector('.cy-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'cy-tooltip';
        document.body.appendChild(tooltip);
      }

      // Enhanced tooltip styling
      tooltip.style.position = 'absolute';
      tooltip.style.display = 'none';
      tooltip.style.padding = '8px 12px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontFamily = 'Tahoma, sans-serif';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '999';
      tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      tooltip.style.maxWidth = '300px';
      tooltip.style.wordWrap = 'break-word';

      cy.on('mouseover', 'node', function(e) {
        console.log('NetworkGraph: Node hover:', {
          nodeId: e.target.id(),
          tooltipExists: Boolean(document.querySelector('.cy-tooltip')),
          timestamp: new Date().toISOString()
        });
        const node = e.target;
        const vertexData = node.data();
        const nodeColor = vertexData.color;

        console.log('NetworkGraph: Tooltip vertex data:', {
          nodeId: node.id(),
          rawData: vertexData,
          timestamp: new Date().toISOString()
        });

        // Format vertex data, handling arrays and nested objects
        const tooltipContent = Object.entries(vertexData)
          .filter(([key]) => key !== 'color')  // Exclude color
          .map(([key, value]) => {
            // Handle arrays (like sids)
            if (Array.isArray(value)) {
              return `<strong>${key}:</strong> ${value.join(', ')}`;
            }
            // Handle nested objects
            else if (typeof value === 'object' && value !== null) {
              return `<strong>${key}:</strong> ${JSON.stringify(value)}`;
            }
            // Handle simple values
            else {
              return `<strong>${key}:</strong> ${value}`;
            }
          })
          .join('<br>');

        tooltip.innerHTML = tooltipContent;
        tooltip.style.display = 'block';
        tooltip.style.backgroundColor = nodeColor;
        tooltip.style.color = isColorDark(nodeColor) ? '#ffffff' : '#000000';

        // Position tooltip
        const containerBounds = cy.container().getBoundingClientRect();
        const renderedPosition = node.renderedPosition();
        tooltip.style.left = `${containerBounds.left + renderedPosition.x + 10}px`;
        tooltip.style.top = `${containerBounds.top + renderedPosition.y - 10}px`;
      });

      // Helper function to determine if a color is dark
      const isColorDark = (color) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness < 128;
      };

      // Hide tooltip on mouseout
      cy.on('mouseout', 'node', function(e) {
        console.log('NetworkGraph: Node hover end:', {
          nodeId: e.target.id(),
          tooltipExists: Boolean(document.querySelector('.cy-tooltip')),
          timestamp: new Date().toISOString()
        });
        tooltip.style.display = 'none';
      });

      // Update tooltip position during drag
      cy.on('drag', 'node', function(e) {
        if (tooltip.style.display === 'block') {
          const node = e.target;
          const containerBounds = cy.container().getBoundingClientRect();
          const renderedPosition = node.renderedPosition();
          tooltip.style.left = `${containerBounds.left + renderedPosition.x + 10}px`;
          tooltip.style.top = `${containerBounds.top + renderedPosition.y - 10}px`;
        }
      });

      // Cleanup on unmount
      return () => {
        cy.removeAllListeners();
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      };
    }
  }, [cyRef.current, graphData]);

  useEffect(() => {
    if (cyRef.current && graphData) {
      const cy = cyRef.current;

      // Update style for selected elements - make edges thinner
      cy.style().selector('.selected').style({
        'background-color': '#FFD700',  // Gold highlight for selected nodes
        'line-color': '#FFD700',       // Gold highlight for selected edges
        'width': node => node.isEdge() ? 8 : 45,  // Thinner edges, same node size
        'height': node => node.isEdge() ? 8 : 45,
        'border-width': 3,
        'border-color': '#FF8C00'      // Dark orange border
      }).update();

      // Create persistent tooltip for path SIDs
      let pathTooltip = document.querySelector('.path-sids-tooltip');
      if (!pathTooltip) {
        pathTooltip = document.createElement('div');
        pathTooltip.className = 'path-sids-tooltip';
        document.body.appendChild(pathTooltip);
        
        // Style the SID tooltip
        pathTooltip.style.position = 'absolute';
        pathTooltip.style.backgroundColor = '#134a54';  // New background color
        pathTooltip.style.color = 'white';
        pathTooltip.style.padding = '12px 15px';
        pathTooltip.style.borderRadius = '4px';
        pathTooltip.style.fontFamily = 'Tahoma, sans-serif';
        pathTooltip.style.fontSize = '15px';
        pathTooltip.style.zIndex = '1000';
        pathTooltip.style.maxWidth = '300px';
        pathTooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        pathTooltip.style.display = 'none';
      }

      console.log('NetworkGraph: Updated SID tooltip style:', {
        element: 'pathTooltip',
        backgroundColor: '#134a54',
        timestamp: new Date().toISOString()
      });

      // Update SIDs tooltip content and visibility
      if (pathSids.length > 0) {
        console.log('NetworkGraph: Updating SID tooltip position:', {
          newPosition: 'left of legend',
          pathSidsCount: pathSids.length,
          timestamp: new Date().toISOString()
        });

        pathTooltip.innerHTML = `
          <strong>Path SIDs:</strong><br>
          ${pathSids.join('<br>')}
        `;
        pathTooltip.style.display = 'block';

        // Position tooltip to the left of the legend
        const containerBounds = cy.container().getBoundingClientRect();
        pathTooltip.style.right = '190px';  // Move left from the right edge
        pathTooltip.style.top = '110px';     // Keep same top position as legend
      } else {
        pathTooltip.style.display = 'none';
      }

      // Node click handler
      cy.on('tap', 'node', function(e) {
        const node = e.target;
        const nodeData = node.data();
        
        console.log('NetworkGraph: Node clicked:', {
          nodeId: node.id(),
          nodeType: nodeData.type,
          action: 'hiding hover tooltip',
          timestamp: new Date().toISOString()
        });

        // Hide the hover tooltip
        const hoverTooltip = document.querySelector('.cy-tooltip');
        if (hoverTooltip) {
          hoverTooltip.style.display = 'none';
        }

        // Update path and collect SIDs
        const newPath = [...selectedPath, node];
        setSelectedPath(newPath);

        // Collect only the first SID from each vertex in the path
        const newPathSids = newPath
          .map(pathNode => {
            const sids = pathNode.data().sids;
            // Take only the first SID if it exists
            const firstSid = sids && sids.length > 0 ? sids[0] : null;
            
            console.log('NetworkGraph: Collecting first SID:', {
              nodeId: pathNode.id(),
              allSids: sids,
              selectedSid: firstSid,
              timestamp: new Date().toISOString()
            });
            
            return firstSid;
          })
          .filter(sid => sid !== null);  // Remove any null entries

        console.log('NetworkGraph: Path SIDs updated:', {
          pathLength: newPath.length,
          sidsCollected: newPathSids,
          timestamp: new Date().toISOString()
        });

        setPathSids(newPathSids);
        
        // Clear previous selections and highlight new path
        cy.elements().removeClass('selected');
        newPath.forEach(pathNode => pathNode.addClass('selected'));

        // Highlight edges between consecutive nodes
        for (let i = 0; i < newPath.length - 1; i++) {
          const edge = cy.edges().filter(edge => 
            (edge.source().id() === newPath[i].id() && edge.target().id() === newPath[i + 1].id()) ||
            (edge.target().id() === newPath[i].id() && edge.source().id() === newPath[i + 1].id())
          );
          edge.addClass('selected');
        }
      });

      // Background click handler
      cy.on('tap', function(e) {
        if (e.target === cy) {
          setSelectedPath([]);
          setPathSids([]);
          cy.elements().removeClass('selected');
        }
      });

      // Cleanup
      return () => {
        cy.removeAllListeners();
        const tooltip = document.querySelector('.path-sids-tooltip');
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      };
    }
  }, [cyRef.current, graphData, selectedPath, pathSids]);

  // Add cleanup effect for sidebar interactions
  useEffect(() => {
    // Listen for sidebar button clicks
    const sidebarButtons = document.querySelectorAll('.expand-button, .section-content button');
    
    const handleSidebarClick = () => {
      console.log('NetworkGraph: Sidebar interaction detected:', {
        action: 'hiding Path SIDs',
        timestamp: new Date().toISOString()
      });
      hidePathSidsTooltip();
    };

    sidebarButtons.forEach(button => {
      button.addEventListener('click', handleSidebarClick);
    });

    // Cleanup
    return () => {
      sidebarButtons.forEach(button => {
        button.removeEventListener('click', handleSidebarClick);
      });
    };
  }, []);

  // Add logging for tier organization
  const tierLevels = {
    'endpoint': 0,
    'access-tier-3': 1,
    'access-tier-2': 2,
    'access-tier-1': 3,
    'access-tier-0': 4,
    'wan-tier-3': 5,
    'wan-tier-2': 6,
    'wan-tier-1': 7,
    'wan-tier-0': 8,
    'dci-tier-3': 9,
    'dci-tier-2': 10,
    'dci-tier-1': 11,
    'dci-tier-0': 12,
    'dc-tier-3': 13,
    'dc-tier-2': 14,
    'dc-tier-1': 15,
    'dc-tier-0': 16,
    'dc-prefix': 17,
    'dc-workload': 18,
    'dc-endpoint': 19
  };

  console.log('CLOS Layout: Tier configuration loaded:', {
    totalTiers: Object.keys(tierLevels).length,
    tierStructure: {
      dc: ['workload', 'endpoint', 'tier-0', 'tier-1', 'tier-2', 'tier-3'],
      dci: ['tier-0', 'tier-1', 'tier-2', 'tier-3'],
      wan: ['tier-0', 'tier-1', 'tier-2', 'tier-3'],
      access: ['tier-0', 'tier-1', 'tier-2', 'tier-3'],
      other: ['endpoint']
    },
    timestamp: new Date().toISOString()
  });

  // Add logging for actual tiers present in the network
  const logPresentTiers = (nodes) => {
    const presentTiers = new Set();
    nodes.forEach(node => presentTiers.add(node.data('tier')));

    console.log('CLOS Layout: Network tier analysis:', {
      totalNodesInNetwork: nodes.length,
      tiersPresent: Array.from(presentTiers),
      tierCounts: Array.from(presentTiers).reduce((acc, tier) => {
        acc[tier] = nodes.filter(node => node.data('tier') === tier).length;
        return acc;
      }, {}),
      segments: {
        dc: nodes.filter(node => node.data('tier').startsWith('dc-')).length,
        dci: nodes.filter(node => node.data('tier').startsWith('dci-')).length,
        wan: nodes.filter(node => node.data('tier').startsWith('wan-')).length,
        access: nodes.filter(node => node.data('tier').startsWith('access-')).length
      },
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="network-graph" style={{ width: '100%', height: '800px', position: 'relative' }}>
      <div style={{ padding: '10px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <select 
          value={selectedLayout} 
          onChange={(e) => {
            console.log('NetworkGraph: Layout changed:', {
              from: selectedLayout,
              to: e.target.value,
              action: 'hiding Path SIDs tooltip',
              timestamp: new Date().toISOString()
            });
            
            // Hide the Path SIDs tooltip
            const pathTooltip = document.querySelector('.path-sids-tooltip');
            if (pathTooltip) {
              pathTooltip.style.display = 'none';
            }
            setPathSids([]);
            setSelectedPath([]);
            
            // Update layout
            setSelectedLayout(e.target.value);
            if (cyRef.current) {
              cyRef.current.layout(layoutOptions[e.target.value]).run();
            }
          }}
        >
          <option value="circle">Circle</option>
          <option value="concentric">Concentric</option>
          <option value="dagre">Hierarchical</option>
          {/* <option value="cose">Force-Directed</option> */}
          <option value="clos">CLOS</option>
        </select>

        <select
          value={viewType}
          onChange={(e) => {
            console.log('NetworkGraph: View type changed:', {
              from: viewType,
              to: e.target.value,
              timestamp: new Date().toISOString()
            });
            setViewType(e.target.value);
          }}
        >
          <option value="full">Full Topology</option>
          <option value="nodes">Nodes Only</option>
        </select>
      </div>
      <CytoscapeComponent
        cy={(cy) => { 
          console.log('Cytoscape initialized');
          cyRef.current = cy;
        }}
        elements={graphData || []}
        style={{ width: '100%', height: '100%' }}
        stylesheet={style}
        userZoomingEnabled={true}
        userPanningEnabled={true}
      />
      <Legend />
    </div>
  );
};

export default NetworkGraph; 