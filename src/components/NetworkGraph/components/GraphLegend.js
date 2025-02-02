import React from 'react';
import { theme } from '../../../styles/theme';

const GraphLegend = () => (
  <div style={{
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    background: 'rgba(255, 255, 255, 0.9)',
    padding: theme.spacing.md,
    borderRadius: theme.layout.borderRadius,
    boxShadow: theme.layout.shadow,
    fontFamily: theme.typography.fontFamily.mono
  }}>
    <h3 style={{ margin: '0 0 10px 0', fontSize: theme.typography.fontSize.md }}>Legend</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
      {[
        { color: '#CC4A04', label: 'IGP Nodes' },
        { color: '#0d7ca1', label: 'BGP Nodes' },
        { color: '#26596e', label: 'Prefixes' },
        { color: '#49b019', label: 'Hosts/GPUs' }
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <span style={{ 
            width: '20px', 
            height: '20px', 
            backgroundColor: color,
            display: 'inline-block',
            borderRadius: '3px'
          }} />
          <span style={{ fontSize: theme.typography.fontSize.sm }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

export default GraphLegend; 