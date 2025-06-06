// First, add the tier levels configuration
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

// Helper functions for the clos layout
const closHelpers = {
  getNodeNumber: (node) => {
    const str = node.data('name') || node.id();
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) : Infinity;
  },

  getLabelWidth: (() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '14px Tahoma';
    
    return (node) => {
      const label = node.data('label');
      return context.measureText(label).width + 40;
    };
  })(),

  positionDcPrefix: (node, tier0Pos, parentIndex, siblingPrefixes, prefixIndex) => {
    // Validate and clone input position to prevent mutations
    const parentPos = {
      x: tier0Pos ? Number(tier0Pos.x) : 0,
      y: tier0Pos ? Number(tier0Pos.y) : 0
    };

    console.log('Starting position calculation:', {
      nodeId: node.id(),
      originalTier0Pos: tier0Pos,
      clonedParentPos: parentPos,
      parentIndex,
      prefixIndex
    });

    if (!parentPos.x && parentPos.x !== 0) {
      console.error('Invalid parent x position:', tier0Pos);
      return null;
    }
    if (!parentPos.y && parentPos.y !== 0) {
      console.error('Invalid parent y position:', tier0Pos);
      return null;
    }

    const xSpacing = 70;
    const ySpacing = 250;
    
    // Calculate x position with explicit steps
    const centeringOffset = ((siblingPrefixes.length - 1) / 2);
    const relativeOffset = prefixIndex - centeringOffset;
    const xOffset = relativeOffset * xSpacing;
    const x = parentPos.x + xOffset;
    
    // Calculate y position
    const y = parentPos.y + ySpacing;

    console.log('Position calculation details:', {
      nodeId: node.id(),
      parentPos,
      centeringOffset,
      relativeOffset,
      xOffset,
      final: { x, y }
    });

    return { x, y };
  },

  positionGpu: (node, sortedGpuNodes, nodeIndex) => {
    const groupSize = 6;
    const groupIndex = Math.floor(nodeIndex / groupSize);
    const positionInGroup = nodeIndex % groupSize;
    
    const groupStart = groupIndex * groupSize;
    const groupEnd = Math.min(groupStart + groupSize, sortedGpuNodes.length);
    const nodesInGroup = sortedGpuNodes.slice(groupStart, groupEnd);
    
    const maxLabelWidth = Math.max(...nodesInGroup.map(closHelpers.getLabelWidth));
    const xSpacing = Math.max(70, maxLabelWidth);
    const groupXSpacing = 360;
    const gpuTierOffset = 80;
    
    const totalGroups = Math.ceil(sortedGpuNodes.length / groupSize);
    const totalWidth = (totalGroups - 1) * groupXSpacing;
    const centerOffset = -totalWidth / 2;
    
    return {
      x: centerOffset + (groupIndex * groupXSpacing) + (positionInGroup * xSpacing) - ((nodesInGroup.length * xSpacing) / 2),
      y: (tierLevels[node.data('tier')] * 150) + (groupIndex * 80) + gpuTierOffset
    };
  },

  getPrefixType: (node) => {
    const id = node.id();
    if (id.includes('inet_prefix')) return 'inet_prefix';
    if (id.includes('ebgp_prefix')) return 'ebgp_prefix';
    return null;
  },

  positionPrefix: (node) => {
    const connectedTierNode = node.connectedEdges()
      .connectedNodes()
      .filter(n => n.data('tier') && n.data('tier').includes('tier'))
      .first();

    if (connectedTierNode.length > 0) {
      const tierPos = connectedTierNode.position();
      const siblingPrefixes = connectedTierNode
        .connectedEdges()
        .connectedNodes()
        .filter(n => n.id().includes('prefix'));

      const prefixIndex = Array.from(siblingPrefixes).findIndex(n => n.id() === node.id());
      const xSpacing = 70;
      const xOffset = (prefixIndex - (siblingPrefixes.length - 1) / 2) * xSpacing;

      return {
        x: tierPos.x + xOffset,
        y: tierPos.y + 150  // Position prefixes below their connected tier node
      };
    }
    return null;
  },

  positionWorkload: (node) => {
    const connectedPrefix = node.connectedEdges()
      .connectedNodes()
      .filter(n => n.id().includes('prefix'))
      .first();

    if (connectedPrefix.length > 0) {
      const prefixPos = connectedPrefix.position();
      const siblingWorkloads = connectedPrefix
        .connectedEdges()
        .connectedNodes()
        .filter(n => n.id().includes('gpus/') || n.id().includes('hosts/'));

      // Sort workloads by number for consistent positioning
      const sortedSiblings = Array.from(siblingWorkloads).sort((a, b) => 
        closHelpers.getNodeNumber(a) - closHelpers.getNodeNumber(b)
      );

      const workloadIndex = sortedSiblings.findIndex(n => n.id() === node.id());
      const xSpacing = Math.max(70, closHelpers.getLabelWidth(node));
      const xOffset = (workloadIndex - (sortedSiblings.length - 1) / 2) * xSpacing;

      return {
        x: prefixPos.x + xOffset,
        y: prefixPos.y + 150  // Position workloads below their connected prefix
      };
    }
    return null;
  }
};

