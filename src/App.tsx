/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Utensils, 
  Scale, 
  PieChart, 
  Plus, 
  ShieldAlert, 
  Building2, 
  Download, 
  Sparkles, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  Users, 
  Home, 
  X, 
  Wallet, 
  ArrowUpRight, 
  Share2, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  Sparkle,
  Crown,
  LayoutDashboard,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { 
  RoomData, 
  Member, 
  Expense, 
  DailyMealEntry, 
  Settlement, 
  Role, 
  MemberPermissions, 
  RoomSettings, 
  AuditLog, 
  AuthUser, 
  MembershipType, 
  CleaningSchedule as CleaningScheduleType, 
  CleaningHistoryEntry, 
  MonthlySnapshot 
} from './types';
import { 
  loadRoomData, 
  saveRoomData, 
  getActiveMemberId, 
  setActiveMemberId, 
  syncRoomWithSupabase, 
  INITIAL_ROOM_DATA, 
  DEFAULT_PERMISSIONS, 
  calculateMessMetrics, 
  calculateNetBalances,
  getMemberSession,
  clearMemberSession,
  generateRoomCode,
  fetchRoomFromSupabase,
  deleteMemberFromSupabase,
  updateMemberExpenseTogglesInSupabase
} from './lib/storage';
import { SupabaseSyncStatus, supabase } from './lib/supabase';
import { 
  initPWA, 
  subscribeToInstallPrompt, 
  promptPWAInstall, 
  getPWAActionFromURL 
} from './lib/pwa';

// Components
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { ExpenseList } from './components/ExpenseList';
import { MessManager } from './components/MessManager';
import { CleaningSchedule } from './components/CleaningSchedule';
import { BalancesAndSettle } from './components/BalancesAndSettle';
import { SummaryReports } from './components/SummaryReports';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AdminDelegationModal } from './components/AdminDelegationModal';
import { RoomSettingsModal } from './components/RoomSettingsModal';
import { MemberDashboard } from './components/MemberDashboard';
import { SuperAdminTab } from './components/SuperAdminTab';
import { ProfilePhotoModal } from './components/ProfilePhotoModal';
import { AppLogo } from './components/AppLogo';

