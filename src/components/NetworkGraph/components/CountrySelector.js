import React from 'react';
import styled from 'styled-components';

const Modal = styled.div`
  position: absolute;
  top: 60px;
  left: 8px;
  background: white;
  font-family: 'Tahoma', sans-serif;
  font-size: 12px;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transform: none;
`;

const Select = styled.select`
  width: 200px;
  padding: 8px;
  margin: 10px 0;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  padding: 8px 16px;
  margin: 0 5px;
  border-radius: 4px;
  border: none;
  background: ${props => props.primary ? '#4CAF50' : '#f5f5f5'};
  color: ${props => props.primary ? 'white' : 'black'};
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const countries = [
  { code: 'FRA', name: 'France' },
  { code: 'DEU', name: 'Germany' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'AUT', name: 'Austria' },
  { code: 'GBR', name: 'United Kingdom' },
  // Add more countries as needed
];

const CountrySelector = ({ isOpen, onClose, onConfirm }) => {
  const [selectedCountries, setSelectedCountries] = React.useState([]);

  if (!isOpen) return null;

  return (
    <Modal>
      <h3>Select Countries to Exclude</h3>
      <Select 
        multiple
        value={selectedCountries}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions, option => option.value);
          setSelectedCountries(values);
        }}
      >
        {countries.map(country => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </Select>
      <div>
        <Button onClick={() => {
          onConfirm(selectedCountries);
          onClose();
        }} primary>
          Confirm
        </Button>
        <Button onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
};

export default CountrySelector; 