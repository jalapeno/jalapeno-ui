import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { fetchCollections } from '../services/api';

const Sidebar = ({ onCollectionSelect, onDataViewSelect }) => {
  const [graphCollections, setGraphCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedDataView, setSelectedDataView] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>Data Collections</h3>
        <select 
          className="sidebar-dropdown"
          value={selectedDataView}
          onChange={(e) => handleDataViewSelect(e.target.value)}
        >
          <option value="">Select view...</option>
          {dataViewOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <h3>Network Graphs</h3>
        {isLoading ? (
          <p>Loading graphs...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <select 
            className="sidebar-dropdown"
            value={selectedCollection}
            onChange={(e) => handleGraphSelect(e.target.value)}
          >
            <option value="">Select a graph...</option>
            {graphCollections.map((collection) => (
              <option key={collection.name} value={collection.name}>
                {collection.name.replace(/_/g, ' ')} ({collection.count} edges)
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 