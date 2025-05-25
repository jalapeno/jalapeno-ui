import React from 'react';
import styled from 'styled-components';
import { layoutNames } from '../config/layouts';

const DropdownContainer = styled.div`
  position: absolute;
  top: 8px;
  left: 10px;
  z-index: 10;
`;

const Select = styled.select`
  font-family: Tahoma, sans-serif;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  outline: none;

  &:hover {
    background-color: rgba(255, 255, 255, 1);
  }
`;

const LayoutDropdown = ({ currentLayout, onLayoutChange }) => {
  console.log('LayoutDropdown render:', {
    currentLayout,
    availableLayouts: layoutNames,
    timestamp: new Date().toISOString()
  });

  return (
    <DropdownContainer>
      <Select 
        value={currentLayout}
        onChange={(e) => onLayoutChange(e.target.value)}
      >
        <option value="cose" disabled={currentLayout !== 'cose'}>
          {currentLayout === 'cose' ? 'Select a layout' : 'Default Layout'}
        </option>
        <option value="cose">Default Layout</option>
        <option value="concentric">Concentric</option>
        <option value="circle">Circle</option>
        <option value="clos">Clos</option>
        <option value="polarfly">Polarfly</option>
      </Select>
    </DropdownContainer>
  );
};

export default LayoutDropdown; 