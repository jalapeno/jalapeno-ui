import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';

const Sidebar = ({ onCollectionSelect, onDataViewSelect }) => {
  const [graphCollections, setGraphCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDataView, setSelectedDataView] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGraphsExpanded, setIsGraphsExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);

  const dataViewOptions = [
    { value: 'all', label: 'All Data Collections' },
    { value: 'true', label: 'Graph Collections' },
    { value: 'false', label: 'Non-Graph Collections' }
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
    setSelectedDataView(value);
    let filterGraphs;
    
    switch(value) {
      case 'true':
        filterGraphs = true;
        break;
      case 'false':
        filterGraphs = false;
        break;
      case 'all':
        filterGraphs = null;
        break;
      default:
        filterGraphs = null;
    }
    
    onDataViewSelect?.(filterGraphs);
  };

  const handleGraphSelect = (graphName) => {
    setSelectedCollection(graphName);
    onCollectionSelect?.(graphName);
  };

  const handleToggle = () => {
    console.log('Sidebar: Data Collections toggle:', {
      previousState: isExpanded,
      newState: !isExpanded,
      timestamp: new Date().toISOString()
    });
    setIsExpanded(!isExpanded);
  };

  const handleGraphsToggle = () => {
    console.log('Sidebar: Network Graphs toggle:', {
      previousState: isGraphsExpanded,
      newState: !isGraphsExpanded,
      availableGraphs: graphCollections.length,
      timestamp: new Date().toISOString()
    });
    setIsGraphsExpanded(!isGraphsExpanded);
  };

  const handleActionsToggle = () => {
    console.log('Sidebar: Actions toggle:', {
      previousState: isActionsExpanded,
      newState: !isActionsExpanded,
      availableActions: ['Calculate a Path', 'Schedule a Workload'],
      timestamp: new Date().toISOString()
    });
    setIsActionsExpanded(!isActionsExpanded);
  };

  const handleInventoryToggle = () => {
    console.log('Sidebar: Inventory toggle:', {
      previousState: isInventoryExpanded,
      newState: !isInventoryExpanded,
      availableCategories: ['Services', 'Hosts', 'GPUs'],
      timestamp: new Date().toISOString()
    });
    setIsInventoryExpanded(!isInventoryExpanded);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <button 
          className={`expand-button ${isExpanded ? 'expanded' : ''}`}
          onClick={handleToggle}
          // style={{
          //   backgroundColor: '#82f5de',  // Lighter than sidebar but still in theme
          //   color: 'black',
          //   fontSize: '16px',
          //   width: '100%',
          //   padding: '10px',
          //   border: 'none',
          //   textAlign: 'left',
          //   cursor: 'pointer',
          //   marginBottom: isExpanded ? '0' : '6px'
          // }}
        >
          Data Collections
        </button>
        {isExpanded && (
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
          className={`expand-button ${isGraphsExpanded ? 'expanded' : ''}`}
          onClick={handleGraphsToggle}
        >
          Network Graphs
        </button>
        {isGraphsExpanded && (
          <div className="section-content">
            {graphCollections.map(graph => (
              <button
                key={graph.name}
                onClick={() => {
                  console.log('Sidebar: Network Graph selected:', {
                    graphId: graph.id,
                    graphName: graph.name,
                    timestamp: new Date().toISOString()
                  });
                  handleGraphSelect(graph.name);
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
          className={`expand-button ${isInventoryExpanded ? 'expanded' : ''}`}
          onClick={handleInventoryToggle}
        >
          Inventory
        </button>
        {isInventoryExpanded && (
          <div className="section-content">
            <button
              onClick={() => {
                console.log('Sidebar: Inventory category selected:', {
                  category: 'Services',
                  type: 'service_inventory',
                  status: 'pending_api_implementation',
                  timestamp: new Date().toISOString()
                });
                // API call will go here
              }}
            >
              Services
            </button>
            <button
              onClick={() => {
                console.log('Sidebar: Inventory category selected:', {
                  category: 'Hosts',
                  type: 'host_inventory',
                  status: 'pending_api_implementation',
                  timestamp: new Date().toISOString()
                });
                // API call will go here
              }}
            >
              Hosts
            </button>
            <button
              onClick={() => {
                console.log('Sidebar: Inventory category selected:', {
                  category: 'GPUs',
                  type: 'gpu_inventory',
                  status: 'pending_api_implementation',
                  timestamp: new Date().toISOString()
                });
                // API call will go here
              }}
            >
              GPUs
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <button 
          className={`expand-button ${isActionsExpanded ? 'expanded' : ''}`}
          onClick={handleActionsToggle}
        >
          I Would Like To...
        </button>
        {isActionsExpanded && (
          <div className="section-content">
            <button
              onClick={() => {
                console.log('Sidebar: Action selected:', {
                  action: 'Calculate a Path',
                  type: 'path_calculation',
                  status: 'pending_api_implementation',
                  timestamp: new Date().toISOString()
                });
                // API call will go here
              }}
            >
              Calculate a Path
            </button>
            <button
              onClick={() => {
                console.log('Sidebar: Action selected:', {
                  action: 'Schedule a Workload',
                  type: 'workload_scheduling',
                  status: 'pending_api_implementation',
                  timestamp: new Date().toISOString()
                });
                // API call will go here
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