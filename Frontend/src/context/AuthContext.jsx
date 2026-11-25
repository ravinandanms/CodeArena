import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('codearena_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('codearena_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('codearena_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('codearena_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out');
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data?.success) {
      const { user: userData, token: userToken } = res.data.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('codearena_user', JSON.stringify(userData));
      localStorage.setItem('codearena_token', userToken);
      return userData;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const register = async (teamData) => {
    const res = await api.post('/auth/register', teamData);
    if (res.data?.success) {
      const { user: userData, token: userToken } = res.data.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('codearena_user', JSON.stringify(userData));
      localStorage.setItem('codearena_token', userToken);
      return userData;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('codearena_user');
    localStorage.removeItem('codearena_token');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'ADMIN',
    isTeam: user?.role === 'TEAM',
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
