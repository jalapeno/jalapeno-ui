import React from 'react';
import styled from 'styled-components';

const DropdownContainer = styled.div`
  position: absolute;
  top: 8px;
  left: 300px;  // Position it to the right of ModeDropdown
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

const constraints = {
  shortest: 'Shortest Path',
  latency: 'Low Latency',
  utilization: 'Least Utilized',
  sovereignty: 'Data Sovereignty'
};

const ConstraintDropdown = ({ selectedConstraint, onConstraintChange, disabled }) => {
  console.log('ConstraintDropdown render:', {
    selectedConstraint,
    disabled,
    timestamp: new Date().toISOString()
  });

  return (
    <DropdownContainer>
      <Select 
        value={selectedConstraint || ''}
        onChange={(e) => onConstraintChange(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>
          Path constraint
        </option>
        {Object.entries(constraints).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </DropdownContainer>
  );
};

export default ConstraintDropdown; 