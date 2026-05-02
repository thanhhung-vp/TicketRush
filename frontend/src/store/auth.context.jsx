import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service.js';

const AuthContext = createContext(null);

function saveTokens({ accessToken, refreshToken }) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('token', accessToken);
}

function clearTokens() {
  ['accessToken', 'refreshToken', 'token'].forEach(k => localStorage.removeItem(k));
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    authService.getMe()
      .then(setUser)
      .catch(clearTokens)
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    saveTokens(data);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    saveTokens(data);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try { if (refreshToken) await authService.logout(refreshToken); } catch {}
    clearTokens();
    setUser(null);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
