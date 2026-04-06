import { useState, useEffect, useCallback } from 'react';
import pb from '../lib/pocketbase';

const PB_AUTH_KEY = 'pb_auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem(PB_AUTH_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError('');
    try {
      const authData = await pb.collection('_superusers').authWithPassword(email, password);
      localStorage.setItem(PB_AUTH_KEY, authData.token);
      setIsAuthenticated(true);
      return true;
    } catch {
      setError('Invalid email or password.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    localStorage.removeItem(PB_AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(PB_AUTH_KEY);
    if (token) {
      pb.authStore.save(token, null);
    }
  }, []);

  return { isAuthenticated, isLoading, error, login, logout };
}
