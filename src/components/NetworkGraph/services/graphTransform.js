const COLORS = {
  igp_node: '#CC4A04',    // Cayenne orange for IGP nodes
  bgp_node: '#0d7ca1',    // Blue for BGP nodes
  prefix: '#26596e',      // Grey for all prefix types
  gpu: '#49b019',         // Green for GPU nodes
  host: '#49b019',        // Green for host nodes
  text: '#000',           // Black text
  edge: '#1a365d',        // Blue edges
  polarfly_quadric: '#CC4A04',    // Orange for quadric nodes
  polarfly_nonquadric: '#0d7ca1', // Blue for bottom layer
  polarfly_middle: '#49b019'      // Green for middle layer
};

export const transformDataToCytoscape = (data) => {
  console.log('Raw data received:', data);
  
  if (!data || !data.vertices || !data.edges) {
    return [];
  }

  const elements = [];
  const processedEdges = new Set();

  // Add nodes
  Object.entries(data.vertices).forEach(([id, vertex]) => {
    let nodeColor = '#666666';
    let nodeLabel = vertex._key || id;
    
    if (id.includes('bgp_node')) {
      nodeColor = COLORS.bgp_node;
      nodeLabel = vertex.name || id.split('/')[1];
    } else if (id.includes('igp_node')) {
      nodeColor = COLORS.igp_node;
      nodeLabel = vertex.name || id.split('/')[1];
    } else if (id.includes('prefix')) {
      nodeColor = COLORS.prefix;
      nodeLabel = vertex.prefix || id;
    } else if (id.includes('gpus/')) {
      nodeColor = COLORS.gpu;
      nodeLabel = vertex.name || id.split('/')[1];
    } else if (id.includes('host')) {
      nodeColor = COLORS.host;
      nodeLabel = vertex.name || id.split('/')[1];
    }

    elements.push({
      group: 'nodes',
      data: {
        id: id,
        label: nodeLabel,
        type: vertex.collection,
        color: nodeColor,
        router_id: vertex.router_id,
        tier: vertex.tier,
        asn: vertex.asn,
        sids: vertex.sids,
        name: vertex.name,
        ...vertex  // Include all other properties
      }
    });
  });

  // Add edges (deduplicating bi-directional pairs)
  data.edges.forEach(edge => {
    if (edge._from && edge._to && edge._id) {
      const edgeKey = [edge._from, edge._to].sort().join('_');
      if (!processedEdges.has(edgeKey)) {
        elements.push({
          group: 'edges',
          data: {
            id: edge._id,
            source: edge._from,
            target: edge._to,
            color: COLORS.edge
          }
        });
        processedEdges.add(edgeKey);
      }
    }
  });

//   console.log('Transformed elements:', elements);
  return elements;
}; 