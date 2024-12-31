import React, { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import Sidebar from './components/Sidebar';
import CollectionTable from './components/CollectionTable';
import { fetchCollections } from './services/api';
import './App.css';

function App() {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDataViewSelect = async (filterGraphs) => {
    try {
      setIsLoading(true);
      console.log('Filter value:', filterGraphs);
      const response = await fetchCollections(filterGraphs);
      setCollections(response.collections);
      setSelectedCollection(null);
    } catch (err) {
      setError('Failed to load collections');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setCollections([]); // Clear table view
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <img 
            src={process.env.PUBLIC_URL + '/images/jalapeno-icon.png'} 
            alt="Jalapeno Logo" 
            className="logo"
          />
          <h1>Jalapeno Network Topology</h1>
        </div>
      </header>
      <div className="main-container">
        <Sidebar 
          onCollectionSelect={handleCollectionSelect}
          onDataViewSelect={handleDataViewSelect}
        />
        <div className="content">
          {collections.length > 0 ? (
            <CollectionTable 
              collections={collections}
              isLoading={isLoading}
              error={error}
            />
          ) : selectedCollection ? (
            <NetworkGraph collection={selectedCollection} />
          ) : (
            <div className="empty-state">
              Select a view from the sidebar to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 