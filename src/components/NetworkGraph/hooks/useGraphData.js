import { useState, useEffect } from 'react';
import { fetchTopology } from '../../../services/api';
import { transformDataToCytoscape } from '../services/graphTransform';

export const useGraphData = (collection) => {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!collection) return;

      setLoading(true);
      try {
        console.log('Fetching topology for collection:', collection);
        const response = await fetchTopology(collection);
        console.log('Received topology data:', response);
        
        if (!response || !response.vertices || !response.edges) {
          console.error('Invalid topology data received:', response);
          setError('Invalid data structure received from API');
          return;
        }

        const elements = transformDataToCytoscape(response);
        // console.log('Transformed elements:', elements);
        
        setGraphData(elements);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collection]);

  return { graphData, error, loading };
}; 