export const layouts = {
  cose: {
    name: 'cose',
    animate: false,
    nodeOverlap: 20,
    refresh: 20,
    fit: true,
    padding: 80,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: 800000,
    edgeElasticity: 200,
    gravity: 0.7,
  },
  
  concentric: {
    name: 'preset',
    positions: function(node) {
      const cy = node.cy();
      
      // Use more modern filtering approach
      const nodeTypes = {
        workload: n => n.data('id').includes('gpus/') || n.data('id').includes('hosts/'),
        prefix: n => n.data('id').includes('prefix'),
        igp: n => n.data('id').includes('igp_node'),
        bgp: n => n.data('id').includes('bgp_node')
      };
      
      // Get node collections
      const collections = Object.entries(nodeTypes).reduce((acc, [type, filter]) => ({
        ...acc,
        [type]: cy.nodes().filter(filter)
      }), {});
      
      const hasIgp = collections.igp.length > 0;
      
      // Radii configuration
      const radii = hasIgp ? {
        igp: 350,
        bgp: 500,
        prefix: 700,
        workload: 850
      } : {
        bgp: 450,
        prefix: 650,
        workload: 850
      };

      // Helper function for angle calculations
      const getPosition = (index, total, radius) => ({
        x: Math.cos((2 * Math.PI * index) / total) * radius,
        y: Math.sin((2 * Math.PI * index) / total) * radius
      });

      // Determine node type
      const nodeType = Object.keys(nodeTypes).find(type => nodeTypes[type](node));
      
      switch(nodeType) {
        case 'workload': {
          const connectedPrefix = node.neighborhood('node').first();
          if (!connectedPrefix) return null;
          
          const connectedWorkloads = connectedPrefix.neighborhood('node').filter(nodeTypes.workload);
          const localIndex = Array.from(connectedWorkloads).findIndex(n => n.id() === node.id());
          const prefixIndex = Array.from(collections.prefix).findIndex(n => n.id() === connectedPrefix.id());
          
          const prefixAngle = (2 * Math.PI * prefixIndex) / collections.prefix.length;
          const offsetRange = Math.PI / 8;
          const offset = connectedWorkloads.length > 1 
            ? (localIndex - (connectedWorkloads.length - 1) / 2) * (offsetRange / connectedWorkloads.length) 
            : 0;
            
          return {
            x: Math.cos(prefixAngle + offset) * radii.workload,
            y: Math.sin(prefixAngle + offset) * radii.workload
          };
        }
        
        case 'prefix': {
          const index = Array.from(collections.prefix).findIndex(n => n.id() === node.id());
          return getPosition(index, collections.prefix.length, radii.prefix);
        }
        
        case 'bgp': {
          const index = Array.from(collections.bgp).findIndex(n => n.id() === node.id());
          const total = collections.bgp.length;
          
          if (!hasIgp && total > 12) {
            const innerCount = Math.floor(total / 2);
            const isInnerCircle = index < innerCount;
            return getPosition(
              isInnerCircle ? index : index - innerCount,
              isInnerCircle ? innerCount : total - innerCount,
              isInnerCircle ? radii.bgp * 0.6 : radii.bgp
            );
          }
          
          return getPosition(index, total, radii.bgp);
        }
        
        case 'igp': {
          if (!hasIgp) return null;
          const index = Array.from(collections.igp).findIndex(n => n.id() === node.id());
          return getPosition(index, collections.igp.length, radii.igp);
        }
        
        default:
          return null;
      }
    },
    animate: true,
    animationDuration: 500,
    padding: 50,
    fit: true
  },
  
  circle: {
    name: 'circle',
    fit: true,
    padding: 50,
    radius: 400,  // Fixed radius for all nodes
    animate: true,
    animationDuration: 500,
    spacingFactor: 1.5,  // More space between nodes
    nodeDimensionsIncludeLabels: false,  // Don't factor in label size
    startAngle: 3 / 2 * Math.PI,  // Start from the top (12 o'clock position)
    sweep: undefined,  // undefined = full 360 degrees
    clockwise: true,
    sort: function(a, b) {  // Optional: sort nodes by type
      const types = ['igp_node', 'bgp_node', 'prefix', 'gpus', 'hosts'];
      const getTypeIndex = (node) => {
        const id = node.data('id');
        return types.findIndex(type => id.includes(type));
      };
      return getTypeIndex(a) - getTypeIndex(b);
    }
  },
  
  // Placeholder for additional layouts
  // grid: { ... },
  // breadthfirst: { ... },
  // circle: { ... }

  clos: {
    name: 'preset',
    positions: function(node) {
      // Filter out /48 prefixes early
      if (node.id().includes('_48')) {
        node.style('display', 'none');
        return false;
      }

      const cy = node.cy();
      const nodeId = node.id();
      
      // Helper function to get connected node types and their tiers
      const getConnectedNodeInfo = (node) => {
        const connectedNodes = node.neighborhood('node');
        return Array.from(connectedNodes.map(n => {
          const id = n.id();
          if (id.includes('hosts/') || id.includes('gpus/')) return { type: 'endpoint', tier: 0 };
          if (id.includes('prefix')) return { type: 'prefix', tier: -1 };
          return { type: 'switch', tier: null }; // Will be determined later
        }));
      };

      // Helper function to determine node tier
      const determineNodeTier = (node, visited = new Set()) => {
        if (visited.has(node.id())) return null;
        visited.add(node.id());

        const connectedInfo = getConnectedNodeInfo(node);
        const connectedTypes = connectedInfo.map(info => info.type);
        
        // Endpoints only connect to one type (leaf switches)
        if (connectedTypes.length === 1 && connectedTypes[0] === 'switch') {
          return 0; // Endpoints are tier 0
        }
        
        // Leaf switches connect to both endpoints and spine switches
        if (connectedTypes.includes('endpoint') && connectedTypes.includes('switch')) {
          return 1; // Leaf switches are tier 1
        }
        
        // For other switches, determine tier based on connected switch tiers
        if (connectedTypes.every(type => type === 'switch')) {
          const connectedSwitches = node.neighborhood('node')
            .filter(n => !n.id().includes('hosts/') && !n.id().includes('gpus/') && !n.id().includes('prefix'));
          
          // Get the highest tier of connected switches
          const connectedTiers = connectedSwitches.map(sw => {
            const tier = determineNodeTier(sw, visited);
            return tier !== null ? tier : -1;
          });
          
          const maxConnectedTier = Math.max(...connectedTiers);
          return maxConnectedTier + 1; // This switch is one tier above its highest connected switch
        }
        
        return null;
      };

      // Get all nodes and determine their tiers
      const allNodes = cy.nodes().filter(n => !n.id().includes('_48'));
      const nodeTiers = new Map();
      
      allNodes.forEach(n => {
        nodeTiers.set(n.id(), determineNodeTier(n));
      });

      // Group nodes by tier
      const tierGroups = {};
      allNodes.forEach(n => {
        const tier = nodeTiers.get(n.id());
        if (tier !== null) {
          if (!tierGroups[tier]) tierGroups[tier] = [];
          tierGroups[tier].push(n);
        }
      });

      // Sort tiers in ascending order
      const sortedTiers = Object.keys(tierGroups).sort((a, b) => Number(a) - Number(b));

      // Get container dimensions
      const container = cy.container();
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const aspectRatio = containerWidth / containerHeight;

      // Calculate spacing based on container dimensions
      const totalWidth = containerWidth * 0.6;  // Use 50% of container width
      const totalHeight = containerHeight * 0.5; // Use 50% of container height
      
      // Calculate minimum spacing between tiers
      const minVerticalSpacing = 100; // Minimum pixels between tiers
      const maxVerticalSpacing = 250; // Maximum pixels between tiers
      
      // Calculate vertical spacing based on number of tiers
      const numTiers = sortedTiers.length;
      const rawVerticalSpacing = totalHeight / (numTiers - 1);
      const verticalSpacing = Math.min(
        maxVerticalSpacing,
        Math.max(minVerticalSpacing, rawVerticalSpacing)
      );
      
      // Adjust total height if needed to accommodate minimum spacing
      const adjustedTotalHeight = verticalSpacing * (numTiers - 1);
      
      // Adjust horizontal spacing
      const xSpacing = Math.min(180, totalWidth / (Math.max(...Object.values(tierGroups).map(nodes => nodes.length))));

      // Position nodes based on their tier
      const tier = nodeTiers.get(nodeId);
      if (tier === null) return null;

      const tierIndex = sortedTiers.indexOf(tier.toString());
      const yPosition = (sortedTiers.length - 1 - tierIndex) * verticalSpacing;

      // Sort nodes within their tier by their numeric value
      const tierNodes = tierGroups[tier];
      const sortedTierNodes = Array.from(tierNodes).sort((a, b) => 
        closHelpers.getNodeNumber(a) - closHelpers.getNodeNumber(b)
      );
      
      const nodeIndex = sortedTierNodes.indexOf(node);
      const xOffset = (tierNodes.length * xSpacing) / -2;
      const xPosition = xOffset + (nodeIndex * xSpacing);
      
      // Add debug logging for the first node
      if (nodeId === allNodes[0].id()) {
        console.log('CLOS Layout: Container analysis:', {
          containerWidth,
          containerHeight,
          aspectRatio,
          totalWidth,
          totalHeight,
          xSpacing,
          verticalSpacing,
          timestamp: new Date().toISOString()
        });
      }
      
      return { x: xPosition, y: yPosition };
    },
    animate: true,
    animationDuration: 500,
    padding: 100,  // Increase padding from 50 to 100
    fit: true
  },

  polarfly: {
    name: 'preset',
    positions: function(node) {
      const cy = node.cy();
      
      // Add styling for Polarfly nodes and edges
      cy.style()
        .selector('node[category = "W"]')
        .style({
          'background-color': '#CC4A04',
          'width': '27px',
          'height': '27px'
        })
        .selector('node[category = "V1c"], node[category = "V1n"]')
        .style({
          'background-color': '#49b019',
          'width': '27px',
          'height': '27px'
        })
        .selector('node[category = "V2"]')
        .style({
          'background-color': '#0d7ca1',
          'width': '27px',
          'height': '27px'
        })
        .selector('edge')
        .style({
          'width': '1px',  // Thinner edge lines
          'line-color': '#1a365d',
          'opacity': 0.6   // Slightly transparent to reduce visual clutter
        })
        .update();
      
      // Get all nodes by category
      const wNodes = cy.nodes().filter(n => n.data('category') === 'W');
      const v1cNodes = cy.nodes().filter(n => n.data('category') === 'V1c');
      const v1nNodes = cy.nodes().filter(n => n.data('category') === 'V1n');
      const v2Nodes = cy.nodes().filter(n => n.data('category') === 'V2');
      
      // Configuration for ellipses
      const config = {
        wEllipse: { a: 200, b: 60, y: -400 },     // Reduced from 400,200 to 200,100
        v1cEllipse: { a: 200, b: 60, y: 0 },      // Middle inner ellipse unchanged
        v1nEllipse: { a: 600, b: 150, y: 0 },      // Middle outer ellipse unchanged
        v2Ellipse: { a: 600, b: 150, y: 500 }      // Bottom ellipse unchanged
      };

      // Helper function to position nodes along an ellipse
      const positionOnEllipse = (nodeIndex, totalNodes, ellipse) => {
        const angle = (2 * Math.PI * nodeIndex) / totalNodes;
        return {
          x: ellipse.a * Math.cos(angle),
          y: ellipse.y + (ellipse.b * Math.sin(angle))
        };
      };

      // Position based on category
      const category = node.data('category');
      switch(category) {
        case 'W': {
          const index = Array.from(wNodes).findIndex(n => n.id() === node.id());
          return positionOnEllipse(index, wNodes.length, config.wEllipse);
        }
        case 'V1c': {
          const index = Array.from(v1cNodes).findIndex(n => n.id() === node.id());
          return positionOnEllipse(index, v1cNodes.length, config.v1cEllipse);
        }
        case 'V1n': {
          const index = Array.from(v1nNodes).findIndex(n => n.id() === node.id());
          return positionOnEllipse(index, v1nNodes.length, config.v1nEllipse);
        }
        case 'V2': {
          const index = Array.from(v2Nodes).findIndex(n => n.id() === node.id());
          return positionOnEllipse(index, v2Nodes.length, config.v2Ellipse);
        }
        default:
          return null;
      }
    },
    animate: true,
    animationDuration: 500,
    padding: 50,
    fit: true
  }
};

export const layoutNames = {
  cose: 'Default Layout',
  concentric: 'Concentric',
  circle: 'Circle',
  polarfly: 'Polarfly',
  //clos: 'Clos Topology'  // Keep commented out as in original
}; 