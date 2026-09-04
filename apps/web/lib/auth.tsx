'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiGet, setToken, clearToken, getToken } from './api';

export type UserRole = 'MEMBER' | 'YEAR_ADMIN' | 'MODERATOR' | 'EXECUTIVE' | 'ADMIN' | 'SUPER_ADMIN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface AlumniProfile {
  id: string;
  fullName: string;
  nickname?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  graduationYear: number;
  house?: string | null;
  className?: string | null;
  positionHeld?: string | null;
  country?: string | null;
  city?: string | null;
  profession?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  searchable: boolean;
}

export interface YearGroupMembership {
  id: string;
  userId: string;
  yearGroupId: string;
  title?: string | null;
  isLeader: boolean;
  joinedAt: string;
  yearGroup: { id: string; year: number; name: string };
}

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  verification: VerificationStatus;
  profile?: AlumniProfile | null;
  memberships?: YearGroupMembership[];
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiGet<User>('/auth/me');
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
