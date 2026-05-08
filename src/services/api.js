import axios from 'axios';

const API_URL = 'https://spokeappraisal.com/api';

// Get stored token
const getToken = () => localStorage.getItem('authToken');

// Set token after login
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Clear token on logout
export const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Check if user is logged in
export const isAuthenticated = () => {
  return !!getToken();
};

// API client with auth header
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const signup = async (email, password, fullName) => {
  const response = await axios.post(`${API_URL}/auth/signup`, {
    email,
    password,
    fullName,
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  return response.data;
};

// Inspection endpoints
export const getInspections = async () => {
  const response = await apiClient.get('/inspections');
  return response.data;
};

export const getInspection = async (id) => {
  const response = await apiClient.get(`/inspections/${id}`);
  return response.data;
};

export const createInspection = async (inspectionData) => {
  const response = await apiClient.post('/inspections', inspectionData);
  return response.data;
};

export const updateInspection = async (id, inspectionData) => {
  const response = await apiClient.put(`/inspections/${id}`, inspectionData);
  return response.data;
};

export const deleteInspection = async (id) => {
  const response = await apiClient.delete(`/inspections/${id}`);
  return response.data;
};