import React, { useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { cytoscapeStyles } from '../styles/cytoscapeStyles';
import { layouts } from '../config/layouts';
import LayoutDropdown from './LayoutDropdown';
import styled from 'styled-components';

const GraphContainer = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
  background-color: #ffffff;
`;

const GraphVisualization = ({ graphData }) => {
  const [key, setKey] = useState(0);
  const [currentLayout, setCurrentLayout] = useState('');  // Start with empty selection

  useEffect(() => {
    // Force a remount when graphData changes
    setKey(prevKey => prevKey + 1);
  }, [graphData]);

  const handleLayoutChange = (layoutName) => {
    setCurrentLayout(layoutName);
    setKey(prevKey => prevKey + 1); // Force re-render with new layout
  };

  // Get the actual layout to use (default to cose if none selected)
  const activeLayout = layouts[currentLayout || 'cose'];

  const handleCyInit = (cy) => {
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const data = node.data();
      
      let tooltipContent = [];
      
      // Start with ID and label
      if (data.id) {
        tooltipContent.push(`<strong>id:</strong> ${data.id}`);
      }
      if (data.label) {
        tooltipContent.push(`<strong>label:</strong> ${data.label}`);
      }

      // Add SID information if available
      if (data.sids && data.sids.length > 0 && data.sids[0].srv6_sid) {
        tooltipContent.push(`<strong>srv6 sid:</strong> ${data.sids[0].srv6_sid}`);
      }

      // Add remaining relevant data
      const excludedKeys = [
        '_id', '_key', '_rev', 'action', 'router_hash', 'domain_id', 
        'peer_type', 'peer_hash', 'timestamp', 'mt_id_tlv', 
        'local_node_hash', 'nexthop', 'node_msd', 'protocol_id', 
        'prefix_attr_tlvs', 'sr_algorithm', 'peer_ip', 'router_ip',
        'srv6_capabilities_tlv', 'sids', 'id', 'label', 'color'
      ];

      Object.entries(data).forEach(([key, value]) => {
        if (!excludedKeys.includes(key) && 
            !key.startsWith('is_') && 
            value !== undefined && 
            value !== 'undefined') {
          tooltipContent.push(`<strong>${key}:</strong> ${value}`);
        }
      });
      
      let tooltip = document.getElementById('cy-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'cy-tooltip';
        document.body.appendChild(tooltip);
      }

      tooltip.style.position = 'absolute';
      tooltip.style.zIndex = 1000;
      tooltip.style.backgroundColor = data.color;
      tooltip.style.color = '#ffffff';
      tooltip.style.padding = '5px 10px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.fontFamily = 'Tahoma, sans-serif';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      tooltip.style.opacity = '0.9';
      tooltip.style.maxWidth = '300px';  // Prevent very wide tooltips
      tooltip.style.whiteSpace = 'normal';  // Allow text wrapping
      
      tooltip.innerHTML = tooltipContent.join('<br>');
      
      const renderedPosition = node.renderedPosition();
      const containerBounds = cy.container().getBoundingClientRect();
      
      tooltip.style.left = `${containerBounds.left + renderedPosition.x + 20}px`;
      tooltip.style.top = `${containerBounds.top + renderedPosition.y - 20}px`;
      tooltip.style.display = 'block';
    });

    cy.on('mouseout', 'node', () => {
      const tooltip = document.getElementById('cy-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    });

    // Clean up on unmount
    return () => {
      const tooltip = document.getElementById('cy-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    };
  };

  if (!Array.isArray(graphData)) {
    return <div>Loading...</div>;
  }

//   console.log('Graph data received:', graphData);

  return (
    <GraphContainer>
      <LayoutDropdown 
        currentLayout={currentLayout}
        onLayoutChange={handleLayoutChange}
      />
      <CytoscapeComponent
        key={key}
        elements={graphData}
        style={{ width: '100%', height: '100%' }}
        stylesheet={cytoscapeStyles}
        layout={activeLayout}
        minZoom={0.2}
        maxZoom={3}
        userZoomingEnabled={true}
        userPanningEnabled={true}
        boxSelectionEnabled={false}
        cy={handleCyInit}
      />
    </GraphContainer>
  );
};

export default GraphVisualization; 