import { pathCalcService } from './pathCalcService';
import { api } from './api';

export const workloadService = {
  // Start a new workload
  startWorkload: async (collection, selectedNodes) => {
    try {
      const pathResults = [];
      const errors = [];

      // Calculate paths between each pair of nodes
      for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = i + 1; j < selectedNodes.length; j++) {
          try {
            const source = selectedNodes[i].id();
            const destination = selectedNodes[j].id();
            
            // Make API call for this pair
            const response = await api.get(
              `/graphs/${collection}/shortest_path/load?source=${source}&destination=${destination}&direction=any`
            );

            if (response.data.found) {
              pathResults.push({
                source,
                destination,
                path: response.data.path,
                hopcount: response.data.hopcount,
                vertex_count: response.data.vertex_count,
                srv6Data: response.data.srv6_data,
                loadData: response.data.load_data
              });
            }
          } catch (error) {
            errors.push({
              source: selectedNodes[i].id(),
              destination: selectedNodes[j].id(),
              error: error.message
            });
          }
        }
      }

      if (errors.length > 0) {
        console.error('WorkloadService: Some path calculations failed:', errors);
        throw new Error('Failed to calculate paths for some node pairs');
      }

      // Return the path results directly
      return {
        id: Date.now(), // Use timestamp as a unique ID
        nodes: selectedNodes.map(node => ({
          id: node.id(),
          type: node.data('type'),
          label: node.data('label')
        })),
        paths: pathResults
      };
    } catch (error) {
      console.error('WorkloadService: Failed to start workload:', error);
      throw error;
    }
  },

  // Stop a workload
  stopWorkload: async (workloadId) => {
    // No API call needed since we're just clearing local state
    console.log('WorkloadService: Stopped workload:', {
      workloadId,
      timestamp: new Date().toISOString()
    });
    return true;
  },

  // Get workload status
  getWorkloadStatus: async (workloadId) => {
    // No API call needed since we're just managing local state
    return {
      id: workloadId,
      status: 'stopped'
    };
  }
}; 