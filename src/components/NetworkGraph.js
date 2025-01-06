import React, { useEffect, useRef, useState, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';
import { api } from '../services/api';  // Import the configured axios instance
import '../styles/NetworkGraph.css';
//import { fetchPath } from '../api/pathApi';  // Adjust path as needed

const COLORS = {
  igp_node: '#CC4A04',    // Cayenne orange for IGP nodes
  bgp_node: '#0d7ca1',    // Blue for BGP nodes
  prefix: '#696e6d',      // Grey for all prefix types
  //prefix: '#ffcc00',      // Gold for all prefix types
  //prefix: '#665f5c',      // Grey/orange for all prefix types
  gpu: '#49b019',         // Green for GPU nodes
  //gpu: '#6bcde8',         // Blueish for GPU nodes
  text: '#000',           // Black text
  edge: '#1a365d',         // Blue edges
  path_highlight: '#0d7ca1' // Highlight color for path
};

cytoscape.use(cola);
cytoscape.use(dagre);

// Or define it directly if you prefer
const fetchPath = async (collection, source, destination, constraint) => {
  try {
    // Build the URL based on the constraint
    let endpoint = 'shortest_path';
    if (constraint === 'latency') {
      endpoint = 'shortest_path/latency';
    } else if (constraint === 'utilization') {
      endpoint = 'shortest_path/utilization';
    } else if (constraint === 'scheduled') {
      endpoint = 'shortest_path/load';
    }
    
    const url = `/graphs/${collection}/${endpoint}?source=${source}&destination=${destination}&direction=any`;
    
    console.log('NetworkGraph: Fetching path:', {
      url,
      collection,
      source,
      destination,
      constraint,
      timestamp: new Date().toISOString()
    });

    const response = await api.get(url);
    
    console.log('NetworkGraph: Path data received:', {
      found: response.data.found,
      hopCount: response.data.hopcount,
      vertexCount: response.data.vertex_count,
      constraint,
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Path API request failed:', error);
    throw error;
  }
};

/**
 * Cytoscape Style Configuration
 * Defines visual properties for graph elements:
 * - Default node styling (color, size, labels)
 * - Default edge styling (width, color, no arrows)
 * - Selected source/destination node highlighting
 * - Path highlighting for calculated paths
 */
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
  },
  {
    selector: 'node.source-selected',
    style: {
      'background-color': '#0d7ca1',
      'border-width': '3px',
      'border-color': '#0d7ca1',
      'border-opacity': 0.8,
      label: 'data(label)'
    }
  },
  {
    selector: 'node.dest-selected',
    style: {
      'background-color': '#0d7ca1',
      'border-width': '3px',
      'border-color': '#0d7ca1',
      'border-opacity': 0.8,
      label: 'data(label)'
    }
  },
  {
    selector: '.path-highlight',
    style: {
      'background-color': '#0d7ca1',
      'border-width': '3px',
      'border-color': '#0d7ca1',
      'border-opacity': 0.8,
      'line-color': '#0d7ca1',
      'target-arrow-color': '#0d7ca1',
      'width': 4,
      'z-index': 999
    }
  }
];

const NetworkGraph = ({ collection, onPathCalculationStart }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('concentric');
  //const [selectedLayout, setSelectedLayout] = useState('clos');
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState('full'); // 'full' or 'nodes'
  const [selectedPath, setSelectedPath] = useState([]);
  const [pathSids, setPathSids] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isPathCalculationMode, setIsPathCalculationMode] = useState(false);
  const [viewMode, setViewMode] = useState('topology'); // 'topology' or 'path-calculation'
  const [selectedSourceNode, setSelectedSourceNode] = useState(null);
  const [selectedDestNode, setSelectedDestNode] = useState(null);

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
      let nodeLabel = vertex._key || id;
      //let nodeLabel = vertex.name || id;
      
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
      if (edge._from && edge._to && edge._id) {
        if (!processedEdges.has(edge._id)) {
          processedEdges.add(edge._id);
          elements.push({
            group: 'edges',
            data: {
              id: edge._id,
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

    // After creating all edges
    console.log('NetworkGraph: Created edges:', {
      total: processedEdges.size,
      sampleEdges: Array.from(processedEdges).slice(0, 5),
      timestamp: new Date().toISOString()
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
      startAngle: Math.PI,  // Start from left side
      sweep: Math.PI * 2,
      clockwise: true,
      sort: function(a, b) {
        // Get node types with multiplier to create gaps between groups
        const getNodeTypeAndValue = (node) => {
          const id = node.data('id');
          if (id.includes('igp_node')) return { type: 'igp_node', value: 0 };
          if (id.includes('bgp_node')) return { type: 'bgp_node', value: 100 };
          if (id.includes('prefix')) return { type: 'prefix', value: 200 };
          if (id.includes('gpus/')) return { type: 'gpus', value: 300 };
          return { type: 'other', value: 400 };
        };

        const aInfo = getNodeTypeAndValue(a);
        const bInfo = getNodeTypeAndValue(b);

        // Add secondary sorting within same type
        if (aInfo.value === bInfo.value) {
          return a.data('id').localeCompare(b.data('id'));
        }

        return aInfo.value - bInfo.value;
      },
      positions: function(node, i, total) {
        // Override default positioning to ensure gaps between groups
        const angle = this.startAngle + (i / total) * this.sweep;
        const radius = Math.min(this.width, this.height) / 2 - this.padding;
        
        return {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle)
        };
      }
    },
    concentric: {
      name: 'preset',
      positions: function(node) {
        const cy = node.cy();
        
        // Debug log for node properties
        console.log('NetworkGraph: Layout node properties:', {
          id: node.id(),
          type: node.data('type'),
          name: node.data('name'),
          prefix: node.data('prefix'),
          router_id: node.data('router_id'),
          timestamp: new Date().toISOString()
        });
        
        // Keep existing ID-based type checks for now
        const isWorkload = node.data('id').includes('gpus/');
        const isPrefix = node.data('id').includes('prefix');
        const isIgpNode = node.data('id').includes('igp_node');
        const isBgpNode = node.data('id').includes('bgp_node');
        
        // Get collections for each type
        const workloadNodes = cy.nodes().filter(n => n.data('id').includes('gpus/'));
        const prefixNodes = cy.nodes().filter(n => n.data('id').includes('prefix'));
        const igpNodes = cy.nodes().filter(n => n.data('id').includes('igp_node'));
        const bgpNodes = cy.nodes().filter(n => n.data('id').includes('bgp_node'));

        // Determine layout mode based on presence of IGP nodes
        const hasIgp = igpNodes.length > 0;
        
        // Adjust radii based on network type
        const radii = hasIgp ? {
          igp: 350,
          bgp: 500,
          prefix: 700,
          workload: 850
        } : {
          bgp: 450,  // More central position when no IGP
          prefix: 650,
          workload: 850
        };

        if (isWorkload) {
          const connectedPrefix = node.neighborhood('node').first();
          if (connectedPrefix) {
            const connectedWorkloads = connectedPrefix.neighborhood('node').filter(n => n.data('id').includes('gpus/'));
            const localIndex = Array.from(connectedWorkloads).findIndex(n => n.id() === node.id());
            const totalLocal = connectedWorkloads.length;
            
            const prefixIndex = Array.from(prefixNodes).findIndex(n => n.id() === connectedPrefix.id());
            const prefixAngle = (2 * Math.PI * prefixIndex) / prefixNodes.length;
            
            const offsetRange = Math.PI / 8;
            const offset = totalLocal > 1 ? (localIndex - (totalLocal - 1) / 2) * (offsetRange / totalLocal) : 0;
            const finalAngle = prefixAngle + offset;
            
            return {
              x: Math.cos(finalAngle) * radii.workload,
              y: Math.sin(finalAngle) * radii.workload
            };
          }
        } else if (isPrefix) {
          const index = Array.from(prefixNodes).findIndex(n => n.id() === node.id());
          const totalPrefixes = prefixNodes.length;
          const angle = (2 * Math.PI * index) / totalPrefixes;
          
          return {
            x: Math.cos(angle) * radii.prefix,
            y: Math.sin(angle) * radii.prefix
          };
        } else if (isBgpNode) {
          const index = Array.from(bgpNodes).findIndex(n => n.id() === node.id());
          const total = bgpNodes.length;
          
          // If many BGP nodes and no IGP, use multiple concentric circles
          if (!hasIgp && total > 12) {  // Adjust threshold as needed
            const innerCount = Math.floor(total / 2);
            const isInnerCircle = index < innerCount;
            const localIndex = isInnerCircle ? index : index - innerCount;
            const localTotal = isInnerCircle ? innerCount : total - innerCount;
            const radius = isInnerCircle ? radii.bgp * 0.6 : radii.bgp;
            const angle = (2 * Math.PI * localIndex) / localTotal;
            
            return {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius
            };
          }
          
          // Standard single circle for BGP nodes
          const angle = (2 * Math.PI * index) / total;
          return {
            x: Math.cos(angle) * radii.bgp,
            y: Math.sin(angle) * radii.bgp
          };
        } else if (isIgpNode && hasIgp) {
          const index = Array.from(igpNodes).findIndex(n => n.id() === node.id());
          const total = igpNodes.length;
          const angle = (2 * Math.PI * index) / total;
          
          return {
            x: Math.cos(angle) * radii.igp,
            y: Math.sin(angle) * radii.igp
          };
        }
      },
      animate: true,
      animationDuration: 500,
      padding: 50,
      fit: true
    },

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
    },
    tiered: {
      name: 'preset',
      positions: function(node) {
        const cy = node.cy();
        const nodes = cy.nodes();
        
        // Check if node is a GPU/workload
        const isGpu = node.data('id').includes('gpus/');
        
        // Calculate connection counts for all nodes
        const connectionCounts = new Map();
        nodes.forEach(node => {
          connectionCounts.set(node.id(), node.connectedEdges().length);
        });
        
        // Get unique connection counts and sort them
        const uniqueCounts = [...new Set(connectionCounts.values())].sort((a, b) => b - a);
        
        // Get this node's connection count and index
        const connections = connectionCounts.get(node.id());
        const countIndex = uniqueCounts.indexOf(connections);
        
        // Force GPUs to tier 4, otherwise determine tier based on unique counts
        let tier;
        if (isGpu) {
          tier = 4;
        } else {
          const percentile = countIndex / uniqueCounts.length;
          
          if (percentile <= 0.15) tier = 1;
          else if (percentile <= 0.4) tier = 2;
          else if (percentile <= 0.7) tier = 3;
          else tier = 4;
        }
        
        // Get all nodes in this tier
        const tierNodes = nodes.filter(n => {
          const nConnections = connectionCounts.get(n.id());
          return connectionCounts.get(n.id()) === connections && !n.data('id').includes('gpus/');
        }).sort((a, b) => a.id().localeCompare(b.id()));
        
        // Get position within tier
        const index = Array.from(tierNodes).findIndex(n => n.id() === node.id());
        const totalInTier = tierNodes.length;
        
        // Layout parameters
        const verticalSpacing = 400;
        const horizontalSpacing = 50;
        const tierWidth = Math.max(nodes.length * horizontalSpacing, cy.width() * 0.8);
        
        // Ellipse parameters
        const ellipseWidth = 800;
        const ellipseHeight = 200;
        
        // Position calculation
        let x, y;
        
        if (tier === 1) {
          // Top tier in ellipse, starting from 12 o'clock
          const startAngle = (3 * Math.PI) / 2;
          const angle = startAngle + (2 * Math.PI * index) / totalInTier;
          x = Math.cos(angle) * ellipseWidth;
          y = Math.sin(angle) * ellipseHeight - verticalSpacing;
        } else if (isGpu) {
          // Position GPUs in their own tier below tier 4
          const gpuNodes = nodes.filter(n => n.data('id').includes('gpus/'));
          const gpuIndex = Array.from(gpuNodes).findIndex(n => n.id() === node.id());
          const totalGpus = gpuNodes.length;
          
          // Use same split logic for GPUs
          const needsSplit = totalGpus > 10;
          
          if (needsSplit) {
            const nodesPerRow = Math.ceil(totalGpus / 2);
            const row = gpuIndex >= nodesPerRow ? 1 : 0;
            const indexInRow = row === 0 ? gpuIndex : gpuIndex - nodesPerRow;
            const totalInRow = row === 0 ? 
              Math.min(nodesPerRow, totalGpus) : 
              totalGpus - nodesPerRow;
            
            x = (indexInRow + 0.5) * (tierWidth / totalInRow) - tierWidth / 2;
            if (row === 1) {
              x += 150;  // Offset second row to the right
            }
            y = ((tier - 2) * verticalSpacing) + 70 + (row * 50);  // Reduced spacing to GPU tier
          } else {
            // Single row of GPUs
            x = (gpuIndex + 0.5) * (tierWidth / totalGpus) - tierWidth / 2;
            y = ((tier - 2) * verticalSpacing) + 150;  // Reduced spacing to GPU tier
          }
        } else {
          // Get nodes in current and above tiers for comparison
          const currentTierNodes = nodes.filter(n => {
            const nConnections = connectionCounts.get(n.id());
            const nTier = isGpu ? 4 : (uniqueCounts.indexOf(nConnections) / uniqueCounts.length <= 0.25 ? 1 :
              uniqueCounts.indexOf(nConnections) / uniqueCounts.length <= 0.5 ? 2 :
              uniqueCounts.indexOf(nConnections) / uniqueCounts.length <= 0.75 ? 3 : 4);
            return nTier === tier && !n.data('id').includes('gpus/');
          }).length;

          const aboveTierNodes = nodes.filter(n => {
            const nConnections = connectionCounts.get(n.id());
            const nTier = isGpu ? 4 : (uniqueCounts.indexOf(nConnections) / uniqueCounts.length <= 0.25 ? 1 :
              uniqueCounts.indexOf(nConnections) / uniqueCounts.length <= 0.5 ? 2 :
              uniqueCounts.indexOf(nConnections) / uniqueCounts.length <= 0.75 ? 3 : 4);
            return nTier === (tier - 1) && !n.data('id').includes('gpus/');
          }).length;

          // Debug logging
          console.log(`Tier ${tier}: Current nodes = ${currentTierNodes}, Above nodes = ${aboveTierNodes}`);
          
          // Simplified split check
          const needsSplit = currentTierNodes > 10;  // Split if more than 10 nodes in tier
          console.log(`Tier ${tier} needs split: ${needsSplit}`);
          
          if (needsSplit) {
            // Split tier into two rows
            const nodesPerRow = Math.ceil(totalInTier / 2);
            const row = index >= nodesPerRow ? 1 : 0;
            const indexInRow = row === 0 ? index : index - nodesPerRow;
            const totalInRow = row === 0 ? 
              Math.min(nodesPerRow, totalInTier) : 
              totalInTier - nodesPerRow;
            
            console.log(`Tier ${tier} Row ${row}: index=${indexInRow}, total=${totalInRow}`);
            
            // Calculate position with offset for second row
            x = (indexInRow + 0.5) * (tierWidth / totalInRow) - tierWidth / 2;
            if (row === 1) {
              x += 150;  // Offset second row to the right
            }
            y = (tier - 2) * verticalSpacing + (row * 80);  // Offset second row down
          } else {
            // Single row layout
            x = (index + 0.5) * (tierWidth / totalInTier) - tierWidth / 2;
            y = (tier - 2) * verticalSpacing;
          }
        }
        
        return { x, y };
      },
      animate: true,
      animationDuration: 500,
      padding: 50,
      fit: true
    }
  };

  const fetchTopology = useCallback(async (collection) => {
    try {
      const response = await api.get(`/graphs/${collection}/topology`);
      
      console.log('NetworkGraph: API response received:', { 
        status: response.status,
        collection,
        dataSize: response.data ? Object.keys(response.data).length : 0,
        timestamp: new Date().toISOString()
      });

      // Add this logging
      if (response.data && response.data.edges) {
        console.log('NetworkGraph: Raw edge data sample:', {
          total: response.data.edges.length,
          sample: response.data.edges.slice(0, 3),
          timestamp: new Date().toISOString()
        });
      }

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

      const response = await api.get(`/graphs/${collection}/topology/nodes`);
      
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

        // Start with id and label
        let tooltipContent = '';
        if (vertexData.id) {
          tooltipContent += `<strong>id:</strong> ${vertexData.id}<br>`;
        }
        if (vertexData.label) {
          tooltipContent += `<strong>label:</strong> ${vertexData.label}<br>`;
        }
        
        // Add SID after id and label
        if (vertexData.sids && vertexData.sids.length > 0 && vertexData.sids[0].srv6_sid) {
          tooltipContent += `<strong>sid:</strong> ${vertexData.sids[0].srv6_sid}<br>`;
        }

        // Add the rest of the content
        tooltipContent += Object.entries(vertexData)
          .filter(([key, value]) => {
            return !['_id', '_key', '_rev', 'action', 'router_hash', 'domain_id', 'peer_type', 
              'peer_hash', 'timestamp', 'mt_id_tlv', 'local_node_hash', 'nexthop', 'node_msd', 
              'protocol_id', 'prefix_attr_tlvs', 'sr_algorithm', 'peer_ip', 'router_ip',
              'srv6_capabilities_tlv', 'sids', 'id', 'label'].includes(key) && !key.startsWith('is_') &&
                   value !== undefined &&
                   value !== 'undefined' &&
                   key !== 'color';
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
          .filter(content => content !== null)
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


  // Tooltips section for highlighting node data and path
  // Topology View mode styling and tooltips
  useEffect(() => {
    if (cyRef.current && graphData) {
      const cy = cyRef.current;

      // Update style for selected elements - make edges thinner
      cy.style().selector('.selected').style({
        'background-color': '#FFD700',  // Gold highlight for selected nodes
        //'background-color': '#2bba69',  // Gold highlight for selected nodes
        'line-color': '#FFD700',       // Gold highlight for selected edges
        //'line-color': '#2bba69',       // Gold highlight for selected edges
        'width': node => node.isEdge() ? 8 : 45,  // Thinner edges, same node size
        'height': node => node.isEdge() ? 8 : 45,
        'border-width': 3,
        'border-color': '#FF8C00'      // Dark orange border
        //'border-color': '#2bba69'      // Dark orange border
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
      if (pathSids && pathSids.length > 0) {
        console.log('NetworkGraph: Path SIDs to display:', {
          rawData: pathSids,
          timestamp: new Date().toISOString()
        });

        // Format only the nodes that have valid SIDs
        const formattedSids = pathSids
          .filter(item => item && item.sid) // Extra validation
          .map(item => {
            console.log('Formatting SID item:', item);
            return `${item.label}: ${item.sid}`;
          });

        console.log('NetworkGraph: Formatted SIDs:', {
          formatted: formattedSids,
          timestamp: new Date().toISOString()
        });

        // Make sure tooltip exists and is visible
        if (formattedSids.length > 0 && pathTooltip) {
          console.log('NetworkGraph: Showing tooltip with content:', formattedSids);
          
          pathTooltip.innerHTML = `
            <div style="
              background: white;
              border: 1px solid #ccc;
              padding: 6px 12px;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              width: 300px;
              margin-top: 30px;
              font-family: Consolas, monospace;
            ">
              <h4 style="margin: 8px 0; font-size: 14px;">SRv6 Information</h4>
              <div style="font-size: 12px; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                <div style="margin-bottom: 8px;">
                  <strong>SID List:</strong>
                  ${formattedSids.map(sid => `
                    <div style="margin-left: 12px;">${sid}</div>
                  `).join('')}
                </div>
                <div>
                  <strong>uSID:</strong>
                  <div style="margin-left: 12px; word-break: break-all;">${formattedSids[0].split(':')[1]}</div>
                </div>
              </div>
            </div>
          `;
          pathTooltip.style.display = 'block';
          
          // Position tooltip
          const containerBounds = cy.container().getBoundingClientRect();
          pathTooltip.style.right = '190px';
          pathTooltip.style.top = '110px';
        } else {
          console.log('NetworkGraph: No formatted SIDs to display or tooltip not found');
          if (pathTooltip) {
            pathTooltip.style.display = 'none';
          }
        }
      } else {
        console.log('NetworkGraph: No path SIDs to display');
        if (pathTooltip) {
          pathTooltip.style.display = 'none';
        }
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
            const nodeData = pathNode.data();
            
            // Debug log the node data
            console.log('NetworkGraph: Node data:', {
              nodeId: pathNode.id(),
              sids: nodeData.sids,
              timestamp: new Date().toISOString()
            });
            
            // Skip nodes that don't have sids array
            if (!nodeData.sids || !Array.isArray(nodeData.sids) || nodeData.sids.length === 0) {
              return null;
            }
            
            // Check for valid srv6_sid
            const sidObject = nodeData.sids[0];
            if (sidObject && typeof sidObject === 'object' && sidObject.srv6_sid) {
              const sid = sidObject.srv6_sid;
              
              console.log('NetworkGraph: Valid SID found:', {
                nodeId: pathNode.id(),
                sid: sid,
                timestamp: new Date().toISOString()
              });
              
              return {
                label: nodeData.label || nodeData.id,
                sid: sid
              };
            }
            return null;
          })
          .filter(item => item !== null);  // Remove any null entries

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

  // Add a function to reset selections (we'll need this later)
  const resetNodeSelections = () => {
    console.log('NetworkGraph: Resetting node selections', {
      timestamp: new Date().toISOString()
    });
    
    if (selectedSourceNode) {
      selectedSourceNode.removeClass('source-selected');
    }
    if (selectedDestNode) {
      selectedDestNode.removeClass('dest-selected');
    }
    
    setSelectedSourceNode(null);
    setSelectedDestNode(null);
  };

  // Reset selections when mode changes
  useEffect(() => {
    if (onPathCalculationStart) {
      setViewMode('path-calculation');
      resetNodeSelections();
    } else {
      setViewMode('topology');
      resetNodeSelections();
    }
  }, [onPathCalculationStart]);

  // Add this function to handle node selection in path calculation mode
  const handleNodeSelection = (node) => {
    console.log('NetworkGraph: Handling node selection:', {
      nodeId: node.id(),
      currentStep: !selectedSourceNode ? 'selecting_source' : 'selecting_destination',
      timestamp: new Date().toISOString()
    });

    if (!selectedSourceNode) {
      node.addClass('source-selected');
      setSelectedSourceNode(node);
      console.log('NetworkGraph: Source node selected:', {
        nodeId: node.id(),
        timestamp: new Date().toISOString()
      });
    } else if (!selectedDestNode && node.id() !== selectedSourceNode.id()) {
      node.addClass('dest-selected');
      setSelectedDestNode(node);
      console.log('NetworkGraph: Destination node selected:', {
        nodeId: node.id(),
        sourceId: selectedSourceNode.id(),
        timestamp: new Date().toISOString()
      });
    }
  };

  // Path Calculation mode click handler
  // Update the click handler in your useEffect
  useEffect(() => {
    if (!cyRef.current) return;

    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      
      console.log('NetworkGraph: Node clicked:', {
        nodeId: node.id(),
        mode: viewMode,
        timestamp: new Date().toISOString()
      });

      if (viewMode === 'path-calculation') {
        handleNodeSelection(node);
      } else {
        // Your existing topology mode click handling
        const nodeData = node.data();
        console.log('NetworkGraph: Node data:', {
          nodeId: node.id(),
          sids: nodeData.sids,
          timestamp: new Date().toISOString()
        });
      }
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.removeAllListeners();
      }
    };
  }, [viewMode, handleNodeSelection]); // Add handleNodeSelection to dependencies

  // Update the constraint dropdown handler
  <select
    style={{
      width: '200px',
      padding: '6px 12px',
      fontFamily: 'Consolas, monospace',
      marginTop: '5px'
    }}
    defaultValue=""
    onChange={(e) => {
      const constraint = e.target.value;
      console.log('NetworkGraph: Constraint selected:', {
        constraint,
        sourceNode: selectedSourceNode?.id(),
        destNode: selectedDestNode?.id(),
        timestamp: new Date().toISOString()
      });
      
      if (selectedSourceNode && selectedDestNode) {
        handlePathCalculation(
          selectedSourceNode.id(),
          selectedDestNode.id(),
          constraint
        );
      } else {
        console.log('NetworkGraph: Waiting for node selections:', {
          hasSource: !!selectedSourceNode,
          hasDestination: !!selectedDestNode,
          timestamp: new Date().toISOString()
        });
      }
    }}
  >
    <option value="">Select a constraint...</option>
    <option value="shortest">Shortest Path</option>
    <option value="latency">Low Latency</option>
    <option value="utilization">Least Utilized</option>
    <option value="scheduled">Lowest Scheduled Load</option>
  </select>

  /**
   * Handles path calculation between source and destination nodes
   * @param {string} source - ID of the source node
   * @param {string} destination - ID of the destination node
   * @param {string} constraint - Type of path constraint (shortest, latency, etc.)
   * 
   * Process:
   * 1. Makes API call to get path data
   * 2. Highlights nodes and edges in the returned path
   * 3. Handles different node types (ls_prefix, igp_node, bgp_node)
   */
  const handlePathCalculation = async (source, destination, constraint) => {
    try {
      const response = await fetchPath(collection, source, destination, constraint);
      
      if (response.found && response.path) {
        let lastFoundNode = null;
        const pathNodes = [];
        const pathEdges = [];

        // Process each hop in the path
        response.path.forEach((hop, index) => {
          const vertex = hop.vertex;
          const edge = hop.edge;
          const nodeId = vertex._id;

          // Keep this log - useful for debugging path traversal
          console.log('NetworkGraph: Processing hop:', {
            index,
            nodeId,
            timestamp: new Date().toISOString()
          });

          // Find node in graph
          const currentNode = cyRef.current.$(`node[id = "${nodeId}"]`);
          
          if (currentNode.length) {
            pathNodes.push(currentNode);
            
            // If we have a previous node and an edge, find the edge
            if (lastFoundNode && edge) {
              const edgeId = edge._id;
              const allEdges = cyRef.current.edges();
              
              // Try to find edge by ID
              let pathEdge = cyRef.current.edges(`[id = "${edgeId}"]`);
              
              if (pathEdge.length) {
                pathEdges.push(pathEdge[0]);
              } else {
                // Try source/target lookup as fallback
                pathEdge = cyRef.current.edges(`[source = "${edge._from}"][target = "${edge._to}"]`);
                if (!pathEdge.length) {
                  pathEdge = cyRef.current.edges(`[source = "${edge._to}"][target = "${edge._from}"]`);
                }
                if (pathEdge.length) {
                  pathEdges.push(pathEdge);
                }
              }
            }
            
            lastFoundNode = currentNode;
          } else {
            // Keep this log - important for debugging missing nodes
            console.log('NetworkGraph: Node not found:', {
              nodeId,
              timestamp: new Date().toISOString()
            });
          }
        });

        // Highlight the path
        cyRef.current.elements().removeClass('selected');
        
        // Highlight nodes
        pathNodes.forEach(node => node.addClass('selected'));
        
        // Highlight edges between consecutive nodes
        for (let i = 0; i < pathNodes.length - 1; i++) {
          const edge = cyRef.current.edges().filter(edge => 
            (edge.source().id() === pathNodes[i].id() && edge.target().id() === pathNodes[i + 1].id()) ||
            (edge.target().id() === pathNodes[i].id() && edge.source().id() === pathNodes[i + 1].id())
          );
          edge.addClass('selected');
        }

        // Keep this final summary log
        console.log('NetworkGraph: Path summary:', {
          totalHops: response.hopcount,
          foundNodes: pathNodes.length,
          foundEdges: pathEdges.length,
          nodeIds: pathNodes.map(n => n.id()),
          timestamp: new Date().toISOString()
        });

        // After highlighting the path, show the tooltip
        const pathInfo = response.path.map(hop => hop.vertex.prefix).filter(Boolean);
        
        // Create tooltip content
        const tooltipContent = document.createElement('div');
        tooltipContent.className = 'path-tooltip';
        tooltipContent.innerHTML = `
          <div style="
            background: white;
            border: 1px solid #ccc;
            padding: 6px 12px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            width: 300px;
            margin-top: 30px;
            font-family: Consolas, monospace;
          ">
            <h4 style="margin: 8px 0; font-size: 14px;">SRv6 Information</h4>
            <div style="font-size: 12px; background: #f5f5f5; padding: 8px; border-radius: 4px;">
              <div style="margin-bottom: 8px;">
                <strong>SID List:</strong>
                ${response.srv6_data.srv6_sid_list.map(sid => `
                  <div style="margin-left: 12px;">${sid}</div>
                `).join('')}
              </div>
              <div>
                <strong>uSID:</strong>
                <div style="margin-left: 12px; word-break: break-all;">${response.srv6_data.srv6_usid}</div>
              </div>
            </div>
          </div>
        `;

        // Position tooltip below the dropdown with extra space
        const dropdown = document.querySelector('select');
        if (dropdown) {
          const dropdownRect = dropdown.getBoundingClientRect();
          tooltipContent.style.position = 'absolute';
          tooltipContent.style.left = `${dropdownRect.left}px`;
          tooltipContent.style.top = `${dropdownRect.bottom + window.scrollY + 35}px`;
          tooltipContent.style.zIndex = '10';
          
          // Remove any existing tooltips
          const existingTooltip = document.querySelector('.path-tooltip');
          if (existingTooltip) {
            existingTooltip.remove();
          }
          
          document.body.appendChild(tooltipContent);
        }
      }
    } catch (error) {
      console.error('NetworkGraph: Path calculation error:', error);
    }
  };

  const getNodeId = (vertex) => {
    return vertex._key;
  };

  // Helper function to validate ID consistency
  const validateNodeId = (id, vertex) => {
    const generatedId = getNodeId(vertex);
    if (id !== generatedId) {
      console.warn('NetworkGraph: ID mismatch:', {
        provided: id,
        generated: generatedId,
        vertex,
        timestamp: new Date().toISOString()
      });
    }
    return generatedId;
  };

  // UI Controls for View Mode Selection and Path Calculation
  // - Allows switching between Full Topology and Nodes Only views
  // - Shows path calculation controls when in path-calculation mode
  // - Includes constraint selection for path calculation
  return (
    <div className="network-graph" style={{ width: '100%', height: '800px', position: 'relative' }}>
      <div style={{ 
        padding: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
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
          style={{
            width: '180px',
            padding: '6px 9px',
            fontFamily: 'Consolas, monospace'
          }}
        >
          <option value="concentric">Concentric</option>
          <option value="circle">Circle</option>
          <option value="clos">CLOS</option>
          <option value="tiered">Tiered</option>
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
          style={{
            width: '170px',
            padding: '6px 12px',
            fontFamily: 'Consolas, monospace'
          }}
        >
          <option value="full">Full Topology</option>
          <option value="nodes">Nodes Only</option>
        </select>

        {viewMode === 'path-calculation' && (
          <div style={{
            backgroundColor: '#0d7ca1',
            color: 'white',
            borderRadius: '4px',
            padding: '6px 9px',
            fontFamily: 'Consolas, monospace',
            lineHeight: '1.4',
            width: '650px',
            //flexGrow: 1  // Take remaining space
          }}>
            Please select a source then destination node, then select a constraint
          </div>
        )}
      </div>

      {viewMode === 'path-calculation' && (
        <div style={{ 
          padding: '0 5px',
          marginBottom: '5px'
        }}>
          <select
            style={{
              width: '200px',
              padding: '6px 12px',
              fontFamily: 'Consolas, monospace',
              marginTop: '5px'
            }}
            defaultValue=""
            onChange={(e) => {
              const constraint = e.target.value;
              console.log('NetworkGraph: Constraint selected:', {
                constraint,
                sourceNode: selectedSourceNode?.id(),
                destNode: selectedDestNode?.id(),
                timestamp: new Date().toISOString()
              });
              
              if (selectedSourceNode && selectedDestNode) {
                handlePathCalculation(
                  selectedSourceNode.id(),
                  selectedDestNode.id(),
                  constraint
                );
              } else {
                console.log('NetworkGraph: Waiting for node selections:', {
                  hasSource: !!selectedSourceNode,
                  hasDestination: !!selectedDestNode,
                  timestamp: new Date().toISOString()
                });
              }
            }}
          >
            <option value="">Select a constraint...</option>
            <option value="shortest">Shortest Path</option>
            <option value="latency">Low Latency</option>
            <option value="utilization">Least Utilized</option>
            <option value="scheduled">Lowest Scheduled Load</option>
          </select>
        </div>
      )}

      <CytoscapeComponent
        cy={(cy) => { 
          cyRef.current = cy;
        }}
        elements={graphData || []}
        style={{ 
          width: '100%', 
          height: '100%',
          marginTop: '5px'
        }}
        stylesheet={style}
        userZoomingEnabled={true}
        userPanningEnabled={true}
      />
      <Legend />
    </div>
  );
};

export default NetworkGraph; 