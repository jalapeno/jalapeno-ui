import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';
import { workloadManager } from '../services/workloadManager';

const Sidebar = ({ onCollectionSelect, onDataViewSelect, onPathCalculationStart, onWorkloadModeStart }) => {
  const [graphCollections, setGraphCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDataView, setSelectedDataView] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubSection, setExpandedSubSection] = useState(null);
  const [showWorkloadList, setShowWorkloadList] = useState(false);
  const [activeWorkloads, setActiveWorkloads] = useState([]);

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

  // Update local state from workload manager
  const refreshWorkloads = () => {
    setActiveWorkloads(workloadManager.getActiveWorkloads());
  };

  // Handle starting a new workload
  const handleStartWorkload = (nodes, paths) => {
    workloadManager.startWorkload(nodes, paths);
    refreshWorkloads();
  };

  // Handle stopping a workload
  const handleStopWorkload = (workloadId) => {
    workloadManager.stopWorkload(workloadId);
    refreshWorkloads();
  };

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
    
    if (section !== expandedSection) {
      setExpandedSubSection(null); // Reset sub-section when main section changes
    }
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSubToggle = (subSection) => {
    console.log('Sidebar: Sub-section toggle:', {
      previousSubSection: expandedSubSection,
      newSubSection: expandedSubSection === subSection ? null : subSection,
      timestamp: new Date().toISOString()
    });
    setExpandedSubSection(expandedSubSection === subSection ? null : subSection);
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
          {/* Network Graphs */}
          Topology Viewer
        </button>
        {expandedSection === 'graphs' && (
          <div className="section-content">
            {graphCollections.map(graph => (
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
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <button 
          className={`expand-button ${expandedSection === 'actions' ? 'expanded' : ''}`}
          onClick={() => handleToggle('actions')}
        >
          I Would Like To...
        </button>
        {expandedSection === 'actions' && (
          <div className="section-content">
            <div className="action-item">
              <button
                onClick={() => {
                  console.log('Sidebar: Action selected:', {
                    action: 'Calculate a Path',
                    type: 'path_calculation',
                    status: 'showing_graph_selection',
                    timestamp: new Date().toISOString()
                  });
                  handleSubToggle('path-graphs');
                }}
              >
                Calculate a Path
              </button>
              {expandedSubSection === 'path-graphs' && (
                <div className="sub-section-content">
                  {graphCollections.map(graph => (
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
                  ))}
                </div>
              )}
            </div>
            
            <div className="action-item">
              <button
                onClick={() => {
                  console.log('Sidebar: Action selected:', {
                    action: 'Schedule a Workload',
                    type: 'workload_scheduling',
                    status: 'showing_graph_selection',
                    timestamp: new Date().toISOString()
                  });
                  handleSubToggle('workload-graphs');
                }}
              >
                Schedule a Workload
              </button>
              {expandedSubSection === 'workload-graphs' && (
                <div className="sub-section-content">
                  {graphCollections.map(graph => (
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
                        handleSubToggle('workload-config');
                      }}
                    >
                      {graph.name.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}
              {expandedSubSection === 'workload-config' && (
                <div className="sub-section-content workload-config">
                  <h4>Workload Management</h4>
                  <div className="workload-form">
                    <button className="start-workload-button">
                      Start Workload
                    </button>
                    <button className="stop-workload-button">
                      Stop Workload
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
                              <div className="workload-info">
                                <span className="workload-id">Workload #{workload.id}</span>
                                <span className="workload-timestamp">
                                  {new Date(workload.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <button
                                onClick={() => handleStopWorkload(workload.id)}
                                className="stop-workload-button"
                              >
                                Stop
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 