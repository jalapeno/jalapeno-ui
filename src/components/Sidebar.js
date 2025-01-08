import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';
import { workloadManager } from '../services/workloadManager';

const Sidebar = ({ 
  onCollectionSelect, 
  onDataViewSelect, 
  onPathCalculationStart, 
  onWorkloadModeStart,
  workloadPaths
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
  const handleStartWorkload = () => {
    console.log('Sidebar: Starting workload with paths:', {
      pathCount: workloadPaths?.length,
      timestamp: new Date().toISOString()
    });

    if (workloadPaths && workloadPaths.length > 0) {
      const workload = workloadManager.startWorkload(workloadPaths);
      refreshWorkloads();
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
          className={`expand-button ${expandedSection === 'path' ? 'expanded' : ''}`}
          onClick={() => handleToggle('path')}
        >
          Calculate a Path
        </button>
        {expandedSection === 'path' && (
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
                    console.log('Sidebar: Path calculation graph selected:', {
                      graphId: graph.id,
                      graphName: graph.name,
                      mode: 'path-calculation',
                      timestamp: new Date().toISOString()
                    });
                    handleGraphSelect(graph.name);
                    onPathCalculationStart?.(true);
                  }}
                >
                  {graph.name.replace(/_/g, ' ')}
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
                    disabled={!workloadPaths}
                  >
                    Start Workload
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
                                <div className="path-details">
                                  <h5>Path Details</h5>
                                  <div className="path-table">
                                    {workload.nodes.map((path, index) => (
                                      <div key={index} className="path-row">
                                        <div className="path-header">
                                          Path {index + 1}: {path.source} → {path.destination}
                                        </div>
                                        <div className="path-vertices">
                                          {path.path.map(hop => hop.vertex._id).join(' → ')}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
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