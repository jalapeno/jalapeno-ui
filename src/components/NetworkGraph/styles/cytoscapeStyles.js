import { theme } from '../../../styles/theme';

export const cytoscapeStyles = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'background-opacity': 1,
      'label': 'data(label)',
      'color': '#000000',
      'width': 35,
      'height': 35,
      'font-size': theme.typography.fontSize.xs,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 10,
      'text-wrap': 'ellipsis',
      'text-max-width': '80px',
      'border-width': 0
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': 'data(color)',
      'curve-style': 'bezier',
      'opacity': 0.8,
      'target-arrow-shape': 'none'
    }
  },
  {
    selector: 'node:selected',
    style: {
      'background-color': '#FFD700',
      'border-color': '#FF8C00',
      'border-width': '3px',
      'width': 40,
      'height': 40,
      'z-index': 9999,
      'font-weight': 'bold'
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#FFD700',
      'width': 3,
      'opacity': 1,
      'z-index': 9999
    }
  },
  {
    selector: '.source-selected',
    style: {
      'background-color': theme.colors.secondary,
      'border-width': '3px',
      'border-color': theme.colors.secondary,
      'border-opacity': 0.8
    }
  },
  {
    selector: '.dest-selected',
    style: {
      'background-color': theme.colors.secondary,
      'border-width': '3px',
      'border-color': theme.colors.secondary,
      'border-opacity': 0.8
    }
  },
  {
    selector: '.workload-selected',
    style: {
      'background-color': theme.colors.success,
      'border-width': '3px',
      'border-color': theme.colors.success,
      'border-opacity': 0.8
    }
  },
  {
    selector: 'node.workload-path',
    style: {
      'background-color': '#FFD700',
      'border-color': '#FF8C00',
      'border-width': '3px',
      'border-opacity': 0.8,
      'width': 40,
      'height': 40,
      'z-index': 999
    }
  },
  {
    selector: 'edge.workload-path',
    style: {
      'line-color': '#FFD700',
      'width': 3,
      'opacity': 1,
      'z-index': 999
    }
  },
  {
    selector: 'edge.high-load',
    style: {
      'line-color': '#FF8C00',
      'width': 3,
      'opacity': 1,
      'z-index': 999
    }
  },
  {
    selector: 'edge.critical-load',
    style: {
      'line-color': '#FF0000',
      'width': 3,
      'opacity': 1,
      'z-index': 999
    }
  }
]; 