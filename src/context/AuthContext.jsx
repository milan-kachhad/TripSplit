/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if a valid token exists on load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token) {
        // Pre-fill user from storage to prevent flash of unauthenticated state
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore JSON parse error
          }
        }

        try {
          // Verify with backend
          const response = await api.get('/auth/me');
          if (response.data?.user) {
            const userData = response.data.user;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (error) {
          if (error.response?.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login with either Email OR Username
  const login = async (identifier, password) => {
    const trimmed = (identifier || '').trim();
    try {
      const response = await api.post('/auth/login', {
        identifier: trimmed,
        password,
      });

      const { token, user: loggedInUser } = response.data;

      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return { success: true, data: response.data };
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  // Register function (Username + Email + Password)
  const register = async (username, email, password) => {
    const trimmedUsername = (username || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();

    try {
      const response = await api.post('/auth/register', {
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });
      const { token, user: newUser } = response.data;

      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true, data: response.data };
    } catch (error) {
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
