import { api } from './api';

export const pathCalcService = {
  // Calculate path between two nodes
  calculatePath: async (collection, source, destination, constraint, excludedCountries = []) => {
    try {
      const endpoint = getEndpointForConstraint(constraint);
      let url = `/graphs/${collection}/${endpoint}?source=${source}&destination=${destination}&direction=outbound`;
      
      // Add excluded countries if present
      if (constraint === 'sovereignty' && excludedCountries.length > 0) {
        url += `&excluded_countries=${excludedCountries.join(',')}`;
      }
      
      console.log('Calculating path:', {
        url,
        collection,
        source,
        destination,
        constraint,
        excludedCountries,
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
        pathDetails: response.data.path,
        loadData: response.data.load_data,
        average_load: response.data.load_data?.average_load
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
  },

  // Highlight workload paths in graph
  highlightWorkloadPaths: (cy, paths) => {
    if (!cy || !paths) return;
    
    // Don't clear existing highlights, just add new ones
    // cy.elements().removeClass('workload-path');
    
    // Process each path
    paths.forEach(pathData => {
      if (!pathData.path) return;
      
      // Highlight nodes
      pathData.path.forEach(nodeId => {
        const node = cy.getElementById(nodeId);
        if (node) {
          node.addClass('workload-path');
        }
      });
      
      // Highlight edges between consecutive nodes with load-based coloring
      for (let i = 0; i < pathData.path.length - 1; i++) {
        const edge = cy.edges().filter(edge => 
          (edge.source().id() === pathData.path[i] && edge.target().id() === pathData.path[i + 1]) ||
          (edge.target().id() === pathData.path[i] && edge.source().id() === pathData.path[i + 1])
        );
        
        if (edge.length) {
          // Get the load value for this edge
          const loadValue = edge.data('load') || 0;
          
          // Apply appropriate class based on load
          if (loadValue > 70) {
            edge.addClass('critical-load');
          } else if (loadValue > 40) {
            edge.addClass('high-load');
          } else {
            edge.addClass('workload-path');
          }
        }
      }
    });
  }
};

// Helper function to determine API endpoint
const getEndpointForConstraint = (constraint) => {
  switch (constraint) {
    case 'latency':
      return 'shortest_path/latency';
    case 'utilization':
      return 'shortest_path/utilization';
    case 'sovereignty':
      return 'shortest_path/sovereignty';
    case 'workload':
    case 'load':
      return 'shortest_path/load';
    default:
      return 'shortest_path';
  }
};