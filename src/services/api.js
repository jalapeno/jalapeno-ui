import axios from 'axios';
import { apiUrl } from '../config';

// Create the axios instance
export const api = axios.create({
  baseURL: apiUrl + '/api/v1'
});

export const fetchCollections = async (filterGraphs = null) => {
  try {
    let url = '/collections';
    
    // Only add the query parameter if filterGraphs is not null
    if (filterGraphs !== null) {
      url += `?filter_graphs=${filterGraphs}`;
    }
    
    console.log('Making request to:', api.defaults.baseURL + url); // Debug log
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
};

export const fetchCollectionInfo = async (collectionName) => {
  try {
    const response = await api.get(`/collections/${collectionName}/info`);
    return response.data;
  } catch (error) {
    console.error('Error fetching collection info:', error);
    throw error;
  }
};


export const fetchCollectionData = async (collectionName) => {
  try {
    const url = `/collections/${collectionName}`;
    console.log('Making request to:', api.defaults.baseURL + url);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}; 

export const fetchTopology = async (collectionName) => {
  try {
    const url = `/graphs/${collectionName}/topology`;
    console.log('Making topology request to:', api.defaults.baseURL + url);
    const response = await api.get(url);
    console.log('Raw topology response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error(`Error fetching topology for ${collectionName}:`, error);
    throw error;
  }
};