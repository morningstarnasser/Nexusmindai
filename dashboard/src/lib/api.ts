import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Agent API
export const agentAPI = {
  list: () => apiClient.get('/agents'),
  get: (id: string) => apiClient.get(`/agents/${id}`),
  create: (data: any) => apiClient.post('/agents', data),
  update: (id: string, data: any) => apiClient.put(`/agents/${id}`, data),
  delete: (id: string) => apiClient.delete(`/agents/${id}`),
  start: (id: string) => apiClient.post(`/agents/${id}/start`),
  stop: (id: string) => apiClient.post(`/agents/${id}/stop`),
  logs: (id: string) => apiClient.get(`/agents/${id}/logs`),
};

// Workflow API
export const workflowAPI = {
  list: () => apiClient.get('/workflows'),
  get: (id: string) => apiClient.get(`/workflows/${id}`),
  create: (data: any) => apiClient.post('/workflows', data),
  update: (id: string, data: any) => apiClient.put(`/workflows/${id}`, data),
  delete: (id: string) => apiClient.delete(`/workflows/${id}`),
  run: (id: string) => apiClient.post(`/workflows/${id}/run`),
  logs: (id: string) => apiClient.get(`/workflows/${id}/logs`),
};

// Memory API
export const memoryAPI = {
  search: (query: string) => apiClient.get('/memory/search', { params: { q: query } }),
  list: () => apiClient.get('/memory'),
  create: (data: any) => apiClient.post('/memory', data),
  delete: (id: string) => apiClient.delete(`/memory/${id}`),
  stats: () => apiClient.get('/memory/stats'),
};

// Skill API
export const skillAPI = {
  list: () => apiClient.get('/skills'),
  get: (id: string) => apiClient.get(`/skills/${id}`),
  install: (id: string) => apiClient.post(`/skills/${id}/install`),
  uninstall: (id: string) => apiClient.post(`/skills/${id}/uninstall`),
  enable: (id: string) => apiClient.post(`/skills/${id}/enable`),
  disable: (id: string) => apiClient.post(`/skills/${id}/disable`),
  search: (query: string) => apiClient.get('/skills/search', { params: { q: query } }),
};

// Analytics API
export const analyticsAPI = {
  dashboard: () => apiClient.get('/analytics/dashboard'),
  tokens: (period: string) => apiClient.get('/analytics/tokens', { params: { period } }),
  messages: (period: string) => apiClient.get('/analytics/messages', { params: { period } }),
  costs: (period: string) => apiClient.get('/analytics/costs', { params: { period } }),
};

// System API
export const systemAPI = {
  health: () => apiClient.get('/health'),
  status: () => apiClient.get('/status'),
  config: () => apiClient.get('/config'),
  updateConfig: (data: any) => apiClient.put('/config', data),
  logs: (lines?: number) => apiClient.get('/logs', { params: { lines } }),
};

// Activity API
export const activityAPI = {
  list: (limit?: number) => apiClient.get('/activity', { params: { limit } }),
  getEvents: (agentId: string) => apiClient.get(`/activity/agent/${agentId}`),
};

export default apiClient;
