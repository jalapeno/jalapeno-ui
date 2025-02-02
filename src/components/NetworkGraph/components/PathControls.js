// import React from 'react';
// import styled from 'styled-components';

// const ControlsContainer = styled.div`
//   display: flex;
//   gap: 20px;
//   align-items: center;
// `;

// const Select = styled.select`
//   padding: 6px 12px;
//   border-radius: 4px;
//   border: 1px solid #ccc;
//   font-family: 'Consolas', monospace;
//   background: white;
//   min-width: 184px;
// `;

// const Button = styled.button`
//   padding: 6px 12px;
//   border-radius: 4px;
//   border: 1px solid #656565;
//   background: white;
//   font-family: 'Consolas', monospace;
//   cursor: pointer;
//   min-width: 184px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   gap: 8px;

//   &:hover {
//     background: #f5f5f5;
//   }

//   &:disabled {
//     opacity: 0.6;
//     cursor: not-allowed;
//   }
// `;

// const ResetIcon = styled.span`
//   font-size: 14px;
// `;

// const PathControls = ({ onConstraintChange, onClear, disabled }) => (
//   <ControlsContainer>
//     <Select
//       onChange={(e) => onConstraintChange(e.target.value)}
//       disabled={disabled}
//       defaultValue=""
//     >
//       <option value="" disabled>Select constraint...</option>
//       <option value="shortest">Shortest Path</option>
//       <option value="latency">Low Latency</option>
//       <option value="utilization">Least Utilized</option>
//       <option value="scheduled">Lowest Scheduled Load</option>
//     </Select>

//     <Button onClick={onClear}>
//       <ResetIcon>↺</ResetIcon>
//       Reset Path
//     </Button>
//   </ControlsContainer>
// );

// export default PathControls;