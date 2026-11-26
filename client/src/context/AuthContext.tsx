'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, AuthContextType } from '@/types/auth';
import { api, ApiError } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'bidnow_token';
const USER_KEY = 'bidnow_user';

function normalizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = (raw as { user?: unknown }).user ?? raw;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const data = candidate as Record<string, unknown>;
  const id = typeof data._id === 'string' ? data._id : typeof data.id === 'string' ? data.id : '';
  const email = typeof data.email === 'string' ? data.email : '';

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role: data.role === 'admin' ? 'admin' : 'user',
    avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
    contactInfo: typeof data.contactInfo === 'string' ? data.contactInfo : undefined,
    isSuspended: typeof data.isSuspended === 'boolean' ? data.isSuspended : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage and verify with backend
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function initAuth() {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken) {
          let cachedUser: User | null = null;
          if (storedUser) {
            try {
              cachedUser = normalizeUser(JSON.parse(storedUser));
              if (!cachedUser) {
                localStorage.removeItem(USER_KEY);
              }
            } catch {
              localStorage.removeItem(USER_KEY);
            }
          }

          // Verify with backend before flipping isAuthenticated
          try {
            const profile = await api.get('/users/profile', { signal: controller.signal });
            if (!isMounted || controller.signal.aborted) return;

            const fullUser = normalizeUser(profile);
            if (fullUser) {
              setToken(storedToken);
              setUser(fullUser);
              localStorage.setItem(USER_KEY, JSON.stringify(fullUser));
            } else {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              setToken(null);
              setUser(null);
            }
          } catch (err) {
            if (!isMounted || controller.signal.aborted) return;
            // If token expired, rejected, or user suspended, clear local session
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              setToken(null);
              setUser(null);
            } else if (cachedUser) {
              // Transient network/server error: fall back to cached user after verification attempt
              setToken(storedToken);
              setUser(cachedUser);
            }
          }
        }
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Persist user profile changes to localStorage outside state updaters
  useEffect(() => {
    if (isLoading) return;
    if (user && token) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user, token, isLoading]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const loggedInUser = normalizeUser(res?.user);
      if (res && res.token && loggedInUser) {
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
      const newUser = normalizeUser(res?.user);
      if (res && res.token && newUser) {
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
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

