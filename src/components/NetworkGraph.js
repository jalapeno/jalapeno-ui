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
  gpu: '#49b019',         // Green for GPU nodes
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
  const [isReady, setIsReady] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.gpu,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>GPUs</span>
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
      } else if (id.includes('prefix')) {
        nodeColor = COLORS.prefix;
        nodeLabel = vertex.prefix || id;
      } else if (id.includes('gpus/')) {
        nodeColor = COLORS.gpu;
        nodeLabel = vertex.name || id.split('/')[1];
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
      name: 'preset',
      positions: function(node) {
        const cy = node.cy();
        
        // Identify node type
        const isWorkload = node.data('id').includes('gpus/');
        const isPrefix = node.data('id').includes('prefix');
        const isNode = node.data('id').includes('bgp_node') || node.data('id').includes('igp_node');
        
        // Get collections for each type
        const workloadNodes = cy.nodes().filter(n => n.data('id').includes('gpus/'));
        const prefixNodes = cy.nodes().filter(n => n.data('id').includes('prefix'));
        const coreNodes = cy.nodes().filter(n => 
          n.data('id').includes('bgp_node') || n.data('id').includes('igp_node')
        );

        if (isWorkload) {
          // Get the connected prefix
          const connectedPrefix = node.neighborhood('node').first();
          if (connectedPrefix) {
            // Find the index of this workload among all workloads connected to the same prefix
            const connectedWorkloads = connectedPrefix.neighborhood('node').filter(n => n.data('id').includes('gpus/'));
            const localIndex = Array.from(connectedWorkloads).findIndex(n => n.id() === node.id());
            const totalLocal = connectedWorkloads.length;
            
            // Get the angle of the connected prefix
            const prefixIndex = Array.from(prefixNodes).findIndex(n => n.id() === connectedPrefix.id());
            const prefixAngle = (2 * Math.PI * prefixIndex) / prefixNodes.length;
            
            // Add a small offset based on the local index
            const offsetRange = Math.PI / 8;
            const offset = totalLocal > 1 ? (localIndex - (totalLocal - 1) / 2) * (offsetRange / totalLocal) : 0;
            const finalAngle = prefixAngle + offset;
            
            return {
              x: Math.cos(finalAngle) * 850,
              y: Math.sin(finalAngle) * 850
            };
          }
        } else if (isPrefix) {
          const index = Array.from(prefixNodes).findIndex(n => n.id() === node.id());
          const totalPrefixes = prefixNodes.length;
          const angle = (2 * Math.PI * index) / totalPrefixes;
          
          return {
            x: Math.cos(angle) * 600,
            y: Math.sin(angle) * 600
          };
        } else {
          // Position all core nodes (BGP and IGP) in the inner circle
          const index = Array.from(coreNodes).findIndex(n => n.id() === node.id());
          const totalCore = coreNodes.length;
          const angle = (2 * Math.PI * index) / totalCore;
          
          return {
            x: Math.cos(angle) * 350,
            y: Math.sin(angle) * 350
          };
        }
      },
      animate: true,
      animationDuration: 500,
      padding: 50,
      fit: true
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

        // Helper function to extract number from node ID or name
        const getNodeNumber = (node) => {
          const str = node.data('name') || node.id();
          const match = str.match(/\d+/);
          return match ? parseInt(match[0]) : Infinity;  // Return Infinity for nodes without numbers
        };

        // Special handling for dc-prefix tier
        if (tier === 'dc-prefix') {
          const connectedEdges = node.connectedEdges();
          const connectedTier0Node = connectedEdges
            .connectedNodes()
            .filter(n => n.data('tier') === 'dc-tier-0')
            .first();

          if (connectedTier0Node.length > 0) {
            const tier0Pos = connectedTier0Node.position();
            
            // Get all dc-tier-0 nodes and sort them by numeric value
            const allTier0Nodes = node.cy().nodes().filter(n => n.data('tier') === 'dc-tier-0');
            const sortedTier0Nodes = allTier0Nodes.sort((a, b) => getNodeNumber(a) - getNodeNumber(b));
            
            // Find the index of this node's parent in the sorted list
            const parentIndex = sortedTier0Nodes.indexOf(connectedTier0Node);
            
            // Get all prefixes connected to this dc-tier-0 node
            const siblingPrefixes = connectedTier0Node
              .connectedEdges()
              .connectedNodes()
              .filter(n => n.data('tier') === 'dc-prefix');
            
            const prefixIndex = siblingPrefixes.indexOf(node);
            const xSpacing = 70;  // Using the reduced spacing for prefixes
            const xOffset = (prefixIndex - (siblingPrefixes.length - 1) / 2) * xSpacing;
            
            // Base vertical spacing from dc-tier-0
            const ySpacing = 150;
            
            // Alternate vertical position based on parent index
            const groupYOffset = (parentIndex % 2) * 100;
            
            // Small y-offset within group based on prefix index
            const withinGroupYOffset = (prefixIndex % 2) * 30;
            
            return {
              x: tier0Pos.x + xOffset,
              y: tier0Pos.y + ySpacing + groupYOffset + withinGroupYOffset
            };
          }
        }
        
        // Special handling for GPU nodes
        if (node.id().includes('gpus/')) {
          // Get all GPU nodes and sort them by numeric value
          const allGpuNodes = node.cy().nodes().filter(n => n.id().includes('gpus/'));
          const sortedGpuNodes = Array.from(allGpuNodes).sort((a, b) => getNodeNumber(a) - getNodeNumber(b));
          
          // Create a temporary DOM element to measure text width
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          context.font = '14px Tahoma';
          
          const getLabelWidth = (node) => {
            const label = node.data('label');
            return context.measureText(label).width + 40;
          };
          
          const nodeIndex = sortedGpuNodes.indexOf(node);
          const groupSize = 6;
          const groupIndex = Math.floor(nodeIndex / groupSize);
          const positionInGroup = nodeIndex % groupSize;
          
          // Get the nodes in this group
          const groupStart = groupIndex * groupSize;
          const groupEnd = Math.min(groupStart + groupSize, sortedGpuNodes.length);
          const nodesInGroup = sortedGpuNodes.slice(groupStart, groupEnd);
          
          // Calculate minimum xSpacing based on maximum label width in this group
          const maxLabelWidth = Math.max(...nodesInGroup.map(getLabelWidth));
          const xSpacing = Math.max(70, maxLabelWidth);
          
          const groupXSpacing = 360;
          const ySpacing = 50;
          const groupYSpacing = 80;
          const gpuTierOffset = 80;
          
          // Calculate total number of groups
          const totalGroups = Math.ceil(sortedGpuNodes.length / groupSize);
          
          // Calculate center offset for all groups
          const totalWidth = (totalGroups - 1) * groupXSpacing;
          const centerOffset = -totalWidth / 2;
          
          // Calculate position with centered group offset
          const xPosition = centerOffset + (groupIndex * groupXSpacing) + (positionInGroup * xSpacing) - ((nodesInGroup.length * xSpacing) / 2);
          const yPosition = (tierLevels[tier] * 150) + (groupIndex * groupYSpacing) + gpuTierOffset;

          console.log('CLOS Layout: GPU node position calculated:', {
            nodeId: node.id(),
            nodeIndex,
            groupIndex,
            positionInGroup,
            labelWidth: getLabelWidth(node),
            xSpacing,
            totalGroups,
            centerOffset,
            position: { x: xPosition, y: yPosition },
            timestamp: new Date().toISOString()
          });

          return { x: xPosition, y: yPosition };
        }
        
        // Normal positioning for nodes with valid tiers
        const yPosition = tierLevels[tier] * 150;
        const tierNodes = node.cy().nodes().filter(n => n.data('tier') === tier);
        
        // Sort nodes by their numeric value
        const sortedTierNodes = Array.from(tierNodes).sort((a, b) => getNodeNumber(a) - getNodeNumber(b));
        const nodeIndex = sortedTierNodes.indexOf(node);
        
        const xSpacing = 180;  // Using the increased spacing for tier nodes
        const xOffset = (sortedTierNodes.length * xSpacing) / -2;
        const xPosition = xOffset + (nodeIndex * xSpacing);

        console.log('CLOS Layout: Node position calculated:', {
          nodeId: node.id(),
          tier: tier,
          numericValue: getNodeNumber(node),
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

      // Helper function to determine if a color is dark
      const isColorDark = (color) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness < 128;
      };

      // Helper function to update tooltip content and position
      const updateTooltip = (node, event) => {
        const vertexData = node.data();
        const nodeColor = vertexData.color;
        const containerBounds = cy.container().getBoundingClientRect();
        const renderedPosition = node.renderedPosition();

        const tooltipContent = Object.entries(vertexData)
          .filter(([key, value]) => {
            // Filter out specific keys and undefined values
            return !['_id', '_key', '_rev'].includes(key) && 
                   value !== undefined &&
                   value !== 'undefined' &&
                   key !== 'color';  // We already filter this out, but being explicit
          })
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return value.length > 0 ? `<strong>${key}:</strong> ${value.join(', ')}` : null;
            } else if (typeof value === 'object' && value !== null) {
              return `<strong>${key}:</strong> ${JSON.stringify(value)}`;
            } else {
              return `<strong>${key}:</strong> ${value}`;
            }
          })
          .filter(content => content !== null)  // Remove any null entries from empty arrays
          .join('<br>');

        tooltip.innerHTML = tooltipContent;
        tooltip.style.backgroundColor = nodeColor;
        tooltip.style.color = isColorDark(nodeColor) ? '#ffffff' : '#000000';
        tooltip.style.left = `${containerBounds.left + renderedPosition.x + 10}px`;
        tooltip.style.top = `${containerBounds.top + renderedPosition.y - 10}px`;
        tooltip.style.display = 'block';
      };

      // Remove existing listeners before adding new ones
      cy.removeListener('mouseover');
      cy.removeListener('mouseout');
      cy.removeListener('drag');
      cy.removeListener('dragfree');
      cy.removeListener('tap');
      cy.removeListener('pan');
      cy.removeListener('zoom');

      // Add event listeners using one to ensure they persist
      cy.on('mouseover', 'node', function(e) {
        const node = e.target;
        updateTooltip(node, e);
      });

      cy.on('mouseout', 'node', function() {
        tooltip.style.display = 'none';
      });

      cy.on('drag', 'node', function(e) {
        const node = e.target;
        if (tooltip.style.display === 'block') {
          updateTooltip(node, e);
        }
      });

      // Simplified dragfree handler
      cy.on('dragfree', 'node', function(e) {
        const node = e.target;
        // Hide tooltip after drag ends
        tooltip.style.display = 'none';
      });

      // Hide tooltip during pan and zoom
      cy.on('pan zoom', function() {
        tooltip.style.display = 'none';
      });

      // Cleanup on unmount
      return () => {
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
        // Remove specific listeners instead of all
        cy.removeListener('mouseover');
        cy.removeListener('mouseout');
        cy.removeListener('drag');
        cy.removeListener('dragfree');
        cy.removeListener('pan');
        cy.removeListener('zoom');
      };
    }
  }, [cyRef.current, graphData, selectedLayout]);

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
    'dc-endpoint': 18,
    'dc-workload': 19,
 
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