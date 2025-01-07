// State management for workloads
let workloadCounter = 1;
const activeWorkloads = new Map();

export const workloadManager = {
  // Start a new workload
  startWorkload: (nodes, paths) => {
    const newWorkload = {
      id: workloadCounter,
      timestamp: new Date().toISOString(),
      nodes: nodes,
      paths: paths,
      status: 'active'
    };

    activeWorkloads.set(workloadCounter, newWorkload);
    workloadCounter++;

    console.log('WorkloadManager: Started new workload:', {
      workload: newWorkload,
      totalActive: activeWorkloads.size,
      timestamp: new Date().toISOString()
    });

    return newWorkload;
  },

  // Stop a workload
  stopWorkload: (workloadId) => {
    const workload = activeWorkloads.get(workloadId);
    if (workload) {
      activeWorkloads.delete(workloadId);
      console.log('WorkloadManager: Stopped workload:', {
        workloadId,
        remainingWorkloads: activeWorkloads.size,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    return false;
  },

  // Get all active workloads
  getActiveWorkloads: () => {
    return Array.from(activeWorkloads.values());
  },

  // Get a specific workload
  getWorkload: (workloadId) => {
    return activeWorkloads.get(workloadId);
  }
}; 