const AUTH_STORAGE_KEY = 'roomex_auth_user_v1';

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Main Room Data State (must be initialized first)
  const [roomData, setRoomData] = useState<RoomData>(() => loadRoomData());

  // Active Acting Member ID
  const [activeMemberId, setActiveMemberIdState] = useState<string>(() => 
    getActiveMemberId(loadRoomData().members)
  );

  // Auth User State - strictly null if not logged in
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const memberSess = getMemberSession();
      if (memberSess) {
        return {
          id: memberSess.memberId,
          memberId: memberSess.memberId,
          email: memberSess.email || '',
          name: memberSess.name,
          avatar: memberSess.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: memberSess.role || 'member',
          roomCode: memberSess.roomCode,
        };
      }
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Active View Tab (Default to clean mobile-optimized Overview)
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'mess' | 'cleaning' | 'balances' | 'summary' | 'super_admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/expenses') return 'expenses';
      if (path === '/mess') return 'mess';
      if (path === '/cleaning') return 'cleaning';
      if (path === '/balances') return 'balances';
      if (path === '/summary') return 'summary';
      if (path.startsWith('/admin')) return 'super_admin';
    }
    return 'overview';
  });

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfilePhotoModalOpen, setIsProfilePhotoModalOpen] = useState(false);
  const [profilePhotoTargetMember, setProfilePhotoTargetMember] = useState<Member | null>(null);

  // Supabase sync status
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>({
    connected: true,
    lastSyncedAt: null,
    syncing: false,
    error: null,
  });

  // PWA install prompt status
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  // Current active acting member object with clean fallback for fresh rooms
  const activeMember: Member = roomData.members.find(m => m.id === activeMemberId) || roomData.members[0] || {
    id: authUser?.memberId || 'admin_1',
    name: authUser?.name || 'Admin',
    username: authUser?.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'admin',
    email: authUser?.email || 'admin@roomex.app',
    role: authUser?.role || 'super_admin',
    permissions: DEFAULT_PERMISSIONS[authUser?.role || 'super_admin'],
    avatar: authUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    isMessActive: true,
    membershipType: 'both',
    depositBalance: 0,
    daysStayed: 30,
    joinedAt: new Date().toISOString(),
  };

  // Safe Tab Change with Route Protection
  const handleTabChange = (newTab: 'overview' | 'expenses' | 'mess' | 'cleaning' | 'balances' | 'summary' | 'super_admin') => {
    // Member protection: Members can NEVER access super_admin
    if (newTab === 'super_admin' && activeMember.role !== 'super_admin' && activeMember.role !== 'admin') {
      setActiveTab('overview');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', '/member/dashboard');
      }
      return;
    }
    setActiveTab(newTab);
    if (typeof window !== 'undefined' && window.history) {
      const pathMap: Record<string, string> = {
        overview: '/member/dashboard',
        expenses: '/expenses',
        mess: '/mess',
        cleaning: '/cleaning',
        balances: '/balances',
        summary: '/summary',
        super_admin: '/admin/dashboard',
      };
      window.history.pushState({}, '', pathMap[newTab] || '/');
    }
  };

  // Auth Login Handler
  const handleLogin = (user: AuthUser, loadedRoomData?: RoomData) => {
    let targetRoom = loadedRoomData || roomData;

    // If user is not yet in targetRoom.members, add them as real member
    const existingMember = targetRoom.members.find(m => m.id === user.memberId || m.email?.toLowerCase() === user.email.toLowerCase());
    if (!existingMember) {
      const isSuper = user.role === 'super_admin' || targetRoom.members.length === 0;
      const assignedRole: Role = isSuper ? 'super_admin' : (user.role || 'member');
      const newM: Member = {
        id: user.memberId || `user_${Date.now()}`,
        name: user.name || 'Admin',
        username: user.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'admin',
        email: user.email,
        role: assignedRole,
        permissions: DEFAULT_PERMISSIONS[assignedRole],
        avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        joinedAt: new Date().toISOString(),
        isMessActive: true,
        membershipType: 'both',
        depositBalance: 0,
        daysStayedInMonth: targetRoom.settings.daysInMonth || 30,
      };
      targetRoom = {
        ...targetRoom,
        settings: {
          ...targetRoom.settings,
          roomCode: user.roomCode || targetRoom.settings.roomCode || generateRoomCode(),
        },
        members: [...targetRoom.members, newM],
      };
    }

    setRoomData(targetRoom);
    saveRoomData(targetRoom);
    setAuthUser(user);
    setActiveMemberIdState(user.memberId);
    setActiveMemberId(user.memberId);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {}

    // Strict Role-Based View Routing
    if (user.role === 'member') {
      setActiveTab('overview');
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', '/member/dashboard');
      }
    } else if (user.role === 'super_admin' || user.role === 'admin') {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        setActiveTab('super_admin');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
    try {
      clearMemberSession();
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
    setAuthUser(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/login');
    }
  };

  // Protect private pages & role routes
  useEffect(() => {
    let isMounted = true;

    const verifySessionAndProtect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const memberSession = getMemberSession();
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

        // 1. Check Member Session (Strict role isolation)
        if (memberSession) {
          // If member attempts to visit /admin, redirect back to /member/dashboard
          if (currentPath.startsWith('/admin')) {
            if (typeof window !== 'undefined' && window.history) {
              window.history.replaceState({}, '', '/member/dashboard');
            }
            setActiveTab('overview');
          }
          if (!authUser && isMounted) {
            let freshRoom: RoomData | null = null;
            if (memberSession.roomCode || memberSession.roomId) {
              try {
                freshRoom = await fetchRoomFromSupabase(memberSession.roomCode || memberSession.roomId);
              } catch (e) {}
            }

            const memberAuthUser: AuthUser = {
              id: memberSession.memberId,
              memberId: memberSession.memberId,
              email: memberSession.email || '',
              name: memberSession.name,
              avatar: memberSession.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: memberSession.role || 'member',
              roomCode: memberSession.roomCode,
            };
            handleLogin(memberAuthUser, freshRoom || undefined);
          }
          return;
        }

        // 2. Check Supabase Admin Session
        if (session) {
          if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/member-login') {
            if (typeof window !== 'undefined' && window.history) {
              window.history.replaceState({}, '', '/');
            }
          }
          if (currentPath.startsWith('/admin') && activeTab !== 'super_admin') {
            setActiveTab('super_admin');
          }

          if (!authUser && isMounted) {
            const user = session.user;
            const displayName = 
              user.user_metadata?.name || 
              user.user_metadata?.full_name || 
              user.email?.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
              'Admin';

            const authU: AuthUser = {
              id: user.id,
              memberId: user.id,
              email: user.email || '',
              name: displayName,
              avatar: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: 'super_admin',
              roomCode: roomData.settings.roomCode || generateRoomCode(),
            };
            handleLogin(authU);
          }
          return;
        }

        // 3. Neither Supabase session nor memberSession exists
        const localUserRaw = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
        if (!localUserRaw && !authUser) {
          if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/member-login') {
            if (typeof window !== 'undefined' && window.history) {
              window.history.replaceState({}, '', '/login');
            }
          }
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      }
    };

    verifySessionAndProtect();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        if (currentPath === '/login' || currentPath === '/signup') {
          if (typeof window !== 'undefined' && window.history) {
            window.history.replaceState({}, '', '/');
          }
        }

        if (!authUser) {
          const user = session.user;
          const displayName = 
            user.user_metadata?.name || 
            user.user_metadata?.full_name || 
            user.email?.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
            'Admin';

          const authU: AuthUser = {
            id: user.id,
            memberId: user.id,
            email: user.email || '',
            name: displayName,
            avatar: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: 'super_admin',
            roomCode: roomData.settings.roomCode || generateRoomCode(),
          };
          handleLogin(authU);
        }
      } else if (event === 'SIGNED_OUT') {
        clearMemberSession();
        setAuthUser(null);
        try {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {}
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, '', '/login');
        }
      }
    });

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/expenses') setActiveTab('expenses');
      else if (path === '/mess') setActiveTab('mess');
      else if (path === '/cleaning') setActiveTab('cleaning');
      else if (path === '/balances') setActiveTab('balances');
      else if (path === '/summary') setActiveTab('summary');
      else if (path.startsWith('/admin')) {
        const memSess = getMemberSession();
        if (memSess && memSess.role === 'member') {
          window.history.replaceState({}, '', '/member/dashboard');
          setActiveTab('overview');
        } else {
          setActiveTab('super_admin');
        }
      } else {
        setActiveTab('overview');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync state to localStorage & Supabase whenever roomData changes
  useEffect(() => {
    saveRoomData(roomData);
    if (roomData.settings?.roomCode && roomData.members.length > 0) {
      syncRoomWithSupabase(roomData).then(result => {
        setSupabaseStatus(prev => ({
          ...prev,
          connected: result.success,
          lastSyncedAt: result.success ? new Date().toLocaleTimeString() : prev.lastSyncedAt,
          syncing: false,
          error: result.success ? null : result.message,
        }));
      });
    }
  }, [roomData]);

  // Initial Supabase Sync & PWA setup
  useEffect(() => {
    initPWA();
    const unsubscribePWA = subscribeToInstallPrompt((canInstall) => {
      setCanInstallPWA(canInstall);
    });

    const action = getPWAActionFromURL();
    if (action === 'add') {
      setIsAddExpenseOpen(true);
    } else if (action === 'summary') {
      setActiveTab('summary');
    }

    const runBackgroundSync = async () => {
      setSupabaseStatus(prev => ({ ...prev, syncing: true }));
      const result = await syncRoomWithSupabase(roomData);
      setSupabaseStatus({
        connected: result.success,
        lastSyncedAt: result.success ? new Date().toLocaleTimeString() : null,
        syncing: false,
        error: result.success ? null : result.message,
      });
    };

    runBackgroundSync();

    return () => {
      unsubscribePWA();
    };
  }, []);

  const handleSyncSupabase = async () => {
    setSupabaseStatus(prev => ({ ...prev, syncing: true }));
    const result = await syncRoomWithSupabase(roomData);
    setSupabaseStatus({
      connected: result.success,
      lastSyncedAt: result.success ? new Date().toLocaleTimeString() : null,
      syncing: false,
      error: result.success ? null : result.message,
    });
  };

  const handleInstallPWA = async () => {
    const installed = await promptPWAInstall();
    if (installed) {
      setCanInstallPWA(false);
      setShowPwaBanner(false);
    }
  };

  // Active Member Switcher
  const handleSelectActiveMember = (memberId: string) => {
    setActiveMemberIdState(memberId);
    setActiveMemberId(memberId);
    const targetMember = roomData.members.find(m => m.id === memberId);
    if (targetMember && authUser) {
      const updatedAuth: AuthUser = {
        ...authUser,
        memberId: targetMember.id,
        email: targetMember.email,
        name: targetMember.name,
        avatar: targetMember.avatar,
        role: targetMember.role,
      };
      setAuthUser(updatedAuth);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuth));
      } catch {}
    }
  };

  // Expense Handlers
  const handleSaveExpense = (expense: Expense) => {
    const sanitizedAmount = Math.round((Number(expense.amount) || 0) * 100) / 100;
    const sanitizedSplits = (expense.splits || []).map(s => ({
      ...s,
      amount: Math.round((Number(s.amount) || 0) * 100) / 100,
    }));

    const cleanExpense: Expense = {
      ...expense,
      id: expense.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      roomId: expense.roomId || roomData.settings.id,
      amount: sanitizedAmount,
      splits: sanitizedSplits,
      createdAt: expense.createdAt || new Date().toISOString(),
    };

    const isEdit = roomData.expenses.some(e => e.id === cleanExpense.id);
    let updatedExpenses: Expense[];
    let logAction = '';

    if (isEdit) {
      updatedExpenses = roomData.expenses.map(e => e.id === cleanExpense.id ? cleanExpense : e);
      logAction = `Edited expense "${cleanExpense.title}" (${roomData.settings.currencySymbol}${cleanExpense.amount.toFixed(2)})`;
    } else {
      updatedExpenses = [cleanExpense, ...roomData.expenses];
      logAction = `Added expense "${cleanExpense.title}" (${roomData.settings.currencySymbol}${cleanExpense.amount.toFixed(2)})`;
    }

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: isEdit ? 'expense_edited' : 'expense_created',
      details: logAction,
      timestamp: new Date().toISOString(),
    };

    setRoomData(prev => ({
      ...prev,
      expenses: updatedExpenses,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    setIsAddExpenseOpen(false);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const expense = roomData.expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: 'expense_deleted',
      details: `Deleted expense "${expense.title}" (${roomData.settings.currencySymbol}${expense.amount.toFixed(2)})`,
      timestamp: new Date().toISOString(),
    };

    setRoomData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expenseId),
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));
  };

  // Mess & Daily Meals Handler
  const handleUpdateDailyMeal = (mealEntry: DailyMealEntry) => {
    const existingIndex = roomData.meals.findIndex(m => m.date === mealEntry.date);
    let updatedMeals: DailyMealEntry[];

    if (existingIndex >= 0) {
      updatedMeals = roomData.meals.map(m => m.date === mealEntry.date ? mealEntry : m);
    } else {
      updatedMeals = [...roomData.meals, mealEntry];
    }

    setRoomData(prev => ({
      ...prev,
      meals: updatedMeals,
    }));
  };

  // Stayed Days Handler (User Rule: Admin only modifies - affects all mess calculation immediately)
  const handleUpdateMemberDaysStayed = (memberId: string, days: number) => {
    const validDays = Math.max(0, Math.min(roomData.settings.daysInMonth || 31, days));
    setRoomData(prev => {
      const updatedMembers = prev.members.map(m => 
        m.id === memberId 
          ? { ...m, daysStayed: validDays, daysStayedInMonth: validDays } 
          : m
      );
      const updatedRoom: RoomData = {
        ...prev,
        members: updatedMembers,
      };
      syncRoomWithSupabase(updatedRoom);
      return updatedRoom;
    });
  };

  // Profile Photo Avatar Handler (User Rule: Option to add profile photo of member and admin)
  const handleUpdateMemberAvatar = (memberId: string, avatarUrl: string) => {
    setRoomData(prev => {
      const updatedMembers = prev.members.map(m => 
        m.id === memberId ? { ...m, avatar: avatarUrl } : m
      );
      const updatedRoom: RoomData = {
        ...prev,
        members: updatedMembers,
      };
      syncRoomWithSupabase(updatedRoom);
      return updatedRoom;
    });

    if (authUser && (authUser.memberId === memberId || authUser.id === memberId)) {
      const updatedUser: AuthUser = {
        ...authUser,
        avatar: avatarUrl,
      };
      setAuthUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  // Membership Type Handler (User Rule: Admin sets Both / Rent Only / Mess Only)
  const handleUpdateMemberMembershipType = (memberId: string, type: MembershipType) => {
    setRoomData(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === memberId ? { 
        ...m, 
        membershipType: type,
        isMessActive: type !== 'rent_only' 
      } : m),
    }));
  };

  // Days In Month Handler
  const handleUpdateDaysInMonth = (days: number) => {
    setRoomData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        daysInMonth: days,
      },
    }));
  };

  // Deposit Handler
  const handleUpdateDepositBalance = (memberId: string, deltaAmount: number) => {
    const member = roomData.members.find(m => m.id === memberId);
    if (!member) return;

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: 'deposit_adjusted',
      details: `Added ${roomData.settings.currencySymbol}${deltaAmount.toFixed(2)} to ${member.name}'s mess advance pool`,
      timestamp: new Date().toISOString(),
    };

    setRoomData(prev => ({
      ...prev,
      members: prev.members.map(m => 
        m.id === memberId 
          ? { ...m, depositBalance: Math.max(0, m.depositBalance + deltaAmount) }
          : m
      ),
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));
  };

  // Cleaning Schedule Handler
  const handleUpdateCleaningSchedule = (newSchedule: CleaningScheduleType, newHistoryEntry: CleaningHistoryEntry) => {
    setRoomData(prev => ({
      ...prev,
      cleaningSchedule: newSchedule,
      cleaningHistory: [newHistoryEntry, ...(prev.cleaningHistory || [])],
    }));
  };

  // Monthly Archive Snapshot Handler
  const handleSaveMonthlyArchive = (snapshot: MonthlySnapshot) => {
    setRoomData(prev => {
      const existing = prev.monthlyArchives || [];
      const filtered = existing.filter(a => a.id !== snapshot.id);
      return {
        ...prev,
        monthlyArchives: [snapshot, ...filtered],
      };
    });
  };

  // Settlement Handler
  const handleRecordSettlement = (settlement: Settlement) => {
    const fromM = roomData.members.find(m => m.id === settlement.fromMemberId);
    const toM = roomData.members.find(m => m.id === settlement.toMemberId);

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: 'settlement_recorded',
      details: `${fromM?.name || 'Member'} paid ${roomData.settings.currencySymbol}${settlement.amount.toFixed(2)} to ${toM?.name || 'Member'} via ${settlement.paymentMethod.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    };

    setRoomData(prev => ({
      ...prev,
      settlements: [settlement, ...prev.settlements],
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));
  };

  // Role Delegation Handler
  const handleUpdateMemberRole = (
    targetMemberId: string, 
    newRole: Role, 
    newPermissions?: Partial<MemberPermissions>
  ) => {
    const targetMember = roomData.members.find(m => m.id === targetMemberId);
    if (!targetMember) return;

    let updatedMembers = roomData.members.map(m => {
      if (m.id === targetMemberId) {
        const basePerms = DEFAULT_PERMISSIONS[newRole];
        return {
          ...m,
          role: newRole,
          permissions: {
            ...basePerms,
            ...(newPermissions || {}),
          },
        };
      }
      if (newRole === 'super_admin' && m.role === 'super_admin' && m.id !== targetMemberId) {
        return {
          ...m,
          role: 'admin' as Role,
          permissions: DEFAULT_PERMISSIONS.admin,
        };
      }
      return m;
    });

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: 'role_delegated',
      details: `Changed ${targetMember.name}'s role to ${newRole.toUpperCase().replace('_', ' ')}`,
      timestamp: new Date().toISOString(),
    };

    setRoomData(prev => ({
      ...prev,
      members: updatedMembers,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));
  };

  // Add New Roommate Handler (Allocated by Super Admin or Admin)
  const handleAddNewMember = (
    name: string, 
    email: string, 
    role: Role, 
    deposit: number,
    membershipType: MembershipType = 'both',
    username?: string,
    password?: string,
    phone?: string,
    upiId?: string
  ) => {
    const avatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    ];
    const newId = `usr_${Date.now()}`;
    let cleanUsername = (username || name.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Math.floor(100 + Math.random() * 900)}`).trim();
    
    // Prevent duplicate username entries within the same room_id
    const existingUsernames = new Set(
      roomData.members.map(m => (m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, '')).toLowerCase())
    );
    if (existingUsernames.has(cleanUsername.toLowerCase())) {
      let counter = 2;
      while (existingUsernames.has(`${cleanUsername.toLowerCase()}${counter}`)) {
        counter++;
      }
      cleanUsername = `${cleanUsername}${counter}`;
    }

    const cleanPassword = (password || 'password123').trim();

    const newMember: Member = {
      id: newId,
      name,
      username: cleanUsername,
      email: email || `${cleanUsername}@roomex.app`,
      password: cleanPassword,
      allocatedPassword: cleanPassword,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      avatar: avatars[roomData.members.length % avatars.length],
      isMessActive: membershipType !== 'rent_only',
      membershipType,
      depositBalance: deposit,
      daysStayedInMonth: roomData.settings.daysInMonth || 30,
      joinedAt: new Date().toISOString(),
      phone,
      upiId,
      allocatedBy: activeMember?.name || 'Super Admin',
    };

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: 'member_added',
      details: `Added new roommate "${name}" (@${cleanUsername}) as ${role.toUpperCase().replace('_', ' ')} with allocated credentials`,
      timestamp: new Date().toISOString(),
    };

    // Update cleaning rota order with new member
    const updatedRota = [...(roomData.cleaningSchedule?.rotaOrder || roomData.members.map(m => m.id)), newId];

    const updatedRoom: RoomData = {
      ...roomData,
      members: [...roomData.members, newMember],
      cleaningSchedule: {
        ...(roomData.cleaningSchedule || INITIAL_ROOM_DATA.cleaningSchedule),
        rotaOrder: updatedRota,
      },
      auditLogs: [newAuditLog, ...roomData.auditLogs],
    };

    setRoomData(updatedRoom);
    syncRoomWithSupabase(updatedRoom);
  };

  // Update / Reset Roommate Login Credentials
  const handleUpdateMemberCredentials = (memberId: string, username: string, password?: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPassword = (password || '').trim();

    setRoomData(prev => {
      const targetMember = prev.members.find(m => m.id === memberId);
      const newPass = cleanPassword || targetMember?.allocatedPassword || targetMember?.password || 'password123';
      const newUName = cleanUsername || targetMember?.username || targetMember?.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';

      const updatedMembers = prev.members.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            username: newUName,
            password: newPass,
            allocatedPassword: newPass,
          };
        }
        return m;
      });

      const auditEntry: AuditLog = {
        id: `log_${Date.now()}`,
        roomId: prev.settings.id,
        actorId: activeMember?.id || 'admin',
        actorName: activeMember?.name || 'Super Admin',
        action: 'role_changed',
        details: `Updated login credentials for "${targetMember?.name || 'roommate'}" (@${newUName})`,
        timestamp: new Date().toISOString(),
      };

      const updated: RoomData = {
        ...prev,
        members: updatedMembers,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };

      syncRoomWithSupabase(updated);
      return updated;
    });
  };

  // Create New Room when Super Admin registers with Email & Password
  const handleRegisterNewRoom = (params: {
    adminName: string;
    email: string;
    password: string;
    roomName: string;
    roomCode: string;
    currency: string;
    currencySymbol: string;
    upiId?: string;
  }) => {
    const newRoomId = `room_${Date.now()}`;
    const newAdminId = `admin_${Date.now()}`;
    const code = params.roomCode?.trim().toUpperCase() || `ROOM${Math.floor(100 + Math.random() * 900)}`;
    const curr = params.currency || 'INR';
    const currSym = params.currencySymbol || (curr === 'INR' ? '₹' : '$');

    const newSuperAdmin: Member = {
      id: newAdminId,
      name: params.adminName,
      username: params.adminName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'superadmin',
      email: params.email,
      password: params.password || 'password123',
      allocatedPassword: params.password || 'password123',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'super_admin',
      permissions: DEFAULT_PERMISSIONS.super_admin,
      joinedAt: new Date().toISOString(),
      isMessActive: true,
      membershipType: 'both',
      depositBalance: 0,
      daysStayedInMonth: 30,
      upiId: params.upiId,
    };

    const newRoomSettings: RoomSettings = {
      id: newRoomId,
      name: params.roomName || 'Our Flat',
      currency: curr,
      currencySymbol: currSym,
      monthlyBudget: 2000,
      isMessEnabled: true,
      messCalculationMode: 'dynamic_ratio',
      messCalculationType: 'days_stayed',
      daysInMonth: 30,
      roomCode: code,
      createdById: newAdminId,
      createdAt: new Date().toISOString(),
    };

    const newRoom: RoomData = {
      settings: newRoomSettings,
      members: [newSuperAdmin],
      expenses: [],
      meals: [],
      settlements: [],
      auditLogs: [{
        id: `log_${Date.now()}`,
        roomId: newRoomId,
        actorId: newAdminId,
        actorName: params.adminName,
        action: 'account_created',
        details: `Created new flat "${params.roomName}" (${code}) with Super Admin ${params.adminName}`,
        timestamp: new Date().toISOString(),
      }],
      cleaningSchedule: {
        dutyDate: new Date().toISOString().split('T')[0],
        currentMemberId: newAdminId,
        nextMemberId: newAdminId,
        rotaOrder: [newAdminId],
        dutyArea: 'Bathroom & Washroom',
        assignedDuties: { [newAdminId]: 'Bathroom & Washroom' },
        frequency: 'daily',
      },
      cleaningHistory: [],
      monthlyArchives: [],
    };

    setRoomData(newRoom);
    saveRoomData(newRoom);

    const authU: AuthUser = {
      id: newAdminId,
      memberId: newAdminId,
      email: params.email,
      name: params.adminName,
      avatar: newSuperAdmin.avatar,
      role: 'super_admin',
      roomCode: code,
    };

    handleLogin(authU);
  };

  // Remove Roommate Handler (Admin Only)
  const handleRemoveMember = async (memberId: string) => {
    const target = roomData.members.find(m => m.id === memberId);
    if (!target) return;

    const remainingMembers = roomData.members.filter(m => m.id !== memberId);
    if (remainingMembers.length === 0) return;

    // Update cleaning rota
    const currentRota = roomData.cleaningSchedule?.rotaOrder || roomData.members.map(m => m.id);
    const updatedRota = currentRota.filter(id => id !== memberId);
    const newCurrent = roomData.cleaningSchedule?.currentMemberId === memberId 
      ? (updatedRota[0] || remainingMembers[0].id)
      : (roomData.cleaningSchedule?.currentMemberId || remainingMembers[0].id);
    const newNext = updatedRota[(updatedRota.indexOf(newCurrent) + 1) % updatedRota.length] || remainingMembers[0].id;

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: activeMember.id,
      actorName: activeMember.name,
      action: 'member_removed',
      details: `Removed roommate "${target.name}" (${target.role.toUpperCase().replace('_', ' ')}) from room`,
      timestamp: new Date().toISOString(),
    };

    // If active acting member was removed, switch to another admin or first member
    if (activeMemberId === memberId) {
      const fallbackAdmin = remainingMembers.find(m => m.role === 'super_admin' || m.role === 'admin') || remainingMembers[0];
      setActiveMemberIdState(fallbackAdmin.id);
      setActiveMemberId(fallbackAdmin.id);
    }

    // Clean up local session if the removed member was logged in
    const currentSession = getMemberSession();
    if (currentSession && currentSession.memberId === memberId) {
      clearMemberSession();
    }

    // Remove member from meals, settlements, and clean up splits
    const cleanedMeals = roomData.meals.filter(m => m.memberId !== memberId);
    const cleanedSettlements = roomData.settlements.filter(s => s.fromMemberId !== memberId && s.toMemberId !== memberId);
    const cleanedExpenses = roomData.expenses.map(exp => ({
      ...exp,
      splits: exp.splits.filter(s => s.memberId !== memberId),
      paidBy: exp.paidBy === memberId ? (remainingMembers[0]?.id || exp.paidBy) : exp.paidBy,
    }));

    const updatedRoom: RoomData = {
      ...roomData,
      members: remainingMembers,
      expenses: cleanedExpenses,
      meals: cleanedMeals,
      settlements: cleanedSettlements,
      cleaningSchedule: {
        ...(roomData.cleaningSchedule || INITIAL_ROOM_DATA.cleaningSchedule),
        rotaOrder: updatedRota.length > 0 ? updatedRota : remainingMembers.map(m => m.id),
        currentMemberId: newCurrent,
        nextMemberId: newNext,
      },
      auditLogs: [newAuditLog, ...roomData.auditLogs],
    };

    // Immediate UI update
    setRoomData(updatedRoom);
    saveRoomData(updatedRoom);

    // Delete from Supabase members / roomex_members and sync full room
    await deleteMemberFromSupabase(memberId, roomData.settings.id);
    await syncRoomWithSupabase(updatedRoom);
  };

  // Update Individual Member Expense Toggles (Mess, Rent, Other Expenses)
  const handleUpdateMemberExpenseToggles = (
    memberId: string,
    toggles: { enableMess?: boolean; enableRent?: boolean; enableOther?: boolean }
  ) => {
    setRoomData(prev => {
      const target = prev.members.find(m => m.id === memberId);
      if (!target) return prev;

      const nextMess = toggles.enableMess !== undefined 
        ? toggles.enableMess 
        : (target.enableMess !== undefined ? target.enableMess : (target.isMessActive !== false && target.membershipType !== 'rent_only'));
      const nextRent = toggles.enableRent !== undefined 
        ? toggles.enableRent 
        : (target.enableRent !== undefined ? target.enableRent : (target.membershipType !== 'mess_only'));
      const nextOther = toggles.enableOther !== undefined 
        ? toggles.enableOther 
        : (target.enableOther !== undefined ? target.enableOther : true);

      const updatedMembers = prev.members.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            enableMess: nextMess,
            enableRent: nextRent,
            enableOther: nextOther,
            isMessActive: nextMess,
          };
        }
        return m;
      });

      const detailsArr: string[] = [];
      if (toggles.enableMess !== undefined) detailsArr.push(`Mess: ${toggles.enableMess ? 'ON' : 'OFF'}`);
      if (toggles.enableRent !== undefined) detailsArr.push(`Rent: ${toggles.enableRent ? 'ON' : 'OFF'}`);
      if (toggles.enableOther !== undefined) detailsArr.push(`Other: ${toggles.enableOther ? 'ON' : 'OFF'}`);

      const newAuditLog: AuditLog = {
        id: `log_${Date.now()}`,
        roomId: prev.settings.id,
        actorId: activeMember.id,
        actorName: activeMember.name,
        action: 'role_changed',
        details: `Updated expense toggles for "${target.name}": ${detailsArr.join(', ')}`,
        timestamp: new Date().toISOString(),
      };

      const updatedRoom: RoomData = {
        ...prev,
        members: updatedMembers,
        auditLogs: [newAuditLog, ...prev.auditLogs],
      };

      syncRoomWithSupabase(updatedRoom);
      updateMemberExpenseTogglesInSupabase(memberId, prev.settings.id, toggles);

      return updatedRoom;
    });
  };

  // Update Member Participation / Vacation / Long Leave Status (Super Admin & Admin)
  const handleUpdateMemberParticipation = (
    memberId: string, 
    params: {
      isOnVacation: boolean;
      vacationType?: 'vacation' | 'long_leave' | 'inactive' | 'active';
      vacationReason?: string;
      vacationStartDate?: string;
      vacationEndDate?: string;
      daysStayed?: number;
      isMessActive?: boolean;
      isCleaningActive?: boolean;
    }
  ) => {
    setRoomData(prev => {
      const target = prev.members.find(m => m.id === memberId);
      if (!target) return prev;

      const isVacation = params.isOnVacation;
      const messActive = params.isMessActive !== undefined ? params.isMessActive : !isVacation;
      const cleanActive = params.isCleaningActive !== undefined ? params.isCleaningActive : !isVacation;
      const days = params.daysStayed !== undefined 
        ? params.daysStayed 
        : (isVacation ? 0 : (target.daysStayedInMonth ?? (prev.settings.daysInMonth || 30)));

      const updatedMembers = prev.members.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            isOnVacation: isVacation,
            vacationType: isVacation ? (params.vacationType || 'vacation') : 'active',
            vacationReason: isVacation ? (params.vacationReason || 'Vacation / Away') : undefined,
            vacationStartDate: isVacation ? params.vacationStartDate : undefined,
            vacationEndDate: isVacation ? params.vacationEndDate : undefined,
            isMessActive: messActive,
            isCleaningActive: cleanActive,
            daysStayed: days,
            daysStayedInMonth: days,
          };
        }
        return m;
      });

      // If current cleaning duty member is going on vacation, advance rota to next available active roommate
      let updatedSchedule = prev.cleaningSchedule;
      if (updatedSchedule && isVacation && updatedSchedule.currentMemberId === memberId) {
        const activeRota = updatedMembers
          .filter(m => !m.isOnVacation && m.isCleaningActive !== false)
          .map(m => m.id);
        
        if (activeRota.length > 0) {
          const newCurrent = activeRota[0];
          const newNext = activeRota[1] || activeRota[0];
          updatedSchedule = {
            ...updatedSchedule,
            currentMemberId: newCurrent,
            nextMemberId: newNext,
          };
        }
      }

      const newAuditLog: AuditLog = {
        id: `log_${Date.now()}`,
        roomId: prev.settings.id,
        actorId: activeMember.id,
        actorName: activeMember.name,
        action: isVacation ? 'vacation_set' : 'vacation_ended',
        details: isVacation
          ? `Set "${target.name}" on ${params.vacationType === 'long_leave' ? 'Long Leave' : 'Vacation'} (${params.vacationReason || 'Away'}) - Mess & Cleaning paused`
          : `Resumed active room participation for "${target.name}"`,
        timestamp: new Date().toISOString(),
      };

      return {
        ...prev,
        members: updatedMembers,
        cleaningSchedule: updatedSchedule || prev.cleaningSchedule,
        auditLogs: [newAuditLog, ...prev.auditLogs],
      };
    });
  };

  // Bulk Flat Vacation Toggle (e.g. Semester Breaks / Holidays)
  const handleBulkUpdateParticipation = (allOnVacation: boolean, reason?: string) => {
    setRoomData(prev => {
      const updatedMembers = prev.members.map(m => ({
        ...m,
        isOnVacation: allOnVacation,
        vacationType: allOnVacation ? ('vacation' as const) : ('active' as const),
        vacationReason: allOnVacation ? (reason || 'Flat Vacation / Break') : undefined,
        isMessActive: !allOnVacation,
        isCleaningActive: !allOnVacation,
        daysStayed: allOnVacation ? 0 : (prev.settings.daysInMonth || 30),
        daysStayedInMonth: allOnVacation ? 0 : (prev.settings.daysInMonth || 30),
      }));

      const newAuditLog: AuditLog = {
        id: `log_${Date.now()}`,
        roomId: prev.settings.id,
        actorId: activeMember.id,
        actorName: activeMember.name,
        action: allOnVacation ? 'bulk_vacation_set' : 'bulk_vacation_ended',
        details: allOnVacation 
          ? `Super Admin set ALL room participation on vacation (${reason || 'Semester / Holiday Break'})`
          : `Super Admin resumed active participation for ALL roommates`,
        timestamp: new Date().toISOString(),
      };

      return {
        ...prev,
        members: updatedMembers,
        auditLogs: [newAuditLog, ...prev.auditLogs],
      };
    });
  };

  // Register New Member from Auth Screen
  const handleRegister = (memberData: { 
    name: string; 
    email: string; 
    password?: string; 
    role: Role; 
    upiId?: string; 
    membershipType?: MembershipType 
  }) => {
    const avatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    ];
    const newId = `usr_${Date.now()}`;
    const mType = memberData.membershipType || 'both';
    const isFirstAccount = roomData.members.length === 0 || !roomData.members.some(m => m.role === 'super_admin');
    const assignedRole: Role = isFirstAccount ? 'super_admin' : memberData.role;

    const newMember: Member = {
      id: newId,
      name: memberData.name,
      email: memberData.email,
      password: memberData.password,
      role: assignedRole,
      permissions: DEFAULT_PERMISSIONS[assignedRole],
      avatar: avatars[roomData.members.length % avatars.length],
      isMessActive: mType !== 'rent_only',
      membershipType: mType,
      depositBalance: 0,
      daysStayedInMonth: roomData.settings.daysInMonth || 30,
      joinedAt: new Date().toISOString(),
      upiId: memberData.upiId,
    };

    const updatedRota = [...(roomData.cleaningSchedule?.rotaOrder || roomData.members.map(m => m.id)), newId];

    const newAuditLog: AuditLog = {
      id: `log_${Date.now()}`,
      roomId: roomData.settings.id,
      actorId: newId,
      actorName: memberData.name,
      action: 'account_created',
      details: `New account registered: "${memberData.name}" as ${memberData.role.toUpperCase().replace('_', ' ')}`,
      timestamp: new Date().toISOString(),
    };

    setRoomData(prev => ({
      ...prev,
      members: [...prev.members, newMember],
      cleaningSchedule: {
        ...(prev.cleaningSchedule || INITIAL_ROOM_DATA.cleaningSchedule),
        rotaOrder: updatedRota,
      },
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    const user: AuthUser = {
      id: newId,
      memberId: newId,
      email: newMember.email,
      name: newMember.name,
      avatar: newMember.avatar,
      role: newMember.role,
      roomCode: roomData.settings.roomCode,
    };

    handleLogin(user);
  };

  // Settings Handler
  const handleUpdateSettings = (newSettings: RoomSettings) => {
    setRoomData(prev => ({
      ...prev,
      settings: newSettings,
    }));
    setIsSettingsModalOpen(false);
  };

  // Custom Member Rent Handler
  const handleUpdateMemberCustomRent = (memberId: string, customRent: number | undefined) => {
    setRoomData(prev => ({
      ...prev,
      members: prev.members.map(m => 
        m.id === memberId 
          ? { ...m, customRentShare: customRent, rentShareOverride: customRent !== undefined && customRent > 0 } 
          : m
      ),
    }));
  };

  // Preset Rent Handler
  const handleUpdatePresetRent = (presetActive: boolean, amount: number, type: 'total_room' | 'per_member') => {
    setRoomData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        presetRentActive: presetActive,
        presetRentAmount: amount,
        presetRentType: type,
      },
    }));
  };

  // Reset Demo Data
  const handleResetData = () => {
    if (window.confirm('Reset all demo expenses, meals, and balances to clean state?')) {
      setRoomData(INITIAL_ROOM_DATA);
      setIsSettingsModalOpen(false);
    }
  };

  // Show Splash Screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} onComplete={() => setShowSplash(false)} />;
  }

  // Show Auth Login if not authenticated
  if (!authUser) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onRegisterNewRoom={handleRegisterNewRoom}
        existingMembers={roomData.members} 
        members={roomData.members}
        settings={roomData.settings}
        roomName={roomData.settings.name}
      />
    );
  }

  // Calculate live financial metrics for active logged-in user banner
  const totalSpent = roomData.expenses.reduce((s, e) => s + e.amount, 0);
  const daysInMonth = roomData.settings.daysInMonth || 30;
  const messMetrics = calculateMessMetrics(roomData.expenses, roomData.meals, roomData.members, daysInMonth);
  const netBalances = calculateNetBalances(roomData.members, roomData.expenses, roomData.settlements, roomData.settings);
  const activeNet = netBalances[activeMember.id] || 0;
  const activeMessDue = messMetrics.memberDaysBreakdown[activeMember.id]?.cost || 0;
  const activeDays = messMetrics.memberDaysBreakdown[activeMember.id]?.daysStayed ?? daysInMonth;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 sm:pb-12 selection:bg-indigo-500 selection:text-white">
      
      {/* Top Main Navbar */}
      <Navbar
        settings={roomData.settings}
        members={roomData.members}
        activeMember={activeMember}
        onSelectActiveMember={handleSelectActiveMember}
        onOpenProfilePhoto={() => {
          setProfilePhotoTargetMember(activeMember);
          setIsProfilePhotoModalOpen(true);
        }}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenAdminModal={() => setActiveTab('super_admin')}
        onOpenRoomSettings={() => setIsSettingsModalOpen(true)}
        supabaseStatus={supabaseStatus}
        onManualSync={handleSyncSupabase}
        canInstallPWA={canInstallPWA}
        onInstallPWA={handleInstallPWA}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        
        {/* Requirement 10: Prominent Logged User Details Banner on Main Screen */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* User Identity Info */}
            <div className="flex items-center gap-3">
              <div 
                onClick={() => {
                  setProfilePhotoTargetMember(activeMember);
                  setIsProfilePhotoModalOpen(true);
                }}
                className="relative group cursor-pointer shrink-0"
                title="Click to update your profile photo"
              >
                <img 
                  src={activeMember.avatar} 
                  alt={activeMember.name} 
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-400/60 shadow-lg group-hover:border-indigo-300 transition-all"
                />
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">{activeMember.name}</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                    {activeMember.role.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                    {activeMember.membershipType === 'both' ? 'Rent + Mess' : activeMember.membershipType === 'rent_only' ? 'Rent Only' : 'Mess Only'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>Room: <strong className="text-slate-200">{roomData.settings.name}</strong> ({roomData.settings.roomCode})</span>
                  <span>•</span>
                  <span>Email: {activeMember.email}</span>
                </div>
              </div>
            </div>

            {/* Quick Balance Status Glance */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                activeNet >= 0 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <span>Net: {activeNet >= 0 ? `+${roomData.settings.currencySymbol}${activeNet.toFixed(2)} (Gets back)` : `-${roomData.settings.currencySymbol}${Math.abs(activeNet).toFixed(2)} (To pay)`}</span>
              </div>

              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsAddExpenseOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Bill</span>
              </button>
            </div>

          </div>

          {/* 4 Financial Tiles: Room Total Spend, My Mess Due, My Net Balance, Days Stayed */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/10 text-center sm:text-left">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">TOTAL ROOM PURCHASES</span>
              <span className="text-base sm:text-lg font-black font-mono text-white mt-0.5 block">
                {roomData.settings.currencySymbol}{totalSpent.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{roomData.expenses.length} bills logged</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-orange-400 block font-mono">MY MESS BILL DUE</span>
              <span className="text-base sm:text-lg font-black font-mono text-orange-300 mt-0.5 block">
                {activeMember.membershipType === 'rent_only' ? '$0.00' : `${roomData.settings.currencySymbol}${activeMessDue.toFixed(2)}`}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeMember.membershipType === 'rent_only' ? 'Rent Only Member' : `${activeDays} days stayed in month`}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block font-mono">DAILY MESS RATE</span>
              <span className="text-base sm:text-lg font-black font-mono text-indigo-300 mt-0.5 block">
                {roomData.settings.currencySymbol}{messMetrics.dailyMessRate.toFixed(2)}/day
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{daysInMonth} total days</span>
            </div>

            <div className={`p-2.5 rounded-xl border ${activeNet >= 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-300 block font-mono">BALANCE TO SETTLE</span>
              <span className={`text-base sm:text-lg font-black font-mono mt-0.5 block ${activeNet >= 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                {activeNet >= 0 ? `+${roomData.settings.currencySymbol}${activeNet.toFixed(2)}` : `-${roomData.settings.currencySymbol}${Math.abs(activeNet).toFixed(2)}`}
              </span>
              <span className="text-[10px] font-mono font-semibold">
                {activeNet >= 0 ? '🔵 Member gets back' : '🟢 Member owes to pay'}
              </span>
            </div>
          </div>

        </div>

        {/* View Switcher Tabs (Desktop / Tablet Top Bar) */}
        <div className="hidden sm:flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            
            {/* 0. Member Overview (Simple screen for members) */}
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>My Dues & Pay</span>
            </button>

            {/* 1. Room Expenses */}
            <button
              onClick={() => handleTabChange('expenses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'expenses'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Purchases</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeTab === 'expenses' ? 'bg-indigo-700 text-indigo-100' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                {roomData.expenses.length}
              </span>
            </button>

            {/* 2. Mess Manager */}
            <button
              onClick={() => handleTabChange('mess')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'mess'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Mess & Rent</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 font-mono">
                Days
              </span>
            </button>

            {/* 3. Cleaning Schedule */}
            <button
              onClick={() => handleTabChange('cleaning')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'cleaning'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Cleaning Rota</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Duty
              </span>
            </button>

            {/* 4. Balances & Settle */}
            <button
              onClick={() => handleTabChange('balances')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'balances'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Debt Settle</span>
            </button>

            {/* 5. Summary & Colorful PDF Export */}
            <button
              onClick={() => handleTabChange('summary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>PDF & Reports</span>
            </button>

            {/* 6. Unified Admin & Super Admin Master Tab */}
            {(activeMember.role === 'super_admin' || activeMember.role === 'admin') && (
              <button
                onClick={() => handleTabChange('super_admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  activeTab === 'super_admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
                }`}
              >
                {activeMember.role === 'super_admin' ? (
                  <Crown className="w-4 h-4 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                )}
                <span>{activeMember.role === 'super_admin' ? 'Super Admin' : 'Admin Center'}</span>
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-200 border border-amber-400/40">
                  {activeMember.role === 'super_admin' ? 'Master' : 'Roles'}
                </span>
              </button>
            )}

          </div>

          {/* Quick Add Expense Desktop Button */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Bill</span>
          </button>
        </div>

        {/* View Component Render */}
        {activeTab === 'overview' && (
          <MemberDashboard
            member={activeMember}
            members={roomData.members}
            expenses={roomData.expenses}
            meals={roomData.meals}
            settlements={roomData.settlements}
            settings={roomData.settings}
            cleaningSchedule={roomData.cleaningSchedule || INITIAL_ROOM_DATA.cleaningSchedule}
            cleaningHistory={roomData.cleaningHistory || []}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            onOpenMessTab={() => handleTabChange('mess')}
            onOpenSettleTab={() => handleTabChange('balances')}
            onOpenCleaningTab={() => handleTabChange('cleaning')}
            onUpdateDailyMeal={handleUpdateDailyMeal}
            onCompleteCleaning={handleUpdateCleaningSchedule}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={roomData.expenses}
            members={roomData.members}
            activeMember={activeMember}
            settings={roomData.settings}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsAddExpenseOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'mess' && (
          <MessManager
            meals={roomData.meals}
            members={roomData.members}
            expenses={roomData.expenses}
            settings={roomData.settings}
            activeMember={activeMember}
            onUpdateDailyMeal={handleUpdateDailyMeal}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            onUpdateDepositBalance={handleUpdateDepositBalance}
            onUpdateMemberDaysStayed={handleUpdateMemberDaysStayed}
            onUpdateMemberMembershipType={handleUpdateMemberMembershipType}
            onUpdateDaysInMonth={handleUpdateDaysInMonth}
          />
        )}

        {activeTab === 'cleaning' && (
          <CleaningSchedule
            schedule={roomData.cleaningSchedule || INITIAL_ROOM_DATA.cleaningSchedule}
            history={roomData.cleaningHistory || []}
            members={roomData.members}
            activeMember={activeMember}
            settings={roomData.settings}
            onUpdateSchedule={handleUpdateCleaningSchedule}
          />
        )}

        {activeTab === 'balances' && (
          <BalancesAndSettle
            members={roomData.members}
            expenses={roomData.expenses}
            settlements={roomData.settlements}
            settings={roomData.settings}
            activeMember={activeMember}
            onRecordSettlement={handleRecordSettlement}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryReports
            roomData={roomData}
            activeMember={activeMember}
            onSaveMonthlyArchive={handleSaveMonthlyArchive}
          />
        )}

        {activeTab === 'super_admin' && (
          <SuperAdminTab
            members={roomData.members}
            activeMember={activeMember}
            settings={roomData.settings}
            auditLogs={roomData.auditLogs}
            expenses={roomData.expenses}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onOpenAddExpenseModal={() => setIsAddExpenseOpen(true)}
            onUpdateMemberRole={handleUpdateMemberRole}
            onAddNewMember={handleAddNewMember}
            onRemoveMember={handleRemoveMember}
            onSelectActiveMember={handleSelectActiveMember}
            onUpdateSettings={handleUpdateSettings}
            onUpdateMemberDaysStayed={handleUpdateMemberDaysStayed}
            onUpdateMemberMembershipType={handleUpdateMemberMembershipType}
            onUpdateMemberParticipation={handleUpdateMemberParticipation}
            onBulkUpdateParticipation={handleBulkUpdateParticipation}
            onUpdateMemberCustomRent={handleUpdateMemberCustomRent}
            onUpdatePresetRent={handleUpdatePresetRent}
            onUpdateMemberCredentials={handleUpdateMemberCredentials}
            onUpdateMemberAvatar={handleUpdateMemberAvatar}
            onUpdateMemberExpenseToggles={handleUpdateMemberExpenseToggles}
          />
        )}

      </main>

      {/* Desktop Geometric Balance Footer */}
      <footer className="hidden sm:flex px-8 py-4 bg-slate-950 border-t border-white/5 items-center justify-between text-[11px] text-slate-500 mt-12">
        <div className="flex gap-6">
          <span 
            onClick={() => handleTabChange('expenses')} 
            className={`cursor-pointer transition-colors ${activeTab === 'expenses' ? 'text-white border-b border-indigo-500 pb-0.5' : 'hover:text-slate-300'}`}
          >
            PURCHASES
          </span>
          <span 
            onClick={() => handleTabChange('mess')} 
            className={`cursor-pointer transition-colors ${activeTab === 'mess' ? 'text-white border-b border-indigo-500 pb-0.5' : 'hover:text-slate-300'}`}
          >
            MESS & RENT
          </span>
          <span 
            onClick={() => handleTabChange('cleaning')} 
            className={`cursor-pointer transition-colors ${activeTab === 'cleaning' ? 'text-white border-b border-indigo-500 pb-0.5' : 'hover:text-slate-300'}`}
          >
            CLEANING ROTA
          </span>
          <span 
            onClick={() => handleTabChange('balances')} 
            className={`cursor-pointer transition-colors ${activeTab === 'balances' ? 'text-white border-b border-indigo-500 pb-0.5' : 'hover:text-slate-300'}`}
          >
            DEBT SETTLE
          </span>
          <span 
            onClick={() => handleTabChange('summary')} 
            className={`cursor-pointer transition-colors ${activeTab === 'summary' ? 'text-white border-b border-indigo-500 pb-0.5' : 'hover:text-slate-300'}`}
          >
            PDF & WHATSAPP
          </span>
          <span 
            onClick={() => setIsAdminModalOpen(true)} 
            className="hover:text-slate-300 cursor-pointer uppercase"
          >
            ADMIN PANEL
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <span className="text-slate-400">
            App developed by <strong className="text-indigo-400">sakeerputhan</strong>
          </span>
          <span className="uppercase tracking-widest text-slate-500">ROOM: {roomData.settings.roomCode}</span>
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
            {supabaseStatus.connected ? 'DB LIVE' : 'LOCAL CACHE'}
          </span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Modern Mobile UI) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-1 py-1.5 flex items-center justify-around shadow-2xl">
        
        {/* 1. My Dues / Overview */}
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'overview' ? 'text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'overview' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[9px] tracking-tight mt-0.5">My Dues</span>
        </button>

        {/* 2. Mess & Rent */}
        <button
          onClick={() => handleTabChange('mess')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'mess' ? 'text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'mess' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
            <Utensils className="w-4 h-4" />
          </div>
          <span className="text-[9px] tracking-tight mt-0.5">Mess/Rent</span>
        </button>

        {/* Center Floating Action Button (+) */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            aria-label="Add new expense or bill"
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center -mt-5 shadow-xl shadow-indigo-600/50 border-2 border-slate-950 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 3. Room Purchases */}
        <button
          onClick={() => handleTabChange('expenses')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'expenses' ? 'text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-300 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'expenses' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
            <Receipt className="w-4 h-4" />
          </div>
          <span className="text-[9px] tracking-tight mt-0.5">Purchases</span>
        </button>

        {/* 4. Super Admin / Admin OR Reports */}
        {(activeMember.role === 'super_admin' || activeMember.role === 'admin') ? (
          <button
            onClick={() => handleTabChange('super_admin')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[46px] ${
              activeTab === 'super_admin' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-amber-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'super_admin' ? 'bg-amber-500/20 text-amber-400' : ''}`}>
              {activeMember.role === 'super_admin' ? (
                <Crown className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <span className="text-[9px] tracking-tight mt-0.5 text-amber-400">
              {activeMember.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          </button>
        ) : (
          <button
            onClick={() => handleTabChange('summary')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all min-h-[46px] ${
              activeTab === 'summary' ? 'text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'summary' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
              <PieChart className="w-4 h-4" />
            </div>
            <span className="text-[9px] tracking-tight mt-0.5">Reports</span>
          </button>
        )}
      </nav>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        members={roomData.members}
        activeMember={activeMember}
        settings={roomData.settings}
        meals={roomData.meals}
        onAddExpense={handleSaveExpense}
        editingExpense={editingExpense}
      />

      <AdminDelegationModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        members={roomData.members}
        activeMember={activeMember}
        auditLogs={roomData.auditLogs}
        onUpdateMemberRole={handleUpdateMemberRole}
        onAddNewMember={handleAddNewMember}
        onRemoveMember={handleRemoveMember}
        onSelectActiveMember={handleSelectActiveMember}
      />

      <RoomSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={roomData.settings}
        activeMember={activeMember}
        supabaseStatus={supabaseStatus}
        onUpdateSettings={handleUpdateSettings}
        onManualSync={handleSyncSupabase}
        onResetData={handleResetData}
        canInstallPWA={canInstallPWA}
        onInstallPWA={handleInstallPWA}
      />

      <ProfilePhotoModal
        isOpen={isProfilePhotoModalOpen}
        onClose={() => {
          setIsProfilePhotoModalOpen(false);
          setProfilePhotoTargetMember(null);
        }}
        currentAvatar={profilePhotoTargetMember?.avatar || activeMember.avatar}
        memberName={profilePhotoTargetMember?.name || activeMember.name}
        onSaveAvatar={(newAvatar) => {
          const targetId = profilePhotoTargetMember?.id || activeMember.id;
          handleUpdateMemberAvatar(targetId, newAvatar);
          setIsProfilePhotoModalOpen(false);
          setProfilePhotoTargetMember(null);
        }}
      />

    </div>
  );
}
