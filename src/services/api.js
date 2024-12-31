import axios from 'axios';
import { apiUrl } from '../config';

const api = axios.create({
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

export const fetchVertices = async (collectionName) => {
  try {
    const response = await api.get(`/collections/${collectionName}/vertices`);
    return response.data;
  } catch (error) {
    console.error('Error fetching vertices:', error);
    throw error;
  }
};

export const fetchEdges = async (collectionName) => {
  try {
    const response = await api.get(`/collections/${collectionName}/edges`);
    return response.data;
  } catch (error) {
    console.error('Error fetching edges:', error);
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