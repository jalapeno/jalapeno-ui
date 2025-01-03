import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';

const Sidebar = ({ onCollectionSelect, onDataViewSelect, onPathCalculationStart }) => {
  const [graphCollections, setGraphCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDataView, setSelectedDataView] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedSubSection, setExpandedSubSection] = useState(null);

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
            <button
              onClick={() => {
                console.log('Sidebar: Action selected:', {
                  action: 'Schedule a Workload',
                  type: 'workload_scheduling',
                  status: 'pending_api_implementation',
                  timestamp: new Date().toISOString()
                });
              }}
            >
              Schedule a Workload
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 