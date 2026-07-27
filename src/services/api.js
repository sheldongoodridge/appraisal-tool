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

// Fire session-expired event on 401 so App.js can show the modal
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    return Promise.reject(error);
  }
);

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

// Photo endpoints
export const uploadPhoto = async (inspectionId, file, room, onProgress) => {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('inspectionId', inspectionId);
  formData.append('room', room || 'untagged');

  const response = await apiClient.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
};

export const getPhotos = async (inspectionId) => {
  const response = await apiClient.get(`/photos/inspection/${inspectionId}`);
  return response.data;
};

export const updatePhoto = async (id, fields) => {
  const response = await apiClient.patch(`/photos/${id}`, fields);
  return response.data;
};

export const deletePhoto = async (id) => {
  const response = await apiClient.delete(`/photos/${id}`);
  return response.data;
};

// Properties
export const searchProperties = async (q) => {
  const response = await apiClient.get('/properties/search', { params: { q } });
  return response.data;
};

export const getProperty = async (id) => {
  const response = await apiClient.get(`/properties/${id}`);
  return response.data;
};

export const updateProperty = async (id, data) => {
  const response = await apiClient.patch(`/properties/${id}`, data);
  return response.data;
};

// Import
export const importCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/import/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getImportJob = async (jobId) => {
  const response = await apiClient.get(`/import/jobs/${jobId}`);
  return response.data;
};

// Clients
export const getClients = async () => {
  const response = await apiClient.get('/clients');
  return response.data;
};

export const createClient = async (data) => {
  const response = await apiClient.post('/clients', data);
  return response.data;
};

export const updateClient = async (id, data) => {
  const response = await apiClient.put(`/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await apiClient.delete(`/clients/${id}`);
  return response.data;
};

// Lenders
export const getLenders = async () => {
  const response = await apiClient.get('/lenders');
  return response.data;
};

export const createLender = async (data) => {
  const response = await apiClient.post('/lenders', data);
  return response.data;
};

export const updateLender = async (id, data) => {
  const response = await apiClient.put(`/lenders/${id}`, data);
  return response.data;
};

export const deleteLender = async (id) => {
  const response = await apiClient.delete(`/lenders/${id}`);
  return response.data;
};

// Responses
export const getResponses = async (category) => {
  const response = await apiClient.get('/responses', { params: category ? { category } : {} });
  return response.data;
};

export const createResponse = async (data) => {
  const response = await apiClient.post('/responses', data);
  return response.data;
};

export const updateResponse = async (id, data) => {
  const response = await apiClient.put(`/responses/${id}`, data);
  return response.data;
};

export const deleteResponse = async (id) => {
  const response = await apiClient.delete(`/responses/${id}`);
  return response.data;
};

export const recordResponseUse = async (id) => {
  const response = await apiClient.post(`/responses/${id}/use`);
  return response.data;
};

// Organization
export const getOrganization = async () => {
  const response = await apiClient.get('/organization');
  return response.data;
};

export const updateOrganization = async (data) => {
  const response = await apiClient.post('/organization/update', data);
  return response.data;
};

export const sendInvite = async (data) => {
  const response = await apiClient.post('/organization/invite', data);
  return response.data;
};

// Public invite routes (no auth)
export const getInvite = async (token) => {
  const response = await apiClient.get(`/invite/${token}`);
  return response.data;
};

export const acceptInvite = async (token, data) => {
  const response = await apiClient.post(`/invite/${token}/accept`, data);
  return response.data;
};

// User profile
export const getProfile = async () => {
  const response = await apiClient.get('/auth/profile');
  return response.data.user;
};

export const updateProfile = async (data) => {
  const response = await apiClient.patch('/auth/profile', data);
  return response.data.user;
};

// Workfile section patch
export const patchWorkfileSection = async (id, section, data) => {
  const response = await apiClient.patch(`/inspections/${id}/workfile`, { section, data });
  return response.data;
};

// Workfile settings
export const getWorkfileSettings = async () => {
  const response = await apiClient.get('/workfiles/settings');
  return response.data;
};

export const saveWorkfileSettings = async (data) => {
  const response = await apiClient.post('/workfiles/settings', data);
  return response.data;
};
