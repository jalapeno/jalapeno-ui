import React, { useState, useEffect } from 'react';
import { fetchCollectionData } from '../services/api';
import '../styles/CollectionTable.css';

const HostsView = () => {
  const [hosts, setHosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHosts = async () => {
      try {
        const response = await fetchCollectionData('hosts');
        setHosts(response.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load hosts data');
        console.error('Error loading hosts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHosts();
  }, []);

  if (isLoading) return <div>Loading hosts data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!hosts?.length) return <div>No hosts found</div>;

  return (
    <div className="collection-table-container">
      <table className="collection-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>IPv4 Address</th>
            <th>IPv6 Address</th>
            <th>Interface</th>
            <th>Dataplane</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {hosts.map((host) => (
            <tr key={host._key}>
              <td>{host.name}</td>
              <td>{host.ipv4_address || '-'}</td>
              <td>{host.ipv6_address}</td>
              <td>{host.interface}</td>
              <td>{host.dataplane}</td>
              <td>{host.tier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HostsView; 