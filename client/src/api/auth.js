import axios from 'axios';

// Use relative URL — CRA proxy handles /api -> localhost:5000 in dev
// In production, set REACT_APP_API_URL env var to your backend URL
const BASE = process.env.REACT_APP_API_URL || 'https://codenyx-19.onrender.com';

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
export const likeVent        = (id)        => API.post(`/vents/${id}/like`);
export const dislikeVent     = (id)        => API.post(`/vents/${id}/dislike`);
export const commentVent     = (id, text)  => API.post(`/vents/${id}/comment`, { text });
export const deleteComment   = (id, cid)   => API.delete(`/vents/${id}/comment/${cid}`);
export const likeComment     = (id, cid)   => API.post(`/vents/${id}/comment/${cid}/like`);
export const dislikeComment  = (id, cid)   => API.post(`/vents/${id}/comment/${cid}/dislike`);

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
export const getAdminModeration = ()       => API.get('/admin/moderation');

// Doctor
export const getDoctorMe         = ()        => API.get('/doctor/me');
export const updateDoctorMe      = (data)    => API.patch('/doctor/me', data);
export const getDoctorActiveSos  = ()        => API.get('/doctor/active-sos');
export const getAvailableDoctors = ()        => API.get('/doctor/available');

// Admin — doctors
export const getAdminDoctors = ()          => API.get('/admin/doctors');
export const createDoctor    = (data)      => API.post('/admin/doctors', data);
export const updateDoctor    = (id, data)  => API.patch(`/admin/doctors/${id}`, data);
export const deleteDoctor    = (id)        => API.delete(`/admin/doctors/${id}`);
export const getMentorMe       = ()        => API.get('/mentor/me');
export const updateMentorMe    = (data)    => API.patch('/mentor/me', data);
export const getMentorSessions = ()        => API.get('/mentor/sessions');

// Live Chat
export const getChatMessages   = (sid, since) => API.get(`/chat/${sid}${since ? `?since=${since}` : ''}`);
export const sendChatMessage   = (sid, data)  => API.post(`/chat/${sid}`, data);
export const endChatSession    = (sid, data)  => API.post(`/chat/${sid}/end`, data);
export const getMentorActiveChats = ()        => API.get('/chat/mentor/active');

export const submitReview  = (data)      => API.post('/reviews', data);
export const getMentorReviews = (id)     => API.get(`/reviews/mentor/${id}`);
