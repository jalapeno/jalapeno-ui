import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';
import { workloadManager } from '../services/workloadManager';
import { workloadService } from '../services/workloadService';

const Sidebar = ({ 
  onCollectionSelect, 
  onDataViewSelect, 
  onPathCalculationStart,
  onWorkloadModeStart,
  workloadPaths,
  selectedWorkloadNodes
}) => {
  const [graphCollections, setGraphCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDataView, setSelectedDataView] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showWorkloadList, setShowWorkloadList] = useState(false);
  const [activeWorkloads, setActiveWorkloads] = useState([]);
  const [expandedWorkload, setExpandedWorkload] = useState(null);
  const [showPathDetails, setShowPathDetails] = useState(null);

  const dataViewOptions = [
    { value: 'all', label: 'All Data Collections' },
    { value: 'true', label: 'Graph Collections' },
    { value: 'services', label: 'Services' },
    { value: 'hosts', label: 'Hosts' },
    { value: 'gpus', label: 'GPUs' }
  ];

  // Fetch graph collections when component mounts
  useEffect(() => {
    const loadGraphCollections = async () => {
      try {
        const response = await fetchCollections(true); // filter_graphs=true
        const edgeCollections = response.collections.filter(c => c.type === 'edge');
        setGraphCollections(edgeCollections);
        setError(null);
      } catch (err) {
        setError('Failed to load graph collections');
        console.error('Error loading graph collections:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGraphCollections();
  }, []);

  const handleDataViewSelect = async (value) => {
    let filterGraphs;
    
    switch(value) {
      case 'true':
        filterGraphs = true;
        break;
      case 'all':
        filterGraphs = null;
        break;
      case 'services':
        console.log('Sidebar: Inventory category selected:', {
          category: 'Services',
          type: 'service_inventory',
          status: 'pending_api_implementation',
          timestamp: new Date().toISOString()
        });
        return;
      case 'hosts':
        console.log('Sidebar: Inventory category selected:', {
          category: 'Hosts',
          type: 'host_inventory',
          status: 'pending_api_implementation',
          timestamp: new Date().toISOString()
        });
        return;
      case 'gpus':
        console.log('Sidebar: Inventory category selected:', {
          category: 'GPUs',
          type: 'gpu_inventory',
          status: 'pending_api_implementation',
          timestamp: new Date().toISOString()
        });
        return;
      default:
        filterGraphs = null;
    }
    
    onDataViewSelect?.(filterGraphs);
  };

  const handleGraphSelect = (graphName) => {
    setSelectedCollection(graphName);
    onCollectionSelect?.(graphName);
  };

  const handleToggle = (section) => {
    console.log('Sidebar: Section toggle:', {
      previousSection: expandedSection,
      newSection: expandedSection === section ? null : section,
      timestamp: new Date().toISOString()
    });
    
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Update local state from workload manager
  const refreshWorkloads = () => {
    setActiveWorkloads(workloadManager.getActiveWorkloads());
  };

  // Handle starting a new workload
  const handleStartWorkload = async () => {
    console.log('Sidebar: Starting workload with nodes:', {
      nodeCount: selectedWorkloadNodes?.length,
      timestamp: new Date().toISOString()
    });

    if (selectedWorkloadNodes && selectedWorkloadNodes.length >= 2) {
      try {
        // Start the workload using the service
        const result = await workloadService.startWorkload(selectedCollection, selectedWorkloadNodes);
        
        // Update local state with the new workload
        const workload = workloadManager.startWorkload(result.nodes, result.paths);
        refreshWorkloads();

        console.log('Sidebar: Workload started successfully:', {
          workloadId: result.id,
          nodeCount: selectedWorkloadNodes.length,
          pathCount: result.paths.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Sidebar: Failed to start workload:', error);
        // TODO: Show error message to user
      }
    }
  };

  // Handle stopping a workload
  const handleStopWorkload = (workloadId) => {
    workloadManager.stopWorkload(workloadId);
    refreshWorkloads();
  };

  useEffect(() => {
    console.log('Sidebar: Expanded workload changed:', {
      expandedWorkload,
      activeWorkloads,
      timestamp: new Date().toISOString()
    });
  }, [expandedWorkload, activeWorkloads]);

  // Render workload paths
  const renderWorkloadPaths = () => {
    if (!workloadPaths || workloadPaths.length === 0) return null;

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Workload Paths</h3>
        <div className="space-y-4">
          {workloadPaths.map((path, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  {path.source} → {path.destination}
                </span>
                <span className="text-xs text-gray-500">
                  {path.hopcount} hops
                </span>
              </div>
              
              {/* SRv6 SID Data */}
              {path.srv6Data && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">SRv6 SID List:</div>
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                    {path.srv6Data.srv6_sid_list.join(' → ')}
                  </div>
                  <div className="mt-1">
                    <div className="text-xs font-medium text-gray-600">uSID:</div>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      {path.srv6Data.srv6_usid}
                    </div>
                  </div>
                </div>
              )}

              {/* Load Data */}
              {path.loadData && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">Load Information:</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Average Load:</span>
                      <span className="font-medium">{path.loadData.average_load}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Total Load:</span>
                      <span className="font-medium">{path.loadData.total_load}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Highest Load:</span>
                      <span className="font-medium">
                        {path.loadData.highest_load.edge_key} ({path.loadData.highest_load.load_value}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Path Details */}
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-600 mb-1">Path Details:</div>
                <div className="space-y-1">
                  {path.path.map((step, stepIndex) => (
                    <div key={stepIndex} className="text-xs">
                      {step.vertex.name}
                      {step.edge && (
                        <span className="text-gray-500">
                          {' '}→{' '}
                          {step.edge.load !== null && (
                            <span className="text-blue-600">
                              (Load: {step.edge.load}%)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <button 
          className={`expand-button ${expandedSection === 'data' ? 'expanded' : ''}`}
          onClick={() => handleToggle('data')}
        >
          Data Collections
        </button>
        {expandedSection === 'data' && (
          <div className="section-content">
            {dataViewOptions.map(collection => (
              <button
                key={collection.value}
                onClick={() => {
                  console.log('Sidebar: Collection selected:', {
                    collection: collection.value,
                    timestamp: new Date().toISOString()
                  });
                  handleDataViewSelect(collection.value);
                }}
              >
                {collection.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <button 
          className={`expand-button ${expandedSection === 'graphs' ? 'expanded' : ''}`}
          onClick={() => handleToggle('graphs')}
        >
          Topology Viewer
        </button>
        {expandedSection === 'graphs' && (
          <div className="section-content">
            {isLoading ? (
              <div>Loading...</div>
            ) : error ? (
              <div>{error}</div>
            ) : (
              graphCollections.map(graph => (
                <button
                  key={graph.name}
                  onClick={() => {
                    console.log('Sidebar: Network Graph selected:', {
                      graphId: graph.id,
                      graphName: graph.name,
                      mode: 'topology',
                      timestamp: new Date().toISOString()
                    });
                    handleGraphSelect(graph.name);
                    onPathCalculationStart?.(false);
                  }}
                >
                  {graph.name.replace(/_/g, ' ')} ({graph.count} edges)
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <button 
          className={`expand-button ${expandedSection === 'workload' ? 'expanded' : ''}`}
          onClick={() => handleToggle('workload')}
        >
          Schedule a Workload
        </button>
        {expandedSection === 'workload' && (
          <div className="section-content">
            {isLoading ? (
              <div>Loading...</div>
            ) : error ? (
              <div>{error}</div>
            ) : !selectedCollection ? (
              // Show graph selection first
              graphCollections.map(graph => (
                <button
                  key={graph.name}
                  onClick={() => {
                    console.log('Sidebar: Workload scheduling graph selected:', {
                      graphId: graph.id,
                      graphName: graph.name,
                      mode: 'workload-scheduling',
                      timestamp: new Date().toISOString()
                    });
                    handleGraphSelect(graph.name);
                    onWorkloadModeStart?.(true);
                  }}
                >
                  {graph.name.replace(/_/g, ' ')}
                </button>
              ))
            ) : (
              // Show workload management after graph is selected
              <div className="workload-config">
                <h4>Workload Management</h4>
                <div className="workload-form">
                  <button 
                    className="start-workload-button"
                    onClick={handleStartWorkload}
                    disabled={!selectedWorkloadNodes || selectedWorkloadNodes.length < 2}
                  >
                    Start Workload ({selectedWorkloadNodes?.length || 0} nodes selected)
                  </button>
                  <button className="stop-workload-button">
                    Stop Workload
                  </button>
                  <button
                    className="schedule-another-button"
                    onClick={() => {
                      setSelectedCollection('');
                      console.log('Sidebar: Scheduling another workload:', {
                        action: 'reset_selection',
                        timestamp: new Date().toISOString()
                      });
                    }}
                  >
                    Schedule Another Workload
                  </button>
                  <button
                    onClick={() => setShowWorkloadList(!showWorkloadList)}
                    className="workload-list-toggle"
                  >
                    {showWorkloadList ? 'Hide' : 'Show'} Active Workloads ({activeWorkloads.length})
                  </button>
                  
                  {showWorkloadList && (
                    <div className="workload-list">
                      {activeWorkloads.length === 0 ? (
                        <div className="no-workloads">No active workloads</div>
                      ) : (
                        activeWorkloads.map(workload => (
                          <div key={workload.id} className="workload-item">
                            <div className="workload-header">
                              <div className="workload-info">
                                <span className="workload-id">
                                  Workload #{workload.id}
                                  <span className="path-count">
                                    ({workload.nodes?.length || 0} paths)
                                  </span>
                                </span>
                                <span className="workload-timestamp">
                                  {new Date(workload.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="workload-actions">
                                <button
                                  onClick={() => {
                                    console.log('Show Details clicked for workload:', workload.id);
                                    setExpandedWorkload(prev => {
                                      const newValue = prev === workload.id ? null : workload.id;
                                      console.log('Setting expandedWorkload:', {
                                        prev,
                                        new: newValue,
                                        workloadId: workload.id
                                      });
                                      return newValue;
                                    });
                                  }}
                                  className="show-details-button"
                                >
                                  {expandedWorkload === workload.id ? 'Hide Details' : 'Show Details'}
                                </button>
                                <button
                                  onClick={() => handleStopWorkload(workload.id)}
                                  className="stop-workload-button"
                                >
                                  Stop
                                </button>
                              </div>
                            </div>
                            
                            {expandedWorkload === workload.id && workload.nodes && (
                              <div className="workload-details">
                                {renderWorkloadPaths()}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 