import api from './client';

export const auth = {
  signup: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const business = {
  get: () => api.get('/business'),
  create: (data: { name: string; type: string; category: string }) =>
    api.post('/business', data),
  update: (data: { name: string; type: string; category: string }) =>
    api.put('/business', data),
};

export const analytics = {
  dashboard: () => api.get('/analytics/dashboard'),
};

export const sales = {
  list: (days = 30) => api.get(`/sales?days=${days}`),
  trend: (days = 30) => api.get(`/sales/trend?days=${days}`),
  byProduct: (days = 30) => api.get(`/sales/by-product?days=${days}`),
};

export const inventory = {
  list: () => api.get('/inventory'),
};

export const forecast = {
  all: (days = 30) => api.get(`/forecast?days=${days}`),
  chart: (productId: string, days = 30) => api.get(`/forecast/chart/${productId}?days=${days}`),
};

export const risks = {
  list: () => api.get('/risks'),
};

export const recommendations = {
  list: () => api.get('/recommendations'),
};

export const assistant = {
  chat: (message: string) => api.post('/assistant/chat', { message }),
};

export const demo = {
  seed: () => api.post('/demo/seed'),
  clear: () => api.delete('/demo/clear'),
};

export const data = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/data/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  import: (file_id: string, mapping: Record<string, string>) =>
    api.post('/data/import', { file_id, mapping }),
};
