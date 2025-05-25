import React from 'react';
import styled from 'styled-components';

const DropdownContainer = styled.div`
  position: absolute;
  top: 8px;
  left: 144px;  // Position it to the right of LayoutDropdown
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
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

const CalculateButton = styled.button`
  font-family: Tahoma, sans-serif;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  outline: none;
  color: #333;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 1);
    border-color: rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PromptMessage = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.9);
  color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  margin-top: 8px;
  font-family: Tahoma, sans-serif;
  border: 1px solid rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: rgba(255, 255, 255, 1);
  }
`;

const modes = {
  pathcalc: 'Path Calculation',
  workload: 'Schedule Workload'
};

const ModeDropdown = ({ selectedMode, onModeChange, sourceNode, destinationNode, selectedNodes, onCalculatePaths }) => {
  const getPromptMessage = () => {
    if (selectedMode === 'workload') {
      if (selectedNodes.length === 0) {
        return 'Select two or more nodes';
      }
    } else if (selectedMode === 'path') {
      if (!sourceNode) {
        return 'Select Src & Dst node';
      } else {
        return 'Select a constraint';
      }
    }
    return '';
  };

  return (
    <DropdownContainer>
      <Select
        value={selectedMode}
        onChange={(e) => onModeChange(e.target.value)}
      >
        <option value="">Select Mode</option>
        <option value="path">Path Calculation</option>
        <option value="workload">Workload Scheduling</option>
      </Select>
      {selectedMode === 'workload' && selectedNodes.length >= 2 && (
        <CalculateButton onClick={() => onCalculatePaths(selectedNodes)}>
          Calculate Paths
        </CalculateButton>
      )}
      {getPromptMessage() && (
        <PromptMessage>
          {getPromptMessage()}
        </PromptMessage>
      )}
    </DropdownContainer>
  );
};

export default ModeDropdown; 