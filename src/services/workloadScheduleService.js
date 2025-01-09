import { pathCalcService } from './pathCalcService';

export const workloadScheduleService = {
  // Calculate paths between multiple workload nodes
  calculateWorkloadPaths: async (collection, selectedNodes) => {
    if (selectedNodes.length < 2) {
      console.log('Not enough nodes selected');
      return [];
    }

    const pathResults = [];
    const errors = [];

    // Calculate paths between each pair
    for (let i = 0; i < selectedNodes.length; i++) {
      for (let j = i + 1; j < selectedNodes.length; j++) {
        try {
          const response = await pathCalcService.calculatePath(
            collection,
            selectedNodes[i].id(),
            selectedNodes[j].id(),
            'scheduled'
          );

          if (response.found) {
            pathResults.push({
              source: selectedNodes[i].id(),
              destination: selectedNodes[j].id(),
              path: response.path,
              srv6Data: response.srv6_data
            });
          }
        } catch (error) {
          errors.push({ 
            source: selectedNodes[i].id(), 
            destination: selectedNodes[j].id(), 
            error 
          });
        }
      }
    }

    return { pathResults, errors };
  },

  // Highlight workload paths in graph
  highlightWorkloadPaths: (cy, pathResults) => {
    cy.elements().removeClass('workload-path');
    
    pathResults.forEach(result => {
      result.path.forEach((hop, index) => {
        const nodeId = hop.vertex._id;
        const currentNode = cy.$(`node[id = "${nodeId}"]`);
        
        if (currentNode.length) {
          currentNode.addClass('workload-path');

          if (index < result.path.length - 1) {
            const nextHop = result.path[index + 1];
            const nextNodeId = nextHop.vertex._id;
            const edge = cy.edges().filter(edge => 
              (edge.source().id() === nodeId && edge.target().id() === nextNodeId) ||
              (edge.target().id() === nodeId && edge.source().id() === nextNodeId)
            );
            edge.addClass('workload-path');
          }
        }
      });
    });
  }
};