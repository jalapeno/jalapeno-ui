// import { api } from './api';

// export const pathCalcService = {
//   // Calculate path between two nodes
//   calculatePath: async (collection, source, destination, constraint) => {
//     try {
//       const endpoint = getEndpointForConstraint(constraint);
//       const url = `/graphs/${collection}/${endpoint}?source=${source}&destination=${destination}&direction=outbound`;
      
//       const response = await api.get(url);
//       return response.data;
//     } catch (error) {
//       console.error('Path calculation failed:', error);
//       throw error;
//     }
//   },

//   // Highlight path in graph
//   highlightPath: (cy, pathNodes, pathEdges) => {
//     cy.elements().removeClass('selected');
//     pathNodes.forEach(node => node.addClass('selected'));
    
//     // Highlight edges between consecutive nodes
//     for (let i = 0; i < pathNodes.length - 1; i++) {
//       const edge = cy.edges().filter(edge => 
//         (edge.source().id() === pathNodes[i].id() && edge.target().id() === pathNodes[i + 1].id()) ||
//         (edge.target().id() === pathNodes[i].id() && edge.source().id() === pathNodes[i + 1].id())
//       );
//       edge.addClass('selected');
//     }
//   }
// };

// // Helper function to determine API endpoint
// const getEndpointForConstraint = (constraint) => {
//   switch (constraint) {
//     case 'latency': return 'shortest_path/latency';
//     case 'utilization': return 'shortest_path/utilization';
//     case 'scheduled': return 'shortest_path/load';
//     default: return 'shortest_path';
//   }
// };