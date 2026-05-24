import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

console.log('🌐 API Base URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Request interceptor with enhanced logging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  console.log('🔑 Token present:', !!token);
  return config;
});

// ✅ Response interceptor with enhanced error logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // ✅ Log detailed error information
    if (error.response) {
      console.error(`❌ API Error: ${error.response.status}`, {
        url: error.response.config?.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error('❌ No response from server:', error.request);
    } else {
      console.error('❌ Request setup error:', error.message);
    }

    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('token')) {
        console.warn('🔓 Unauthorized - Clearing token');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ✅ Helper to extract error messages from backend response
export const getErrorMessage = (error: any): string => {
  // Handle validation errors with details
  if (error.response?.data?.error?.details) {
    const details = error.response.data.error.details;
    const messages = Object.values(details)
      .filter((msg) => msg)
      .map((msg) => String(msg));
    return messages.join(", ") || "Validation error";
  }

  // Handle single error message
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Handle Pydantic default format
  if (error.response?.data?.detail) {
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail
        .map((e: any) => e.msg || String(e))
        .join(", ");
    }
    return error.response.data.detail;
  }

  // Default message
  return error.message || "Something went wrong";
};

export const endpoints = {
  // Auth
  login: (data: any) => api.post('/auth/login', data),
  signup: (data: any) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/password', data),
  deleteUserAccount: () => api.delete('/auth/me'),

  // Core Data
  getTransactions: () => api.get('/transactions/'),
  addTransaction: (data: any) => api.post('/transactions/', data),
  deleteTransaction: (id: string) => api.delete(`/transactions/${id}`),
  updateTransaction: (id: string, data: any) =>
    api.put(`/transactions/${id}`, data),

  // Accounts
  getAccounts: () => api.get('/accounts/'),
  createAccount: (data: any) => api.post('/accounts/', data),
  deleteAccount: (id: string) => api.delete(`/accounts/${id}`),

  // Goals
  getGoals: () => api.get('/goals/'),
  createGoal: (data: any) => api.post('/goals/', data),
  deleteGoal: (id: string) => api.delete(`/goals/${id}`),

  // Budget Settings
  getBudgetSettings: () => api.get('/budget/'),
  updateBudgetSettings: (data: any) => api.put('/budget/', data),

  // Habits
  getHabits: () => api.get('/habits/'),
  createHabit: (name: string) => api.post('/habits/', { name }),
  updateHabit: (id: string, data: any) => api.put(`/habits/${id}`, data),
  deleteHabit: (id: string) => api.delete(`/habits/${id}`),
  seedHabits: () => api.post('/habits/seed'),

  // AI (Parse Only)
  parseAI: (text: string) => api.post('/ai/parse', { text }),
  chatAI: (message: string, context?: string) =>
    api.post('/ai/chat', { message, context }),

  // Admin
  getAdminUsers: () => api.get('/admin/users'),
  getAdminUserData: (userId: string) =>
    api.get(`/admin/users/${userId}/data`),
  deleteAdminUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  updateAdminUserPassword: (userId: string, new_password: string) =>
    api.put(`/admin/users/${userId}/password`, { new_password }),
  adminCreateUser: (data: any) => api.post('/admin/users', data),

  // ✅ NEW: Monthly Planner Endpoints
  getMonthlyPlan: (month: string) => api.get(`/planner/month/${month}`),
  getAllPlans: () => api.get('/planner/plans'),
  createMonthlyPlan: (data: any) => api.post('/planner/plans', data),
  updateMonthlyPlan: (planId: string, data: any) => api.put(`/planner/plans/${planId}`, data),
  addCategoryToPlan: (planId: string, category: any) => api.post(`/planner/plans/${planId}/categories`, category),
  updateCategoryInPlan: (planId: string, categoryId: string, data: any) => api.put(`/planner/plans/${planId}/categories/${categoryId}`, data),
  deleteCategoryFromPlan: (planId: string, categoryId: string) => api.delete(`/planner/plans/${planId}/categories/${categoryId}`),
  copyMonthlyPlan: (fromMonth: string, toMonth: string) => api.post('/planner/copy-plan', { fromMonth, toMonth }),
  getMonthlyPlanStats: (planId: string) => api.get(`/planner/plans/${planId}/stats`),
};

export default api;