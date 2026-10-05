import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Business {
  id: string;
  name: string;
  type: string;
  category: string;
  is_demo: boolean;
}

interface AuthState {
  user: User | null;
  business: Business | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User, business: Business | null) => void;
  setBusiness: (business: Business) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('operix_user') || 'null'); } catch { return null; }
  })(),
  business: (() => {
    try { return JSON.parse(localStorage.getItem('operix_business') || 'null'); } catch { return null; }
  })(),
  token: localStorage.getItem('operix_token'),
  isAuthenticated: !!localStorage.getItem('operix_token'),

  setAuth: (token, user, business) => {
    localStorage.setItem('operix_token', token);
    localStorage.setItem('operix_user', JSON.stringify(user));
    if (business) localStorage.setItem('operix_business', JSON.stringify(business));
    set({ token, user, business, isAuthenticated: true });
  },

  setBusiness: (business) => {
    localStorage.setItem('operix_business', JSON.stringify(business));
    set({ business });
  },

  logout: () => {
    localStorage.removeItem('operix_token');
    localStorage.removeItem('operix_user');
    localStorage.removeItem('operix_business');
    set({ user: null, business: null, token: null, isAuthenticated: false });
  },
}));
