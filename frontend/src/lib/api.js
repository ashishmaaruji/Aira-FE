import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Webcall APIs
export const webcallStart = (data) => api.post('/webcall/start', data);
export const webcallInput = (data) => api.post('/webcall/input', data);
export const webcallEnd = (data) => api.post('/webcall/end', data);

// Live Calls
export const getLiveCalls = () => api.get('/calls/live');

// Call History
export const getCalls = (params) => api.get('/calls', { params });
export const getCallDetail = (callId) => api.get(`/calls/${callId}`);
export const getCallQualification = (callId) => api.get(`/calls/${callId}/qualification`);

// FSM States
export const getFSMStates = () => api.get('/fsm/states');
export const getFSMState = (state) => api.get(`/fsm/states/${state}`);

// Prompts
export const getPrompts = (params) => api.get('/prompts', { params });
export const getPrompt = (promptId) => api.get(`/prompts/${promptId}`);
export const createPrompt = (data) => api.post('/prompts', data);
export const updatePrompt = (promptId, data) => api.put(`/prompts/${promptId}`, data);
export const markPromptWeak = (promptId, data) => api.post(`/prompts/${promptId}/mark-weak`, data);
export const publishPrompt = (promptId) => api.post(`/prompts/${promptId}/publish`);

// Stats
export const getStats = () => api.get('/stats');

// Health
export const healthCheck = () => api.get('/health');

export default api;
