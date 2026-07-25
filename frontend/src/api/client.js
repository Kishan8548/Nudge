/**
 * Centralized API client for the Nudge backend.
 * Base URL points to FastAPI running on port 8000.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

export function get(endpoint) {
  return request(endpoint, { method: 'GET' });
}

export function post(endpoint, data) {
  if (data instanceof FormData) {
    return request(endpoint, { method: 'POST', body: data });
  }
  return request(endpoint, { method: 'POST', body: JSON.stringify(data) });
}

export function patch(endpoint, data) {
  return request(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
}

export function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}

// ----- API functions -----

export const api = {
  // Health
  health: () => get('/api/health'),

  // Upload
  uploadMeeting: (file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    return post('/api/upload', formData);
  },

  // Meetings
  listMeetings: (skip = 0, limit = 20) =>
    get(`/api/meetings?skip=${skip}&limit=${limit}`),

  getMeeting: (id) => get(`/api/meetings/${id}`),

  processMeeting: (id) => post(`/api/meetings/${id}/process`),

  deleteMeeting: (id) => del(`/api/meetings/${id}`),

  // Action Items
  listActionItems: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.meeting_id) query.set('meeting_id', params.meeting_id);
    if (params.skip) query.set('skip', params.skip);
    if (params.limit) query.set('limit', params.limit);
    return get(`/api/action-items?${query.toString()}`);
  },

  getActionItem: (id) => get(`/api/action-items/${id}`),

  updateActionItem: (id, data) => patch(`/api/action-items/${id}`, data),

  triggerReminder: (id) => post(`/api/action-items/${id}/remind`),

  getActivityLog: (id) => get(`/api/action-items/${id}/activity-log`),

  reviewActionItem: (id, decision) =>
    post(`/api/action-items/${id}/review`, decision),

  // Scheduler
  triggerScheduler: () => post('/api/scheduler/trigger'),

  // RAG / Semantic Search
  ragSearch: (query, limit = 3) => post('/api/rag/search', { query, limit }),
  getSimilarMeetings: (meetingId, limit = 3) =>
    get(`/api/rag/similar/${meetingId}?limit=${limit}`),
  getSimilarItems: (query, limit = 5) =>
    get(`/api/rag/similar-items?query=${encodeURIComponent(query)}&limit=${limit}`),
  getRagSetupInstructions: () => get('/api/rag/setup-instructions'),

  // Analytics
  getAnalytics: () => get('/api/analytics'),
};
