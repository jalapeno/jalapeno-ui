import React, { useState, useEffect } from 'react';
// import NetworkGraph from './components/NetworkGraph';
import NetworkGraph from './components/NetworkGraph';
import Sidebar from './components/Sidebar';
import CollectionTable from './components/CollectionTable';
import { fetchCollections } from './services/api';
import './App.css';
import styled from 'styled-components';

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-family: 'Consolas', monospace;
  color: #666;
  font-size: 16px;
`;

function App() {
  const [state, setState] = useState({
    selectedCollection: null,
    collections: [],
    isLoading: false,
    error: null
  });

  const { selectedCollection, collections, isLoading, error } = state;

  const [isCalculatingPath, setIsCalculatingPath] = useState(false);
  const [isWorkloadMode, setIsWorkloadMode] = useState(false);
  const [currentWorkloadPaths, setCurrentWorkloadPaths] = useState(null);

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

  const handleWorkloadPathsCalculated = (pathResults) => {
    if (pathResults) {
      console.log('App: Received workload paths:', {
        pathResults,
        pathCount: pathResults.length,
        samplePath: pathResults[0],
        timestamp: new Date().toISOString()
      });
      setCurrentWorkloadPaths([...pathResults]);
    }
  };

  console.log('App: Selected collection:', {
    collection: selectedCollection,
    timestamp: new Date().toISOString()
  });

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
          onPathCalculationStart={setIsCalculatingPath}
          onWorkloadModeStart={setIsWorkloadMode}
          workloadPaths={currentWorkloadPaths}
        />
        <div className="content">
          {collections.length > 0 ? (
            <CollectionTable 
              collections={collections}
              isLoading={isLoading}
              error={error}
            />
          ) : selectedCollection ? (
            <NetworkGraph 
              collection={selectedCollection}
              onPathCalculationStart={isCalculatingPath}
              isWorkloadMode={isWorkloadMode}
              onWorkloadPathsCalculated={handleWorkloadPathsCalculated}
            />
          ) : (
            <EmptyState>
              Select a view from the sidebar to begin
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 