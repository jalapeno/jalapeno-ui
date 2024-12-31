import React from 'react';
import '../styles/CollectionModal.css';

const CollectionModal = ({ data, collectionName, onClose, isLoading, error }) => {
  if (!data && !isLoading && !error) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{collectionName}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div className="loading">Loading collection data...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <pre>{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionModal; 