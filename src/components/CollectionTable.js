import React, { useState } from 'react';
import '../styles/CollectionTable.css';
import CollectionModal from './CollectionModal';
import { fetchCollectionData } from '../services/api';

const CollectionTable = ({ collections, isLoading, error }) => {
  const [modalData, setModalData] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  const handleCollectionClick = async (collectionName) => {
    setSelectedCollection(collectionName);
    setIsLoadingData(true);
    setDataError(null);
    
    try {
      const data = await fetchCollectionData(collectionName);
      setModalData(data);
    } catch (err) {
      setDataError('Failed to load collection data');
      console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCloseModal = () => {
    setModalData(null);
    setSelectedCollection(null);
    setDataError(null);
  };

  if (isLoading) return <div>Loading collections...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!collections?.length) return <div>No collections found</div>;

  return (
    <>
      <div className="collection-table-container">
        <table className="collection-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.name}>
                <td>
                  <a 
                    href="#"
                    className="collection-link"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCollectionClick(collection.name);
                    }}
                  >
                    {collection.name}
                  </a>
                </td>
                <td>{collection.type}</td>
                <td>{collection.status}</td>
                <td>{collection.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CollectionModal
        data={modalData}
        collectionName={selectedCollection}
        onClose={handleCloseModal}
        isLoading={isLoadingData}
        error={dataError}
      />
    </>
  );
};

export default CollectionTable; 