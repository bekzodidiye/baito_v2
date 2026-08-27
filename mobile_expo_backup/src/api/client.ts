import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL = 'http://192.168.1.100:3000/api/v1'; // Update to the correct local IP for testing

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async (config) => {
    // If the API requires Bearer tokens later, we can attach them here
    // const token = await SecureStore.getItemAsync('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Add global error handling (e.g. logout on 401)
    return Promise.reject(error.response?.data || error);
  }
);
