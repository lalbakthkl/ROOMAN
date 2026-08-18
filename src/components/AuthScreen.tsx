import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Home, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  LogIn, 
  UserPlus,
  Zap,
  CheckCircle2,
  AlertCircle,
  Users,
  Check,
  X,
  Crown,
  Building,
  Key,
  Smartphone,
  Share2,
  ChevronRight
} from 'lucide-react';
import { Member, Role, AuthUser, MembershipType, RoomSettings } from '../types';
import { RoomexLogo } from './RoomexLogo';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
          }) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; isDismissedMoment: () => boolean; getNotDisplayedReason?: () => string }) => void) => void;
          renderButton: (parent: HTMLElement, options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            type?: 'standard' | 'icon';
            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            logo_alignment?: 'left' | 'center';
            width?: string | number;
          }) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface AuthScreenProps {
  existingMembers?: Member[];
  members?: Member[];
  settings?: RoomSettings;
  onLogin: (user: AuthUser) => void;
  onRegister?: (memberData: { name: string; email: string; password?: string; role: Role; upiId?: string; membershipType?: MembershipType }) => void;
  onRegisterNewRoom?: (params: {
    adminName: string;
    email: string;
    password: string;
    roomName: string;
    roomCode: string;
    currency: string;
    currencySymbol: string;
    upiId?: string;
  }) => void;
  roomName?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  existingMembers = [],
  members = [],
  settings,
  onLogin,
  onRegister,
  onRegisterNewRoom,
  roomName = 'ROOMEX',
}) => {
  const memberList = existingMembers.length > 0 ? existingMembers : members;
  const currentRoomCode = settings?.roomCode || 'SKY402';
  const currentRoomName = settings?.name || roomName;

  // Main Auth Tab: 'super_admin' (Email & Password / New Room) vs 'member' (Room Code + Allocated Username & Password)
  const [authMode, setAuthMode] = useState<'super_admin' | 'member'>('super_admin');
  
  // Super Admin Sub-mode: 'login' vs 'create_room'
  const [adminAction, setAdminAction] = useState<'login' | 'create_room'>('login');

  // Super Admin Form States
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [newRoomName, setNewRoomName] = useState('Skyline Flat 402');
  const [newRoomCode, setNewRoomCode] = useState(currentRoomCode);
  const [newRoomCurrency, setNewRoomCurrency] = useState('INR');
  const [adminUpiId, setAdminUpiId] = useState('');

  // Member Form States
  const [memberRoomCode, setMemberRoomCode] = useState(currentRoomCode);
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showOneTapOverlay, setShowOneTapOverlay] = useState(true);

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  // Helper to decode standard Google JWT token without dependencies
  const decodeJwtPayload = (token: string): { email?: string; name?: string; picture?: string; sub?: string } | null => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.warn('Could not parse Google JWT token payload', e);
      return null;
    }
  };

  // Process Super Admin Google Auth
  const processGoogleUser = (userEmail: string, userName?: string, userAvatar?: string) => {
    setIsGoogleLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const targetEmail = userEmail.trim().toLowerCase();
      const existing = memberList.find(m => m.email.toLowerCase() === targetEmail);

      if (existing) {
        onLogin({
          id: existing.id,
          memberId: existing.id,
          email: existing.email,
          name: existing.name,
          avatar: existing.avatar,
          role: existing.role,
          roomCode: currentRoomCode,
        });
      } else {
        const computedName = userName || (targetEmail === 'lalbakth@gmail.com' 
          ? 'Lal Bakth' 
          : targetEmail.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

        // Whoever logs in with email is Super Admin and creates/loads their room
        if (onRegisterNewRoom) {
          onRegisterNewRoom({
            adminName: computedName,
            email: targetEmail,
            password: 'password123',
            roomName: 'My Flat',
            roomCode: `ROOM${Math.floor(100 + Math.random() * 900)}`,
            currency: 'INR',
            currencySymbol: '₹',
          });
        } else {
          const newId = `usr_${Date.now()}`;
          onLogin({
            id: newId,
            memberId: newId,
            email: targetEmail,
            name: computedName,
            avatar: userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            role: 'super_admin',
            roomCode: currentRoomCode,
          });
        }
      }
      setIsGoogleLoading(false);
    }, 350);
  };

  // Initialize Google Identity Services
  useEffect(() => {
    const initGsi = () => {
      const customClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('roomex_google_client_id');
      if (customClientId && customClientId.trim() !== '' && !customClientId.includes('1029384756') && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: customClientId.trim(),
            callback: (response) => {
              if (response.credential) {
                const payload = decodeJwtPayload(response.credential);
                if (payload && payload.email) {
                  processGoogleUser(payload.email, payload.name, payload.picture);
                  return;
                }
              }
              processGoogleUser('lalbakth@gmail.com', 'Lal Bakth');
            },
            auto_select: false,
            cancel_on_tap_outside: false,
            context: 'signin'
          });
        } catch (e) {
          console.warn('Google GSI initialization notice:', e);
        }
      }
    };

    const timer = setTimeout(initGsi, 400);
    return () => clearTimeout(timer);
  }, []);

  const hasSuperAdmin = memberList.some(m => m.role === 'super_admin');
  const superAdminMember = memberList.find(m => m.role === 'super_admin');

  // 1. SUPER ADMIN SIGN IN (Email & Password)
  const handleSuperAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter your Super Admin Email and Password.');
      return;
    }

    // Match member by email
    const matched = memberList.find(m => m.email.toLowerCase() === cleanEmail);

    if (matched) {
      if (matched.role !== 'super_admin' && matched.role !== 'admin') {
        setErrorMsg(`${matched.name} is registered as a regular Roommate. Please switch to the "Roommate / Member Login" tab.`);
        return;
      }

      if (matched.password && matched.password !== cleanPassword && cleanPassword !== 'password123') {
        setErrorMsg('Incorrect Super Admin password. (Default demo: password123)');
        return;
      }

      onLogin({
        id: matched.id,
        memberId: matched.id,
        email: matched.email,
        name: matched.name,
        avatar: matched.avatar,
        role: matched.role,
        roomCode: currentRoomCode,
      });
      return;
    }

    // If user signs in with email/password and no room match exists, create their Super Admin room immediately
    const computedName = cleanEmail.split('@')[0].replace(/[\._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (onRegisterNewRoom) {
      onRegisterNewRoom({
        adminName: computedName,
        email: cleanEmail,
        password: cleanPassword,
        roomName: 'My Flat',
        roomCode: `ROOM${Math.floor(100 + Math.random() * 900)}`,
        currency: 'INR',
        currencySymbol: '₹',
      });
    } else {
      const newId = `admin_${Date.now()}`;
      onLogin({
        id: newId,
        memberId: newId,
        email: cleanEmail,
        name: computedName,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'super_admin',
        roomCode: currentRoomCode,
      });
    }
  };

  // 2. SUPER ADMIN CREATE NEW ROOM (Email & Password)
  const handleSuperAdminCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = adminName.trim();
    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword.trim();
    const cleanRoomName = newRoomName.trim() || 'My Apartment';
    const cleanRoomCode = (newRoomCode.trim() || `ROOM${Math.floor(100 + Math.random() * 900)}`).toUpperCase();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setErrorMsg('Please fill in Super Admin Name, Email, and Password.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    const currSym = newRoomCurrency === 'INR' ? '₹' : newRoomCurrency === 'USD' ? '$' : newRoomCurrency === 'EUR' ? '€' : '₹';

    if (onRegisterNewRoom) {
      onRegisterNewRoom({
        adminName: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        roomName: cleanRoomName,
        roomCode: cleanRoomCode,
        currency: newRoomCurrency,
        currencySymbol: currSym,
        upiId: adminUpiId.trim() || undefined,
      });
    } else if (onRegister) {
      onRegister({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        role: 'super_admin',
        upiId: adminUpiId.trim() || undefined,
      });
    }
  };

  // 3. ROOM MEMBER LOGIN (Room Code + Allocated Username/Phone + Allocated Password)
  const handleMemberLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputCode = memberRoomCode.trim().toUpperCase();
    const inputUser = memberUsername.trim().toLowerCase();
    const inputPass = memberPassword.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg('Please enter your allocated username and password.');
      return;
    }

    // Match member by username, name, email, or phone
    const matched = memberList.find(m => 
      (m.username && m.username.toLowerCase() === inputUser) ||
      m.name.toLowerCase() === inputUser ||
      m.email.toLowerCase() === inputUser ||
      m.email.toLowerCase().split('@')[0] === inputUser ||
      (m.phone && m.phone.replace(/[^0-9]/g, '').includes(inputUser.replace(/[^0-9]/g, '')))
    );

    if (!matched) {
      setErrorMsg(`No roommate found matching "${memberUsername}". Please check with your Super Admin (${superAdminMember?.name || 'Admin'}) for your allocated username.`);
      return;
    }

    // Verify password against allocatedPassword or password or default demo password
    const validPassword = matched.allocatedPassword || matched.password || 'password123';
    if (inputPass !== validPassword && inputPass !== 'password123') {
      setErrorMsg(`Incorrect password for ${matched.name}. Please enter the password allocated by your Admin.`);
      return;
    }

    onLogin({
      id: matched.id,
      memberId: matched.id,
      email: matched.email,
      name: matched.name,
      avatar: matched.avatar,
      role: matched.role,
      roomCode: inputCode || currentRoomCode,
    });
  };

  // Quick select roommate
  const handleSelectQuickMember = (m: Member) => {
    setAuthMode('member');
    setMemberUsername(m.username || m.name.toLowerCase().split(' ')[0]);
    setMemberPassword(m.allocatedPassword || m.password || 'password123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Google One Tap Quick Access (Super Admin) */}
      {showOneTapOverlay && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-3.5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span className="text-xs font-bold text-slate-800">Super Admin Fast Login</span>
            </div>
            <button 
              onClick={() => setShowOneTapOverlay(false)} 
              className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2.5 flex items-center gap-3">
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" 
              alt="Lal Bakth" 
              className="w-10 h-10 rounded-full border border-slate-200 object-cover shadow-sm shrink-0" 
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">Lal Bakth</span>
              <span className="text-[11px] text-slate-500 font-mono block truncate">lalbakth@gmail.com (Super Admin)</span>
            </div>
          </div>

          <div className="pt-1 flex gap-2">
            <button
              onClick={() => {
                setShowOneTapOverlay(false);
                processGoogleUser('lalbakth@gmail.com', 'Lal Bakth');
              }}
              disabled={isGoogleLoading}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isGoogleLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Crown className="w-3.5 h-3.5" />
              )}
              <span>Continue as Super Admin</span>
            </button>
            <button
              onClick={() => setShowOneTapOverlay(false)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        
        {/* App Header */}
        <div className="p-6 pb-4 border-b border-white/10 bg-slate-950/70 text-center space-y-2">
          <div className="flex justify-center mb-1">
            <RoomexLogo size="lg" />
          </div>
          
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
              ROOMEX
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Mess & Room Expense Management App
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-slate-300 font-mono">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>App developed by <strong className="text-indigo-400 font-semibold">sakeerputhan</strong></span>
          </div>
        </div>

        {/* PRIMARY ROLE TAB SWITCHER: Super Admin vs Roommate */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/90 border-b border-white/10 text-xs font-bold">
          
          <button
            type="button"
            onClick={() => { 
              setAuthMode('super_admin'); 
              setErrorMsg(null); 
            }}
            className={`py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'super_admin' 
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Super Admin</span>
          </button>
          
          <button
            type="button"
            onClick={() => { 
              setAuthMode('member'); 
              setErrorMsg(null); 
            }}
            className={`py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'member' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Member Login</span>
          </button>
        </div>

        {/* Form Body Container */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: SUPER ADMIN (EMAIL & PASSWORD) */}
          {/* ========================================================================= */}
          {authMode === 'super_admin' && (
            <div className="space-y-4">
              
              {/* Super Admin Sub-Actions: Sign In vs Create New Room */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => { setAdminAction('login'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    adminAction === 'login' 
                      ? 'bg-white/10 text-amber-300 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Super Admin Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAdminAction('create_room'); setErrorMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                    adminAction === 'create_room' 
                      ? 'bg-amber-500 text-slate-950 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Home className="w-3 h-3" />
                  <span>+ Create New Room</span>
                </button>
              </div>

              {/* Notice Banner */}
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Super Admin Authority:</strong> Log in with Email & Password. Super Admins create rooms and allocate usernames & passwords for all flatmates.
                </div>
              </div>

              {/* 1-Click Google Sign In for Super Admin */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => processGoogleUser('lalbakth@gmail.com', 'Lal Bakth')}
                className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-98 min-h-[44px] cursor-pointer"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>Continue with Google (Super Admin)</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase font-mono text-slate-500">or email & password</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {adminAction === 'login' ? (
                /* SUPER ADMIN LOG IN FORM */
                <form onSubmit={handleSuperAdminLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Super Admin Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. lalbakth@gmail.com or alex@roomex.app"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Password</label>
                      <span className="text-[10px] text-amber-400 font-mono">Demo: password123</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter Super Admin password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[44px] cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Log In as Super Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* SUPER ADMIN CREATE NEW ROOM FORM */
                <form onSubmit={handleSuperAdminCreateRoom} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Super Admin Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lal Bakth"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Super Admin Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. lalbakth@gmail.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Super Admin Password * (Min 6 chars)</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">New Flat / Room Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Skyline Flat 402"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Room Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SKY402"
                        value={newRoomCode}
                        onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                    <select
                      value={newRoomCurrency}
                      onChange={(e) => setNewRoomCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="AED">AED (د.إ) - UAE Dirham</option>
                      <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[44px] cursor-pointer"
                  >
                    <Building className="w-4 h-4" />
                    <span>Create Super Admin & Launch Room</span>
                  </button>
                </form>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ROOMMATE / MEMBER LOGIN (ALLOCATED USERNAME & PASSWORD) */}
          {/* ========================================================================= */}
          {authMode === 'member' && (
            <div className="space-y-4">
              
              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs leading-relaxed flex items-start gap-2.5">
                <Users className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-300">Roommate Login:</strong> Enter the Room Code, Username, and Password allocated to you by your Super Admin or Room Admin.
                </div>
              </div>

              <form onSubmit={handleMemberLogin} className="space-y-3">
                
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Room Code</label>
                  <div className="relative">
                    <Home className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. SKY402"
                      value={memberRoomCode}
                      onChange={(e) => setMemberRoomCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Allocated Username or Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. brian, chloe, david, alex"
                      value={memberUsername}
                      onChange={(e) => setMemberUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Allocated Password</label>
                    <span className="text-[10px] text-indigo-400 font-mono">Demo: password123</span>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter allocated password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[44px] cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Room</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick 1-Tap Roommate Login Selection */}
              {memberList.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                      Quick Member Login:
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {memberList.length} members in {currentRoomName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {memberList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectQuickMember(m)}
                        className={`flex items-center gap-2 p-2 rounded-2xl border text-left transition-all group ${
                          memberUsername.toLowerCase() === (m.username || m.name).toLowerCase()
                            ? 'bg-indigo-600/30 border-indigo-400'
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                      >
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-8 h-8 rounded-xl object-cover border border-white/20 shrink-0"
                        />
                        <div className="overflow-hidden min-w-0">
                          <span className="text-xs font-bold text-white block truncate group-hover:text-indigo-300">
                            {m.name.split(' ')[0]}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            @{m.username || m.name.toLowerCase().split(' ')[0]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Credit Bar */}
        <div className="p-3 bg-slate-950 border-t border-white/10 text-center text-[11px] text-slate-500 font-mono">
          App developed by <span className="text-indigo-400 font-semibold">sakeerputhan</span>
        </div>

      </div>

    </div>
  );
};
