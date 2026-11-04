'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthContextType } from '@/types/auth';
import { api, ApiError } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'bidnow_token';
const USER_KEY = 'bidnow_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage and verify with backend
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              // Ignore parse error
            }
          }

          // Verify with backend
          try {
            const profile = await api.get('/users/profile');
            if (profile) {
              const fullUser: User = {
                id: profile._id || profile.id,
                email: profile.email,
                displayName: profile.displayName,
                role: profile.role,
                avatar: profile.avatar,
                contactInfo: profile.contactInfo,
                isSuspended: profile.isSuspended,
                createdAt: profile.createdAt,
              };
              setUser(fullUser);
              localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
            }
          } catch (err) {
            // If token expired or rejected, clear local session
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              setToken(null);
              setUser(null);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res && res.token && res.user) {
        const loggedInUser: User = {
          id: res.user._id || res.user.id,
          email: res.user.email,
          displayName: res.user.displayName,
          role: res.user.role,
          avatar: res.user.avatar,
          contactInfo: res.user.contactInfo,
          isSuspended: res.user.isSuspended,
          createdAt: res.user.createdAt,
        };

        setToken(res.token);
        setUser(loggedInUser);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : (err?.message || 'Login failed');
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await api.post('/auth/register', { email, password, displayName });
      if (res && res.token && res.user) {
        const newUser: User = {
          id: res.user._id || res.user.id,
          email: res.user.email,
          displayName: res.user.displayName,
          role: res.user.role,
          avatar: res.user.avatar,
          contactInfo: res.user.contactInfo,
          isSuspended: res.user.isSuspended,
          createdAt: res.user.createdAt,
        };

        setToken(res.token);
        setUser(newUser);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        return { success: true };
      }
      return { success: false, error: 'Registration succeeded without token' };
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : (err?.message || 'Registration failed');
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

