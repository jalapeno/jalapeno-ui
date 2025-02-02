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
      'border-width': 0,
      'border-opacity': 0
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
      'border-width': 2,
      'border-color': '#ffffff',
      'border-opacity': 0.9,
      'z-index': 9999,
      'font-weight': 'bold'
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'width': 2,
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
  }
]; 