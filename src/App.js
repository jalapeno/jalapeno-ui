import React, { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import Sidebar from './components/Sidebar';
import CollectionTable from './components/CollectionTable';
import { fetchCollections } from './services/api';
import './App.css';

function App() {
  const [state, setState] = useState({
    selectedCollection: null,
    collections: [],
    isLoading: false,
    error: null
  });

  const { selectedCollection, collections, isLoading, error } = state;

  const handleDataViewSelect = async (filterGraphs) => {
    try {
      setState((prevState) => ({
        ...prevState,
        isLoading: true
      }));
      console.log('Filter value:', filterGraphs);
      const response = await fetchCollections(filterGraphs);
      setState((prevState) => ({
        ...prevState,
        collections: response.collections,
        selectedCollection: null
      }));
    } catch (err) {
      setState((prevState) => ({
        ...prevState,
        error: 'Failed to load collections'
      }));
      console.error(err);
    } finally {
      setState((prevState) => ({
        ...prevState,
        isLoading: false
      }));
    }
  };

  const handleCollectionSelect = (collection) => {
    setState((prevState) => ({
      ...prevState,
      selectedCollection: collection,
      collections: []
    }));
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