'use client';

import { useAuth } from '@/context/AuthContext';

/**
 * Resolves admin session authorization state from AuthContext.
 */
export function useAdminAccess() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isAuthorized = !isLoading && isAuthenticated && user?.role === 'admin';

  return {
    user,
    isAuthenticated,
    isLoading,
    isAuthorized,
  };
}
