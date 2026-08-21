import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { MemberSession, AuthUser, Role } from '../types';
import { getMemberSession, clearMemberSession, setMemberSession } from './storage';

export interface AuthContextType {
  user: AuthUser | null;
  memberSession: MemberSession | null;
  role: Role | null;
  roomId: string | null;
  roomCode: string | null;
  isAdmin: boolean;
  isMember: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberSession, setMemberSessionState] = useState<MemberSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      // 1. Check for custom Member Session in localStorage first
      const storedMember = getMemberSession();
      if (storedMember && storedMember.roomId && storedMember.memberId) {
        setMemberSessionState(storedMember);
        setUser({
          id: storedMember.memberId,
          memberId: storedMember.memberId,
          email: storedMember.email || `${storedMember.username}@roomex.app`,
          name: storedMember.name || storedMember.username,
          avatar: storedMember.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: storedMember.role || 'member',
          roomCode: storedMember.roomCode || '',
        });
        setIsLoading(false);
        return;
      }

      // 2. Check Supabase Auth Session (for Super Admin / Admin)
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const sbUser = data.session.user;
        const displayName =
          sbUser.user_metadata?.name ||
          sbUser.user_metadata?.full_name ||
          sbUser.email?.split('@')[0] ||
          'Admin';

        setUser({
          id: sbUser.id,
          memberId: sbUser.id,
          email: sbUser.email || '',
          name: displayName,
          avatar: sbUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'super_admin',
          roomCode: '',
        });
        setMemberSessionState(null);
        setIsLoading(false);
        return;
      }

      // 3. No active session
      setUser(null);
      setMemberSessionState(null);
    } catch (err) {
      console.warn('Error verifying auth session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    // Listen for Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const sbUser = session.user;
        const displayName =
          sbUser.user_metadata?.name ||
          sbUser.user_metadata?.full_name ||
          sbUser.email?.split('@')[0] ||
          'Admin';

        setUser({
          id: sbUser.id,
          memberId: sbUser.id,
          email: sbUser.email || '',
          name: displayName,
          avatar: sbUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'super_admin',
          roomCode: '',
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    clearMemberSession();
    setMemberSessionState(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem('roomex_auth_user');
      localStorage.removeItem('roomex_active_member_id');
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/');
      }
    } catch {}
  };

  const role = user?.role || memberSession?.role || null;
  const roomId = memberSession?.roomId || null;
  const roomCode = user?.roomCode || memberSession?.roomCode || null;
  const isAdmin = role === 'super_admin' || role === 'admin';
  const isMember = role === 'member';
  const isAuthenticated = !!user || !!memberSession;

  return (
    <AuthContext.Provider
      value={{
        user,
        memberSession,
        role,
        roomId,
        roomCode,
        isAdmin,
        isMember,
        isAuthenticated,
        isLoading,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
