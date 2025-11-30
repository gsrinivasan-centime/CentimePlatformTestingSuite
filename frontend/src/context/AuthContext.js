import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ can_edit_users: false, can_edit_settings: false });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');
    
    if (token && refreshToken && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      authAPI.getCurrentUser()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          // Fetch user permissions
          return authAPI.getPermissions();
        })
        .then((perms) => {
          setPermissions(perms);
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      
      // Get user data
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Fetch user permissions
      try {
        const perms = await authAPI.getPermissions();
        setPermissions(perms);
      } catch (e) {
        console.error('Failed to fetch permissions:', e);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      await authAPI.register(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setPermissions({ can_edit_users: false, can_edit_settings: false });
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isSuperAdmin = () => {
    return user?.is_super_admin === true;
  };

  const isDeveloper = () => {
    return user?.role === 'developer';
  };

  const canEditUsers = () => {
    return permissions.can_edit_users || user?.role === 'admin' || user?.is_super_admin === true;
  };

  const canEditSettings = () => {
    return permissions.can_edit_settings || user?.is_super_admin === true;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    isSuperAdmin,
    isDeveloper,
    canEditUsers,
    canEditSettings,
    permissions,
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
