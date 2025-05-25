import React from 'react';
import styled from 'styled-components';

const DropdownContainer = styled.div`
  position: absolute;
  top: 8px;
  left: 300px;  // Position it to the right of ConstraintDropdown
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

const modes = {
  pathcalc: 'Path Calculation',
  workload: 'Workload Analysis'
};

const ModeDropdown = ({ selectedMode, onModeChange }) => {
  return (
    <DropdownContainer>
      <Select 
        value={selectedMode || 'pathcalc'}
        onChange={(e) => onModeChange(e.target.value)}
      >
        {Object.entries(modes).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </DropdownContainer>
  );
};

export default ModeDropdown; 