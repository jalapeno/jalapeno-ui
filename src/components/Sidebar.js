import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';

const Sidebar = ({ 
  onCollectionSelect, 
  onDataViewSelect, 
  onPathCalculationStart
}) => {
  const [graphCollections, setGraphCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDataView, setSelectedDataView] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const dataViewOptions = [
    { value: 'all', label: 'All Data Collections' },
    { value: 'true', label: 'Graph Collections' },
    { value: 'hosts', label: 'Hosts' },
    { value: 'services', label: 'Services (future)' },
    { value: 'gpus', label: 'GPUs (future)' }
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
      case 'hosts':
        onDataViewSelect?.('hosts');
        return;
        case 'services':
          console.log('Sidebar: Inventory category selected:', {
            category: 'Services',
            type: 'service_inventory',
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
    setExpandedSection(expandedSection === section ? null : section);
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
                onClick={() => handleDataViewSelect(collection.value)}
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
    </div>
  );
};

export default Sidebar; 