import axios from 'axios';

// Use relative URL — CRA proxy handles /api -> localhost:5000 in dev
// In production, set REACT_APP_API_URL env var to your backend URL
const BASE = process.env.REACT_APP_API_URL || '';

const API = axios.create({ baseURL: `${BASE}/api` });

API.interceptors.request.use(cfg => {
  const saved = localStorage.getItem('mb_session');
  if (saved) {
    try { cfg.headers.Authorization = `Bearer ${JSON.parse(saved).token}`; } catch {}
  }
  return cfg;
});

export const loginUser       = (data)      => API.post('/auth/login', data);
export const registerUser    = (data)      => API.post('/auth/register', data);

export const getVents        = ()          => API.get('/vents');
export const postVent        = (data)      => API.post('/vents', data);
export const reactToVent     = (id, emoji) => API.post(`/vents/${id}/react`, { emoji });

export const logMood         = (data)      => API.post('/mood', data);
export const getMoodLogs     = ()          => API.get('/mood/me');
export const getTodayMoods   = ()          => API.get('/mood/today');

export const getVolunteers   = ()          => API.get('/volunteers');
export const saveChatSession = (data)      => API.post('/volunteers/chat', data);

export const getClinics      = ()          => API.get('/clinics');
export const bookClinic      = (id)        => API.post(`/clinics/${id}/book`);

export const getStats        = ()          => API.get('/stats');
export const getHealthCard   = ()          => API.get('/healthcard/me');

export const getJournal      = ()          => API.get('/journal');
export const postJournal     = (data)      => API.post('/journal', data);
export const deleteJournal   = (id)        => API.delete(`/journal/${id}`);

// Admin
export const getAdminStats   = ()          => API.get('/admin/stats');
export const getAdminMentors = ()          => API.get('/admin/mentors');
export const createMentor    = (data)      => API.post('/admin/mentors', data);
export const updateMentor    = (id, data)  => API.patch(`/admin/mentors/${id}`, data);
export const deleteMentor    = (id)        => API.delete(`/admin/mentors/${id}`);
export const getAdminUsers   = ()          => API.get('/admin/users');
export const updateUser      = (id, data)  => API.patch(`/admin/users/${id}`, data);
export const getAdminVents   = ()          => API.get('/admin/vents');
export const deleteVent      = (id)        => API.delete(`/admin/vents/${id}`);

// Mentor
export const getMentorMe       = ()        => API.get('/mentor/me');
export const updateMentorMe    = (data)    => API.patch('/mentor/me', data);
export const getMentorSessions = ()        => API.get('/mentor/sessions');

// Live Chat
export const getChatMessages   = (sid, since) => API.get(`/chat/${sid}${since ? `?since=${since}` : ''}`);
export const sendChatMessage   = (sid, data)  => API.post(`/chat/${sid}`, data);
export const endChatSession    = (sid, data)  => API.post(`/chat/${sid}/end`, data);
export const getMentorActiveChats = ()        => API.get('/chat/mentor/active');
