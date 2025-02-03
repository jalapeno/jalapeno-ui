import { api } from './api';

export const pathCalcService = {
  // Calculate path between two nodes
  calculatePath: async (collection, source, destination, constraint) => {
    try {
      const endpoint = getEndpointForConstraint(constraint);
      const url = `/graphs/${collection}/${endpoint}?source=${source}&destination=${destination}&direction=outbound`;
      
      console.log('Calculating path:', {
        url,
        collection,
        source,
        destination,
        constraint,
        timestamp: new Date().toISOString()
      });
      
      const response = await api.get(url);
      
      // Extract path nodes and SRv6 data
      const pathNodes = response.data.path.map(item => item.vertex._id);
      const srv6Data = response.data.srv6_data;
      
      return {
        nodes: pathNodes,
        srv6Data: {
          sidList: srv6Data.srv6_sid_list,
          usid: srv6Data.srv6_usid
        },
        pathDetails: response.data.path
      };
    } catch (error) {
      console.error('Path calculation failed:', error);
      throw error;
    }
  },

  // Highlight path in graph
  highlightPath: (cy, pathNodes) => {
    cy.elements().removeClass('selected');
    
    // Highlight nodes
    pathNodes.forEach(nodeId => {
      const node = cy.getElementById(nodeId);
      if (node) {
        node.addClass('selected');
      }
    });
    
    // Highlight edges between consecutive nodes
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const edge = cy.edges().filter(edge => 
        (edge.source().id() === pathNodes[i] && edge.target().id() === pathNodes[i + 1]) ||
        (edge.target().id() === pathNodes[i] && edge.source().id() === pathNodes[i + 1])
      );
      edge.addClass('selected');
    }
  }
};

// Helper function to determine API endpoint
const getEndpointForConstraint = (constraint) => {
  switch (constraint) {
    case 'latency':
      return 'shortest_path/latency';
    case 'utilization':
      return 'shortest_path/utilization';  // We'll implement this next
    case 'sovereignty':
      return 'shortest_path';  // Temporary, until we implement data sovereignty
    default:
      return 'shortest_path';
  }
};