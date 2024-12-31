import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { apiUrl } from '../config';
import '../styles/NetworkGraph.css';

const COLORS = {
  igp_node: '#CC4A04',    // Cayenne orange for IGP nodes
  bgp_node: '#1E88E5',    // Blue for BGP nodes
  prefix: '#002921',      // Dark green for all prefix types
  text: '#000',           // Black text
  edge: '#1a365d'         // Blue edges
};

cytoscape.use(cola);

const NetworkGraph = ({ collection }) => {
  const cyRef = useRef(null);
  const [graphData, setGraphData] = useState(null);

  const isPrefix = (type) => {
    return type === 'ls_prefix' || type === 'bgp_prefix';
  };

  // Legend component definition
  const Legend = () => (
    <div className="graph-legend" style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>Legend</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.igp_node,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>IGP Nodes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.bgp_node,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>BGP Nodes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: COLORS.prefix,
            display: 'inline-block',
            borderRadius: '3px'
          }}></span>
          <span>Prefixes</span>
        </div>
      </div>
    </div>
  );

  const transformDataToCytoscape = (data) => {
    const elements = [];
    const processedEdges = new Set();
    
    // First add all vertices
    Object.entries(data.vertices).forEach(([id, vertex]) => {
      let nodeColor = '#666666'; // default color
      let nodeLabel = vertex.name || id;  // default to name or id
      
      if (id.includes('bgp_node')) {
        nodeColor = '#014961';
      } else if (id.includes('igp_node')) {
        nodeColor = '#ff0000';
      } else if (id.includes('ls_prefix')) {
        nodeLabel = vertex.prefix;  // Use prefix value for prefix nodes
      }

      elements.push({
        group: 'nodes',
        data: {
          id: id,
          label: nodeLabel,
          type: vertex.collection,
          color: nodeColor
        }
      });
    });

    // Then add edges, avoiding duplicates
    data.edges.forEach(edge => {
      if (edge._from && edge._to) {
        // Create a canonical edge ID that's the same regardless of direction
        const nodes = [edge._from, edge._to].sort();
        const edgeId = `${nodes[0]}-${nodes[1]}`;
        
        if (!processedEdges.has(edgeId)) {
          processedEdges.add(edgeId);
          elements.push({
            group: 'edges',
            data: {
              id: edgeId,
              source: edge._from,
              target: edge._to
            }
          });
        }
      }
    });

    console.log('Transformed elements:', {
      total: elements.length,
      nodes: elements.filter(e => e.group === 'nodes').length,
      edges: elements.filter(e => e.group === 'edges').length
    });

    return elements;
  };

  // Update the layout configuration
  const layout = {
    name: 'concentric',
    concentric: function(node) {
      // Place prefix nodes in outer circle
      return node.data('id').includes('ls_prefix') ? 1 : 2;
    },
    levelWidth: function() { return 1; },
    minNodeSpacing: 100,  // Increase spacing between nodes
    spacingFactor: 1.5,   // Increase overall spacing
    animate: true
  };

  // Update the style configuration
  const style = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': 20,
        'height': 20
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': '#999999',
        'curve-style': 'bezier',
        'target-arrow-shape': 'none'  // Remove arrows
      }
    }
  ];

  useEffect(() => {
    console.log('Collection received:', {
      collection,
      type: typeof collection,
      keys: collection ? Object.keys(collection) : 'none'
    });

    if (typeof collection === 'string') {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = `${baseUrl}/api/v1/collections/${collection}/topology`;
      
      console.log('Fetching topology from:', endpoint, {
        baseUrl,
        fullEndpoint: endpoint
      });
      
      fetch(endpoint)
        .then(async response => {
          // Log response details
          console.log('Response received:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            url: response.url
          });

          // Get the raw text first to see what we're dealing with
          const text = await response.text();
          console.log('Raw response:', text.substring(0, 500));

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error(`Failed to parse JSON: ${text.substring(0, 200)}`);
          }
        })
        .then(data => {
          console.log('Parsed topology data:', {
            vertices: Object.keys(data.vertices).length,
            edges: data.edges.length
          });
          const elements = transformDataToCytoscape(data);
          setGraphData(elements);
        })
        .catch(error => {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            endpoint: endpoint
          });
        });
    }
  }, [collection]);

  useEffect(() => {
    console.log('Graph data changed:', graphData);
    if (cyRef.current && graphData) {
      const cy = cyRef.current;
      console.log('Applying layout to', cy.elements().length, 'elements');
      
      // Run layouts sequentially
      const nonPrefixNodes = cy.nodes().filter(node => !isPrefix(node.data('type')));
      const prefixNodes = cy.nodes().filter(node => isPrefix(node.data('type')));
      
      console.log('Node counts:', {
        total: cy.nodes().length,
        nonPrefix: nonPrefixNodes.length,
        prefix: prefixNodes.length
      });

      // Position non-prefix nodes in a circle
      nonPrefixNodes.layout({
        name: 'circle',
        animate: false,
        padding: 50,
        radius: 150,
        startAngle: 3/2 * Math.PI,
        sweep: 2 * Math.PI,
        clockwise: true
      }).run();

      // Position prefix nodes in a line
      const width = cy.width();
      const height = cy.height();
      
      prefixNodes.forEach((node, index) => {
        const totalPrefixes = prefixNodes.length;
        const prefixWidth = width * 0.8;
        const startX = width * 0.1;
        const x = startX + (prefixWidth * index / (totalPrefixes - 1 || 1));
        
        node.position({
          x: x,
          y: height * 0.8
        });
      });

      // Fit the viewport
      cy.fit(undefined, 50);
    }
  }, [graphData]);

  return (
    <div className="network-graph" style={{ width: '100%', height: '800px', position: 'relative' }}>
      <CytoscapeComponent
        cy={(cy) => { 
          console.log('Cytoscape initialized');
          cyRef.current = cy;
        }}
        elements={graphData || []}
        style={{ width: '100%', height: '100%' }}
        stylesheet={style}
        userZoomingEnabled={true}
        userPanningEnabled={true}
      />
      <Legend />
    </div>
  );
};

export default NetworkGraph; 