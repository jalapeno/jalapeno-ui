import React from 'react';
import styled from 'styled-components';
import { layoutNames } from '../config/layouts';

const DropdownContainer = styled.div`
  position: absolute;
  top: 10px;
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
  return (
    <DropdownContainer>
      <Select value={currentLayout} onChange={(e) => onLayoutChange(e.target.value)}>
        {Object.entries(layoutNames).map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </Select>
    </DropdownContainer>
  );
};

export default LayoutDropdown; 