import React, { useEffect, useRef, useState, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import { api } from '../services/api';  // Import the configured axios instance
import '../styles/NetworkGraph.css';

const COLORS = {
  igp_node: '#CC4A04',    // Cayenne orange for IGP nodes
  bgp_node: '#1E88E5',    // Blue for BGP nodes
  prefix: '#002921',      // Dark green for all prefix types
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initializeRef = useRef(false);

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
      let nodeColor = '#666666'; // default color
      let nodeLabel = vertex.name || id;  // default to name or id
      
      if (id.includes('bgp_node')) {
        nodeColor = '#014961';
      } else if (id.includes('igp_node')) {
        nodeColor = '#ff0000';
      } else if (id.includes('ls_prefix')) {
        nodeLabel = vertex.prefix;  // Use prefix value for prefix nodes
      }

      elements.push({
        group: 'nodes',
        data: {
          id: id,
          label: nodeLabel,
          type: vertex.collection,
          color: nodeColor
        }
      });
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
      padding: 50
    },
    cose: {
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      animate: true,
      randomize: false,
      padding: 50,
      fit: true,
      spacingFactor: 1.5,
      ready: function() {
        console.log('NetworkGraph: COSE layout starting', {
          timestamp: new Date().toISOString(),
          viewport: {
            width: cyRef.current?.width(),
            height: cyRef.current?.height()
          }
        });
      },
      stop: function() {
        console.log('NetworkGraph: COSE layout complete', {
          timestamp: new Date().toISOString(),
          boundingBox: cyRef.current?.elements().boundingBox()
        });
        cyRef.current?.fit(undefined, 50);
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
        'width': 20,
        'height': 20
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

  useEffect(() => {
    console.log('NetworkGraph: Component Lifecycle:', {
      phase: 'mount',
      requestId: ++requestIdRef.current,
      source: 'api.js',
      dataState: {
        hasCollection: !!collection,
        collectionName: collection?.collection,
        hasGraphData: !!graphData,
        dataLength: graphData?.length || 0
      },
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('NetworkGraph: Component Lifecycle:', {
        phase: 'unmount',
        requestId: requestIdRef.current,
        timestamp: new Date().toISOString()
      });
    };
  }, [collection]);

  useEffect(() => {
    if (collection) {
      console.log('NetworkGraph: Data Request:', {
        phase: 'fetch-start',
        requestId: requestIdRef.current,
        collection: collection.collection,
        timestamp: new Date().toISOString()
      });
      setDataSource(collection.collection);
    }
  }, [collection]);

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
      console.log('NetworkGraph: Making API request:', {
        collection,
        requestType: 'topology',
        timestamp: new Date().toISOString()
      });

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

  useEffect(() => {
    console.log('Collection received:', {
      collection,
      type: typeof collection,
      keys: collection ? Object.keys(collection) : 'none'
    });

    if (typeof collection === 'string') {
      fetchTopology(collection)
        .then(data => {
          console.log('Parsed topology data:', {
            vertices: Object.keys(data.vertices).length,
            edges: data.edges.length
          });
          const elements = transformDataToCytoscape(data);
          setGraphData(elements);
        })
        .catch(error => {
          console.error('NetworkGraph: Topology fetch failed:', {
            error: error.message,
            collection,
            timestamp: new Date().toISOString()
          });
        });
    }
  }, [collection, fetchTopology]);

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

  // Add logging to layout change handler
  const handleLayoutChange = (e) => {
    const newLayout = e.target.value;
    console.log('Layout change requested:', {
      from: selectedLayout,
      to: newLayout,
      config: layoutOptions[newLayout]
    });
    
    setSelectedLayout(newLayout);
    if (cyRef.current) {
      console.log('Running new layout:', newLayout);
      cyRef.current.layout(layoutOptions[newLayout]).run();
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

  return (
    <div className="network-graph" style={{ width: '100%', height: '800px', position: 'relative' }}>
      <div style={{ padding: '10px' }}>
        <select 
          value={selectedLayout} 
          onChange={(e) => {
            setSelectedLayout(e.target.value);
            if (cyRef.current) {
              cyRef.current.layout(layoutOptions[e.target.value]).run();
            }
          }}
        >
          <option value="circle">Circle</option>
          <option value="concentric">Concentric</option>
          <option value="dagre">Hierarchical</option>
          <option value="cose">Force-Directed</option>
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