import { api } from './api';
import { pathCalcService } from './pathCalcService';

export const workloadService = {
  calculatePaths: async (collection, nodes) => {
    console.log('Starting path calculation:', {
      collection,
      nodeCount: nodes.length,
      nodeIds: nodes.map(n => n.id()),
      timestamp: new Date().toISOString()
    });

    const results = [];
    
    // Calculate paths between each pair of selected nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const source = nodes[i];
        const dest = nodes[j];
        
        try {
          // Use pathCalcService to calculate the path
          const result = await pathCalcService.calculatePath(
            collection,
            source.id(),
            dest.id(),
            'workload'  // Use workload as the constraint type
          );

          if (result) {
            results.push({
              source: source.id(),
              destination: dest.id(),
              path: result.nodes,
              srv6Data: result.srv6Data,
              pathDetails: result.pathDetails
            });
          }
        } catch (error) {
          console.error('Path calculation failed:', {
            source: source.id(),
            destination: dest.id(),
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          results.push({
            source: source.id(),
            destination: dest.id(),
            error: error.message
          });
        }
      }
    }

    console.log('Final results:', {
      resultCount: results.length,
      results,
      timestamp: new Date().toISOString()
    });

    return results;
  }
}; 